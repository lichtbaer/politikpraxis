/**
 * Balance-Report-Kernlogik (Issue #210) — reine, browser-/Node-neutrale Funktionen.
 *
 * Enthält bewusst KEIN Datei-I/O und keine Node-spezifischen APIs, damit das Modul
 * sowohl unter Vitest (jsdom) als auch über das tsx-CLI (`balanceReport.ts`) genutzt
 * und vom App-TypeScript-Programm typgeprüft werden kann.
 */
import { monteCarlo, type AggregatedResult } from '../src/core/simulation/balanceSim';
import { alleStrategien } from '../src/core/simulation/strategien';
import { SIM_CONTENT_WITH_UNLOCK_EVENTS } from '../src/core/simulation/testContent';
import { ELECTION_THRESHOLDS_BY_COMPLEXITY } from '../src/core/constants';
import type { ContentBundle } from '../src/core/types';

/**
 * SMA-269: Spieler-Agenda, die im Report standardmäßig für alle Strategien gesetzt wird —
 * spiegelt, dass ein echter Spieler im Onboarding immer eine Agenda wählt (unabhängig vom
 * Spielstil). Ohne dies bleibt die Agenda-Säule des Spielziels konstant beim Default-Wert,
 * egal welche Strategie spielt (siehe Issue #269).
 */
export const DEFAULT_REPORT_SPIELER_AGENDA = ['ag_gesetz_breit_regieren', 'ag_milieu_mitte'];

export interface ReportOptions {
  /** Anzahl Monte-Carlo-Läufe pro Strategie und Komplexität */
  n: number;
  /** Zu simulierende Komplexitätsstufen */
  complexities: number[];
  /** Seed für die globale Math.random-Ersetzung (Reproduzierbarkeit) */
  seed: number;
  /** Optionaler Strategie-Filter (Namen aus alleStrategien); leer = alle */
  strategies?: string[];
  /** Content-Bundle (Default: SIM_CONTENT_WITH_UNLOCK_EVENTS) */
  content?: ContentBundle;
  /** Spieler-Agenda-IDs, die für jeden Lauf gesetzt werden (Default: DEFAULT_REPORT_SPIELER_AGENDA) */
  spielerAgendaIds?: string[];
}

interface StrategyRow {
  strategie: string;
  ergebnis: AggregatedResult;
}

interface ComplexityBlock {
  complexity: number;
  wahlhuerde: number;
  rows: StrategyRow[];
}

export interface ReportData {
  generatedAt: string;
  n: number;
  seed: number;
  complexities: number[];
  strategienAnzahl: number;
  contentVariante: string;
  /** SMA-269: Spieler-Agenda-IDs, die für alle Läufe gesetzt wurden */
  spielerAgendaIds: string[];
  bloecke: ComplexityBlock[];
}

/**
 * Erzeugt die Report-Rohdaten, indem für jede Komplexität × Strategie eine
 * Monte-Carlo-Simulation gefahren wird. Reine Funktion (kein Datei-I/O).
 */
export function collectReportData(opts: ReportOptions): ReportData {
  const content = opts.content ?? SIM_CONTENT_WITH_UNLOCK_EVENTS;
  const alle = alleStrategien();
  const namen = opts.strategies && opts.strategies.length > 0
    ? opts.strategies.filter(name => name in alle)
    : Object.keys(alle);
  const spielerAgendaIds = opts.spielerAgendaIds ?? DEFAULT_REPORT_SPIELER_AGENDA;

  const bloecke: ComplexityBlock[] = opts.complexities.map(complexity => ({
    complexity,
    wahlhuerde: ELECTION_THRESHOLDS_BY_COMPLEXITY[complexity] ?? 0,
    rows: namen.map(strategie => ({
      strategie,
      ergebnis: monteCarlo(content, alle[strategie], opts.n, complexity, spielerAgendaIds),
    })),
  }));

  return {
    generatedAt: new Date().toISOString(),
    n: opts.n,
    seed: opts.seed,
    complexities: opts.complexities,
    strategienAnzahl: namen.length,
    contentVariante: opts.content ? 'custom' : 'SIM_CONTENT_WITH_UNLOCK_EVENTS',
    spielerAgendaIds,
    bloecke,
  };
}

const VERLUST_LABEL: Record<string, string> = {
  koalitionsbruch: 'Koalitionsbruch',
  misstrauensvotum: 'Misstrauensvotum',
  punkte: 'Punkte',
  unbekannt: 'Unbekannt',
};

const pct = (v: number) => `${(v * 100).toFixed(0)}%`;
const num = (v: number, digits = 0) => v.toFixed(digits);

const COLUMNS = [
  'Strategie',
  'Gewinnrate',
  'Wahlhürde',
  'Prognose (med)',
  'p10',
  'p90',
  'Gesamt',
  'Bilanz',
  'Agenda',
  'Urteil',
  'Saldo',
  'PK-Ende',
  'PK<10 (Mon.)',
  'Verlustgrund',
  'Crashes',
  'EngErr',
];

function rowCells(row: StrategyRow): string[] {
  const e = row.ergebnis;
  return [
    row.strategie,
    pct(e.gewinnRate),
    pct(e.wahlUeberHuerdeRate),
    num(e.wahlprognose.median, 1),
    num(e.wahlprognose.p10, 1),
    num(e.wahlprognose.p90, 1),
    num(e.gesamtpunkte.median, 1),
    num(e.bilanzPunkte.median, 1),
    num(e.agendaPunkte.median, 1),
    num(e.urteilPunkte.median, 1),
    num(e.saldo.median, 1),
    num(e.pkEnde.median),
    num(e.pkKnappeMonate.median),
    e.verlustGrund.haeufigster ? VERLUST_LABEL[e.verlustGrund.haeufigster] : '–',
    String(e.crashes),
    String(e.engineErrors),
  ];
}

/** Baut die Markdown-Repräsentation aus den Report-Rohdaten. */
export function renderMarkdown(data: ReportData): string {
  const lines: string[] = [];
  lines.push('# Balance-Report');
  lines.push('');
  lines.push('> Automatisch erzeugt via `npm run balance:report` (Issue #210).');
  lines.push('> Reproduzierbar bei gleichem Seed; keine Test-Schwellen — Schwellen bleiben in den Tests.');
  lines.push('');
  lines.push('| Parameter | Wert |');
  lines.push('|-----------|------|');
  lines.push(`| Erzeugt am | ${data.generatedAt} |`);
  lines.push(`| Läufe pro Zelle (N) | ${data.n} |`);
  lines.push(`| Seed | ${data.seed} |`);
  lines.push(`| Komplexitätsstufen | ${data.complexities.join(', ')} |`);
  lines.push(`| Strategien | ${data.strategienAnzahl} |`);
  lines.push(`| Content | ${data.contentVariante} |`);
  lines.push(`| Spieler-Agenda | ${data.spielerAgendaIds.length > 0 ? data.spielerAgendaIds.join(', ') : '(keine)'} |`);
  lines.push('');

  for (const block of data.bloecke) {
    lines.push(`## Komplexität ${block.complexity} (Wahlhürde ${block.wahlhuerde}%)`);
    lines.push('');
    lines.push(`| ${COLUMNS.join(' | ')} |`);
    lines.push(`|${COLUMNS.map(() => '---').join('|')}|`);
    for (const row of block.rows) {
      lines.push(`| ${rowCells(row).join(' | ')} |`);
    }
    lines.push('');
  }

  return lines.join('\n');
}

/** Komfort-Wrapper: Rohdaten sammeln und Markdown + JSON erzeugen. */
export function generateBalanceReport(
  opts: Partial<ReportOptions> = {},
): { markdown: string; json: ReportData } {
  const resolved: ReportOptions = {
    n: opts.n ?? 200,
    complexities: opts.complexities ?? [1, 2, 3, 4],
    seed: opts.seed ?? 42,
    strategies: opts.strategies,
    content: opts.content,
    spielerAgendaIds: opts.spielerAgendaIds,
  };
  const data = collectReportData(resolved);
  return { markdown: renderMarkdown(data), json: data };
}
