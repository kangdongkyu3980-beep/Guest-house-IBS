const SYNC_DEFAULTS = {
  SHEET_NAME: "Sheet1",
  HEADER_ROW: "1",
  LOG_SHEET_NAME: "Sync_Log",
  REQUIRED_FIELDS: "name,email"
};

function setWebhookConfig() {
  const props = PropertiesService.getScriptProperties();

  props.setProperties(
    {
      WEBHOOK_URL: "http://localhost:4000/api/webhooks/google-sheets",
      WEBHOOK_TOKEN: "replace-with-the-same-secret-from-your-backend-env",
      SHEET_NAME: "Sheet1",
      HEADER_ROW: "1",
      LOG_SHEET_NAME: "Sync_Log",
      REQUIRED_FIELDS: "name,email"
    },
    true
  );

  Logger.log("Webhook config saved. Update the values in setWebhookConfig() first.");
}

function installSyncTrigger() {
  const spreadsheet = SpreadsheetApp.getActive();
  const triggers = ScriptApp.getProjectTriggers();

  triggers.forEach(function (trigger) {
    if (trigger.getHandlerFunction() === "handleSheetEdit") {
      ScriptApp.deleteTrigger(trigger);
    }
  });

  ScriptApp.newTrigger("handleSheetEdit")
    .forSpreadsheet(spreadsheet)
    .onEdit()
    .create();

  Logger.log("Installable onEdit trigger created.");
}

function handleSheetEdit(event) {
  const lock = LockService.getScriptLock();
  lock.waitLock(30000);

  try {
    if (!event || !event.range) {
      logSyncEvent_("ERROR", "Missing edit event payload", {});
      return;
    }

    const config = getSyncConfig_();
    const sheet = event.range.getSheet();

    if (sheet.getName() !== config.sheetName || sheet.getName() === config.logSheetName) {
      return;
    }

    if (event.range.getRow() <= config.headerRow) {
      return;
    }

    ensureSystemColumns_(sheet);

    const rowNumber = event.range.getRow();
    const rowContext = buildRowContext_(sheet, rowNumber, config);

    if (rowContext.isEmptyRow) {
      logSyncEvent_("SKIP", "Ignored empty row", {
        rowNumber: rowNumber
      });
      return;
    }

    if (rowContext.missingRequiredFields.length > 0) {
      logSyncEvent_("SKIP", "Required fields missing", {
        rowNumber: rowNumber,
        missingRequiredFields: rowContext.missingRequiredFields
      });
      return;
    }

    const payload = createWebhookPayload_(sheet, rowContext, event);
    const response = sendWebhookWithRetry_(payload, config);

    logSyncEvent_("SUCCESS", "Row synced successfully", {
      rowNumber: rowNumber,
      recordId: payload.recordId,
      responseCode: response.statusCode,
      responseBody: response.body
    });
  } catch (error) {
    logSyncEvent_("ERROR", "Sync failed", {
      error: error.message
    });
    throw error;
  } finally {
    lock.releaseLock();
  }
}

function syncActiveRow() {
  const sheet = SpreadsheetApp.getActiveSheet();
  const rowNumber = sheet.getActiveRange().getRow();
  const config = getSyncConfig_();

  ensureSystemColumns_(sheet);

  const rowContext = buildRowContext_(sheet, rowNumber, config);

  if (rowContext.isEmptyRow) {
    Logger.log("Selected row is empty. Nothing to sync.");
    return;
  }

  const payload = createWebhookPayload_(sheet, rowContext, {
    range: sheet.getRange(rowNumber, 1),
    user: Session.getActiveUser().getEmail()
  });

  const response = sendWebhookWithRetry_(payload, config);
  Logger.log("Manual sync completed: " + response.body);
}

function syncAllRows() {
  const config = getSyncConfig_();
  const sheet = SpreadsheetApp.getActiveSpreadsheet().getSheetByName(config.sheetName);

  if (!sheet) {
    throw new Error("Sheet not found: " + config.sheetName);
  }

  ensureSystemColumns_(sheet);

  const lastRow = sheet.getLastRow();

  for (var rowNumber = config.headerRow + 1; rowNumber <= lastRow; rowNumber += 1) {
    const rowContext = buildRowContext_(sheet, rowNumber, config);

    if (rowContext.isEmptyRow || rowContext.missingRequiredFields.length > 0) {
      continue;
    }

    const payload = createWebhookPayload_(sheet, rowContext, {
      range: sheet.getRange(rowNumber, 1),
      user: Session.getActiveUser().getEmail()
    });

    sendWebhookWithRetry_(payload, config);
    Utilities.sleep(200);
  }

  Logger.log("Full row sync finished.");
}

function buildRowContext_(sheet, rowNumber, config) {
  const headerMap = getHeaderMap_(sheet, config.headerRow);
  const lastColumn = sheet.getLastColumn();
  const rowValues = sheet.getRange(rowNumber, 1, 1, lastColumn).getValues()[0];
  const rowData = {};

  Object.keys(headerMap).forEach(function (headerName) {
    rowData[headerName] = rowValues[headerMap[headerName] - 1];
  });

  const isEmptyRow = Object.keys(rowData).every(function (key) {
    return isEmptyValue_(rowData[key]);
  });

  if (isEmptyRow) {
    return {
      rowData: rowData,
      isEmptyRow: true,
      missingRequiredFields: [],
      recordId: "",
      sourceCreatedAt: "",
      sourceUpdatedAt: ""
    };
  }

  var recordId = String(rowData.record_id || "").trim();
  if (!recordId) {
    recordId = Utilities.getUuid();
    sheet.getRange(rowNumber, headerMap.record_id).setValue(recordId);
    rowData.record_id = recordId;
  }

  var sourceCreatedAt = String(rowData.created_at || "").trim();
  if (!sourceCreatedAt) {
    sourceCreatedAt = new Date().toISOString();
    sheet.getRange(rowNumber, headerMap.created_at).setValue(sourceCreatedAt);
    rowData.created_at = sourceCreatedAt;
  }

  var sourceUpdatedAt = new Date().toISOString();
  sheet.getRange(rowNumber, headerMap.updated_at).setValue(sourceUpdatedAt);
  rowData.updated_at = sourceUpdatedAt;

  const missingRequiredFields = config.requiredFields.filter(function (field) {
    return isEmptyValue_(rowData[field]);
  });

  return {
    rowData: rowData,
    isEmptyRow: false,
    missingRequiredFields: missingRequiredFields,
    recordId: recordId,
    sourceCreatedAt: sourceCreatedAt,
    sourceUpdatedAt: sourceUpdatedAt
  };
}

function createWebhookPayload_(sheet, rowContext, event) {
  const spreadsheet = sheet.getParent();
  const editedColumn = event.range ? event.range.getColumn() : 1;
  const changedColumn = sheet.getRange(1, editedColumn).getValue();

  return {
    eventId: Utilities.getUuid(),
    eventType: "row_upsert",
    spreadsheetId: spreadsheet.getId(),
    spreadsheetName: spreadsheet.getName(),
    sheetName: sheet.getName(),
    rowNumber: event.range.getRow(),
    recordId: rowContext.recordId,
    changedColumn: changedColumn ? String(changedColumn) : "",
    actorEmail: event.user ? String(event.user) : Session.getActiveUser().getEmail(),
    sourceCreatedAt: rowContext.sourceCreatedAt,
    sourceUpdatedAt: rowContext.sourceUpdatedAt,
    triggeredAt: new Date().toISOString(),
    rowData: rowContext.rowData
  };
}

function sendWebhookWithRetry_(payload, config) {
  const maxAttempts = 3;
  var lastError = null;

  for (var attempt = 1; attempt <= maxAttempts; attempt += 1) {
    try {
      const response = UrlFetchApp.fetch(config.webhookUrl, {
        method: "post",
        contentType: "application/json",
        muteHttpExceptions: true,
        headers: {
          "x-webhook-token": config.webhookToken
        },
        payload: JSON.stringify(payload)
      });

      const statusCode = response.getResponseCode();
      const body = response.getContentText();

      if (statusCode >= 200 && statusCode < 300) {
        return {
          statusCode: statusCode,
          body: body
        };
      }

      lastError = new Error("Webhook returned HTTP " + statusCode + ": " + body);
    } catch (error) {
      lastError = error;
    }

    Utilities.sleep(attempt * 1000);
  }

  throw lastError || new Error("Webhook failed after retries");
}

function ensureSystemColumns_(sheet) {
  const config = getSyncConfig_();
  const headersRange = sheet.getRange(config.headerRow, 1, 1, Math.max(sheet.getLastColumn(), 1));
  const headers = headersRange.getValues()[0].map(function (value) {
    return String(value || "").trim();
  });
  const requiredHeaders = ["record_id", "created_at", "updated_at"];

  requiredHeaders.forEach(function (headerName) {
    if (headers.indexOf(headerName) === -1) {
      sheet.getRange(config.headerRow, sheet.getLastColumn() + 1).setValue(headerName);
      headers.push(headerName);
    }
  });
}

function getHeaderMap_(sheet, headerRow) {
  const headers = sheet
    .getRange(headerRow, 1, 1, sheet.getLastColumn())
    .getValues()[0]
    .map(function (value) {
      return String(value || "").trim();
    });

  const headerMap = {};

  headers.forEach(function (header, index) {
    if (header) {
      headerMap[header] = index + 1;
    }
  });

  ["record_id", "created_at", "updated_at"].forEach(function (headerName) {
    if (!headerMap[headerName]) {
      throw new Error(
        "Missing required system header: " +
          headerName +
          ". Run ensureSystemColumns_() or edit the header row."
      );
    }
  });

  return headerMap;
}

function getSyncConfig_() {
  const props = PropertiesService.getScriptProperties();

  return {
    webhookUrl: props.getProperty("WEBHOOK_URL") || "",
    webhookToken: props.getProperty("WEBHOOK_TOKEN") || "",
    sheetName: props.getProperty("SHEET_NAME") || SYNC_DEFAULTS.SHEET_NAME,
    headerRow: Number(props.getProperty("HEADER_ROW") || SYNC_DEFAULTS.HEADER_ROW),
    logSheetName: props.getProperty("LOG_SHEET_NAME") || SYNC_DEFAULTS.LOG_SHEET_NAME,
    requiredFields: (props.getProperty("REQUIRED_FIELDS") || SYNC_DEFAULTS.REQUIRED_FIELDS)
      .split(",")
      .map(function (field) {
        return field.trim();
      })
      .filter(Boolean)
  };
}

function logSyncEvent_(status, message, metadata) {
  const spreadsheet = SpreadsheetApp.getActiveSpreadsheet();
  const config = getSyncConfig_();
  var sheet = spreadsheet.getSheetByName(config.logSheetName);

  if (!sheet) {
    sheet = spreadsheet.insertSheet(config.logSheetName);
    sheet.appendRow(["timestamp", "status", "message", "metadata_json"]);
  }

  sheet.appendRow([
    new Date().toISOString(),
    status,
    message,
    JSON.stringify(metadata || {})
  ]);
}

function isEmptyValue_(value) {
  return value === null || value === undefined || String(value).trim() === "";
}
