const test = require('node:test');
const assert = require('node:assert/strict');
const { canManageProduct } = require('../middleware/productAuthorization');

test('admin can manage products owned by any seller', () => {
    assert.equal(
        canManageProduct({ id: 'admin-1', role: 'admin' }, { seller_id: 'seller-2' }),
        true
    );
});

test('seller can manage only products with the same verified owner ID', () => {
    const product = { seller_id: 'seller-1' };
    assert.equal(canManageProduct({ id: 'seller-1', role: 'seller' }, product), true);
    assert.equal(canManageProduct({ id: 'seller-2', role: 'seller' }, product), false);
    assert.equal(canManageProduct({ id: 'seller-1', role: 'buyer' }, product), false);
});

test('legacy products without an owner are not editable by sellers', () => {
    assert.equal(
        canManageProduct({ id: 'seller-1', role: 'seller' }, { seller_id: null }),
        false
    );
});
