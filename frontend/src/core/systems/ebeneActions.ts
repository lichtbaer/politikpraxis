/**
 * SMA-298: Ebene-Aktionen — Städtebündnis, Kommunal-Konferenz, Länder-Gipfel, Pilot beschleunigen
 */
import type { GameState } from '../types';
import { addLog } from '../engine';
import { featureActive } from './features';

/** Städtebündnis aufbauen (10 PK) — erhöht bottom-up Initiative Chance bis Jahresende */
export function staedtebuendnis(state: GameState, complexity: number): GameState {
  if (!featureActive(complexity, 'kommunal_pilot')) return state;
  if (state.pk < 10) return state;

  const jahr = Math.floor(state.month / 12) * 12;
  const bisMonat = jahr + 11;
  return addLog(
    {
      ...state,
      pk: state.pk - 10,
      staedtebuendnisBisMonat: bisMonat,
    },
    'Städtebündnis aufgebaut — erhöhte Chance für Kommunal-Initiativen.',
    'g',
  );
}

/** Kommunal-Konferenz (8 PK, 1× pro Jahr) — senkt Druck in 2 Politikfeldern mit höchstem Druck */
export function kommunalKonferenz(state: GameState, complexity: number): GameState {
  if (!featureActive(complexity, 'kommunal_pilot')) return state;
  if (state.pk < 8) return state;

  const jahr = Math.floor(state.month / 12);
  if ((state.kommunalKonferenzJahr ?? -1) >= jahr) return state;

  const druck = state.politikfeldDruck ?? {};
  const top2 = Object.entries(druck)
    .sort(([, a], [, b]) => (b ?? 0) - (a ?? 0))
    .slice(0, 2)
    .map(([id]) => id) as [string, string] | [string] | [];

  if (top2.length === 0) return state;

  const politikfeldDruck = { ...druck };
  for (const feldId of top2) {
    const current = politikfeldDruck[feldId] ?? 50;
    politikfeldDruck[feldId] = Math.max(0, current - 10);
  }

  return addLog(
    {
      ...state,
      pk: state.pk - 8,
      kommunalKonferenzJahr: jahr,
      politikfeldDruck,
    },
    'Kommunal-Konferenz — Druck in 2 Politikfeldern gesenkt.',
    'g',
  );
}

/** Länder-Gipfel einberufen (12 PK) — verbessert Bundesrat-Beziehungen */
export function laenderGipfel(state: GameState, complexity: number): GameState {
  if (!featureActive(complexity, 'laender_pilot')) return state;
  if (state.pk < 12) return state;
  if (!state.bundesratFraktionen?.length) return state;

  const fraktionen = state.bundesratFraktionen.map((f) => ({
    ...f,
    beziehung: Math.min(100, f.beziehung + 10),
  }));

  return addLog(
    {
      ...state,
      pk: state.pk - 12,
      bundesratFraktionen: fraktionen,
    },
    'Länder-Gipfel einberufen — Bundesrat-Beziehungen verbessert.',
    'g',
  );
}

/** Pilotprojekt beschleunigen (6 PK) — +1 Monat Fortschritt für aktive Vorstufe */
export function pilotBeschleunigen(
  state: GameState,
  gesetzId: string,
  typ: 'kommunal' | 'laender',
  complexity: number,
): GameState {
  if (!featureActive(complexity, 'kommunal_pilot') && !featureActive(complexity, 'laender_pilot'))
    return state;
  if (state.pk < 6) return state;

  const projekt = state.gesetzProjekte?.[gesetzId];
  if (!projekt) return state;

  const aktiveVorstufe = projekt.aktiveVorstufen.find(
    (v) => !v.abgeschlossen && v.typ === typ,
  );
  if (!aktiveVorstufe) return state;

  const vorstufeBonusMonate = { ...(state.vorstufeBonusMonate ?? {}) };
  vorstufeBonusMonate[gesetzId] = (vorstufeBonusMonate[gesetzId] ?? 0) + 1;

  const gesetz = state.gesetze.find((g) => g.id === gesetzId);
  return addLog(
    {
      ...state,
      pk: state.pk - 6,
      vorstufeBonusMonate,
    },
    `Pilotprojekt beschleunigt: ${gesetz?.kurz ?? gesetzId}`,
    'g',
  );
}
