/**
 * Medienklima-Engine (SMA-277, SMA-390 plurale Akteure) — Akteur-State & Index-Berechnung.
 * Extrahiert aus medienklima.ts (#235): dieser Teil verwaltet die Akteur-Stimmungen/-Reichweiten
 * und den daraus berechneten Medienklima-Index. Event-/Skandal-Logik siehe medienEvents.ts,
 * Spieler-Aktionen siehe medienAktionen.ts, Framing siehe framing.ts.
 */
import type { GameState, ContentBundle, MedienAkteurBuffState } from '../../types';
import { DEFAULT_MEDIEN_AKTEURE, type MedienAkteurContent } from '../../../data/defaults/medienAkteure';
import { featureActive } from '../features';
import { clamp } from '../../constants';

/** SMA-409: Index 0–100 ganzzahlig für State, Historie und Anzeige (keine Float-Artefakte). */
export function roundMedienKlimaIndex(v: number): number {
  return Math.round(clamp(v, 0, 100));
}

/** Reaktionsdeltas je Akteur (Stimmung, Skandal: alternativ +3 Reichweite zusätzlich) */
export const REAKTIONEN = {
  pressemitteilung: {
    oeffentlich: 3,
    boulevard: 1,
    qualitaet: 2,
    social: 0,
    konservativ: 1,
    alternativ: -1,
  },
  skandal: {
    oeffentlich: -5,
    boulevard: -15,
    qualitaet: -8,
    social: -20,
    konservativ: -3,
    alternativ: 3,
  },
  gesetz_progressiv: {
    oeffentlich: 2,
    boulevard: 0,
    qualitaet: -1,
    social: 3,
    konservativ: -5,
    alternativ: -2,
  },
  gesetz_konservativ: {
    oeffentlich: 1,
    boulevard: 1,
    qualitaet: 3,
    social: -2,
    konservativ: 8,
    alternativ: -1,
  },
  haushalt_krise: {
    oeffentlich: -3,
    boulevard: -5,
    qualitaet: -10,
    social: -3,
    konservativ: -3,
    alternativ: 2,
  },
} as const;

export type ReaktionsKey = keyof typeof REAKTIONEN;

/** Effektive Stimmung inkl. ablaufender Buffs (nur für Index / UI) */
export function effektiveMedienAkteurStimmung(
  akteurId: string,
  base: { stimmung: number; reichweite: number },
  buffs: GameState['medienAkteurBuffs'],
  month: number,
): number {
  const b = buffs?.[akteurId];
  const extra = b && b.bisMonat >= month ? b.stimmung : 0;
  return clamp(base.stimmung + extra, -100, 100);
}

export function expireMedienAkteurBuffs(state: GameState, month: number): GameState {
  const raw = state.medienAkteurBuffs;
  if (!raw || Object.keys(raw).length === 0) return state;
  const next: Record<string, MedienAkteurBuffState> = { ...raw };
  for (const [id, b] of Object.entries(next)) {
    if (b.bisMonat < month) delete next[id];
  }
  if (Object.keys(next).length === 0) {
    const { medienAkteurBuffs: _, ...rest } = state;
    return rest as GameState;
  }
  return { ...state, medienAkteurBuffs: next };
}

export function getAkteurDefinitions(content: ContentBundle): MedienAkteurContent[] {
  return content.medienAkteureContent?.length ? content.medienAkteureContent : DEFAULT_MEDIEN_AKTEURE;
}

/** Aktive Akteur-IDs für diese Komplexitätsstufe */
export function activeMedienAkteurIds(complexity: number, defs: MedienAkteurContent[]): string[] {
  return defs.filter((d) => d.min_complexity <= complexity).map((d) => d.id);
}

/** Initialisiert Record aus Content-Definitionen (nur aktive Stufe) */
export function initMedienAkteureFromContent(content: ContentBundle, complexity: number): Record<string, { stimmung: number; reichweite: number }> {
  const defs = getAkteurDefinitions(content);
  const out: Record<string, { stimmung: number; reichweite: number }> = {};
  for (const d of defs) {
    if (d.min_complexity <= complexity) {
      out[d.id] = { stimmung: clamp(d.stimmung_start, -100, 100), reichweite: clamp(d.reichweite, 0, 100) };
    }
  }
  return out;
}

/** Stimmen so verschieben, dass berechneMedianklima dem Ziel entspricht (ohne Alternativ-Malus zu ändern). */
export function kalibriereMedienAkteureZuIndex(
  medienAkteure: NonNullable<GameState['medienAkteure']>,
  content: ContentBundle,
  complexity: number,
  zielIndex: number,
): NonNullable<GameState['medienAkteure']> {
  const defs = getAkteurDefinitions(content).filter((d) => d.min_complexity <= complexity);
  const ma = { ...medienAkteure };
  const totalR = defs.reduce((sum, d) => sum + (ma[d.id]?.reichweite ?? 0), 0);
  if (totalR <= 0) return ma;
  const s0 = defs.reduce(
    (sum, d) => sum + ((ma[d.id]?.stimmung ?? 0) * (ma[d.id]?.reichweite ?? 0)) / 100,
    0,
  );
  const targetS = 2 * (clamp(zielIndex, 0, 100) - 50);
  const h = (targetS - s0) / (totalR / 100);
  for (const d of defs) {
    const cur = ma[d.id];
    if (!cur) continue;
    ma[d.id] = { ...cur, stimmung: clamp(cur.stimmung + h, -100, 100) };
  }
  return ma;
}

/** Ergänzt fehlende Akteure (Save-Migration / Stufenaufstieg) */
export function mergeMedienAkteureState(
  current: GameState['medienAkteure'],
  content: ContentBundle,
  complexity: number,
): NonNullable<GameState['medienAkteure']> {
  const defs = getAkteurDefinitions(content);
  const next: NonNullable<GameState['medienAkteure']> = { ...(current ?? {}) };
  for (const d of defs) {
    if (d.min_complexity > complexity) continue;
    if (!next[d.id]) {
      next[d.id] = { stimmung: clamp(d.stimmung_start, -100, 100), reichweite: clamp(d.reichweite, 0, 100) };
    }
  }
  return next;
}

/**
 * SMA-390: gewichteter Medienindex aus Akteur-Stimmungen und Reichweiten.
 * Alternativ > 10 % Reichweite: permanenter Malus −5 auf den Index.
 */
export function berechneMedianklima(G: GameState): number {
  const akteure = G.medienAkteure;
  if (!akteure || Object.keys(akteure).length === 0) {
    return roundMedienKlimaIndex(G.medienKlima ?? 55);
  }
  const buffs = G.medienAkteurBuffs;
  const month = G.month;
  const gewichteteSumme = Object.entries(akteure).reduce((sum, [id, a]) => {
    const st = effektiveMedienAkteurStimmung(id, a, buffs, month);
    return sum + (st * a.reichweite) / 100;
  }, 0);
  let v = 50 + gewichteteSumme / 2;
  const altR = akteure.alternativ?.reichweite ?? 0;
  if (altR > 10) v -= 5;
  return roundMedienKlimaIndex(v);
}

/**
 * Globales Medienklima-Delta auf Stufe 2+ auf Akteur-Stimmungen verteilen
 * (gleicher Anstieg des gewichteten Terms wie direktes Ändern des Index).
 */
export function adjustMedienKlimaGlobal(
  state: GameState,
  delta: number,
  complexity: number,
  content?: ContentBundle,
): GameState {
  if (!featureActive(complexity, 'medien_akteure_2')) {
    return { ...state, medienKlima: clamp((state.medienKlima ?? 55) + delta, 0, 100) };
  }
  const bundle: ContentBundle = content ?? { medienAkteureContent: DEFAULT_MEDIEN_AKTEURE } as ContentBundle;
  let ma = mergeMedienAkteureState(state.medienAkteure, bundle, complexity);
  const defs = getAkteurDefinitions(bundle);
  const active = activeMedienAkteurIds(complexity, defs);
  const totalW = active.reduce((sum, id) => sum + (ma[id]?.reichweite ?? 0), 0);
  if (totalW <= 0 || active.length === 0) {
    return { ...state, medienKlima: clamp((state.medienKlima ?? 55) + delta, 0, 100) };
  }
  // Abgleich mit gespeichertem Index (ältere Saves / Events ohne Akteur-State)
  const zielVorDelta = state.medienKlima ?? berechneMedianklima({ ...state, medienAkteure: ma });
  ma = kalibriereMedienAkteureZuIndex(ma, bundle, complexity, zielVorDelta);
  const ds = (2 * delta * 100) / totalW;
  for (const id of active) {
    const cur = ma[id]!;
    ma = { ...ma, [id]: { ...cur, stimmung: clamp(cur.stimmung + ds, -100, 100) } };
  }
  const mk = berechneMedianklima({ ...state, medienAkteure: ma });
  return { ...state, medienAkteure: ma, medienKlima: mk };
}

export function applyAkteurReaktion(
  state: GameState,
  key: ReaktionsKey,
  complexity: number,
  content: ContentBundle,
  options?: { skandalAlternativReichweitePlus?: number },
): GameState {
  if (!featureActive(complexity, 'medien_akteure_2')) return state;

  const defs = getAkteurDefinitions(content);
  const active = new Set(activeMedienAkteurIds(complexity, defs));
  let ma = mergeMedienAkteureState(state.medienAkteure, content, complexity);
  const row = REAKTIONEN[key];

  for (const id of active) {
    const dSt = row[id as keyof typeof row];
    if (dSt == null) continue;
    const cur = ma[id];
    if (!cur) continue;
    let reichweite = cur.reichweite;
    if (key === 'skandal' && id === 'alternativ' && options?.skandalAlternativReichweitePlus) {
      reichweite = clamp(reichweite + options.skandalAlternativReichweitePlus, 0, 15);
    }
    ma = {
      ...ma,
      [id]: { stimmung: clamp(cur.stimmung + dSt, -100, 100), reichweite },
    };
  }

  const next = { ...state, medienAkteure: ma };
  return { ...next, medienKlima: berechneMedianklima(next) };
}

export function tickAlternativReichweite(state: GameState, complexity: number, content: ContentBundle): GameState {
  if (!featureActive(complexity, 'medien_akteure_4')) return state;
  const defs = getAkteurDefinitions(content);
  if (!activeMedienAkteurIds(complexity, defs).includes('alternativ')) return state;

  let ma = mergeMedienAkteureState(state.medienAkteure, content, complexity);
  const alt = ma.alternativ;
  if (!alt) return state;

  const genutzt = state.medienAktionenGenutzt?.alternativ ?? 0;
  const ignored = genutzt < state.month;
  if (!ignored) return state;

  const newR = clamp(alt.reichweite + 1, 0, 15);
  if (newR === alt.reichweite) return state;

  ma = { ...ma, alternativ: { ...alt, reichweite: newR } };
  const next = { ...state, medienAkteure: ma };
  return { ...next, medienKlima: berechneMedianklima(next) };
}

export function mergeStimmungsBuff(
  prev: MedienAkteurBuffState | undefined,
  month: number,
  deltaStimmung: number,
  dauerMonate: number,
): MedienAkteurBuffState {
  const basis = prev && prev.bisMonat >= month ? prev.stimmung : 0;
  return {
    stimmung: basis + deltaStimmung,
    bisMonat: Math.max(prev && prev.bisMonat >= month ? prev.bisMonat : month - 1, month + dauerMonate - 1),
  };
}

/** Medienklima-Multiplikator: moduliert KPI-/Milieu-Effekte (linear: 0→0.7, 50→1.0, 100→1.3) */
export function getMedienMultiplikator(medienKlima: number): number {
  const clamped = Math.max(0, Math.min(100, medienKlima));
  return +(0.7 + (clamped / 100) * 0.6).toFixed(4);
}

/** Zusätzliche PK-Kosten bei schlechtem Medienklima (< 20) */
export function getMedienPkZusatzkosten(medienKlima: number): number {
  return medienKlima < 20 ? 3 : 0;
}
