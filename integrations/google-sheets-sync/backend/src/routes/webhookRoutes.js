const express = require("express");
const verifyWebhookToken = require("../middleware/verifyWebhookToken");
const { syncSheetRow } = require("../services/sheetSyncService");
const logger = require("../utils/logger");

const router = express.Router();

router.post("/google-sheets", verifyWebhookToken, async (req, res, next) => {
  try {
    logger.info("Webhook received", {
      spreadsheetId: req.body.spreadsheetId,
      sheetName: req.body.sheetName,
      rowNumber: req.body.rowNumber,
      recordId: req.body.recordId
    });

    const result = await syncSheetRow(req.body);

    logger.info("Webhook processed", {
      action: result.action,
      recordId: req.body.recordId
    });

    return res.status(result.statusCode).json(result);
  } catch (error) {
    logger.error("Webhook processing failed", {
      error: error.message,
      stack: error.stack
    });
    return next(error);
  }
});

module.exports = router;
