import { getActivities, getDetailedReport, clearActivities } from '../../lib/tracking';

export default function handler(req, res) {
  res.setHeader('Content-Type', 'application/json');

  // Check admin authorization
  const adminKey = req.headers.authorization?.replace('Bearer ', '');
  const correctAdminKey = process.env.ADMIN_KEY || 'admin123';

  if (!adminKey || adminKey !== correctAdminKey) {
    return res.status(401).json({ error: 'Unauthorized' });
  }

  // GET all activities
  if (req.method === 'GET') {
    const { contact } = req.query;

    if (contact) {
      // Get detailed report for specific contact
      const report = getDetailedReport(contact);
      if (!report) {
        return res.status(404).json({ error: 'No activity found for this contact' });
      }
      return res.status(200).json(report);
    }

    // Get all activities
    const activities = getActivities();

    // Group by contact and session
    const grouped = {};
    activities.forEach((activity) => {
      if (!grouped[activity.contact]) {
        grouped[activity.contact] = {
          contact: activity.contact,
          sessionId: activity.sessionId,
          activities: [],
        };
      }
      grouped[activity.contact].activities.push({
        timestamp: activity.timestamp,
        time: activity.time,
        type: activity.type,
        details: activity.details,
      });
    });

    return res.status(200).json({
      count: activities.length,
      contacts: Object.keys(grouped).length,
      activities: Object.values(grouped),
    });
  }

  // DELETE clear activities
  if (req.method === 'DELETE') {
    const result = clearActivities();
    return res.status(200).json(result);
  }

  return res.status(405).json({ error: 'Method not allowed' });
}
