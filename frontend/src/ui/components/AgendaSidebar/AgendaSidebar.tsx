/**
 * SMA-504: Kompakte Agenda-Checkliste in der Sidebar (ab Komplexität 2).
 */
import { useMemo } from 'react';
import { useTranslation } from 'react-i18next';
import { useGameStore } from '../../../store/gameStore';
import { buildAgendaSidebarRows, type AgendaAmpel } from '../../../core/agendaTracking';
import panelStyles from '../../panels/LeftPanel.module.css';
import styles from './AgendaSidebar.module.css';

function ampelClass(a: AgendaAmpel): string {
  if (a === 'green') return styles.green;
  if (a === 'yellow') return styles.yellow;
  return styles.red;
}

export function AgendaSidebar() {
  const { t } = useTranslation('game');
  const complexity = useGameStore((s) => s.complexity);
  const phase = useGameStore((s) => s.phase);
  const state = useGameStore((s) => s.state);
  const content = useGameStore((s) => s.content);

  const rows = useMemo(() => buildAgendaSidebarRows(state, content), [state, content]);

  if (complexity < 2 || phase !== 'playing' || rows.length === 0) {
    return null;
  }

  return (
    <section className={panelStyles.section}>
      <h3 className={panelStyles.sectionTitle}>{t('game:leftPanel.agendaTitle')}</h3>
      <div className={styles.wrap}>
        <ul className={styles.list} aria-label={t('game:leftPanel.agendaTitle')}>
          {rows.map((row) => (
            <li key={`${row.source}-${row.id}`} className={styles.row}>
              <span className={`${styles.marker} ${ampelClass(row.ampel)}`} aria-hidden>
                {row.erfuellt ? '☑' : row.source === 'koalition' ? '✦' : '◻'}
              </span>
              <div className={styles.body}>
                <div className={`${styles.titel} ${ampelClass(row.ampel)}`}>{row.titel}</div>
                <div className={styles.sub}>
                  {t(row.subtitle.key, row.subtitle.params)}
                  {row.erfuellt && (
                    <span className={ampelClass(row.ampel)}> ✓</span>
                  )}
                </div>
              </div>
            </li>
          ))}
        </ul>
      </div>
    </section>
  );
}
