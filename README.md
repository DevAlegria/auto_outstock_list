# Auto Out-of-Stock List

Node.js automation that finds products below their inventory alert quantity in SQL Server and synchronizes them with a Google Sheets worksheet. It also calculates a suggested minimum order quantity from each product's sales during the previous calendar month.

## Contents

- [How It Works](#how-it-works)
- [Requirements](#requirements)
- [Installation](#installation)
- [Configuration](#configuration)
- [Google Sheets Setup](#google-sheets-setup)
- [Run](#run)
- [Spreadsheet Behavior](#spreadsheet-behavior)
- [Project Structure](#project-structure)
- [Troubleshooting](#troubleshooting)

## How It Works

When run, the application:

1. Connects to SQL Server and selects inventory records where current stock is below the product's minimum alert quantity. Supplier names are included when available.
2. Checks the returned products and marks invalid records separately.
3. Looks up each valid product's total sold quantity during the previous calendar month. Products without sales in that period receive a quantity of `0`.
4. Reads the configured Google Sheets worksheet and matches products by reference.
5. Inserts new products and updates existing products.
6. Closes the SQL Server connection pool.

The SQL Server integration requires read access to `tblInventario`, `tblProveedores`, `tblPOS`, and `tblDetallePOS`.

## Requirements

- Node.js and npm
- Network access to the configured SQL Server and Google Sheets API
- A Google Cloud service account with the Google Sheets API enabled
- A Google spreadsheet shared with the service account's email address
- SQL Server credentials with read access to the tables listed above

## Installation

From the project directory, install the dependencies:

```bash
npm install
```

Create a `.env` file in the project root and configure the variables described below. Keep `.env` and the service-account key out of source control; `.gitignore` already excludes both.

## Configuration

Set these required variables in `.env`:

```dotenv
DB_SERVER=your-sql-server-host
DB_DATABASE=your-database-name
DB_USER=your-database-user
DB_PASSWORD=your-database-password
DB_ENCRYPT=false
DB_TRUST_SERVER_CERTIFICATE=false

GOOGLE_SPREADSHEET_ID=your-spreadsheet-id
GOOGLE_SHEET_NAME=Sheet1
GOOGLE_CREDENTIALS_PATH=credentials/google-service-account.json
```

| Variable | Description |
| --- | --- |
| `DB_SERVER` | SQL Server host name or address. |
| `DB_DATABASE` | Database containing the inventory and point-of-sale tables. |
| `DB_USER` | SQL Server login. |
| `DB_PASSWORD` | SQL Server password. |
| `DB_PORT` | Optional SQL Server port. If omitted, the `mssql` driver default is used. |
| `DB_ENCRYPT` | Set to `true` to enable encrypted SQL connections; otherwise encryption is disabled. |
| `DB_TRUST_SERVER_CERTIFICATE` | Set to `true` to trust the SQL Server certificate. Use settings appropriate for your environment. |
| `GOOGLE_SPREADSHEET_ID` | Spreadsheet ID from its URL. For `https://docs.google.com/spreadsheets/d/<ID>/edit`, use the `<ID>` part. |
| `GOOGLE_SHEET_NAME` | Exact name of the worksheet tab to synchronize. |
| `GOOGLE_CREDENTIALS_PATH` | Path to the Google service-account JSON key, relative to the process working directory or an absolute path. |

The service-account key file is sensitive. Do not commit it or share its contents. Share the target spreadsheet with the service account's `client_email` as an editor.

## Google Sheets Setup

The configured worksheet must have a header row in row 1 and use these columns:

| Column | Value |
| --- | --- |
| A | Reference (unique product key) |
| B | Code |
| C | Description |
| D | Current stock |
| E | Supplier name |
| F | Minimum order quantity (previous month's sales) |
| G | Status |

The code uses column A to find existing products. Header text is not used to map columns, but keeping headers in this order makes the data understandable. References in column A should be unique; duplicate references stop the synchronization with an error.

## Run

Run the complete inventory and spreadsheet synchronization with:

```bash
npm start
```

The process reports the number of valid and invalid products, followed by inserted and updated totals. If no valid out-of-stock products are found, it reports that and exits without synchronizing the sheet. A failure sets a non-zero process exit code.

## Spreadsheet Behavior

- A product already present by reference has columns A:F refreshed. Its column G status is preserved.
- A new product is appended with its data in columns A:F and `Pending` in column G.
- The application does not delete products that are no longer out of stock.
- Inventory is read from SQL Server; this application does not write to the database.

## Project Structure

```text
src/
  index.js                       Application entry point and process lifecycle
  config/environment.js          Loads and validates environment variables
  database/
    connection.js                SQL Server connection pool
    inventory.repository.js      Out-of-stock inventory query
    sales.repository.js          Previous-month sales query
  google/
    sheets.service.js            Google Sheets read, insert, and update operations
  services/
    minimum-order.service.js     Calculates quantities from sales data
    out-of-stock.service.js      Coordinates retrieval and product validation
  validators/
    product.validator.js         Out-of-stock product validation
credentials/
  google-service-account.json    Local service-account key (not committed)
```

## Troubleshooting

- **Missing required environment variable:** Check that all required variables are present in the root `.env` file and have values.
- **SQL connection error:** Verify the host, optional port, database name, login permissions, network access, and encryption settings.
- **Google authentication or permission error:** Verify the credentials path, enable the Google Sheets API for the service-account project, and share the spreadsheet with the service account.
- **Worksheet not found:** Confirm `GOOGLE_SHEET_NAME` exactly matches the worksheet tab name.
- **Duplicate reference error:** Remove or reconcile duplicate product references in column A of the worksheet.