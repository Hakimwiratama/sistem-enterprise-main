const productModel = require('../models/productModel');
const crypto = require('node:crypto');
const fs = require('node:fs/promises');
const path = require('node:path');
const { canManageProduct } = require('../middleware/productAuthorization');

const UPLOAD_DIRECTORY = process.env.PRODUCT_UPLOAD_DIR || path.join(__dirname, '..', 'uploads');

function parseId(value) {
    const id = Number(value);
    return Number.isInteger(id) && id > 0 ? id : null;
}

function detectImageType(buffer) {
    if (
        buffer.length >= 8 &&
        buffer.subarray(0, 8).equals(Buffer.from([0x89, 0x50, 0x4e, 0x47, 0x0d, 0x0a, 0x1a, 0x0a]))
    ) return { mime: 'image/png', extension: 'png' };
    if (buffer.length >= 3 && buffer[0] === 0xff && buffer[1] === 0xd8 && buffer[2] === 0xff) {
        return { mime: 'image/jpeg', extension: 'jpg' };
    }
    if (
        buffer.length >= 12 &&
        buffer.toString('ascii', 0, 4) === 'RIFF' &&
        buffer.toString('ascii', 8, 12) === 'WEBP'
    ) return { mime: 'image/webp', extension: 'webp' };
    return null;
}

async function saveImage(file) {
    if (!file) return null;
    const detected = detectImageType(file.buffer);
    if (!detected || file.mimetype !== detected.mime) {
        const error = new Error('Isi foto tidak sesuai dengan format JPG, PNG, atau WEBP');
        error.status = 400;
        throw error;
    }

    await fs.mkdir(UPLOAD_DIRECTORY, { recursive: true });
    const filename = `${crypto.randomUUID()}.${detected.extension}`;
    await fs.writeFile(path.join(UPLOAD_DIRECTORY, filename), file.buffer, { flag: 'wx' });
    return `/uploads/${filename}`;
}

async function removeImage(image) {
    if (typeof image !== 'string') return;
    const match = /^\/uploads\/([a-f0-9-]+)\.(png|jpg|webp)$/.exec(image);
    if (!match) return;
    await fs.unlink(path.join(UPLOAD_DIRECTORY, path.basename(image))).catch((error) => {
        if (error.code !== 'ENOENT') throw error;
    });
}

function validateProduct(body) {
    body = body || {};
    const errors = [];
    const name = typeof body.name === 'string' ? body.name.trim() : '';
    const category = typeof body.category === 'string' ? body.category.trim() : '';
    const description = typeof body.description === 'string' ? body.description.trim() : '';
    const price = typeof body.price === 'number' || typeof body.price === 'string'
        ? Number(body.price)
        : NaN;
    const stock = typeof body.stock === 'number' || typeof body.stock === 'string'
        ? Number(body.stock)
        : NaN;

    if (!name || name.length > 150) {
        errors.push('name wajib diisi dan maksimal 150 karakter');
    }
    if (
        !Number.isFinite(price) ||
        price < 0 ||
        price > 9999999999.99 ||
        !/^\d+(?:\.\d{1,2})?$/.test(String(body.price))
    ) {
        errors.push('price wajib berupa angka >= 0');
    }
    if (!Number.isInteger(stock) || stock < 0 || stock > 4294967295) {
        errors.push('stock wajib berupa bilangan bulat >= 0');
    }
    if (!category || category.length > 100) {
        errors.push('category wajib diisi dan maksimal 100 karakter');
    }
    if (typeof body.description !== 'undefined' && typeof body.description !== 'string') {
        errors.push('description harus berupa teks');
    }
    if (description.length > 65535) errors.push('description maksimal 65535 karakter');

    return {
        errors,
        product: { name, description: description || null, price, stock, category }
    };
}

async function index(req, res) {
    try {
        const products = await productModel.getAllProducts();
        res.status(200).json({ data: products });
    } catch (error) {
        console.error('Failed to list products:', error);
        res.status(500).json({ message: 'Gagal mengambil data product' });
    }
}

async function show(req, res) {
    const id = parseId(req.params.id);
    if (!id) return res.status(400).json({ message: 'ID product tidak valid' });

    try {
        const product = await productModel.getProductById(id);
        if (!product) return res.status(404).json({ message: 'Product tidak ditemukan' });
        res.status(200).json({ data: product });
    } catch (error) {
        console.error('Failed to get product:', error);
        res.status(500).json({ message: 'Gagal mengambil product' });
    }
}

async function store(req, res) {
    const validation = validateProduct(req.body);
    if (!req.file) validation.errors.push('Foto produk wajib diunggah');
    if (validation.errors.length) {
        return res.status(400).json({
            message: 'Data product tidak valid',
            errors: validation.errors
        });
    }

    let image;
    try {
        image = await saveImage(req.file);
        const product = await productModel.createProduct({
            ...validation.product,
            image,
            seller_id: req.user.id
        });
        res.status(201).json({ message: 'Product berhasil dibuat', data: product });
    } catch (error) {
        if (image) await removeImage(image).catch((cleanupError) => {
            console.error('Failed to clean up uploaded product image:', cleanupError);
        });
        console.error('Failed to create product:', error);
        res.status(error.status || 500).json({
            message: error.status ? error.message : 'Gagal membuat product'
        });
    }
}

async function update(req, res) {
    const id = parseId(req.params.id);
    if (!id) return res.status(400).json({ message: 'ID product tidak valid' });

    const validation = validateProduct(req.body);
    if (validation.errors.length) {
        return res.status(400).json({
            message: 'Data product tidak valid',
            errors: validation.errors
        });
    }

    try {
        const existing = await productModel.getProductById(id);
        if (!existing) return res.status(404).json({ message: 'Product tidak ditemukan' });
        if (!canManageProduct(req.user, existing)) {
            return res.status(403).json({ message: 'Anda hanya dapat mengubah produk milik sendiri' });
        }

        const image = req.file ? await saveImage(req.file) : existing.image;
        let product;
        try {
            product = await productModel.updateProduct(id, {
                ...validation.product,
                image
            });
        } catch (error) {
            if (req.file) await removeImage(image).catch((cleanupError) => {
                console.error('Failed to clean up uploaded product image:', cleanupError);
            });
            throw error;
        }
        if (req.file && existing.image !== image) {
            await removeImage(existing.image).catch((error) => {
                console.error('Failed to remove replaced product image:', error);
            });
        }
        res.status(200).json({ message: 'Product berhasil diubah', data: product });
    } catch (error) {
        console.error('Failed to update product:', error);
        res.status(error.status || 500).json({
            message: error.status ? error.message : 'Gagal mengubah product'
        });
    }
}

async function destroy(req, res) {
    const id = parseId(req.params.id);
    if (!id) return res.status(400).json({ message: 'ID product tidak valid' });

    try {
        const existing = await productModel.getProductById(id);
        if (!existing) return res.status(404).json({ message: 'Product tidak ditemukan' });
        if (!canManageProduct(req.user, existing)) {
            return res.status(403).json({ message: 'Anda hanya dapat menghapus produk milik sendiri' });
        }
        const deleted = await productModel.deleteProduct(id);
        if (deleted) {
            await removeImage(existing.image).catch((error) => {
                console.error('Failed to remove deleted product image:', error);
            });
        }
        res.status(200).json({ message: 'Product berhasil dihapus' });
    } catch (error) {
        console.error('Failed to delete product:', error);
        res.status(500).json({ message: 'Gagal menghapus product' });
    }
}

module.exports = { index, show, store, update, destroy };
