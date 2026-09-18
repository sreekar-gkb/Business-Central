import { Router, Request, Response } from 'express';
import { pool } from '../database/connection';
import { authenticateToken, authorizeAdmin } from '../middleware/auth';

const router = Router();

/**
 * GET /api/admin/dashboard
 * Get overall admin dashboard statistics
 */
router.get('/admin/dashboard', authenticateToken, authorizeAdmin, async (req: Request, res: Response) => {
  try {
    const stats = await pool.query(`
      SELECT
        (SELECT COUNT(*) FROM users WHERE deleted_at IS NULL) as total_users,
        (SELECT COUNT(*) FROM users WHERE role = 'admin' AND deleted_at IS NULL) as admin_count,
        (SELECT COUNT(DISTINCT user_id) FROM user_sessions WHERE is_active = TRUE) as active_users_now,
        (SELECT COUNT(*) FROM estimates WHERE deleted_at IS NULL) as total_estimates,
        (SELECT COUNT(*) FROM activity_logs WHERE timestamp > NOW() - INTERVAL '24 hours') as actions_last_24h,
        (SELECT COUNT(*) FROM error_logs WHERE timestamp > NOW() - INTERVAL '24 hours') as errors_last_24h
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
router.get('/admin/activity-feed', authenticateToken, authorizeAdmin, async (req: Request, res: Response) => {
  try {
    const { page = 1, limit = 50, user_id, action_type, date_from, date_to } = req.query;
    const offset = ((Number(page) - 1) * Number(limit));

    let query = `
      SELECT
        al.id, al.user_id, al.action_type, al.resource_type,
        al.resource_id, al.status, al.timestamp,
        u.email, u.full_name,
        al.action_details, al.ip_address
      FROM activity_logs al
      LEFT JOIN users u ON al.user_id = u.id
      WHERE 1=1
    `;
    const params: any[] = [];
    let paramCount = 1;

    // Apply filters
    if (user_id) {
      query += ` AND al.user_id = $${paramCount}`;
      params.push(user_id);
      paramCount++;
    }

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

    // Get total count for pagination
    let countQuery = 'SELECT COUNT(*) as total FROM activity_logs al WHERE 1=1';
    const countParams: any[] = [];
    let countParamCount = 1;

    if (user_id) {
      countQuery += ` AND al.user_id = $${countParamCount}`;
      countParams.push(user_id);
      countParamCount++;
    }
    if (action_type) {
      countQuery += ` AND al.action_type = $${countParamCount}`;
      countParams.push(action_type);
      countParamCount++;
    }
    if (date_from) {
      countQuery += ` AND al.timestamp >= $${countParamCount}`;
      countParams.push(new Date(date_from as string));
      countParamCount++;
    }
    if (date_to) {
      countQuery += ` AND al.timestamp <= $${countParamCount}`;
      countParams.push(new Date(date_to as string));
      countParamCount++;
    }

    const countResult = await pool.query(countQuery, countParams);
    const total = countResult.rows[0].total;

    res.json({
      data: result.rows,
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
 * GET /api/admin/users/activity/:user_id
 * Get detailed activity for a specific user
 */
router.get('/admin/users/activity/:user_id', authenticateToken, authorizeAdmin, async (req: Request, res: Response) => {
  try {
    const { user_id } = req.params;
    const { days = 30 } = req.query;

    const userInfo = await pool.query(
      'SELECT id, email, full_name, role, last_login_at, created_at FROM users WHERE id = $1',
      [user_id]
    );

    if (userInfo.rows.length === 0) {
      return res.status(404).json({ error: 'User not found' });
    }

    // Get activity timeline
    const activities = await pool.query(`
      SELECT
        action_type, COUNT(*) as count,
        MAX(timestamp) as last_occurrence
      FROM activity_logs
      WHERE user_id = $1
        AND timestamp > NOW() - INTERVAL '${Number(days)} days'
      GROUP BY action_type
      ORDER BY last_occurrence DESC
    `, [user_id]);

    // Get page views
    const pageViews = await pool.query(`
      SELECT
        page_name, COUNT(*) as visits,
        SUM(time_spent_seconds) as total_time_seconds,
        ROUND(AVG(time_spent_seconds)::numeric, 2) as avg_time_seconds
      FROM page_views
      WHERE user_id = $1
        AND entry_time > NOW() - INTERVAL '${Number(days)} days'
      GROUP BY page_name
      ORDER BY visits DESC
    `, [user_id]);

    // Get feature usage
    const features = await pool.query(`
      SELECT feature_name, usage_count, last_used_at
      FROM feature_usage
      WHERE user_id = $1
      ORDER BY usage_count DESC
    `, [user_id]);

    // Get sessions
    const sessions = await pool.query(`
      SELECT
        id, login_at, logout_at, ip_address, device_info,
        EXTRACT(EPOCH FROM (COALESCE(logout_at, NOW()) - login_at)) as duration_seconds
      FROM user_sessions
      WHERE user_id = $1
        AND login_at > NOW() - INTERVAL '${Number(days)} days'
      ORDER BY login_at DESC
      LIMIT 20
    `, [user_id]);

    res.json({
      user: userInfo.rows[0],
      activity_summary: {
        total_actions: activities.rows.reduce((sum, row) => sum + row.count, 0),
        action_breakdown: activities.rows,
      },
      page_views: pageViews.rows,
      feature_usage: features.rows,
      recent_sessions: sessions.rows,
    });
  } catch (error) {
    console.error('User activity error:', error);
    res.status(500).json({ error: 'Failed to fetch user activity' });
  }
});

/**
 * GET /api/admin/users
 * Get all users with activity summary
 */
router.get('/admin/users', authenticateToken, authorizeAdmin, async (req: Request, res: Response) => {
  try {
    const { page = 1, limit = 50, status, role } = req.query;
    const offset = ((Number(page) - 1) * Number(limit));

    let query = `
      SELECT
        u.id, u.email, u.full_name, u.role, u.status, u.created_at,
        u.last_login_at,
        COUNT(DISTINCT al.id) as total_actions,
        COUNT(DISTINCT us.id) as total_sessions,
        COUNT(DISTINCT CASE WHEN us.is_active = TRUE THEN us.id END) as active_sessions,
        COUNT(DISTINCT pv.id) as page_views
      FROM users u
      LEFT JOIN activity_logs al ON u.id = al.user_id
      LEFT JOIN user_sessions us ON u.id = us.user_id
      LEFT JOIN page_views pv ON u.id = pv.user_id
      WHERE u.deleted_at IS NULL
    `;
    const params: any[] = [];
    let paramCount = 1;

    if (status) {
      query += ` AND u.status = $${paramCount}`;
      params.push(status);
      paramCount++;
    }

    if (role) {
      query += ` AND u.role = $${paramCount}`;
      params.push(role);
      paramCount++;
    }

    query += ` GROUP BY u.id ORDER BY u.last_login_at DESC LIMIT $${paramCount} OFFSET $${paramCount + 1}`;
    params.push(Number(limit), offset);

    const result = await pool.query(query, params);

    // Get total count
    let countQuery = 'SELECT COUNT(*) as total FROM users WHERE deleted_at IS NULL';
    const countParams: any[] = [];
    let countParamCount = 1;

    if (status) {
      countQuery += ` AND status = $${countParamCount}`;
      countParams.push(status);
      countParamCount++;
    }
    if (role) {
      countQuery += ` AND role = $${countParamCount}`;
      countParams.push(role);
      countParamCount++;
    }

    const countResult = await pool.query(countQuery, countParams);

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
    console.error('Users list error:', error);
    res.status(500).json({ error: 'Failed to fetch users' });
  }
});

/**
 * GET /api/admin/analytics/estimates
 * Get estimate creation analytics
 */
router.get('/admin/analytics/estimates', authenticateToken, authorizeAdmin, async (req: Request, res: Response) => {
  try {
    const { period = '30' } = req.query; // days

    const result = await pool.query(`
      SELECT
        DATE_TRUNC('day', created_at)::date as date,
        COUNT(*) as estimates_created,
        COUNT(DISTINCT user_id) as unique_users,
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
router.get('/admin/analytics/errors', authenticateToken, authorizeAdmin, async (req: Request, res: Response) => {
  try {
    const { days = 30 } = req.query;

    const errorStats = await pool.query(`
      SELECT
        error_type,
        COUNT(*) as count,
        COUNT(DISTINCT user_id) as affected_users,
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
        COUNT(DISTINCT user_id) as affected_users
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
 * POST /api/admin/users/:user_id/toggle-status
 * Activate/deactivate a user
 */
router.post('/admin/users/:user_id/toggle-status', authenticateToken, authorizeAdmin, async (req: Request, res: Response) => {
  try {
    const { user_id } = req.params;

    const result = await pool.query(
      `UPDATE users
       SET status = CASE WHEN status = 'active' THEN 'inactive' ELSE 'active' END,
           updated_at = NOW()
       WHERE id = $1
       RETURNING id, email, status`,
      [user_id]
    );

    if (result.rows.length === 0) {
      return res.status(404).json({ error: 'User not found' });
    }

    res.json({
      message: 'User status updated',
      user: result.rows[0],
    });
  } catch (error) {
    console.error('Toggle user status error:', error);
    res.status(500).json({ error: 'Failed to update user status' });
  }
});

/**
 * POST /api/admin/error-logs/:error_id/resolve
 * Mark an error as resolved
 */
router.post('/admin/error-logs/:error_id/resolve', authenticateToken, authorizeAdmin, async (req: Request, res: Response) => {
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
 * GET /api/admin/analytics/heatmap
 * Get feature usage heatmap data
 */
router.get('/admin/analytics/heatmap', authenticateToken, authorizeAdmin, async (req: Request, res: Response) => {
  try {
    const result = await pool.query(`
      SELECT
        feature_name,
        usage_count,
        COUNT(DISTINCT user_id) as unique_users,
        MAX(last_used_at) as last_used
      FROM feature_usage
      GROUP BY feature_name
      ORDER BY usage_count DESC
    `);

    res.json(result.rows);
  } catch (error) {
    console.error('Heatmap analytics error:', error);
    res.status(500).json({ error: 'Failed to fetch heatmap data' });
  }
});

export default router;
