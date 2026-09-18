import { Request, Response, NextFunction } from 'express';
import { v4 as uuidv4 } from 'uuid';
import { pool } from '../database/connection';
import { UAParser } from 'ua-parser-js';

// Extend Express Request to include tracking info
declare global {
  namespace Express {
    interface Request {
      trackingId?: string;
      sessionId?: string;
      startTime?: number;
    }
  }
}

/**
 * Session Creator Middleware
 * Creates or retrieves anonymous session (NO AUTH REQUIRED)
 */
export const sessionCreator = async (
  req: Request,
  res: Response,
  next: NextFunction
) => {
  try {
    let sessionToken = req.cookies?.sessionId;

    // If no existing session, create a new one
    if (!sessionToken) {
      sessionToken = `anon-${uuidv4()}`;

      // Get device info
      const parser = new UAParser(req.headers['user-agent']);
      const browserInfo = parser.getResult();

      // Create session in database
      const query = `
        INSERT INTO sessions (session_token, ip_address, user_agent, device_info)
        VALUES ($1, $2, $3, $4)
      `;

      await pool.query(query, [
        sessionToken,
        getClientIP(req),
        req.headers['user-agent'],
        JSON.stringify(browserInfo),
      ]);

      // Set cookie to remember session
      res.cookie('sessionId', sessionToken, {
        maxAge: 30 * 24 * 60 * 60 * 1000, // 30 days
        httpOnly: true,
        secure: process.env.NODE_ENV === 'production',
        sameSite: 'lax',
      });
    } else {
      // Update last activity for existing session
      await pool.query(
        'UPDATE sessions SET last_activity_at = NOW() WHERE session_token = $1',
        [sessionToken]
      );
    }

    req.sessionId = sessionToken;
    req.trackingId = uuidv4();
    req.startTime = Date.now();

    next();
  } catch (error) {
    console.error('Session creator error:', error);
    next();
  }
};

/**
 * Activity Tracking Middleware
 * Logs all user actions anonymously
 */
export const activityTracker = async (
  req: Request,
  res: Response,
  next: NextFunction
) => {
  try {
    // Capture response to log later
    const originalSend = res.send;
    res.send = function (data) {
      // After response is sent, log the activity
      logActivity(req, res, data).catch(err => {
        console.error('Activity logging error:', err);
      });
      return originalSend.call(this, data);
    };

    next();
  } catch (error) {
    console.error('Tracking middleware error:', error);
    next();
  }
};

/**
 * Page View Tracker
 * Logs when users visit different pages/panels
 */
export const pageViewTracker = async (
  req: Request,
  res: Response,
  next: NextFunction
) => {
  try {
    const { page_name, time_spent, scroll_depth } = req.body;

    if (!req.sessionId || !page_name) {
      return res.status(400).json({ error: 'Missing required fields' });
    }

    // Get session ID from database
    const sessionResult = await pool.query(
      'SELECT id FROM sessions WHERE session_token = $1',
      [req.sessionId]
    );

    if (sessionResult.rows.length === 0) {
      return res.status(404).json({ error: 'Session not found' });
    }

    const sessionUUID = sessionResult.rows[0].id;

    const query = `
      INSERT INTO page_views (
        session_id, page_name, entry_time,
        time_spent_seconds, scroll_depth
      ) VALUES ($1, $2, NOW(), $3, $4)
    `;

    await pool.query(query, [
      sessionUUID,
      page_name,
      time_spent || null,
      scroll_depth || null,
    ]);

    res.json({ success: true, tracking_id: req.trackingId });
  } catch (error) {
    console.error('Page view tracking error:', error);
    res.status(500).json({ error: 'Failed to track page view' });
  }
};

/**
 * Feature Usage Tracker
 * Tracks which features users interact with
 */
export const featureUsageTracker = async (
  req: Request,
  res: Response,
  next: NextFunction
) => {
  try {
    const { feature_name } = req.body;

    if (!req.sessionId || !feature_name) {
      return res.status(400).json({ error: 'Missing required fields' });
    }

    // Get session UUID
    const sessionResult = await pool.query(
      'SELECT id FROM sessions WHERE session_token = $1',
      [req.sessionId]
    );

    if (sessionResult.rows.length === 0) {
      return res.status(404).json({ error: 'Session not found' });
    }

    const sessionUUID = sessionResult.rows[0].id;

    const query = `
      INSERT INTO feature_usage (session_id, feature_name, last_used_at)
      VALUES ($1, $2, NOW())
      ON CONFLICT (session_id, feature_name)
      DO UPDATE SET usage_count = usage_count + 1,
                    last_used_at = NOW()
    `;

    await pool.query(query, [sessionUUID, feature_name]);

    res.json({ success: true, tracking_id: req.trackingId });
  } catch (error) {
    console.error('Feature usage tracking error:', error);
    res.status(500).json({ error: 'Failed to track feature usage' });
  }
};

/**
 * Error Tracking
 * Logs errors that occur (client-side or server-side)
 */
export const errorTracker = async (
  req: Request,
  res: Response,
  next: NextFunction
) => {
  try {
    const { error_type, error_message, error_stack, page_name } = req.body;

    if (!error_message) {
      return res.status(400).json({ error: 'Missing error_message' });
    }

    const parser = new UAParser(req.headers['user-agent']);
    const browserInfo = parser.getResult();

    // Get session UUID if available
    let sessionUUID = null;
    if (req.sessionId) {
      const sessionResult = await pool.query(
        'SELECT id FROM sessions WHERE session_token = $1',
        [req.sessionId]
      );
      if (sessionResult.rows.length > 0) {
        sessionUUID = sessionResult.rows[0].id;
      }
    }

    const query = `
      INSERT INTO error_logs (
        session_id, error_type, error_message, error_stack,
        page_name, user_agent, ip_address, browser_info
      ) VALUES ($1, $2, $3, $4, $5, $6, $7, $8)
    `;

    await pool.query(query, [
      sessionUUID,
      error_type || 'UNKNOWN',
      error_message,
      error_stack || null,
      page_name || null,
      req.headers['user-agent'],
      getClientIP(req),
      JSON.stringify(browserInfo),
    ]);

    res.json({
      success: true,
      error_id: req.trackingId,
      message: 'Error logged successfully'
    });
  } catch (error) {
    console.error('Error tracking error:', error);
    res.status(500).json({ error: 'Failed to track error' });
  }
};

/**
 * Helper function to log activity
 */
async function logActivity(
  req: Request,
  res: Response,
  responseData?: any
) {
  try {
    if (!req.sessionId) return;

    // Determine action type based on route and method
    const actionType = determineActionType(req);

    // Only log specific actions we care about
    const trackedActions = [
      'view_page',
      'create_estimate',
      'update_estimate',
      'export_estimate',
      'run_scenario',
      'delete_estimate',
      'update_field',
    ];

    if (!trackedActions.includes(actionType)) {
      return; // Don't log every request
    }

    // Get session UUID
    const sessionResult = await pool.query(
      'SELECT id FROM sessions WHERE session_token = $1',
      [req.sessionId]
    );

    if (sessionResult.rows.length === 0) return;

    const sessionUUID = sessionResult.rows[0].id;

    const query = `
      INSERT INTO activity_logs (
        session_id, action_type, resource_type,
        resource_id, action_details, ip_address, user_agent,
        status, error_message
      ) VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9)
    `;

    const status = res.statusCode >= 400 ? 'error' : 'success';
    const resourceInfo = extractResourceInfo(req);

    await pool.query(query, [
      sessionUUID,
      actionType,
      resourceInfo.type || null,
      resourceInfo.id || null,
      JSON.stringify(req.body || {}),
      getClientIP(req),
      req.headers['user-agent'],
      status,
      status === 'error' ? res.statusMessage : null,
    ]);
  } catch (error) {
    console.error('Failed to log activity:', error);
  }
}

/**
 * Helper to determine action type from request
 */
function determineActionType(req: Request): string {
  const method = req.method;
  const path = req.path;

  if (path.includes('/estimates') && method === 'POST') return 'create_estimate';
  if (path.includes('/estimates') && method === 'PUT') return 'update_estimate';
  if (path.includes('/estimates') && method === 'GET') return 'view_estimate';
  if (path.includes('/export') && method === 'GET') return 'export_estimate';
  if (path.includes('/scenarios') && method === 'POST') return 'run_scenario';
  if (path.includes('/estimates') && method === 'DELETE') return 'delete_estimate';
  if (path.includes('/tracking')) return 'tracking_event';

  return 'unknown_action';
}

/**
 * Helper to extract resource info
 */
function extractResourceInfo(req: Request): { type?: string; id?: string } {
  const path = req.path;

  if (path.includes('/estimates/')) {
    const id = path.split('/').pop();
    return { type: 'estimate', id };
  }
  if (path.includes('/modules')) {
    return { type: 'module', id: req.body?.module_id };
  }
  if (path.includes('/integrations')) {
    return { type: 'integration', id: req.body?.integration_id };
  }

  return {};
}

/**
 * Get client IP address
 */
function getClientIP(req: Request): string {
  return (
    (req.headers['x-forwarded-for'] as string)?.split(',')[0] ||
    req.socket.remoteAddress ||
    'unknown'
  );
}
