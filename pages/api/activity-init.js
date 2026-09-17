import { startSession } from '../../lib/tracking';

export default function handler(req, res) {
  res.setHeader('Content-Type', 'application/json');

  if (req.method !== 'POST') {
    return res.status(405).json({ error: 'Method not allowed' });
  }

  try {
    const { contact } = req.body;

    if (!contact) {
      return res.status(400).json({ error: 'Contact required' });
    }

    const sessionId = startSession(contact);

    return res.status(200).json({
      success: true,
      sessionId,
      contact,
      startTime: new Date().toISOString(),
    });
  } catch (err) {
    console.error('Activity init error:', err);
    return res.status(500).json({ error: 'Internal server error' });
  }
}
