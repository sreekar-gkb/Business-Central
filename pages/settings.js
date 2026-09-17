import { useState, useEffect } from 'react';
import styles from '../styles/Settings.module.css';

export default function Settings() {
  const [adminKey, setAdminKey] = useState('');
  const [isAuthenticated, setIsAuthenticated] = useState(false);
  const [username, setUsername] = useState('');
  const [password, setPassword] = useState('');
  const [newPassword, setNewPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');
  const [success, setSuccess] = useState('');
  const [showPassword, setShowPassword] = useState(false);
  const [estimatePassword, setEstimatePassword] = useState('');
  const [newEstimatePassword, setNewEstimatePassword] = useState('');

  // Step 1: Authenticate with admin key
  const authenticateAdmin = async () => {
    setLoading(true);
    setError('');

    try {
      const response = await fetch('/api/settings', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${adminKey}`,
        },
        body: JSON.stringify({
          action: 'authenticate',
        }),
      });

      if (response.ok) {
        setIsAuthenticated(true);
        // Fetch current settings
        fetchSettings();
      } else if (response.status === 401) {
        setError('Invalid admin key');
      } else {
        setError('Authentication failed');
      }
    } catch (err) {
      setError('Error: ' + err.message);
    } finally {
      setLoading(false);
    }
  };

  const fetchSettings = async () => {
    try {
      const response = await fetch('/api/settings', {
        headers: {
          'Authorization': `Bearer ${adminKey}`,
        },
      });

      if (response.ok) {
        const data = await response.json();
        setUsername(data.username || 'admin');
      }
    } catch (err) {
      console.error('Error fetching settings:', err);
    }
  };

  const updatePassword = async () => {
    if (!password) {
      setError('Current password required');
      return;
    }
    if (!newPassword) {
      setError('New password required');
      return;
    }
    if (newPassword !== confirmPassword) {
      setError('Passwords do not match');
      return;
    }
    if (newPassword.length < 8) {
      setError('Password must be at least 8 characters');
      return;
    }

    setLoading(true);
    setError('');

    try {
      const response = await fetch('/api/settings', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${adminKey}`,
        },
        body: JSON.stringify({
          action: 'updatePassword',
          currentPassword: password,
          newPassword: newPassword,
        }),
      });

      if (response.ok) {
        setSuccess('Admin password updated successfully');
        setPassword('');
        setNewPassword('');
        setConfirmPassword('');
        setTimeout(() => setSuccess(''), 3000);
      } else {
        const data = await response.json();
        setError(data.error || 'Failed to update password');
      }
    } catch (err) {
      setError('Error: ' + err.message);
    } finally {
      setLoading(false);
    }
  };

  const updateEstimatePassword = async () => {
    if (!estimatePassword) {
      setError('Current estimate password required');
      return;
    }
    if (!newEstimatePassword) {
      setError('New estimate password required');
      return;
    }
    if (newEstimatePassword.length < 6) {
      setError('Password must be at least 6 characters');
      return;
    }

    setLoading(true);
    setError('');

    try {
      const response = await fetch('/api/settings', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${adminKey}`,
        },
        body: JSON.stringify({
          action: 'updateEstimatePassword',
          currentPassword: estimatePassword,
          newPassword: newEstimatePassword,
        }),
      });

      if (response.ok) {
        setSuccess('Estimate password updated successfully');
        setEstimatePassword('');
        setNewEstimatePassword('');
        setTimeout(() => setSuccess(''), 3000);
      } else {
        const data = await response.json();
        setError(data.error || 'Failed to update password');
      }
    } catch (err) {
      setError('Error: ' + err.message);
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className={styles.container}>
      <div className={styles.panel}>
        <h1>🔐 BC Deal Sizer - Settings & Security</h1>

        {!isAuthenticated ? (
          <div className={styles.authSection}>
            <h2>Admin Authentication Required</h2>
            <p>Enter your admin key to access security settings.</p>

            <div className={styles.form}>
              <div className={styles.field}>
                <label>Admin Key</label>
                <input
                  type="password"
                  value={adminKey}
                  onChange={(e) => setAdminKey(e.target.value)}
                  placeholder="Enter admin key"
                  onKeyPress={(e) => e.key === 'Enter' && authenticateAdmin()}
                />
              </div>

              <button
                className={styles.button}
                onClick={authenticateAdmin}
                disabled={loading}
              >
                {loading ? 'Authenticating...' : 'Authenticate'}
              </button>
            </div>

            {error && <div className={styles.error}>{error}</div>}
          </div>
        ) : (
          <div className={styles.settingsSection}>
            <div className={styles.userInfo}>
              <h3>👤 Admin Account</h3>
              <p>Username: <strong>{username}</strong></p>
              <button
                className={styles.button}
                onClick={() => {
                  setIsAuthenticated(false);
                  setAdminKey('');
                }}
              >
                Logout
              </button>
            </div>

            {/* Change Admin Password */}
            <div className={styles.settingBox}>
              <h3>🔑 Change Admin Password</h3>
              <p>Update your admin panel login password.</p>

              <div className={styles.form}>
                <div className={styles.field}>
                  <label>Current Password</label>
                  <input
                    type="password"
                    value={password}
                    onChange={(e) => setPassword(e.target.value)}
                    placeholder="Current admin password"
                  />
                </div>

                <div className={styles.field}>
                  <label>New Password</label>
                  <input
                    type={showPassword ? 'text' : 'password'}
                    value={newPassword}
                    onChange={(e) => setNewPassword(e.target.value)}
                    placeholder="New password (min 8 characters)"
                  />
                </div>

                <div className={styles.field}>
                  <label>Confirm New Password</label>
                  <input
                    type={showPassword ? 'text' : 'password'}
                    value={confirmPassword}
                    onChange={(e) => setConfirmPassword(e.target.value)}
                    placeholder="Confirm new password"
                  />
                </div>

                <div className={styles.checkbox}>
                  <input
                    type="checkbox"
                    id="showPass"
                    checked={showPassword}
                    onChange={(e) => setShowPassword(e.target.checked)}
                  />
                  <label htmlFor="showPass">Show passwords</label>
                </div>

                <button
                  className={styles.button}
                  onClick={updatePassword}
                  disabled={loading}
                >
                  {loading ? 'Updating...' : 'Update Admin Password'}
                </button>
              </div>
            </div>

            {/* Change Estimate Password */}
            <div className={styles.settingBox}>
              <h3>🔐 Change Estimate Password</h3>
              <p>Update the password users need to view the estimate.</p>

              <div className={styles.form}>
                <div className={styles.field}>
                  <label>Current Estimate Password</label>
                  <input
                    type="password"
                    value={estimatePassword}
                    onChange={(e) => setEstimatePassword(e.target.value)}
                    placeholder="Current estimate password"
                  />
                </div>

                <div className={styles.field}>
                  <label>New Estimate Password</label>
                  <input
                    type="password"
                    value={newEstimatePassword}
                    onChange={(e) => setNewEstimatePassword(e.target.value)}
                    placeholder="New estimate password (min 6 characters)"
                  />
                </div>

                <button
                  className={styles.button}
                  onClick={updateEstimatePassword}
                  disabled={loading}
                >
                  {loading ? 'Updating...' : 'Update Estimate Password'}
                </button>
              </div>
            </div>

            {error && <div className={styles.error}>{error}</div>}
            {success && <div className={styles.success}>{success}</div>}

            <div className={styles.info}>
              <h4>⚠️ Security Best Practices</h4>
              <ul>
                <li>Use strong, unique passwords (mix of letters, numbers, symbols)</li>
                <li>Don't share your admin key</li>
                <li>Change passwords regularly (every 30-90 days)</li>
                <li>Use different passwords for admin and estimate</li>
                <li>Change default admin key before production deployment</li>
              </ul>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}
