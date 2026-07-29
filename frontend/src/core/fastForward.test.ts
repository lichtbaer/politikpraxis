import { describe, it, expect } from 'vitest';
import { getFastForwardStopReason } from './fastForward';
import { makeState, makeLaw } from './test-helpers';

const ENABLED = { monatszusammenfassungEnabled: true };
const DISABLED = { monatszusammenfassungEnabled: false };

describe('getFastForwardStopReason', () => {
  it('stoppt nicht, wenn nichts Nennenswertes passiert und Monatszusammenfassung aus ist', () => {
    const prev = makeState({ month: 5, speed: 2 });
    const next = makeState({ month: 6, speed: 2 });
    expect(getFastForwardStopReason(prev, next, DISABLED)).toBeNull();
  });

  it('stoppt mit "event", wenn der Tick den Speed bereits auf 0 gesetzt hat', () => {
    const prev = makeState({ month: 5, speed: 2 });
    const next = makeState({ month: 6, speed: 0 });
    expect(getFastForwardStopReason(prev, next, DISABLED)).toBe('event');
  });

  it('stoppt mit "warnung", wenn lowApprovalMonths neu die Schwelle 3 erreicht', () => {
    const prev = makeState({ month: 5, speed: 2, lowApprovalMonths: 2 });
    const next = makeState({ month: 6, speed: 2, lowApprovalMonths: 3 });
    expect(getFastForwardStopReason(prev, next, DISABLED)).toBe('warnung');
  });

  it('stoppt nicht erneut, wenn lowApprovalMonths bereits über der Schwelle war', () => {
    const prev = makeState({ month: 5, speed: 2, lowApprovalMonths: 4 });
    const next = makeState({ month: 6, speed: 2, lowApprovalMonths: 5 });
    expect(getFastForwardStopReason(prev, next, DISABLED)).toBeNull();
  });

  it('stoppt mit "abstimmung", wenn eine bt_passed-Bundesratsabstimmung aufgelöst wurde', () => {
    const law = makeLaw({ id: 'br_law', status: 'bt_passed', brVoteMonth: 6 });
    const prev = makeState({ month: 5, speed: 2, gesetze: [law] });
    const next = makeState({ month: 6, speed: 2, gesetze: [{ ...law, status: 'beschlossen' }] });
    expect(getFastForwardStopReason(prev, next, DISABLED)).toBe('abstimmung');
  });

  it('stoppt nicht für Gesetze, die unabhängig vom bt_passed-Status bleiben', () => {
    const law = makeLaw({ id: 'entwurf_law', status: 'entwurf' });
    const prev = makeState({ month: 5, speed: 2, gesetze: [law] });
    const next = makeState({ month: 6, speed: 2, gesetze: [law] });
    expect(getFastForwardStopReason(prev, next, DISABLED)).toBeNull();
  });

  it('stoppt mit "monatszusammenfassung", wenn die Einstellung aktiv ist und der Monat vorrückt', () => {
    const prev = makeState({ month: 5, speed: 2 });
    const next = makeState({ month: 6, speed: 2 });
    expect(getFastForwardStopReason(prev, next, ENABLED)).toBe('monatszusammenfassung');
  });

  it('priorisiert spezifischere Gründe vor der generischen Monatszusammenfassung', () => {
    const law = makeLaw({ id: 'br_law', status: 'bt_passed', brVoteMonth: 6 });
    const prev = makeState({ month: 5, speed: 2, gesetze: [law] });
    const next = makeState({ month: 6, speed: 2, gesetze: [{ ...law, status: 'beschlossen' }] });
    expect(getFastForwardStopReason(prev, next, ENABLED)).toBe('abstimmung');
  });
});
