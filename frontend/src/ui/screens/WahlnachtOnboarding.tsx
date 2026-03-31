/**
 * SMA-289: Wahlnacht-Onboarding mit Partei-Auswahl (Stufe 2+) und Ideologie-Feinjustierung (Stufe 3+).
 * Stufe 1: Automatisch SDP, kein Partei-Screen.
 */
import { useState, useEffect, useCallback, useMemo } from 'react';
import { useTranslation } from 'react-i18next';
import { useGameStore } from '../../store/gameStore';
import { featureActive } from '../../core/systems/features';
import { berechneWahlprognose } from '../../core/systems/wahlprognose';
import type { Character, ContentBundle } from '../../core/types';
import type { Ausrichtung } from '../../core/systems/ausrichtung';
import {
  PARTEI_STARTPUNKTE,
  PARTEI_KORRIDORE,
  SPIELBARE_PARTEIEN,
  type SpielerParteiId,
} from '../../data/defaults/parteien';
import { berechneKoalitionspartner, getKoalitionspartner } from '../../core/systems/koalition';
import { getKoalitionsStanz, gruppiereNachKoalitionsStanz } from '../../core/gesetzAgenda';
import { IdeologieSlider } from '../components/IdeologieSlider/IdeologieSlider';
import { ALLE_PARTEIEN } from '../../data/defaults/koalitionspartner';
import { toBcp47 } from '../lib/locale';
import styles from './WahlnachtOnboarding.module.css';

/** Beat 0 = Partei, 1 = Ideologie (Stufe 3+), 2 = Headline, 3 = Kabinett, 4 = Memo, 5 = Koalitionsvertrag, 6 = CTA */
function clampToCorridor(
  value: number,
  corridor: [number, number]
): number {
  return Math.max(corridor[0], Math.min(corridor[1], value));
}

function formatOnboardingPercent(value: number, locale: string): string {
  const n = new Intl.NumberFormat(locale, {
    minimumFractionDigits: 1,
    maximumFractionDigits: 1,
  }).format(value);
  return `${n}%`;
}

function berechneOnboardingWahlbeteiligung(
  content: ContentBundle,
  complexity: number,
): number {
  const milieus = content.milieus ?? [];
  const visible = milieus.filter((m) => m.min_complexity <= complexity);
  if (visible.length === 0) return 76;
  let sum = 0;
  let gewichtSum = 0;
  for (const m of visible) {
    const g = m.gewicht ?? 14;
    const b = m.basisbeteiligung ?? 70;
    sum += b * g;
    gewichtSum += g;
  }
  if (gewichtSum <= 0) return 76;
  return Math.round((sum / gewichtSum) * 10) / 10;
}

export function WahlnachtOnboarding() {
  const { t, i18n } = useTranslation('game');
  const {
    state,
    content,
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
    const maxBeat = showIdeologieScreen ? 7 : 6;
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
  const name = (state.kanzlerName ?? playerName).trim() || t('game:onboarding.defaultGovName');
  const pk = state.pk;
  const showBundesratLine = featureActive(complexity, 'bundesrat_sichtbar');
  const memoBrLine = showBundesratLine ? t('game:onboarding.memoBrLine') : '';

  // Dynamischer Headline-Meta-Text: Wahlprognose + Koalitionsvorschau (aus main)
  const locale = toBcp47(i18n.language);
  const approvalPrognose = berechneWahlprognose(state, content, complexity);
  const turnoutBeteiligung = berechneOnboardingWahlbeteiligung(content, complexity);
  const partnerId = state.koalitionspartner?.id;
  const spielerParteiState = state.spielerPartei;
  const coalitionLine =
    partnerId && spielerParteiState
      ? t('game:onboarding.coalitionLikely', {
          a: spielerParteiState.kuerzel,
          b:
            ALLE_PARTEIEN.find((p) => p.id === partnerId)?.kuerzel ??
            String(partnerId).toUpperCase(),
        })
      : t('game:onboarding.leadingPartyLikely', {
          kuerzel: spielerParteiState?.kuerzel ?? 'SDP',
        });
  const headlineMetaText = t('game:onboarding.headlineMeta', {
    approval: formatOnboardingPercent(approvalPrognose, locale),
    coalitionLine,
    turnout: formatOnboardingPercent(turnoutBeteiligung, locale),
    tagline: t('game:onboarding.headlineMetaTagline'),
  });

  // Koalitions-Klassifizierung für Beat 5 (Memo) und Beat 6 (Koalitionsvertrag)
  const koalitionspartnerContent = state.koalitionspartner
    ? getKoalitionspartner(undefined, state)
    : null;
  const onboardingSch = koalitionspartnerContent?.schluesselthemen ?? [];
  const onboardingKvProfil = state.koalitionsvertragProfil ?? { wirtschaft: 0, gesellschaft: 0, staat: 0 };

  const koalitionsGruppen = useMemo(() => {
    if (state.gesetze.length === 0) return null;
    return gruppiereNachKoalitionsStanz(state.gesetze, onboardingKvProfil, onboardingSch);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [state.gesetze]);

  const prioLawCount = useMemo(
    () => state.gesetze.filter((g) => getKoalitionsStanz(g, onboardingKvProfil, onboardingSch) === 'priorisiert').length,
    // eslint-disable-next-line react-hooks/exhaustive-deps
    [state.gesetze],
  );
  // Fallback: wenn kein Koalitionspartner vorhanden, alle Gesetze zeigen
  const lawCount = prioLawCount > 0 ? prioLawCount : state.gesetze.length;

  /* SMA-302: Fortschritts-Dots — Schritte je nach Komplexität */
  const steps = showIdeologieScreen
    ? [0, 1, 2, 3, 4, 5, 6, 7]
    : showParteiScreen
      ? [0, 1, 3, 4, 5, 6, 7]
      : [3, 4, 5, 6, 7];
  const currentStepIndex = steps.indexOf(beat);

  return (
    <div className={styles.root}>
      <div className={styles.layoutWrapper}>
        {/* Fortschritts-Dots (SMA-302) */}
        <div className={styles.progressDots} aria-label={t('game:onboarding.stepProgress', { current: currentStepIndex + 1, total: steps.length })}>
          {steps.map((s, i) => (
            <span
              key={s}
              className={`${styles.progressDot} ${i === currentStepIndex ? styles.active : i < currentStepIndex ? styles.passed : ''}`}
              aria-hidden
            />
          ))}
        </div>

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

        {/* Beat 2 — Ideologie feinjustieren (Stufe 3+) — SMA-301 */}
        {beat === 2 && selectedPartei && (
          <div className={styles.beatIdeologie}>
          <h1 className={styles.ideologieTitle}>{t('game:onboarding.ideologieTitle')}</h1>
          <p className={styles.ideologieSubtitle}>{t('game:onboarding.ideologieSubtitle')}</p>
          <IdeologieSlider
            achse="wirtschaft"
            wert={ausrichtung.wirtschaft}
            min={PARTEI_KORRIDORE[selectedPartei].w[0]}
            max={PARTEI_KORRIDORE[selectedPartei].w[1]}
            onChange={(v) => handleAusrichtungChange('wirtschaft', v)}
          />
          <IdeologieSlider
            achse="gesellschaft"
            wert={ausrichtung.gesellschaft}
            min={PARTEI_KORRIDORE[selectedPartei].g[0]}
            max={PARTEI_KORRIDORE[selectedPartei].g[1]}
            onChange={(v) => handleAusrichtungChange('gesellschaft', v)}
          />
          <IdeologieSlider
            achse="staat"
            wert={ausrichtung.staat}
            min={PARTEI_KORRIDORE[selectedPartei].s[0]}
            max={PARTEI_KORRIDORE[selectedPartei].s[1]}
            onChange={(v) => handleAusrichtungChange('staat', v)}
          />
          <div className={styles.ideologieFooter}>
            <p className={styles.korridorHint}>
              {t('game:onboarding.korridorHint', {
                partei: SPIELBARE_PARTEIEN.find((x) => x.id === selectedPartei)?.kuerzel ?? '',
              })}
            </p>
            <p className={styles.koalitionspartnerVorschau}>
              {t('game:onboarding.koalitionspartnerVorschau', {
                kuerzel: (() => {
                  const partnerParteiId = berechneKoalitionspartner(selectedPartei, ausrichtung);
                  const partnerPartei = ALLE_PARTEIEN.find((p) => p.id === partnerParteiId);
                  return partnerPartei?.kuerzel ?? 'GP';
                })(),
              })}
            </p>
          </div>
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
            <p className={styles.meta}>{headlineMetaText}</p>
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
          <p className={styles.kabinettText}>{t('game:onboarding.kabinettText', { count: chars.length })}</p>
            <button type="button" className={styles.weiter} onClick={advance}>
              {t('game:onboarding.weiter')}
            </button>
          </div>
        )}

        {/* Beat 5 — Internes Memo */}
        {beat === 5 && (
          <div className={styles.beat3}>
          <div className={styles.memoContainer}>
            <pre className={styles.memo}>
              {t('game:onboarding.memo', { lawCount, pk, brLine: memoBrLine })}
            </pre>
          </div>
            <button type="button" className={styles.weiter} onClick={advance}>
              {t('game:onboarding.weiter')}
            </button>
          </div>
        )}

        {/* Beat 6 — Koalitionsvertrag-Übersicht */}
        {beat === 6 && (
          <div className={styles.beatKoalition}>
            <h1 className={styles.koalitionsvertragTitle}>
              {t('game:onboarding.koalitionsvertragTitle')}
            </h1>
            <p className={styles.koalitionsvertragSubtitle}>
              {t('game:onboarding.koalitionsvertragSubtitle')}
            </p>
            {koalitionsGruppen ? (
              <div className={styles.stanzSections}>
                {koalitionsGruppen.priorisiert.length > 0 && (
                  <div className={`${styles.stanzSection} ${styles.stanzSectionPriorisiert}`}>
                    <span className={styles.stanzLabel}>
                      {t('game:koalition.stanz.priorisiert')}
                    </span>
                    <ul className={styles.stanzList}>
                      {koalitionsGruppen.priorisiert.slice(0, 5).map((g) => (
                        <li key={g.id}>{g.titel || t(`game:laws.${g.id}.titel`, g.id)}</li>
                      ))}
                      {koalitionsGruppen.priorisiert.length > 5 && (
                        <li>… +{koalitionsGruppen.priorisiert.length - 5}</li>
                      )}
                    </ul>
                  </div>
                )}
                <div className={styles.stanzRow}>
                  <div className={`${styles.stanzStat} ${styles.stanzStatMoeglich}`}>
                    <span className={styles.stanzStatNum}>{koalitionsGruppen.moeglich.length}</span>
                    <span className={styles.stanzStatLabel}>{t('game:onboarding.koalitionsvertragMoeglich')}</span>
                  </div>
                  <div className={`${styles.stanzStat} ${styles.stanzStatAbgelehnt}`}>
                    <span className={styles.stanzStatNum}>{koalitionsGruppen.abgelehnt.length}</span>
                    <span className={styles.stanzStatLabel}>{t('game:onboarding.koalitionsvertragAbgelehnt')}</span>
                  </div>
                </div>
              </div>
            ) : null}
            <button type="button" className={styles.weiter} onClick={advance}>
              {t('game:onboarding.weiter')}
            </button>
          </div>
        )}

        {/* Beat 7 — Call to Action */}
        {beat === 7 && (
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
    </div>
  );
}
