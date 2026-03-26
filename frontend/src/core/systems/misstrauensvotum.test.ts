import { describe, it, expect } from 'vitest';
import { checkGameEnd, buildMisstrauensvotumEvent, resolveMisstrauensvotum } from './election';
import { createInitialState } from '../state';
import { DEFAULT_CONTENT } from '../../data/defaults/scenarios';
import type { GameState } from '../types';

function makeState(overrides: Partial<GameState> = {}): GameState {
  const base = createInitialState(DEFAULT_CONTENT, 2); // Stufe 2: Feature aktiv
  return { ...base, ...overrides };
}

describe('Konstruktives Misstrauensvotum (Art. 67 GG)', () => {
  describe('checkGameEnd — Misstrauensvotum-Event', () => {
    it('erhöht lowApprovalMonths bei Zustimmung < 20%', () => {
      const state = makeState({
        month: 10,
        zust: { g: 15, arbeit: 20, mitte: 20, prog: 20 },
        lowApprovalMonths: 0,
        complexity: 2,
      });
      const result = checkGameEnd(state);
      expect(result.lowApprovalMonths).toBe(1);
      expect(result.gameOver).toBe(false);
    });

    it('triggert Misstrauensvotum-Event nach 4 Monaten (Stufe 2+)', () => {
      const state = makeState({
        month: 15,
        zust: { g: 15, arbeit: 20, mitte: 20, prog: 20 },
        lowApprovalMonths: 3, // wird auf 4 erhöht → Event
        complexity: 2,
      });
      const result = checkGameEnd(state);
      expect(result.lowApprovalMonths).toBe(4);
      expect(result.activeEvent).toBeTruthy();
      expect(result.activeEvent?.id).toBe('konstruktives_misstrauensvotum');
      expect(result.gameOver).toBe(false);
    });

    it('kein Event wenn bereits aktiv (misstrauensvotumAbgewendet)', () => {
      const state = makeState({
        month: 15,
        zust: { g: 15, arbeit: 20, mitte: 20, prog: 20 },
        lowApprovalMonths: 3,
        complexity: 2,
        misstrauensvotumAbgewendet: true,
      });
      const result = checkGameEnd(state);
      expect(result.activeEvent).toBeNull();
      expect(result.lowApprovalMonths).toBe(4);
    });

    it('Game-Over nach 6 Monaten auch mit Feature aktiv (Fallback)', () => {
      const state = makeState({
        month: 20,
        zust: { g: 15, arbeit: 20, mitte: 20, prog: 20 },
        lowApprovalMonths: 5, // wird auf 6 erhöht → Game Over
        complexity: 2,
        misstrauensvotumAbgewendet: true, // Event schon abgewendet
      });
      const result = checkGameEnd(state);
      expect(result.gameOver).toBe(true);
      expect(result.won).toBe(false);
    });

    it('Stufe 1: kein Event, direktes Game-Over nach 6 Monaten (Legacy)', () => {
      const state = makeState({
        month: 20,
        zust: { g: 15, arbeit: 20, mitte: 20, prog: 20 },
        lowApprovalMonths: 5,
        complexity: 1,
      });
      const result = checkGameEnd(state);
      expect(result.gameOver).toBe(true);
      expect(result.activeEvent).toBeNull();
    });

    it('Reset von lowApprovalMonths und misstrauensvotumAbgewendet bei Erholung', () => {
      const state = makeState({
        month: 15,
        zust: { g: 30, arbeit: 40, mitte: 40, prog: 40 },
        lowApprovalMonths: 3,
        misstrauensvotumAbgewendet: true,
        complexity: 2,
      });
      const result = checkGameEnd(state);
      expect(result.lowApprovalMonths).toBe(0);
      expect(result.misstrauensvotumAbgewendet).toBeUndefined();
    });

    it('kein Misstrauensvotum in den ersten 6 Monaten', () => {
      const state = makeState({
        month: 5,
        zust: { g: 10, arbeit: 10, mitte: 10, prog: 10 },
        lowApprovalMonths: 4,
        complexity: 2,
      });
      const result = checkGameEnd(state);
      // month <= 6: kein Check
      expect(result.gameOver).toBe(false);
      expect(result.activeEvent).toBeNull();
    });
  });

  describe('buildMisstrauensvotumEvent', () => {
    it('generiert Event mit 3 Wahlmöglichkeiten', () => {
      const state = makeState({
        month: 15,
        zust: { g: 15, arbeit: 20, mitte: 20, prog: 20 },
        coalition: 30,
      });
      const event = buildMisstrauensvotumEvent(state);

      expect(event.id).toBe('konstruktives_misstrauensvotum');
      expect(event.type).toBe('crisis');
      expect(event.choices).toHaveLength(3);
      expect(event.choices[0].key).toBe('stabilisieren');
      expect(event.choices[1].key).toBe('vertrauensfrage');
      expect(event.choices[2].key).toBe('ruecktritt');
    });

    it('enthält aktuelle Werte im Kontext', () => {
      const state = makeState({
        month: 15,
        zust: { g: 18, arbeit: 20, mitte: 20, prog: 20 },
        coalition: 25,
      });
      const event = buildMisstrauensvotumEvent(state);
      expect(event.context).toContain('18%');
    });
  });

  describe('resolveMisstrauensvotum', () => {
    it('stabilisieren: setzt lowApprovalMonths auf 0 und misstrauensvotumAbgewendet', () => {
      const state = makeState({
        lowApprovalMonths: 4,
      });
      const result = resolveMisstrauensvotum(state, 'stabilisieren');
      expect(result.lowApprovalMonths).toBe(0);
      expect(result.misstrauensvotumAbgewendet).toBe(true);
      expect(result.gameOver).toBe(false);
    });

    it('ruecktritt: Spielende', () => {
      const state = makeState({ lowApprovalMonths: 4 });
      const result = resolveMisstrauensvotum(state, 'ruecktritt');
      expect(result.gameOver).toBe(true);
      expect(result.won).toBe(false);
    });

    it('vertrauensfrage: Ergebnis abhängig von coalition', () => {
      // Bei sehr hoher coalition (100) fast immer Erfolg
      let successCount = 0;
      for (let i = 0; i < 50; i++) {
        const state = makeState({ coalition: 100, lowApprovalMonths: 4 });
        const result = resolveMisstrauensvotum(state, 'vertrauensfrage');
        if (!result.gameOver) successCount++;
      }
      // Mit coalition 100 + bis zu 20 random (Schwelle 45) sollte es fast immer klappen
      expect(successCount).toBeGreaterThan(40);

      // Bei sehr niedriger coalition (0) fast immer Scheitern
      let failCount = 0;
      for (let i = 0; i < 50; i++) {
        const state = makeState({ coalition: 10, lowApprovalMonths: 4 });
        const result = resolveMisstrauensvotum(state, 'vertrauensfrage');
        if (result.gameOver) failCount++;
      }
      expect(failCount).toBeGreaterThan(30);
    });

    it('vertrauensfrage erfolgreich: erhöht coalition um 15', () => {
      // Force high coalition for reliable success
      const state = makeState({ coalition: 80, lowApprovalMonths: 4 });
      // Run many times and check successful results
      let found = false;
      for (let i = 0; i < 100; i++) {
        const result = resolveMisstrauensvotum(state, 'vertrauensfrage');
        if (!result.gameOver) {
          expect(result.coalition).toBe(95); // 80 + 15
          expect(result.misstrauensvotumAbgewendet).toBe(true);
          found = true;
          break;
        }
      }
      expect(found).toBe(true);
    });
  });
});
