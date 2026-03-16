import { useState, useEffect, useCallback } from 'react';
import { useTranslation } from 'react-i18next';
import { useGameStore } from '../../store/gameStore';
import { featureActive } from '../../core/systems/features';
import type { Character } from '../../core/types';
import styles from './WahlnachtOnboarding.module.css';

const LEVEL1_CHAR_IDS = ['kanzler', 'fm'];

export function WahlnachtOnboarding() {
  const { t } = useTranslation('game');
  const { state, playerName, complexity, startGame } = useGameStore();
  const [beat, setBeat] = useState(1);

  const advance = useCallback(() => {
    if (beat < 4) setBeat((b) => b + 1);
    else startGame();
  }, [beat, startGame]);

  // Beat 1: Auto-Weiter nach 4s
  useEffect(() => {
    if (beat !== 1) return;
    const t = setTimeout(advance, 4000);
    return () => clearTimeout(t);
  }, [beat, advance]);

  // Tastatur: Enter/Space
  useEffect(() => {
    const handler = (e: KeyboardEvent) => {
      if (e.key === 'Enter' || e.key === ' ') {
        e.preventDefault();
        advance();
      }
    };
    window.addEventListener('keydown', handler);
    return () => window.removeEventListener('keydown', handler);
  }, [advance]);

  const chars: Character[] =
    complexity >= 2
      ? state.chars
      : state.chars.filter((c) => LEVEL1_CHAR_IDS.includes(c.id));

  const name = playerName.trim() || t('game:onboarding.defaultGovName');
  const lawCount = state.gesetze.length;
  const pk = state.pk;
  const showBundesratLine = featureActive(complexity, 'bundesrat_simple');
  const memoBrLine = showBundesratLine ? t('game:onboarding.memoBrLine') : '';

  return (
    <div className={styles.root}>
      {/* Beat 1 — Schlagzeile */}
      {beat === 1 && (
        <div className={styles.beat1}>
          <div className={styles.headline}>
            <h1 className={styles.h1}>{t('game:onboarding.headline1')}</h1>
            <h2 className={styles.h2}>
              {t('game:onboarding.headline2', { name: name.toUpperCase() }).split('\n').map((line, i) => (
                <span key={i}>{line}{i === 0 && <br />}</span>
              ))}
            </h2>
            <p className={styles.meta}>
              {t('game:onboarding.headlineMeta')}
            </p>
          </div>
          <button type="button" className={styles.weiter} onClick={advance}>
            {t('game:onboarding.weiter')}
          </button>
        </div>
      )}

      {/* Beat 2 — Kabinett-Vorstellung */}
      {beat === 2 && (
        <div className={styles.beat2}>
          <div className={styles.chars}>
            {chars.map((c, i) => (
              <div
                key={c.id}
                className={styles.char}
                style={{ animationDelay: `${i * 300}ms` }}
              >
                <div
                  className={styles.avatar}
                  style={{
                    backgroundColor: `${c.color}33`,
                    borderColor: c.color,
                  }}
                >
                  {c.initials}
                </div>
                <span className={styles.charName}>{t(`game:chars.${c.id}.name`)}</span>
                <span className={styles.charRole}>{t(`game:chars.${c.id}.role`)}</span>
                <span className={styles.charTag}>{t(`game:chars.${c.id}.tag`)}</span>
              </div>
            ))}
          </div>
          <p className={styles.kabinettText}>
            {t('game:onboarding.kabinettText')}
          </p>
          <button type="button" className={styles.weiter} onClick={advance}>
            {t('game:onboarding.weiter')}
          </button>
        </div>
      )}

      {/* Beat 3 — Internes Memo */}
      {beat === 3 && (
        <div className={styles.beat3}>
          <pre className={styles.memo}>
            {t('game:onboarding.memo', { lawCount, pk, brLine: memoBrLine })}
          </pre>
          <button type="button" className={styles.weiter} onClick={advance}>
            {t('game:onboarding.weiter')}
          </button>
        </div>
      )}

      {/* Beat 4 — Call to Action */}
      {beat === 4 && (
        <div className={styles.beat4}>
          <p className={styles.ctaText}>
            <em>{t('game:onboarding.cta1')}</em>
            <br />
            <strong>{t('game:onboarding.cta2')}</strong>
          </p>
          <button
            type="button"
            className={styles.insKanzleramt}
            onClick={advance}
          >
            {t('game:onboarding.insKanzleramt')}
          </button>
        </div>
      )}
    </div>
  );
}
