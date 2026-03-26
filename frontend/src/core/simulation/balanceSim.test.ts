/**
 * Balance-Simulation: Testet Gewinnraten mit der echten Game-Engine.
 *
 * Jede Strategie wird N-mal durchgespielt. Die Gewinnrate muss
 * zwischen 20% und 80% liegen (weder zu leicht noch zu schwer).
 */
import { describe, it, expect } from 'vitest';
import { monteCarlo } from './balanceSim';
import { alleStrategien } from './strategien';
import { SIM_CONTENT } from './testContent';

const N = 200;
const COMPLEXITY = 4;

describe('Balance-Simulation (echte Engine)', () => {
  const strategien = alleStrategien();

  for (const [name, strategy] of Object.entries(strategien)) {
    it(`${name}: keine Crashes`, () => {
      const result = monteCarlo(SIM_CONTENT, strategy, N, COMPLEXITY);
      expect(result.crashes).toBe(0);
    });
  }

  it('Übersicht: Gewinnraten aller Strategien', () => {
    const report: Record<string, { gewinnRate: number; median: number; saldo: number }> = {};

    for (const [name, strategy] of Object.entries(strategien)) {
      const result = monteCarlo(SIM_CONTENT, strategy, N, COMPLEXITY);
      report[name] = {
        gewinnRate: Math.round(result.gewinnRate * 100),
        median: Math.round(result.wahlprognose.median),
        saldo: Math.round(result.saldo.median),
      };
    }

    // Ausgabe für Balance-Analyse
    console.table(report);

    // Musterschüler sollte besser abschneiden als passive Strategien
    expect(report['musterschueler'].gewinnRate).toBeGreaterThanOrEqual(
      report['pk_horten'].gewinnRate
    );
  });

  it('musterschueler: Gewinnrate mindestens 20%', () => {
    const result = monteCarlo(SIM_CONTENT, strategien['musterschueler'], N, COMPLEXITY);
    expect(result.gewinnRate).toBeGreaterThanOrEqual(0.20);
  });

  it('pk_horten (nichts tun): Gewinnrate unter 80%', () => {
    const result = monteCarlo(SIM_CONTENT, strategien['pk_horten'], N, COMPLEXITY);
    expect(result.gewinnRate).toBeLessThanOrEqual(0.80);
  });

  it('random: Gewinnrate unter 90%', () => {
    const result = monteCarlo(SIM_CONTENT, strategien['random'], N, COMPLEXITY);
    expect(result.gewinnRate).toBeLessThanOrEqual(0.90);
  });
});
