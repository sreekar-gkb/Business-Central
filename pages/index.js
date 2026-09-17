import { useState, useEffect } from 'react';
import { useRouter } from 'next/router';
import PasswordGate from '../components/PasswordGate';
import ArtifactContent from '../components/ArtifactContent';
import styles from '../styles/Home.module.css';

export default function Home() {
  const router = useRouter();
  const [unlocked, setUnlocked] = useState(false);
  const [contact, setContact] = useState('Anonymous');

  useEffect(() => {
    // Get contact name from URL query parameter
    if (router.isReady) {
      const contactParam = router.query.contact || 'Anonymous';
      setContact(contactParam);
    }
  }, [router.isReady, router.query]);

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
