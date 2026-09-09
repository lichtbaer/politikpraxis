/**
 * Issue #270, Kriterium 3: „Braucht Aufmerksamkeit" — spült kritische Werte proaktiv nach
 * oben, statt darauf zu warten, dass der Spieler den richtigen Tab öffnet.
 *
 * Sitzt bewusst ganz oben in der Sidebar und rendert gar nichts, wenn es nichts zu melden
 * gibt: eine dauerhaft sichtbare, meist leere Box wäre selbst wieder Rauschen.
 */
import { useTranslation } from 'react-i18next';
import { berechneAufmerksamkeit } from '../../../core/aufmerksamkeit';
import { useGameStore } from '../../../store/gameStore';
import { AlertTriangle } from '../../icons';
import styles from './AufmerksamkeitsPanel.module.css';

export function AufmerksamkeitsPanel() {
  const { t } = useTranslation('game');
  const state = useGameStore((s) => s.state);
  const complexity = useGameStore((s) => s.complexity);
  const content = useGameStore((s) => s.content);
  const setView = useGameStore((s) => s.setView);

  const alerts = berechneAufmerksamkeit(state, complexity, content);
  if (alerts.length === 0) return null;

  return (
    <section className={styles.root} aria-labelledby="aufmerksamkeit-heading">
      <h3 id="aufmerksamkeit-heading" className={styles.title}>
        <AlertTriangle size={13} aria-hidden="true" />
        {t('aufmerksamkeit.titel')}
      </h3>
      <ul className={styles.list}>
        {alerts.map((alert) => (
          <li key={alert.id}>
            <button
              type="button"
              className={`${styles.alert} ${alert.stufe === 'kritisch' ? styles.kritisch : styles.warnung}`}
              onClick={() => setView(alert.view)}
              title={t('aufmerksamkeit.zumTab')}
            >
              <span className={styles.text}>{t(alert.i18nKey, alert.params)}</span>
            </button>
          </li>
        ))}
      </ul>
    </section>
  );
}
