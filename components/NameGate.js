import { useState } from 'react';
import styles from '../styles/NameGate.module.css';

export default function NameGate({ onUnlock, contact }) {
  const [username, setUsername] = useState(contact && contact !== 'Anonymous' ? contact : '');
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(false);

  const handleSubmit = async (e) => {
    e.preventDefault();
    setError('');

    if (!username.trim()) {
      setError('Please enter your name');
      return;
    }

    setLoading(true);

    try {
      const response = await fetch('/api/session', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ name: username.trim() }),
      });

      if (response.ok) {
        onUnlock(username.trim());
      } else {
        setError('Could not start your session. Please try again.');
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
        <p className={styles.subtitle}>Enter your name to view and work on this estimate</p>

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

          <button type="submit" disabled={loading} className={styles.button}>
            {loading ? 'Starting session...' : 'View Estimate'}
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
