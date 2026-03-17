import { useTranslation } from 'react-i18next';
import { useGameStore } from '../../store/gameStore';
import { useGameActions } from '../hooks/useGameActions';
import { featureActive } from '../../core/systems/features';
import { KPITile } from '../components/KPITile/KPITile';
import { HaushaltsPanel } from '../components/HaushaltsPanel/HaushaltsPanel';
import styles from './RightPanel.module.css';

function getBarStyle(
  key: 'al' | 'hh' | 'gi' | 'zf',
  value: number
): { barPercent: number; barColor: string } {
  const v = value;
  switch (key) {
    case 'al':
      return {
        barPercent: Math.min(100, v * 5),
        barColor: v < 5 ? 'var(--green)' : v < 10 ? 'var(--warn)' : 'var(--red)',
      };
    case 'hh':
      return {
        barPercent: Math.max(0, Math.min(100, 50 + v)),
        barColor: v > 0 ? 'var(--green)' : v > -5 ? 'var(--warn)' : 'var(--red)',
      };
    case 'gi':
      return {
        barPercent: Math.min(100, v),
        barColor: v < 30 ? 'var(--green)' : v < 50 ? 'var(--warn)' : 'var(--red)',
      };
    case 'zf':
      return {
        barPercent: Math.min(100, v),
        barColor: v > 50 ? 'var(--green)' : v > 25 ? 'var(--warn)' : 'var(--red)',
      };
    default:
      return { barPercent: 50, barColor: 'var(--blue)' };
  }
}

export function RightPanel() {
  const { t } = useTranslation();
  const state = useGameStore((s) => s.state);
  const complexity = useGameStore((s) => s.complexity);
  const { doPressemitteilung } = useGameActions();
  const { kpi, kpiPrev, log } = state;

  const oppositionAktiv = state.opposition?.aktivesThema && featureActive(complexity, 'opposition');
  const canKontern = state.pk >= 5 && state.letztesPressemitteilungMonat !== state.month;

  const prev = kpiPrev ?? { al: null, hh: null, gi: null, zf: null };

  const alBar = getBarStyle('al', kpi.al);
  const hhBar = getBarStyle('hh', kpi.hh);
  const giBar = getBarStyle('gi', kpi.gi);
  const zfBar = getBarStyle('zf', kpi.zf);

  return (
    <aside className={styles.root}>
      <HaushaltsPanel />
      <section className={styles.section}>
        <h3 className={styles.sectionLabel}>{t('game:rightPanel.wirtschaftslage')}</h3>
        <div className={styles.kpiGrid}>
          <KPITile
            label={t('game.kpi.unemployment', { ns: 'common' })}
            value={kpi.al}
            prevValue={prev.al}
            suffix="%"
            inverted
            barPercent={alBar.barPercent}
            barColor={alBar.barColor}
          />
          <KPITile
            label={t('game.kpi.budget', { ns: 'common' })}
            value={kpi.hh}
            prevValue={prev.hh}
            suffix="%"
            inverted={false}
            barPercent={hhBar.barPercent}
            barColor={hhBar.barColor}
          />
          <KPITile
            label={t('game.kpi.gini', { ns: 'common' })}
            value={kpi.gi}
            prevValue={prev.gi}
            suffix=""
            inverted
            barPercent={giBar.barPercent}
            barColor={giBar.barColor}
          />
          <KPITile
            label={t('game.kpi.satisfaction', { ns: 'common' })}
            value={kpi.zf}
            prevValue={prev.zf}
            suffix="%"
            inverted={false}
            barPercent={zfBar.barPercent}
            barColor={zfBar.barColor}
          />
        </div>
      </section>

      <section className={styles.section}>
        <h3 className={styles.sectionLabel}>{t('game:rightPanel.ereignisprotokoll')}</h3>
        {oppositionAktiv && (
          <div className={styles.oppositionAngriff}>
            <span className={styles.oppositionText}>
              ⚡ {t('game:opposition.angriff', { thema: t(`game:opposition.thema.${state.opposition!.aktivesThema}`) })}
            </span>
            <button
              type="button"
              className={styles.oppositionBtn}
              disabled={!canKontern}
              onClick={() => doPressemitteilung('opposition')}
            >
              {t('game:opposition.kontern')} (5 PK)
            </button>
          </div>
        )}
        <div className={styles.log}>
          {log.length === 0 ? (
            <p className={styles.logEmpty}>{t('game:rightPanel.logEmpty')}</p>
          ) : (
            log
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
