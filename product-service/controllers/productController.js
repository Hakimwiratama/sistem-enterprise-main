const productModel = require('../models/productModel');

const MAX_IMAGE_SIZE = 2 * 1024 * 1024;

function parseId(value) {
    const id = Number(value);
    return Number.isInteger(id) && id > 0 ? id : null;
}

function validateImage(value) {
    if (typeof value !== 'string' || value.trim() === '') {
        return {
            error: 'Field image wajib diisi',
            base64: null
        };
    }

    let base64 = value.trim();
    let declaredMimeType = null;

    if (base64.startsWith('data:')) {
        const dataUriMatch = base64.match(
            /^data:(image\/(?:png|jpeg));base64,(.*)$/i
        );

        if (!dataUriMatch) {
            return {
                error: 'Field image harus berupa Base64 yang valid',
                base64: null
            };
        }

        declaredMimeType = dataUriMatch[1].toLowerCase();
        base64 = dataUriMatch[2];
    }

    const padding = base64.endsWith('==') ? 2 : base64.endsWith('=') ? 1 : 0;
    const decodedSize = Math.floor((base64.length * 3) / 4) - padding;

    if (decodedSize > MAX_IMAGE_SIZE) {
        return {
            error: 'Ukuran image maksimal 2 MB',
            base64: null
        };
    }

    const base64Pattern =
        /^(?:[A-Za-z0-9+/]{4})*(?:[A-Za-z0-9+/]{2}==|[A-Za-z0-9+/]{3}=)?$/;

    if (!base64 || !base64Pattern.test(base64)) {
        return {
            error: 'Field image harus berupa Base64 yang valid',
            base64: null
        };
    }

    const imageBuffer = Buffer.from(base64, 'base64');

    if (imageBuffer.toString('base64') !== base64) {
        return {
            error: 'Field image harus berupa Base64 yang valid',
            base64: null
        };
    }

    const isPng =
        imageBuffer.length >= 8 &&
        imageBuffer.subarray(0, 8).equals(
            Buffer.from([0x89, 0x50, 0x4e, 0x47, 0x0d, 0x0a, 0x1a, 0x0a])
        );
    const isJpeg =
        imageBuffer.length >= 3 &&
        imageBuffer[0] === 0xff &&
        imageBuffer[1] === 0xd8 &&
        imageBuffer[2] === 0xff;

    if (!isPng && !isJpeg) {
        return {
            error: 'Format image harus berupa PNG atau JPEG',
            base64: null
        };
    }

    if (
        (declaredMimeType === 'image/png' && !isPng) ||
        (declaredMimeType === 'image/jpeg' && !isJpeg)
    ) {
        return {
            error: 'Tipe image tidak sesuai dengan isi file',
            base64: null
        };
    }

    return {
        error: null,
        base64
    };
}

function validateProduct(body) {
    body = body || {};
    const { name, price, stock } = body;
    const errors = [];
    const imageResult = validateImage(body.image);

    if (typeof name !== 'string' || name.trim() === '') {
        errors.push('name wajib berupa teks dan tidak boleh kosong');
    }
    if (typeof price !== 'number' || !Number.isFinite(price) || price < 0) {
        errors.push('price wajib berupa angka >= 0');
    }
    if (!Number.isInteger(stock) || stock < 0) {
        errors.push('stock wajib berupa bilangan bulat >= 0');
    }
    if (imageResult.error) {
        errors.push(imageResult.error);
    }

    return {
        errors,
        image: imageResult.base64
    };
}

function productPayload(body, image) {
    body = body || {};
    return {
        name: body.name.trim(),
        description: body.description == null ? null : String(body.description),
        price: body.price,
        stock: body.stock,
        image
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
    if (validation.errors.length) {
        return res.status(400).json({
            message: 'Data product tidak valid',
            errors: validation.errors
        });
    }

    try {
        const product = await productModel.createProduct(
            productPayload(req.body, validation.image)
        );
        res.status(201).json({ message: 'Product berhasil dibuat', data: product });
    } catch (error) {
        console.error('Failed to create product:', error);
        res.status(500).json({ message: 'Gagal membuat product' });
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

        const product = await productModel.updateProduct(
            id,
            productPayload(req.body, validation.image)
        );
        res.status(200).json({ message: 'Product berhasil diubah', data: product });
    } catch (error) {
        console.error('Failed to update product:', error);
        res.status(500).json({ message: 'Gagal mengubah product' });
    }
}

async function destroy(req, res) {
    const id = parseId(req.params.id);
    if (!id) return res.status(400).json({ message: 'ID product tidak valid' });

    try {
        const deleted = await productModel.deleteProduct(id);
        if (!deleted) return res.status(404).json({ message: 'Product tidak ditemukan' });
        res.status(200).json({ message: 'Product berhasil dihapus' });
    } catch (error) {
        console.error('Failed to delete product:', error);
        res.status(500).json({ message: 'Gagal menghapus product' });
    }
}

module.exports = { index, show, store, update, destroy };
