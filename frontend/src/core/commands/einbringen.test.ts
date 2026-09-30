import { describe, it, expect } from 'vitest';
import { makeState, makeLaw } from '../test-helpers';
import {
  einbringenCommand,
  gegenfinanzierungAuswaehlenCommand,
  partnerWiderstandTrotzdemCommand,
  partnerWiderstandKoalitionsverhandlungCommand,
} from './einbringen';
import { DEFAULT_CONTENT } from '../../data/defaults/scenarios';
import type { GegenfinanzierungsOption } from '../systems/economics/gegenfinanzierung';
import type { GameState, Law } from '../types';

const AUSRICHTUNG = { wirtschaft: 0, gesellschaft: 0, staat: 0 };

/** Gesetz ohne Gegenfinanzierungspflicht */
function simpleLaw() {
  return makeLaw({ id: 'simple', kurz: 'SL', kosten_laufend: 0 });
}

/** Gesetz mit GF-Pflicht (kosten_laufend < −1 Mrd.) */
function teureLaw() {
  return makeLaw({ id: 'teure', kurz: 'TL', kosten_laufend: -3 });
}

describe('einbringenCommand', () => {
  it('bringt einfaches Gesetz ein und gibt Toast-Effect zurück', () => {
    const state = makeState({
      pk: 50,
      gesetze: [simpleLaw()],
    });
    const { state: next, effect } = einbringenCommand(state, {
      lawId: 'simple',
      ausrichtung: AUSRICHTUNG,
      complexity: 1,
      content: DEFAULT_CONTENT,
    });

    const law = next.gesetze.find((g) => g.id === 'simple');
    expect(law?.status).not.toBe('entwurf');
    expect(effect.type).toBe('toast');
    if (effect.type === 'toast') {
      expect(effect.variant).toBe('success');
      expect(effect.message).toContain('SL');
    }
  });

  it('setzt pendingGegenfinanzierung wenn GF nötig (complexity >= 2)', () => {
    const state = makeState({
      pk: 50,
      gesetze: [teureLaw()],
    });
    const { state: next, effect } = einbringenCommand(state, {
      lawId: 'teure',
      ausrichtung: AUSRICHTUNG,
      complexity: 2,
      content: DEFAULT_CONTENT,
    });

    expect(next.pendingGegenfinanzierung).toBeDefined();
    expect(next.pendingGegenfinanzierung?.gesetzId).toBe('teure');
    expect(effect.type).toBe('none');
    // Gesetz bleibt im Entwurf-Status
    expect(next.gesetze.find((g) => g.id === 'teure')?.status).toBe('entwurf');
  });

  it('bringt teures Gesetz ohne GF-Check bei complexity 1 ein', () => {
    const state = makeState({
      pk: 50,
      gesetze: [teureLaw()],
    });
    const { state: next, effect } = einbringenCommand(state, {
      lawId: 'teure',
      ausrichtung: AUSRICHTUNG,
      complexity: 1,
      content: DEFAULT_CONTENT,
    });

    expect(next.pendingGegenfinanzierung).toBeUndefined();
    expect(next.gesetze.find((g) => g.id === 'teure')?.status).not.toBe('entwurf');
    expect(effect.type).toBe('toast');
  });

  it('speichert framingKey in pendingGegenfinanzierung', () => {
    const state = makeState({
      pk: 50,
      gesetze: [teureLaw()],
    });
    const { state: next } = einbringenCommand(state, {
      lawId: 'teure',
      ausrichtung: AUSRICHTUNG,
      complexity: 2,
      content: DEFAULT_CONTENT,
      framingKey: 'sicherheit',
    });

    expect(next.pendingGegenfinanzierung?.framingKey).toBe('sicherheit');
  });

  it('ist idempotent bei unbekannter gesetzId', () => {
    const state = makeState({ pk: 50 });
    const { state: next, effect } = einbringenCommand(state, {
      lawId: 'unbekannt',
      ausrichtung: AUSRICHTUNG,
      complexity: 1,
      content: DEFAULT_CONTENT,
    });

    expect(next).toStrictEqual(state);
    expect(effect.type).toBe('none');
  });
});

describe('gegenfinanzierungAuswaehlenCommand', () => {
  it('bringt Gesetz nach GF-Auswahl ein', () => {
    const base = makeState({
      pk: 50,
      gesetze: [teureLaw()],
    });
    // Erst Command aufrufen um pendingGF zu erzeugen
    const { state: withPending } = einbringenCommand(base, {
      lawId: 'teure',
      ausrichtung: AUSRICHTUNG,
      complexity: 2,
      content: DEFAULT_CONTENT,
    });
    expect(withPending.pendingGegenfinanzierung).toBeDefined();

    // Erste verfügbare Option wählen
    const optionen = withPending.pendingGegenfinanzierung!.optionen as GegenfinanzierungsOption[];
    const verfuegbar = optionen.find((o) => o.verfuegbar);
    if (!verfuegbar) return; // Kein Option verfügbar — Test überspringen

    const { state: next } = gegenfinanzierungAuswaehlenCommand(withPending, {
      gesetzId: 'teure',
      option: verfuegbar,
      ausrichtung: AUSRICHTUNG,
      complexity: 2,
      content: DEFAULT_CONTENT,
    });

    expect(next.pendingGegenfinanzierung).toBeUndefined();
    expect(next.gesetze.find((g) => g.id === 'teure')?.status).not.toBe('entwurf');
  });

  it('verändert State nicht bei falschem gesetzId', () => {
    const state = makeState({
      pendingGegenfinanzierung: {
        gesetzId: 'richtiges_gesetz',
        optionen: [],
        kosten: 2,
        pkKosten: 5,
      },
    });
    const fakeOption: GegenfinanzierungsOption = {
      key: 'schulden',
      label_de: 'Schulden',
      verfuegbar: true,
    };
    const { state: next } = gegenfinanzierungAuswaehlenCommand(state, {
      gesetzId: 'falsches_gesetz',
      option: fakeOption,
      ausrichtung: AUSRICHTUNG,
      complexity: 2,
      content: DEFAULT_CONTENT,
    });
    expect(next).toStrictEqual(state);
  });
});

describe('partnerWiderstandTrotzdemCommand', () => {
  it('gibt noop zurück wenn kein pendingPartnerWiderstand', () => {
    const state = makeState({ pk: 50, gesetze: [simpleLaw()] });
    const { state: next, effect } = partnerWiderstandTrotzdemCommand(state, {
      ausrichtung: AUSRICHTUNG,
      complexity: 1,
      content: DEFAULT_CONTENT,
    });
    expect(next).toStrictEqual(state);
    expect(effect.type).toBe('none');
  });

  it('gibt noop zurück bei Veto (wird von Koalitionsverhandlung behandelt)', () => {
    const state = makeState({
      pk: 50,
      gesetze: [simpleLaw()],
      pendingPartnerWiderstand: {
        lawId: 'simple',
        intensitaet: 'veto',
        koalitionsMalus: -10,
        framingKey: null,
        partnerId: 'gp',
      },
    });
    const { state: next, effect } = partnerWiderstandTrotzdemCommand(state, {
      ausrichtung: AUSRICHTUNG,
      complexity: 1,
      content: DEFAULT_CONTENT,
    });
    expect(next).toStrictEqual(state);
    expect(effect.type).toBe('none');
  });

  it('bringt Gesetz trotz Widerstand ein (hinweis, complexity 1)', () => {
    const state = makeState({
      pk: 50,
      gesetze: [simpleLaw()],
      pendingPartnerWiderstand: {
        lawId: 'simple',
        intensitaet: 'hinweis',
        koalitionsMalus: -5,
        framingKey: null,
        partnerId: 'gp',
      },
    });
    const { state: next, effect } = partnerWiderstandTrotzdemCommand(state, {
      ausrichtung: AUSRICHTUNG,
      complexity: 1,
      content: DEFAULT_CONTENT,
    });
    const law = next.gesetze.find((g) => g.id === 'simple');
    expect(law?.status).not.toBe('entwurf');
    expect(effect.type).toBe('toast');
  });

  it('leitet zu GF-Modal weiter bei teurem Gesetz mit Widerstand', () => {
    const state = makeState({
      pk: 50,
      gesetze: [teureLaw()],
      pendingPartnerWiderstand: {
        lawId: 'teure',
        intensitaet: 'widerstand',
        koalitionsMalus: -8,
        framingKey: null,
        partnerId: 'gp',
      },
    });
    const { state: next, effect } = partnerWiderstandTrotzdemCommand(state, {
      ausrichtung: AUSRICHTUNG,
      complexity: 2,
      content: DEFAULT_CONTENT,
    });
    expect(next.pendingGegenfinanzierung?.gesetzId).toBe('teure');
    expect(next.pendingGegenfinanzierung?.partnerWiderstandConfirmed).toBe(true);
    expect(next.pendingPartnerWiderstand).toBeUndefined();
    expect(effect.type).toBe('none');
  });
});

describe('partnerWiderstandKoalitionsverhandlungCommand', () => {
  it('gibt noop zurück wenn kein pendingPartnerWiderstand', () => {
    const state = makeState({ pk: 50 });
    const { state: next, effect } = partnerWiderstandKoalitionsverhandlungCommand(state, {
      ausrichtung: AUSRICHTUNG,
      complexity: 4,
      content: DEFAULT_CONTENT,
    });
    expect(next).toStrictEqual(state);
    expect(effect.type).toBe('none');
  });

  it('gibt noop zurück bei Hinweis (nur Widerstand/Veto bieten die Runde)', () => {
    const state = makeState({
      pk: 50,
      pendingPartnerWiderstand: {
        lawId: 'simple',
        intensitaet: 'hinweis',
        koalitionsMalus: -5,
        framingKey: null,
        partnerId: 'gp',
      },
    });
    const { state: next, effect } = partnerWiderstandKoalitionsverhandlungCommand(state, {
      ausrichtung: AUSRICHTUNG,
      complexity: 4,
      content: DEFAULT_CONTENT,
    });
    expect(next).toStrictEqual(state);
    expect(effect.type).toBe('none');
  });

  it('gibt pk_zu_wenig-Toast zurück wenn PK < 15', () => {
    const state = makeState({
      pk: 10,
      pendingPartnerWiderstand: {
        lawId: 'simple',
        intensitaet: 'veto',
        koalitionsMalus: -15,
        framingKey: null,
        partnerId: 'gp',
      },
    });
    const { state: next, effect } = partnerWiderstandKoalitionsverhandlungCommand(state, {
      ausrichtung: AUSRICHTUNG,
      complexity: 4,
      content: DEFAULT_CONTENT,
    });
    expect(next).toStrictEqual(state);
    expect(effect.type).toBe('toast');
    if (effect.type === 'toast') {
      expect(effect.variant).toBe('warning');
    }
  });

  it('Veto: Koalitionsrunde und direkt einbringen — ohne Malus', () => {
    const state = partnerState({ pk: 80, gesetze: [partnerLaw(40)] }, 'veto');
    const { state: next, effect } = partnerWiderstandKoalitionsverhandlungCommand(state, {
      ausrichtung: AUSRICHTUNG,
      complexity: 4,
      content: DEFAULT_CONTENT,
    });
    expect(next.pendingPartnerWiderstand).toBeUndefined();
    expect(next.gesetze.find((g) => g.id === 'partner')?.status).not.toBe('entwurf');
    expect(next.partnerWiderstandVetoFreigabeGesetzId).toBeUndefined();
    expect(next.koalitionspartner?.beziehung).toBe(58); // +8 Runde, kein Malus
    expect(effect.type === 'toast' && effect.variant).toBe('success');
  });

  it('Widerstand: bietet die Koalitionsrunde als Alternative zu „Trotzdem“ (−15)', () => {
    const state = partnerState({ pk: 80, gesetze: [partnerLaw(20)] }, 'widerstand');
    const runde = partnerWiderstandKoalitionsverhandlungCommand(state, {
      ausrichtung: AUSRICHTUNG,
      complexity: 3,
      content: DEFAULT_CONTENT,
    });
    expect(runde.state.gesetze.find((g) => g.id === 'partner')?.status).not.toBe('entwurf');
    expect(runde.state.koalitionspartner?.beziehung).toBe(58);

    const trotzdem = partnerWiderstandTrotzdemCommand(state, {
      ausrichtung: AUSRICHTUNG,
      complexity: 3,
      content: DEFAULT_CONTENT,
    });
    expect(trotzdem.state.koalitionspartner?.beziehung).toBe(35);
    // Veto ist nie günstiger als Widerstand: dieselbe Runde, nur ohne die „Trotzdem“-Option
    expect(runde.state.pk).toBeLessThan(trotzdem.state.pk);
  });

  it('PK reicht nach der Runde nicht fürs Einbringen → Freigabe bleibt, Hinweis', () => {
    const state = partnerState({ pk: 20, gesetze: [partnerLaw(40)] }, 'veto');
    const { state: next, effect } = partnerWiderstandKoalitionsverhandlungCommand(state, {
      ausrichtung: AUSRICHTUNG,
      complexity: 4,
      content: DEFAULT_CONTENT,
    });
    expect(next.gesetze.find((g) => g.id === 'partner')?.status).toBe('entwurf');
    expect(next.partnerWiderstandVetoFreigabeGesetzId).toBe('partner');
    expect(effect.type === 'toast' && effect.variant).toBe('info');
  });
});

/** Gesetz im Grünen-Kernthema; Ideologie +20 → Widerstand, +40 → Veto (Partner GP bei −40). */
function partnerLaw(ideologieWert: number, extra: Partial<Law> = {}): Law {
  return makeLaw({
    id: 'partner',
    kurz: 'PL',
    politikfeldId: 'umwelt_energie',
    ideologie_wert: ideologieWert,
    kosten_laufend: 0,
    ...extra,
  });
}

function partnerState(
  overrides: Partial<GameState>,
  intensitaet?: 'hinweis' | 'widerstand' | 'veto',
): GameState {
  return makeState({
    koalitionspartner: { id: 'gp', beziehung: 50, koalitionsvertragScore: 0, schluesselthemenErfuellt: [] },
    ...(intensitaet
      ? {
          pendingPartnerWiderstand: {
            lawId: 'partner',
            intensitaet,
            koalitionsMalus: intensitaet === 'veto' ? 0 : intensitaet === 'widerstand' ? -15 : -5,
            framingKey: null,
            partnerId: 'gp',
          },
        }
      : {}),
    ...overrides,
  });
}

describe('Einbringen-Reihenfolge: Partner vor Gegenfinanzierung, PK vor allem', () => {
  const teuerMitWiderstand = () => partnerLaw(20, { kosten_laufend: -3 });

  it('Partner-Modal kommt vor der Gegenfinanzierung — nichts ist schon bezahlt', () => {
    const state = partnerState({ pk: 80, gesetze: [teuerMitWiderstand()] });
    const { state: next } = einbringenCommand(state, {
      lawId: 'partner',
      ausrichtung: AUSRICHTUNG,
      complexity: 3,
      content: DEFAULT_CONTENT,
    });
    expect(next.pendingPartnerWiderstand?.intensitaet).toBe('widerstand');
    expect(next.pendingGegenfinanzierung).toBeUndefined();
    expect(next.haushalt).toStrictEqual(state.haushalt);
  });

  it('Trotzdem → Gegenfinanzierung → eingebracht: Malus und Finanzierung genau einmal', () => {
    const state = partnerState({ pk: 80, gesetze: [teuerMitWiderstand()] });
    let s = einbringenCommand(state, {
      lawId: 'partner',
      ausrichtung: AUSRICHTUNG,
      complexity: 3,
      content: DEFAULT_CONTENT,
    }).state;
    s = partnerWiderstandTrotzdemCommand(s, { ausrichtung: AUSRICHTUNG, complexity: 3, content: DEFAULT_CONTENT }).state;
    expect(s.pendingGegenfinanzierung?.gesetzId).toBe('partner');
    expect(s.pendingPartnerWiderstand).toBeUndefined();
    expect(s.koalitionspartner?.beziehung).toBe(50); // Malus erst beim Einbringen

    const schulden = s.pendingGegenfinanzierung!.optionen.find((o) => o.key === 'schulden')!;
    const res = gegenfinanzierungAuswaehlenCommand(s, {
      gesetzId: 'partner',
      option: schulden as GegenfinanzierungsOption,
      ausrichtung: AUSRICHTUNG,
      complexity: 3,
      content: DEFAULT_CONTENT,
    });
    expect(res.state.gesetze.find((g) => g.id === 'partner')?.status).not.toBe('entwurf');
    expect(res.state.pendingPartnerWiderstand).toBeUndefined();
    expect(res.state.pendingGegenfinanzierung).toBeUndefined();
    expect(res.state.koalitionspartner?.beziehung).toBe(35);
    expect(res.effect.type === 'toast' && res.effect.variant).toBe('success');
  });

  it('PK reicht nicht: kein Modal, Warnung', () => {
    const state = makeState({ pk: 1, gesetze: [teureLaw()] });
    const { state: next, effect } = einbringenCommand(state, {
      lawId: 'teure',
      ausrichtung: AUSRICHTUNG,
      complexity: 2,
      content: DEFAULT_CONTENT,
    });
    expect(next.pendingGegenfinanzierung).toBeUndefined();
    expect(effect.type === 'toast' && effect.variant).toBe('warning');
  });

  it('Gegenfinanzierung wird nicht angewandt, wenn das PK inzwischen fehlt', () => {
    const offen = einbringenCommand(makeState({ pk: 80, gesetze: [teureLaw()] }), {
      lawId: 'teure',
      ausrichtung: AUSRICHTUNG,
      complexity: 2,
      content: DEFAULT_CONTENT,
    }).state;
    const knapp = { ...offen, pk: 1 };
    const schulden = knapp.pendingGegenfinanzierung!.optionen.find((o) => o.key === 'schulden')!;
    const res = gegenfinanzierungAuswaehlenCommand(knapp, {
      gesetzId: 'teure',
      option: schulden as GegenfinanzierungsOption,
      ausrichtung: AUSRICHTUNG,
      complexity: 2,
      content: DEFAULT_CONTENT,
    });
    expect(res.state.haushalt).toStrictEqual(knapp.haushalt);
    expect(res.state.gesetze.find((g) => g.id === 'teure')?.status).toBe('entwurf');
    expect(res.state.pendingGegenfinanzierung).toBeUndefined();
    expect(res.effect.type === 'toast' && res.effect.variant).toBe('warning');
  });
});
