import { getSessionToken, findSessionByToken, resolveSession, touchSession } from '../../lib/session';

export default async function handler(req, res) {
  res.setHeader('Content-Type', 'application/json');

  try {
    if (req.method === 'GET') {
      const token = getSessionToken(req);
      const session = await findSessionByToken(token);
      if (!session) {
        return res.status(200).json({ found: false });
      }
      await touchSession(session.id);
      return res.status(200).json({ found: true, name: session.name });
    }

    if (req.method === 'POST') {
      const { name } = req.body || {};
      const session = await resolveSession(req, res, (name || '').trim() || 'Anonymous');
      return res.status(200).json({ found: true, name: session.name });
    }

    return res.status(405).json({ error: 'Method not allowed' });
  } catch (err) {
    console.error('Session error:', err);
    return res.status(500).json({ error: 'Internal server error' });
  }
}
