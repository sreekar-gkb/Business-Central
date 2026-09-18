import { sql } from '../../lib/db';

function checkAdmin(req, res) {
  const adminKey = req.headers.authorization?.replace('Bearer ', '');
  const correctAdminKey = process.env.ADMIN_KEY || 'admin123';
  if (!adminKey || adminKey !== correctAdminKey) {
    res.status(401).json({ error: 'Unauthorized' });
    return false;
  }
  return true;
}

export default async function handler(req, res) {
  res.setHeader('Content-Type', 'application/json');
  if (!checkAdmin(req, res)) return;

  try {
    if (req.method === 'GET') {
      const { contact } = req.query;

      if (contact) {
        const sessions = await sql`
          SELECT id, session_token, name, started_at, last_activity_at
          FROM sessions WHERE name = ${contact}
          ORDER BY last_activity_at DESC LIMIT 1
        `;
        const session = sessions[0];
        if (!session) {
          return res.status(404).json({ error: 'No activity found for this contact' });
        }

        const events = await sql`
          SELECT event_type, details, created_at
          FROM activity_logs WHERE session_id = ${session.id}
          ORDER BY created_at ASC
        `;

        const panelViews = {};
        let inputChanges = 0;
        events.forEach((e) => {
          if (e.event_type === 'panel_view') {
            const panel = e.details?.panel || 'unknown';
            if (!panelViews[panel]) panelViews[panel] = { count: 0, firstView: e.created_at, lastView: e.created_at };
            panelViews[panel].count++;
            panelViews[panel].lastView = e.created_at;
          }
          if (e.event_type === 'input_change') inputChanges++;
        });

        const startTime = new Date(session.started_at).getTime();
        const lastActivity = new Date(session.last_activity_at).getTime();

        return res.status(200).json({
          contact: session.name,
          sessionId: session.session_token,
          startTime: session.started_at,
          sessionDurationMs: lastActivity - startTime,
          sessionDurationMins: Math.round((lastActivity - startTime) / 1000 / 60),
          totalEvents: events.length,
          panelViews,
          inputChanges,
          timeline: events.map((e) => ({
            time: e.created_at,
            type: e.event_type,
            details: e.details
          }))
        });
      }

      // All sessions grouped, most recently active first
      const sessions = await sql`
        SELECT s.id, s.session_token, s.name, s.started_at, s.last_activity_at,
               COUNT(a.id) AS event_count
        FROM sessions s
        LEFT JOIN activity_logs a ON a.session_id = s.id
        GROUP BY s.id
        ORDER BY s.last_activity_at DESC
        LIMIT 200
      `;

      return res.status(200).json({
        count: sessions.reduce((sum, s) => sum + Number(s.event_count), 0),
        contacts: sessions.length,
        activities: sessions.map((s) => ({
          contact: s.name,
          sessionId: s.session_token,
          activities: new Array(Number(s.event_count)).fill(null)
        }))
      });
    }

    if (req.method === 'DELETE') {
      await sql`DELETE FROM activity_logs`;
      await sql`DELETE FROM estimate_state`;
      await sql`DELETE FROM sessions`;
      return res.status(200).json({ message: 'Cleared all activity records' });
    }

    return res.status(405).json({ error: 'Method not allowed' });
  } catch (err) {
    console.error('Activity API error:', err);
    return res.status(500).json({ error: 'Internal server error' });
  }
}
