import fs from 'fs';
import path from 'path';

const SESSION = '332df2';
const ENDPOINT = 'http://127.0.0.1:7809/ingest/b4bb651d-fa82-4099-b017-910ad3ed4847';

function logPath() {
  if (process.env.DEBUG_LOG_PATH) return process.env.DEBUG_LOG_PATH;
  if (process.env.WWEBJS_AUTH_PATH?.startsWith('/data')) {
    return '/data/debug-332df2.log';
  }
  return path.join(process.cwd(), '..', 'debug-332df2.log');
}

/** Debug NDJSON — visible aussi via pushLog Railway si callback fourni. */
export function debugLog(location, message, data = {}, hypothesisId = '?', onLine) {
  const entry = {
    sessionId: SESSION,
    timestamp: Date.now(),
    location,
    message,
    data,
    hypothesisId,
    runId: process.env.DEBUG_RUN_ID || 'pre-fix',
  };
  // #region agent log
  fetch(ENDPOINT, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json', 'X-Debug-Session-Id': SESSION },
    body: JSON.stringify(entry),
  }).catch(() => {});
  // #endregion
  try {
    fs.appendFileSync(logPath(), `${JSON.stringify(entry)}\n`);
  } catch {
    /* ignore */
  }
  if (typeof onLine === 'function') {
    onLine(`[debug:${hypothesisId}] ${message}`, data);
  }
}
