const {
    processOutOfStockProducts
} = require("./services/out-of-stock.service");

const {
    upsertProducts
} = require("./google/sheets.service");

const {
    closeDatabasePool
} = require("./database/connection");

async function main() {
    try {
        console.log("----------------------------------------");
        console.log("Out-of-Stock Automation");
        console.log("----------------------------------------");

        const result =
            await processOutOfStockProducts();

        console.log("");
        console.log(
            `Valid out-of-stock products: ${result.products.length}`
        );

        console.log(
            `Invalid products: ${result.invalidProducts.length}`
        );

        if (result.products.length === 0) {
            console.log("");
            console.log(
                "No out-of-stock products found."
            );

            return;
        }

        console.log("");
        console.log(
            "Synchronizing Google Sheets..."
        );

        const syncResult =
            await upsertProducts(
                result.products
            );

        console.log("");
        console.log(
            `Products inserted: ${syncResult.inserted}`
        );

        console.log(
            `Products updated: ${syncResult.updated}`
        );

        console.log("");
        console.log(
            "Out-of-stock synchronization completed."
        );

    } catch (error) {

        console.error("");
        console.error(
            "Out-of-stock process failed."
        );

        console.error(error);

        process.exitCode = 1;

    } finally {

        await closeDatabasePool();
    }
}

main();