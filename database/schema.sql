-- Users Table
CREATE TABLE users (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  email VARCHAR(255) UNIQUE NOT NULL,
  full_name VARCHAR(255) NOT NULL,
  password_hash VARCHAR(255) NOT NULL,
  role VARCHAR(50) NOT NULL DEFAULT 'user', -- admin, user, viewer
  status VARCHAR(50) NOT NULL DEFAULT 'active', -- active, inactive, suspended
  company_name VARCHAR(255),
  last_login_at TIMESTAMP WITH TIME ZONE,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
  deleted_at TIMESTAMP WITH TIME ZONE
);

-- User Sessions Table
CREATE TABLE user_sessions (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  token VARCHAR(500) UNIQUE NOT NULL,
  ip_address VARCHAR(50),
  user_agent VARCHAR(500),
  device_info JSONB, -- {browser, os, device_type}
  login_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
  logout_at TIMESTAMP WITH TIME ZONE,
  last_activity_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
  is_active BOOLEAN DEFAULT TRUE,
  expires_at TIMESTAMP WITH TIME ZONE
);

-- Activity Log Table (Core Tracking)
CREATE TABLE activity_logs (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL REFERENCES users(id) ON DELETE SET NULL,
  session_id UUID REFERENCES user_sessions(id) ON DELETE SET NULL,
  action_type VARCHAR(100) NOT NULL, -- login, logout, view_page, update_field, export, etc.
  resource_type VARCHAR(100), -- estimate, module, integration, etc.
  resource_id VARCHAR(255),
  action_details JSONB, -- {before_value, after_value, field_name, etc.}
  ip_address VARCHAR(50),
  user_agent VARCHAR(500),
  status VARCHAR(50) DEFAULT 'success', -- success, error, pending
  error_message TEXT,
  timestamp TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP
);

-- Estimates (for saving user work)
CREATE TABLE estimates (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  name VARCHAR(255) NOT NULL,
  customer_name VARCHAR(255),
  status VARCHAR(50) DEFAULT 'draft', -- draft, submitted, approved, archived
  state_snapshot JSONB NOT NULL, -- Complete state of the estimate
  version INTEGER DEFAULT 1,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
  deleted_at TIMESTAMP WITH TIME ZONE,
  locked_at TIMESTAMP WITH TIME ZONE,
  locked_by_user_id UUID REFERENCES users(id)
);

-- Estimate Change History
CREATE TABLE estimate_changes (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  estimate_id UUID NOT NULL REFERENCES estimates(id) ON DELETE CASCADE,
  user_id UUID NOT NULL REFERENCES users(id) ON DELETE SET NULL,
  change_type VARCHAR(50) NOT NULL, -- create, update, delete, export, share
  change_details JSONB, -- {field, old_value, new_value, etc.}
  version INTEGER,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP
);

-- Page Views Table
CREATE TABLE page_views (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL REFERENCES users(id) ON DELETE SET NULL,
  session_id UUID REFERENCES user_sessions(id) ON DELETE SET NULL,
  page_name VARCHAR(100), -- inputs, dashboard, timeline, etc.
  referrer VARCHAR(500),
  entry_time TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
  exit_time TIMESTAMP WITH TIME ZONE,
  time_spent_seconds INTEGER,
  scroll_depth FLOAT,
  is_exit_page BOOLEAN DEFAULT FALSE
);

-- Feature Usage Table
CREATE TABLE feature_usage (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL REFERENCES users(id) ON DELETE SET NULL,
  feature_name VARCHAR(100), -- module_selector, integration_builder, scenario_analysis, etc.
  usage_count INTEGER DEFAULT 1,
  last_used_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP
);

-- Error Logs Table
CREATE TABLE error_logs (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID REFERENCES users(id) ON DELETE SET NULL,
  error_type VARCHAR(100),
  error_message TEXT NOT NULL,
  error_stack TEXT,
  page_name VARCHAR(100),
  user_agent VARCHAR(500),
  ip_address VARCHAR(50),
  browser_info JSONB,
  timestamp TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
  resolved_at TIMESTAMP WITH TIME ZONE
);

-- Audit Trail Table (for compliance)
CREATE TABLE audit_trail (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID REFERENCES users(id) ON DELETE SET NULL,
  action VARCHAR(100) NOT NULL,
  entity_type VARCHAR(100),
  entity_id VARCHAR(255),
  old_values JSONB,
  new_values JSONB,
  timestamp TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
  ip_address VARCHAR(50)
);

-- Admin Settings Table
CREATE TABLE admin_settings (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  setting_key VARCHAR(100) UNIQUE NOT NULL,
  setting_value JSONB,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP
);

-- Notifications Table
CREATE TABLE notifications (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  title VARCHAR(255) NOT NULL,
  message TEXT,
  notification_type VARCHAR(50), -- info, warning, error, success
  is_read BOOLEAN DEFAULT FALSE,
  read_at TIMESTAMP WITH TIME ZONE,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
  expires_at TIMESTAMP WITH TIME ZONE
);

-- Create Indexes for Performance
CREATE INDEX idx_activity_logs_user_id ON activity_logs(user_id);
CREATE INDEX idx_activity_logs_timestamp ON activity_logs(timestamp);
CREATE INDEX idx_activity_logs_action_type ON activity_logs(action_type);
CREATE INDEX idx_page_views_user_id ON page_views(user_id);
CREATE INDEX idx_page_views_session_id ON page_views(session_id);
CREATE INDEX idx_user_sessions_user_id ON user_sessions(user_id);
CREATE INDEX idx_user_sessions_token ON user_sessions(token);
CREATE INDEX idx_estimates_user_id ON estimates(user_id);
CREATE INDEX idx_audit_trail_user_id ON audit_trail(user_id);
CREATE INDEX idx_audit_trail_timestamp ON audit_trail(timestamp);
CREATE INDEX idx_error_logs_timestamp ON error_logs(timestamp);
CREATE INDEX idx_notifications_user_id ON notifications(user_id);

-- Create Views for Admin Dashboard
CREATE VIEW user_activity_summary AS
SELECT
  u.id,
  u.email,
  u.full_name,
  u.role,
  COUNT(DISTINCT al.id) as total_actions,
  COUNT(DISTINCT pv.id) as total_page_views,
  MAX(us.last_activity_at) as last_activity,
  MAX(us.login_at) as last_login,
  COUNT(DISTINCT us.id) as active_sessions
FROM users u
LEFT JOIN activity_logs al ON u.id = al.user_id
LEFT JOIN page_views pv ON u.id = pv.user_id
LEFT JOIN user_sessions us ON u.id = us.user_id AND us.is_active = TRUE
WHERE u.deleted_at IS NULL
GROUP BY u.id, u.email, u.full_name, u.role;

CREATE VIEW estimate_analytics AS
SELECT
  DATE_TRUNC('day', e.created_at) as date,
  COUNT(DISTINCT e.id) as estimates_created,
  COUNT(DISTINCT e.user_id) as unique_users,
  COUNT(DISTINCT CASE WHEN e.status = 'submitted' THEN e.id END) as estimates_submitted
FROM estimates e
WHERE e.deleted_at IS NULL
GROUP BY DATE_TRUNC('day', e.created_at);

CREATE VIEW daily_user_stats AS
SELECT
  DATE_TRUNC('day', al.timestamp) as date,
  COUNT(DISTINCT al.user_id) as active_users,
  COUNT(DISTINCT al.id) as total_actions,
  COUNT(DISTINCT CASE WHEN al.action_type = 'login' THEN al.user_id END) as new_logins,
  COUNT(DISTINCT CASE WHEN al.status = 'error' THEN al.id END) as errors
FROM activity_logs al
GROUP BY DATE_TRUNC('day', al.timestamp);
