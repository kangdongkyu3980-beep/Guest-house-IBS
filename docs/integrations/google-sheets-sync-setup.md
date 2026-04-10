# Google Sheets Sync Setup

## Why PostgreSQL

This implementation uses PostgreSQL instead of MySQL because it is the most practical choice here for a beginner-friendly sync service:

- `ON CONFLICT DO UPDATE` makes upsert logic simple and reliable.
- `JSONB` lets us store the entire row safely even if your spreadsheet columns change later.
- Indexing JSON and metadata is straightforward if the system grows.

MySQL can also work, but PostgreSQL gives a cleaner path for duplicate prevention and flexible row storage.

## Folder Layout

```text
integrations/google-sheets-sync/
  apps-script/
    GoogleSheetsSync.gs
  backend/
    .env.example
    .gitignore
    package.json
    src/
      app.js
      server.js
      config/env.js
      db/pool.js
      db/sheetSyncRepository.js
      middleware/verifyWebhookToken.js
      routes/healthRoutes.js
      routes/webhookRoutes.js
      services/sheetSyncService.js
      utils/logger.js
  database/
    schema.sql
```

## Backend Setup

1. Open a terminal in `integrations/google-sheets-sync/backend/`.
2. Run `npm install`.
3. Copy `.env.example` to `.env`.
4. Update `.env`:
   - `DATABASE_URL` should point to your PostgreSQL database.
   - `WEBHOOK_SECRET_TOKEN` should be a long random secret.
   - `REQUIRED_FIELDS` should match your sheet headers, for example `name,email`.
5. Create the database table by running the SQL in `integrations/google-sheets-sync/database/schema.sql`.
6. Start the server with `npm run dev` or `npm start`.
7. Check the server with `GET http://localhost:4000/api/health`.

## Sample PostgreSQL Commands

```sql
CREATE DATABASE google_sheets_sync;
```

```bash
psql "postgresql://postgres:postgres@localhost:5432/google_sheets_sync" -f ../database/schema.sql
```

## Google Sheet Setup

Use one worksheet first, for example `Sheet1`.

Your row 1 headers can look like this:

```text
name | email | company | status
```

You do not need to create `record_id`, `created_at`, or `updated_at` yourself. The script adds them automatically to the header row when needed.

## Google Apps Script Setup

1. Open your Google Spreadsheet.
2. Click `Extensions -> Apps Script`.
3. Delete the default code in the editor.
4. Open [GoogleSheetsSync.gs](/c:/Users/user/OneDrive/Desktop/Jump%20in%20india/6.%20Side-project/integrations/google-sheets-sync/apps-script/GoogleSheetsSync.gs).
5. Copy the entire file and paste it into the Apps Script editor.
6. In the `setWebhookConfig()` function, replace these values:
   - `WEBHOOK_URL`
   - `WEBHOOK_TOKEN`
   - `SHEET_NAME`
   - `REQUIRED_FIELDS`
7. Save the Apps Script project.
8. In the Apps Script editor, choose the `setWebhookConfig` function and click `Run`.
9. Approve the Google permissions prompt.
10. Choose the `installSyncTrigger` function and click `Run`.
11. Approve permissions again if Google asks.

After that, every user edit in the target sheet will trigger the sync.

## Exact Trigger Connection Steps

1. Open the spreadsheet.
2. Open `Extensions -> Apps Script`.
3. Paste the script.
4. Run `setWebhookConfig`.
5. Run `installSyncTrigger`.
6. Confirm in `Triggers` that an installable `On edit` trigger exists for `handleSheetEdit`.

## How Duplicates And Edits Are Handled

- Each row gets a stable `record_id`.
- If a row is edited again later, the same `record_id` is sent again.
- The backend uses a unique database constraint on `(spreadsheet_id, sheet_name, record_id)`.
- PostgreSQL upserts the row:
  - first time: insert
  - later edits: update
- This prevents duplicate registration.

## Safe Partial Edit Handling

- The Apps Script sends the full row snapshot, not only the edited cell.
- Empty rows are ignored.
- Rows missing required fields are skipped instead of being saved half-finished.
- Once the row becomes valid, the next edit syncs it successfully.

## Sample Webhook Payload

```json
{
  "eventId": "86669ec8-67a7-4db1-a1c7-6fc427c2770c",
  "eventType": "row_upsert",
  "spreadsheetId": "1abcExampleSpreadsheetId",
  "spreadsheetName": "Customer Intake",
  "sheetName": "Sheet1",
  "rowNumber": 2,
  "recordId": "9b7f1fc2-68f3-4cf1-9db9-5f4f80f0c123",
  "changedColumn": "email",
  "actorEmail": "owner@example.com",
  "sourceCreatedAt": "2026-04-10T10:15:22.120Z",
  "sourceUpdatedAt": "2026-04-10T10:18:01.944Z",
  "triggeredAt": "2026-04-10T10:18:02.001Z",
  "rowData": {
    "name": "Alice Kim",
    "email": "alice@example.com",
    "company": "Acme",
    "status": "active",
    "record_id": "9b7f1fc2-68f3-4cf1-9db9-5f4f80f0c123",
    "created_at": "2026-04-10T10:15:22.120Z",
    "updated_at": "2026-04-10T10:18:01.944Z"
  }
}
```

## Sample API Responses

Inserted:

```json
{
  "ok": true,
  "statusCode": 200,
  "action": "inserted",
  "message": "Row inserted successfully",
  "record": {
    "id": "1",
    "record_id": "9b7f1fc2-68f3-4cf1-9db9-5f4f80f0c123"
  }
}
```

Updated:

```json
{
  "ok": true,
  "statusCode": 200,
  "action": "updated",
  "message": "Row updated successfully"
}
```

Skipped because required fields are missing:

```json
{
  "ok": true,
  "statusCode": 202,
  "action": "skipped",
  "message": "Required fields are missing, so the row was not saved yet",
  "missingRequiredFields": ["email"],
  "recordId": "9b7f1fc2-68f3-4cf1-9db9-5f4f80f0c123"
}
```

## Local Testing Flow

1. Start PostgreSQL.
2. Run the SQL schema.
3. Start the backend.
4. Paste the Apps Script.
5. Point `WEBHOOK_URL` to your public URL if Google cannot reach localhost.
6. Edit one row in the spreadsheet.
7. Check:
   - Apps Script execution logs
   - `Sync_Log` sheet
   - backend console logs
   - database rows

For local testing, the easiest public tunnel is usually a temporary HTTPS tunnel such as `ngrok` or `cloudflared`. Point `WEBHOOK_URL` at the tunnel URL plus `/api/webhooks/google-sheets`.

## Deployment Notes

Any platform that can run Node.js and connect to PostgreSQL is fine. Example options:

- Render
- Railway
- Fly.io
- VPS with PM2 and Nginx

Deployment checklist:

1. Set the same `.env` values on the server.
2. Run the SQL schema in production.
3. Update the Apps Script `WEBHOOK_URL` to the deployed HTTPS URL.
4. Keep the same `WEBHOOK_SECRET_TOKEN` on both sides.
5. Re-run `setWebhookConfig` if you changed the properties.

## Common Errors

### 401 invalid webhook token

- Cause: The Apps Script token does not match `WEBHOOK_SECRET_TOKEN`.
- Fix: Make both values exactly the same, then run `setWebhookConfig` again.

### 500 internal server error

- Cause: Most often the database table does not exist or `DATABASE_URL` is wrong.
- Fix: Re-run `schema.sql` and confirm the database connection string.

### Nothing happens after editing the sheet

- Cause: The trigger was not installed or the wrong sheet name is configured.
- Fix: Run `installSyncTrigger` again and verify `SHEET_NAME`.

### Rows are skipped

- Cause: The row is empty or a required field is missing.
- Fix: Fill the required fields and edit the row again.

### Google cannot call localhost

- Cause: Apps Script runs in Google cloud, not on your machine.
- Fix: Use a public HTTPS tunnel for local testing, or deploy the backend first.
