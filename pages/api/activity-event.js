import { sql } from '../../lib/db';
import { getSessionId, findSessionById, touchSession } from '../../lib/session';

export default async function handler(req, res) {
  res.setHeader('Content-Type', 'application/json');

  if (req.method !== 'POST') {
    return res.status(405).json({ error: 'Method not allowed' });
  }

  try {
    const sessionId = getSessionId(req);
    const session = await findSessionById(sessionId);
    if (!session) {
      return res.status(401).json({ error: 'No active session' });
    }

    const { eventType, details } = req.body || {};
    if (!eventType) {
      return res.status(400).json({ error: 'eventType required' });
    }

    const detailsJson = JSON.stringify(details || {});
    await sql`
      INSERT INTO activity_logs (session_id, event_type, details)
      VALUES (${session.id}, ${eventType}, ${detailsJson}::jsonb)
    `;
    await touchSession(session.id);

    return res.status(200).json({ success: true, recorded: true });
  } catch (err) {
    console.error('Activity event error:', err);
    return res.status(500).json({ error: 'Internal server error' });
  }
}
