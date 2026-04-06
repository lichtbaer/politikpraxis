/**
 * SMA-404: Wirtschaftssektoren, Makroindikatoren, Verzögerung, Verbände, Konjunkturzyklus.
 */
import type { GameState } from '../types';
import { clamp, trimHistory, KPI_HISTORY_MAX_MONTHS } from '../constants';
import { nextRandom } from '../rng';
import { featureActive } from './features';
import { berechneEinnahmen, berechnePflichtausgaben } from './haushaltBerechnung';
import { addLog } from '../log';
import type { WirtschaftsState } from '../types/wirtschaft';

export const WIRTSCHAFT_SEKTOR_IDS = [
  'industrie',
  'arbeit',
  'konsum',
  'gruen',
  'finanz',
] as const;

/** SMA-405: Verknüpfung Sektor → Verbände (wie DB-Migration 048) */
export const WIRTSCHAFT_SEKTOR_VERBAND_IDS: Record<string, readonly string[]> = {
  industrie: ['bdi', 'dwv'],
  arbeit: ['gbd'],
  konsum: ['bvl', 'pvd'],
  gruen: ['uvb'],
  finanz: ['bdi', 'bvd'],
};

const SEKTOR_START: Record<string, { zustand: number; trend: number }> = {
  industrie: { zustand: 50, trend: 0 },
  arbeit: { zustand: 50, trend: 0 },
  konsum: { zustand: 52, trend: 0 },
  gruen: { zustand: 45, trend: 0 },
  finanz: { zustand: 55, trend: 0 },
};

/** SMA-405: Anzeigenamen für Dashboard / Reaktions-Hinweise */
export const WIRTSCHAFT_SEKTOR_NAME_DE: Record<string, string> = {
  industrie: 'Industrie & Energie',
  arbeit: 'Arbeit & Soziales',
  konsum: 'Konsum & Handel',
  gruen: 'Grüne Wirtschaft',
  finanz: 'Finanz & Kapital',
};

/** Startwerte für Delta-Vergleich vor erstem Verlaufseintrag (createInitialWirtschaft) */
export const WIRTSCHAFT_INDIKATOREN_START_SNAPSHOT = {
  monat: 0,
  bip: 1.2,
  inflation: 2.5,
  arbeitslosigkeit: 5.2,
  investitionsklima: 55,
} as const;

/** Konjunkturindex aus BIP-Wachstum für Abwärtskompatibilität (Haushalt/Einnahmen) */
export function bipZuKonjunkturIndex(bipWachstum: number): number {
  return clamp((bipWachstum - 1.2) * 1.0, -3, 3);
}

export function createInitialWirtschaft(): WirtschaftsState {
  const sektoren: WirtschaftsState['sektoren'] = {};
  for (const id of WIRTSCHAFT_SEKTOR_IDS) {
    const s = SEKTOR_START[id] ?? { zustand: 50, trend: 0 };
    sektoren[id] = { zustand: s.zustand, trend: s.trend };
  }
  return {
    bip_wachstum: 1.2,
    inflation: 2.5,
    arbeitslosigkeit: 5.2,
    investitionsklima: 55,
    sektoren,
    indikatoren_verlauf: [],
    pendingSektorDeltas: [],
    bip_wachstum_history: [],
    sektorVerbandCooldown: {},
  };
}

function ensureWirtschaft(state: GameState): WirtschaftsState {
  return state.wirtschaft ?? createInitialWirtschaft();
}

/** Bei Gesetzesbeschluss: verzögerte Sektor-Deltas einplanen */
export function scheduleSektorEffekteFromGesetz(state: GameState, gesetzId: string): GameState {
  if (!state.haushalt) return state;
  const g = state.gesetze.find((x) => x.id === gesetzId);
  const effekte = g?.sektor_effekte;
  if (!effekte?.length) return state;

  const w0 = ensureWirtschaft(state);
  const pending = [...w0.pendingSektorDeltas];
  const basisMonat = state.month;
  for (const e of effekte) {
    if (!WIRTSCHAFT_SEKTOR_IDS.includes(e.sektor as (typeof WIRTSCHAFT_SEKTOR_IDS)[number])) continue;
    pending.push({
      sektor: e.sektor,
      delta: e.delta,
      wirkungMonat: basisMonat + Math.max(0, e.verzoegerung_monate),
    });
  }
  return {
    ...state,
    wirtschaft: { ...w0, pendingSektorDeltas: pending },
  };
}

function applyPendingSektorDeltasForMonth(w: WirtschaftsState, monat: number): WirtschaftsState {
  const rest: typeof w.pendingSektorDeltas = [];
  const sektoren = { ...w.sektoren };
  for (const p of w.pendingSektorDeltas) {
    if (p.wirkungMonat === monat) {
      const cur = sektoren[p.sektor] ?? { zustand: 50, trend: 0 };
      sektoren[p.sektor] = {
        ...cur,
        zustand: clamp(cur.zustand + p.delta, 0, 100),
      };
    } else if (p.wirkungMonat > monat) {
      rest.push(p);
    }
    // veraltete Einträge (Monat in der Vergangenheit) verwerfen
  }
  return { ...w, sektoren, pendingSektorDeltas: rest };
}

function tickSektorMechanik(w: WirtschaftsState): WirtschaftsState {
  const sektoren = { ...w.sektoren };
  for (const id of WIRTSCHAFT_SEKTOR_IDS) {
    const s = sektoren[id] ?? { zustand: 50, trend: 0 };
    let z = s.zustand + s.trend;
    z = clamp(z, 0, 100);
    let t = s.trend * 0.92;
    t += (nextRandom() - 0.5) * 0.15;
    t = clamp(t, -5, 5);
    sektoren[id] = { zustand: z, trend: t };
  }
  return { ...w, sektoren };
}

function checkKonjunkturZyklus(state: GameState, w: WirtschaftsState, complexity: number): WirtschaftsState {
  if (!featureActive(complexity, 'konjunktur_cycles')) return w;
  if (state.month < 12) return w;
  if (nextRandom() >= 0.04) return w;

  const sektoren = { ...w.sektoren };
  for (const id of WIRTSCHAFT_SEKTOR_IDS) {
    const s = sektoren[id] ?? { zustand: 50, trend: 0 };
    sektoren[id] = { ...s, trend: clamp(s.trend - 2, -5, 5) };
  }
  return { ...w, sektoren };
}

function arbeitslosigkeitAusBipVerlauf(bipHist: number[]): number {
  if (bipHist.length === 0) return 5.2;
  const n = Math.min(3, bipHist.length);
  const slice = bipHist.slice(-n);
  const avg = slice.reduce((a, b) => a + b, 0) / slice.length;
  // Schwaches BIP → höhere AL (%)
  return clamp(5.5 - (avg - 1.0) * 1.2, 2, 12);
}

function verbandsReaktion(
  state: GameState,
  w: WirtschaftsState,
  key: string,
  monat: number,
  delta: number,
  cooldown: number,
  logMsg: string,
  logType: 'g' | 'r' | 'w',
  complexity: number,
  hinweisJeVerband?: Array<{
    verbandId: string;
    sektor_id: string;
    sektor_name_de: string;
    zustand: number;
    kontext_de?: string;
  }>,
): { state: GameState; w: WirtschaftsState } {
  const cd = w.sektorVerbandCooldown ?? {};
  const nextFree = cd[key] ?? 0;
  if (monat < nextFree) return { state, w };

  const vb = { ...(state.verbandsBeziehungen ?? {}) };
  const parts = key.split('_');
  const vid = parts[0];
  if (!vid) return { state, w };
  vb[vid] = clamp((vb[vid] ?? 50) + delta, 0, 100);

  let nextState: GameState = { ...state, verbandsBeziehungen: vb };
  if (
    featureActive(complexity, 'wirtschaft_verbandsreaktion_hinweis') &&
    hinweisJeVerband?.length
  ) {
    const prev = { ...(state.verbandsLetzteWirtschaftsReaktion ?? {}) };
    for (const h of hinweisJeVerband) {
      prev[h.verbandId] = {
        sektor_id: h.sektor_id,
        sektor_name_de: h.sektor_name_de,
        zustand: Math.round(h.zustand),
        monat,
        ...(h.kontext_de ? { kontext_de: h.kontext_de } : {}),
      };
    }
    nextState = { ...nextState, verbandsLetzteWirtschaftsReaktion: prev };
  }

  const s2 = addLog(nextState, logMsg, logType);
  const cd2 = { ...cd, [key]: monat + cooldown };
  return { state: s2, w: { ...w, sektorVerbandCooldown: cd2 } };
}

function aktualisiereVerbandsBeziehungen(state: GameState, w: WirtschaftsState, complexity: number): GameState {
  if (!featureActive(complexity, 'verbands_lobbying')) return state;
  const s = w.sektoren;
  let st = state;
  let wcur = w;

  const ind = s.industrie?.zustand ?? 50;
  if (ind < 30) {
    const r = verbandsReaktion(
      st,
      wcur,
      'bdi_ind_krise',
      state.month,
      -2,
      4,
      'BDI: Die Industrie braucht dringend politische Unterstützung.',
      'w',
      complexity,
      [
        {
          verbandId: 'bdi',
          sektor_id: 'industrie',
          sektor_name_de: WIRTSCHAFT_SEKTOR_NAME_DE.industrie ?? 'Industrie',
          zustand: ind,
        },
      ],
    );
    st = r.state;
    wcur = r.w;
  } else if (ind > 70) {
    const r = verbandsReaktion(
      st,
      wcur,
      'bdi_ind_boom',
      state.month,
      1,
      6,
      'BDI: Gute Konjunktur in der Industrie stärkt das Vertrauen.',
      'g',
      complexity,
      [
        {
          verbandId: 'bdi',
          sektor_id: 'industrie',
          sektor_name_de: WIRTSCHAFT_SEKTOR_NAME_DE.industrie ?? 'Industrie',
          zustand: ind,
        },
      ],
    );
    st = r.state;
    wcur = r.w;
  }

  const arb = s.arbeit?.zustand ?? 50;
  if (arb < 30) {
    const r = verbandsReaktion(
      st,
      wcur,
      'gbd_arb_krise',
      state.month,
      -2,
      4,
      'GBD: Arbeitnehmerinnen brauchen jetzt Schutz.',
      'w',
      complexity,
      [
        {
          verbandId: 'gbd',
          sektor_id: 'arbeit',
          sektor_name_de: WIRTSCHAFT_SEKTOR_NAME_DE.arbeit ?? 'Arbeit',
          zustand: arb,
        },
      ],
    );
    st = r.state;
    wcur = r.w;
  }

  const gr = s.gruen?.zustand ?? 50;
  if (gr < 35) {
    const r = verbandsReaktion(
      st,
      wcur,
      'uvb_gruen',
      state.month,
      -1,
      5,
      'Umweltverbände: Der Umbau der Wirtschaft kommt zu langsam voran.',
      'w',
      complexity,
      [
        {
          verbandId: 'uvb',
          sektor_id: 'gruen',
          sektor_name_de: WIRTSCHAFT_SEKTOR_NAME_DE.gruen ?? 'Grüne Wirtschaft',
          zustand: gr,
        },
      ],
    );
    st = r.state;
    wcur = r.w;
  }

  const saldo = state.haushalt?.saldo ?? 0;
  if (saldo < -40) {
    const r = verbandsReaktion(
      st,
      wcur,
      'bdi_haushalt',
      state.month,
      -2,
      3,
      'BDI: Der Haushalt belastet Standort und Investitionsklima.',
      'w',
      complexity,
      [
        {
          verbandId: 'bdi',
          sektor_id: 'haushalt',
          sektor_name_de: 'Haushalt',
          zustand: 0,
          kontext_de: `Haushaltssaldo ${saldo.toFixed(1)} Mrd.`,
        },
      ],
    );
    st = r.state;
    wcur = r.w;
  }

  return { ...st, wirtschaft: wcur };
}

/**
 * Monatlicher Wirtschaftstick (Sektoren, Indikatoren, Einnahmen, Verbände).
 * Nur ab Komplexität 2 (`wirtschaftssektoren`).
 */
export function tickWirtschaft(state: GameState, complexity: number): GameState {
  if (!featureActive(complexity, 'wirtschaftssektoren') || !state.haushalt) {
    return state;
  }

  let w = applyPendingSektorDeltasForMonth(ensureWirtschaft(state), state.month);
  w = tickSektorMechanik(w);
  w = checkKonjunkturZyklus(state, w, complexity);

  const se = w.sektoren;
  const zi = (id: string) => se[id]?.zustand ?? 50;

  const bip_wachstum =
    ((zi('industrie') + zi('konsum') + zi('finanz')) / 150) * 3 - 0.5;

  const konjunkturHitze = (zi('industrie') + zi('konsum')) / 200;
  let inflation = 1.5 + konjunkturHitze * 3;
  const gruenSchwach = zi('gruen') < 40;
  if (gruenSchwach) inflation -= 0.15;
  inflation = clamp(inflation, 0.5, 8);

  const saldoVorher = state.haushalt.saldo;
  const investitionsklima = clamp(
    zi('finanz') * 0.5 + (saldoVorher > -20 ? 30 : 10),
    0,
    100,
  );

  const bipHist = trimHistory([...w.bip_wachstum_history], bip_wachstum, KPI_HISTORY_MAX_MONTHS);
  const arbeitslosigkeit = arbeitslosigkeitAusBipVerlauf(bipHist);

  const snapshot = {
    monat: state.month,
    bip: bip_wachstum,
    inflation,
    arbeitslosigkeit,
    investitionsklima,
  };
  const ivRaw = [...w.indikatoren_verlauf, snapshot];
  const maxIv = KPI_HISTORY_MAX_MONTHS;
  w = {
    ...w,
    bip_wachstum,
    inflation,
    arbeitslosigkeit,
    investitionsklima,
    bip_wachstum_history: bipHist,
    indikatoren_verlauf: ivRaw.length > maxIv ? ivRaw.slice(-maxIv) : ivRaw,
  };

  const ki = bipZuKonjunkturIndex(bip_wachstum);
  const haushaltAlt = state.haushalt;
  const haushaltMitKi = { ...haushaltAlt, konjunkturIndex: ki };
  const sMitW = { ...state, wirtschaft: w, haushalt: haushaltMitKi };
  const einnahmen = berechneEinnahmen(sMitW);
  const pflicht = berechnePflichtausgaben(sMitW);
  const spielraum = einnahmen - pflicht;
  const saldoNeu = spielraum - haushaltMitKi.laufendeAusgaben;
  let haushaltNeu = {
    ...haushaltMitKi,
    einnahmen,
    pflichtausgaben: pflicht,
    spielraum,
    saldo: saldoNeu,
  };
  if (state.month > 1 && (state.month - 1) % 12 === 0) {
    haushaltNeu = {
      ...haushaltNeu,
      saldoKumulativ: haushaltNeu.saldoKumulativ + saldoNeu,
    };
  }

  let next: GameState = { ...state, wirtschaft: w, haushalt: haushaltNeu };
  next = aktualisiereVerbandsBeziehungen(next, next.wirtschaft!, complexity);

  return next;
}
