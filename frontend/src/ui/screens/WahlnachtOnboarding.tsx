/**
 * SMA-289: Wahlnacht-Onboarding mit Partei-Auswahl (Stufe 2+) und Ideologie-Feinjustierung (Stufe 3+).
 * Stufe 1: Automatisch SDP, kein Partei-Screen.
 */
import { useState, useEffect, useCallback } from 'react';
import { useTranslation } from 'react-i18next';
import { useGameStore } from '../../store/gameStore';
import { featureActive } from '../../core/systems/features';
import type { Character } from '../../core/types';
import type { Ausrichtung } from '../../core/systems/ausrichtung';
import {
  PARTEI_STARTPUNKTE,
  PARTEI_KORRIDORE,
  SPIELBARE_PARTEIEN,
  type SpielerParteiId,
} from '../../data/defaults/parteien';
import { berechneKoalitionspartner } from '../../core/systems/koalition';
import { ALLE_PARTEIEN } from '../../data/defaults/koalitionspartner';
import styles from './WahlnachtOnboarding.module.css';

/** Beat 0 = Partei, 1 = Ideologie (Stufe 3+), 2 = Headline, 3 = Kabinett, 4 = Memo, 5 = CTA */
function clampToCorridor(
  value: number,
  corridor: [number, number]
): number {
  return Math.max(corridor[0], Math.min(corridor[1], value));
}

export function WahlnachtOnboarding() {
  const { t } = useTranslation('game');
  const {
    state,
    playerName,
    complexity,
    init,
    startGame,
    setSpielerPartei,
    setAusrichtung,
  } = useGameStore();

  const showParteiScreen = complexity >= 2;
  const showIdeologieScreen = complexity >= 3;

  const [beat, setBeat] = useState(showParteiScreen ? 0 : 3);
  const [selectedPartei, setSelectedPartei] = useState<SpielerParteiId | null>(null);
  const [ausrichtung, setLocalAusrichtung] = useState<Ausrichtung>({
    wirtschaft: 0,
    gesellschaft: 0,
    staat: 0,
  });

  const advance = useCallback(() => {
    const maxBeat = showIdeologieScreen ? 6 : 5;
    if (beat < maxBeat) setBeat((b) => b + 1);
    else startGame();
  }, [beat, startGame, showIdeologieScreen]);

  const handleParteiSelect = useCallback(
    (parteiId: SpielerParteiId) => {
      const partei = SPIELBARE_PARTEIEN.find((p) => p.id === parteiId)!;
      setSpielerPartei({ id: partei.id, kuerzel: partei.kuerzel, farbe: partei.farbe, name: partei.name });
      const start = PARTEI_STARTPUNKTE[parteiId];
      setAusrichtung(start);
      setLocalAusrichtung(start);
      setSelectedPartei(parteiId);
      setBeat(1);
    },
    [setSpielerPartei, setAusrichtung]
  );

  const handleParteiConfirmWeiter = useCallback(() => {
    if (showIdeologieScreen) {
      setBeat(2);
    } else {
      init();
      setBeat(3);
    }
  }, [showIdeologieScreen, init]);

  const handleIdeologieWeiter = useCallback(() => {
    setAusrichtung(ausrichtung);
    init();
    setBeat(3);
  }, [ausrichtung, setAusrichtung, init]);

  const handleAusrichtungChange = useCallback(
    (axis: keyof Ausrichtung, value: number) => {
      if (!selectedPartei) return;
      const korridor = PARTEI_KORRIDORE[selectedPartei];
      const key = axis === 'wirtschaft' ? 'w' : axis === 'gesellschaft' ? 'g' : 's';
      const clamped = clampToCorridor(value, korridor[key]);
      setLocalAusrichtung((a) => ({ ...a, [axis]: clamped }));
    },
    [selectedPartei]
  );

  // Beat 3 (Headline): Auto-Weiter nach 4s
  useEffect(() => {
    if (beat !== 3) return;
    const id = setTimeout(advance, 4000);
    return () => clearTimeout(id);
  }, [beat, advance]);

  // Tastatur: Enter/Space
  useEffect(() => {
    const handler = (e: KeyboardEvent) => {
      if (e.key === 'Enter' || e.key === ' ') {
        e.preventDefault();
        if (beat === 0 || beat === 1 || beat === 2) return;
        advance();
      }
    };
    window.addEventListener('keydown', handler);
    return () => window.removeEventListener('keydown', handler);
  }, [advance, beat]);

  const chars: Character[] = state.chars;
  const name = playerName.trim() || t('game:onboarding.defaultGovName');
  const lawCount = state.gesetze.length;
  const pk = state.pk;
  const showBundesratLine = featureActive(complexity, 'bundesrat_sichtbar');
  const memoBrLine = showBundesratLine ? t('game:onboarding.memoBrLine') : '';

  return (
    <div className={styles.root}>
      {/* Beat 0 — Partei wählen (Stufe 2+) */}
      {beat === 0 && (
        <div className={styles.beatPartei}>
          <p className={styles.willkommen}>{t('game:onboarding.willkommen')}</p>
          <h1 className={styles.parteiTitle}>{t('game:onboarding.parteiTitle')}</h1>
          <div className={styles.parteiGrid}>
            {SPIELBARE_PARTEIEN.map((p) => (
              <button
                key={p.id}
                type="button"
                className={styles.parteiCard}
                style={{
                  borderColor: selectedPartei === p.id ? p.farbe : 'var(--border)',
                  backgroundColor: selectedPartei === p.id ? `${p.farbe}15` : 'var(--bg3)',
                }}
                onClick={() => handleParteiSelect(p.id)}
              >
                <span
                  className={styles.parteiKuerzel}
                  style={{ backgroundColor: p.farbe, color: '#fff' }}
                >
                  {p.kuerzel}
                </span>
                <span className={styles.parteiName}>{p.name}</span>
                <span className={styles.parteiBeschreibung}>{p.beschreibung}</span>
              </button>
            ))}
          </div>
        </div>
      )}

      {/* Beat 1 — Partei-Bestätigung (Stufe 2+) */}
      {beat === 1 && selectedPartei && (
        <div className={styles.beatPartei}>
          <p className={styles.parteiConfirm}>
            {t(`game:onboarding.partei_${selectedPartei}`)}
          </p>
          <button type="button" className={styles.weiter} onClick={handleParteiConfirmWeiter}>
            {t('game:onboarding.weiter')}
          </button>
        </div>
      )}

      {/* Beat 2 — Ideologie feinjustieren (Stufe 3+) */}
      {beat === 2 && selectedPartei && (
        <div className={styles.beatIdeologie}>
          <h1 className={styles.ideologieTitle}>{t('game:onboarding.ideologieTitle')}</h1>
          <p className={styles.ideologieSubtitle}>{t('game:onboarding.ideologieSubtitle')}</p>
          <div className={styles.sliderGroup}>
            <label className={styles.sliderLabel}>
              <span>{t('game:onboarding.wirtschaft')}</span>
              <span className={styles.sliderValue}>{ausrichtung.wirtschaft}</span>
            </label>
            <input
              type="range"
              min={PARTEI_KORRIDORE[selectedPartei].w[0]}
              max={PARTEI_KORRIDORE[selectedPartei].w[1]}
              step={1}
              value={ausrichtung.wirtschaft}
              onChange={(e) => handleAusrichtungChange('wirtschaft', Number(e.target.value))}
              className={styles.slider}
            />
          </div>
          <div className={styles.sliderGroup}>
            <label className={styles.sliderLabel}>
              <span>{t('game:onboarding.gesellschaft')}</span>
              <span className={styles.sliderValue}>{ausrichtung.gesellschaft}</span>
            </label>
            <input
              type="range"
              min={PARTEI_KORRIDORE[selectedPartei].g[0]}
              max={PARTEI_KORRIDORE[selectedPartei].g[1]}
              step={1}
              value={ausrichtung.gesellschaft}
              onChange={(e) => handleAusrichtungChange('gesellschaft', Number(e.target.value))}
              className={styles.slider}
            />
          </div>
          <div className={styles.sliderGroup}>
            <label className={styles.sliderLabel}>
              <span>{t('game:onboarding.staat')}</span>
              <span className={styles.sliderValue}>{ausrichtung.staat}</span>
            </label>
            <input
              type="range"
              min={PARTEI_KORRIDORE[selectedPartei].s[0]}
              max={PARTEI_KORRIDORE[selectedPartei].s[1]}
              step={1}
              value={ausrichtung.staat}
              onChange={(e) => handleAusrichtungChange('staat', Number(e.target.value))}
              className={styles.slider}
            />
          </div>
          <p className={styles.korridorHint}>
            {t('game:onboarding.korridorHint', {
              partei: SPIELBARE_PARTEIEN.find((x) => x.id === selectedPartei)?.kuerzel ?? '',
            })}
          </p>
          {(() => {
            const partnerParteiId = berechneKoalitionspartner(selectedPartei, ausrichtung);
            const partnerPartei = ALLE_PARTEIEN.find((p) => p.id === partnerParteiId);
            return partnerPartei ? (
              <p className={styles.partnerHint}>
                {t('game:onboarding.partnerHint', { partei: partnerPartei.name })}
              </p>
            ) : null;
          })()}
          <button type="button" className={styles.weiter} onClick={handleIdeologieWeiter}>
            {t('game:onboarding.weiter')}
          </button>
        </div>
      )}

      {/* Beat 3 — Schlagzeile */}
      {beat === 3 && (
        <div className={styles.beat1}>
          <div className={styles.headline}>
            <h1 className={styles.h1}>{t('game:onboarding.headline1')}</h1>
            <h2 className={styles.h2}>
              {t('game:onboarding.headline2', { name: name.toUpperCase() })
                .split('\n')
                .map((line, i) => (
                  <span key={i}>
                    {line}
                    {i === 0 && <br />}
                  </span>
                ))}
            </h2>
            <p className={styles.meta}>{t('game:onboarding.headlineMeta')}</p>
          </div>
          <button type="button" className={styles.weiter} onClick={advance}>
            {t('game:onboarding.weiter')}
          </button>
        </div>
      )}

      {/* Beat 4 — Kabinett-Vorstellung */}
      {beat === 4 && (
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
                <span className={styles.charName}>{c.name || t(`game:chars.${c.id}.name`)}</span>
                <span className={styles.charRole}>{c.role || t(`game:chars.${c.id}.role`)}</span>
                <span className={styles.charTag}>{c.tag ?? t(`game:chars.${c.id}.tag`)}</span>
                {c.eingangszitat && (
                  <span className={styles.charZitat}>{c.eingangszitat}</span>
                )}
              </div>
            ))}
          </div>
          <p className={styles.kabinettText}>{t('game:onboarding.kabinettText')}</p>
          <button type="button" className={styles.weiter} onClick={advance}>
            {t('game:onboarding.weiter')}
          </button>
        </div>
      )}

      {/* Beat 5 — Internes Memo */}
      {beat === 5 && (
        <div className={styles.beat3}>
          <pre className={styles.memo}>
            {t('game:onboarding.memo', { lawCount, pk, brLine: memoBrLine })}
          </pre>
          <button type="button" className={styles.weiter} onClick={advance}>
            {t('game:onboarding.weiter')}
          </button>
        </div>
      )}

      {/* Beat 6 — Call to Action */}
      {beat === 6 && (
        <div className={styles.beat4}>
          <p className={styles.ctaText}>
            <em>{t('game:onboarding.cta1')}</em>
            <br />
            <strong>{t('game:onboarding.cta2')}</strong>
          </p>
          <button type="button" className={styles.insKanzleramt} onClick={advance}>
            {t('game:onboarding.insKanzleramt')}
          </button>
        </div>
      )}
    </div>
  );
}
