const { env } = require("../config/env");
const repository = require("../db/sheetSyncRepository");

function normalizeString(value) {
  if (value === null || value === undefined) {
    return "";
  }

  return String(value).trim();
}

function isEmptyValue(value) {
  if (value === null || value === undefined) {
    return true;
  }

  if (typeof value === "string") {
    return value.trim() === "";
  }

  return false;
}

function isRowEmpty(rowData) {
  return Object.values(rowData || {}).every(isEmptyValue);
}

function findMissingRequiredFields(rowData) {
  return env.requiredFields.filter((field) => isEmptyValue(rowData[field]));
}

function sanitizeRowData(rowData) {
  const sanitized = {};

  for (const [key, value] of Object.entries(rowData || {})) {
    sanitized[key] = typeof value === "string" ? value.trim() : value;
  }

  return sanitized;
}

function buildNormalizedPayload(payload) {
  const rowData = sanitizeRowData(payload.rowData || {});

  return {
    spreadsheetId: normalizeString(payload.spreadsheetId),
    spreadsheetName: normalizeString(payload.spreadsheetName),
    sheetName: normalizeString(payload.sheetName),
    rowNumber: Number(payload.rowNumber) || 0,
    recordId: normalizeString(payload.recordId),
    changedColumn: normalizeString(payload.changedColumn),
    actorEmail: normalizeString(payload.actorEmail),
    sourceEventId: normalizeString(payload.eventId),
    sourceEventType: normalizeString(payload.eventType || "row_upsert"),
    sourceCreatedAt: normalizeString(payload.sourceCreatedAt) || null,
    sourceUpdatedAt: normalizeString(payload.sourceUpdatedAt) || null,
    sourceTriggeredAt: normalizeString(payload.triggeredAt) || null,
    rowData,
    rawPayload: payload
  };
}

function validatePayload(payload) {
  const errors = [];

  if (!payload.spreadsheetId) {
    errors.push("spreadsheetId is required");
  }

  if (!payload.sheetName) {
    errors.push("sheetName is required");
  }

  if (!payload.recordId) {
    errors.push("recordId is required");
  }

  if (!payload.rowNumber) {
    errors.push("rowNumber must be a valid row number");
  }

  if (!payload.rowData || typeof payload.rowData !== "object") {
    errors.push("rowData must be an object");
  }

  return errors;
}

async function syncSheetRow(payload) {
  const normalized = buildNormalizedPayload(payload);
  const errors = validatePayload(normalized);

  if (errors.length > 0) {
    return {
      ok: false,
      statusCode: 400,
      action: "rejected",
      message: "Invalid webhook payload",
      errors
    };
  }

  if (isRowEmpty(normalized.rowData)) {
    return {
      ok: true,
      statusCode: 202,
      action: "skipped",
      message: "Ignored empty row",
      recordId: normalized.recordId
    };
  }

  const missingRequiredFields = findMissingRequiredFields(normalized.rowData);

  if (missingRequiredFields.length > 0) {
    return {
      ok: true,
      statusCode: 202,
      action: "skipped",
      message: "Required fields are missing, so the row was not saved yet",
      missingRequiredFields,
      recordId: normalized.recordId
    };
  }

  const result = await repository.upsertSheetRecord(normalized);

  return {
    ok: true,
    statusCode: 200,
    action: result.action,
    message:
      result.action === "inserted"
        ? "Row inserted successfully"
        : "Row updated successfully",
    record: result.record
  };
}

module.exports = {
  syncSheetRow
};
