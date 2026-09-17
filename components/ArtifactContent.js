import dynamic from 'next/dynamic';
import styles from '../styles/ArtifactContent.module.css';

// Dynamically import DealSizer to avoid SSR issues
const DealSizer = dynamic(() => import('./DealSizer'), { ssr: false });

export default function ArtifactContent({ contact = 'Anonymous', onLogout }) {
  return (
    <div className={styles.contentContainer}>
      <DealSizer contact={contact} onLogout={onLogout} />
    </div>
  );
}
