const { google } = require("googleapis");

const environment = require("../config/environment");

async function getSheetsClient() {
    const auth = new google.auth.GoogleAuth({
        keyFile: environment.googleSheets.credentialsPath,
        scopes: [
            "https://www.googleapis.com/auth/spreadsheets"
        ]
    });

    const authClient = await auth.getClient();

    return google.sheets({
        version: "v4",
        auth: authClient
    });
}

async function getSpreadsheetInfo() {
    const sheets = await getSheetsClient();

    const response = await sheets.spreadsheets.get({
        spreadsheetId:
            environment.googleSheets.spreadsheetId
    });

    return response.data;
}

/**
 * Reads all data from the configured sheet.
 *
 * Row 1 is expected to contain headers.
 */
async function getExistingRows(sheets) {
    const response =
        await sheets.spreadsheets.values.get({
            spreadsheetId:
                environment.googleSheets.spreadsheetId,

            range:
                `${environment.googleSheets.sheetName}!A:G`,

            valueRenderOption: "UNFORMATTED_VALUE"
        });

    return response.data.values || [];
}

/**
 * Builds an index:
 *
 * reference -> sheet row number
 *
 * Example:
 *
 * ABC001 -> 2
 * ABC002 -> 3
 */
function buildReferenceIndex(rows) {
    const referenceIndex = new Map();

    for (let index = 1; index < rows.length; index++) {

        const row = rows[index];

        const reference =
            row?.[0] !== undefined
                ? String(row[0]).trim()
                : "";

        if (!reference) {
            continue;
        }

        if (referenceIndex.has(reference)) {
            const existingRow =
                referenceIndex.get(reference);

            throw new Error(
                `Duplicate reference found in Google Sheets: ` +
                `${reference} (rows ${existingRow} and ${index + 1})`
            );
        }

        // Google Sheets row numbers start at 1.
        referenceIndex.set(reference, index + 1);
    }

    return referenceIndex;
}

/**
 * Converts an application product to
 * the five source-controlled columns.
 *
 * A: Reference
 * B: Code
 * C: Description
 * D: Stock
 * E: Supplier
 */
function productToSourceValues(product) {
    return [
        product.reference ?? "",
        product.code ?? "",
        product.description ?? "",
        product.stock ?? "",
        product.supplierName ?? "",
        product.minimumOrderQuantity ?? 0
    ];
}

/**
 * Appends new products to the sheet.
 *
 * New rows receive:
 *
 * F: Pending
 * G: Pending
 */
async function appendProducts(sheets, products) {
    if (!products || products.length === 0) {
        return 0;
    }

    const values = products.map((product) => [
        ...productToSourceValues(product),
        "Pending"
    ]);

    await sheets.spreadsheets.values.append({
        spreadsheetId:
            environment.googleSheets.spreadsheetId,

        range:
            `${environment.googleSheets.sheetName}!A:G`,

        valueInputOption: "USER_ENTERED",

        insertDataOption: "INSERT_ROWS",

        requestBody: {
            values
        }
    });

    return products.length;
}

/**
 * Updates existing products.
 *
 * Only columns A:E are updated.
 *
 * F: Minimum Order
 * G: Status
 *
 * remain untouched.
 */
async function updateProducts(
    sheets,
    products,
    referenceIndex
) {
    if (!products || products.length === 0) {
        return 0;
    }

    const data = [];

    for (const product of products) {

        const reference =
            String(product.reference).trim();

        const rowNumber =
            referenceIndex.get(reference);

        if (!rowNumber) {
            throw new Error(
                `Cannot update product "${reference}". ` +
                `Reference was not found in Google Sheets.`
            );
        }

        data.push({
            range:
                `${environment.googleSheets.sheetName}!A${rowNumber}:F${rowNumber}`,

            values: [
                productToSourceValues(product)
            ]
        });
    }

    await sheets.spreadsheets.values.batchUpdate({
        spreadsheetId:
            environment.googleSheets.spreadsheetId,

        requestBody: {
            valueInputOption: "USER_ENTERED",
            data
        }
    });

    return products.length;
}

/**
 * Inserts new products and updates existing products.
 *
 * Reference is the unique business key.
 */
async function upsertProducts(products) {
    if (!products || products.length === 0) {
        return {
            inserted: 0,
            updated: 0
        };
    }

    const sheets = await getSheetsClient();

    const rows = await getExistingRows(sheets);

    const referenceIndex =
        buildReferenceIndex(rows);

    const productsToInsert = [];
    const productsToUpdate = [];

    for (const product of products) {

        const reference =
            String(product.reference).trim();

        if (!reference) {
            throw new Error(
                "Cannot upsert a product without a reference."
            );
        }

        if (referenceIndex.has(reference)) {
            productsToUpdate.push(product);
        } else {
            productsToInsert.push(product);
        }
    }

    const updated =
        await updateProducts(
            sheets,
            productsToUpdate,
            referenceIndex
        );

    const inserted =
        await appendProducts(
            sheets,
            productsToInsert
        );

    return {
        inserted,
        updated
    };
}

module.exports = {
    getSheetsClient,
    getSpreadsheetInfo,
    getExistingRows,
    buildReferenceIndex,
    appendProducts,
    updateProducts,
    upsertProducts
};