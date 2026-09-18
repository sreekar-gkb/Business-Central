import { sql } from '../../lib/db';

export default async function handler(req, res) {
  res.setHeader('Content-Type', 'application/json');

  const adminKey = req.headers.authorization?.replace('Bearer ', '');
  const correctAdminKey = process.env.ADMIN_KEY || 'admin-key-change-me';

  if (!adminKey || adminKey !== correctAdminKey) {
    return res.status(401).json({ error: 'Unauthorized - invalid or missing admin key' });
  }

  try {
    if (req.method === 'GET') {
      const sessions = await sql`
        SELECT name, ip_address, started_at, user_agent
        FROM sessions
        ORDER BY started_at DESC
        LIMIT 500
      `;
      const logs = sessions.map((s) => ({
        contact: s.name,
        ip: s.ip_address,
        time: s.started_at,
        userAgent: s.user_agent || ''
      }));
      return res.status(200).json({ count: logs.length, logs });
    }

    if (req.method === 'DELETE') {
      await sql`DELETE FROM activity_logs`;
      await sql`DELETE FROM estimate_state`;
      await sql`DELETE FROM sessions`;
      return res.status(200).json({ message: 'Cleared all session and activity records' });
    }

    return res.status(405).json({ error: 'Method not allowed' });
  } catch (err) {
    console.error('Logs API error:', err);
    return res.status(500).json({ error: 'Internal server error' });
  }
}
