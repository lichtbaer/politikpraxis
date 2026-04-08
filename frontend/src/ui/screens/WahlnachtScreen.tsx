/**
 * SMA-279: Wahlnacht-Screen (Monat 48) — animierte Hochrechnung, Sieg/Niederlage
 * SMA-343: Anschließend vollständige Spielauswertung
 */
import { useState, useEffect } from 'react';
import { useTranslation } from 'react-i18next';
import { useGameStore } from '../../store/gameStore';
import { SpielauswertungScreen } from './SpielauswertungScreen';
import styles from './WahlnachtScreen.module.css';

const HOCHRECHNUNG_DURATION_MS = 2500;
const THRESHOLD_DISPLAY = 40;

export function WahlnachtScreen() {
  const { t } = useTranslation('game');
  const { state } = useGameStore();
  const [beat, setBeat] = useState(1);
  const [displayPercent, setDisplayPercent] = useState(0);

  const wahlergebnis = state.wahlergebnis ?? state.zust.g;
  const threshold = state.electionThreshold ?? THRESHOLD_DISPLAY;
  const wahlUeberHuerde = state.wahlUeberHuerde ?? wahlergebnis >= threshold;
  const legislaturErfolg = state.legislaturErfolg ?? state.won ?? false;

  useEffect(() => {
    if (!state.gameOver || beat !== 1) return;

    let rafId: number;
    let timeoutId: ReturnType<typeof setTimeout>;

    const start = Date.now();
    const animate = () => {
      const elapsed = Date.now() - start;
      const progress = Math.min(1, elapsed / HOCHRECHNUNG_DURATION_MS);
      const eased = 1 - (1 - progress) ** 2;
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

  return (
    <div className={`${styles.overlay} ${legislaturErfolg ? styles.overlayWon : styles.overlayLost}`}>
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
          <h1 className={legislaturErfolg ? styles.titleWon : styles.titleLost}>
            {legislaturErfolg ? t('game:endScreen.won') : t('game:endScreen.lost')}
          </h1>
          <p className={styles.subtitle}>
            {legislaturErfolg
              ? t('game:endScreen.wonSubtitle', { percent: wahlergebnis.toFixed(1) })
              : t('game:endScreen.lostSubtitle', { percent: wahlergebnis.toFixed(1) })}
          </p>
          {!legislaturErfolg && wahlUeberHuerde && (
            <p className={styles.subtitle}>
              {t(
                'game:wahlnacht.trotzHuerde',
                'Du hast die Wahlhürde überschritten, aber die Gesamtbewertung der Legislatur reicht nicht.',
              )}
            </p>
          )}
          {legislaturErfolg && !wahlUeberHuerde && (
            <p className={styles.subtitle}>
              {t(
                'game:wahlnacht.ohneHuerde',
                'Die Legislatur ist nach Gesamtbewertung erfolgreich, obwohl die Wahlhürde nicht erreicht wurde.',
              )}
            </p>
          )}

          <SpielauswertungScreen wahlergebnis={wahlergebnis} gewonnen={legislaturErfolg} threshold={threshold} />
        </div>
      )}
    </div>
  );
}
