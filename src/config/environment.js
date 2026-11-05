require("dotenv").config();

function getRequiredEnvironmentVariable(name) {
    const value = process.env[name];

    if (!value) {
        throw new Error(`Missing required environment variable: ${name}`);
    }

    return value;
}

const environment = {
    database: {
        server: getRequiredEnvironmentVariable("DB_SERVER"),
        database: getRequiredEnvironmentVariable("DB_DATABASE"),
        user: getRequiredEnvironmentVariable("DB_USER"),
        password: getRequiredEnvironmentVariable("DB_PASSWORD"),
        options: {
            encrypt: process.env.DB_ENCRYPT === "true",
            trustServerCertificate:
                process.env.DB_TRUST_SERVER_CERTIFICATE === "true"
        }
    },
    googleSheets: {
        spreadsheetId:
            getRequiredEnvironmentVariable(
                "GOOGLE_SPREADSHEET_ID"
            ),

        sheetName:
            getRequiredEnvironmentVariable(
                "GOOGLE_SHEET_NAME"
            ),

        credentialsPath:
            getRequiredEnvironmentVariable(
                "GOOGLE_CREDENTIALS_PATH"
            )
    }
};

if (process.env.DB_PORT) {
    environment.database.port = Number(process.env.DB_PORT);
}

module.exports = environment;