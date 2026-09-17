// Shared in-memory logs storage for all API routes
// Note: Logs are reset when the server restarts
// For production, use a database instead

let logs = [];

export function addLog(entry) {
  logs.push({
    ...entry,
    timestamp: Date.now(),
    time: new Date().toISOString(),
  });
  console.log(`[ACCESS] ${entry.contact} @ ${entry.ip} - ${entry.time}`);
}

export function getLogs() {
  return logs;
}

export function clearLogs() {
  const count = logs.length;
  logs = [];
  return { message: `Cleared ${count} log entries` };
}
