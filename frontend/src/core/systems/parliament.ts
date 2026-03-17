import type { GameState, Ideologie } from '../types';
import { scheduleEffects } from './economy';
import { addLog } from '../engine';
import { applyKongruenzEffekte, getEinbringenPkKosten } from './kongruenz';
import { applyMoodChange } from './characters';
import { applyMilieuEffekte } from './milieus';
import { setPolitikfeldBeschluss } from './politikfeldDruck';
import { applyGesetzKosten } from './haushalt';
import { getVorstufenBoni } from './gesetzLebenszyklus';
import { featureActive } from './features';
import { applyEUKofinanzierung } from './eu';

export interface EinbringenContext {
  ausrichtung: Ideologie;
  complexity: number;
}

export interface GesetzBeschlussContext {
  milieus: { id: string; ideologie: { wirtschaft: number; gesellschaft: number; staat: number }; min_complexity: number }[];
  complexity: number;
}

export type EinbringenOptions = EinbringenContext | { pkRabatt?: number };

function isEinbringenContext(opts: EinbringenOptions | undefined): opts is EinbringenContext {
  return opts != null && 'ausrichtung' in opts && 'complexity' in opts;
}

export function einbringen(
  state: GameState,
  lawId: string,
  options?: EinbringenOptions,
): GameState {
  const idx = state.gesetze.findIndex((g) => g.id === lawId);
  if (idx === -1) return state;
  const law = state.gesetze[idx];
  if (law.status !== 'entwurf') return state;

  let pkKosten: number;
  let charEffekte: Record<string, number> = {};
  const complexity = isEinbringenContext(options) ? options.complexity : 4;
  const boni = (featureActive(complexity, 'kommunal_pilot') || featureActive(complexity, 'laender_pilot'))
    ? getVorstufenBoni(state, lawId)
    : { pkKostenRabatt: 0, btStimmenBonus: 0, bundesratBonus: 0, kofinanzierung: 0 };

  if (isEinbringenContext(options)) {
    const kongruenz = applyKongruenzEffekte(state, lawId, options.ausrichtung, options.complexity);
    const basePk = getEinbringenPkKosten(kongruenz.pkModifikator);
    pkKosten = Math.max(2, basePk - boni.pkKostenRabatt);
    charEffekte = kongruenz.charEffekte;
  } else {
    const baseCost = 20;
    const rabatt = options?.pkRabatt ?? 0;
    pkKosten = Math.max(2, Math.round(baseCost * (1 - rabatt)) - boni.pkKostenRabatt);
  }

  if (state.pk < pkKosten) return state;

  const gesetze = state.gesetze.map((g, i) =>
    i === idx ? { ...g, status: 'aktiv' as const } : g,
  );
  let newState: GameState = { ...state, pk: state.pk - pkKosten, gesetze };

  if (state.gesetzProjekte?.[lawId]) {
    const projekte = newState.gesetzProjekte ?? {};
    newState = {
      ...newState,
      gesetzProjekte: {
        ...projekte,
        [lawId]: { ...projekte[lawId], status: 'bundesebene' },
      },
    };
  }

  if (Object.keys(charEffekte).length > 0) {
    newState = applyMoodChange(newState, charEffekte);
  }

  if (boni.kofinanzierung > 0) {
    newState = applyEUKofinanzierung(newState, boni.kofinanzierung);
  }

  return addLog(newState, `${law.kurz} in Bundestag eingebracht`, 'hi');
}

export function lobbying(state: GameState, lawId: string): GameState {
  const idx = state.gesetze.findIndex(g => g.id === lawId);
  if (idx === -1) return state;
  if (state.pk < 12) return state;

  const gain = Math.floor(Math.random() * 5) + 2;
  const gesetze = state.gesetze.map((g, i) => {
    if (i !== idx) return g;
    const ja = Math.min(63, g.ja + gain);
    return { ...g, ja, nein: 100 - ja };
  });

  let newState: GameState = { ...state, pk: state.pk - 12, gesetze };

  if (['ee', 'wb', 'bp'].includes(lawId)) {
    const chars = newState.chars.map(c => {
      if (c.id === 'fm' && c.mood > 0) return { ...c, mood: c.mood - 1 };
      return c;
    });
    newState = { ...newState, chars };
  }

  return addLog(newState, `Lobbying ${gesetze[idx].kurz}: Zustimmung steigt +${gain}%`, '');
}

export function abstimmen(
  state: GameState,
  lawId: string,
  beschlussContext?: GesetzBeschlussContext,
): GameState {
  const idx = state.gesetze.findIndex((g) => g.id === lawId);
  if (idx === -1) return state;
  const law = state.gesetze[idx];
  if (law.status !== 'aktiv') return state;

  const partnerBonus =
    state.koalitionspartner &&
    state.partnerPrioGesetz?.gesetzId === lawId &&
    state.month <= state.partnerPrioGesetz.bisMonat
      ? 5
      : 0;
  const btStimmenBonus = state.gesetzProjekte?.[lawId]?.boni?.btStimmenBonus ?? 0;
  const effectiveJa = Math.min(95, law.ja + partnerBonus + btStimmenBonus);

  if (effectiveJa > 50) {
    if (!law.tags.includes('land')) {
      const gesetze = state.gesetze.map((g, i) =>
        i === idx ? { ...g, status: 'beschlossen' as const } : g,
      );
      let newState: GameState = { ...state, gesetze };
      newState = applyGesetzKosten(newState, lawId);
      const lawForEffects = { effekte: law.effekte as Record<string, number>, lag: law.lag, kurz: law.kurz };
      newState = scheduleEffects(newState, lawForEffects);

      if (beschlussContext?.milieus) {
        newState = applyMilieuEffekte(newState, lawId, beschlussContext.milieus, beschlussContext.complexity);
      }
      if (law.politikfeldId) {
        newState = setPolitikfeldBeschluss(newState, law.politikfeldId);
      }

      return addLog(newState, `${law.kurz} beschlossen — Wirkung in ${law.lag} Monaten`, 'g');
    }
    // Land-Gesetz: BT passed → 3 Monate bis BR-Abstimmung, Lobbying-Fenster
    const gesetze = state.gesetze.map((g, i) =>
      i === idx
        ? { ...g, status: 'bt_passed' as const, brVoteMonth: state.month + 3, lobbyFraktionen: {} }
        : g,
    );
    return addLog(
      { ...state, gesetze },
      `${law.kurz} durch Bundestag — Bundesratsabstimmung in 3 Monaten. Lobbying möglich.`,
      'g',
    );
  } else {
    const gesetze = state.gesetze.map((g, i) =>
      i === idx ? { ...g, status: 'blockiert' as const, blockiert: 'bundestag' as const } : g,
    );
    return addLog(
      { ...state, gesetze, speed: 0 },
      `${law.kurz}: Bundestag-Mehrheit verfehlt (${law.ja}%)`,
      'r',
    );
  }
}
