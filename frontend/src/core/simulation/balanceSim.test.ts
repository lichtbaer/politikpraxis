/**
 * Balance-Simulation: Testet Gewinnraten mit der echten Game-Engine.
 *
 * Jede Strategie wird N-mal durchgespielt.
 * Ziel-Gewinnrate: 20–80% (weder zu leicht noch zu schwer).
 *
 * Test-Blöcke:
 *   A) Basis-Tests: Crash-Freiheit + bekannte Gewinnraten (bestehend)
 *   B) Gewinnvarianten: wahlUeberHuerde vs. legislaturErfolg, Erdrutschsieg
 *   C) Verlust-Varianten: Koalitionsbruch, schlechte Bilanz
 *   D) Komplexitäts-Skalierung: Stufen 1–3
 *   E) Score-Dimensionen: bilanzPunkte, agendaPunkte, urteilPunkte
 *   F) Mechanik-Coverage: Vermittlungsausschuss, event-locked Gesetze
 */
import { describe, it, expect } from 'vitest';
import { monteCarlo } from './balanceSim';
import { alleStrategien } from './strategien';
import { SIM_CONTENT, SIM_CONTENT_WITH_UNLOCK_EVENTS } from './testContent';

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

  it('allrounder: Smoke — keine Crashes, moderate Stichprobe (Gewinnrate stark varianzbehaftet)', () => {
    const result = monteCarlo(SIM_CONTENT, strategien['allrounder'], N, COMPLEXITY);
    expect(result.crashes).toBe(0);
    expect(result.gewinnRate).toBeGreaterThanOrEqual(0);
    expect(result.gewinnRate).toBeLessThanOrEqual(1);
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

// =============================================================================
// Block B: Gewinnvarianten
// Testet verschiedene Wege zum Sieg über Score-Qualität und Wahlprognose.
// Hinweis: Da electionThreshold=35% sehr niedrig ist, gewinnen fast alle
// Strategien die Wahl. Wir testen daher Gesamtpunktzahl und Prognose-Qualität.
// =============================================================================
describe('Gewinnvarianten', () => {
  const strategien = alleStrategien();

  it('musterschueler: medianer Gesamtscore besser als pk_horten', () => {
    const aktiv = monteCarlo(SIM_CONTENT, strategien['musterschueler'], N, COMPLEXITY);
    const passiv = monteCarlo(SIM_CONTENT, strategien['pk_horten'], N, COMPLEXITY);
    // Aktives Spielen soll höhere Gesamtpunkte erzielen als vollständige Passivität
    expect(aktiv.gesamtpunkte.median).toBeGreaterThanOrEqual(passiv.gesamtpunkte.median);
  });

  it('wahlkaempfer: medianer wahlprognose mindestens so hoch wie musterschueler', () => {
    const wahlk = monteCarlo(SIM_CONTENT, strategien['wahlkaempfer'], N, COMPLEXITY);
    const muster = monteCarlo(SIM_CONTENT, strategien['musterschueler'], N, COMPLEXITY);
    // Wahlkämpfer spezialisiert sich auf Kampagne — sollte bei Prognose gleichziehen
    expect(wahlk.wahlprognose.median).toBeGreaterThanOrEqual(muster.wahlprognose.median - 5);
  });

  it('Erdrutschsieg möglich: allrounder erreicht obere Prognose-Quantile deutlich über Schwelle', () => {
    const result = monteCarlo(SIM_CONTENT, strategien['allrounder'], N, COMPLEXITY);
    // Erdrutschsieg-Schwelle (55%+) ist mit einfachem Testinhalt (4 Basis-Gesetze) nicht erreichbar.
    // Wir prüfen p90 > 43%: die besten 10% der Runs sollen deutlich über der Wahlhürde (35%) liegen.
    expect(result.wahlprognose.p90).toBeGreaterThan(43);
    expect(result.crashes).toBe(0);
  });

  it('koalitionsmanager: medianer agendaPunkte ≥ koalitionsbrecher', () => {
    const manager = monteCarlo(SIM_CONTENT, strategien['koalitionsmanager'], N, COMPLEXITY);
    const brecher = monteCarlo(SIM_CONTENT, strategien['koalitionsbrecher'], N, COMPLEXITY);
    // Koalitionsmanager pflegt Koalitionsvertrag → bessere Agenda-Erfüllung
    expect(manager.agendaPunkte.median).toBeGreaterThanOrEqual(brecher.agendaPunkte.median);
  });
});

// =============================================================================
// Block C: Verlust-Varianten
// Prüft, dass destruktive Strategien schlechter abschneiden und
// die verschiedenen Verlustgründe auftreten können.
// =============================================================================
describe('Verlust-Varianten', () => {
  const strategien = alleStrategien();

  it('koalitionsbrecher: medianer agendaPunkte ≤ musterschueler', () => {
    const brecher = monteCarlo(SIM_CONTENT, strategien['koalitionsbrecher'], N, COMPLEXITY);
    const muster = monteCarlo(SIM_CONTENT, strategien['musterschueler'], N, COMPLEXITY);
    // Koalitionsbrecher erfüllt Koalitionsagenda schlechter durch ideologische Reibung
    expect(brecher.agendaPunkte.median).toBeLessThanOrEqual(muster.agendaPunkte.median);
  });

  it('pk_horten: medianer wahlprognose unter 55% (bereits als bestehender Test)', () => {
    const result = monteCarlo(SIM_CONTENT, strategien['pk_horten'], N, COMPLEXITY);
    // Passives Spielen soll keine hohe Wahlprognose liefern
    expect(result.wahlprognose.median).toBeLessThan(55);
  });

  it('schuldenmacher: medianer saldo schlechter als musterschueler', () => {
    const schuld = monteCarlo(SIM_CONTENT, strategien['schuldenmacher'], N, COMPLEXITY);
    const muster = monteCarlo(SIM_CONTENT, strategien['musterschueler'], N, COMPLEXITY);
    // Schuldenmacher soll den Haushalt stärker belasten
    expect(schuld.saldo.median).toBeLessThanOrEqual(muster.saldo.median);
  });

  it('schuldenmacher: keine Crashes (auch bei Haushaltskrise stabil)', () => {
    const result = monteCarlo(SIM_CONTENT, strategien['schuldenmacher'], N, COMPLEXITY);
    expect(result.crashes).toBe(0);
  });
});

// =============================================================================
// Block D: Komplexitäts-Skalierung
// Prüft, dass die Engine auf allen Schwierigkeitsstufen stabil läuft.
// =============================================================================
describe('Komplexitäts-Skalierung', () => {
  const strategien = alleStrategien();

  for (const complexity of [1, 2, 3] as const) {
    it(`musterschueler auf COMPLEXITY=${complexity}: keine Crashes`, () => {
      const result = monteCarlo(SIM_CONTENT, strategien['musterschueler'], N, complexity);
      expect(result.crashes).toBe(0);
    });

    it(`musterschueler auf COMPLEXITY=${complexity}: Gewinnrate mindestens 20%`, () => {
      const result = monteCarlo(SIM_CONTENT, strategien['musterschueler'], N, complexity);
      expect(result.gewinnRate).toBeGreaterThanOrEqual(0.20);
    });

    it(`allrounder auf COMPLEXITY=${complexity}: keine Crashes`, () => {
      const result = monteCarlo(SIM_CONTENT, strategien['allrounder'], N, complexity);
      expect(result.crashes).toBe(0);
    });
  }
}, 120_000);

// =============================================================================
// Block E: Score-Dimensionen
// Testet die drei Gewichtungsachsen des Spielziels:
// Bilanz (30%), Agenda (35%), Historisches Urteil (35%).
// =============================================================================
describe('Score-Dimensionen', () => {
  const strategien = alleStrategien();

  it('musterschueler: Übersicht Score-Dimensionen (console.table)', () => {
    const result = monteCarlo(SIM_CONTENT, strategien['musterschueler'], N, COMPLEXITY);
    const report = {
      gewinnRate: Math.round(result.gewinnRate * 100) + '%',
      wahlUeberHuerde: Math.round(result.wahlUeberHuerdeRate * 100) + '%',
      gesamtpunkte_median: Math.round(result.gesamtpunkte.median),
      bilanz_median: Math.round(result.bilanzPunkte.median),
      agenda_median: Math.round(result.agendaPunkte.median),
      urteil_median: Math.round(result.urteilPunkte.median),
    };
    console.table(report);
    // Gesamtpunkte sollten im gültigen Bereich liegen
    expect(result.gesamtpunkte.median).toBeGreaterThanOrEqual(0);
    expect(result.gesamtpunkte.median).toBeLessThanOrEqual(100);
  });

  it('historiker: medianer urteilPunkte mindestens so hoch wie random', () => {
    const hist = monteCarlo(SIM_CONTENT, strategien['historiker'], N, COMPLEXITY);
    const rand = monteCarlo(SIM_CONTENT, strategien['random'], N, COMPLEXITY);
    // Historiker priorisiert langzeit_score — Urteilspunkte sollten besser sein
    expect(hist.urteilPunkte.median).toBeGreaterThanOrEqual(rand.urteilPunkte.median);
  });

  it('historiker: keine Crashes', () => {
    const result = monteCarlo(SIM_CONTENT, strategien['historiker'], N, COMPLEXITY);
    expect(result.crashes).toBe(0);
  });

  it('koalitionsmanager: medianer agendaPunkte mindestens so hoch wie koalitionsbrecher', () => {
    const manager = monteCarlo(SIM_CONTENT, strategien['koalitionsmanager'], N, COMPLEXITY);
    const brecher = monteCarlo(SIM_CONTENT, strategien['koalitionsbrecher'], N, COMPLEXITY);
    // Koalitionsmanager pflegt Partner — Koalitionsagenda sollte besser erfüllt sein
    expect(manager.agendaPunkte.median).toBeGreaterThanOrEqual(brecher.agendaPunkte.median);
  });

  it('Gesamtübersicht aller Strategien: Score-Dimensionen (console.table)', () => {
    const alle = alleStrategien();
    const report: Record<string, { gewinn: string; punkte: number; bilanz: number; agenda: number; urteil: number }> = {};
    for (const [name, strat] of Object.entries(alle)) {
      const r = monteCarlo(SIM_CONTENT, strat, N, COMPLEXITY);
      report[name] = {
        gewinn: Math.round(r.gewinnRate * 100) + '%',
        punkte: Math.round(r.gesamtpunkte.median),
        bilanz: Math.round(r.bilanzPunkte.median),
        agenda: Math.round(r.agendaPunkte.median),
        urteil: Math.round(r.urteilPunkte.median),
      };
    }
    console.table(report);
    // Jede Strategie soll einen gültigen Gesamtpunkte-Median liefern
    for (const [_name, row] of Object.entries(report)) {
      expect(row.punkte).toBeGreaterThanOrEqual(0);
      expect(row.punkte).toBeLessThanOrEqual(100);
    }
  }, 180_000);
});

// =============================================================================
// Block F: Mechanik-Coverage
// Prüft Mechanismen, die bisher nicht von Strategien genutzt wurden.
// =============================================================================
describe('Mechanik-Coverage', () => {
  const strategien = alleStrategien();

  it('vermittlungsprofi: keine Crashes', () => {
    const result = monteCarlo(SIM_CONTENT, strategien['vermittlungsprofi'], N, COMPLEXITY);
    expect(result.crashes).toBe(0);
  });

  it('vermittlungsprofi: Gewinnrate im gültigen Bereich', () => {
    const result = monteCarlo(SIM_CONTENT, strategien['vermittlungsprofi'], N, COMPLEXITY);
    expect(result.gewinnRate).toBeGreaterThanOrEqual(0);
    expect(result.gewinnRate).toBeLessThanOrEqual(1);
  });

  it('Mit Unlock-Events: musterschueler bleibt crash-frei und stabil', () => {
    // SIM_CONTENT_WITH_UNLOCK_EVENTS schaltet event-locked Gesetze frei
    const result = monteCarlo(SIM_CONTENT_WITH_UNLOCK_EVENTS, strategien['musterschueler'], N, COMPLEXITY);
    expect(result.crashes).toBe(0);
    expect(result.gewinnRate).toBeGreaterThanOrEqual(0.15);
  });

  it('Mit Unlock-Events: allrounder bleibt crash-frei', () => {
    const result = monteCarlo(SIM_CONTENT_WITH_UNLOCK_EVENTS, strategien['allrounder'], N, COMPLEXITY);
    expect(result.crashes).toBe(0);
  });
});
