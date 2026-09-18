import { useState, useEffect } from 'react';
import PasswordGate from '../components/PasswordGate';
import ArtifactContent from '../components/ArtifactContent';
import styles from '../styles/Home.module.css';

export default function Home() {
  const [checking, setChecking] = useState(true);
  const [unlocked, setUnlocked] = useState(false);
  const [contact, setContact] = useState('Anonymous');

  useEffect(() => {
    // Resume an existing browser session automatically (skip re-entering
    // the shared password on repeat visits from the same browser)
    fetch('/api/session')
      .then((res) => (res.ok ? res.json() : { found: false }))
      .then((data) => {
        if (data.found) {
          setContact(data.name);
          setUnlocked(true);
        }
      })
      .catch(() => {})
      .finally(() => setChecking(false));
  }, []);

  if (checking) {
    return <div className={styles.container} />;
  }

  return (
    <div className={styles.container}>
      {!unlocked ? (
        <PasswordGate onUnlock={(name) => {
          setContact(name);
          setUnlocked(true);
        }} contact={contact} />
      ) : (
        <ArtifactContent
          contact={contact}
          onLogout={() => setUnlocked(false)}
        />
      )}
    </div>
  );
}
