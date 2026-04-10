function formatMeta(meta) {
  if (!meta) {
    return "";
  }

  try {
    return ` ${JSON.stringify(meta)}`;
  } catch (error) {
    return " [unserializable metadata]";
  }
}

function info(message, meta) {
  console.log(`[INFO] ${new Date().toISOString()} ${message}${formatMeta(meta)}`);
}

function warn(message, meta) {
  console.warn(`[WARN] ${new Date().toISOString()} ${message}${formatMeta(meta)}`);
}

function error(message, meta) {
  console.error(
    `[ERROR] ${new Date().toISOString()} ${message}${formatMeta(meta)}`
  );
}

module.exports = {
  info,
  warn,
  error
};
