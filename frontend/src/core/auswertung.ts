/**
 * SMA-343: Legislatur-Bewertung, Spieler-Titel, Top-Gesetze nach Milieu-Impact
 */
import type { GameState, Law } from './types';

export type Gesamtnote = 'A' | 'B' | 'C' | 'D' | 'F';

export interface LegislaturBewertung {
  gesamtnote: Gesamtnote;
  dimensionen: {
    demokratie: number;
    wirtschaft: number;
    gesellschaft: number;
    kommunikation: number;
    effizienz: number;
  };
}

function clamp01(n: number): number {
  return Math.max(0, Math.min(100, Math.round(n)));
}

function noteFromScore(score: number): Gesamtnote {
  if (score >= 85) return 'A';
  if (score >= 70) return 'B';
  if (score >= 55) return 'C';
  if (score >= 40) return 'D';
  return 'F';
}

/** Gesamtnote aus Durchschnitt der fünf Dimensionen */
export function berechneLegislaturBewertung(state: GameState): LegislaturBewertung {
  const kp = state.koalitionspartner;
  const beziehung = kp?.beziehung ?? 50;
  const kv = kp?.koalitionsvertragScore ?? 50;
  const extremPos =
    state.koalitionsvertragProfil &&
    (Math.abs(state.koalitionsvertragProfil.wirtschaft) > 70 ||
      Math.abs(state.koalitionsvertragProfil.gesellschaft) > 70);

  const demokratie = clamp01(
    beziehung * 0.35 + kv * 0.35 + (extremPos ? 15 : 35) + (state.koalitionsbruchSeitMonat ? -25 : 0),
  );

  const saldo = state.haushalt?.saldo ?? 0;
  const al = state.kpi.al;
  const konj = state.haushalt?.konjunkturIndex ?? 100;
  const wirtschaft = clamp01(
    45 +
      (saldo > -5 ? 18 : saldo > -15 ? 8 : -5) +
      (al < 5 ? 15 : al < 7 ? 5 : -10) +
      (konj >= 98 ? 8 : konj < 95 ? -8 : 0),
  );

  const milieus = state.milieuZustimmung ?? {};
  const vals = Object.values(milieus);
  const milieuAvg = vals.length > 0 ? vals.reduce((a, b) => a + b, 0) / vals.length : state.zust.g;
  const gini = state.kpi.gi;
  const gesellschaft = clamp01(milieuAvg * 0.55 + (100 - Math.abs(gini - 32)) * 0.45 * 0.4);

  const mk = state.medienKlima ?? 50;
  const medienbilanz = state.legislaturBilanz?.medienbilanz;
  const kommunikation = clamp01(
    mk * 0.55 + (medienbilanz === 'gut' ? 28 : medienbilanz === 'gemischt' ? 15 : 5),
  );

  const beschlossen = state.gesetze.filter((g) => g.status === 'beschlossen').length;
  const pkV = state.pkVerbrauchtGesamt ?? 0;
  const ratio = pkV > 0 ? beschlossen / (pkV / 25) : beschlossen;
  const effizienz = clamp01(40 + Math.min(45, ratio * 12));

  const dimensionen = {
    demokratie,
    wirtschaft,
    gesellschaft,
    kommunikation,
    effizienz,
  };
  const avg =
    (demokratie + wirtschaft + gesellschaft + kommunikation + effizienz) / 5;
  return {
    gesamtnote: noteFromScore(avg),
    dimensionen,
  };
}

export interface TopGesetzEintrag {
  gesetz: Law;
  impactScore: number;
}

/** Summiert Milieu-Reaktionen pro Gesetz (Beschluss-Pfad) */
export function berechneTop3Gesetze(state: GameState): TopGesetzEintrag[] {
  const reaktionen = state.milieuGesetzReaktionen ?? {};
  const scoreByGesetz = new Map<string, number>();
  for (const [, liste] of Object.entries(reaktionen)) {
    for (const { gesetzId, delta } of liste) {
      scoreByGesetz.set(gesetzId, (scoreByGesetz.get(gesetzId) ?? 0) + Math.abs(delta));
    }
  }
  const gesetzeById = new Map(state.gesetze.map((g) => [g.id, g]));
  const entries: TopGesetzEintrag[] = [];
  for (const [id, impactScore] of scoreByGesetz) {
    const g = gesetzeById.get(id);
    if (g && g.status === 'beschlossen') entries.push({ gesetz: g, impactScore });
  }
  entries.sort((a, b) => b.impactScore - a.impactScore);
  if (entries.length >= 3) return entries.slice(0, 3);
  const beschlossen = state.gesetze.filter((x) => x.status === 'beschlossen');
  for (const g of beschlossen) {
    if (!entries.find((e) => e.gesetz.id === g.id)) {
      entries.push({ gesetz: g, impactScore: 0 });
    }
  }
  return entries.slice(0, 3);
}

export function berechneTopPolitikfeld(state: GameState): string | null {
  const beschlossen = state.gesetze.filter((g) => g.status === 'beschlossen');
  const count: Record<string, number> = {};
  for (const g of beschlossen) {
    const f = g.politikfeldId ?? 'sonstiges';
    count[f] = (count[f] ?? 0) + 1;
  }
  let best: string | null = null;
  let n = 0;
  for (const [k, v] of Object.entries(count)) {
    if (v > n) {
      n = v;
      best = k;
    }
  }
  return best;
}

/**
 * Mindestens 8 Titel; Rückgabe mit „ / “ für geschlechtsneutrale Anzeige
 */
export function berechneTitel(state: GameState): string {
  const umwelt = state.gesetze.filter(
    (g) => g.status === 'beschlossen' && g.politikfeldId === 'umwelt',
  ).length;
  if (umwelt >= 4) return 'Die Klimakanzlerin / Der Klimakanzler';

  const saldo = state.haushalt?.saldo ?? 0;
  if (saldo > -5) return 'Die Sparkommissarin / Der Sparkommissar';

  const kp = state.koalitionspartner;
  if (kp && kp.beziehung >= 80) return 'Die Koalitionsprofi / Der Koalitionsprofi';

  const beschlossen = state.gesetze.filter((g) => g.status === 'beschlossen').length;
  if (beschlossen >= 12) return 'Die Gesetzgebungsmaschine';

  const al = state.kpi.al;
  if (al < 4) return 'Die Vollbeschäftigung / Der Vollbeschäftigte';

  const mk = state.medienKlima ?? 50;
  if (mk >= 70) return 'Medienliebling / Medienliebling';

  if (state.firedEvents?.includes('koalitionsbruch')) return 'Überlebenskünstler:in';

  const prog = state.gesetze.filter(
    (g) => g.status === 'beschlossen' && g.politikfeldId === 'gesellschaft',
  ).length;
  if (prog >= 3) return 'Gesellschaftsreformer:in';

  return 'Der Pragmatiker / Die Pragmatikerin';
}

export interface MilieuDeltaRow {
  milieuId: string;
  label: string;
  start: number;
  ende: number;
  delta: number;
}

/** Gewinner/Verlierer nach Milieu-Zustimmung (Start vs. Ende) */
export function berechneMilieuBilanz(
  state: GameState,
  milieuLabel: (id: string) => string,
): { gewinner: MilieuDeltaRow[]; verlierer: MilieuDeltaRow[] } {
  const ende = state.milieuZustimmung ?? {};
  const history = state.milieuZustimmungHistory ?? {};
  const rows: MilieuDeltaRow[] = [];
  for (const id of Object.keys(ende)) {
    const hist = history[id];
    const start = hist && hist.length > 0 ? hist[0] : ende[id] ?? 50;
    const e = ende[id] ?? 50;
    rows.push({
      milieuId: id,
      label: milieuLabel(id),
      start,
      ende: e,
      delta: e - start,
    });
  }
  const sorted = [...rows].sort((a, b) => b.delta - a.delta);
  const gewinner = sorted.filter((r) => r.delta > 0).slice(0, 3);
  const verlierer = [...rows].sort((a, b) => a.delta - b.delta).filter((r) => r.delta < 0).slice(0, 3);
  return { gewinner, verlierer };
}
