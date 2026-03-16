import type { Character, KPI } from '../types';

export interface ProcgenSeed {
  seed: number;
}

function seededRandom(seed: number): () => number {
  let s = seed;
  return () => {
    s = (s * 1664525 + 1013904223) & 0xffffffff;
    return (s >>> 0) / 0xffffffff;
  };
}

export function generateKPIVariation(baseKPI: KPI, seed: number): KPI {
  const rng = seededRandom(seed);
  return {
    al: +Math.max(2, Math.min(12, baseKPI.al + (rng() - 0.5) * 3)).toFixed(1) as unknown as number,
    hh: +Math.max(-2, Math.min(1.5, baseKPI.hh + (rng() - 0.5) * 1)).toFixed(1) as unknown as number,
    gi: +Math.max(25, Math.min(38, baseKPI.gi + (rng() - 0.5) * 6)).toFixed(1) as unknown as number,
    zf: +Math.max(40, Math.min(75, baseKPI.zf + (rng() - 0.5) * 20)).toFixed(0) as unknown as number,
  };
}

export function shuffleMoods(chars: Character[], seed: number): Character[] {
  const rng = seededRandom(seed);
  return chars.map(c => ({
    ...c,
    mood: Math.max(0, Math.min(4, c.mood + Math.floor((rng() - 0.4) * 3))),
    loyalty: Math.max(0, Math.min(5, c.loyalty + Math.floor((rng() - 0.4) * 2))),
  }));
}
