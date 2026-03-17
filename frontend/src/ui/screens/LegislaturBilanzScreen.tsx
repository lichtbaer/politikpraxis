/**
 * SMA-279: Legislatur-Bilanz-Screen — erscheint einmalig bei Wahlkampf-Beginn (Monat 43)
 */
import { useState } from 'react';
import { useTranslation } from 'react-i18next';
import { useGameStore } from '../../store/gameStore';
import { useGameActions } from '../hooks/useGameActions';
import { featureActive } from '../../core/systems/features';
import type { LegislaturBilanz } from '../../core/types';
import styles from './LegislaturBilanzScreen.module.css';

const FALLBACK_BOTSCHAFTEN = ['klima', 'wirtschaft', 'soziales', 'sicherheit'];

function getBotschaftenOptionen(bilanz: LegislaturBilanz): string[] {
  const combined = [...bilanz.kernthemen, ...bilanz.schwachstellen];
  const unique = Array.from(new Set(combined));
  const result = unique.slice(0, 4);
  while (result.length < 4) {
    const fallback = FALLBACK_BOTSCHAFTEN.find((f) => !result.includes(f));
    if (fallback) result.push(fallback);
    else break;
  }
  return result;
}

function isGlaubwuerdig(botschaft: string, bilanz: LegislaturBilanz): boolean {
  return bilanz.kernthemen.includes(botschaft) || bilanz.glaubwuerdigkeitsBonus >= 3;
}

export function LegislaturBilanzScreen() {
  const { t } = useTranslation('game');
  const { state, complexity } = useGameStore();
  const { doSetWahlkampfBotschaften } = useGameActions();
  const [beat, setBeat] = useState(1);
  const [selected, setSelected] = useState<Set<string>>(new Set());

  const bilanz = state.legislaturBilanz;
  const wahlkampfAktiv = state.wahlkampfAktiv ?? false;
  const hasBotschaften = (state.wahlkampfBotschaften?.length ?? 0) >= 2;

  const show =
    featureActive(complexity, 'legislatur_bilanz') &&
    wahlkampfAktiv &&
    bilanz &&
    !hasBotschaften;

  if (!show) return null;

  const optionen = getBotschaftenOptionen(bilanz);

  const toggleBotschaft = (id: string) => {
    setSelected((prev) => {
      const next = new Set(prev);
      if (next.has(id)) {
        next.delete(id);
      } else if (next.size < 2) {
        next.add(id);
      }
      return next;
    });
  };

  const handleFertig = () => {
    doSetWahlkampfBotschaften(Array.from(selected));
  };

  return (
    <div className={styles.overlay}>
      <div className={styles.modal}>
        {beat === 1 && (
          <>
            <h1 className={styles.title}>{t('game:legislaturBilanz.beat1Title')}</h1>
            <div className={styles.bilanzGrid}>
              <div className={styles.bilanzItem}>
                <span className={styles.bilanzLabel}>{t('game:wahlkampf.gesetze')}</span>
                <span className={styles.bilanzValue}>{bilanz.gesetzeBeschlossen}</span>
              </div>
              <div className={styles.bilanzItem}>
                <span className={styles.bilanzLabel}>{t('game:wahlkampf.politikfelder')}</span>
                <span className={styles.bilanzValue}>{bilanz.politikfelderAbgedeckt}</span>
              </div>
              <div className={styles.bilanzItem}>
                <span className={styles.bilanzLabel}>{t('game:legislaturBilanz.haushalt')}</span>
                <span className={styles.bilanzValue}>
                  {bilanz.haushaltsaldo >= 0 ? '+' : ''}{bilanz.haushaltsaldo.toFixed(0)} Mrd.
                </span>
              </div>
              <div className={styles.bilanzItem}>
                <span className={styles.bilanzLabel}>{t('game:legislaturBilanz.koalition')}</span>
                <span className={styles.bilanzValue}>
                  {Math.round(bilanz.koalitionsvertragErfuellt * 100)}%
                </span>
              </div>
            </div>
            <button type="button" className={styles.btn} onClick={() => setBeat(2)}>
              {t('game:legislaturBilanz.weiter')}
            </button>
          </>
        )}

        {beat === 2 && (
          <>
            <h1 className={styles.title}>{t('game:legislaturBilanz.beat2Title')}</h1>
            <div className={styles.qualitaet}>
              <div className={styles.qualItem}>
                <span className={styles.qualLabel}>{t('game:legislaturBilanz.reform')}</span>
                <span className={styles.qualValue}>{bilanz.reformStaerke}</span>
              </div>
              <div className={styles.qualItem}>
                <span className={styles.qualLabel}>{t('game:legislaturBilanz.stabilitaet')}</span>
                <span className={styles.qualValue}>{bilanz.stabilitaet}</span>
              </div>
              <div className={styles.qualItem}>
                <span className={styles.qualLabel}>{t('game:legislaturBilanz.wirtschaft')}</span>
                <span className={styles.qualValue}>{bilanz.wirtschaftsBilanz}</span>
              </div>
              <div className={styles.qualItem}>
                <span className={styles.qualLabel}>{t('game:legislaturBilanz.medien')}</span>
                <span className={styles.qualValue}>{bilanz.medienbilanz}</span>
              </div>
            </div>
            <button type="button" className={styles.btn} onClick={() => setBeat(3)}>
              {t('game:legislaturBilanz.weiter')}
            </button>
          </>
        )}

        {beat === 3 && (
          <>
            <h1 className={styles.title}>{t('game:legislaturBilanz.beat3Title')}</h1>
            <p className={styles.desc}>{t('game:legislaturBilanz.beat3Desc')}</p>
            <div className={styles.botschaften}>
              {optionen.map((id) => {
                const glaubwuerdig = isGlaubwuerdig(id, bilanz);
                const isSelected = selected.has(id);
                return (
                  <button
                    key={id}
                    type="button"
                    className={`${styles.botschaftBtn} ${isSelected ? styles.selected : ''}`}
                    onClick={() => toggleBotschaft(id)}
                  >
                    <span className={styles.glaubwuerdigkeit}>
                      {glaubwuerdig ? '✅' : '⚠'}
                    </span>
                    <span>{t(`game:legislaturBilanz.botschaft.${id}`, id)}</span>
                  </button>
                );
              })}
            </div>
            <button
              type="button"
              className={styles.btn}
              disabled={selected.size !== 2}
              onClick={handleFertig}
            >
              {t('game:legislaturBilanz.fertig')}
            </button>
          </>
        )}
      </div>
    </div>
  );
}
