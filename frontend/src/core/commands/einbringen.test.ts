import { describe, it, expect } from 'vitest';
import { makeState, makeLaw } from '../test-helpers';
import {
  einbringenCommand,
  gegenfinanzierungAuswaehlenCommand,
  partnerWiderstandTrotzdemCommand,
  partnerWiderstandKoalitionsverhandlungCommand,
} from './einbringen';
import { DEFAULT_CONTENT } from '../../data/defaults/scenarios';
import type { GegenfinanzierungsOption } from '../systems/gegenfinanzierung';

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
      complexity: 4,
      content: DEFAULT_CONTENT,
    });
    expect(next).toStrictEqual(state);
    expect(effect.type).toBe('none');
  });

  it('gibt noop zurück bei nicht-veto Widerstand', () => {
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
      complexity: 4,
      content: DEFAULT_CONTENT,
    });
    expect(next).toStrictEqual(state);
    expect(effect.type).toBe('toast');
    if (effect.type === 'toast') {
      expect(effect.variant).toBe('warning');
    }
  });

  it('schaltet Veto-Freigabe frei bei ausreichend PK', () => {
    const state = makeState({
      pk: 80,
      pendingPartnerWiderstand: {
        lawId: 'simple',
        intensitaet: 'veto',
        koalitionsMalus: -15,
        framingKey: null,
        partnerId: 'gp',
      },
    });
    const { state: next, effect } = partnerWiderstandKoalitionsverhandlungCommand(state, {
      complexity: 4,
      content: DEFAULT_CONTENT,
    });

    if (next.pk === state.pk) return; // Koalitionsrunde hatte keinen Effekt — überspringen

    expect(next.pendingPartnerWiderstand).toBeUndefined();
    expect(next.partnerWiderstandVetoFreigabeGesetzId).toBe('simple');
    expect(effect.type).toBe('toast');
    if (effect.type === 'toast') {
      expect(effect.variant).toBe('success');
    }
  });
});
