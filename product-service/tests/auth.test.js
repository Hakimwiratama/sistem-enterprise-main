const test = require('node:test');
const assert = require('node:assert/strict');
const crypto = require('node:crypto');
const express = require('express');
const { authenticate, allowRoles } = require('../middleware/auth');

process.env.JWT_SECRET = 'test-secret-with-more-than-thirty-two-bytes';

const app = express();
app.post('/products', authenticate, allowRoles('admin', 'seller'), (req, res) => {
    res.status(201).json({ user: req.user });
});

let server;
let baseUrl;

function tokenFor(payload) {
    const header = Buffer.from(JSON.stringify({ alg: 'HS256', typ: 'JWT' })).toString('base64url');
    const claims = Buffer.from(JSON.stringify({
        sub: 'seller-1',
        role: 'seller',
        exp: Math.floor(Date.now() / 1000) + 60,
        ...payload
    })).toString('base64url');
    const content = `${header}.${claims}`;
    const signature = crypto.createHmac('sha256', process.env.JWT_SECRET)
        .update(content)
        .digest('base64url');
    return `${content}.${signature}`;
}

test.before(async () => {
    server = app.listen(0);
    await new Promise((resolve) => server.once('listening', resolve));
    baseUrl = `http://127.0.0.1:${server.address().port}`;
});

test.after(async () => {
    await new Promise((resolve, reject) => {
        server.close((error) => error ? reject(error) : resolve());
    });
});

test('product writes require a valid bearer token', async () => {
    const response = await fetch(`${baseUrl}/products`, { method: 'POST' });
    assert.equal(response.status, 401);
});

test('buyer tokens cannot access product write routes', async () => {
    const response = await fetch(`${baseUrl}/products`, {
        method: 'POST',
        headers: { Authorization: `Bearer ${tokenFor({ role: 'buyer' })}` }
    });
    assert.equal(response.status, 403);
});

test('seller identity comes from the verified JWT subject', async () => {
    const response = await fetch(`${baseUrl}/products`, {
        method: 'POST',
        headers: { Authorization: `Bearer ${tokenFor({})}` }
    });
    assert.equal(response.status, 201);
    assert.deepEqual(await response.json(), {
        user: { id: 'seller-1', role: 'seller' }
    });
});

test('tampered and expired tokens are rejected', async () => {
    const validToken = tokenFor({});
    const signatureStart = validToken.lastIndexOf('.') + 1;
    const signatureCharacter = validToken[signatureStart] === 'A' ? 'B' : 'A';
    const tampered = `${validToken.slice(0, signatureStart)}${signatureCharacter}${validToken.slice(signatureStart + 1)}`;
    const expired = tokenFor({ exp: Math.floor(Date.now() / 1000) - 1 });
    for (const token of [tampered, expired]) {
        const response = await fetch(`${baseUrl}/products`, {
            method: 'POST',
            headers: { Authorization: `Bearer ${token}` }
        });
        assert.equal(response.status, 401);
    }
});
