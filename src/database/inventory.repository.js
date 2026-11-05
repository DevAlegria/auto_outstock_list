const { getDatabasePool } = require("./connection");

async function getOutOfStockProducts() {
    const pool = await getDatabasePool();

    const result = await pool.request().query(`
        SELECT
            i.strReferencia AS reference,
            i.strCodigo AS code,
            i.strDescripcion AS description,
            i.intCantidadMinimaAviso AS minimumAlertQuantity,
            i.intCantidad AS stock,
            i.strIdProveedor AS supplierId,
            p.strNombre AS supplierName
        FROM tblInventario AS i
        LEFT JOIN tblProveedores AS p
            ON p.strIdProveedor = i.strIdProveedor
        WHERE i.intCantidad < i.intCantidadMinimaAviso
        ORDER BY i.strDescripcion ASC;
    `);

    return result.recordset;
}

module.exports = {
    getOutOfStockProducts
};