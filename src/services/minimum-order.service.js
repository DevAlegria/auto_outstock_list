const {
    getPreviousMonthSalesByReferences
} = require("../database/sales.repository");

async function calculateMinimumOrderQuantities(products) {
    if (!products || products.length === 0) {
        return products;
    }

    const references = products.map(
        (product) => product.reference
    );

    const salesData =
        await getPreviousMonthSalesByReferences(
            references
        );

    const salesByReference = new Map();

    for (const sale of salesData) {
        salesByReference.set(
            sale.reference,
            Number(sale.salesLastMonth)
        );
    }

    return products.map((product) => {

        const salesLastMonth =
            salesByReference.get(product.reference) ?? 0;

        return {
            ...product,
            minimumOrderQuantity: salesLastMonth
        };
    });
}

module.exports = {
    calculateMinimumOrderQuantities
};