function canManageProduct(user, product) {
    if (user.role === 'admin') return true;
    return user.role === 'seller' && String(product.seller_id ?? '') === user.id;
}

module.exports = { canManageProduct };
