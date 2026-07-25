/**
 * Medienklima: Spieler-Aktionen (Pressemitteilung, gezielte Medien-Aktionen SMA-392/393).
 * Extrahiert aus medienklima.ts (#235). Akteur-State/Index siehe medienAkteure.ts.
 */
import type { GameState, ContentBundle } from '../../types';
import { DEFAULT_MEDIEN_AKTEURE } from '../../../data/defaults/medienAkteure';
import { addLog } from '../../engine';
import { featureActive } from '../features';
import { verbrauchePK } from '../../pk';
import { clamp } from '../../constants';
import {
  REAKTIONEN,
  berechneMedianklima,
  adjustMedienKlimaGlobal,
  getAkteurDefinitions,
  activeMedienAkteurIds,
  mergeMedienAkteureState,
  expireMedienAkteurBuffs,
  mergeStimmungsBuff,
} from './medienAkteure';

/** SMA-392: Spieler-Medien-Aktionen (Cooldown-Schlüssel in medienAktionenGenutzt) */
export type MedienSpielerAktionKey =
  | 'oeffentlich_talkshow'
  | 'boulevard_interview'
  | 'social_kampagne'
  | 'qualitaet_gespraech';

/** SMA-393: Ergebnis von doMedienAktion für UI-Toasts (keine Spiel-Logik) */
export type MedienAktionErgebnis =
  | { ok: true; aktion: MedienSpielerAktionKey; pkKosten: number; backlash?: boolean }
  | { ok: false; reason: 'cooldown' | 'nicht_verfuegbar' };

const MEDIEN_AKTION_COOLDOWN_MONATE = 3;

/**
 * SMA-393: Milieu-IDs, auf die ÖR-Talkshow wirkt — nur in der aktuellen Komplexitätsstufe
 * sichtbare Milieus (min_complexity), analog zu initGameState / MediaView.
 * Stufe 1: leer (aggregierte Ansicht ohne Einzel-Milieus).
 */
export function getAktiveMilieusFuerTalkshow(complexity: number, content: ContentBundle): string[] {
  if (!featureActive(complexity, 'milieus_4')) return [];
  const list = content.milieus?.length ? content.milieus : [];
  return list.filter((m) => m.min_complexity <= complexity).map((m) => m.id);
}

/** Cooldown: 1× pro 3 Monate je Aktion (SMA-392) */
export function medienAktionCooldownVerbleibend(
  state: GameState,
  aktionKey: string,
  cooldownMonate: number = MEDIEN_AKTION_COOLDOWN_MONATE,
): number {
  const letzte = state.medienAktionenGenutzt?.[aktionKey] ?? 0;
  const vergangen = state.month - letzte;
  return Math.max(0, cooldownMonate - vergangen);
}

export function kannMedienAktionNutzen(state: GameState, aktionKey: string): boolean {
  return medienAktionCooldownVerbleibend(state, aktionKey) === 0;
}

/** Pressemitteilung (Spieler-Aktion): 1× pro Monat, 5 PK */
export function pressemitteilung(
  state: GameState,
  thema: 'haushalt' | 'koalition' | 'politikfeld' | 'opposition',
  complexity: number,
  content?: ContentBundle,
): GameState | null {
  if (!featureActive(complexity, 'pressemitteilung')) return null;
  if (state.letztesPressemitteilungMonat === state.month) return null;

  const pkResult = verbrauchePK(state, 5);
  if (!pkResult) return null;

  let s = pkResult;
  const bundle = content ?? ({ medienAkteureContent: DEFAULT_MEDIEN_AKTEURE } as ContentBundle);

  if (featureActive(complexity, 'medien_akteure_2')) {
    s = { ...s, medienAkteure: mergeMedienAkteureState(s.medienAkteure, bundle, complexity) };
    const mkVorher = berechneMedianklima(s);
    const wirkung = mkVorher < 30 ? 0.5 : 1.0;
    const legacyPresseDelta: Record<typeof thema, number> = {
      haushalt: 4,
      koalition: 3,
      politikfeld: 3,
      opposition: 5,
    };
    const zielMk = Math.min(100, mkVorher + Math.round(legacyPresseDelta[thema] * wirkung));
    const defs = getAkteurDefinitions(bundle);
    const active = activeMedienAkteurIds(complexity, defs);
    const row = REAKTIONEN.pressemitteilung;
    const ma = { ...s.medienAkteure! };
    for (const id of active) {
      const cur = ma[id];
      if (!cur) continue;
      const d = row[id as keyof typeof row];
      if (d == null) continue;
      const adj = Math.round(d * wirkung);
      ma[id] = { ...cur, stimmung: clamp(cur.stimmung + adj, -100, 100) };
    }
    s = { ...s, medienAkteure: ma, medienKlima: berechneMedianklima({ ...s, medienAkteure: ma }) };
    const mkNachAkteure = s.medienKlima ?? 55;
    const fehlend = zielMk - mkNachAkteure;
    if (Math.abs(fehlend) >= 0.01) {
      s = adjustMedienKlimaGlobal(s, fehlend, complexity, bundle);
    }
    s = {
      ...s,
      medienAktionenGenutzt: {
        ...(s.medienAktionenGenutzt ?? {}),
        ...(featureActive(complexity, 'medien_akteure_4') ? { alternativ: s.month } : {}),
      },
    };
  } else {
    const wirkung = (s.medienKlima ?? 55) < 30 ? 0.5 : 1.0;
    const mk = s.medienKlima ?? 55;
    switch (thema) {
      case 'haushalt':
        s = {
          ...s,
          medienKlima: Math.min(100, mk + Math.round(4 * wirkung)),
          chars: s.chars.map((c) =>
            c.id === 'fm' ? { ...c, mood: Math.min(4, c.mood + 1) } : c,
          ),
        };
        break;
      case 'koalition':
        s = {
          ...s,
          medienKlima: Math.min(100, mk + Math.round(3 * wirkung)),
          koalitionspartner: s.koalitionspartner
            ? { ...s.koalitionspartner, beziehung: Math.min(100, s.koalitionspartner.beziehung + 5) }
            : s.koalitionspartner,
        };
        break;
      case 'politikfeld':
        s = { ...s, medienKlima: Math.min(100, mk + Math.round(3 * wirkung)) };
        break;
      case 'opposition':
        s = {
          ...s,
          medienKlima: Math.min(100, mk + Math.round(5 * wirkung)),
          opposition: s.opposition
            ? { ...s.opposition, staerke: Math.max(0, s.opposition.staerke - 5) }
            : s.opposition,
        };
        break;
    }
  }

  // Thema-spezifische Zusatz-Effekte (wie zuvor)
  if (featureActive(complexity, 'medien_akteure_2')) {
    switch (thema) {
      case 'haushalt':
        s = {
          ...s,
          chars: s.chars.map((c) =>
            c.id === 'fm' ? { ...c, mood: Math.min(4, c.mood + 1) } : c,
          ),
        };
        break;
      case 'koalition':
        s = {
          ...s,
          koalitionspartner: s.koalitionspartner
            ? { ...s.koalitionspartner, beziehung: Math.min(100, s.koalitionspartner.beziehung + 5) }
            : s.koalitionspartner,
        };
        break;
      case 'opposition':
        s = {
          ...s,
          opposition: s.opposition
            ? { ...s.opposition, staerke: Math.max(0, s.opposition.staerke - 5) }
            : s.opposition,
        };
        break;
      default:
        break;
    }
  }

  s = { ...s, letztesPressemitteilungMonat: s.month };
  return addLog(s, `Pressemitteilung: ${thema}`, 'hi');
}

/**
 * SMA-392: gezielte Medien-Aktionen (Stufe 3+), Cooldown 3 Monate je Aktion.
 * `alternativ_diversifizieren` nur Stufe 4+.
 * SMA-393: Rückgabe enthält `outcome` für UI-Toasts; bei Cooldown bleibt der State unverändert.
 */
export function doMedienAktion(
  state: GameState,
  aktion: MedienSpielerAktionKey,
  complexity: number,
  content: ContentBundle,
  rng: () => number = Math.random,
): { state: GameState; outcome: MedienAktionErgebnis } | null {
  if (!featureActive(complexity, 'medien_akteure_3')) return null;
  if (!kannMedienAktionNutzen(state, aktion)) {
    return { state, outcome: { ok: false, reason: 'cooldown' } };
  }

  const bundle = content.medienAkteureContent?.length ? content : ({ medienAkteureContent: DEFAULT_MEDIEN_AKTEURE } as ContentBundle);
  let s = expireMedienAkteurBuffs({ ...state }, state.month);
  s = { ...s, medienAkteure: mergeMedienAkteureState(s.medienAkteure, bundle, complexity) };

  const defs = getAkteurDefinitions(bundle);
  const active = new Set(activeMedienAkteurIds(complexity, defs));

  const applyBuff = (id: string, dSt: number, monate: number) => {
    if (!active.has(id) || !s.medienAkteure?.[id]) return;
    const buffs = { ...(s.medienAkteurBuffs ?? {}) };
    buffs[id] = mergeStimmungsBuff(buffs[id], s.month, dSt, monate);
    s = { ...s, medienAkteurBuffs: buffs };
  };

  const addBaseStimmung = (id: string, d: number) => {
    if (!active.has(id) || !s.medienAkteure?.[id]) return;
    const cur = s.medienAkteure![id]!;
    const ma = { ...s.medienAkteure!, [id]: { ...cur, stimmung: clamp(cur.stimmung + d, -100, 100) } };
    s = { ...s, medienAkteure: ma };
  };

  if (aktion === 'oeffentlich_talkshow') {
    const pkResult = verbrauchePK(s, 10);
    if (!pkResult) return null;
    s = pkResult;
    addBaseStimmung('oeffentlich', 5);
    const milieuZustimmung = { ...(s.milieuZustimmung ?? {}) };
    const milieuIds = getAktiveMilieusFuerTalkshow(complexity, content);
    for (const id of milieuIds) {
      milieuZustimmung[id] = clamp((milieuZustimmung[id] ?? 50) + 1, 0, 100);
    }
    s = { ...s, milieuZustimmung };
    s = {
      ...s,
      medienAktionenGenutzt: { ...(s.medienAktionenGenutzt ?? {}), oeffentlich_talkshow: s.month },
      medienKlima: berechneMedianklima(s),
    };
    return {
      state: addLog(s, 'Medien-Aktion: ÖR-Talkshow', 'hi'),
      outcome: { ok: true, aktion: 'oeffentlich_talkshow', pkKosten: 10 },
    };
  }

  if (aktion === 'boulevard_interview') {
    const pkResult = verbrauchePK(s, 15);
    if (!pkResult) return null;
    s = pkResult;
    applyBuff('boulevard', 10, 2);
    addBaseStimmung('qualitaet', -3);
    s = {
      ...s,
      medienAktionenGenutzt: { ...(s.medienAktionenGenutzt ?? {}), boulevard_interview: s.month },
      medienKlima: berechneMedianklima(s),
    };
    return {
      state: addLog(s, 'Medien-Aktion: Boulevard-Interview', 'hi'),
      outcome: { ok: true, aktion: 'boulevard_interview', pkKosten: 15 },
    };
  }

  if (aktion === 'social_kampagne') {
    const pkResult = verbrauchePK(s, 20);
    if (!pkResult) return null;
    s = pkResult;
    if (rng() < 0.15) {
      addBaseStimmung('social', -20);
      s = {
        ...s,
        medienAktionenGenutzt: { ...(s.medienAktionenGenutzt ?? {}), social_kampagne: s.month },
        medienKlima: berechneMedianklima(s),
      };
      return {
        state: addLog(s, 'Social-Media-Kampagne: Gegenwind (Backlash)', 'r'),
        outcome: { ok: true, aktion: 'social_kampagne', pkKosten: 20, backlash: true },
      };
    }
    applyBuff('social', 15, 1);
    s = {
      ...s,
      medienAktionenGenutzt: { ...(s.medienAktionenGenutzt ?? {}), social_kampagne: s.month },
      medienKlima: berechneMedianklima(s),
    };
    return {
      state: addLog(s, 'Medien-Aktion: Social-Media-Kampagne', 'hi'),
      outcome: { ok: true, aktion: 'social_kampagne', pkKosten: 20 },
    };
  }

  if (aktion === 'qualitaet_gespraech') {
    const saldo = s.haushalt?.saldo ?? 0;
    if (saldo <= -25) return null;
    if (!active.has('qualitaet')) return null;
    const pkResult = verbrauchePK(s, 15);
    if (!pkResult) return null;
    s = pkResult;
    addBaseStimmung('qualitaet', 8);
    const milieuZustimmung = { ...(s.milieuZustimmung ?? {}) };
    milieuZustimmung['etablierte'] = clamp((milieuZustimmung['etablierte'] ?? 50) + 3, 0, 100);
    s = {
      ...s,
      milieuZustimmung,
      medienAktionenGenutzt: { ...(s.medienAktionenGenutzt ?? {}), qualitaet_gespraech: s.month },
      medienKlima: berechneMedianklima({ ...s, milieuZustimmung }),
    };
    return {
      state: addLog(s, 'Medien-Aktion: Qualitätspresse-Gespräch', 'hi'),
      outcome: { ok: true, aktion: 'qualitaet_gespraech', pkKosten: 15 },
    };
  }

  return null;
}
