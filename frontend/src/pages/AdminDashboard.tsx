import React, { useState, useEffect } from 'react';
import './AdminDashboard.css';

interface DashboardStats {
  active_sessions_now: number;
  total_sessions: number;
  total_estimates: number;
  actions_last_24h: number;
  errors_last_24h: number;
  active_sessions_24h: number;
}

interface ActivityLog {
  id: string;
  session_token: string;
  action_type: string;
  resource_type: string;
  status: 'success' | 'error';
  timestamp: string;
  ip_address: string;
}

interface Session {
  id: string;
  session_token: string;
  ip_address: string;
  started_at: string;
  last_activity_at: string;
  is_active: boolean;
  total_actions: number;
  page_views: number;
  estimates_created: number;
  exports: number;
  errors: number;
}

export const AdminDashboard: React.FC = () => {
  const [stats, setStats] = useState<DashboardStats | null>(null);
  const [activityFeed, setActivityFeed] = useState<ActivityLog[]>([]);
  const [sessions, setSessions] = useState<Session[]>([]);
  const [activeTab, setActiveTab] = useState<'overview' | 'activity' | 'sessions' | 'errors'>('overview');
  const [loading, setLoading] = useState(true);
  const [adminKey, setAdminKey] = useState(localStorage.getItem('adminKey') || '');
  const [isAuthorized, setIsAuthorized] = useState(!!adminKey);
  const [filters, setFilters] = useState({
    actionType: '',
    page: 1,
    limit: 50,
  });

  const handleAdminKeySubmit = (e: React.FormEvent) => {
    e.preventDefault();
    localStorage.setItem('adminKey', adminKey);
    setIsAuthorized(true);
    fetchAllData();
  };

  useEffect(() => {
    if (isAuthorized) {
      fetchAllData();
    }
  }, [isAuthorized]);

  const getHeaders = () => ({
    'x-admin-key': adminKey || localStorage.getItem('adminKey') || '',
  });

  const fetchAllData = () => {
    fetchDashboardStats();
    fetchActivityFeed();
    fetchSessions();
  };

  const fetchDashboardStats = async () => {
    try {
      const response = await fetch('/api/admin/dashboard', {
        headers: getHeaders(),
      });
      if (!response.ok) throw new Error('Unauthorized');
      const data = await response.json();
      setStats(data);
    } catch (error) {
      console.error('Failed to fetch stats:', error);
      setIsAuthorized(false);
    }
  };

  const fetchActivityFeed = async () => {
    try {
      setLoading(true);
      const params = new URLSearchParams({
        page: String(filters.page),
        limit: String(filters.limit),
        ...(filters.actionType && { action_type: filters.actionType }),
      });

      const response = await fetch(`/api/admin/activity-feed?${params}`, {
        headers: getHeaders(),
      });
      if (!response.ok) throw new Error('Unauthorized');
      const data = await response.json();
      setActivityFeed(data.data);
    } catch (error) {
      console.error('Failed to fetch activity feed:', error);
      setIsAuthorized(false);
    } finally {
      setLoading(false);
    }
  };

  const fetchSessions = async () => {
    try {
      const response = await fetch('/api/admin/sessions?limit=100', {
        headers: getHeaders(),
      });
      if (!response.ok) throw new Error('Unauthorized');
      const data = await response.json();
      setSessions(data.data);
    } catch (error) {
      console.error('Failed to fetch sessions:', error);
      setIsAuthorized(false);
    }
  };

  if (!isAuthorized) {
    return (
      <div className="admin-dashboard">
        <header className="admin-header">
          <h1>Admin Dashboard</h1>
          <p className="subtitle">Activity Monitoring & Analytics</p>
        </header>
        <div className="auth-form">
          <form onSubmit={handleAdminKeySubmit}>
            <h2>Enter Admin Key</h2>
            <input
              type="password"
              placeholder="Enter admin API key"
              value={adminKey}
              onChange={e => setAdminKey(e.target.value)}
              required
            />
            <button type="submit" className="btn-primary">Access Dashboard</button>
            <p className="auth-note">Default: admin-key-12345</p>
          </form>
        </div>
      </div>
    );
  }

  return (
    <div className="admin-dashboard">
      <header className="admin-header">
        <h1>Admin Dashboard</h1>
        <p className="subtitle">Anonymous Session Activity & System Monitoring</p>
        <button className="btn-logout" onClick={() => {
          localStorage.removeItem('adminKey');
          setIsAuthorized(false);
        }}>Logout</button>
      </header>

      {/* Stats Grid */}
      {stats && (
        <div className="stats-grid">
          <StatCard label="Active Sessions (Now)" value={stats.active_sessions_now} color="success" />
          <StatCard label="Total Sessions" value={stats.total_sessions} />
          <StatCard label="Active (24h)" value={stats.active_sessions_24h} color="success" />
          <StatCard label="Total Estimates" value={stats.total_estimates} />
          <StatCard label="Actions (24h)" value={stats.actions_last_24h} />
          <StatCard label="Errors (24h)" value={stats.errors_last_24h} color="warning" />
        </div>
      )}

      {/* Tabs */}
      <div className="tabs">
        {(['overview', 'activity', 'sessions', 'errors'] as const).map(tab => (
          <button
            key={tab}
            className={`tab-button ${activeTab === tab ? 'active' : ''}`}
            onClick={() => setActiveTab(tab)}
          >
            {tab.charAt(0).toUpperCase() + tab.slice(1)}
          </button>
        ))}
      </div>

      {/* Activity Feed Tab */}
      {activeTab === 'activity' && (
        <div className="tab-content">
          <div className="filters">
            <input
              type="text"
              placeholder="Filter by action type..."
              value={filters.actionType}
              onChange={e => setFilters({ ...filters, actionType: e.target.value, page: 1 })}
            />
            <button className="btn-primary" onClick={() => fetchActivityFeed()}>
              Filter
            </button>
          </div>

          {loading ? (
            <p>Loading...</p>
          ) : (
            <table className="activity-table">
              <thead>
                <tr>
                  <th>Session</th>
                  <th>Action</th>
                  <th>Resource Type</th>
                  <th>Status</th>
                  <th>IP Address</th>
                  <th>Timestamp</th>
                </tr>
              </thead>
              <tbody>
                {activityFeed.map(log => (
                  <tr key={log.id}>
                    <td className="mono small">{log.session_token.slice(0, 12)}...</td>
                    <td>{log.action_type}</td>
                    <td>{log.resource_type || '-'}</td>
                    <td>
                      <span className={`status-badge ${log.status}`}>
                        {log.status}
                      </span>
                    </td>
                    <td className="mono">{log.ip_address}</td>
                    <td className="mono small">{new Date(log.timestamp).toLocaleString()}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          )}
        </div>
      )}

      {/* Sessions Tab */}
      {activeTab === 'sessions' && (
        <div className="tab-content">
          <table className="users-table">
            <thead>
              <tr>
                <th>Session ID</th>
                <th>IP Address</th>
                <th>Started</th>
                <th>Last Activity</th>
                <th>Actions</th>
                <th>Pages Viewed</th>
                <th>Estimates Created</th>
                <th>Exports</th>
                <th>Errors</th>
              </tr>
            </thead>
            <tbody>
              {sessions.map(session => (
                <tr key={session.id}>
                  <td className="mono small">{session.session_token.slice(0, 16)}...</td>
                  <td className="mono small">{session.ip_address}</td>
                  <td className="small">{new Date(session.started_at).toLocaleDateString()}</td>
                  <td className="small">{new Date(session.last_activity_at).toLocaleString()}</td>
                  <td className="mono">{session.total_actions}</td>
                  <td className="mono">{session.page_views}</td>
                  <td className="mono">{session.estimates_created}</td>
                  <td className="mono">{session.exports}</td>
                  <td className="mono">{session.errors}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}

      {/* Overview Tab */}
      {activeTab === 'overview' && (
        <div className="tab-content overview">
          <div className="overview-section">
            <h3>System Health</h3>
            <div className="health-metrics">
              <div className="metric">
                <span className="metric-label">Error Rate (24h)</span>
                <span className="metric-value">
                  {stats ? ((stats.errors_last_24h / Math.max(1, stats.actions_last_24h)) * 100).toFixed(2) : 0}%
                </span>
              </div>
              <div className="metric">
                <span className="metric-label">Session Engagement</span>
                <span className="metric-value">
                  {stats ? ((stats.active_sessions_24h / stats.total_sessions) * 100).toFixed(0) : 0}% active (24h)
                </span>
              </div>
            </div>
          </div>

          <div className="overview-section">
            <h3>Quick Actions</h3>
            <button className="action-button" onClick={() => window.location.reload()}>Refresh Data</button>
            <button className="action-button" onClick={() => setActiveTab('activity')}>View Activity Feed</button>
            <button className="action-button" onClick={() => setActiveTab('sessions')}>View All Sessions</button>
          </div>
        </div>
      )}
    </div>
  );
};

interface StatCardProps {
  label: string;
  value: number;
  color?: 'default' | 'success' | 'warning' | 'error';
}

const StatCard: React.FC<StatCardProps> = ({ label, value, color = 'default' }) => (
  <div className={`stat-card stat-${color}`}>
    <div className="stat-label">{label}</div>
    <div className="stat-value">{value.toLocaleString()}</div>
  </div>
);
