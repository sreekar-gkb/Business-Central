import { getSessionId, findSessionById, resolveSession, touchSession } from '../../lib/session';

export default async function handler(req, res) {
  res.setHeader('Content-Type', 'application/json');

  try {
    if (req.method === 'GET') {
      const sessionId = getSessionId(req);
      const session = await findSessionById(sessionId);
      if (!session) {
        return res.status(200).json({ found: false });
      }
      await touchSession(session.id);
      return res.status(200).json({ found: true, name: session.name });
    }

    if (req.method === 'POST') {
      const { name, password } = req.body || {};
      const sharedPassword = process.env.VIEW_PASSWORD || process.env.SHARED_PASSWORD || 'raven123';

      if (!password) {
        return res.status(400).json({ error: 'Password required' });
      }
      if (password !== sharedPassword) {
        return res.status(401).json({ error: 'Wrong password' });
      }

      const session = await resolveSession(req, res, (name || '').trim() || 'Anonymous');
      return res.status(200).json({ found: true, name: session.name });
    }

    return res.status(405).json({ error: 'Method not allowed' });
  } catch (err) {
    console.error('Session error:', err);
    return res.status(500).json({ error: 'Internal server error' });
  }
}
