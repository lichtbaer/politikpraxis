import type { ReactNode } from 'react';
import { useNavigate } from 'react-router-dom';
import { LegalFooter } from '../components/LegalFooter/LegalFooter';
import styles from './LegalPage.module.css';

type Props = {
  title: string;
  children: ReactNode;
};

export function LegalPageShell({ title, children }: Props) {
  const navigate = useNavigate();

  return (
    <div className={styles.root}>
      <div className={styles.scroll}>
        <div className={styles.inner}>
          <button type="button" className={styles.back} onClick={() => navigate('/')}>
            ← Zurück
          </button>
          <h1 className={styles.title}>{title}</h1>
          {children}
        </div>
      </div>
      <div className={styles.bottom}>
        <LegalFooter />
      </div>
    </div>
  );
}
