const crypto = require("crypto");
const { env } = require("../config/env");

function safeEqual(left, right) {
  const leftBuffer = Buffer.from(left);
  const rightBuffer = Buffer.from(right);

  if (leftBuffer.length !== rightBuffer.length) {
    return false;
  }

  return crypto.timingSafeEqual(leftBuffer, rightBuffer);
}

function verifyWebhookToken(req, res, next) {
  const incomingToken = req.header("x-webhook-token");

  if (!incomingToken) {
    return res.status(401).json({
      ok: false,
      message: "Missing x-webhook-token header"
    });
  }

  if (!safeEqual(incomingToken, env.webhookSecretToken)) {
    return res.status(401).json({
      ok: false,
      message: "Invalid webhook token"
    });
  }

  return next();
}

module.exports = verifyWebhookToken;
