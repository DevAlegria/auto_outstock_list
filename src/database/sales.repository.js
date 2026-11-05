const { getDatabasePool, sql } = require("./connection");

const REFERENCE_BATCH_SIZE = 1000;

function chunkArray(items, chunkSize) {
    const chunks = [];

    for (let index = 0; index < items.length; index += chunkSize) {
        chunks.push(
            items.slice(index, index + chunkSize)
        );
    }

    return chunks;
}

async function getPreviousMonthSalesByReferences(references) {
    if (!references || references.length === 0) {
        return [];
    }

    const pool = await getDatabasePool();

    const referenceBatches = chunkArray(
        references,
        REFERENCE_BATCH_SIZE
    );

    const salesByReference = new Map();

    for (const [batchIndex, referenceBatch] of referenceBatches.entries()) {
        console.log(
            `Processing sales batch ${batchIndex + 1}/${referenceBatches.length} ` +
            `(${referenceBatch.length} references)...`
        );

        const request = pool.request();

        const referenceParameters = referenceBatch.map(
            (reference, index) => {
                const parameterName =
                    `reference${index}`;

                request.input(
                    parameterName,
                    sql.NVarChar(255),
                    reference
                );

                return `@${parameterName}`;
            }
        );

        const query = `
            DECLARE @currentMonthStart DATETIME;
            DECLARE @previousMonthStart DATETIME;

            SET @currentMonthStart =
                DATEADD(
                    MONTH,
                    DATEDIFF(MONTH, 0, GETDATE()),
                    0
                );

            SET @previousMonthStart =
                DATEADD(
                    MONTH,
                    -1,
                    @currentMonthStart
                );

            SELECT
                d.strReferencia AS reference,
                SUM(d.intCantidad) AS salesLastMonth
            FROM tblPOS AS p
            INNER JOIN tblDetallePOS AS d
                ON p.intId = d.intIdPOS
            WHERE
                p.dtFecha_Compra >= @previousMonthStart
                AND p.dtFecha_Compra < @currentMonthStart
                AND d.strReferencia IN (
                    ${referenceParameters.join(", ")}
                )
            GROUP BY
                d.strReferencia
            ORDER BY
                d.strReferencia;
        `;

        const result = await request.query(query);

        for (const row of result.recordset) {
            salesByReference.set(
                row.reference,
                Number(row.salesLastMonth) || 0
            );
        }
    }

    return Array.from(
        salesByReference.entries()
    ).map(([reference, salesLastMonth]) => ({
        reference,
        salesLastMonth
    }));
}

module.exports = {
    getPreviousMonthSalesByReferences
};