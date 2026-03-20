import { Link } from 'react-router-dom';
import styles from './LegalFooter.module.css';

export function LegalFooter() {
  return (
    <footer className={styles.footer}>
      <nav className={styles.nav} aria-label="Rechtliches">
        <Link to="/impressum">Impressum</Link>
        <span className={styles.sep} aria-hidden="true">
          ·
        </span>
        <Link to="/datenschutz">Datenschutz</Link>
        <span className={styles.sep} aria-hidden="true">
          ·
        </span>
        <Link to="/kontakt">Kontakt</Link>
      </nav>
      <p className={styles.copy}>© 2025 Nexclue UG (haftungsbeschränkt)</p>
    </footer>
  );
}
