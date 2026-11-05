function isOutOfStock(product) {
    return product.stock <= product.minimumAlertQuantity;
}

module.exports = {
    isOutOfStock
};