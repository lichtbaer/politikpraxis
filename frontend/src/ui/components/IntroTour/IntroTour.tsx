import { useState } from 'react';
import { useTranslation } from 'react-i18next';
import { useGameStore } from '../../../store/gameStore';
import styles from './IntroTour.module.css';

/**
 * Geführte Erst-Einführung (SMA-Verbesserungsplan): 5 Schritte erklären
 * Spielziel, Gesetzgebung, Politisches Kapital, Zeitsteuerung und Hilfe.
 * Erscheint einmalig beim ersten Spiel (Monat 1), überspringbar,
 * Status in localStorage.
 */
const STORAGE_KEY = 'politikpraxis_intro_tour_done';
const STEP_KEYS = ['ziel', 'gesetze', 'pk', 'zeit', 'hilfe'] as const;

function isTourDone(): boolean {
  try {
    return localStorage.getItem(STORAGE_KEY) === '1';
  } catch {
    return true; // Ohne Storage keine Tour erzwingen
  }
}

function markTourDone() {
  try {
    localStorage.setItem(STORAGE_KEY, '1');
  } catch {
    // Storage blockiert — Tour erscheint dann erneut, kein harter Fehler
  }
}

export function IntroTour() {
  const { t } = useTranslation('game');
  const phase = useGameStore((s) => s.phase);
  const month = useGameStore((s) => s.state.month);
  const gameOver = useGameStore((s) => s.state.gameOver);
  const [step, setStep] = useState(0);
  const [done, setDone] = useState(isTourDone);

  if (done || phase !== 'playing' || gameOver || month > 1) return null;

  const finish = () => {
    markTourDone();
    setDone(true);
  };

  const isLast = step === STEP_KEYS.length - 1;
  const key = STEP_KEYS[step];

  return (
    <div className={styles.overlay} role="dialog" aria-modal="true" aria-label={t('introTour.ariaLabel')}>
      <div className={styles.card}>
        <span className={styles.stepIndicator}>
          {t('introTour.stepIndicator', { current: step + 1, total: STEP_KEYS.length })}
        </span>
        <h2 className={styles.title}>{t(`introTour.${key}.title`)}</h2>
        <p className={styles.text}>{t(`introTour.${key}.text`)}</p>
        <div className={styles.actions}>
          <button type="button" className={styles.skip} onClick={finish}>
            {t('introTour.ueberspringen')}
          </button>
          {step > 0 && (
            <button type="button" className={styles.back} onClick={() => setStep(step - 1)}>
              {t('introTour.zurueck')}
            </button>
          )}
          <button
            type="button"
            className={styles.next}
            onClick={() => (isLast ? finish() : setStep(step + 1))}
          >
            {isLast ? t('introTour.losgehts') : t('introTour.weiter')}
          </button>
        </div>
      </div>
    </div>
  );
}
