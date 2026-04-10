# Google Sheets Sync Plan

## Goal

Add a production-oriented but beginner-friendly path for syncing edited Google Sheets rows into a backend database without CSV export/import.

## Scope

- Add a standalone Node.js + Express webhook receiver.
- Use PostgreSQL for row upserts and duplicate prevention.
- Add a new Google Apps Script dedicated to webhook sync.
- Document setup, deployment, testing, and failure handling.

## Out Of Scope

- Replacing the current frontend flow in `index.html`
- Building user auth or a full SaaS backend
- Deploying the service to a specific cloud provider automatically

## Deliverables

1. Backend code under `integrations/google-sheets-sync/backend/`
2. Apps Script under `integrations/google-sheets-sync/apps-script/`
3. SQL schema under `integrations/google-sheets-sync/database/`
4. Setup guide under `docs/`
5. Continuity and architecture updates

## Verification

1. Backend starts locally with `.env`
2. Health endpoint returns success
3. Webhook route accepts a valid token and rejects an invalid token
4. Editing the sample spreadsheet sends the full row and upserts by `record_id`
5. Empty rows and incomplete rows are skipped safely
