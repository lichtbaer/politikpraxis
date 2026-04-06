import type { GameState, Ideologie, Law, ContentBundle } from '../types';
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
import {
  applyFraming,
  getMedienPkZusatzkosten,
  adjustMedienKlimaGlobal,
  applyGesetzMedienAkteureNachBeschluss,
} from './medienklima';
import { berechneKongruenz } from '../ideologie';
import { getGesetzIdeologie, getKoalitionspartner } from './koalition';
import { kannGesetzEingebracht } from '../gesetz';
import { getKoalitionsStanz } from '../gesetzAgenda';
import { getNfBundestagBtModifikator, getNfBundestagMedienDelta } from './bundestagNf';
import { nextRandom } from '../rng';
import { checkNormenkontrollKlage } from './verfassungsgericht';
import { getIdeologieMalusFuerBt, pruefePartnerWiderstand } from './ideologiePartner';

/**
 * Berechnet das Abweichler-Risiko (0–30%) für ein Gesetz.
 * Basiert auf ideologischer Distanz Gesetz ↔ Koalitionsprofil.
 * Art. 38 GG: Freies Mandat — Abgeordnete können bei kontroversen Themen abweichen.
 */
export function berechneAbweichlerRisiko(
  gesetz: Law,
  spielerIdeologie: Ideologie,
  partnerIdeologie: Ideologie | null,
): number {
  const gesetzIdeologie = getGesetzIdeologie(gesetz);
  const kongruenz = berechneKongruenz(spielerIdeologie, gesetzIdeologie);

  // Basis: (100 - Kongruenz) / 4 → 0-25%
  let risiko = Math.max(0, (100 - kongruenz) / 4);

  // Partner-Malus: +5% wenn Partner-Kongruenz < 40
  if (partnerIdeologie) {
    const partnerKongruenz = berechneKongruenz(partnerIdeologie, gesetzIdeologie);
    if (partnerKongruenz < 40) risiko += 5;
  }

  return Math.min(30, Math.round(risiko));
}

/**
 * Fraktionssitzung einberufen: Abweichler-Risiko halbiert für ein Gesetz.
 * Kosten: 8 PK, Cooldown: 1 pro Monat.
 */
export function fraktionssitzung(state: GameState, gesetzId: string): GameState {
  const PK_KOSTEN = 8;
  if (state.pk < PK_KOSTEN) return state;
  if (state.letzteFraktionssitzungMonat === state.month) return state;

  const eg = (state.eingebrachteGesetze ?? []).find(e => e.gesetzId === gesetzId);
  if (!eg) return state;
  if (eg.fraktionssitzungGehalten) return state;

  const eingebrachteGesetze = (state.eingebrachteGesetze ?? []).map(e =>
    e.gesetzId === gesetzId ? { ...e, fraktionssitzungGehalten: true } : e,
  );

  const law = state.gesetze.find(g => g.id === gesetzId);
  let s: GameState = {
    ...state,
    pk: state.pk - PK_KOSTEN,
    eingebrachteGesetze,
    letzteFraktionssitzungMonat: state.month,
  };
  s = addLog(s, `Fraktionssitzung zu ${law?.kurz ?? gesetzId}: Abweichler-Risiko halbiert`, 'b');
  return s;
}

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
  /** SMA-390: für Medienakteur-Verteilung bei Framing */
  content?: ContentBundle;
  /** SMA-403: Nach Bestätigung im Partner-Widerstand-Modal */
  skipPartnerWiderstandCheck?: boolean;
  /** SMA-403: Bei hinweis/widerstand: Beziehungs-Malus beim Einbringen */
  partnerWiderstandKoalitionsMalus?: number;
  /** SMA-403: Modal bereits bestätigt — pendingPartnerWiderstand nicht erneut setzen */
  fromPartnerWiderstandConfirm?: boolean;
}

export interface GesetzBeschlussContext {
  milieus: { id: string; ideologie: { wirtschaft: number; gesellschaft: number; staat: number }; min_complexity: number }[];
  complexity: number;
  /** SMA-312: Gesetz-Relationen für Synergie-Berechnung */
  gesetzRelationen?: Record<string, GesetzRelation[]>;
  /** SMA-390: Medienakteure bei Beschluss */
  content?: ContentBundle;
}

export type EinbringenOptions = EinbringenContext | { pkRabatt?: number };

function isEinbringenContext(opts: EinbringenOptions | undefined): opts is EinbringenContext {
  return opts != null && 'ausrichtung' in opts && 'complexity' in opts;
}

/** SMA-344: Medienklima-Malus + Log wenn Gesetz NF-Positionen sehr nahekommt */
function applyNfBundestagMedienNachBeschluss(
  state: GameState,
  law: Law,
  complexity: number,
  content?: ContentBundle,
): GameState {
  const delta = getNfBundestagMedienDelta(law);
  if (delta >= 0) return state;
  const s = adjustMedienKlimaGlobal(state, delta, complexity, content);
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

  let baseState = state;
  if (isEinbringenContext(options) && options.fromPartnerWiderstandConfirm) {
    baseState = { ...state, pendingPartnerWiderstand: undefined };
  }

  // SMA-312: requires/excludes blockieren Einbringen
  const relationen = isEinbringenContext(options) ? options.gesetzRelationen : undefined;
  if (!kannGesetzEingebracht(baseState, lawId, relationen)) {
    return state;
  }

  // SMA-280: Verfassungsgericht-Verfahren blockiert Einbringen in betroffenen Politikfeldern
  if (isVerfassungsgerichtBlockiert(baseState, law)) {
    return state;
  }

  let workState = baseState;
  if (
    isEinbringenContext(options) &&
    featureActive(options.complexity, 'koalitionspartner') &&
    featureActive(options.complexity, 'partner_widerstand') &&
    workState.koalitionspartner?.id
  ) {
    const widerstand = pruefePartnerWiderstand(law, workState.koalitionspartner.id, options.complexity, {
      vetoErlaubt: options.complexity >= 4,
    });
    if (widerstand) {
      const skipModal = options.skipPartnerWiderstandCheck === true;
      if (widerstand.intensitaet === 'veto') {
        if (workState.partnerWiderstandVetoFreigabeGesetzId === lawId) {
          workState = { ...workState, partnerWiderstandVetoFreigabeGesetzId: undefined };
        } else if (!skipModal) {
          return {
            ...baseState,
            pendingPartnerWiderstand: {
              lawId,
              framingKey: options.framingKey ?? null,
              intensitaet: 'veto',
              koalitionsMalus: 0,
              partnerId: widerstand.partnerId,
            },
          };
        } else {
          return baseState;
        }
      } else if (!skipModal) {
        return {
          ...baseState,
          pendingPartnerWiderstand: {
            lawId,
            framingKey: options.framingKey ?? null,
            intensitaet: widerstand.intensitaet,
            koalitionsMalus: widerstand.koalitionsMalus,
            partnerId: widerstand.partnerId,
          },
        };
      } else if (options.partnerWiderstandKoalitionsMalus != null) {
        const kp = workState.koalitionspartner;
        workState = {
          ...workState,
          koalitionspartner: {
            ...kp,
            beziehung: Math.max(0, kp.beziehung + options.partnerWiderstandKoalitionsMalus),
          },
        };
      }
    }
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

  if (workState.pk < pkKosten) return state;

  // SMA-304: Einbringungs-Lag — Stufe 1: 1 Monat fix, Stufe 2+: law.einbringungsLag oder abgeleitet
  const lagMonths =
    complexity === 1
      ? 1
      : (law.einbringungsLag ?? Math.min(6, Math.max(1, Math.ceil(law.lag / 2))));
  const abstimmungMonat = workState.month + lagMonths;

  const gesetze = workState.gesetze.map((g, i) =>
    i === idx ? { ...g, status: 'eingebracht' as const } : g,
  );
  const eingebrachteGesetze = [...(workState.eingebrachteGesetze ?? []), {
    gesetzId: lawId,
    eingebrachtMonat: workState.month,
    abstimmungMonat,
    lagMonths,
  }];
  let newState: GameState = {
    ...workState,
    pk: workState.pk - pkKosten,
    gesetze,
    eingebrachteGesetze,
  };

  if (workState.gesetzProjekte?.[lawId]) {
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
    newState = applyFraming(newState, lawId, options.framingKey, options.complexity, options.content);
  }

  // SMA-330: Proaktive Erfüllung — Gesetz passt zu Minister-Agenda
  newState = checkProaktiveErfuellung(newState, lawId);

  const logMsg =
    isEinbringenContext(options) &&
    options.skipPartnerWiderstandCheck &&
    options.partnerWiderstandKoalitionsMalus != null
      ? `${law.kurz} in Bundestag eingebracht — Koalition ${options.partnerWiderstandKoalitionsMalus}`
      : `${law.kurz} in Bundestag eingebracht`;
  return addLog(newState, logMsg, 'hi');
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
  const gain = Math.floor(nextRandom() * (range.max - range.min + 1)) + range.min;
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
  const complexityBt = beschlussContext?.complexity ?? 4;
  const ideologieMalus =
    featureActive(complexityBt, 'ideologie_bt_malus')
      ? getIdeologieMalusFuerBt(law, state.spielerPartei?.id, state.koalitionspartner?.id)
      : 0;
  let koalitionStanzMalus = 0;
  if (featureActive(complexityBt, 'ideologie_bt_malus') && state.koalitionsvertragProfil && state.koalitionspartner) {
    const bundle = beschlussContext?.content;
    const partner = getKoalitionspartner(bundle, state);
    const schluesselthemen = partner.schluesselthemen ?? [];
    const stanz = getKoalitionsStanz(law, state.koalitionsvertragProfil, schluesselthemen);
    if (stanz === 'abgelehnt') {
      const kongruenz = berechneKongruenz(
        state.koalitionsvertragProfil,
        law.ideologie ?? { wirtschaft: 0, gesellschaft: 0, staat: 0 },
      );
      koalitionStanzMalus = kongruenz < 40 ? -25 : -15;
    }
  }
  const effectiveJa = Math.min(
    95,
    law.ja + partnerBonus + btBonus + vorstufenBtBonus + nfBtMod + ideologieMalus + koalitionStanzMalus,
  );

  if (effectiveJa > 50) {
    const complexity = complexityBt;
    const bundle = beschlussContext?.content;
    const bundesratAktiv = featureActive(complexity, 'bundesrat_sichtbar');
    const needsBundesrat = law.tags.includes('land') && bundesratAktiv;

    if (!needsBundesrat) {
      // Kein Bundesrat (Stufe 1) oder kein Land-Gesetz: direkt beschlossen
      const gesetze = state.gesetze.map((g, i) =>
        i === idx ? { ...g, status: 'beschlossen' as const } : g,
      );
      let newState: GameState = { ...state, gesetze };
      newState = applyGesetzKosten(newState, lawId);
      const lawForEffects = {
        effekte: law.effekte as Record<string, number>,
        lag: law.lag,
        kurz: law.kurz,
        gesetzId: law.id,
      };
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
      newState = applyNfBundestagMedienNachBeschluss(newState, law, complexity, bundle);
      if (bundle) {
        newState = applyGesetzMedienAkteureNachBeschluss(newState, law, complexity, bundle);
      }

      return addLog(newState, `${law.kurz} beschlossen — Wirkung in ${law.lag} Monaten`, 'g');
    }
    // Land-Gesetz + Bundesrat aktiv: BT passed → 3 Monate bis BR-Abstimmung, Lobbying-Fenster
    const gesetze = state.gesetze.map((g, i) =>
      i === idx
        ? { ...g, status: 'bt_passed' as const, brVoteMonth: state.month + 3 }
        : g,
    );
    let brState: GameState = { ...state, gesetze };
    brState = applyNfBundestagMedienNachBeschluss(brState, law, complexity, bundle);
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

  const complexity = beschlussContext?.complexity ?? 4;
  const ideologieMalusResolve =
    featureActive(complexity, 'ideologie_bt_malus')
      ? getIdeologieMalusFuerBt(law, state.spielerPartei?.id, state.koalitionspartner?.id)
      : 0;
  const bundle = beschlussContext?.content;

  let koalitionStanzMalusResolve = 0;
  if (featureActive(complexity, 'ideologie_bt_malus') && state.koalitionsvertragProfil && state.koalitionspartner) {
    const partner = getKoalitionspartner(bundle, state);
    const schluesselthemen = partner.schluesselthemen ?? [];
    const stanz = getKoalitionsStanz(law, state.koalitionsvertragProfil, schluesselthemen);
    if (stanz === 'abgelehnt') {
      const kongruenz = berechneKongruenz(
        state.koalitionsvertragProfil,
        law.ideologie ?? { wirtschaft: 0, gesellschaft: 0, staat: 0 },
      );
      koalitionStanzMalusResolve = kongruenz < 40 ? -25 : -15;
    }
  }

  // Fraktionsdisziplin: Abweichler-Risiko (Art. 38 GG)
  let abweichlerMalus = 0;
  if (featureActive(complexity, 'fraktionsdisziplin')) {
    const spielerIdeologie = state.koalitionsvertragProfil ?? { wirtschaft: 0, gesellschaft: 0, staat: 0 };
    const partnerIdeologie = state.koalitionspartner
      ? (state.koalitionsvertragProfil ?? null)
      : null;
    let risiko = berechneAbweichlerRisiko(law, spielerIdeologie, partnerIdeologie);
    // Fraktionssitzung halbiert das Risiko
    const egEntry = (state.eingebrachteGesetze ?? []).find(e => e.gesetzId === eg.gesetzId);
    if (egEntry?.fraktionssitzungGehalten) risiko = Math.round(risiko / 2);
    // Würfelwurf gegen Risiko
    if (risiko > 0 && nextRandom() * 100 < risiko) {
      abweichlerMalus = Math.floor(5 + nextRandom() * 8); // -5 bis -12
    }
  }

  const effectiveJa = Math.min(
    95,
    law.ja +
      partnerBonus +
      btBonus +
      vorstufenBtBonus +
      nfBtMod +
      ideologieMalusResolve +
      koalitionStanzMalusResolve -
      abweichlerMalus,
  );
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

  // Abweichler-Log wenn Malus getriggert wurde
  if (abweichlerMalus > 0) {
    newState = addLog(newState, `Abweichler in der Fraktion: ${abweichlerMalus} Stimmen verloren bei ${law.kurz}`, 'r');
  }

  if (effectiveJa > 50) {
    if (!needsBundesrat) {
      newState = applyGesetzKosten(newState, eg.gesetzId);
      const lawForEffects = {
        effekte: law.effekte as Record<string, number>,
        lag: law.lag,
        kurz: law.kurz,
        gesetzId: law.id,
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
      newState = applyNfBundestagMedienNachBeschluss(newState, law, complexity, bundle);
      if (bundle) {
        newState = applyGesetzMedienAkteureNachBeschluss(newState, law, complexity, bundle);
      }
      // Normenkontrolle: BVerfG-Klage prüfen (Art. 93 GG)
      newState = checkNormenkontrollKlage(newState, law, complexity);
      return addLog(newState, `${law.kurz} beschlossen — Wirkung in ${law.lag} Monaten`, 'g');
    }
    newState = applyNfBundestagMedienNachBeschluss(newState, law, complexity, bundle);
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
