const test = require('node:test');
const assert = require('node:assert/strict');
const crypto = require('node:crypto');
const fsSync = require('node:fs');
const fs = require('node:fs/promises');
const os = require('node:os');
const path = require('node:path');

process.env.JWT_SECRET = 'test-secret-with-more-than-thirty-two-bytes';
process.env.PRODUCT_UPLOAD_DIR = fsSync.mkdtempSync(path.join(os.tmpdir(), 'product-service-test-'));

const app = require('../apps');
const productModel = require('../models/productModel');
const uploadDirectory = process.env.PRODUCT_UPLOAD_DIR;
const initialProducts = [{
    id: 1,
    name: 'Produk lama',
    description: null,
    price: '1000.00',
    stock: 1,
    category: 'Umum',
    image: 'iVBORw0KGgo=',
    seller_id: null,
}];
let products;
let nextId;
let server;
let baseUrl;

const png = Buffer.from(
    'iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAYAAAAfFcSJAAAADUlEQVQIHWP4z8DwHwAFgAI/ScL/nwAAAABJRU5ErkJggg==',
    'base64'
);

function tokenFor(id, role) {
    const header = Buffer.from(JSON.stringify({ alg: 'HS256', typ: 'JWT' })).toString('base64url');
    const payload = Buffer.from(JSON.stringify({
        sub: id,
        role,
        exp: Math.floor(Date.now() / 1000) + 60
    })).toString('base64url');
    const content = `${header}.${payload}`;
    const signature = crypto.createHmac('sha256', process.env.JWT_SECRET)
        .update(content)
        .digest('base64url');
    return `${content}.${signature}`;
}

function productForm(imageName = 'product.png', imageBytes = png) {
    const form = new FormData();
    form.set('name', 'Produk uji');
    form.set('description', 'Deskripsi uji');
    form.set('price', '12500');
    form.set('stock', '4');
    form.set('category', 'Uji');
    form.set('image', new Blob([imageBytes], { type: 'image/png' }), imageName);
    return form;
}

async function listen() {
    server = app.listen(0, '127.0.0.1');
    await new Promise((resolve) => server.once('listening', resolve));
    baseUrl = `http://127.0.0.1:${server.address().port}`;
}

async function closeServer() {
    if (!server) return;
    await new Promise((resolve, reject) => {
        server.close((error) => error ? reject(error) : resolve());
    });
    server = null;
}

function authorization(id, role) {
    return { Authorization: `Bearer ${tokenFor(id, role)}` };
}

test.before(async () => {
    products = structuredClone(initialProducts);
    nextId = 2;
    productModel.getAllProducts = async () => structuredClone(products);
    productModel.getProductById = async (id) => structuredClone(
        products.find((product) => product.id === Number(id))
    );
    productModel.createProduct = async (product) => {
        const created = { id: nextId++, ...product };
        products.push(created);
        return structuredClone(created);
    };
    productModel.updateProduct = async (id, changes) => {
        const index = products.findIndex((product) => product.id === Number(id));
        products[index] = { ...products[index], ...changes };
        return structuredClone(products[index]);
    };
    productModel.deleteProduct = async (id) => {
        const index = products.findIndex((product) => product.id === Number(id));
        if (index < 0) return false;
        products.splice(index, 1);
        return true;
    };
    await listen();
});

test.after(async () => {
    await closeServer();
    await fs.rm(uploadDirectory, { recursive: true, force: true });
});

test('product routes enforce roles, persist image paths, and retain uploads after restart', async () => {
    const legacyResponse = await fetch(`${baseUrl}/products/1`);
    assert.equal(legacyResponse.status, 200);
    assert.equal((await legacyResponse.json()).data.image, initialProducts[0].image);

    const adminCreate = await fetch(`${baseUrl}/products`, {
        method: 'POST',
        headers: authorization('admin-1', 'admin'),
        body: productForm()
    });
    assert.equal(adminCreate.status, 201);
    const adminProduct = (await adminCreate.json()).data;
    assert.equal(adminProduct.seller_id, 'admin-1');
    assert.match(adminProduct.image, /^\/uploads\/[a-f0-9-]+\.png$/);

    const sellerCreate = await fetch(`${baseUrl}/products`, {
        method: 'POST',
        headers: authorization('seller-1', 'seller'),
        body: productForm()
    });
    assert.equal(sellerCreate.status, 201);
    const sellerProduct = (await sellerCreate.json()).data;
    assert.equal(sellerProduct.seller_id, 'seller-1');

    const deniedUpdate = await fetch(`${baseUrl}/products/${adminProduct.id}`, {
        method: 'PUT',
        headers: authorization('seller-1', 'seller'),
        body: productForm()
    });
    assert.equal(deniedUpdate.status, 403);

    const deniedDelete = await fetch(`${baseUrl}/products/${adminProduct.id}`, {
        method: 'DELETE',
        headers: authorization('seller-1', 'seller')
    });
    assert.equal(deniedDelete.status, 403);

    const sellerUpdate = await fetch(`${baseUrl}/products/${sellerProduct.id}`, {
        method: 'PUT',
        headers: authorization('seller-1', 'seller'),
        body: productForm('seller-replacement.png')
    });
    assert.equal(sellerUpdate.status, 200);
    const sellerUpdatedProduct = (await sellerUpdate.json()).data;
    assert.notEqual(sellerUpdatedProduct.image, sellerProduct.image);

    const adminUpdate = await fetch(`${baseUrl}/products/${sellerProduct.id}`, {
        method: 'PUT',
        headers: authorization('admin-1', 'admin'),
        body: productForm('admin-replacement.png')
    });
    assert.equal(adminUpdate.status, 200);
    const adminUpdatedProduct = (await adminUpdate.json()).data;
    assert.equal(adminUpdatedProduct.seller_id, 'seller-1');
    assert.notEqual(adminUpdatedProduct.image, sellerUpdatedProduct.image);

    const buyerCatalog = await fetch(`${baseUrl}/products`);
    assert.equal(buyerCatalog.status, 200);
    assert.ok((await buyerCatalog.json()).data.some((product) => product.id === sellerProduct.id));

    const buyerProduct = await fetch(`${baseUrl}/products/${sellerProduct.id}`);
    assert.equal(buyerProduct.status, 200);
    assert.equal((await buyerProduct.json()).data.image, adminUpdatedProduct.image);

    const buyerWrite = await fetch(`${baseUrl}/products`, {
        method: 'POST',
        headers: authorization('buyer-1', 'buyer'),
        body: productForm()
    });
    assert.equal(buyerWrite.status, 403);

    const invalidImage = await fetch(`${baseUrl}/products`, {
        method: 'POST',
        headers: authorization('seller-1', 'seller'),
        body: productForm('invalid.png', Buffer.from('not a PNG'))
    });
    assert.equal(invalidImage.status, 400);

    const currentImageUrl = `${baseUrl}${adminUpdatedProduct.image}`;
    const currentImage = await fetch(currentImageUrl);
    assert.equal(currentImage.status, 200);
    assert.deepEqual(Buffer.from(await currentImage.arrayBuffer()), png);

    const replacedImage = await fetch(`${baseUrl}${sellerUpdatedProduct.image}`);
    assert.equal(replacedImage.status, 404);

    await closeServer();
    await listen();
    const restartedImageUrl = `${baseUrl}${adminUpdatedProduct.image}`;
    const imageAfterRestart = await fetch(restartedImageUrl);
    assert.equal(imageAfterRestart.status, 200);
    assert.deepEqual(Buffer.from(await imageAfterRestart.arrayBuffer()), png);

    const oversizedUpload = await fetch(`${baseUrl}/products`, {
        method: 'POST',
        headers: authorization('seller-1', 'seller'),
        body: productForm('large.png', Buffer.concat([png, Buffer.alloc(5 * 1024 * 1024)]))
    });
    assert.equal(oversizedUpload.status, 413);

    const sellerDelete = await fetch(`${baseUrl}/products/${sellerProduct.id}`, {
        method: 'DELETE',
        headers: authorization('seller-1', 'seller')
    });
    assert.equal(sellerDelete.status, 200);
    assert.equal((await fetch(restartedImageUrl)).status, 404);

    const adminDelete = await fetch(`${baseUrl}/products/${adminProduct.id}`, {
        method: 'DELETE',
        headers: authorization('admin-1', 'admin')
    });
    assert.equal(adminDelete.status, 200);
});
