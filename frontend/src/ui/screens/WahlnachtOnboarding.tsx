/**
 * SMA-289: Wahlnacht-Onboarding mit Partei-Auswahl (Stufe 2+) und Ideologie-Feinjustierung (Stufe 3+).
 * Stufe 1: Automatisch SDP, kein Partei-Screen.
 */
import { useState, useEffect, useCallback, useMemo } from 'react';
import { useTranslation } from 'react-i18next';
import { useGameStore } from '../../store/gameStore';
import { featureActive } from '../../core/systems/features';
import { berechneWahlprognose } from '../../core/systems/wahlprognose';
import type { AgendaZielContent, Character, ContentBundle } from '../../core/types';
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
import { useAuthStore } from '../../store/authStore';
import { postGameAgenda } from '../../services/saves';

/** Onboarding-Beats: Partei (0), Bestätigung (1), Ideologie (2, Stufe 3+), Schlagzeile (3), Kabinett (4), Agenda (5, Stufe 2+), Memo, KV, CTA */
const AGENDA_KATEGORIE_ORDER = [
  'gesetzgebung',
  'milieu',
  'medien',
  'verbaende',
  'haushalt',
  'kabinett',
] as const;
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
    setSpielerAgendaIds,
    cloudSaveId,
  } = useGameStore();
  const accessToken = useAuthStore((s) => s.accessToken);

  const showParteiScreen = complexity >= 2;
  const showIdeologieScreen = complexity >= 3;
  const showAgendaScreen = complexity >= 2;

  const [beat, setBeat] = useState(showParteiScreen ? 0 : 3);
  const [selectedPartei, setSelectedPartei] = useState<SpielerParteiId | null>(null);
  const [ausrichtung, setLocalAusrichtung] = useState<Ausrichtung>({
    wirtschaft: 0,
    gesellschaft: 0,
    staat: 0,
  });
  const [gewaehlteAgendaIds, setGewaehlteAgendaIds] = useState<string[]>([]);
  const [agendaSubmitting, setAgendaSubmitting] = useState(false);

  const maxBeat = showIdeologieScreen
    ? showAgendaScreen
      ? 9
      : 7
    : showAgendaScreen
      ? 8
      : 7;

  const advance = useCallback(() => {
    if (beat < maxBeat) setBeat((b) => b + 1);
    else startGame();
  }, [beat, startGame, maxBeat]);

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
      setBeat(showAgendaScreen ? 5 : 3);
    }
  }, [showIdeologieScreen, showAgendaScreen, init]);

  const handleIdeologieWeiter = useCallback(() => {
    setAusrichtung(ausrichtung);
    init();
    setBeat(showAgendaScreen ? 5 : 3);
  }, [ausrichtung, setAusrichtung, init, showAgendaScreen]);

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

  const agendaBeat = showAgendaScreen ? 5 : -1;
  const memoBeat = showAgendaScreen ? 6 : 5;
  const kvBeat = showAgendaScreen ? 7 : 6;
  const ctaBeat = showAgendaScreen ? 8 : 7;

  const spielerZielAnzahl = complexity === 2 ? 2 : complexity >= 3 ? 3 : 0;

  const parteiIdFilter = state.spielerPartei?.id ?? selectedPartei;

  const zielPoolNachKategorie = useMemo(() => {
    const alle = content.agendaZiele ?? [];
    const filtered = alle.filter((z) => {
      if (z.min_complexity > complexity) return false;
      if (z.partei_filter && z.partei_filter.length > 0 && parteiIdFilter) {
        if (!z.partei_filter.includes(parteiIdFilter)) return false;
      }
      return true;
    });
    const byKat = new Map<string, AgendaZielContent[]>();
    for (const z of filtered) {
      const arr = byKat.get(z.kategorie) ?? [];
      arr.push(z);
      byKat.set(z.kategorie, arr);
    }
    return byKat;
  }, [content.agendaZiele, complexity, parteiIdFilter]);

  const koalitionsZieleAnzeige = useMemo(() => {
    const ids = state.koalitionsAgenda ?? [];
    const alle = content.koalitionsZiele ?? [];
    return ids
      .map((id) => alle.find((z) => z.id === id))
      .filter((z): z is NonNullable<typeof z> => Boolean(z));
  }, [state.koalitionsAgenda, content.koalitionsZiele]);

  const toggleAgendaZiel = useCallback(
    (id: string) => {
      setGewaehlteAgendaIds((prev) => {
        if (prev.includes(id)) return prev.filter((x) => x !== id);
        if (prev.length >= spielerZielAnzahl) return prev;
        return [...prev, id];
      });
    },
    [spielerZielAnzahl]
  );

  const handleAgendaBestaetigen = useCallback(async () => {
    if (gewaehlteAgendaIds.length !== spielerZielAnzahl || agendaSubmitting) return;
    setAgendaSubmitting(true);
    setSpielerAgendaIds(gewaehlteAgendaIds);
    const koa = state.koalitionsAgenda ?? [];
    if (accessToken && cloudSaveId) {
      try {
        await postGameAgenda(accessToken, cloudSaveId, {
          spielerAgenda: gewaehlteAgendaIds,
          koalitionsAgenda: koa.length ? koa : undefined,
        });
      } catch {
        // Lokaler State ist gesetzt; Cloud-Sync kann später über Save nachziehen
      }
    }
    setAgendaSubmitting(false);
    setBeat((b) => b + 1);
  }, [
    gewaehlteAgendaIds,
    spielerZielAnzahl,
    agendaSubmitting,
    setSpielerAgendaIds,
    state.koalitionsAgenda,
    accessToken,
    cloudSaveId,
  ]);

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
        if (beat === 0 || beat === 1 || beat === 2 || beat === agendaBeat) return;
        advance();
      }
    };
    window.addEventListener('keydown', handler);
    return () => window.removeEventListener('keydown', handler);
  }, [advance, beat, agendaBeat]);

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

  /* SMA-302 / SMA-503: Fortschritts-Dots — Schritte je nach Komplexität */
  const steps = showIdeologieScreen
    ? showAgendaScreen
      ? [0, 1, 2, 3, 4, 5, 6, 7, 8, 9]
      : [0, 1, 2, 3, 4, 5, 6, 7]
    : showParteiScreen
      ? showAgendaScreen
        ? [0, 1, 3, 4, 5, 6, 7, 8]
        : [0, 1, 3, 4, 5, 6, 7]
      : showAgendaScreen
        ? [3, 4, 5, 6, 7, 8]
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

        {/* SMA-503: Legislatur-Agenda (Stufe 2+) */}
        {showAgendaScreen && beat === agendaBeat && (
          <div className={styles.beatAgenda}>
            <h1 className={styles.agendaTitle}>{t('game:onboarding.agendaTitle')}</h1>
            <p className={styles.agendaSubtitle}>{t('game:onboarding.agendaSubtitle')}</p>
            <p className={styles.agendaHint}>
              {t('game:onboarding.agendaPickHint', {
                count: spielerZielAnzahl,
                current: gewaehlteAgendaIds.length,
              })}
            </p>
            <div className={styles.agendaScroll}>
              {AGENDA_KATEGORIE_ORDER.map((kat) => {
                const goals = zielPoolNachKategorie.get(kat);
                if (!goals?.length) return null;
                return (
                  <section key={kat} className={styles.agendaCategory}>
                    <h2 className={styles.agendaCategoryTitle}>
                      {t(`game:onboarding.agendaKategorie.${kat}`)}
                    </h2>
                    <ul className={styles.agendaGoalList}>
                      {goals.map((z) => {
                        const selected = gewaehlteAgendaIds.includes(z.id);
                        const atCap = !selected && gewaehlteAgendaIds.length >= spielerZielAnzahl;
                        return (
                          <li key={z.id}>
                            <button
                              type="button"
                              className={`${styles.agendaGoalRow} ${selected ? styles.agendaGoalRowSelected : ''} ${atCap ? styles.agendaGoalRowDisabled : ''}`}
                              onClick={() => !atCap && toggleAgendaZiel(z.id)}
                              disabled={atCap}
                              aria-pressed={selected}
                            >
                              <span className={styles.agendaGoalCheck} aria-hidden>
                                {selected ? '✓' : ''}
                              </span>
                              <span className={styles.agendaGoalBody}>
                                <span className={styles.agendaGoalTitel}>{z.titel}</span>
                                {z.beschreibung ? (
                                  <p className={styles.agendaGoalBeschreibung}>{z.beschreibung}</p>
                                ) : null}
                              </span>
                            </button>
                          </li>
                        );
                      })}
                    </ul>
                  </section>
                );
              })}
            </div>
            {koalitionsZieleAnzeige.length > 0 && (
              <div className={styles.agendaKoalitionBlock}>
                <h3 className={styles.agendaKoalitionTitle}>
                  <span className={styles.agendaKoalitionIcon} aria-hidden>
                    ✦
                  </span>
                  {t('game:onboarding.agendaKoalitionTitle')}
                </h3>
                <ul className={styles.agendaKoalitionList}>
                  {koalitionsZieleAnzeige.map((z) => (
                    <li key={z.id} className={styles.agendaKoalitionItem}>
                      <strong>{z.titel}</strong>
                      {z.beschreibung ? ` — ${z.beschreibung}` : ''}
                    </li>
                  ))}
                </ul>
              </div>
            )}
            <button
              type="button"
              className={styles.weiter}
              onClick={() => void handleAgendaBestaetigen()}
              disabled={gewaehlteAgendaIds.length !== spielerZielAnzahl || agendaSubmitting}
            >
              {agendaSubmitting ? t('game:onboarding.agendaSaving') : t('game:onboarding.agendaConfirm')}
            </button>
          </div>
        )}

        {/* Internes Memo */}
        {beat === memoBeat && (
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

        {/* Koalitionsvertrag-Übersicht */}
        {beat === kvBeat && (
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

        {/* Call to Action */}
        {beat === ctaBeat && (
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
