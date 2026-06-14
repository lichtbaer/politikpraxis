/**
 * Core-Commands für das Einbringen von Gesetzen.
 *
 * Kapselt die gesamte Einbringen-Logik (Gegenfinanzierung, Framing,
 * Partner-Widerstand) ohne UI-Abhängigkeiten. Sowohl der gameStore als
 * auch die Balance-Simulation nutzen dieselben Commands — divergente
 * Codepfade zwischen Browser und Simulation werden damit vermieden.
 */

import type { GameState, ContentBundle, Ideologie } from '../types';
import type { GegenfinanzierungsOption } from '../systems/gegenfinanzierung';
import { einbringen, type EinbringenContext } from '../systems/parliament';
import {
  brauchtGegenfinanzierung,
  berechneOptionen,
  wendeGegenfinanzierungAn,
} from '../systems/gegenfinanzierung';
import { applyKongruenzEffekte, getEinbringenPkKosten } from '../systems/kongruenz';
import { getMedienPkZusatzkosten } from '../systems/medienklima';
import { getVorstufenBoni } from '../systems/gesetzLebenszyklus';
import { featureActive } from '../systems/features';
import { koalitionsrunde } from '../systems/koalition';

/** Toast-Feedback für Store-Aktionen — keine direkten UI-Importe in der Command-Schicht */
export type CommandEffect =
  | { type: 'toast'; message: string; variant: 'success' | 'info' | 'warning' | 'danger' }
  | { type: 'none' };

/** Berechnet pendingGegenfinanzierung-State ohne Toast/Store-Zugriff */
function buildPendingGFState(
  state: GameState,
  lawId: string,
  ausrichtung: Ideologie,
  complexity: number,
  content: ContentBundle,
  opts?: {
    framingKey?: string | null;
    partnerWiderstandConfirmed?: boolean;
    partnerWiderstandKoalitionsMalus?: number;
  },
): GameState {
  const law = state.gesetze.find((g) => g.id === lawId);
  if (!law) return state;

  const optionen = berechneOptionen(state, law, content, complexity);
  const kosten = Math.abs(law.kosten_laufend ?? 0) || Math.abs(law.kosten_einmalig ?? 0) / 10;
  const boni = getVorstufenBoni(state, lawId);
  const kongruenzEffekt = applyKongruenzEffekte(state, lawId, ausrichtung, complexity);
  const medienZusatz = featureActive(complexity, 'medienklima')
    ? getMedienPkZusatzkosten(state.medienKlima ?? 55)
    : 0;
  const pkKosten = Math.max(
    2,
    getEinbringenPkKosten(kongruenzEffekt.pkModifikator) - boni.pkKostenRabatt + medienZusatz,
  );

  return {
    ...state,
    pendingGegenfinanzierung: {
      gesetzId: lawId,
      optionen,
      kosten,
      pkKosten,
      ...(opts?.framingKey != null ? { framingKey: opts.framingKey } : {}),
      ...(opts?.partnerWiderstandConfirmed ? { partnerWiderstandConfirmed: true } : {}),
      ...(opts?.partnerWiderstandKoalitionsMalus !== undefined
        ? { partnerWiderstandKoalitionsMalus: opts.partnerWiderstandKoalitionsMalus }
        : {}),
    },
  };
}

// ---------------------------------------------------------------------------
// EINBRINGEN
// ---------------------------------------------------------------------------

export interface EinbringenCommandInput {
  lawId: string;
  ausrichtung: Ideologie;
  complexity: number;
  content: ContentBundle;
  framingKey?: string | null;
  skipPartnerWiderstandCheck?: boolean;
  partnerWiderstandKoalitionsMalus?: number;
  fromPartnerWiderstandConfirm?: boolean;
}

export interface EinbringenResult {
  state: GameState;
  effect: CommandEffect;
}

/**
 * Bringt ein Gesetz ein — prüft Gegenfinanzierungspflicht, Framing und
 * Partner-Widerstand-Kontext ohne Toast-Aufrufe oder Store-Zugriff.
 *
 * Mögliche Outcomes:
 * - `effect.type === 'none'` + `state.pendingGegenfinanzierung` gesetzt → GF-Modal anzeigen
 * - `effect.type === 'toast'` → Gesetz eingebracht, Store zeigt den Toast
 * - `effect.type === 'none'` ohne pendingGF → Einbringen blockiert/noop
 */
export function einbringenCommand(
  state: GameState,
  input: EinbringenCommandInput,
): EinbringenResult {
  const {
    lawId,
    ausrichtung,
    complexity,
    content,
    framingKey,
    skipPartnerWiderstandCheck,
    partnerWiderstandKoalitionsMalus,
    fromPartnerWiderstandConfirm,
  } = input;

  const law = state.gesetze.find((g) => g.id === lawId);
  if (law && featureActive(complexity, 'gegenfinanzierung') && brauchtGegenfinanzierung(law)) {
    return {
      state: buildPendingGFState(state, lawId, ausrichtung, complexity, content, { framingKey }),
      effect: { type: 'none' },
    };
  }

  const ctx: EinbringenContext = {
    ausrichtung,
    complexity,
    framingKey: framingKey ?? undefined,
    gesetzRelationen: content.gesetzRelationen,
    content,
    skipPartnerWiderstandCheck,
    partnerWiderstandKoalitionsMalus,
    fromPartnerWiderstandConfirm,
  };
  const nextState = einbringen(state, lawId, ctx);
  const newLaw = nextState.gesetze.find((g) => g.id === lawId);
  if (newLaw && newLaw.status !== 'entwurf') {
    const pkUsed = state.pk - nextState.pk;
    return {
      state: nextState,
      effect: { type: 'toast', message: `${newLaw.kurz} eingebracht (−${pkUsed} PK)`, variant: 'success' },
    };
  }
  return { state: nextState, effect: { type: 'none' } };
}

// ---------------------------------------------------------------------------
// GEGENFINANZIERUNG AUSWAEHLEN
// ---------------------------------------------------------------------------

export interface GegenfinanzierungAuswaehlenInput {
  gesetzId: string;
  option: GegenfinanzierungsOption;
  subOption?: string;
  ausrichtung: Ideologie;
  complexity: number;
  content: ContentBundle;
}

/** Verarbeitet die gewählte Gegenfinanzierungsoption und bringt das Gesetz danach ein. */
export function gegenfinanzierungAuswaehlenCommand(
  state: GameState,
  input: GegenfinanzierungAuswaehlenInput,
): { state: GameState } {
  const { gesetzId, option, subOption, ausrichtung, complexity, content } = input;
  const { pendingGegenfinanzierung } = state;
  if (!pendingGegenfinanzierung || pendingGegenfinanzierung.gesetzId !== gesetzId) return { state };

  const law = state.gesetze.find((g) => g.id === gesetzId);
  if (!law) return { state };

  const ctx: EinbringenContext = {
    ausrichtung,
    complexity,
    framingKey: pendingGegenfinanzierung.framingKey,
    gesetzRelationen: content.gesetzRelationen,
    content,
    skipPartnerWiderstandCheck: pendingGegenfinanzierung.partnerWiderstandConfirmed === true,
    partnerWiderstandKoalitionsMalus: pendingGegenfinanzierung.partnerWiderstandKoalitionsMalus,
    fromPartnerWiderstandConfirm: pendingGegenfinanzierung.partnerWiderstandConfirmed === true,
  };

  let s = wendeGegenfinanzierungAn(state, law, option, subOption, complexity, content);
  s = { ...s, pendingGegenfinanzierung: undefined };
  s = einbringen(s, gesetzId, ctx);
  return { state: s };
}

// ---------------------------------------------------------------------------
// PARTNER WIDERSTAND — TROTZDEM (hinweis / widerstand)
// ---------------------------------------------------------------------------

export interface PartnerWiderstandTrotzdemResult {
  state: GameState;
  effect: CommandEffect;
}

/**
 * Bringt ein Gesetz trotz Partner-Widerstand (nicht Veto) ein.
 * Leitet ggf. zur Gegenfinanzierungsauswahl weiter.
 */
export function partnerWiderstandTrotzdemCommand(
  state: GameState,
  input: { ausrichtung: Ideologie; complexity: number; content: ContentBundle },
): PartnerWiderstandTrotzdemResult {
  const { ausrichtung, complexity, content } = input;
  const p = state.pendingPartnerWiderstand;
  if (!p || p.intensitaet === 'veto') return { state, effect: { type: 'none' } };

  const law = state.gesetze.find((g) => g.id === p.lawId);
  if (!law) {
    return {
      state: { ...state, pendingPartnerWiderstand: undefined },
      effect: { type: 'none' },
    };
  }

  if (featureActive(complexity, 'gegenfinanzierung') && brauchtGegenfinanzierung(law)) {
    return {
      state: buildPendingGFState(
        { ...state, pendingPartnerWiderstand: undefined },
        p.lawId,
        ausrichtung,
        complexity,
        content,
        {
          framingKey: p.framingKey ?? undefined,
          partnerWiderstandConfirmed: true,
          partnerWiderstandKoalitionsMalus: p.koalitionsMalus,
        },
      ),
      effect: { type: 'none' },
    };
  }

  const ctx: EinbringenContext = {
    ausrichtung,
    complexity,
    framingKey: p.framingKey ?? undefined,
    gesetzRelationen: content.gesetzRelationen,
    content,
    skipPartnerWiderstandCheck: true,
    partnerWiderstandKoalitionsMalus: p.koalitionsMalus,
    fromPartnerWiderstandConfirm: true,
  };
  const nextState = einbringen(state, p.lawId, ctx);
  const newLaw = nextState.gesetze.find((g) => g.id === p.lawId);
  if (newLaw && newLaw.status !== 'entwurf') {
    const pkUsed = state.pk - nextState.pk;
    return {
      state: nextState,
      effect: {
        type: 'toast',
        message: `${newLaw.kurz} eingebracht (−${pkUsed} PK)`,
        variant: 'success',
      },
    };
  }
  return { state: nextState, effect: { type: 'none' } };
}

// ---------------------------------------------------------------------------
// PARTNER WIDERSTAND — KOALITIONSVERHANDLUNG (Veto)
// ---------------------------------------------------------------------------

export interface PartnerWiderstandKoalitionsverhandlungResult {
  state: GameState;
  effect: CommandEffect;
}

/**
 * Löst ein Veto des Koalitionspartners durch eine Koalitionsrunde (15 PK).
 * Bei Erfolg wird das Gesetz zur einmaligen Einbringung freigegeben.
 */
export function partnerWiderstandKoalitionsverhandlungCommand(
  state: GameState,
  input: { complexity: number; content: ContentBundle },
): PartnerWiderstandKoalitionsverhandlungResult {
  const { complexity, content } = input;
  const p = state.pendingPartnerWiderstand;
  if (!p || p.intensitaet !== 'veto') return { state, effect: { type: 'none' } };

  if (state.pk < 15) {
    return {
      state,
      effect: {
        type: 'toast',
        message: 'Nicht genug PK (15 für Koalitionsrunde).',
        variant: 'warning',
      },
    };
  }

  let s = koalitionsrunde(state, content, complexity);
  if (s.pk === state.pk) return { state, effect: { type: 'none' } };

  s = {
    ...s,
    partnerWiderstandVetoFreigabeGesetzId: p.lawId,
    pendingPartnerWiderstand: undefined,
  };
  return {
    state: s,
    effect: {
      type: 'toast',
      message: 'Koalitionsrunde abgehalten — du kannst das Gesetz jetzt einbringen.',
      variant: 'success',
    },
  };
}
