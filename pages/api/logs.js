import { getLogs, clearLogs } from '../../lib/logs';

export default function handler(req, res) {
  res.setHeader('Content-Type', 'application/json');

  // Check admin authorization
  const adminKey = req.headers.authorization?.replace('Bearer ', '');
  const correctAdminKey = process.env.ADMIN_KEY || 'admin-key-change-me';

  if (!adminKey || adminKey !== correctAdminKey) {
    return res.status(401).json({ error: 'Unauthorized - invalid or missing admin key' });
  }

  // GET logs
  if (req.method === 'GET') {
    const logs = getLogs();
    return res.status(200).json({
      count: logs.length,
      logs: logs,
    });
  }

  // DELETE logs (clear)
  if (req.method === 'DELETE') {
    const result = clearLogs();
    return res.status(200).json(result);
  }

  return res.status(405).json({ error: 'Method not allowed' });
}
