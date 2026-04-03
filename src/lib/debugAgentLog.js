/** Compact debug ingest (no tokens/secrets in payloads). Session `78f732`. */
const ENDPOINT =
  "http://127.0.0.1:7287/ingest/33a6545c-95fa-4ea6-9ed7-b6eaf9d3be21";
const SESSION_ID = "78f732";

export function debugAgentLog(location, message, data, hypothesisId) {
  fetch(ENDPOINT, {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
      "X-Debug-Session-Id": SESSION_ID,
    },
    body: JSON.stringify({
      sessionId: SESSION_ID,
      hypothesisId,
      location,
      message,
      data,
      timestamp: Date.now(),
    }),
  }).catch(() => {});
}
