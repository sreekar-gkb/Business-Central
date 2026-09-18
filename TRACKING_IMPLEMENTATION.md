# User Activity Tracking Implementation

## What's Added

### Database Schema (`database/schema.sql`)
- `users` - User profiles and roles
- `user_sessions` - Login sessions tracking
- `activity_logs` - All user actions (login, page views, field updates)
- `page_views` - Panel/page navigation tracking
- `error_logs` - Error tracking
- `estimates` - Saved estimate versions
- `estimate_changes` - Change history
- Supporting tables and views for analytics

### Backend Middleware (`backend/src/middleware/tracking.ts`)
- `activityTracker` - Logs all user actions
- `pageViewTracker` - Tracks page visits
- `featureUsageTracker` - Tracks feature usage
- `errorTracker` - Logs client-side errors
- `updateSessionActivity` - Updates last activity timestamp

### Admin API Routes (`backend/src/routes/admin.ts`)
- `GET /api/admin/dashboard` - Overall stats
- `GET /api/admin/activity-feed` - Paginated activity log
- `GET /api/admin/users/activity/:user_id` - User activity details
- `GET /api/admin/users` - List all users with stats
- `GET /api/admin/analytics/estimates` - Estimate trends
- `GET /api/admin/analytics/errors` - Error statistics
- `POST /api/admin/users/:user_id/toggle-status` - Activate/deactivate user
- `POST /api/admin/error-logs/:error_id/resolve` - Mark error resolved

### Admin Panel (`frontend/src/pages/AdminDashboard.tsx`)
- Dashboard overview with key metrics
- Activity feed with filtering
- User management interface
- Error statistics
- System health monitoring

## What's Tracked

### Login/Session
- Login time, IP, device info
- Session duration
- Last activity time
- Failed login attempts

### User Actions
- Page/panel visits
- Time spent per page
- Field changes (before/after values)
- Estimates created/modified
- Exports and downloads

### System Events
- Errors (with stack traces)
- Feature usage counts
- Performance metrics
- Integration actions

## Integration Steps

1. **Database**: Run `database/schema.sql` on your PostgreSQL instance
2. **Middleware**: Import and use tracking middleware in Express app
3. **Routes**: Mount admin routes in your Express app
4. **Frontend**: Add AdminDashboard component to your React app
5. **Auth**: Implement role-based access control for admin routes

## Key Tables to Monitor

- `activity_logs` - Primary action tracking
- `user_sessions` - Session management
- `error_logs` - System issues
- `page_views` - User engagement
- Views: `user_activity_summary`, `estimate_analytics`, `daily_user_stats`
