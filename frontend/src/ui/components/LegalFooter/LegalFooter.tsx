import { useTranslation } from 'react-i18next';
import { Link } from 'react-router-dom';
import styles from './LegalFooter.module.css';

export function LegalFooter() {
  const { t } = useTranslation();
  return (
    <footer className={styles.footer}>
      <nav className={styles.nav} aria-label={t('nav.legalFooter')}>
        <Link to="/impressum">Impressum</Link>
        <span className={styles.sep} aria-hidden="true">
          ·
        </span>
        <Link to="/datenschutz">Datenschutz</Link>
        <span className={styles.sep} aria-hidden="true">
          ·
        </span>
        <Link to="/kontakt">Kontakt</Link>
        <span className={styles.sep} aria-hidden="true">
          ·
        </span>
        <Link to="/statistiken">{t('stats.pageTitle')}</Link>
        <span className={styles.sep} aria-hidden="true">
          ·
        </span>
        <Link to="/highscores">{t('highscores.pageTitle')}</Link>
      </nav>
      <p className={styles.copy}>© 2025 Nexclue UG (haftungsbeschränkt)</p>
    </footer>
  );
}
