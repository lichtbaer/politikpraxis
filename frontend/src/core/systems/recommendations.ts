/**
 * Law recommendation scoring system.
 * Scores laws 0–100 based on KPI need, passage chance, ideological congruence,
 * and cost efficiency to help players choose which laws to introduce next.
 */
import type { Law, KPI, Ideologie } from '../types';
import { gesetzKongruenz } from '../ideologie';

/**
 * Identifies the most critical KPI needs and returns a score (0–100)
 * for how well a law's effects address those needs.
 * Weights: al > 7, hh < 0, gi > 35, zf < 50.
 */
function scoreKpiNeed(law: Law, kpi: KPI): number {
  const needs: { key: keyof KPI; weight: number; desiredDelta: number }[] = [];

  // Unemployment: lower is better — need reduction when high
  if (kpi.al > 7) {
    const severity = Math.min((kpi.al - 7) / 5, 1); // 0..1 for al 7..12
    needs.push({ key: 'al', weight: severity, desiredDelta: -1 });
  }
  // Budget: higher is better — need increase when negative
  if (kpi.hh < 0) {
    const severity = Math.min(Math.abs(kpi.hh) / 30, 1); // 0..1 for hh 0..-30
    needs.push({ key: 'hh', weight: severity, desiredDelta: 1 });
  }
  // Inequality: lower is better — need reduction when high
  if (kpi.gi > 35) {
    const severity = Math.min((kpi.gi - 35) / 15, 1); // 0..1 for gi 35..50
    needs.push({ key: 'gi', weight: severity, desiredDelta: -1 });
  }
  // Satisfaction: higher is better — need increase when low
  if (kpi.zf < 50) {
    const severity = Math.min((50 - kpi.zf) / 30, 1); // 0..1 for zf 50..20
    needs.push({ key: 'zf', weight: severity, desiredDelta: 1 });
  }

  if (needs.length === 0) {
    // All KPIs healthy — any positive effect is slightly good
    const eff = law.effekte;
    let bonus = 0;
    if ((eff.al ?? 0) < 0) bonus += 15;
    if ((eff.hh ?? 0) > 0) bonus += 15;
    if ((eff.gi ?? 0) < 0) bonus += 15;
    if ((eff.zf ?? 0) > 0) bonus += 15;
    return Math.min(bonus, 60);
  }

  const totalWeight = needs.reduce((s, n) => s + n.weight, 0);
  let score = 0;

  for (const need of needs) {
    const delta = law.effekte[need.key] ?? 0;
    // How well does the effect match the desired direction?
    const alignment = delta * need.desiredDelta; // positive = helpful
    // Normalize: a delta of +-3 is "very strong"
    const normalized = Math.min(Math.max(alignment / 3, -1), 1);
    // Convert to 0..100 scale: -1 → 0, 0 → 50, 1 → 100
    const partScore = (normalized + 1) * 50;
    score += partScore * (need.weight / totalWeight);
  }

  return Math.round(score);
}

/**
 * Score based on passage chance (ja / (ja + nein)).
 * Returns 0–100.
 */
function scorePassageChance(law: Law): number {
  const total = law.ja + law.nein;
  if (total <= 0) return 50;
  return Math.round((law.ja / total) * 100);
}

/**
 * Score based on ideological congruence with the player.
 * gesetzKongruenz already returns 0–100.
 */
function scoreCongruence(law: Law, ausrichtung: Ideologie): number {
  return gesetzKongruenz(ausrichtung, law);
}

/**
 * Score based on cost efficiency: effect magnitude per PK cost.
 * Uses the default einbringen cost of 20 PK as baseline.
 * Returns 0–100.
 */
function scoreCostEfficiency(law: Law): number {
  const eff = law.effekte;
  // Sum beneficial effect magnitudes
  // al/gi: negative is good; hh/zf: positive is good
  let benefit = 0;
  benefit += Math.max(0, -(eff.al ?? 0));
  benefit += Math.max(0, eff.hh ?? 0);
  benefit += Math.max(0, -(eff.gi ?? 0));
  benefit += Math.max(0, eff.zf ?? 0);

  // PK cost estimate (base 20, reduced by lobby_pk_kosten if available)
  const cost = law.lobby_pk_kosten ?? 20;
  if (cost <= 0) return benefit > 0 ? 100 : 50;

  // Efficiency: benefit per PK point, normalize so ~0.3 benefit/PK = 100
  const efficiency = benefit / cost;
  return Math.round(Math.min(efficiency / 0.3, 1) * 100);
}

/**
 * Compute an overall recommendation score (0–100) for a law.
 *
 * Weights:
 * - KPI need:         40%
 * - Passage chance:   30%
 * - Congruence:       20%
 * - Cost efficiency:  10%
 */
export function scoreLaw(law: Law, kpi: KPI, ausrichtung: Ideologie): number {
  const kpiScore = scoreKpiNeed(law, kpi);
  const passageScore = scorePassageChance(law);
  const congruenceScore = scoreCongruence(law, ausrichtung);
  const costScore = scoreCostEfficiency(law);

  const total =
    kpiScore * 0.4 +
    passageScore * 0.3 +
    congruenceScore * 0.2 +
    costScore * 0.1;

  return Math.round(Math.min(100, Math.max(0, total)));
}

/**
 * Returns all laws with status 'entwurf', scored and sorted descending.
 */
export function getRecommendedLaws(
  laws: Law[],
  kpi: KPI,
  ausrichtung: Ideologie,
): { law: Law; score: number }[] {
  return laws
    .filter((law) => law.status === 'entwurf')
    .map((law) => ({ law, score: scoreLaw(law, kpi, ausrichtung) }))
    .sort((a, b) => b.score - a.score);
}
