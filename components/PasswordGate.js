import { useState } from 'react';
import styles from '../styles/PasswordGate.module.css';

export default function PasswordGate({ onUnlock, contact }) {
  const [username, setUsername] = useState(contact && contact !== 'Anonymous' ? contact : '');
  const [password, setPassword] = useState('');
  const [showPassword, setShowPassword] = useState(false);
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(false);

  const handleSubmit = async (e) => {
    e.preventDefault();
    setError('');

    if (!username.trim()) {
      setError('Please enter your name');
      return;
    }

    if (!password) {
      setError('Please enter the password');
      return;
    }

    setLoading(true);

    try {
      const response = await fetch('/api/session', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          name: username.trim(),
          password,
        }),
      });

      if (response.ok) {
        setPassword('');
        onUnlock(username.trim());
      } else {
        setError('Incorrect password');
        setPassword('');
      }
    } catch (err) {
      setError('Error: ' + err.message);
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className={styles.gateContainer}>
      <div className={styles.gateCard}>
        <h1 className={styles.title}>BC Deal Sizer</h1>
        <p className={styles.subtitle}>Enter your information to view this estimate</p>

        <form onSubmit={handleSubmit} className={styles.form}>
          <div className={styles.field}>
            <label htmlFor="username" className={styles.label}>Your Name</label>
            <input
              id="username"
              type="text"
              placeholder="Enter your name"
              value={username}
              onChange={(e) => setUsername(e.target.value)}
              disabled={loading}
              autoFocus
              className={styles.input}
            />
          </div>

          <div className={styles.field}>
            <label htmlFor="password" className={styles.label}>Password</label>
            <div className={styles.passwordContainer}>
              <input
                id="password"
                type={showPassword ? 'text' : 'password'}
                placeholder="Enter password"
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                disabled={loading}
                className={styles.input}
              />
              <button
                type="button"
                onClick={() => setShowPassword(!showPassword)}
                disabled={loading}
                className={styles.eyeButton}
                title={showPassword ? 'Hide password' : 'Show password'}
              >
                {showPassword ? '👁️' : '🔒'}
              </button>
            </div>
          </div>

          <button type="submit" disabled={loading} className={styles.button}>
            {loading ? 'Verifying...' : 'View Estimate'}
          </button>
        </form>

        {error && <div className={styles.error}>{error}</div>}

        <p className={styles.footer}>
          <span className={styles.footerLabel}>Your work is saved automatically to</span>
          <strong>{username || 'this browser'}</strong>
        </p>
      </div>
    </div>
  );
}
