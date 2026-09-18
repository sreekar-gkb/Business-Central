// Simple in-memory settings storage
// For production, use a database
let settings = {
  adminPassword: process.env.ADMIN_PASSWORD || 'admin123',
  username: 'Administrator',
};

export default function handler(req, res) {
  res.setHeader('Content-Type', 'application/json');

  // Check admin authorization
  const adminKey = req.headers.authorization?.replace('Bearer ', '');
  const correctAdminKey = process.env.ADMIN_KEY || 'admin123';

  if (!adminKey || adminKey !== correctAdminKey) {
    return res.status(401).json({ error: 'Unauthorized - invalid or missing admin key' });
  }

  // GET settings
  if (req.method === 'GET') {
    return res.status(200).json({
      username: settings.username,
    });
  }

  // POST actions
  if (req.method === 'POST') {
    const { action, currentPassword, newPassword } = req.body;

    if (action === 'authenticate') {
      return res.status(200).json({ success: true, username: settings.username });
    }

    if (action === 'updatePassword') {
      // Verify current password
      if (currentPassword !== settings.adminPassword) {
        return res.status(400).json({ error: 'Current password is incorrect' });
      }

      if (!newPassword || newPassword.length < 8) {
        return res.status(400).json({ error: 'New password must be at least 8 characters' });
      }

      settings.adminPassword = newPassword;
      process.env.ADMIN_PASSWORD = newPassword;

      console.log('[SECURITY] Admin password changed');
      return res.status(200).json({
        success: true,
        message: 'Admin password updated successfully',
      });
    }

    return res.status(400).json({ error: 'Unknown action' });
  }

  return res.status(405).json({ error: 'Method not allowed' });
}

// Export settings for use in other APIs
export function getSettings() {
  return settings;
}

export function updateSettings(newSettings) {
  settings = { ...settings, ...newSettings };
  return settings;
}
