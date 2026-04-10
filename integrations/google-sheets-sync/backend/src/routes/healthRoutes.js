const express = require("express");
const pool = require("../db/pool");

const router = express.Router();

router.get("/", async (_req, res, next) => {
  try {
    await pool.query("SELECT 1");

    return res.status(200).json({
      ok: true,
      message: "Server and database are healthy",
      timestamp: new Date().toISOString()
    });
  } catch (error) {
    return next(error);
  }
});

module.exports = router;
