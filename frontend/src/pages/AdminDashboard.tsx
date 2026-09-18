import React, { useState, useEffect } from 'react';
import './AdminDashboard.css';

interface DashboardStats {
  total_users: number;
  admin_count: number;
  active_users_now: number;
  total_estimates: number;
  actions_last_24h: number;
  errors_last_24h: number;
}

interface ActivityLog {
  id: string;
  user_id: string;
  email: string;
  full_name: string;
  action_type: string;
  resource_type: string;
  status: 'success' | 'error';
  timestamp: string;
  ip_address: string;
}

interface User {
  id: string;
  email: string;
  full_name: string;
  role: 'admin' | 'user' | 'viewer';
  status: 'active' | 'inactive';
  last_login_at: string;
  total_actions: number;
  total_sessions: number;
  active_sessions: number;
  page_views: number;
}

export const AdminDashboard: React.FC = () => {
  const [stats, setStats] = useState<DashboardStats | null>(null);
  const [activityFeed, setActivityFeed] = useState<ActivityLog[]>([]);
  const [users, setUsers] = useState<User[]>([]);
  const [activeTab, setActiveTab] = useState<'overview' | 'activity' | 'users' | 'errors'>('overview');
  const [loading, setLoading] = useState(true);
  const [filters, setFilters] = useState({
    actionType: '',
    userId: '',
    page: 1,
    limit: 50,
  });

  useEffect(() => {
    fetchDashboardStats();
    fetchActivityFeed();
    fetchUsers();
  }, []);

  const fetchDashboardStats = async () => {
    try {
      const response = await fetch('/api/admin/dashboard', {
        headers: { 'Authorization': `Bearer ${localStorage.getItem('token')}` },
      });
      const data = await response.json();
      setStats(data);
    } catch (error) {
      console.error('Failed to fetch stats:', error);
    }
  };

  const fetchActivityFeed = async () => {
    try {
      setLoading(true);
      const params = new URLSearchParams({
        page: String(filters.page),
        limit: String(filters.limit),
        ...(filters.actionType && { action_type: filters.actionType }),
        ...(filters.userId && { user_id: filters.userId }),
      });

      const response = await fetch(`/api/admin/activity-feed?${params}`, {
        headers: { 'Authorization': `Bearer ${localStorage.getItem('token')}` },
      });
      const data = await response.json();
      setActivityFeed(data.data);
    } catch (error) {
      console.error('Failed to fetch activity feed:', error);
    } finally {
      setLoading(false);
    }
  };

  const fetchUsers = async () => {
    try {
      const response = await fetch('/api/admin/users?limit=100', {
        headers: { 'Authorization': `Bearer ${localStorage.getItem('token')}` },
      });
      const data = await response.json();
      setUsers(data.data);
    } catch (error) {
      console.error('Failed to fetch users:', error);
    }
  };

  const toggleUserStatus = async (userId: string) => {
    try {
      const response = await fetch(`/api/admin/users/${userId}/toggle-status`, {
        method: 'POST',
        headers: { 'Authorization': `Bearer ${localStorage.getItem('token')}` },
      });
      if (response.ok) {
        fetchUsers();
      }
    } catch (error) {
      console.error('Failed to toggle user status:', error);
    }
  };

  return (
    <div className="admin-dashboard">
      <header className="admin-header">
        <h1>Admin Dashboard</h1>
        <p className="subtitle">User Activity & System Monitoring</p>
      </header>

      {/* Stats Grid */}
      {stats && (
        <div className="stats-grid">
          <StatCard label="Total Users" value={stats.total_users} />
          <StatCard label="Admin Users" value={stats.admin_count} />
          <StatCard label="Active Now" value={stats.active_users_now} color="success" />
          <StatCard label="Total Estimates" value={stats.total_estimates} />
          <StatCard label="Actions (24h)" value={stats.actions_last_24h} />
          <StatCard label="Errors (24h)" value={stats.errors_last_24h} color="warning" />
        </div>
      )}

      {/* Tabs */}
      <div className="tabs">
        {(['overview', 'activity', 'users', 'errors'] as const).map(tab => (
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
                  <th>User</th>
                  <th>Action</th>
                  <th>Resource</th>
                  <th>Status</th>
                  <th>IP Address</th>
                  <th>Timestamp</th>
                </tr>
              </thead>
              <tbody>
                {activityFeed.map(log => (
                  <tr key={log.id}>
                    <td>
                      <strong>{log.full_name}</strong>
                      <br />
                      <small>{log.email}</small>
                    </td>
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

      {/* Users Tab */}
      {activeTab === 'users' && (
        <div className="tab-content">
          <table className="users-table">
            <thead>
              <tr>
                <th>Email</th>
                <th>Name</th>
                <th>Role</th>
                <th>Status</th>
                <th>Last Login</th>
                <th>Actions</th>
                <th>Sessions</th>
                <th>Page Views</th>
                <th>Controls</th>
              </tr>
            </thead>
            <tbody>
              {users.map(user => (
                <tr key={user.id}>
                  <td className="mono small">{user.email}</td>
                  <td>{user.full_name}</td>
                  <td>{user.role}</td>
                  <td>
                    <span className={`status-badge ${user.status}`}>
                      {user.status}
                    </span>
                  </td>
                  <td className="small">
                    {user.last_login_at ? new Date(user.last_login_at).toLocaleDateString() : 'Never'}
                  </td>
                  <td className="mono">{user.total_actions}</td>
                  <td className="mono">{user.active_sessions}/{user.total_sessions}</td>
                  <td className="mono">{user.page_views}</td>
                  <td>
                    <button
                      className={`btn-toggle ${user.status === 'active' ? 'deactivate' : 'activate'}`}
                      onClick={() => toggleUserStatus(user.id)}
                    >
                      {user.status === 'active' ? 'Deactivate' : 'Activate'}
                    </button>
                  </td>
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
                <span className="metric-label">User Engagement</span>
                <span className="metric-value">
                  {stats ? ((stats.active_users_now / stats.total_users) * 100).toFixed(0) : 0}% active
                </span>
              </div>
            </div>
          </div>

          <div className="overview-section">
            <h3>Quick Actions</h3>
            <button className="action-button">Export Activity Log</button>
            <button className="action-button">Generate Report</button>
            <button className="action-button">View Error Details</button>
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
