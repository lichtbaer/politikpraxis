/**
 * Balance-Simulation: Testet Gewinnraten mit der echten Game-Engine.
 *
 * Jede Strategie wird N-mal durchgespielt.
 * Ziel-Gewinnrate: 20–80% (weder zu leicht noch zu schwer).
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

    console.table(report);

    // Musterschüler sollte mindestens so gut abschneiden wie passive Strategien
    expect(report['musterschueler'].gewinnRate).toBeGreaterThanOrEqual(
      report['pk_horten'].gewinnRate
    );
  }, 120_000);

  it('musterschueler: Gewinnrate mindestens 20%', () => {
    const result = monteCarlo(SIM_CONTENT, strategien['musterschueler'], N, COMPLEXITY);
    expect(result.gewinnRate).toBeGreaterThanOrEqual(0.20);
  });

  it('pk_horten (nichts tun): mediane Wahlprognose unter 55%', () => {
    const result = monteCarlo(SIM_CONTENT, strategien['pk_horten'], N, COMPLEXITY);
    // Passives Spielen sollte keine hohe Wahlprognose liefern
    expect(result.wahlprognose.median).toBeLessThan(55);
  });

  it('random: mediane Wahlprognose unter 60%', () => {
    const result = monteCarlo(SIM_CONTENT, strategien['random'], N, COMPLEXITY);
    expect(result.wahlprognose.median).toBeLessThan(60);
  });

  it('allrounder: Gewinnrate mindestens 15%', () => {
    const result = monteCarlo(SIM_CONTENT, strategien['allrounder'], N, COMPLEXITY);
    expect(result.gewinnRate).toBeGreaterThanOrEqual(0.15);
  });

  it('medienstratege: medianer Wahlprognose besser als medienmogul', () => {
    const medien = monteCarlo(SIM_CONTENT, strategien['medienstratege'], N, COMPLEXITY);
    const mogul = monteCarlo(SIM_CONTENT, strategien['medienmogul'], N, COMPLEXITY);
    expect(medien.wahlprognose.median).toBeGreaterThanOrEqual(mogul.wahlprognose.median);
  });

  it('kabinettspfleger: Gewinnrate mindestens 20%', () => {
    const result = monteCarlo(SIM_CONTENT, strategien['kabinettspfleger'], N, COMPLEXITY);
    expect(result.gewinnRate).toBeGreaterThanOrEqual(0.20);
  });
});
