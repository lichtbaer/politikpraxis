/**
 * SMA-279: Wahlnacht-Screen (Monat 48) — animierte Hochrechnung, Sieg/Niederlage
 * SMA-343: Anschließend vollständige Spielauswertung
 * SMA-509: Beat 3 Kanzlerbilanz vor der Auswertung
 * #482: Vorzeitiges Spielende (Regierung gestürzt) — ohne Hochrechnung und Wahlergebnis
 */
import { useState, useEffect } from 'react';
import { useTranslation } from 'react-i18next';
import { useGameStore } from '../../store/gameStore';
import { featureActive } from '../../core/systems/features';
import { DEFAULT_ELECTION_THRESHOLD } from '../../core/constants';
import type { SpielendeGrund } from '../../core/types';
import { SpielauswertungScreen } from './SpielauswertungScreen';
import { KanzlerbilanzBeat } from './KanzlerbilanzBeat';
import { generateConfettiPieces, type ConfettiPiece } from './wahlnachtConfetti';
import styles from './WahlnachtScreen.module.css';

const HOCHRECHNUNG_DURATION_MS = 2500;

/** #482: Begründungstext je vorzeitigem Spielende (Regierung gestürzt, keine Wahl). */
const STURZ_GRUND_KEY: Record<Exclude<SpielendeGrund, 'legislatur'>, string> = {
  koalitionsbruch: 'game:endScreen.lostKoalitionsbruch',
  partner_kuendigt: 'game:endScreen.lostPartnerKuendigt',
  misstrauensvotum: 'game:endScreen.lostMisstrauen',
  vertrauensfrage: 'game:endScreen.lostVertrauensfrage',
  ruecktritt: 'game:endScreen.lostRuecktritt',
};

/** Rein CSS-getriebenes Konfetti (keine neue Abhängigkeit) — feiert einen Wahlsieg auf Beat 2. */
function Confetti() {
  // Lazy-Initializer: Math.random() läuft nachweislich nur einmal beim Mount, nicht bei jedem Render.
  const [pieces] = useState<ConfettiPiece[]>(() => generateConfettiPieces());

  return (
    <div className={styles.confetti} aria-hidden="true">
      {pieces.map((p, i) => (
        <span
          key={i}
          className={styles.confettiPiece}
          style={{
            left: `${p.left}%`,
            backgroundColor: p.color,
            animationDelay: `${p.delay}s`,
            animationDuration: `${p.duration}s`,
            ['--confetti-rotate-from' as string]: `${p.rotateFrom}deg`,
            ['--confetti-rotate-to' as string]: `${p.rotateTo}deg`,
          }}
        />
      ))}
    </div>
  );
}

export function WahlnachtScreen() {
  const { t } = useTranslation('game');
  const { state, content, complexity } = useGameStore();
  const [beat, setBeat] = useState(1);
  const [displayPercent, setDisplayPercent] = useState(0);

  const wahlergebnis = state.wahlergebnis ?? state.zust.g;
  const threshold = state.electionThreshold ?? DEFAULT_ELECTION_THRESHOLD;
  const wahlUeberHuerde = state.wahlUeberHuerde ?? wahlergebnis >= threshold;
  // #482: Regierung vorzeitig gestürzt → keine Wahl, keine Hochrechnung. Alte Spielstände
  // ohne spielendeGrund behalten das bisherige Wahlnacht-Verhalten.
  const sturzGrund =
    state.spielendeGrund && state.spielendeGrund !== 'legislatur' ? state.spielendeGrund : null;
  const vorzeitigesEnde = sturzGrund !== null;
  const legislaturErfolg = !vorzeitigesEnde && (state.legislaturErfolg ?? state.won ?? false);
  // Beat 1 (Hochrechnung) gibt es nur nach einer Wahl.
  const anzeigeBeat = vorzeitigesEnde && beat === 1 ? 2 : beat;
  const showKanzlerbilanzDetails = featureActive(complexity, 'wahlnacht_analyse');
  const showArchetyp = complexity >= 4;

  useEffect(() => {
    if (!state.gameOver || beat !== 1 || vorzeitigesEnde) return;

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
  }, [state.gameOver, beat, wahlergebnis, vorzeitigesEnde]);

  if (!state.gameOver) return null;

  return (
    <div className={`${styles.overlay} ${legislaturErfolg ? styles.overlayWon : styles.overlayLost}`}>
      {anzeigeBeat === 1 && (
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

      {anzeigeBeat === 2 && legislaturErfolg && <Confetti />}

      {anzeigeBeat === 2 && sturzGrund && (
        <div className={styles.content}>
          <h1 className={styles.titleLost}>{t('game:endScreen.gestuerzt', 'Regierung gestürzt')}</h1>
          <p className={styles.subtitle}>{t(STURZ_GRUND_KEY[sturzGrund])}</p>
          <p className={styles.subtitleHint}>
            {t('game:endScreen.gestuerztKeineWahl', { month: state.month })}
          </p>

          <SpielauswertungScreen
            wahlergebnis={wahlergebnis}
            gewonnen={false}
            threshold={threshold}
            vorzeitigesEnde
          />

          <button type="button" className={`${styles.restart} ${styles.bilanzCta}`} onClick={() => setBeat(3)}>
            {t('game:wahlnacht.weiterKanzlerbilanz', 'Kanzlerbilanz ansehen')}
          </button>
        </div>
      )}

      {anzeigeBeat === 2 && !sturzGrund && (
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

          <button type="button" className={`${styles.restart} ${styles.bilanzCta}`} onClick={() => setBeat(3)}>
            {t('game:wahlnacht.weiterKanzlerbilanz', 'Kanzlerbilanz ansehen')}
          </button>
        </div>
      )}

      {anzeigeBeat === 3 && (
        <div className={styles.content}>
          <KanzlerbilanzBeat
            state={state}
            content={content}
            showDetails={showKanzlerbilanzDetails}
            showArchetype={showArchetyp}
            onWeiter={() => setBeat(2)}
          />
        </div>
      )}
    </div>
  );
}
