-- Anonymous Session-Based Tracking System (NO AUTHENTICATION REQUIRED)
-- All tracking uses session IDs instead of user IDs

-- Anonymous Sessions Table
CREATE TABLE sessions (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  session_token VARCHAR(100) UNIQUE NOT NULL, -- Anonymous session ID (stored in cookie)
  ip_address VARCHAR(50),
  user_agent VARCHAR(500),
  device_info JSONB, -- {browser, os, device_type}
  started_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
  last_activity_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
  is_active BOOLEAN DEFAULT TRUE,
  expires_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP + INTERVAL '30 days'
);

-- Activity Log Table (Core Tracking - Anonymous Sessions)
CREATE TABLE activity_logs (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  session_id UUID NOT NULL REFERENCES sessions(id) ON DELETE CASCADE,
  action_type VARCHAR(100) NOT NULL, -- view_page, update_field, export, create_estimate, run_scenario, etc.
  resource_type VARCHAR(100), -- estimate, module, integration, etc.
  resource_id VARCHAR(255),
  action_details JSONB, -- {before_value, after_value, field_name, etc.}
  ip_address VARCHAR(50),
  user_agent VARCHAR(500),
  status VARCHAR(50) DEFAULT 'success', -- success, error, pending
  error_message TEXT,
  timestamp TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP
);

-- Estimates (for saving work - session-based instead of user-based)
CREATE TABLE estimates (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  session_id UUID NOT NULL REFERENCES sessions(id) ON DELETE CASCADE,
  name VARCHAR(255) NOT NULL,
  customer_name VARCHAR(255),
  status VARCHAR(50) DEFAULT 'draft', -- draft, submitted, approved, archived
  state_snapshot JSONB NOT NULL, -- Complete state of the estimate
  version INTEGER DEFAULT 1,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
  deleted_at TIMESTAMP WITH TIME ZONE
);

-- Estimate Change History
CREATE TABLE estimate_changes (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  estimate_id UUID NOT NULL REFERENCES estimates(id) ON DELETE CASCADE,
  session_id UUID NOT NULL REFERENCES sessions(id) ON DELETE SET NULL,
  change_type VARCHAR(50) NOT NULL, -- create, update, delete, export, share
  change_details JSONB, -- {field, old_value, new_value, etc.}
  version INTEGER,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP
);

-- Page Views Table (Anonymous)
CREATE TABLE page_views (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  session_id UUID NOT NULL REFERENCES sessions(id) ON DELETE CASCADE,
  page_name VARCHAR(100), -- inputs, dashboard, timeline, team, governance, etc.
  referrer VARCHAR(500),
  entry_time TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
  exit_time TIMESTAMP WITH TIME ZONE,
  time_spent_seconds INTEGER,
  scroll_depth FLOAT,
  is_exit_page BOOLEAN DEFAULT FALSE
);

-- Feature Usage Table (Anonymous)
CREATE TABLE feature_usage (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  session_id UUID NOT NULL REFERENCES sessions(id) ON DELETE CASCADE,
  feature_name VARCHAR(100), -- module_selector, integration_builder, scenario_analysis, export, etc.
  usage_count INTEGER DEFAULT 1,
  last_used_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP
);

-- Error Logs Table (Anonymous)
CREATE TABLE error_logs (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  session_id UUID REFERENCES sessions(id) ON DELETE SET NULL,
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

-- Admin Settings Table (NO AUTH REQUIRED - use API key instead)
CREATE TABLE admin_settings (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  setting_key VARCHAR(100) UNIQUE NOT NULL,
  setting_value JSONB,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP
);

-- Notifications Table (Session-based)
CREATE TABLE notifications (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  session_id UUID NOT NULL REFERENCES sessions(id) ON DELETE CASCADE,
  title VARCHAR(255) NOT NULL,
  message TEXT,
  notification_type VARCHAR(50), -- info, warning, error, success
  is_read BOOLEAN DEFAULT FALSE,
  read_at TIMESTAMP WITH TIME ZONE,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
  expires_at TIMESTAMP WITH TIME ZONE
);

-- Create Indexes for Performance
CREATE INDEX idx_activity_logs_session_id ON activity_logs(session_id);
CREATE INDEX idx_activity_logs_timestamp ON activity_logs(timestamp);
CREATE INDEX idx_activity_logs_action_type ON activity_logs(action_type);
CREATE INDEX idx_page_views_session_id ON page_views(session_id);
CREATE INDEX idx_sessions_token ON sessions(session_token);
CREATE INDEX idx_estimates_session_id ON estimates(session_id);
CREATE INDEX idx_error_logs_timestamp ON error_logs(timestamp);
CREATE INDEX idx_notifications_session_id ON notifications(session_id);

-- Create Views for Admin Dashboard

-- Session Activity Summary
CREATE VIEW session_activity_summary AS
SELECT
  s.id,
  s.session_token,
  s.ip_address,
  s.started_at,
  s.last_activity_at,
  s.is_active,
  COUNT(DISTINCT al.id) as total_actions,
  COUNT(DISTINCT pv.id) as total_page_views,
  COUNT(DISTINCT CASE WHEN al.action_type = 'export_estimate' THEN al.id END) as exports,
  COUNT(DISTINCT CASE WHEN al.action_type = 'create_estimate' THEN al.id END) as estimates_created,
  COUNT(DISTINCT CASE WHEN al.status = 'error' THEN al.id END) as errors
FROM sessions s
LEFT JOIN activity_logs al ON s.id = al.session_id
LEFT JOIN page_views pv ON s.id = pv.session_id
WHERE s.is_active = TRUE
GROUP BY s.id, s.session_token, s.ip_address, s.started_at, s.last_activity_at, s.is_active;

-- Estimate Analytics
CREATE VIEW estimate_analytics AS
SELECT
  DATE_TRUNC('day', e.created_at) as date,
  COUNT(DISTINCT e.id) as estimates_created,
  COUNT(DISTINCT e.session_id) as unique_sessions,
  COUNT(DISTINCT CASE WHEN e.status = 'submitted' THEN e.id END) as estimates_submitted
FROM estimates e
WHERE e.deleted_at IS NULL
GROUP BY DATE_TRUNC('day', e.created_at);

-- Daily Statistics
CREATE VIEW daily_stats AS
SELECT
  DATE_TRUNC('day', al.timestamp) as date,
  COUNT(DISTINCT al.session_id) as active_sessions,
  COUNT(DISTINCT al.id) as total_actions,
  COUNT(DISTINCT CASE WHEN al.action_type = 'view_page' THEN al.session_id END) as sessions_with_views,
  COUNT(DISTINCT CASE WHEN al.status = 'error' THEN al.id END) as errors,
  COUNT(DISTINCT pv.id) as total_page_views
FROM activity_logs al
LEFT JOIN page_views pv ON pv.session_id = al.session_id
GROUP BY DATE_TRUNC('day', al.timestamp);

-- Feature Usage Analytics
CREATE VIEW feature_adoption AS
SELECT
  feature_name,
  COUNT(DISTINCT session_id) as sessions_using_feature,
  SUM(usage_count) as total_usage_count,
  MAX(last_used_at) as last_used,
  ROUND(AVG(usage_count)::numeric, 2) as avg_usage_per_session
FROM feature_usage
GROUP BY feature_name
ORDER BY total_usage_count DESC;
