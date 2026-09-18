import { sql } from '../../lib/db';
import { getSessionId, findSessionById } from '../../lib/session';

export default async function handler(req, res) {
  res.setHeader('Content-Type', 'application/json');

  try {
    const sessionId = getSessionId(req);
    const session = await findSessionById(sessionId);
    if (!session) {
      return res.status(401).json({ error: 'No active session' });
    }

    if (req.method === 'GET') {
      const rows = await sql`
        SELECT state, updated_at FROM estimate_state WHERE session_id = ${session.id} LIMIT 1
      `;
      if (rows.length === 0) {
        return res.status(200).json({ state: null });
      }
      return res.status(200).json({ state: rows[0].state, updatedAt: rows[0].updated_at });
    }

    if (req.method === 'POST') {
      const { state } = req.body || {};
      if (!state) {
        return res.status(400).json({ error: 'state required' });
      }
      const stateJson = JSON.stringify(state);
      await sql`
        INSERT INTO estimate_state (session_id, state, updated_at)
        VALUES (${session.id}, ${stateJson}::jsonb, now())
        ON CONFLICT (session_id)
        DO UPDATE SET state = ${stateJson}::jsonb, updated_at = now()
      `;
      return res.status(200).json({ success: true });
    }

    return res.status(405).json({ error: 'Method not allowed' });
  } catch (err) {
    console.error('Estimate persistence error:', err);
    return res.status(500).json({ error: 'Internal server error' });
  }
}
