import { useState } from 'react';
import styles from '../styles/Analytics.module.css';

export default function Analytics() {
  const [adminKey, setAdminKey] = useState('');
  const [isAuthenticated, setIsAuthenticated] = useState(false);
  const [activities, setActivities] = useState([]);
  const [selectedContact, setSelectedContact] = useState(null);
  const [detailedReport, setDetailedReport] = useState(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');

  const authenticate = async () => {
    if (!adminKey) {
      setError('Admin key required');
      return;
    }

    setLoading(true);
    setError('');

    try {
      const response = await fetch('/api/activity', {
        headers: { 'Authorization': `Bearer ${adminKey}` },
      });

      if (response.ok) {
        const data = await response.json();
        setActivities(data.activities || []);
        setIsAuthenticated(true);
      } else {
        setError('Invalid admin key');
      }
    } catch (err) {
      setError('Error: ' + err.message);
    } finally {
      setLoading(false);
    }
  };

  const viewDetails = async (contact) => {
    setLoading(true);
    setError('');

    try {
      const response = await fetch(`/api/activity?contact=${encodeURIComponent(contact)}`, {
        headers: { 'Authorization': `Bearer ${adminKey}` },
      });

      if (response.ok) {
        const report = await response.json();
        setDetailedReport(report);
        setSelectedContact(contact);
      } else {
        setError('Failed to load details');
      }
    } catch (err) {
      setError('Error: ' + err.message);
    } finally {
      setLoading(false);
    }
  };

  const goBack = () => {
    setDetailedReport(null);
    setSelectedContact(null);
  };

  if (!isAuthenticated) {
    return (
      <div className={styles.container}>
        <div className={styles.panel}>
          <h1>📊 User Activity Analytics</h1>
          <p>Enter your admin key to view detailed user activity and behavior.</p>

          <div className={styles.form}>
            <div className={styles.field}>
              <label>Admin Key</label>
              <input
                type="password"
                value={adminKey}
                onChange={(e) => setAdminKey(e.target.value)}
                placeholder="Enter admin key"
                onKeyPress={(e) => e.key === 'Enter' && authenticate()}
              />
            </div>

            <button
              className={styles.button}
              onClick={authenticate}
              disabled={loading}
            >
              {loading ? 'Authenticating...' : 'View Analytics'}
            </button>
          </div>

          {error && <div className={styles.error}>{error}</div>}
        </div>
      </div>
    );
  }

  if (detailedReport) {
    return (
      <div className={styles.container}>
        <div className={styles.panel}>
          <div className={styles.header}>
            <button className={styles.backButton} onClick={goBack}>
              ← Back to Overview
            </button>
            <h1>📋 Detailed Activity - {detailedReport.contact}</h1>
          </div>

          <div className={styles.reportCard}>
            <h2>Session Summary</h2>
            <div className={styles.stats}>
              <div className={styles.stat}>
                <div className={styles.statLabel}>Session Start</div>
                <div className={styles.statValue}>
                  {new Date(detailedReport.startTime).toLocaleString()}
                </div>
              </div>
              <div className={styles.stat}>
                <div className={styles.statLabel}>Session Duration</div>
                <div className={styles.statValue}>
                  {detailedReport.sessionDurationMins} minutes
                </div>
              </div>
              <div className={styles.stat}>
                <div className={styles.statLabel}>Total Events</div>
                <div className={styles.statValue}>{detailedReport.totalEvents}</div>
              </div>
              <div className={styles.stat}>
                <div className={styles.statLabel}>Input Changes</div>
                <div className={styles.statValue}>{detailedReport.inputChanges}</div>
              </div>
            </div>
          </div>

          {Object.keys(detailedReport.panelViews).length > 0 && (
            <div className={styles.reportCard}>
              <h2>🎯 Pages Visited</h2>
              <div className={styles.panelList}>
                {Object.entries(detailedReport.panelViews).map(([panel, info]) => (
                  <div key={panel} className={styles.panelItem}>
                    <div className={styles.panelName}>{panel}</div>
                    <div className={styles.panelStats}>
                      <span className={styles.panelStat}>
                        Visited {info.count} time{info.count !== 1 ? 's' : ''}
                      </span>
                      <span className={styles.panelStat}>
                        Last: {new Date(info.lastView).toLocaleTimeString()}
                      </span>
                    </div>
                  </div>
                ))}
              </div>
            </div>
          )}

          <div className={styles.reportCard}>
            <h2>📍 Timeline of Activities</h2>
            <div className={styles.timeline}>
              {detailedReport.timeline.map((event, idx) => (
                <div key={idx} className={styles.timelineItem}>
                  <div className={styles.timelineTime}>
                    {new Date(event.time).toLocaleTimeString()}
                  </div>
                  <div className={`${styles.timelineEvent} ${styles[`event_${event.type}`]}`}>
                    <div className={styles.timelineType}>
                      {event.type === 'panel_view' && '🎯'}
                      {event.type === 'input_change' && '✏️'}
                      {event.type === 'button_click' && '🔘'}
                      {' '}
                      {event.type.replace(/_/g, ' ').toUpperCase()}
                    </div>
                    {event.details && Object.keys(event.details).length > 0 && (
                      <div className={styles.timelineDetails}>
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

          <div className={styles.footer}>
            <button className={styles.button} onClick={goBack}>
              Back to Overview
            </button>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className={styles.container}>
      <div className={styles.panel}>
        <div className={styles.header}>
          <h1>📊 User Activity Analytics</h1>
          <button
            className={styles.logoutButton}
            onClick={() => {
              setIsAuthenticated(false);
              setAdminKey('');
              setActivities([]);
            }}
          >
            Logout
          </button>
        </div>

        {activities.length === 0 ? (
          <div className={styles.empty}>
            <p>No user activity recorded yet.</p>
            <p className={styles.subtext}>Activity will appear here as users access the estimate and interact with it.</p>
          </div>
        ) : (
          <div className={styles.activitiesList}>
            <h2>Users & Sessions</h2>
            <div className={styles.contactsList}>
              {activities.map((activity, idx) => (
                <div key={idx} className={styles.contactCard}>
                  <div className={styles.contactInfo}>
                    <h3>{activity.contact}</h3>
                    <p className={styles.sessionId}>Session: {activity.sessionId}</p>
                    <p className={styles.eventCount}>
                      {activity.activities.length} event{activity.activities.length !== 1 ? 's' : ''}
                    </p>
                  </div>
                  <button
                    className={styles.viewButton}
                    onClick={() => viewDetails(activity.contact)}
                  >
                    View Details →
                  </button>
                </div>
              ))}
            </div>
          </div>
        )}

        {error && <div className={styles.error}>{error}</div>}
      </div>
    </div>
  );
}
