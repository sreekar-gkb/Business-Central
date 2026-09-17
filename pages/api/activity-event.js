import { trackEvent } from '../../lib/tracking';

export default function handler(req, res) {
  res.setHeader('Content-Type', 'application/json');

  if (req.method !== 'POST') {
    return res.status(405).json({ error: 'Method not allowed' });
  }

  try {
    const { contact, eventType, details } = req.body;

    if (!contact || !eventType) {
      return res.status(400).json({ error: 'Contact and eventType required' });
    }

    trackEvent(contact, eventType, details || {});

    return res.status(200).json({
      success: true,
      recorded: true,
    });
  } catch (err) {
    console.error('Activity event error:', err);
    return res.status(500).json({ error: 'Internal server error' });
  }
}
