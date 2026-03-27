/**
 * Datenaufbereitung für „Geplante Auswirkungen“: Monate, Gesetze mit Effekt-Arrays, Gesamteffekt.
 */
import type { KPI, PendingEffect } from '../../core/types';

export const GESETZ_FARBEN = [
  '#e74c3c',
  '#3498db',
  '#2ecc71',
  '#f39c12',
  '#9b59b6',
  '#1abc9c',
] as const;

export const KPI_EFFEKT_KEYS = ['al', 'hh', 'gi', 'zf'] as const satisfies readonly (keyof KPI)[];

export interface AuswirkungsChartGesetz {
  id: string;
  titel_de: string;
  farbe: string;
  effekte: {
    al: number[];
    hh: number[];
    gi: number[];
    zf: number[];
  };
}

export interface AuswirkungsChartDaten {
  monate: number[];
  gesetze: AuswirkungsChartGesetz[];
  gesamteffekt: {
    al: number[];
    hh: number[];
    gi: number[];
    zf: number[];
  };
}

function lawKey(eff: PendingEffect): string {
  if (eff.gesetzId != null && eff.gesetzId !== '') return eff.gesetzId;
  return `legacy:${eff.label}`;
}

function expandMonthRange(sorted: number[]): number[] {
  if (sorted.length === 0) return [];
  const min = sorted[0];
  const max = sorted[sorted.length - 1];
  const out: number[] = [];
  for (let m = min; m <= max; m++) out.push(m);
  return out;
}

/** Resolve display title: content law titel, else pending label. */
function titelForKey(
  key: string,
  labelByKey: Map<string, string>,
  getLawTitel?: (gesetzId: string) => string | undefined,
): string {
  if (key.startsWith('legacy:')) return key.slice('legacy:'.length);
  const fromLaw = getLawTitel?.(key);
  if (fromLaw != null && fromLaw !== '') return fromLaw;
  return labelByKey.get(key) ?? key;
}

/**
 * Baut Chart-Daten aus pending-Effekten. Lücken zwischen erstem und letztem Wirkungsmonat werden mit 0 gefüllt.
 */
export function buildPendingAuswirkungsChartDaten(
  pending: PendingEffect[],
  currentMonth: number,
  getLawTitel?: (gesetzId: string) => string | undefined,
): AuswirkungsChartDaten | null {
  const future = pending.filter((e) => e.month >= currentMonth);
  if (future.length === 0) return null;

  const byMonth = new Map<number, PendingEffect[]>();
  for (const eff of future) {
    const list = byMonth.get(eff.month) ?? [];
    list.push(eff);
    byMonth.set(eff.month, list);
  }

  const sortedDistinct = [...byMonth.keys()].sort((a, b) => a - b);
  const monate = expandMonthRange(sortedDistinct);

  const orderedLawKeys: string[] = [];
  const seen = new Set<string>();
  const labelByKey = new Map<string, string>();

  for (const eff of future) {
    const k = lawKey(eff);
    if (!labelByKey.has(k)) labelByKey.set(k, eff.label);
    if (!seen.has(k)) {
      seen.add(k);
      orderedLawKeys.push(k);
    }
  }

  const gesetze: AuswirkungsChartGesetz[] = orderedLawKeys.map((id, idx) => {
    const effekte = {
      al: monate.map(() => 0),
      hh: monate.map(() => 0),
      gi: monate.map(() => 0),
      zf: monate.map(() => 0),
    };

    for (const eff of future) {
      if (lawKey(eff) !== id) continue;
      const mi = monate.indexOf(eff.month);
      if (mi < 0) continue;
      if (!KPI_EFFEKT_KEYS.includes(eff.key as (typeof KPI_EFFEKT_KEYS)[number])) continue;
      effekte[eff.key][mi] += eff.delta;
    }

    return {
      id,
      titel_de: titelForKey(id, labelByKey, getLawTitel),
      farbe: GESETZ_FARBEN[idx % GESETZ_FARBEN.length],
      effekte,
    };
  });

  const gesamteffekt = {
    al: monate.map((_, i) => gesetze.reduce((s, g) => s + g.effekte.al[i], 0)),
    hh: monate.map((_, i) => gesetze.reduce((s, g) => s + g.effekte.hh[i], 0)),
    gi: monate.map((_, i) => gesetze.reduce((s, g) => s + g.effekte.gi[i], 0)),
    zf: monate.map((_, i) => gesetze.reduce((s, g) => s + g.effekte.zf[i], 0)),
  };

  return { monate, gesetze, gesamteffekt };
}

export function isGoodEffectForSpieler(key: keyof KPI, delta: number): boolean {
  if (key === 'al' || key === 'gi') return delta < 0;
  return delta > 0;
}

/** Mischt Gesetz-Basisfarbe mit semantischem Grün/Rot (AL/GI invertiert). */
export function tintBarSegmentColor(
  gesetzHex: string,
  kpiKey: keyof KPI,
  delta: number,
): string {
  if (delta === 0) return gesetzHex;
  const good = '#5a9870';
  const bad = '#c05848';
  const semantic = isGoodEffectForSpieler(kpiKey, delta) ? good : bad;
  return blendHex(semantic, gesetzHex, 0.42);
}

function blendHex(a: string, b: string, t: number): string {
  const pa = parseRgb(a);
  const pb = parseRgb(b);
  if (!pa || !pb) return a;
  const r = Math.round(pa.r + (pb.r - pa.r) * t);
  const g = Math.round(pa.g + (pb.g - pa.g) * t);
  const bl = Math.round(pa.b + (pb.b - pa.b) * t);
  return `rgb(${r},${g},${bl})`;
}

function parseRgb(hex: string): { r: number; g: number; b: number } | null {
  const h = hex.replace('#', '');
  if (h.length !== 6) return null;
  const n = parseInt(h, 16);
  if (Number.isNaN(n)) return null;
  return { r: (n >> 16) & 255, g: (n >> 8) & 255, b: n & 255 };
}
