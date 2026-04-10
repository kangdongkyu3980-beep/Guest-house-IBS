const pool = require("./pool");

async function upsertSheetRecord(input) {
  const existingQuery = `
    SELECT id, record_id, created_at, updated_at
    FROM sheet_records
    WHERE spreadsheet_id = $1
      AND sheet_name = $2
      AND record_id = $3
    LIMIT 1;
  `;

  const upsertQuery = `
    INSERT INTO sheet_records (
      spreadsheet_id,
      spreadsheet_name,
      sheet_name,
      row_number,
      record_id,
      changed_column,
      actor_email,
      source_event_id,
      source_event_type,
      source_created_at,
      source_updated_at,
      source_triggered_at,
      row_data,
      raw_payload
    )
    VALUES (
      $1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11, $12, $13::jsonb, $14::jsonb
    )
    ON CONFLICT (spreadsheet_id, sheet_name, record_id)
    DO UPDATE SET
      spreadsheet_name = EXCLUDED.spreadsheet_name,
      row_number = EXCLUDED.row_number,
      changed_column = EXCLUDED.changed_column,
      actor_email = EXCLUDED.actor_email,
      source_event_id = EXCLUDED.source_event_id,
      source_event_type = EXCLUDED.source_event_type,
      source_created_at = COALESCE(sheet_records.source_created_at, EXCLUDED.source_created_at),
      source_updated_at = EXCLUDED.source_updated_at,
      source_triggered_at = EXCLUDED.source_triggered_at,
      row_data = EXCLUDED.row_data,
      raw_payload = EXCLUDED.raw_payload,
      updated_at = NOW()
    RETURNING
      id,
      spreadsheet_id,
      spreadsheet_name,
      sheet_name,
      row_number,
      record_id,
      changed_column,
      actor_email,
      source_event_id,
      source_event_type,
      source_created_at,
      source_updated_at,
      source_triggered_at,
      row_data,
      created_at,
      updated_at;
  `;

  const client = await pool.connect();

  try {
    await client.query("BEGIN");

    const existingResult = await client.query(existingQuery, [
      input.spreadsheetId,
      input.sheetName,
      input.recordId
    ]);

    const existing = existingResult.rows[0] || null;

    const upsertResult = await client.query(upsertQuery, [
      input.spreadsheetId,
      input.spreadsheetName,
      input.sheetName,
      input.rowNumber,
      input.recordId,
      input.changedColumn,
      input.actorEmail,
      input.sourceEventId,
      input.sourceEventType,
      input.sourceCreatedAt,
      input.sourceUpdatedAt,
      input.sourceTriggeredAt,
      JSON.stringify(input.rowData),
      JSON.stringify(input.rawPayload)
    ]);

    await client.query("COMMIT");

    return {
      action: existing ? "updated" : "inserted",
      record: upsertResult.rows[0]
    };
  } catch (error) {
    await client.query("ROLLBACK");
    throw error;
  } finally {
    client.release();
  }
}

module.exports = {
  upsertSheetRecord
};
