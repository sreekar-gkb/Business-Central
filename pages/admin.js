import { useState, useEffect } from 'react';
import styles from '../styles/Admin.module.css';

export default function Admin() {
  const [adminKey, setAdminKey] = useState('');
  const [isAuthenticated, setIsAuthenticated] = useState(false);
  const [logs, setLogs] = useState([]);
  const [activities, setActivities] = useState([]);
  const [selectedUser, setSelectedUser] = useState(null);
  const [userDetails, setUserDetails] = useState(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');
  const [showKey, setShowKey] = useState(false);
  const [viewMode, setViewMode] = useState('overview');
  const [lastRefresh, setLastRefresh] = useState(null);

  // Auto-refresh activities every 5 seconds when authenticated
  useEffect(() => {
    if (!isAuthenticated || !adminKey) return;

    const refreshTimer = setInterval(() => {
      refreshActivities();
    }, 5000);

    return () => clearInterval(refreshTimer);
  }, [isAuthenticated, adminKey]);

  const refreshActivities = async () => {
    try {
      const activitiesRes = await fetch('/api/activity', {
        headers: {
          'Authorization': `Bearer ${adminKey}`,
          'Content-Type': 'application/json',
        },
      });

      if (activitiesRes.ok) {
        const activitiesData = await activitiesRes.json();
        setActivities(activitiesData.activities || []);
        setLastRefresh(new Date());
      }
    } catch (err) {
      // Silent fail for auto-refresh
    }
  };

  const fetchLogs = async () => {
    if (!adminKey) {
      setError('Admin key required');
      return;
    }

    setLoading(true);
    setError('');

    try {
      const [logsRes, activitiesRes] = await Promise.all([
        fetch('/api/logs', {
          headers: {
            'Authorization': `Bearer ${adminKey}`,
            'Content-Type': 'application/json',
          },
        }),
        fetch('/api/activity', {
          headers: {
            'Authorization': `Bearer ${adminKey}`,
            'Content-Type': 'application/json',
          },
        })
      ]);

      if (logsRes.ok && activitiesRes.ok) {
        const logsData = await logsRes.json();
        const activitiesData = await activitiesRes.json();
        setLogs(logsData.logs || []);
        setActivities(activitiesData.activities || []);
        setIsAuthenticated(true);
      } else if (logsRes.status === 401 || activitiesRes.status === 401) {
        setError('Invalid admin key');
        setIsAuthenticated(false);
      } else {
        setError('Failed to fetch data');
      }
    } catch (err) {
      setError('Error: ' + err.message);
    } finally {
      setLoading(false);
    }
  };

  const fetchUserDetails = async (sessionId, contact) => {
    setLoading(true);
    setError('');

    try {
      const response = await fetch(`/api/activity?sessionId=${encodeURIComponent(sessionId)}`, {
        headers: {
          'Authorization': `Bearer ${adminKey}`,
          'Content-Type': 'application/json',
        },
      });

      if (response.ok) {
        const data = await response.json();
        setUserDetails(data);
        setSelectedUser(contact);
        setViewMode('details');
      } else {
        setError('Failed to fetch user details');
      }
    } catch (err) {
      setError('Error: ' + err.message);
    } finally {
      setLoading(false);
    }
  };

  const clearLogs = async () => {
    if (!window.confirm('Clear all logs? This cannot be undone.')) {
      return;
    }

    setLoading(true);
    setError('');

    try {
      const response = await fetch('/api/logs', {
        method: 'DELETE',
        headers: {
          'Authorization': `Bearer ${adminKey}`,
          'Content-Type': 'application/json',
        },
      });

      if (response.ok) {
        const data = await response.json();
        setLogs([]);
        alert(data.message);
      } else {
        setError('Failed to clear logs');
      }
    } catch (err) {
      setError('Error: ' + err.message);
    } finally {
      setLoading(false);
    }
  };

  const exportCSV = () => {
    if (logs.length === 0) {
      alert('No logs to export');
      return;
    }

    const headers = ['Contact', 'IP', 'Time', 'UserAgent'];
    const rows = logs.map((log) => [
      `"${log.contact}"`,
      `"${log.ip}"`,
      `"${log.time}"`,
      `"${log.userAgent.substring(0, 100)}"`,
    ]);

    const csv = [headers.join(','), ...rows.map((r) => r.join(','))].join('\n');

    const blob = new Blob([csv], { type: 'text/csv' });
    const url = window.URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `deal-sizer-logs-${new Date().toISOString().split('T')[0]}.csv`;
    document.body.appendChild(a);
    a.click();
    window.URL.revokeObjectURL(url);
    document.body.removeChild(a);
  };

  return (
    <div className={styles.container}>
      <div className={styles.panel}>
        <h1>BC Deal Sizer - Admin Dashboard</h1>

        {!isAuthenticated ? (
          <div className={styles.authSection}>
            <h2>Admin Access</h2>
            <p>Enter your admin key to view user activity and access logs.</p>

            <div className={styles.authForm}>
              <div className={styles.formGroup}>
                <label>Admin Password</label>
                <div className={styles.passwordGroup}>
                  <input
                    type={showKey ? 'text' : 'password'}
                    value={adminKey}
                    onChange={(e) => setAdminKey(e.target.value)}
                    placeholder="Enter admin password"
                    onKeyPress={(e) => e.key === 'Enter' && fetchLogs()}
                    className={styles.passwordInput}
                  />
                  <button
                    className={styles.toggleButton}
                    onClick={() => setShowKey(!showKey)}
                    type="button"
                    title={showKey ? 'Hide password' : 'Show password'}
                  >
                    {showKey ? '👁️ Hide' : '🔒 Show'}
                  </button>
                </div>
              </div>

              <button
                className={styles.authButton}
                onClick={fetchLogs}
                disabled={loading || !adminKey}
              >
                {loading ? (
                  <>⏳ Authenticating...</>
                ) : (
                  <>🔐 Sign In</>
                )}
              </button>

              {error && <div className={styles.error}>{error}</div>}

              <div className={styles.helpText}>
                <p>Check <code>.env.local</code> file for the admin password</p>
              </div>
            </div>
          </div>
        ) : (
          <div className={styles.logsSection}>
            {viewMode === 'overview' ? (
              <>
                <div className={styles.header}>
                  <div>
                    <h2>User Activity Overview</h2>
                    {lastRefresh && (
                      <div className={styles.refreshInfo}>
                        Last updated: {lastRefresh.toLocaleTimeString()} · Auto-refreshing every 5s
                      </div>
                    )}
                  </div>
                  <span className={styles.count}>{activities.length} active user{activities.length !== 1 ? 's' : ''}</span>
                </div>

                <div className={styles.actions}>
                  <button
                    className={styles.button}
                    onClick={fetchLogs}
                    disabled={loading}
                  >
                    🔄 Refresh
                  </button>
                  <button
                    className={styles.button}
                    onClick={exportCSV}
                    disabled={logs.length === 0}
                  >
                    💾 Export CSV
                  </button>
                  <button
                    className={`${styles.button} ${styles.danger}`}
                    onClick={clearLogs}
                    disabled={logs.length === 0 || loading}
                  >
                    🗑️ Clear All
                  </button>
                  <button
                    className={styles.button}
                    onClick={() => {
                      setIsAuthenticated(false);
                      setAdminKey('');
                      setLogs([]);
                      setActivities([]);
                    }}
                  >
                    🚪 Logout
                  </button>
                </div>

                {activities.length === 0 ? (
                  <div className={styles.empty}>
                    <p>No user activity yet.</p>
                    <p className={styles.subtext}>
                      Activity will appear here when users access and interact with the estimate.
                    </p>
                  </div>
                ) : (
                  <div className={styles.userGrid}>
                    {activities.map((activity, idx) => (
                      <div key={idx} className={styles.userCard}>
                        <div className={styles.userHeader}>
                          <div className={styles.userName}>👤 {activity.contact}</div>
                          <button
                            className={styles.viewButton}
                            onClick={() => fetchUserDetails(activity.sessionId, activity.contact)}
                          >
                            View Details →
                          </button>
                        </div>
                        <div className={styles.userStats}>
                          <div className={styles.stat}>
                            <span className={styles.statLabel}>Events</span>
                            <span className={styles.statValue}>{activity.activities.length}</span>
                          </div>
                          <div className={styles.stat}>
                            <span className={styles.statLabel}>Session ID</span>
                            <span className={styles.statValue} style={{ fontSize: '10px', fontFamily: 'monospace' }}>
                              {activity.sessionId.substring(0, 8)}...
                            </span>
                          </div>
                          <div className={styles.stat}>
                            <span className={styles.statLabel}>Browser / Device</span>
                            <span className={styles.statValue} style={{ fontSize: '10px', fontFamily: 'monospace' }}>
                              {activity.deviceId ? activity.deviceId.substring(0, 8) + '...' : 'unknown'}
                            </span>
                          </div>
                        </div>
                      </div>
                    ))}
                  </div>
                )}

                {error && <div className={styles.error}>{error}</div>}
              </>
            ) : (
              <>
                <button
                  className={styles.backButton}
                  onClick={() => {
                    setViewMode('overview');
                    setSelectedUser(null);
                    setUserDetails(null);
                  }}
                >
                  ← Back to Overview
                </button>

                {userDetails && (
                  <div className={styles.detailsView}>
                    <h2>👤 {selectedUser} - Complete Activity</h2>
                    <p style={{ fontSize: '11px', fontFamily: 'monospace', color: '#666' }}>
                      Session {userDetails.sessionId} · Browser/device {userDetails.deviceId}
                    </p>

                    <div className={styles.summaryCards}>
                      <div className={styles.summaryCard}>
                        <div className={styles.summaryLabel}>Session Duration</div>
                        <div className={styles.summaryValue}>{userDetails.sessionDurationMins} min</div>
                      </div>
                      <div className={styles.summaryCard}>
                        <div className={styles.summaryLabel}>Total Events</div>
                        <div className={styles.summaryValue}>{userDetails.totalEvents}</div>
                      </div>
                      <div className={styles.summaryCard}>
                        <div className={styles.summaryLabel}>Input Changes</div>
                        <div className={styles.summaryValue}>{userDetails.inputChanges}</div>
                      </div>
                      <div className={styles.summaryCard}>
                        <div className={styles.summaryLabel}>Session Start</div>
                        <div className={styles.summaryValue} style={{ fontSize: '11px' }}>
                          {new Date(userDetails.startTime).toLocaleString()}
                        </div>
                      </div>
                    </div>

                    {Object.keys(userDetails.panelViews).length > 0 && (
                      <div className={styles.panelsSection}>
                        <h3>Pages Visited</h3>
                        <div className={styles.panelsList}>
                          {Object.entries(userDetails.panelViews).map(([panel, info]) => (
                            <div key={panel} className={styles.panelItem}>
                              <div className={styles.panelName}>{panel}</div>
                              <div className={styles.panelMeta}>
                                <span>Visited {info.count}x</span>
                                <span>Last: {new Date(info.lastView).toLocaleTimeString()}</span>
                              </div>
                            </div>
                          ))}
                        </div>
                      </div>
                    )}

                    <div className={styles.timelineSection}>
                      <h3>Activity Timeline</h3>
                      <div className={styles.timeline}>
                        {userDetails.timeline.map((event, idx) => (
                          <div key={idx} className={styles.timelineItem}>
                            <div className={styles.timelineTime}>
                              {new Date(event.time).toLocaleTimeString()}
                            </div>
                            <div className={styles.timelineContent}>
                              <div className={styles.timelineEvent}>
                                {event.type === 'panel_view' && '🎯'}
                                {event.type === 'input_change' && '✏️'}
                                {' '}
                                <strong>{event.type.replace(/_/g, ' ').toUpperCase()}</strong>
                              </div>
                              {event.details && Object.keys(event.details).length > 0 && (
                                <div className={styles.eventDetails}>
                                  {Object.entries(event.details).map(([key, value]) => (
                                    <span key={key} className={styles.detail}>
                                      <strong>{key}:</strong> {String(value).substring(0, 50)}
                                    </span>
                                  ))}
                                </div>
                              )}
                            </div>
                          </div>
                        ))}
                      </div>
                    </div>
                  </div>
                )}
              </>
            )}
          </div>
        )}

        <div className={styles.footer}>
          <p>
            <strong>Note:</strong> Activity is stored in the Neon Postgres database
            and persists across deployments and server restarts.
          </p>
        </div>
      </div>
    </div>
  );
}
