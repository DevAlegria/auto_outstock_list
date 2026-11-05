const {
    getOutOfStockProducts
} = require("../database/inventory.repository");

const {
    isOutOfStock
} = require("../validators/product.validator");

const {
    calculateMinimumOrderQuantities
} = require("./minimum-order.service");

async function processOutOfStockProducts() {
    console.log(
        "Starting out-of-stock process..."
    );

    const products =
        await getOutOfStockProducts();

    console.log(
        `Products retrieved from database: ${products.length}`
    );

    const validProducts = [];
    const invalidProducts = [];
    const productsStorageLocation = [];

    for (const product of products) {
        hasStorageLocation =  product.code.endsWith("BDG");

        const isValid =
            isOutOfStock(product);

        if (isValid) {

            validProducts.push({
                reference: product.reference,
                code: product.code,
                description: hasStorageLocation ? product.description + "(C/UBICACION BODEGA)" : product.description,
                stock: product.stock,
                supplierId: product.supplierId,
                supplierName: product.supplierName,

                minimumOrderQuantity: null
            });

        } else {

            invalidProducts.push(product);
        }
    }

    

    const productsWithMinimumOrder =
        await calculateMinimumOrderQuantities(
            validProducts
        );

    return {
        products: productsWithMinimumOrder,
        invalidProducts
    };
}

module.exports = {
    processOutOfStockProducts
};