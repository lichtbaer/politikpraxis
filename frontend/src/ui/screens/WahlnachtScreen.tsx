/**
 * SMA-279: Wahlnacht-Screen (Monat 48) — animierte Hochrechnung, Sieg/Niederlage
 */
import { useState, useEffect } from 'react';
import { useTranslation } from 'react-i18next';
import { useGameStore } from '../../store/gameStore';
import { featureActive } from '../../core/systems/features';
import styles from './WahlnachtScreen.module.css';

const HOCHRECHNUNG_DURATION_MS = 2500;
const THRESHOLD_DISPLAY = 40;

export function WahlnachtScreen() {
  const { t } = useTranslation('game');
  const { state, complexity } = useGameStore();
  const [beat, setBeat] = useState(1);
  const [displayPercent, setDisplayPercent] = useState(0);

  const wahlergebnis = state.wahlergebnis ?? state.zust.g;
  const threshold = state.electionThreshold ?? THRESHOLD_DISPLAY;
  const won = state.won ?? wahlergebnis >= threshold;

  // Beat 1: Animate 0 → wahlergebnis
  useEffect(() => {
    if (!state.gameOver || beat !== 1) return;

    let rafId: number;
    let timeoutId: ReturnType<typeof setTimeout>;

    const start = Date.now();
    const animate = () => {
      const elapsed = Date.now() - start;
      const progress = Math.min(1, elapsed / HOCHRECHNUNG_DURATION_MS);
      const eased = 1 - (1 - progress) ** 2; // ease-out
      setDisplayPercent(Math.round(eased * wahlergebnis));

      if (progress < 1) {
        rafId = requestAnimationFrame(animate);
      } else {
        setDisplayPercent(wahlergebnis);
        timeoutId = setTimeout(() => setBeat(2), 800);
      }
    };
    rafId = requestAnimationFrame(animate);

    return () => {
      cancelAnimationFrame(rafId);
      clearTimeout(timeoutId!);
    };
  }, [state.gameOver, beat, wahlergebnis]);

  if (!state.gameOver) return null;

  const beschlossen = state.gesetze.filter((g) => g.status === 'beschlossen').length;
  const showTiefenanalyse = featureActive(complexity, 'wahlnacht_analyse') && beat >= 3;

  return (
    <div className={`${styles.overlay} ${won ? styles.overlayWon : styles.overlayLost}`}>
      {beat === 1 && (
        <div className={styles.hochrechnung}>
          <h2 className={styles.hochrechnungTitle}>{t('game:wahlnacht.hochrechnung')}</h2>
          <div className={styles.percentDisplay}>
            <span className={styles.percentValue}>{displayPercent}</span>
            <span className={styles.percentUnit}>%</span>
          </div>
          <div className={styles.thresholdBar}>
            <div
              className={styles.thresholdMark}
              style={{ left: `${Math.min(threshold, 95)}%` }}
            />
            <div
              className={styles.resultBar}
              style={{ width: `${Math.min(displayPercent, 100)}%` }}
            />
          </div>
          <p className={styles.thresholdLabel}>
            {t('game:leftPanel.target', { percent: threshold })}
          </p>
        </div>
      )}

      {beat >= 2 && (
        <div className={styles.content}>
          <h1 className={won ? styles.titleWon : styles.titleLost}>
            {won ? t('game:endScreen.won') : t('game:endScreen.lost')}
          </h1>
          <p className={styles.subtitle}>
            {won
              ? t('game:endScreen.wonSubtitle', { percent: wahlergebnis.toFixed(1) })
              : t('game:endScreen.lostSubtitle', { percent: wahlergebnis.toFixed(1) })}
          </p>

          <div className={styles.stats}>
            <div className={styles.stat}>
              <span className={styles.statLabel}>{t('game:endScreen.beschlosseneGesetze')}</span>
              <span className={styles.statValue}>{beschlossen}</span>
            </div>
            <div className={styles.stat}>
              <span className={styles.statLabel}>{t('game:endScreen.finaleKPIs')}</span>
              <span className={styles.statValue}>
                AL {state.kpi.al.toFixed(1)}% · HH {state.kpi.hh.toFixed(1)}% · GI {state.kpi.gi.toFixed(1)} · ZF {state.kpi.zf.toFixed(1)}%
              </span>
            </div>
            <div className={styles.stat}>
              <span className={styles.statLabel}>{t('game:endScreen.milieuZustimmung')}</span>
              <span className={styles.statValue}>
                G {state.zust.g}% · Arbeit {state.zust.arbeit}% · Mitte {state.zust.mitte}% · Prog {state.zust.prog}%
              </span>
            </div>
          </div>

          {beat === 2 && !showTiefenanalyse && (
            <button
              type="button"
              className={styles.restart}
              onClick={() => location.reload()}
            >
              {t('game:endScreen.neueLegislatur')}
            </button>
          )}

          {beat === 2 && showTiefenanalyse && (
            <button
              type="button"
              className={styles.btnSecondary}
              onClick={() => setBeat(3)}
            >
              {t('game:wahlnacht.tiefenanalyse')}
            </button>
          )}

          {beat === 3 && showTiefenanalyse && (
            <>
              <div className={styles.tiefenanalyse}>
                <h3>{t('game:wahlnacht.analyseTitle')}</h3>
                <p>{t('game:wahlnacht.analyseDesc')}</p>
                {state.legislaturBilanz && (
                  <div className={styles.analyseGrid}>
                    <div className={styles.analyseItem}>
                      <span>{t('game:legislaturBilanz.reform')}</span>
                      <span>{state.legislaturBilanz.reformStaerke}</span>
                    </div>
                    <div className={styles.analyseItem}>
                      <span>{t('game:legislaturBilanz.medien')}</span>
                      <span>{state.legislaturBilanz.medienbilanz}</span>
                    </div>
                    <div className={styles.analyseItem}>
                      <span>{t('game:legislaturBilanz.wirtschaft')}</span>
                      <span>{state.legislaturBilanz.wirtschaftsBilanz}</span>
                    </div>
                  </div>
                )}
              </div>
              <button
                type="button"
                className={styles.restart}
                onClick={() => location.reload()}
              >
                {t('game:endScreen.neueLegislatur')}
              </button>
            </>
          )}
        </div>
      )}
    </div>
  );
}
