import type { GameState, Ideologie, Law } from '../types';
import type { GesetzRelation } from '../types';
import { withPause } from '../eventPause';
import { scheduleEffects } from './economy';
import { addLog } from '../engine';
import { applyKongruenzEffekte, getEinbringenPkKosten } from './kongruenz';
import { applyMoodChange } from './characters';
import { applyMilieuEffekte } from './milieus';
import { setPolitikfeldBeschluss } from './politikfeldDruck';
import { applyGesetzKosten } from './haushalt';
import { checkProaktiveErfuellung } from './ministerAgenden';
import { getVorstufenBoni } from './gesetzLebenszyklus';
import { featureActive } from './features';
import { applyEUKofinanzierung } from './eu';
import { applyFraming, getMedienPkZusatzkosten } from './medienklima';
import { berechneKongruenz } from '../ideologie';
import { getGesetzIdeologie } from './koalition';
import { kannGesetzEingebracht } from '../gesetz';
import { getNfBundestagBtModifikator, getNfBundestagMedienDelta } from './bundestagNf';

/** SMA-307: Berechnet effektive BT-Stimmen aus Koalitions-Kongruenz (dynamisch statt statisch). */
export function berechneEffektiveBTStimmen(
  gesetz: Law,
  basis: number,
  spielerIdeologie: Ideologie,
  koalitionspartnerIdeologie: Ideologie | null,
): number {
  const gesetzIdeologie = getGesetzIdeologie(gesetz);

  const spielerKongruenz = berechneKongruenz(spielerIdeologie, gesetzIdeologie);
  const spielerBonus = (spielerKongruenz - 50) / 5;

  const partnerBonus = koalitionspartnerIdeologie
    ? (berechneKongruenz(koalitionspartnerIdeologie, gesetzIdeologie) - 50) / 12
    : 0;

  return Math.max(20, Math.min(90, Math.round(basis + spielerBonus + partnerBonus)));
}

export interface EinbringenContext {
  ausrichtung: Ideologie;
  complexity: number;
  /** Optional: Framing-Key beim Einbringen (SMA-277) */
  framingKey?: string | null;
  /** SMA-312: Gesetz-Relationen für requires/excludes-Prüfung */
  gesetzRelationen?: Record<string, GesetzRelation[]>;
}

export interface GesetzBeschlussContext {
  milieus: { id: string; ideologie: { wirtschaft: number; gesellschaft: number; staat: number }; min_complexity: number }[];
  complexity: number;
  /** SMA-312: Gesetz-Relationen für Synergie-Berechnung */
  gesetzRelationen?: Record<string, GesetzRelation[]>;
}

export type EinbringenOptions = EinbringenContext | { pkRabatt?: number };

function isEinbringenContext(opts: EinbringenOptions | undefined): opts is EinbringenContext {
  return opts != null && 'ausrichtung' in opts && 'complexity' in opts;
}

/** SMA-344: Medienklima-Malus + Log wenn Gesetz NF-Positionen sehr nahekommt */
function applyNfBundestagMedienNachBeschluss(state: GameState, law: Law): GameState {
  const delta = getNfBundestagMedienDelta(law);
  if (delta >= 0) return state;
  const mk = Math.max(0, Math.min(100, (state.medienKlima ?? 55) + delta));
  const s = { ...state, medienKlima: mk };
  return addLog(s, 'game:bundestag.logNfMedienkritik', 'r');
}

/** SMA-280: Prüft ob Einbringen durch Verfassungsgericht-Verfahren blockiert ist */
export function isVerfassungsgerichtBlockiert(state: GameState, law: { politikfeldId?: string | null }): boolean {
  return !!(
    state.verfassungsgerichtAktiv &&
    !state.verfassungsgerichtPausiert &&
    state.verfassungsgerichtPolitikfeldIds?.length &&
    law.politikfeldId &&
    state.verfassungsgerichtPolitikfeldIds.includes(law.politikfeldId)
  );
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

  // SMA-312: requires/excludes blockieren Einbringen
  const relationen = isEinbringenContext(options) ? options.gesetzRelationen : undefined;
  if (!kannGesetzEingebracht(state, lawId, relationen)) {
    return state;
  }

  // SMA-280: Verfassungsgericht-Verfahren blockiert Einbringen in betroffenen Politikfeldern
  if (isVerfassungsgerichtBlockiert(state, law)) {
    return state;
  }

  let pkKosten: number;
  let charEffekte: Record<string, number> = {};
  const complexity = isEinbringenContext(options) ? options.complexity : 4;
  const boni = (featureActive(complexity, 'kommunal_pilot') || featureActive(complexity, 'laender_pilot'))
    ? getVorstufenBoni(state, lawId)
    : { pkKostenRabatt: 0, btStimmenBonus: 0, bundesratBonus: 0, kofinanzierung: 0 };

  if (isEinbringenContext(options)) {
    const kongruenz = applyKongruenzEffekte(state, lawId, options.ausrichtung, options.complexity);
    const basePk = getEinbringenPkKosten(kongruenz.pkModifikator);
    const medienZusatz = featureActive(options.complexity, 'medienklima')
      ? getMedienPkZusatzkosten(state.medienKlima ?? 55)
      : 0;
    pkKosten = Math.max(2, basePk - boni.pkKostenRabatt + medienZusatz);
    charEffekte = kongruenz.charEffekte;
  } else {
    const baseCost = 20;
    const rabatt = options?.pkRabatt ?? 0;
    pkKosten = Math.max(2, Math.round(baseCost * (1 - rabatt)) - boni.pkKostenRabatt);
  }

  if (state.pk < pkKosten) return state;

  // SMA-304: Einbringungs-Lag — Stufe 1: 1 Monat fix, Stufe 2+: law.einbringungsLag oder abgeleitet
  const lagMonths =
    complexity === 1
      ? 1
      : (law.einbringungsLag ?? Math.min(6, Math.max(1, Math.ceil(law.lag / 2))));
  const abstimmungMonat = state.month + lagMonths;

  const gesetze = state.gesetze.map((g, i) =>
    i === idx ? { ...g, status: 'eingebracht' as const } : g,
  );
  const eingebrachteGesetze = [...(state.eingebrachteGesetze ?? []), {
    gesetzId: lawId,
    eingebrachtMonat: state.month,
    abstimmungMonat,
    lagMonths,
  }];
  let newState: GameState = {
    ...state,
    pk: state.pk - pkKosten,
    gesetze,
    eingebrachteGesetze,
  };

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

  if (isEinbringenContext(options) && options.framingKey) {
    newState = applyFraming(newState, lawId, options.framingKey, options.complexity);
  }

  // SMA-330: Proaktive Erfüllung — Gesetz passt zu Minister-Agenda
  newState = checkProaktiveErfuellung(newState, lawId);

  return addLog(newState, `${law.kurz} in Bundestag eingebracht`, 'hi');
}

export function lobbying(state: GameState, lawId: string): GameState {
  const idx = state.gesetze.findIndex(g => g.id === lawId);
  if (idx === -1) return state;
  const law = state.gesetze[idx];
  const lobbyPkKosten = law.lobby_pk_kosten ?? 12;
  if (state.pk < lobbyPkKosten) return state;
  // SMA-304: Lobbying auch während Ausschussphase (eingebracht)
  if (law.status !== 'entwurf' && law.status !== 'aktiv' && law.status !== 'eingebracht') return state;

  const range = law.lobby_gain_range ?? { min: 2, max: 6 };
  const gain = Math.floor(Math.random() * (range.max - range.min + 1)) + range.min;
  const gesetze = state.gesetze.map((g, i) => {
    if (i !== idx) return g;
    const ja = Math.min(90, g.ja + gain);
    return { ...g, ja, nein: 100 - ja };
  });

  let newState: GameState = { ...state, pk: state.pk - lobbyPkKosten, gesetze };

  const lobbyMoodEffekte = law.lobby_mood_effekte ?? {};
  if (Object.keys(lobbyMoodEffekte).length > 0) {
    const chars = newState.chars.map(c => {
      const delta = lobbyMoodEffekte[c.id];
      if (delta != null && c.mood > 0) return { ...c, mood: c.mood + delta };
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
  const btBonus =
    state.btStimmenBonus &&
    state.month <= state.btStimmenBonus.bisMonat
      ? state.btStimmenBonus.pct
      : 0;
  const vorstufenBtBonus = state.gesetzProjekte?.[lawId]?.boni?.btStimmenBonus ?? 0;
  const nfBtMod = getNfBundestagBtModifikator(law);
  const effectiveJa = Math.min(95, law.ja + partnerBonus + btBonus + vorstufenBtBonus + nfBtMod);

  if (effectiveJa > 50) {
    const complexity = beschlussContext?.complexity ?? 4;
    const bundesratAktiv = featureActive(complexity, 'bundesrat_sichtbar');
    const needsBundesrat = law.tags.includes('land') && bundesratAktiv;

    if (!needsBundesrat) {
      // Kein Bundesrat (Stufe 1) oder kein Land-Gesetz: direkt beschlossen
      const gesetze = state.gesetze.map((g, i) =>
        i === idx ? { ...g, status: 'beschlossen' as const } : g,
      );
      let newState: GameState = { ...state, gesetze };
      newState = applyGesetzKosten(newState, lawId);
      const lawForEffects = { effekte: law.effekte as Record<string, number>, lag: law.lag, kurz: law.kurz };
      newState = scheduleEffects(newState, lawForEffects);

      if (beschlussContext?.milieus) {
        newState = applyMilieuEffekte(
          newState,
          lawId,
          beschlussContext.milieus,
          beschlussContext.complexity,
          beschlussContext.gesetzRelationen,
        );
      }
      if (law.politikfeldId) {
        newState = setPolitikfeldBeschluss(newState, law.politikfeldId);
      }
      // SMA-330: Proaktive Erfüllung bei Beschluss
      newState = checkProaktiveErfuellung(newState, lawId);
      newState = applyNfBundestagMedienNachBeschluss(newState, law);

      return addLog(newState, `${law.kurz} beschlossen — Wirkung in ${law.lag} Monaten`, 'g');
    }
    // Land-Gesetz + Bundesrat aktiv: BT passed → 3 Monate bis BR-Abstimmung, Lobbying-Fenster
    const gesetze = state.gesetze.map((g, i) =>
      i === idx
        ? { ...g, status: 'bt_passed' as const, brVoteMonth: state.month + 3 }
        : g,
    );
    let brState: GameState = { ...state, gesetze };
    brState = applyNfBundestagMedienNachBeschluss(brState, law);
    return addLog(
      brState,
      `${law.kurz} durch Bundestag — Bundesratsabstimmung in 3 Monaten. Lobbying möglich.`,
      'g',
    );
  } else {
    const gesetze = state.gesetze.map((g, i) =>
      i === idx ? { ...g, status: 'blockiert' as const, blockiert: 'bundestag' as const } : g,
    );
    return addLog(
      { ...state, gesetze, ...withPause(state) },
      `${law.kurz}: Bundestag-Mehrheit verfehlt (${law.ja}%)`,
      'r',
    );
  }
}

/** SMA-304: Führt Abstimmung für eingebrachtes Gesetz durch (aufgerufen im Tick) */
export function resolveEingebrachteAbstimmung(
  state: GameState,
  eg: { gesetzId: string },
  beschlussContext?: GesetzBeschlussContext,
): GameState {
  if (!eg.gesetzId) return state;
  const idx = state.gesetze.findIndex((g) => g.id === eg.gesetzId);
  if (idx === -1) {
    // Gesetz existiert nicht (mehr) — eingebrachten Eintrag entfernen
    const eingebrachteGesetze = (state.eingebrachteGesetze ?? []).filter(
      (e) => e.gesetzId !== eg.gesetzId,
    );
    return { ...state, eingebrachteGesetze };
  }
  const law = state.gesetze[idx];
  if (law.status !== 'eingebracht') return state;

  const partnerBonus =
    state.koalitionspartner &&
    state.partnerPrioGesetz?.gesetzId === eg.gesetzId &&
    state.month <= state.partnerPrioGesetz.bisMonat
      ? 5
      : 0;
  const btBonus =
    state.btStimmenBonus && state.month <= state.btStimmenBonus.bisMonat
      ? state.btStimmenBonus.pct
      : 0;
  const vorstufenBtBonus = state.gesetzProjekte?.[eg.gesetzId]?.boni?.btStimmenBonus ?? 0;
  const nfBtMod = getNfBundestagBtModifikator(law);
  const effectiveJa = Math.min(95, law.ja + partnerBonus + btBonus + vorstufenBtBonus + nfBtMod);

  const complexity = beschlussContext?.complexity ?? 4;
  const bundesratAktiv = featureActive(complexity, 'bundesrat_sichtbar');
  const needsBundesrat = law.tags.includes('land') && bundesratAktiv;

  const gesetze = state.gesetze.map((g, i) => {
    if (i !== idx) return g;
    if (effectiveJa > 50) {
      if (!needsBundesrat) {
        return { ...g, status: 'beschlossen' as const };
      }
      return {
        ...g,
        status: 'bt_passed' as const,
        brVoteMonth: state.month + 3,
      };
    }
    return { ...g, status: 'blockiert' as const, blockiert: 'bundestag' as const };
  });

  const eingebrachteGesetze = (state.eingebrachteGesetze ?? []).filter(
    (e) => e.gesetzId !== eg.gesetzId,
  );
  let newState: GameState = { ...state, gesetze, eingebrachteGesetze };

  if (effectiveJa > 50) {
    if (!needsBundesrat) {
      newState = applyGesetzKosten(newState, eg.gesetzId);
      const lawForEffects = {
        effekte: law.effekte as Record<string, number>,
        lag: law.lag,
        kurz: law.kurz,
      };
      newState = scheduleEffects(newState, lawForEffects);
      if (beschlussContext?.milieus) {
        newState = applyMilieuEffekte(
          newState,
          eg.gesetzId,
          beschlussContext.milieus,
          beschlussContext.complexity,
          beschlussContext.gesetzRelationen,
        );
      }
      if (law.politikfeldId) {
        newState = setPolitikfeldBeschluss(newState, law.politikfeldId);
      }
      // SMA-330: Proaktive Erfüllung bei Beschluss
      newState = checkProaktiveErfuellung(newState, eg.gesetzId);
      newState = applyNfBundestagMedienNachBeschluss(newState, law);
      return addLog(newState, `${law.kurz} beschlossen — Wirkung in ${law.lag} Monaten`, 'g');
    }
    newState = applyNfBundestagMedienNachBeschluss(newState, law);
    return addLog(
      newState,
      `${law.kurz} durch Bundestag — Bundesratsabstimmung in 3 Monaten. Lobbying möglich.`,
      'g',
    );
  }
  return addLog(
    { ...newState, ...withPause(state) },
    `${law.kurz}: Bundestag-Mehrheit verfehlt (${law.ja}%)`,
    'r',
  );
}
