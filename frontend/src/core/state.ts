import type { GameState, ContentBundle, SpielerParteiState } from './types';
import type { Approval } from './types';
import { featureActive } from './systems/features';
import { getKoalitionspartner, berechneKoalitionsvertragProfil } from './systems/koalition';
import { initEUKlima } from './systems/eu';
import { createInitialHaushalt } from './systems/haushalt';
import type { Ausrichtung } from './systems/ausrichtung';
import { recalcApproval } from './systems/economy';
import { berechneKongruenz } from './ideologie';
import {
  PARTEI_GP_BEZIEHUNG_START,
  PARTEI_VERBANDS_BONUS,
  SPIELBARE_PARTEIEN,
  type SpielerParteiId,
} from '../data/defaults/parteien';

/** Milieu → zust-Feld für initiale Zustimmung (SMA-264) */
const MILIEU_TO_ZUST: Record<string, keyof GameState['zust']> = {
  postmaterielle: 'prog',
  soziale_mitte: 'arbeit',
  prekaere: 'arbeit',
  buergerliche_mitte: 'mitte',
  leistungstraeger: 'mitte',
  etablierte: 'mitte',
  traditionelle: 'mitte',
};

/**
 * Erstellt den initialen Spielzustand.
 * @param content Content-Bundle (Chars, Gesetze, Events, …)
 * @param complexity Komplexitätsstufe (1–4). Chars mit min_complexity > complexity werden ausgeblendet.
 * @param ausrichtung Optionale Spieler-Ausrichtung für Koalitionsvertrag-Profil (bei init)
 * @param spielerPartei SMA-289: Gewählte Partei (Stufe 1: SDP default)
 */
export function createInitialState(
  content: ContentBundle,
  complexity: number = 4,
  ausrichtung?: Ausrichtung,
  spielerPartei?: SpielerParteiState,
): GameState {
  const fraktionen = content.bundesratFraktionen ?? [];
  const activeChars = content.characters.filter(
    (c) => (c.min_complexity ?? 1) <= complexity
  );

  const partner = content.koalitionspartner ? getKoalitionspartner(content) : null;
  const hasKoalition = featureActive(complexity, 'koalitionspartner') && partner;

  const parteiId: SpielerParteiId = spielerPartei?.id ?? 'sdp';
  const parteiInfo = SPIELBARE_PARTEIEN.find((p) => p.id === parteiId);
  const spielerParteiState: SpielerParteiState | undefined = parteiInfo
    ? { id: parteiId, kuerzel: parteiInfo.kuerzel, farbe: parteiInfo.farbe, name: parteiInfo.name }
    : undefined;

  const charsWithPartei = activeChars.map((c) => {
    const char = { ...c };
    if (c.id === 'kanzler' && spielerParteiState) {
      char.partei_kuerzel = spielerParteiState.kuerzel;
      char.partei_farbe = spielerParteiState.farbe;
    }
    return char;
  });

  const base: GameState = {
    month: content.scenario.startMonth,
    speed: 0,
    pk: content.scenario.startPK,
    view: 'agenda',

    kpi: { ...content.scenario.startKPI },
    kpiPrev: null,
    zust: { g: 52, arbeit: 58, mitte: 54, prog: 44 },
    coalition: content.scenario.startCoalition,

    chars: charsWithPartei,
    gesetze: content.laws.map(g => ({ ...g, expanded: false, route: null, rprog: 0, rdur: 0, blockiert: null })),
    bundesrat: content.bundesrat.map(b => ({ ...b })),
    bundesratFraktionen: fraktionen.map(f => ({
      ...f,
      tradeoffPool: f.tradeoffPool.map(t => ({ ...t })),
    })),

    activeEvent: null,
    firedEvents: [],
    firedCharEvents: [],
    firedBundesratEvents: [],
    firedKommunalEvents: [],

    pending: [],

    log: [],
    ticker: 'Neue Legislaturperiode. Koalitionsvertrag unterzeichnet.',

    gameOver: false,
    won: false,

    milieuZustimmung: {},
    verbandsBeziehungen: (() => {
      const bez: Record<string, number> = {};
      const bonus = PARTEI_VERBANDS_BONUS[parteiId] ?? {};
      for (const v of content.verbaende ?? []) {
        const base = v.beziehung_start;
        const b = bonus[v.id] ?? 0;
        bez[v.id] = Math.max(0, Math.min(100, base + b));
      }
      return bez;
    })(),
    politikfeldDruck: {},
    politikfeldLetzterBeschluss: {},
    medienKlima: 55,
    opposition: { staerke: 40, aktivesThema: null, letzterAngriff: 0 },
    ...(spielerParteiState && { spielerPartei: spielerParteiState }),
  };

  if (featureActive(complexity, 'milieus_voll') && (content.milieus?.length ?? 0) > 0) {
    const zust = recalcApproval(content.scenario.startKPI, base.zust);
    const spielerIdeologie = ausrichtung ?? { wirtschaft: 0, gesellschaft: 0, staat: 0 };
    const milieuZustimmung: Record<string, number> = {};
    for (const m of content.milieus!) {
      if (m.min_complexity <= complexity) {
        const basis = zust[MILIEU_TO_ZUST[m.id] ?? 'mitte'] ?? 50;
        const kongruenz = berechneKongruenz(spielerIdeologie, m.ideologie ?? { wirtschaft: 0, gesellschaft: 0, staat: 0 });
        const delta = Math.round((kongruenz - 50) / 12.5);
        const clampedDelta = Math.max(-5, Math.min(5, delta));
        milieuZustimmung[m.id] = Math.max(0, Math.min(100, basis + clampedDelta));
      }
    }
    base.milieuZustimmung = milieuZustimmung;
  }

  function applyEUKlimaAndRatsvorsitz(result: GameState): GameState {
    let r = initEUKlima(result, content, complexity);
    if (r.eu && featureActive(complexity, 'eu_ratsvorsitz')) {
      r = {
        ...r,
        eu: { ...r.eu, ratsvorsitzStartMonat: Math.random() < 0.5 ? 6 : 30 },
      };
    }
    return r;
  }

  const gpBeziehungStart = PARTEI_GP_BEZIEHUNG_START[parteiId];

  if (featureActive(complexity, 'haushaltsdebatte')) {
    const withHaushalt = { ...base, haushalt: createInitialHaushalt(base) };
    if (hasKoalition && partner) {
      return applyEUKlimaAndRatsvorsitz({
        ...withHaushalt,
        koalitionspartner: {
          id: partner.id,
          beziehung: gpBeziehungStart,
          koalitionsvertragScore: 0,
          schluesselthemenErfuellt: [],
        },
        koalitionsvertragProfil: berechneKoalitionsvertragProfil(ausrichtung ?? { wirtschaft: 0, gesellschaft: 0, staat: 0 }, partner),
        verbandsBeziehungen: { uvb: 50, bvd: 50, ...withHaushalt.verbandsBeziehungen },
      });
    }
    return applyEUKlimaAndRatsvorsitz(withHaushalt);
  }

  if (hasKoalition && partner) {
    const ideologie = ausrichtung ?? { wirtschaft: 0, gesellschaft: 0, staat: 0 };
    const verbandsBeziehungen = { ...base.verbandsBeziehungen };
    verbandsBeziehungen['uvb'] = 50;
    verbandsBeziehungen['bvd'] = 50;
    return applyEUKlimaAndRatsvorsitz({
      ...base,
      koalitionspartner: {
        id: partner.id,
        beziehung: gpBeziehungStart,
        koalitionsvertragScore: 0,
        schluesselthemenErfuellt: [],
      },
      koalitionsvertragProfil: berechneKoalitionsvertragProfil(ideologie, partner),
      verbandsBeziehungen,
    });
  }

  return applyEUKlimaAndRatsvorsitz(base);
}

/** Maximale Array-Längen für GameState (Schutz vor localStorage-Manipulation) */
const MAX_LOG_ENTRIES = 500;
const MAX_FIRED_EVENTS = 200;
const MAX_PENDING = 100;

/** Erlaubte View- und Speed-Werte */
const VALID_VIEWS = new Set<string>(['agenda', 'eu', 'land', 'kommune', 'medien', 'bundesrat', 'verbaende']);
const VALID_SPEEDS = new Set<number>([0, 1, 2]);

/** Clampt Zahl auf Bereich [min, max] */
function clamp(n: number, min: number, max: number): number {
  if (typeof n !== 'number' || !Number.isFinite(n)) return min;
  return Math.max(min, Math.min(max, n));
}

/** Clampt Record<string, number> Werte auf 0–100 */
function clampRecord0_100(rec: Record<string, number> | null | undefined): Record<string, number> {
  if (!rec || typeof rec !== 'object' || Array.isArray(rec)) return {};
  const out: Record<string, number> = {};
  for (const [k, v] of Object.entries(rec)) {
    if (k === '__proto__' || k === 'constructor' || k === 'prototype') continue;
    if (typeof v === 'number' && Number.isFinite(v)) {
      out[k] = clamp(v, 0, 100);
    }
  }
  return out;
}

/**
 * Validiert und sanitized GameState beim Laden aus localStorage.
 * Schützt vor Manipulation: clampt numerische Werte, validiert Enums, begrenzt Arrays,
 * filtert Prototype-Pollution-Keys.
 */
export function validateGameState(raw: unknown): GameState {
  if (!raw || typeof raw !== 'object' || Array.isArray(raw)) {
    throw new Error('Invalid GameState: expected object');
  }
  const s = raw as Record<string, unknown>;

  // Prototype-Pollution-Schutz: nur erwartete Keys kopieren
  const get = (key: string, def: unknown) => {
    if (!(key in s)) return def;
    const v = s[key];
    if (key === '__proto__' || key === 'constructor' || key === 'prototype') return def;
    return v;
  };

  const month = clamp(Number(get('month', 1)), 1, 60);
  const speedVal = Number(get('speed', 0));
  const speed = VALID_SPEEDS.has(speedVal) ? (speedVal as 0 | 1 | 2) : 0;
  const pk = clamp(Number(get('pk', 100)), 0, 999);
  const viewVal = String(get('view', 'agenda'));
  const view = VALID_VIEWS.has(viewVal) ? (viewVal as GameState['view']) : 'agenda';

  const kpiRaw = get('kpi', { al: 50, hh: 50, gi: 50, zf: 50 }) as Record<string, number>;
  const kpi = {
    al: clamp(Number(kpiRaw?.al ?? 50), 0, 100),
    hh: clamp(Number(kpiRaw?.hh ?? 50), 0, 100),
    gi: clamp(Number(kpiRaw?.gi ?? 50), 0, 100),
    zf: clamp(Number(kpiRaw?.zf ?? 50), 0, 100),
  };

  const zustRaw = get('zust', { g: 52, arbeit: 58, mitte: 54, prog: 44 }) as Record<string, number>;
  const zust: Approval = {
    g: clamp(Number(zustRaw?.g ?? 52), 0, 100),
    arbeit: clamp(Number(zustRaw?.arbeit ?? 58), 0, 100),
    mitte: clamp(Number(zustRaw?.mitte ?? 54), 0, 100),
    prog: clamp(Number(zustRaw?.prog ?? 44), 0, 100),
  };

  const coalition = clamp(Number(get('coalition', 50)), 0, 100);
  const gameOver = Boolean(get('gameOver', false));
  const won = Boolean(get('won', false));

  const logRaw = Array.isArray(get('log', [])) ? (get('log', []) as unknown[]) : [];
  const log = logRaw.slice(0, MAX_LOG_ENTRIES).filter((e) => e && typeof e === 'object');

  const firedEvents = Array.isArray(get('firedEvents', [])) ? (get('firedEvents', []) as string[]).slice(0, MAX_FIRED_EVENTS) : [];
  const firedCharEvents = Array.isArray(get('firedCharEvents', [])) ? (get('firedCharEvents', []) as string[]).slice(0, MAX_FIRED_EVENTS) : [];
  const firedBundesratEvents = Array.isArray(get('firedBundesratEvents', [])) ? (get('firedBundesratEvents', []) as string[]).slice(0, MAX_FIRED_EVENTS) : [];
  const firedKommunalEvents = Array.isArray(get('firedKommunalEvents', [])) ? (get('firedKommunalEvents', []) as string[]).slice(0, MAX_FIRED_EVENTS) : [];

  const pendingRaw = Array.isArray(get('pending', [])) ? (get('pending', []) as unknown[]) : [];
  const pending = pendingRaw.slice(0, MAX_PENDING).filter((e): e is GameState['pending'][number] => e != null && typeof e === 'object');

  const electionThreshold = clamp(Number(get('electionThreshold', 40)), 30, 50);
  const wahlprognoseVal = get('wahlprognose', undefined);
  const wahlprognose = wahlprognoseVal != null ? clamp(Number(wahlprognoseVal), 0, 100) : undefined;
  const wahlergebnisVal = get('wahlergebnis', undefined);
  const wahlergebnis = wahlergebnisVal != null ? clamp(Number(wahlergebnisVal), 0, 100) : undefined;
  const medienKlimaVal = get('medienKlima', undefined);
  const medienKlima = medienKlimaVal != null ? clamp(Number(medienKlimaVal), 0, 100) : 55;

  const validated: GameState = {
    month,
    speed,
    pk,
    view,
    kpi,
    kpiPrev: get('kpiPrev', null) as GameState['kpiPrev'],
    zust,
    coalition,
    chars: Array.isArray(get('chars', [])) ? (get('chars', []) as GameState['chars']) : [],
    gesetze: Array.isArray(get('gesetze', [])) ? (get('gesetze', []) as GameState['gesetze']) : [],
    bundesrat: Array.isArray(get('bundesrat', [])) ? (get('bundesrat', []) as GameState['bundesrat']) : [],
    bundesratFraktionen: Array.isArray(get('bundesratFraktionen', [])) ? (get('bundesratFraktionen', []) as GameState['bundesratFraktionen']) : [],
    activeEvent: get('activeEvent', null) as GameState['activeEvent'],
    firedEvents,
    firedCharEvents,
    firedBundesratEvents,
    firedKommunalEvents,
    pending,
    log: log as GameState['log'],
    ticker: String(get('ticker', '')),
    gameOver,
    won,
    electionThreshold,
    milieuZustimmung: clampRecord0_100(get('milieuZustimmung', {}) as Record<string, number>),
    verbandsBeziehungen: clampRecord0_100(get('verbandsBeziehungen', {}) as Record<string, number>),
    politikfeldDruck: clampRecord0_100(get('politikfeldDruck', {}) as Record<string, number>),
    politikfeldLetzterBeschluss: (get('politikfeldLetzterBeschluss', {}) as Record<string, number>) || {},
    medienKlima,
    wahlprognose,
    wahlergebnis,
  };

  // Optionale Felder durchreichen (werden von migrateGameState weitergegeben)
  const optionalKeys = [
    'spielerPartei', 'speedBeforePause',
    'koalitionspartner', 'koalitionsvertragProfil', 'milieuZustimmungHistory', 'partnerPrioGesetz',
    'btStimmenBonus', 'koalitionsbruchSeitMonat', 'ministerialCooldowns', 'aktiveMinisterialInitiative',
    'eu', 'haushalt', 'lehmannUltimatumBeschleunigt', 'lehmannSparvorschlagAktiv', 'aktivesStrukturEvent',
    'gesetzProjekte', 'wahlkampfAktiv', 'wahlkampfAktionenGenutzt', 'legislaturBilanz', 'wahlkampfBotschaften',
    'tvDuellAbgehalten', 'tvDuellGewonnen', 'medienKlimaHistory', 'letzterSkandal', 'letztesPressemitteilungMonat',
    'opposition', 'medienoffensiveGenutzt',
    'staedtebuendnisBisMonat', 'kommunalKonferenzJahr', 'vorstufeBonusMonate',
  ] as const;
  for (const key of optionalKeys) {
    const v = get(key, undefined);
    if (v !== undefined && v !== null) {
      (validated as unknown as Record<string, unknown>)[key] = v;
    }
  }

  return validated as GameState;
}

/**
 * Migriert ältere Spielstände: zust.arbeit/mitte/prog → milieuZustimmung.
 * arbeit → soziale_mitte, prekaere; mitte → buergerliche_mitte, leistungstraeger; prog → postmaterielle
 */
export function migrateGameState(state: GameState): GameState {
  let result = state;
  if (!state.milieuZustimmung || Object.keys(state.milieuZustimmung).length === 0) {
    const zust = state.zust;
    const milieuZustimmung: Record<string, number> = {};
    milieuZustimmung['soziale_mitte'] = zust.arbeit;
    milieuZustimmung['prekaere'] = zust.arbeit;
    milieuZustimmung['buergerliche_mitte'] = zust.mitte;
    milieuZustimmung['leistungstraeger'] = zust.mitte;
    milieuZustimmung['postmaterielle'] = zust.prog;
    milieuZustimmung['etablierte'] = zust.mitte;
    milieuZustimmung['traditionelle'] = zust.mitte;
    result = {
      ...state,
      milieuZustimmung,
      verbandsBeziehungen: state.verbandsBeziehungen ?? {},
      politikfeldDruck: state.politikfeldDruck ?? {},
      politikfeldLetzterBeschluss: state.politikfeldLetzterBeschluss ?? {},
      ministerialCooldowns: state.ministerialCooldowns ?? {},
      aktiveMinisterialInitiative: state.aktiveMinisterialInitiative ?? null,
      eu: state.eu ?? undefined,
    };
  }
  if (!result.haushalt) {
    result = { ...result, haushalt: createInitialHaushalt(result) };
  }
  if (result.medienKlima == null) {
    result = { ...result, medienKlima: 55 };
  }
  if (!result.opposition) {
    result = { ...result, opposition: { staerke: 40, aktivesThema: null, letzterAngriff: 0 } };
  }
  if (!result.spielerPartei) {
    const sdp = SPIELBARE_PARTEIEN.find((p) => p.id === 'sdp');
    if (sdp) {
      result = {
        ...result,
        spielerPartei: { id: sdp.id, kuerzel: sdp.kuerzel, farbe: sdp.farbe, name: sdp.name },
      };
    }
  }
  return result;
}
