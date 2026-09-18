# Anonymous Session-Based Tracking System

**NO AUTHENTICATION REQUIRED** - Everything uses anonymous session IDs

---

## 🎯 What Gets Tracked (Without Any Login)

### Every Session
- Session ID (anonymous token)
- IP address
- Device info (browser, OS)
- Session start/end time
- Last activity time

### Every Action
- Page/panel visits (inputs, dashboard, timeline, etc.)
- Time spent per panel
- Feature usage (module selector, integration builder, etc.)
- Estimate creation/modification
- Exports and downloads
- Scenario runs
- All field changes

### Every Error
- Error type and message
- Stack trace
- Page where it occurred
- Browser info
- User agent

---

## 🗄️ Database Schema (Anonymous)

Instead of `users` table, we use `sessions` table:

```sql
CREATE TABLE sessions (
  id UUID PRIMARY KEY,
  session_token VARCHAR(100) UNIQUE,  -- Anonymous ID
  ip_address VARCHAR(50),
  user_agent VARCHAR(500),
  device_info JSONB,
  started_at TIMESTAMP,
  last_activity_at TIMESTAMP,
  is_active BOOLEAN,
  expires_at TIMESTAMP
);

CREATE TABLE activity_logs (
  id UUID PRIMARY KEY,
  session_id UUID REFERENCES sessions(id),  -- NOT user_id
  action_type VARCHAR(100),
  resource_type VARCHAR(100),
  status VARCHAR(50),
  timestamp TIMESTAMP
);

CREATE TABLE page_views (
  id UUID PRIMARY KEY,
  session_id UUID REFERENCES sessions(id),
  page_name VARCHAR(100),
  time_spent_seconds INTEGER,
  scroll_depth FLOAT
);

-- Similar for: error_logs, feature_usage, estimates, etc.
```

---

## 🔌 Backend Implementation

### 1. Middleware: Session Creator (`middleware/tracking.ts`)

```typescript
// Automatically creates/retrieves session
sessionCreator(req, res, next) {
  // Get or create anonymous session
  // Set sessionId cookie for 30 days
  // No authentication required
}
```

### 2. Admin Routes (`routes/admin.ts`)

**Protected by API key (not JWT):**

```typescript
GET  /api/admin/dashboard          // Stats (users, estimates, errors)
GET  /api/admin/activity-feed      // All actions with filtering
GET  /api/admin/sessions           // All active sessions
GET  /api/admin/sessions/:id/details // Session details
GET  /api/admin/analytics/estimates  // Estimate trends
GET  /api/admin/analytics/errors     // Error statistics
GET  /api/admin/analytics/features   // Feature usage
```

**Header-based auth (no login):**
```
x-admin-key: admin-key-12345
```

---

## 🎨 Frontend Implementation

### 1. Automatic Tracking (Client-Side)

No authentication needed for tracking:

```typescript
import { 
  trackPageView, 
  trackFeatureUsage, 
  trackError,
  trackEstimateAction 
} from './utils/tracking';

// Track page visits (automatic in each panel)
trackPageView({ page_name: 'inputs', time_spent: 120 });

// Track feature usage
trackFeatureUsage('module_selector');

// Track errors (automatic)
initErrorTracking();

// Track custom actions
trackEstimateAction('create', estimateId);
```

### 2. Admin Dashboard

Access at `/admin`:
1. Enter admin key (default: `admin-key-12345`)
2. See all anonymous sessions
3. View activity feed
4. Monitor errors
5. Check estimates

---

## 🚀 Integration Steps

### 1. Database Setup
```bash
psql -U postgres -d your_database -f database/schema.sql
```

### 2. Backend Express Integration
```typescript
import sessionCreator from './middleware/tracking';
import activityTracker from './middleware/tracking';
import adminRoutes from './routes/admin';

app.use(sessionCreator);        // Create session automatically
app.use(activityTracker);       // Log all actions
app.use('/api/admin', adminRoutes);
```

### 3. Frontend Integration
```typescript
import { 
  initErrorTracking, 
  initScrollTracking,
  trackPageView 
} from './utils/tracking';

// On app load
useEffect(() => {
  initErrorTracking();
  initScrollTracking();
}, []);

// When user navigates to panel
useEffect(() => {
  trackPageView({ page_name: 'inputs' });
}, [currentPanel]);
```

### 4. Environment Variables
```env
# Backend
ADMIN_API_KEY=admin-key-12345

# Frontend
REACT_APP_API_URL=/api
```

---

## 📊 Admin Dashboard Features

### Overview Tab
- Total sessions and active sessions
- Estimates created
- Actions and errors (24h)
- System health metrics

### Activity Feed Tab
- Real-time activity log
- Filter by action type
- Paginated (50 per page)
- All user actions with IP and timestamp

### Sessions Tab
- All anonymous sessions
- IP address
- Session duration
- Number of actions
- Page views
- Estimates created
- Export count
- Error count

### Errors Tab
- Error statistics
- Error types
- Affected sessions count
- Resolution tracking

---

## 🔐 Admin Access (Simple & Secure)

### For Public Use
Set environment variable:
```env
ADMIN_API_KEY=your-secret-admin-key
```

### Default Key
```
admin-key-12345
```

### Access Admin Dashboard
1. Navigate to `/admin`
2. Enter admin key
3. Dashboard saved in localStorage

### Logout
Click "Logout" button to clear stored key

---

## 📈 What the Admin Can See

**Per Session:**
- Complete activity timeline
- Page views with time spent
- Features used
- All errors encountered
- Estimates created
- Exports made

**Aggregated:**
- Daily user stats
- Popular features
- Error trends
- Estimate creation trends
- System health

---

## ✨ Key Differences From Auth-Based Tracking

| With Auth | Without Auth (Current) |
|-----------|------------------------|
| Requires login | No login needed |
| user_id in logs | session_id in logs |
| User account management | Auto-generated sessions |
| User list in admin | Session list in admin |
| Can track account changes | Tracks only usage |
| Complex permissions | Simple API key auth |

---

## 🎓 How Sessions Work

```
Browser loads estimator → No session cookie yet
                        ↓
Session middleware creates session
- Generates session_token: "anon-abc123xyz..."
- Stores in database
- Sets httpOnly cookie (30 days)
                        ↓
User interacts with app
- Every action tracked with session_id
- Middleware updates last_activity_at
                        ↓
Next visit (within 30 days)
- Browser sends session cookie
- Same session_id used
- Activity continues to accumulate
                        ↓
After 30 days
- Session cookie expires
- New session created automatically
```

---

## 🔍 Analyzing the Data

### Queries You Can Run

**Most popular panels:**
```sql
SELECT page_name, COUNT(*) as visits 
FROM page_views 
GROUP BY page_name 
ORDER BY visits DESC;
```

**Error frequency:**
```sql
SELECT error_type, COUNT(*) as count 
FROM error_logs 
GROUP BY error_type 
ORDER BY count DESC;
```

**Feature usage:**
```sql
SELECT feature_name, SUM(usage_count) as total 
FROM feature_usage 
GROUP BY feature_name 
ORDER BY total DESC;
```

**Estimates created per day:**
```sql
SELECT DATE(created_at) as date, COUNT(*) as count 
FROM estimates 
GROUP BY DATE(created_at) 
ORDER BY date DESC;
```

---

## 🛡️ Privacy Considerations

- No personal data collected (no email, name, etc.)
- Only IP address + device info (standard analytics)
- Sessions auto-expire after 30 days
- No password or credentials stored
- Data stored in your own database

---

## 🚨 Troubleshooting

**No sessions appearing:**
- Check middleware is registered in Express
- Verify sessionCreator runs before routes
- Check database connection

**Admin dashboard won't load:**
- Verify admin key is correct
- Check `x-admin-key` header in requests
- Verify admin routes are mounted

**Tracking not working:**
- Verify initErrorTracking() called in React
- Check fetch URLs in tracking.ts match your API_BASE
- Check browser console for errors

---

## 📝 Summary

✅ **No authentication required**  
✅ **Automatic session creation**  
✅ **Tracks everything anonymously**  
✅ **Simple API key for admin access**  
✅ **Ready to deploy**
