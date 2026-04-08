import type { GameState, ContentBundle, SpielerParteiState, BundeslandContent } from './types';
import type { Approval } from './types';
import { featureActive } from './systems/features';
import { berechneKoalitionspartner, berechneKoalitionsvertragProfil } from './systems/koalition';
import { buildKoalitionspartnerContent } from '../data/defaults/koalitionspartner';
import { initEUKlima } from './systems/eu';
import { createInitialHaushalt } from './systems/haushalt';
import { createInitialWirtschaft } from './systems/wirtschaft';
import type { Ausrichtung } from './systems/ausrichtung';
import { recalcApproval } from './systems/economy';
import { berechneKongruenz } from './ideologie';
import { berechneEffektiveBTStimmen } from './systems/parliament';
import {
  PARTEI_VERBANDS_BONUS,
  SPIELBARE_PARTEIEN,
  type SpielerParteiId,
} from '../data/defaults/parteien';
import { MEDIEN_KLIMA_DEFAULT, MAX_FIRED_EVENTS, MAX_PENDING, MAX_LOG_ENTRIES_VALIDATION } from './constants';
import { selectEventPool } from './systems/eventPoolSelection';
import {
  berechneMedianklima,
  initMedienAkteureFromContent,
  kalibriereMedienAkteureZuIndex,
  roundMedienKlimaIndex,
} from './systems/medienklima';
import { DEFAULT_MEDIEN_AKTEURE } from '../data/defaults/medienAkteure';
import { bildeKabinett, waehleMinisterAusPool } from './kabinett';
import { MINISTER_AGENDEN_CONFIG } from '../data/defaults/ministerAgenden';

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

/** SMA-327: Kanzler-Rolle je nach Geschlecht */
const KANZLER_ROLLE: Record<'sie' | 'er' | 'they', string> = {
  sie: 'Kanzlerin',
  er: 'Kanzler',
  they: 'Kanzler*in',
};

/** SMA-395: DB-Profile in Karten-Länder + Start-Beziehungen */
function mergeBundeslaenderProfile(
  bundesrat: GameState['bundesrat'],
  profiles: BundeslandContent[] | undefined,
  complexity: number,
): { bundesrat: GameState['bundesrat']; landBeziehungen: Record<string, number> } {
  if (!profiles?.length) return { bundesrat, landBeziehungen: {} };
  const byId = Object.fromEntries(profiles.map((p) => [p.id, p]));
  const landBeziehungen: Record<string, number> = {};
  const merged = bundesrat.map((land) => {
    const p = byId[land.id];
    if (!p || p.min_complexity > complexity) return land;
    landBeziehungen[land.id] = Math.max(0, Math.min(100, p.beziehung_start));
    return {
      ...land,
      name: p.name ?? land.name,
      votes: p.stimmgewicht,
      stimmgewicht: p.stimmgewicht,
      regierungPartei: p.partei ?? land.party,
      koalition: p.koalition,
      bundesratFraktion: p.bundesrat_fraktion,
      wirtschaft: p.wirtschaft_typ,
      themen: p.themen,
      profilMinComplexity: p.min_complexity,
    };
  });
  return { bundesrat: merged, landBeziehungen };
}

/**
 * Erstellt den initialen Spielzustand.
 * @param content Content-Bundle (Chars, Gesetze, Events, …)
 * @param complexity Komplexitätsstufe (1–4). Chars mit min_complexity > complexity werden ausgeblendet.
 * @param ausrichtung Optionale Spieler-Ausrichtung für Koalitionsvertrag-Profil (bei init)
 * @param spielerPartei SMA-289: Gewählte Partei (Stufe 1: SDP default)
 * @param kanzlerName SMA-327: Spieler-Name für Kanzler (überschreibt Content)
 * @param kanzlerGeschlecht SMA-327: Geschlecht für Pronomen/Anrede (sie/er/they)
 */
export function createInitialState(
  content: ContentBundle,
  complexity: number = 4,
  ausrichtung?: Ausrichtung,
  spielerPartei?: SpielerParteiState,
  kanzlerName?: string,
  kanzlerGeschlecht: 'sie' | 'er' | 'they' = 'sie',
): GameState {
  const fraktionen = content.bundesratFraktionen ?? [];
  const allChars = content.characters.filter(
    (c) => (c.min_complexity ?? 1) <= complexity
  );

  const parteiId: SpielerParteiId = spielerPartei?.id ?? 'sdp';
  const ideologie = ausrichtung ?? { wirtschaft: 0, gesellschaft: 0, staat: 0 };
  const partnerParteiId = featureActive(complexity, 'koalitionspartner')
    ? berechneKoalitionspartner(parteiId, ideologie)
    : null;
  const partner = partnerParteiId
    ? buildKoalitionspartnerContent(partnerParteiId, parteiId)
    : null;
  const hasKoalition = !!partner;
  const parteiInfo = SPIELBARE_PARTEIEN.find((p) => p.id === parteiId);
  const spielerParteiState: SpielerParteiState | undefined = parteiInfo
    ? { id: parteiId, kuerzel: parteiInfo.kuerzel, farbe: parteiInfo.farbe, name: parteiInfo.name }
    : undefined;

  // SMA-337: Pool-Filter — nur Chars der Spieler-Partei + Koalitionspartner
  const relevantParteien = new Set<string>([parteiId]);
  if (partnerParteiId) relevantParteien.add(partnerParteiId);
  const relevanteChars = allChars.filter(
    (c) => c.pool_partei != null && relevantParteien.has(c.pool_partei)
  );

  // SMA-327/328: Dynamisches Kabinett — automatisch aus Pool bilden
  const hasPoolChars = relevanteChars.some((c) => c.pool_partei && !c.ist_kanzler);
  let activeChars = relevanteChars;
  if (hasPoolChars) {
    const config = bildeKabinett(parteiId, partnerParteiId, complexity);
    const usedIds = new Set<string>();
    const selected: typeof relevanteChars = [];
    // SMA-328: Kanzler ist immer der Spieler — synthetischer Char, kein DB-Char
    const kanzlerNameDisplay = kanzlerName?.trim() || 'Kanzler/in';
    const kanzlerChar = relevanteChars.find((c) => c.id === 'kanzler' || c.ist_kanzler);
    const kanzlerBase = kanzlerChar ?? relevanteChars[0] ?? null;
    const kanzlerSynthetic = {
      ...(kanzlerBase ?? {
        bio: '',
        quote: '',
        ressort: null,
        min_complexity: 1,
      }),
      id: 'kanzler',
      name: kanzlerNameDisplay,
      role: KANZLER_ROLLE[kanzlerGeschlecht],
      ist_kanzler: true,
      pool_partei: parteiId,
      partei_kuerzel: spielerParteiState?.kuerzel,
      partei_farbe: spielerParteiState?.farbe,
      mood: kanzlerBase?.mood ?? 3,
      loyalty: kanzlerBase?.loyalty ?? 5,
      initials: kanzlerNameDisplay.slice(0, 2).toUpperCase() || '??',
      color: spielerParteiState?.farbe ?? '#8a7030',
    } as typeof relevanteChars[0];
    selected.push(kanzlerSynthetic);
    usedIds.add('kanzler');
    for (const ressort of config.spielerRessorts) {
      const m = waehleMinisterAusPool(relevanteChars, parteiId, ressort);
      if (m && !usedIds.has(m.id)) {
        const c = relevanteChars.find((x) => x.id === m.id);
        if (c) {
          selected.push(c);
          usedIds.add(m.id);
        }
      }
    }
    for (const ressort of config.partnerRessorts) {
      if (partnerParteiId) {
        const m = waehleMinisterAusPool(relevanteChars, partnerParteiId, ressort);
        if (m && !usedIds.has(m.id)) {
          const c = relevanteChars.find((x) => x.id === m.id);
          if (c) {
            selected.push(c);
            usedIds.add(m.id);
          }
        }
      }
    }
    if (selected.length <= 1) {
      console.warn('[state] Kabinett-Pool leer — prüfe pool_partei in der DB für Partei:', parteiId, partnerParteiId);
    }
    // SMA-337: Fallback nur auf synthetischen Kanzler, nie auf ungefilterte Liste
    activeChars = selected.length > 0 ? selected : [kanzlerSynthetic];
  }

  const charsWithPartei = activeChars.map((c) => {
    const char = { ...c };
    if (c.id === 'kanzler') {
      if (spielerParteiState) {
        char.partei_kuerzel = spielerParteiState.kuerzel;
        char.partei_farbe = spielerParteiState.farbe;
      }
      if (kanzlerName) char.name = kanzlerName;
      char.role = KANZLER_ROLLE[kanzlerGeschlecht];
    }
    return char;
  });

  const partnerIdeologie = partner?.ideologie ?? null;
  const gesetzBTStimmen: Record<string, number> = {};
  // Gesperrte Gesetze (locked_until_event) werden nicht in den initialen State aufgenommen
  const availableLaws = content.laws.filter(g => !g.locked_until_event);
  const gesetze = availableLaws.map((g) => {
    const basis = g.ja;
    const effektiv = berechneEffektiveBTStimmen(g, basis, ideologie, partnerIdeologie);
    gesetzBTStimmen[g.id] = effektiv;
    return {
      ...g,
      ja: effektiv,
      nein: 100 - effektiv,
      expanded: false,
      route: null,
      rprog: 0,
      rdur: 0,
      blockiert: null,
    };
  });

  // SMA-330: Minister-Agenden init (Stufe 2+)
  const ministerAgenden: Record<string, { status: 'wartend'; letzte_forderung_monat: number; ablehnungen_count: number }> = {};
  if (featureActive(complexity, 'char_ultimatums')) {
    for (const c of charsWithPartei) {
      const hasConfig =
        MINISTER_AGENDEN_CONFIG[c.id] ||
        (c.ressort === 'umwelt' && c.pool_partei === 'gp') ||
        (c.ressort === 'finanzen' && c.pool_partei === 'cdp');
      if (hasConfig) {
        ministerAgenden[c.id] = { status: 'wartend', letzte_forderung_monat: 0, ablehnungen_count: 0 };
      }
    }
  }

  const brMerged = mergeBundeslaenderProfile(
    content.bundesrat.map((b) => ({ ...b })),
    content.bundeslaender,
    complexity,
  );

  let base: GameState = {
    month: content.scenario.startMonth,
    speed: 0,
    pk: content.scenario.startPK,
    pkVerbrauchtGesamt: 0,
    skandaleGesamt: 0,
    view: 'agenda',

    kpi: { ...content.scenario.startKPI },
    kpiStart: { ...content.scenario.startKPI },
    kpiPrev: null,
    tickLog: [],
    zust: { g: 52, arbeit: 58, mitte: 54, prog: 44 },
    coalition: content.scenario.startCoalition,

    chars: charsWithPartei,
    spielerAgenda: [],
    koalitionsAgenda: [],
    gesetze,
    gesetzBTStimmen,
    bundesrat: brMerged.bundesrat,
    bundesratFraktionen: fraktionen.map(f => ({
      ...f,
      tradeoffPool: f.tradeoffPool.map(t => ({ ...t })),
    })),

    activeEvent: null,
    firedEvents: [],
    ausgeloesteEvents: [],
    firedCharEvents: [],
    firedBundesratEvents: [],
    firedKommunalEvents: [],
    activeEventPool: selectEventPool(content.events),
    unlockedLaws: [],
    pendingFollowups: [],

    pending: [],

    log: [],
    ticker: 'Neue Legislaturperiode. Koalitionsvertrag unterzeichnet.',

    rngSeed: Math.floor(Math.random() * 0xffffffff) + 1,

    gameOver: false,
    won: false,
    complexity,

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
    medienKlima: MEDIEN_KLIMA_DEFAULT,
    opposition: { staerke: 40, aktivesThema: null, letzterAngriff: 0 },
    ...(spielerParteiState && { spielerPartei: spielerParteiState }),
    kanzlerGeschlecht,
    ...(kanzlerName && { kanzlerName }),
    ...(Object.keys(ministerAgenden).length > 0 && { ministerAgenden }),
    ...(Object.keys(brMerged.landBeziehungen).length > 0 && {
      landBeziehungen: brMerged.landBeziehungen,
    }),
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

  const beziehungStart = partner?.beziehung_start ?? 50;

  function withMedienAkteureIfNeeded(s: GameState): GameState {
    if (!featureActive(complexity, 'medien_akteure_2')) return s;
    let medienAkteure = initMedienAkteureFromContent(content, complexity);
    medienAkteure = kalibriereMedienAkteureZuIndex(medienAkteure, content, complexity, s.medienKlima ?? MEDIEN_KLIMA_DEFAULT);
    const next = { ...s, medienAkteure };
    return { ...next, medienKlima: berechneMedianklima(next) };
  }

  /** SMA-412: Startwert für Verlauf-Chart (ein Punkt vor erstem Tick) */
  function withMedienKlimaHistorySeed(s: GameState): GameState {
    const r = withMedienAkteureIfNeeded(s);
    if (r.medienKlimaHistory && r.medienKlimaHistory.length > 0) return r;
    return { ...r, medienKlimaHistory: [r.medienKlima ?? MEDIEN_KLIMA_DEFAULT] };
  }

  if (featureActive(complexity, 'haushaltsdebatte')) {
    let withHaushalt: GameState = { ...base, haushalt: createInitialHaushalt(base) };
    if (featureActive(complexity, 'wirtschaftssektoren')) {
      withHaushalt = { ...withHaushalt, wirtschaft: createInitialWirtschaft() };
    }
    if (hasKoalition && partner) {
      return withMedienKlimaHistorySeed(
        applyEUKlimaAndRatsvorsitz({
          ...withHaushalt,
          koalitionspartner: {
            id: partner.id,
            beziehung: beziehungStart,
            koalitionsvertragScore: 0,
            schluesselthemenErfuellt: [],
          },
          koalitionsvertragProfil: berechneKoalitionsvertragProfil(ideologie, partner),
          verbandsBeziehungen: { uvb: 50, bvd: 50, ...withHaushalt.verbandsBeziehungen },
        }),
      );
    }
    return withMedienKlimaHistorySeed(applyEUKlimaAndRatsvorsitz(withHaushalt));
  }

  if (featureActive(complexity, 'wirtschaftssektoren')) {
    base = { ...base, wirtschaft: createInitialWirtschaft() };
  }

  if (hasKoalition && partner) {
    const verbandsBeziehungen = { ...base.verbandsBeziehungen };
    verbandsBeziehungen['uvb'] = 50;
    verbandsBeziehungen['bvd'] = 50;
    return withMedienKlimaHistorySeed(
      applyEUKlimaAndRatsvorsitz({
        ...base,
        koalitionspartner: {
          id: partner.id,
          beziehung: beziehungStart,
          koalitionsvertragScore: 0,
          schluesselthemenErfuellt: [],
        },
        koalitionsvertragProfil: berechneKoalitionsvertragProfil(ideologie, partner),
        verbandsBeziehungen,
      }),
    );
  }

  return withMedienKlimaHistorySeed(applyEUKlimaAndRatsvorsitz(base));
}

/** Maximale Array-Längen für GameState (Schutz vor localStorage-Manipulation) */
const MAX_LOG_ENTRIES = MAX_LOG_ENTRIES_VALIDATION;

/** Erlaubte View- und Speed-Werte */
/** SMA-320: 10 Tabs */
const VALID_VIEWS = new Set<string>([
  'agenda', 'bundestag', 'kabinett', 'haushalt', 'medien', 'verbaende', 'bundesrat', 'laender', 'kommunen', 'eu', 'wahlkampf',
]);
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
  const ausgeloesteEventsRaw = Array.isArray(get('ausgeloesteEvents', []))
    ? (get('ausgeloesteEvents', []) as string[]).slice(0, MAX_FIRED_EVENTS)
    : [];
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
  const medienKlima =
    medienKlimaVal != null ? roundMedienKlimaIndex(clamp(Number(medienKlimaVal), 0, 100)) : MEDIEN_KLIMA_DEFAULT;

  const rngSeedRaw = get('rngSeed', undefined);
  const rngSeedParsed = Number(rngSeedRaw);
  const rngSeed =
    Number.isFinite(rngSeedParsed) && rngSeedParsed > 0
      ? Math.max(1, Math.min(0xffffffff, Math.floor(Math.abs(rngSeedParsed))))
      : Math.floor(Math.random() * 0xffffffff) + 1;

  const validated: GameState = {
    month,
    speed,
    pk,
    view,
    kpi,
    kpiPrev: get('kpiPrev', null) as GameState['kpiPrev'],
    tickLog: [],
    zust,
    coalition,
    chars: Array.isArray(get('chars', [])) ? (get('chars', []) as GameState['chars']) : [],
    gesetze: Array.isArray(get('gesetze', [])) ? (get('gesetze', []) as GameState['gesetze']) : [],
    bundesrat: Array.isArray(get('bundesrat', [])) ? (get('bundesrat', []) as GameState['bundesrat']) : [],
    bundesratFraktionen: Array.isArray(get('bundesratFraktionen', [])) ? (get('bundesratFraktionen', []) as GameState['bundesratFraktionen']) : [],
    activeEvent: get('activeEvent', null) as GameState['activeEvent'],
    firedEvents,
    ausgeloesteEvents: ausgeloesteEventsRaw.length ? ausgeloesteEventsRaw : undefined,
    firedCharEvents,
    firedBundesratEvents,
    firedKommunalEvents,
    pending,
    log: log as GameState['log'],
    ticker: String(get('ticker', '')),
    rngSeed,
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
    'gesetzBTStimmen', 'spielerPartei', 'kanzlerName', 'kanzlerGeschlecht', 'speedBeforePause', 'eingebrachteGesetze',
    'koalitionspartner', 'koalitionsvertragProfil', 'milieuZustimmungHistory', 'milieuGesetzReaktionen', 'partnerPrioGesetz',
    'partnerWiderstandVetoFreigabeGesetzId',
    'spielerAgenda',
    'koalitionsAgenda',
    'milieuHistory',
    'medienklimaBelowMonths',
    'charMoodHistory',
    'pendingPartnerWiderstand',
    'btStimmenBonus', 'koalitionsbruchSeitMonat', 'ministerialCooldowns', 'aktiveMinisterialInitiative', 'ministerAgenden', 'aktiveMinisterAgenda',
    'eu', 'haushalt', 'lehmannUltimatumBeschleunigt', 'lehmannSparvorschlagAktiv', 'aktivesStrukturEvent',
    'gesetzProjekte', 'wahlkampfAktiv', 'wahlkampfAktionenGenutzt', 'legislaturBilanz', 'wahlkampfBotschaften',
    'tvDuellAbgehalten', 'tvDuellGewonnen', 'medienKlimaHistory', 'letzterSkandal', 'letztesPressemitteilungMonat',
    'pkVerbrauchtGesamt', 'skandaleGesamt',
    'opposition', 'medienoffensiveGenutzt',
    'staedtebuendnisBisMonat', 'kommunalKonferenzJahr', 'vorstufeBonusMonate', 'lowApprovalMonths',
    'activeEventPool', 'unlockedLaws', 'pendingFollowups', 'lastRandomEventMonth',
    'medienAkteure', 'medienAktionenGenutzt', 'medienAkteurBuffs',
    'ausgeloesteEvents',
    'konjunkturIndexHistory',
    'landBeziehungen',
    'pendingBundesratLandEvent',
    'letzterMonatsDiff',
    'wirtschaft',
    'verbandsLetzteWirtschaftsReaktion',
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
  const cxM = result.complexity ?? 4;
  if (featureActive(cxM, 'wirtschaftssektoren') && !result.wirtschaft) {
    result = { ...result, wirtschaft: createInitialWirtschaft() };
  }
  if (result.medienKlima == null) {
    result = { ...result, medienKlima: MEDIEN_KLIMA_DEFAULT };
  }
  // SMA-390: fehlende Akteure anlegen, Index an gespeichertes medienKlima anbinden
  const cx = result.complexity ?? 4;
  if (featureActive(cx, 'medien_akteure_2') && (!result.medienAkteure || Object.keys(result.medienAkteure).length === 0)) {
    const bundle = { medienAkteureContent: DEFAULT_MEDIEN_AKTEURE } as ContentBundle;
    let ma = initMedienAkteureFromContent(bundle, cx);
    ma = kalibriereMedienAkteureZuIndex(ma, bundle, cx, result.medienKlima ?? MEDIEN_KLIMA_DEFAULT);
    result = { ...result, medienAkteure: ma, medienKlima: berechneMedianklima({ ...result, medienAkteure: ma }) };
  }
  // SMA-412: alte Spielstände ohne Verlauf — Startpunkt für Chart (nach finalem medienKlima)
  if (!result.medienKlimaHistory?.length) {
    result = { ...result, medienKlimaHistory: [result.medienKlima ?? MEDIEN_KLIMA_DEFAULT] };
  }
  // SMA-409: bestehende Verläufe normalisieren (Floats aus älteren Saves)
  if (result.medienKlimaHistory?.length) {
    result = {
      ...result,
      medienKlimaHistory: result.medienKlimaHistory.map((v) => roundMedienKlimaIndex(v)),
    };
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
  if ((result.koalitionspartner?.id as string) === 'gruene') {
    const kp = result.koalitionspartner!;
    result = {
      ...result,
      koalitionspartner: {
        id: 'gp',
        beziehung: kp.beziehung ?? 50,
        koalitionsvertragScore: kp.koalitionsvertragScore ?? 50,
        schluesselthemenErfuellt: kp.schluesselthemenErfuellt ?? [],
      },
    };
  }
  // SMA-320: View-Migration land->laender, kommune->kommunen
  const viewMap: Record<string, 'laender' | 'kommunen'> = { land: 'laender', kommune: 'kommunen' };
  if (result.view && viewMap[result.view as string]) {
    result = { ...result, view: viewMap[result.view as string] };
  }
  if (!VALID_VIEWS.has(result.view)) {
    result = { ...result, view: 'agenda' };
  }
  if (!result.kanzlerGeschlecht) {
    result = { ...result, kanzlerGeschlecht: 'sie' as const };
  }
  return result;
}
