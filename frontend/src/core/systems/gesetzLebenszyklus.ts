/**
 * SMA-273: Gesetz-Lebenszyklus — Vorstufen (Kommunal, Länder, EU), Bonus-Akkumulation.
 */
import type { GameState, GesetzProjekt, AktiveVorstufe, VorstufenBoni } from '../types';
import {
  MAX_BT_STIMMEN_BONUS,
  MAX_PK_KOSTEN_RABATT,
  MAX_KOFINANZIERUNG,
  MAX_BUNDESRAT_BONUS,
} from '../constants';
import { addLog } from '../log';
import { verbrauchePK } from '../pk';
import { featureActive } from './features';
import { bewerteEURoute } from './eu';
import { nextRandom } from '../rng';
import type { ContentBundle } from '../types';

/** Boni pro Vorstufen-Typ bei Erfolg */
const VORSTUFEN_BONI: Record<'kommunal' | 'laender' | 'eu', VorstufenBoni> = {
  kommunal: {
    btStimmenBonus: 8,
    pkKostenRabatt: 4,
    kofinanzierung: 0.05,
    bundesratBonus: 5,
    medienRueckhalt: 2,
  },
  laender: {
    btStimmenBonus: 10,
    pkKostenRabatt: 6,
    kofinanzierung: 0.08,
    bundesratBonus: 12,
    medienRueckhalt: 3,
  },
  eu: {
    btStimmenBonus: 12,
    pkKostenRabatt: 8,
    kofinanzierung: 0.15,
    bundesratBonus: 15,
    medienRueckhalt: 4,
  },
};

function defaultBoni(): VorstufenBoni {
  return {
    btStimmenBonus: 0,
    pkKostenRabatt: 0,
    kofinanzierung: 0,
    bundesratBonus: 0,
    medienRueckhalt: 0,
  };
}

function ensureGesetzProjekt(state: GameState, gesetzId: string): GameState {
  const projekte = { ...(state.gesetzProjekte ?? {}) };
  if (!projekte[gesetzId]) {
    projekte[gesetzId] = {
      gesetzId,
      status: 'vorbereitung',
      aktiveVorstufen: [],
      boni: defaultBoni(),
    };
  }
  return { ...state, gesetzProjekte: projekte };
}

/** SMA-274: Als Vorbild nutzen — reduzierter Bonus (+2% BT) ohne PK, auf GesetzProjekt */
export function applyVorbildBonus(state: GameState, gesetzId: string): GameState {
  const s = ensureGesetzProjekt(state, gesetzId);
  const projekt = s.gesetzProjekte![gesetzId];
  const boni = {
    ...projekt.boni,
    btStimmenBonus: Math.min(MAX_BT_STIMMEN_BONUS, projekt.boni.btStimmenBonus + 2),
  };
  return {
    ...s,
    gesetzProjekte: {
      ...s.gesetzProjekte!,
      [gesetzId]: { ...projekt, boni },
    },
  };
}

function berechneKommunalErfolgschance(
  state: GameState,
  gesetzId: string,
  stadttyp: 'progressiv' | 'konservativ' | 'industrie',
): number {
  const gesetz = state.gesetze.find(g => g.id === gesetzId);
  if (!gesetz) return 0.5;
  // Basis 0.6, Kongruenz mit Stadttyp modifiziert
  const basis = 0.6;
  const ideologie = gesetz.ideologie ?? { wirtschaft: 0, gesellschaft: 0, staat: 0 };
  let mod = 0;
  if (stadttyp === 'progressiv') mod = ideologie.gesellschaft < 0 ? 0.15 : -0.1;
  else if (stadttyp === 'konservativ') mod = ideologie.gesellschaft > 0 ? 0.15 : -0.1;
  else if (stadttyp === 'industrie') mod = ideologie.wirtschaft > 0 ? 0.1 : -0.05;
  return Math.max(0.2, Math.min(0.9, basis + mod));
}

function berechneLaenderErfolgschance(state: GameState, _gesetzId: string, fraktionId: string): number {
  const fraktion = state.bundesratFraktionen?.find(f => f.id === fraktionId);
  if (!fraktion) return 0.5;
  const beziehung = fraktion.beziehung ?? 50;
  return Math.max(0.3, Math.min(0.85, 0.5 + beziehung / 200));
}

function checkLaenderPilotBedingung(fraktion: { beziehung: number }): boolean {
  return fraktion.beziehung >= 30;
}

function applyKommunalMilieuEffekte(
  state: GameState,
  stadttyp: 'progressiv' | 'konservativ' | 'industrie',
  content: ContentBundle,
  complexity: number,
): GameState {
  const milieus = content.milieus ?? [];
  if (milieus.length === 0) return state;
  const milieuZustimmung = { ...(state.milieuZustimmung ?? {}) };
  const delta = stadttyp === 'progressiv' ? 2 : stadttyp === 'konservativ' ? -1 : 0;
  for (const m of milieus) {
    if (m.min_complexity <= complexity) {
      const current = milieuZustimmung[m.id] ?? 50;
      milieuZustimmung[m.id] = Math.max(0, Math.min(100, current + delta));
    }
  }
  return { ...state, milieuZustimmung };
}

/** Kommunal-Pilot starten (8 PK, 4 Monate) */
export function startKommunalPilot(
  state: GameState,
  gesetzId: string,
  stadttyp: 'progressiv' | 'konservativ' | 'industrie',
  stadtname?: string,
  complexity: number = 4,
): GameState {
  if (!featureActive(complexity, 'kommunal_pilot')) return state;

  const gesetz = state.gesetze.find(g => g.id === gesetzId);
  if (!gesetz || gesetz.status !== 'entwurf') return state;
  if (gesetz.kommunal_pilot_moeglich === false) return state;

  const next = verbrauchePK(state, 8);
  if (!next) return state;

  const dauer = 4;
  const erfolgschance = berechneKommunalErfolgschance(next, gesetzId, stadttyp);

  let s = ensureGesetzProjekt(next, gesetzId);
  const projekt = s.gesetzProjekte![gesetzId];
  const neueVorstufe: AktiveVorstufe = {
    typ: 'kommunal',
    startMonat: s.month,
    dauerMonate: dauer,
    fortschritt: 0,
    erfolgschance,
    abgeschlossen: false,
    stadttyp,
    stadtname,
  };

  const aktiveVorstufen = [...projekt.aktiveVorstufen, neueVorstufe];
  s = {
    ...s,
    gesetzProjekte: {
      ...s.gesetzProjekte!,
      [gesetzId]: { ...projekt, aktiveVorstufen },
    },
  };

  if (s.month + dauer > 48) {
    s = addLog(s, '⚠ Vorstufe endet nach Wahltermin — kein Bundesgesetz mehr möglich.', 'warn');
  }

  return addLog(s, `Kommunal-Pilot gestartet: ${gesetz.kurz} in ${stadtname ?? stadttyp}`, 'g');
}

/** Länder-Pilot starten (12 PK, 5 Monate) */
export function startLaenderPilot(
  state: GameState,
  gesetzId: string,
  fraktionId: string,
  complexity: number = 4,
): GameState {
  if (!featureActive(complexity, 'laender_pilot')) return state;

  const gesetz = state.gesetze.find(g => g.id === gesetzId);
  if (!gesetz || gesetz.status !== 'entwurf') return state;
  if (gesetz.laender_pilot_moeglich === false) return state;

  const fraktion = state.bundesratFraktionen?.find(f => f.id === fraktionId);
  if (!fraktion) return state;
  if (!checkLaenderPilotBedingung(fraktion)) {
    return addLog(state, 'Fraktion lehnt Länder-Pilot ab.', 'r');
  }

  const next = verbrauchePK(state, 12);
  if (!next) return state;

  const erfolgschance = berechneLaenderErfolgschance(next, gesetzId, fraktionId);

  let s = ensureGesetzProjekt(next, gesetzId);
  const projekt = s.gesetzProjekte![gesetzId];
  const neueVorstufe: AktiveVorstufe = {
    typ: 'laender',
    startMonat: s.month,
    dauerMonate: 5,
    fortschritt: 0,
    erfolgschance,
    abgeschlossen: false,
    fraktionId,
  };

  const aktiveVorstufen = [...projekt.aktiveVorstufen, neueVorstufe];
  s = {
    ...s,
    gesetzProjekte: {
      ...s.gesetzProjekte!,
      [gesetzId]: { ...projekt, aktiveVorstufen },
    },
  };

  return addLog(s, `Länder-Pilot gestartet: ${gesetz.kurz} mit ${fraktion.name}`, 'g');
}

/** EU-Initiative als Vorstufe starten (eigener Tick, 9 Monate, nutzt bewerteEURoute für Erfolgschance) */
export function startEUInitiativeAlsVorstufe(
  state: GameState,
  gesetzId: string,
  content: ContentBundle,
  complexity: number = 4,
): GameState {
  if (!featureActive(complexity, 'eu_route')) return state;

  const gesetz = state.gesetze.find(g => g.id === gesetzId);
  if (!gesetz || gesetz.status !== 'entwurf') return state;
  if (gesetz.eu_initiative_moeglich === false) return state;

  const verbaende = content.verbaende ?? [];
  const bewertung = bewerteEURoute(state, gesetzId, verbaende, complexity);

  let s = ensureGesetzProjekt(state, gesetzId);
  const projekt = s.gesetzProjekte![gesetzId];
  const neueVorstufe: AktiveVorstufe = {
    typ: 'eu',
    startMonat: s.month,
    dauerMonate: 9,
    fortschritt: 0,
    erfolgschance: bewertung.erfolgschance,
    abgeschlossen: false,
  };

  const aktiveVorstufen = [...projekt.aktiveVorstufen, neueVorstufe];
  s = {
    ...s,
    gesetzProjekte: {
      ...s.gesetzProjekte!,
      [gesetzId]: { ...projekt, aktiveVorstufen },
    },
  };

  return addLog(s, `EU-Initiative als Vorstufe gestartet: ${gesetz.kurz}`, 'g');
}

/** Vorstufe abbrechen (Beziehungsstrafe bei Länder/EU) */
export function abbrechenVorstufe(
  state: GameState,
  gesetzId: string,
  typ: 'kommunal' | 'laender' | 'eu',
): GameState {
  const projekte = state.gesetzProjekte ?? {};
  const projekt = projekte[gesetzId];
  if (!projekt) return state;

  const vorstufeIdx = projekt.aktiveVorstufen.findIndex(v => v.typ === typ && !v.abgeschlossen);
  if (vorstufeIdx === -1) return state;

  const vorstufe = projekt.aktiveVorstufen[vorstufeIdx];
  const aktiveVorstufen = projekt.aktiveVorstufen.map((v, i) =>
    i === vorstufeIdx ? { ...v, abgeschlossen: true, ergebnis: 'scheitern' as 'erfolg' | 'scheitern' } : v,
  );

  let s: GameState = {
    ...state,
    gesetzProjekte: {
      ...state.gesetzProjekte!,
      [gesetzId]: { ...projekt, aktiveVorstufen },
    },
  };

  if (typ === 'kommunal') {
    s = addLog(s, 'Kommunal-Pilot abgebrochen.', 'r');
  } else if (typ === 'laender' && vorstufe.fraktionId) {
    const fraktionen = s.bundesratFraktionen?.map(f =>
      f.id === vorstufe.fraktionId ? { ...f, beziehung: Math.max(-100, f.beziehung - 5) } : f,
    ) ?? [];
    s = { ...s, bundesratFraktionen: fraktionen };
    s = addLog(s, 'Länder-Pilot abgebrochen — Fraktion verärgert.', 'r');
  } else if (typ === 'eu') {
    if (s.eu?.aktiveRoute?.gesetzId === gesetzId) {
      s = { ...s, eu: { ...s.eu, aktiveRoute: null } };
    }
    s = addLog(s, 'EU-Initiative abgebrochen.', 'r');
  }

  return s;
}

function resolveVorstufe(
  state: GameState,
  projekt: GesetzProjekt,
  vorstufe: AktiveVorstufe,
  vorstufeIndex: number,
  content: ContentBundle,
  complexity: number,
): GameState {
  const erfolg = nextRandom() < vorstufe.erfolgschance;
  const gesetz = state.gesetze.find(g => g.id === projekt.gesetzId);
  if (!gesetz) return state;

  const aktiveVorstufen = projekt.aktiveVorstufen.map((v, i) =>
    i === vorstufeIndex
      ? { ...v, abgeschlossen: true, ergebnis: (erfolg ? 'erfolg' : 'scheitern') as 'erfolg' | 'scheitern' }
      : v,
  );

  let boni = { ...projekt.boni };

  if (erfolg) {
    let boniAdd = VORSTUFEN_BONI[vorstufe.typ];

    if (vorstufe.typ === 'laender') {
      const laenderCount = aktiveVorstufen.filter(
        v => v.typ === 'laender' && v.ergebnis === 'erfolg',
      ).length;
      if (laenderCount >= 3) {
        boniAdd = { ...boniAdd, bundesratBonus: 20 };
      }
    }

    boni = {
      btStimmenBonus: Math.min(MAX_BT_STIMMEN_BONUS, boni.btStimmenBonus + boniAdd.btStimmenBonus),
      pkKostenRabatt: Math.min(MAX_PK_KOSTEN_RABATT, boni.pkKostenRabatt + boniAdd.pkKostenRabatt),
      kofinanzierung: Math.min(MAX_KOFINANZIERUNG, boni.kofinanzierung + boniAdd.kofinanzierung),
      bundesratBonus: Math.min(MAX_BUNDESRAT_BONUS, boni.bundesratBonus + boniAdd.bundesratBonus),
      medienRueckhalt: boni.medienRueckhalt + boniAdd.medienRueckhalt,
    };

    let s: GameState = {
      ...state,
      gesetzProjekte: {
        ...(state.gesetzProjekte ?? {}),
        [projekt.gesetzId]: {
          ...projekt,
          aktiveVorstufen,
          boni,
        },
      },
    };

    if (vorstufe.typ === 'kommunal' && vorstufe.stadttyp) {
      s = applyKommunalMilieuEffekte(s, vorstufe.stadttyp, content, complexity);
    }

    s = addLog(s, `✓ ${vorstufe.typ}-Vorstufe erfolgreich: ${gesetz.kurz} (+${boniAdd.btStimmenBonus}% BT)`, 'g');
    return s;
  } else {
    if (vorstufe.typ === 'laender' && vorstufe.fraktionId) {
      boni.btStimmenBonus = Math.max(-5, boni.btStimmenBonus - 3);
      const fraktionen = state.bundesratFraktionen?.map(f =>
        f.id === vorstufe.fraktionId ? { ...f, beziehung: Math.max(-100, f.beziehung - 8) } : f,
      ) ?? [];
      state = { ...state, bundesratFraktionen: fraktionen };
    }

    return addLog(
      {
        ...state,
        gesetzProjekte: {
          ...(state.gesetzProjekte ?? {}),
          [projekt.gesetzId]: {
            ...projekt,
            aktiveVorstufen,
            boni,
          },
        },
      },
      `✗ ${vorstufe.typ}-Vorstufe gescheitert: ${gesetz.kurz}`,
      'r',
    );
  }
}

/** Monatlicher Tick: Fortschritt aktualisieren, abgeschlossene Vorstufen auflösen */
export function tickGesetzVorstufen(
  state: GameState,
  content: ContentBundle,
  complexity: number,
): GameState {
  const hasVorstufenFeature =
    featureActive(complexity, 'kommunal_pilot') ||
    featureActive(complexity, 'laender_pilot') ||
    featureActive(complexity, 'eu_route');
  if (!hasVorstufenFeature) return state;

  let s = state;
  const projekte = s.gesetzProjekte ?? {};
  let resolved = false;

  for (const gesetzId of Object.keys(projekte)) {
    if (resolved) break;
    const projekt = s.gesetzProjekte![gesetzId];
    if (!projekt) continue;

    for (let i = 0; i < projekt.aktiveVorstufen.length; i++) {
      const vorstufe = projekt.aktiveVorstufen[i];
      if (vorstufe.abgeschlossen) continue;

      const elapsed = s.month - vorstufe.startMonat;
      const bonusMonate = s.vorstufeBonusMonate?.[gesetzId] ?? 0;
      const effektivElapsed = elapsed + bonusMonate;
      const fortschritt = Math.min(100, (effektivElapsed / vorstufe.dauerMonate) * 100);
      const updatedVorstufe = { ...vorstufe, fortschritt };

      if (fortschritt >= 100) {
        s = resolveVorstufe(s, projekt, updatedVorstufe, i, content, complexity);
        resolved = true;
        break;
      }

      const aktiveVorstufen = [...projekt.aktiveVorstufen];
      aktiveVorstufen[i] = updatedVorstufe;
      s = {
        ...s,
        gesetzProjekte: {
          ...(s.gesetzProjekte ?? {}),
          [gesetzId]: { ...projekt, aktiveVorstufen },
        },
      };
    }
  }

  return s;
}

/** Default-Boni für Einbringen (wenn kein GesetzProjekt) */
export function getVorstufenBoni(state: GameState, gesetzId: string): VorstufenBoni {
  const projekt = state.gesetzProjekte?.[gesetzId];
  return projekt?.boni ?? defaultBoni();
}
