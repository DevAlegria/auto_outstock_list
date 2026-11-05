const sql = require("mssql");
const environment = require("../config/environment");

let poolPromise = null;

async function getDatabasePool() {
    if (poolPromise) {
        return poolPromise;
    }

    const pool = new sql.ConnectionPool(environment.database);

    pool.on("error", (error) => {
        console.error("SQL Server pool error:", error);
    });

    poolPromise = pool.connect()
        .then((connectedPool) => {
            console.log("Connected to SQL Server");
            return connectedPool;
        })
        .catch((error) => {
            poolPromise = null;
            throw error;
        });

    return poolPromise;
}

async function closeDatabasePool() {
    if (!poolPromise) {
        return;
    }

    const pool = await poolPromise;

    if (pool.connected) {
        await pool.close();
        console.log("SQL Server connection closed");
    }

    poolPromise = null;
}

module.exports = {
    sql,
    getDatabasePool,
    closeDatabasePool
};