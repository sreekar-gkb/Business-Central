import { Router, Request, Response } from 'express';
import { pool } from '../database/connection';

const router = Router();

// Simple API key middleware (NO JWT REQUIRED)
const checkAdminKey = (req: Request, res: Response, next: () => void) => {
  const adminKey = req.headers['x-admin-key'];
  const validKey = process.env.ADMIN_API_KEY || 'admin-key-12345';

  if (adminKey !== validKey) {
    return res.status(401).json({ error: 'Invalid admin key' });
  }
  next();
};

/**
 * GET /api/admin/dashboard
 * Get overall admin dashboard statistics
 */
router.get('/dashboard', checkAdminKey, async (req: Request, res: Response) => {
  try {
    const stats = await pool.query(`
      SELECT
        (SELECT COUNT(DISTINCT session_token) FROM sessions WHERE is_active = TRUE) as active_sessions_now,
        (SELECT COUNT(DISTINCT session_token) FROM sessions) as total_sessions,
        (SELECT COUNT(*) FROM estimates WHERE deleted_at IS NULL) as total_estimates,
        (SELECT COUNT(*) FROM activity_logs WHERE timestamp > NOW() - INTERVAL '24 hours') as actions_last_24h,
        (SELECT COUNT(*) FROM error_logs WHERE timestamp > NOW() - INTERVAL '24 hours') as errors_last_24h,
        (SELECT COUNT(DISTINCT session_id) FROM activity_logs WHERE timestamp > NOW() - INTERVAL '24 hours') as active_sessions_24h
    `);

    res.json(stats.rows[0]);
  } catch (error) {
    console.error('Dashboard stats error:', error);
    res.status(500).json({ error: 'Failed to fetch dashboard statistics' });
  }
});

/**
 * GET /api/admin/activity-feed
 * Get paginated activity log with filtering
 */
router.get('/activity-feed', checkAdminKey, async (req: Request, res: Response) => {
  try {
    const { page = 1, limit = 50, action_type, date_from, date_to } = req.query;
    const offset = ((Number(page) - 1) * Number(limit));

    let query = `
      SELECT
        al.id, al.session_id, al.action_type, al.resource_type,
        al.resource_id, al.status, al.timestamp,
        s.session_token, s.ip_address, s.started_at,
        al.action_details, COUNT(*) OVER() as total_count
      FROM activity_logs al
      LEFT JOIN sessions s ON al.session_id = s.id
      WHERE 1=1
    `;
    const params: any[] = [];
    let paramCount = 1;

    // Apply filters
    if (action_type) {
      query += ` AND al.action_type = $${paramCount}`;
      params.push(action_type);
      paramCount++;
    }

    if (date_from) {
      query += ` AND al.timestamp >= $${paramCount}`;
      params.push(new Date(date_from as string));
      paramCount++;
    }

    if (date_to) {
      query += ` AND al.timestamp <= $${paramCount}`;
      params.push(new Date(date_to as string));
      paramCount++;
    }

    // Add ordering and pagination
    query += ` ORDER BY al.timestamp DESC LIMIT $${paramCount} OFFSET $${paramCount + 1}`;
    params.push(Number(limit), offset);

    const result = await pool.query(query, params);

    const total = result.rows.length > 0 ? result.rows[0].total_count : 0;

    res.json({
      data: result.rows.map(row => ({
        id: row.id,
        session_token: row.session_token,
        session_id: row.session_id,
        action_type: row.action_type,
        resource_type: row.resource_type,
        status: row.status,
        timestamp: row.timestamp,
        ip_address: row.ip_address,
        action_details: row.action_details,
      })),
      pagination: {
        page: Number(page),
        limit: Number(limit),
        total,
        pages: Math.ceil(total / Number(limit)),
      },
    });
  } catch (error) {
    console.error('Activity feed error:', error);
    res.status(500).json({ error: 'Failed to fetch activity feed' });
  }
});

/**
 * GET /api/admin/sessions
 * Get all active sessions with statistics
 */
router.get('/sessions', checkAdminKey, async (req: Request, res: Response) => {
  try {
    const { page = 1, limit = 50 } = req.query;
    const offset = ((Number(page) - 1) * Number(limit));

    const result = await pool.query(`
      SELECT
        s.id,
        s.session_token,
        s.ip_address,
        s.started_at,
        s.last_activity_at,
        s.is_active,
        COUNT(DISTINCT al.id) as total_actions,
        COUNT(DISTINCT pv.id) as page_views,
        COUNT(DISTINCT CASE WHEN al.action_type = 'create_estimate' THEN al.id END) as estimates_created,
        COUNT(DISTINCT CASE WHEN al.action_type = 'export_estimate' THEN al.id END) as exports,
        COUNT(DISTINCT CASE WHEN al.status = 'error' THEN al.id END) as errors
      FROM sessions s
      LEFT JOIN activity_logs al ON s.id = al.session_id
      LEFT JOIN page_views pv ON s.id = pv.session_id
      WHERE s.is_active = TRUE
      GROUP BY s.id, s.session_token, s.ip_address, s.started_at, s.last_activity_at, s.is_active
      ORDER BY s.last_activity_at DESC
      LIMIT $1 OFFSET $2
    `, [Number(limit), offset]);

    // Get total count
    const countResult = await pool.query('SELECT COUNT(*) as total FROM sessions WHERE is_active = TRUE');

    res.json({
      data: result.rows,
      pagination: {
        page: Number(page),
        limit: Number(limit),
        total: countResult.rows[0].total,
        pages: Math.ceil(countResult.rows[0].total / Number(limit)),
      },
    });
  } catch (error) {
    console.error('Sessions list error:', error);
    res.status(500).json({ error: 'Failed to fetch sessions' });
  }
});

/**
 * GET /api/admin/sessions/:session_id/details
 * Get detailed activity for a specific session
 */
router.get('/sessions/:session_id/details', checkAdminKey, async (req: Request, res: Response) => {
  try {
    const { session_id } = req.params;
    const { days = 30 } = req.query;

    // Get session info
    const sessionResult = await pool.query(
      `SELECT id, session_token, ip_address, started_at, last_activity_at, is_active
       FROM sessions WHERE session_token = $1`,
      [session_id]
    );

    if (sessionResult.rows.length === 0) {
      return res.status(404).json({ error: 'Session not found' });
    }

    const session = sessionResult.rows[0];

    // Get activity timeline
    const activities = await pool.query(`
      SELECT
        action_type, COUNT(*) as count,
        MAX(timestamp) as last_occurrence
      FROM activity_logs
      WHERE session_id = $1
        AND timestamp > NOW() - INTERVAL '${Number(days)} days'
      GROUP BY action_type
      ORDER BY last_occurrence DESC
    `, [session.id]);

    // Get page views
    const pageViews = await pool.query(`
      SELECT
        page_name, COUNT(*) as visits,
        SUM(time_spent_seconds) as total_time_seconds,
        ROUND(AVG(time_spent_seconds)::numeric, 2) as avg_time_seconds
      FROM page_views
      WHERE session_id = $1
        AND entry_time > NOW() - INTERVAL '${Number(days)} days'
      GROUP BY page_name
      ORDER BY visits DESC
    `, [session.id]);

    // Get feature usage
    const features = await pool.query(`
      SELECT feature_name, usage_count, last_used_at
      FROM feature_usage
      WHERE session_id = $1
      ORDER BY usage_count DESC
    `, [session.id]);

    // Get recent actions
    const recentActions = await pool.query(`
      SELECT
        action_type, resource_type, status, timestamp, action_details
      FROM activity_logs
      WHERE session_id = $1
      ORDER BY timestamp DESC
      LIMIT 50
    `, [session.id]);

    res.json({
      session,
      activity_summary: {
        total_actions: activities.rows.reduce((sum, row) => sum + row.count, 0),
        action_breakdown: activities.rows,
      },
      page_views: pageViews.rows,
      feature_usage: features.rows,
      recent_actions: recentActions.rows,
    });
  } catch (error) {
    console.error('Session activity error:', error);
    res.status(500).json({ error: 'Failed to fetch session activity' });
  }
});

/**
 * GET /api/admin/analytics/estimates
 * Get estimate creation analytics
 */
router.get('/analytics/estimates', checkAdminKey, async (req: Request, res: Response) => {
  try {
    const { period = '30' } = req.query;

    const result = await pool.query(`
      SELECT
        DATE_TRUNC('day', created_at)::date as date,
        COUNT(*) as estimates_created,
        COUNT(DISTINCT session_id) as unique_sessions,
        COUNT(CASE WHEN status = 'submitted' THEN 1 END) as submitted,
        COUNT(CASE WHEN status = 'draft' THEN 1 END) as drafts
      FROM estimates
      WHERE deleted_at IS NULL
        AND created_at > NOW() - INTERVAL '${Number(period)} days'
      GROUP BY DATE_TRUNC('day', created_at)
      ORDER BY date DESC
    `);

    res.json(result.rows);
  } catch (error) {
    console.error('Estimate analytics error:', error);
    res.status(500).json({ error: 'Failed to fetch estimate analytics' });
  }
});

/**
 * GET /api/admin/analytics/errors
 * Get error statistics
 */
router.get('/analytics/errors', checkAdminKey, async (req: Request, res: Response) => {
  try {
    const { days = 30 } = req.query;

    const errorStats = await pool.query(`
      SELECT
        error_type,
        COUNT(*) as count,
        COUNT(DISTINCT session_id) as affected_sessions,
        MAX(timestamp) as last_error
      FROM error_logs
      WHERE timestamp > NOW() - INTERVAL '${Number(days)} days'
        AND resolved_at IS NULL
      GROUP BY error_type
      ORDER BY count DESC
    `);

    const timelineStats = await pool.query(`
      SELECT
        DATE_TRUNC('day', timestamp)::date as date,
        COUNT(*) as errors,
        COUNT(DISTINCT session_id) as affected_sessions
      FROM error_logs
      WHERE timestamp > NOW() - INTERVAL '${Number(days)} days'
      GROUP BY DATE_TRUNC('day', timestamp)
      ORDER BY date DESC
    `);

    res.json({
      error_types: errorStats.rows,
      timeline: timelineStats.rows,
    });
  } catch (error) {
    console.error('Error analytics error:', error);
    res.status(500).json({ error: 'Failed to fetch error analytics' });
  }
});

/**
 * POST /api/admin/error-logs/:error_id/resolve
 * Mark an error as resolved
 */
router.post('/error-logs/:error_id/resolve', checkAdminKey, async (req: Request, res: Response) => {
  try {
    const { error_id } = req.params;

    const result = await pool.query(
      `UPDATE error_logs
       SET resolved_at = NOW()
       WHERE id = $1
       RETURNING *`,
      [error_id]
    );

    if (result.rows.length === 0) {
      return res.status(404).json({ error: 'Error log not found' });
    }

    res.json({
      message: 'Error marked as resolved',
      error_log: result.rows[0],
    });
  } catch (error) {
    console.error('Resolve error log error:', error);
    res.status(500).json({ error: 'Failed to resolve error' });
  }
});

/**
 * GET /api/admin/analytics/features
 * Get feature usage analytics
 */
router.get('/analytics/features', checkAdminKey, async (req: Request, res: Response) => {
  try {
    const result = await pool.query(`
      SELECT
        feature_name,
        COUNT(DISTINCT session_id) as sessions_using,
        SUM(usage_count) as total_uses,
        MAX(last_used_at) as last_used,
        ROUND(AVG(usage_count)::numeric, 2) as avg_uses_per_session
      FROM feature_usage
      GROUP BY feature_name
      ORDER BY total_uses DESC
    `);

    res.json(result.rows);
  } catch (error) {
    console.error('Feature analytics error:', error);
    res.status(500).json({ error: 'Failed to fetch feature analytics' });
  }
});

export default router;
