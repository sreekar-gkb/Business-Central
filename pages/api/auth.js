import { addLog } from '../../lib/logs';

export default function handler(req, res) {
  res.setHeader('Access-Control-Allow-Origin', '*');
  res.setHeader('Access-Control-Allow-Methods', 'POST, OPTIONS');
  res.setHeader('Content-Type', 'application/json');

  if (req.method === 'OPTIONS') {
    return res.status(200).end();
  }

  if (req.method !== 'POST') {
    return res.status(405).json({ error: 'Method not allowed' });
  }

  try {
    const { password, contact } = req.body;
    const correctPassword = process.env.NEXT_PUBLIC_VIEW_PASSWORD || process.env.VIEW_PASSWORD || 'raven123';

    if (!password) {
      return res.status(400).json({ error: 'Password required' });
    }

    if (password === correctPassword) {
      // Log the access
      addLog({
        contact: contact || 'Anonymous',
        ip: req.headers['x-forwarded-for']?.split(',')[0] || req.socket.remoteAddress || 'unknown',
        userAgent: req.headers['user-agent'] || 'unknown',
      });

      return res.status(200).json({ success: true, message: 'Access granted' });
    }

    return res.status(401).json({ error: 'Wrong password' });
  } catch (e) {
    console.error('Auth error:', e);
    return res.status(500).json({ error: 'Internal server error' });
  }
}
