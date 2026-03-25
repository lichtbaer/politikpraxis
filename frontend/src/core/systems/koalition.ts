import type { GameState, Ideologie, KoalitionspartnerContent, KoalitionspartnerParteiId, SpielerParteiState } from '../types';
import { addLog } from '../engine';
import { withPause, getAutoPauseLevel } from '../eventPause';
import { verbrauchePK } from '../pk';
import { featureActive } from './features';
import { applyMoodChange } from './characters';
import { scheduleEffects } from './economy';
import { berechneKongruenz } from '../ideologie';
import {
  ALLE_PARTEIEN,
  GRUENE,
  MILIEU_NAMES,
  VERBAND_KURZ,
  buildKoalitionspartnerContent,
} from '../../data/defaults/koalitionspartner';
import type { SpielerParteiId } from '../../data/defaults/parteien';

/** SMA-299: Berechnet Koalitionspartner aus Ideologie-Distanz (niedrigste Distanz = nächster Partner) */
export function berechneKoalitionspartner(
  spielerParteiId: SpielerParteiId,
  spielerIdeologie: Ideologie,
): KoalitionspartnerParteiId {
  const kandidaten = ALLE_PARTEIEN.filter((p) => p.id !== spielerParteiId);
  const mitDistanz = kandidaten.map((p) => ({
    partei: p,
    distanz: 100 - berechneKongruenz(spielerIdeologie, p.ideologie),
  }));
  mitDistanz.sort((a, b) => a.distanz - b.distanz);
  return mitDistanz[0].partei.id;
}

/** Milieu-ID zu zust-Feld (Approval) */
const MILIEU_TO_ZUST: Record<string, keyof GameState['zust']> = {
  postmaterielle: 'prog',
  soziale_mitte: 'mitte',
  arbeit: 'arbeit',
};

/** Holt Koalitionspartner-Content (SMA-299: dynamisch aus State wenn vorhanden) */
export function getKoalitionspartner(
  content?: { koalitionspartner?: KoalitionspartnerContent },
  state?: { koalitionspartner?: { id: KoalitionspartnerParteiId }; spielerPartei?: SpielerParteiState },
): KoalitionspartnerContent {
  if (state?.koalitionspartner?.id && state?.spielerPartei?.id) {
    return buildKoalitionspartnerContent(state.koalitionspartner.id, state.spielerPartei.id);
  }
  return content?.koalitionspartner ?? GRUENE;
}

/** Holt Milieu-Zustimmung aus State (aus zust abgeleitet wenn milieuZustimmung fehlt) */
function getMilieuZustimmung(state: GameState, milieuId: string): number {
  const explicit = state.milieuZustimmung?.[milieuId];
  if (explicit != null) return explicit;
  const zustKey = MILIEU_TO_ZUST[milieuId];
  if (zustKey && state.zust) return state.zust[zustKey] ?? 50;
  return 50;
}

/** Holt Verbands-Beziehung */
function getVerbandsBeziehung(state: GameState, verbandId: string): number {
  return state.verbandsBeziehungen?.[verbandId] ?? 50;
}

/** Holt Milieu-Namen für Log */
function getMilieuName(milieuId: string): string {
  return MILIEU_NAMES[milieuId] ?? milieuId;
}

/** Holt Verband-Kurzbezeichnung */
function getVerbandKurz(verbandId: string): string {
  return VERBAND_KURZ[verbandId] ?? verbandId;
}

/** Berechnet Koalitionsvertrag-Profil (60% Spieler, 40% Partner) */
export function berechneKoalitionsvertragProfil(
  spielerAusrichtung: Ideologie,
  partner: KoalitionspartnerContent,
): Ideologie {
  return {
    wirtschaft: Math.round(spielerAusrichtung.wirtschaft * 0.6 + partner.ideologie.wirtschaft * 0.4),
    gesellschaft: Math.round(spielerAusrichtung.gesellschaft * 0.6 + partner.ideologie.gesellschaft * 0.4),
    staat: Math.round(spielerAusrichtung.staat * 0.6 + partner.ideologie.staat * 0.4),
  };
}

/** Default-Ideologie für Gesetze ohne explizite ideologie (ee, bp, wb etc.) */
const GESETZ_IDEOLOGIE: Record<string, Ideologie> = {
  ee: { wirtschaft: -30, gesellschaft: -60, staat: -20 },
  bp: { wirtschaft: -50, gesellschaft: -40, staat: -30 },
  wb: { wirtschaft: -45, gesellschaft: -35, staat: -25 },
};

/** SMA-307: Exportiert für dynamische BT-Stimmen-Berechnung */
export function getGesetzIdeologie(law: { id: string; ideologie?: Ideologie }): Ideologie {
  return law.ideologie ?? GESETZ_IDEOLOGIE[law.id] ?? { wirtschaft: 0, gesellschaft: 0, staat: 0 };
}

/** Koalitionsvertrag-Score nach Gesetzesbeschluss aktualisieren (Stufe 4) */
export function updateKoalitionsvertragScore(
  state: GameState,
  gesetzId: string,
  content: { koalitionspartner?: KoalitionspartnerContent },
  complexity: number,
): GameState {
  if (!state.koalitionspartner) return state;

  let kp = { ...state.koalitionspartner };
  let next = state;

  // Schlüsselthemen-Tracker (Stufe 2+): prüfe ob beschlossenes Gesetz ein Schlüsselthema erfüllt
  if (featureActive(complexity, 'koalitionsvertrag_tracker')) {
    const partner = getKoalitionspartner(content, state);
    const law = state.gesetze.find(g => g.id === gesetzId);
    if (law && partner.schluesselthemen?.length) {
      const erfuellt = kp.schluesselthemenErfuellt ?? [];
      for (const thema of partner.schluesselthemen) {
        if (erfuellt.includes(thema)) continue;
        // Thema erfüllt wenn: Gesetz-ID = Thema ODER Gesetz-Politikfeld = Thema
        if (gesetzId === thema || law.politikfeldId === thema) {
          kp = {
            ...kp,
            schluesselthemenErfuellt: [...erfuellt, thema],
            beziehung: Math.min(100, kp.beziehung + 5),
          };
          next = addLog(
            next,
            `Koalitionsvertrag: Schlüsselthema „${thema}" erfüllt — Beziehung +5`,
            'g',
          );
        }
      }
    }
  }

  // Kongruenz-Score (Stufe 4)
  if (featureActive(complexity, 'koalitionsvertrag_score') && state.koalitionsvertragProfil) {
    const law = state.gesetze.find(g => g.id === gesetzId);
    if (law) {
      const gesetzIdeologie = getGesetzIdeologie(law);
      const score = berechneKongruenz(state.koalitionsvertragProfil, gesetzIdeologie);
      if (score < 30) {
        kp = { ...kp, koalitionsvertragScore: Math.min(100, kp.koalitionsvertragScore + 5) };
      } else if (score > 70) {
        kp = { ...kp, koalitionsvertragScore: Math.max(0, kp.koalitionsvertragScore - 5) };
      }
    }
  }

  return { ...next, koalitionspartner: kp };
}

/** Koalitionspartner-Tick (monatlich) */
export function tickKoalitionspartner(
  state: GameState,
  content: { koalitionspartner?: KoalitionspartnerContent; charEvents?: Record<string, import('../types').GameEvent> },
  complexity: number,
): GameState {
  if (!featureActive(complexity, 'koalitionspartner')) return state;
  const kp = state.koalitionspartner;
  if (!kp) return state;

  const partner = getKoalitionspartner(content, state);
  let next: GameState = { ...state, koalitionspartner: { ...kp } };

  // Score regeneriert -2/Monat (Stufe 4)
  if (featureActive(complexity, 'koalitionsvertrag_score')) {
    next.koalitionspartner!.koalitionsvertragScore = Math.max(
      0,
      next.koalitionspartner!.koalitionsvertragScore - 2,
    );
  }

  // Milieu-Alarm: Kernmilieus des Partners prüfen
  for (const milieuId of partner.kernmilieus) {
    const zustimmung = getMilieuZustimmung(state, milieuId);
    const eventKey = `milieu_alarm_${milieuId}`;
    if (zustimmung < 35 && !state.firedEvents.includes(eventKey)) {
      const kpNext = next.koalitionspartner!;
      next = {
        ...next,
        koalitionspartner: { ...kpNext, beziehung: Math.max(0, kpNext.beziehung - 8) },
        firedEvents: [...next.firedEvents, eventKey],
      };
      next = addLog(
        next,
        `${partner.name}: Unzufriedenheit bei ${getMilieuName(milieuId)} wächst.`,
        'r',
      );
    }
  }

  // Verbands-Veto: Kernverbände prüfen
  for (const verbandId of partner.kernverbaende) {
    const bez = getVerbandsBeziehung(state, verbandId);
    if (bez < 20) {
      const kpNext = next.koalitionspartner!;
      next = {
        ...next,
        koalitionspartner: { ...kpNext, beziehung: Math.max(0, kpNext.beziehung - 8) },
      };
      next = addLog(
        next,
        `${partner.name}: ${getVerbandKurz(verbandId)}-Konflikt belastet Koalition.`,
        'r',
      );
    }
  }

  // Koalitionsvertrag-Schlüsselthemen Druck (Stufe 2+, ab Monat 24)
  if (
    featureActive(complexity, 'koalitionsvertrag_tracker') &&
    state.month >= 24
  ) {
    const erfuellt = next.koalitionspartner?.schluesselthemenErfuellt ?? [];
    const gesamt = partner.schluesselthemen?.length ?? 0;
    const erfuellungsQuote = gesamt > 0 ? erfuellt.length / gesamt : 1;
    // Unter 50% Erfüllung ab Monat 24: monatlich -2 Beziehung
    if (erfuellungsQuote < 0.5 && next.koalitionspartner) {
      const kpNext = next.koalitionspartner;
      next = {
        ...next,
        koalitionspartner: {
          ...kpNext,
          beziehung: Math.max(0, kpNext.beziehung - 2),
        },
      };
      // Warnung nur alle 6 Monate
      if (state.month % 6 === 0) {
        next = addLog(
          next,
          `${partner.name}: Koalitionsvertrag wird nicht eingehalten (${erfuellt.length}/${gesamt} Themen)`,
          'r',
        );
      }
    }
  }

  // Koalitionsvertrag-Score Eskalation (Stufe 4)
  const kvScore = next.koalitionspartner?.koalitionsvertragScore ?? 0;
  if (
    featureActive(complexity, 'koalitionsvertrag_score') &&
    kvScore >= 70 &&
    !state.firedEvents.includes('koalitionskrise_warning')
  ) {
    const ev = content.charEvents?.['koalitionskrise_ultimatum'] as import('../types').GameEvent | undefined;
    if (ev) {
      next = {
        ...next,
        activeEvent: ev,
        ...withPause(next, getAutoPauseLevel(ev)),
        firedEvents: [...next.firedEvents, 'koalitionskrise_warning'],
      };
    }
  }

  return next;
}

/** Prüft Koalitionsbruch (Beziehung < 15) und triggert Event oder Spielende */
export function checkKoalitionsbruch(
  state: GameState,
  content: { charEvents?: Record<string, import('../types').GameEvent> },
  complexity: number,
): GameState {
  if (!featureActive(complexity, 'koalitionspartner')) return state;
  if (!state.koalitionspartner || state.activeEvent || state.gameOver) return state;
  if (state.koalitionspartner.beziehung >= 15) {
    if (state.koalitionsbruchSeitMonat != null) {
      return { ...state, koalitionsbruchSeitMonat: undefined };
    }
    return state;
  }

  const seitMonat = state.koalitionsbruchSeitMonat;
  if (seitMonat != null && state.month >= seitMonat + 3) {
    return { ...state, gameOver: true, won: false, speed: 0 };
  }

  if (seitMonat == null) {
    const ev = content.charEvents?.['koalitionsbruch'];
    if (ev) {
      return {
        ...state,
        koalitionsbruchSeitMonat: state.month,
        activeEvent: ev,
        ...withPause(state, getAutoPauseLevel(ev)),
        firedEvents: [...state.firedEvents, 'koalitionsbruch'],
      };
    }
  }

  return state;
}

// --- Spieler-Aktionen ---

/** Koalitionsrunde: 15 PK → +8 Beziehung, Chars mit Partner-Nähe +1 Mood */
export function koalitionsrunde(
  state: GameState,
  _content: { koalitionspartner?: KoalitionspartnerContent },
  complexity: number,
): GameState {
  if (!featureActive(complexity, 'koalitionspartner')) return state;
  const kp = state.koalitionspartner;
  if (!kp) return state;

  const next = verbrauchePK(state, 15);
  if (!next) return state;

  const newBeziehung = Math.min(100, kp.beziehung + 8);
  let result: GameState = {
    ...next,
    koalitionspartner: { ...kp, beziehung: newBeziehung },
  };

  // Chars mit Partner-Nähe (Kongruenz > 60) +1 Mood — vereinfacht: alle Chars +1 wenn mood < 4
  const charMood: Record<string, number> = {};
  for (const c of result.chars) {
    if (c.mood < 4) charMood[c.id] = 1;
  }
  if (Object.keys(charMood).length > 0) {
    result = applyMoodChange(result, charMood);
  }

  return addLog(result, 'Koalitionsrunde — Beziehung +8', 'g');
}

/** Prioritätsgespräch: 20 PK → Partner priorisiert Gesetz für 3 Monate */
export function prioritaetsgespraech(state: GameState, gesetzId: string, complexity: number): GameState {
  if (!featureActive(complexity, 'koalitionspartner')) return state;
  if (!state.koalitionspartner) return state;

  const next = verbrauchePK(state, 20);
  if (!next) return state;

  return addLog(
    {
      ...next,
      partnerPrioGesetz: { gesetzId, bisMonat: next.month + 3 },
    },
    `Prioritätsgespräch: ${gesetzId} für 3 Monate priorisiert`,
    'g',
  );
}

/** Holt Partner-Forderung für Zugeständnis */
function getPartnerForderung(
  content: { koalitionspartner?: KoalitionspartnerContent },
  forderungId: string,
  state?: { koalitionspartner?: { id: KoalitionspartnerParteiId }; spielerPartei?: SpielerParteiState },
) {
  const partner = getKoalitionspartner(content, state);
  return partner.forderungen?.find(f => f.id === forderungId);
}

/** Zugeständnis: 0 PK + KPI-Kosten → +15 Beziehung */
export function koalitionsZugestaendnis(
  state: GameState,
  forderungId: string,
  content: { koalitionspartner?: KoalitionspartnerContent },
  complexity: number,
): GameState {
  if (!featureActive(complexity, 'koalitionspartner')) return state;
  if (!state.koalitionspartner) return state;

  const forderung = getPartnerForderung(content, forderungId, state);
  if (!forderung) return state;

  let next = scheduleEffects(state, {
    effekte: forderung.effekte as Record<string, number>,
    lag: 1,
    kurz: `Zugeständnis: ${forderung.label}`,
  });

  const kp = next.koalitionspartner;
  if (!kp) return next;
  next = {
    ...next,
    koalitionspartner: {
      id: kp.id,
      beziehung: Math.min(100, kp.beziehung + 15),
      koalitionsvertragScore: kp.koalitionsvertragScore,
      schluesselthemenErfuellt: kp.schluesselthemenErfuellt,
    },
  };

  return addLog(next, `Zugeständnis an Koalitionspartner: ${forderung.label} — Beziehung +15`, 'g');
}

