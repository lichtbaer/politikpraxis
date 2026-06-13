/**
 * Balance-Report-CLI (Issue #210).
 *
 * Führt die Monte-Carlo-Balance-Simulation für alle Strategien aus `alleStrategien()`
 * über die Komplexitätsstufen 1–4 aus und schreibt einen Markdown-Report
 * (optional zusätzlich JSON) mit den zentralen Game-Design-Kennzahlen.
 *
 * Ausführung:
 *   npm run balance:report                       # Default: N=200, Komplexität 1-4, Seed 42
 *   npm run balance:report -- --n=25             # schnellerer Lauf (z. B. CI)
 *   npm run balance:report -- --complexity=1,4   # nur ausgewählte Stufen
 *   npm run balance:report -- --json             # zusätzlich JSON neben dem Markdown
 *   npm run balance:report -- --out=../report.md # eigener Ausgabepfad (relativ zu cwd)
 *
 * Reproduzierbarkeit: `Math.random` wird vor dem Lauf global durch einen seedbaren
 * Mulberry32-PRNG ersetzt. Dadurch werden createInitialState (rngSeed) und die
 * Math.random-Aufrufe der Strategien deterministisch — gleicher Seed ⇒ gleicher Report.
 *
 * Hinweis: Dieses File nutzt Node-APIs und wird NICHT vom App-tsc-Build typgeprüft;
 * die testbare Kernlogik liegt in `balanceReportCore.ts`.
 */
// MUSS als erster Import stehen: setzt den localStorage-Shim vor dem Laden der Engine.
import './nodeEnv';
import { writeFileSync } from 'node:fs';
import { resolve, dirname } from 'node:path';
import { fileURLToPath } from 'node:url';
import { generateBalanceReport, type ReportData } from './balanceReportCore';

/** Seedbarer Mulberry32-PRNG — identische Routine wie src/core/rng.ts. */
function mulberry32(seed: number): () => number {
  let state = seed >>> 0 || 1;
  return () => {
    let t = (state += 0x6d2b79f5);
    t = Math.imul(t ^ (t >>> 15), t | 1);
    t ^= t + Math.imul(t ^ (t >>> 7), t | 61);
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
  };
}

function parseArgs(argv: string[]): {
  n: number;
  complexities: number[];
  seed: number;
  strategies?: string[];
  out: string;
  json: boolean;
} {
  const get = (flag: string): string | undefined => {
    const entry = argv.find(a => a === `--${flag}` || a.startsWith(`--${flag}=`));
    if (!entry) return undefined;
    const eq = entry.indexOf('=');
    return eq >= 0 ? entry.slice(eq + 1) : '';
  };

  const scriptDir = dirname(fileURLToPath(import.meta.url));
  const repoRoot = resolve(scriptDir, '..', '..');
  const defaultOut = resolve(repoRoot, 'docs/entwicklung/balance-report.md');

  const nRaw = get('n');
  const seedRaw = get('seed');
  const complexityRaw = get('complexity');
  const strategiesRaw = get('strategies');
  const outRaw = get('out');

  return {
    n: nRaw ? Math.max(1, Number(nRaw)) : 200,
    complexities: complexityRaw
      ? complexityRaw.split(',').map(s => Number(s.trim())).filter(Number.isFinite)
      : [1, 2, 3, 4],
    seed: seedRaw ? Number(seedRaw) : 42,
    strategies: strategiesRaw ? strategiesRaw.split(',').map(s => s.trim()).filter(Boolean) : undefined,
    out: outRaw ? resolve(process.cwd(), outRaw) : defaultOut,
    json: get('json') !== undefined,
  };
}

function main(): void {
  const args = parseArgs(process.argv.slice(2));

  // Reproduzierbarkeit: Math.random global deterministisch machen.
  Math.random = mulberry32(args.seed);

  const start = Date.now();
  console.log(
    `Balance-Report: N=${args.n}, Komplexität ${args.complexities.join(',')}, Seed ${args.seed} …`,
  );

  // Engine-/State-Logs während des Laufs stummschalten (sonst eine Zeile pro Spiel).
  const original = { log: console.log, info: console.info, warn: console.warn, debug: console.debug };
  console.log = console.info = console.warn = console.debug = () => {};
  let markdown: string;
  let json: ReportData;
  try {
    ({ markdown, json } = generateBalanceReport({
      n: args.n,
      complexities: args.complexities,
      seed: args.seed,
      strategies: args.strategies,
    }));
  } finally {
    Object.assign(console, original);
  }

  writeFileSync(args.out, markdown + '\n', 'utf-8');
  console.log(`Markdown geschrieben: ${args.out}`);

  if (args.json) {
    const jsonOut = args.out.replace(/\.md$/, '.json');
    writeFileSync(jsonOut, JSON.stringify(json, null, 2) + '\n', 'utf-8');
    console.log(`JSON geschrieben: ${jsonOut}`);
  }

  console.log(`Fertig in ${((Date.now() - start) / 1000).toFixed(1)}s.`);
}

main();
