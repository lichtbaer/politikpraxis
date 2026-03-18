/**
 * SMA-320: Rechtes Panel reduziert — nur Ereignisprotokoll
 * Entfernt: HaushaltsPanel, Wirtschaftslage-KPIs (→ HaushaltView)
 */
import { useTranslation } from 'react-i18next';
import { useGameStore } from '../../store/gameStore';
import { useGameActions } from '../hooks/useGameActions';
import { featureActive } from '../../core/systems/features';
import { Zap } from '../icons';
import styles from './RightPanel.module.css';

export function RightPanel() {
  const { t } = useTranslation();
  const state = useGameStore((s) => s.state);
  const complexity = useGameStore((s) => s.complexity);
  const { doPressemitteilung } = useGameActions();

  const oppositionAktiv = state.opposition?.aktivesThema && featureActive(complexity, 'opposition');
  const canKontern = state.pk >= 5 && state.letztesPressemitteilungMonat !== state.month;

  return (
    <aside className={styles.root}>
      <section className={styles.section}>
        <h3 className={styles.sectionLabel}>{t('game:rightPanel.ereignisprotokoll')}</h3>
        {oppositionAktiv && (
          <div className={styles.oppositionAngriff}>
            <span className={styles.oppositionText}>
              <Zap size={14} /> {t('game:opposition.angriff', { thema: t(`game:opposition.thema.${state.opposition!.aktivesThema}`) })}
            </span>
            <button
              type="button"
              className={styles.oppositionBtn}
              disabled={!canKontern}
              title={
                !canKontern
                  ? state.pk < 5
                    ? t('game:gesetz.pkNichtGenug', { required: 5, current: state.pk })
                    : 'Nur 1× pro Monat möglich'
                  : ''
              }
              onClick={() => doPressemitteilung('opposition')}
            >
              {t('game:opposition.kontern')} (5 PK)
            </button>
          </div>
        )}
        <div className={styles.log}>
          {state.log.length === 0 ? (
            <p className={styles.logEmpty}>{t('game:rightPanel.logEmpty')}</p>
          ) : (
            state.log
              .slice()
              .reverse()
              .map((entry, i) => (
                <div key={`${entry.time}-${i}`} className={styles.logEntry}>
                  <span className={styles.logTime}>{entry.time}</span>
                  <span className={styles.logMsg}>
                  {entry.msg.startsWith('game:') ? t(entry.msg, entry.params) : entry.msg}
                </span>
                </div>
              ))
          )}
        </div>
      </section>
    </aside>
  );
}
