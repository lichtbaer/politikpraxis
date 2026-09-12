/**
 * Sitzpunkt-Layout für die Parlamentsdarstellung.
 *
 * Die kanonische Darstellung eines Plenums sind einzelne Sitze auf konzentrischen
 * Bögen — nicht Tortenstücke. Drei Ringsegmente lesen sich wie ein Umfrageergebnis,
 * nicht wie ein Parlament, und verschenken die einzige Information, die die
 * Halbkreisform gegenüber einem Balken hinzufügt: wie viele Abgeordnete wo sitzen.
 */

export interface SeatPosition {
  x: number;
  y: number;
  /** Winkel in Radiant, π (links) bis 0 (rechts). */
  angle: number;
}

export interface SeatLayoutOptions {
  cx: number;
  cy: number;
  rInner: number;
  rOuter: number;
  /** Anzahl konzentrischer Reihen. */
  rows: number;
}

/**
 * Verteilt `total` Sitze auf konzentrische Bögen und liefert sie von links nach
 * rechts sortiert — in derselben Reihenfolge, in der die Fraktionen sitzen.
 *
 * Die Sitze pro Reihe wachsen mit dem Radius (außen ist mehr Platz), die Reste
 * werden so verteilt, dass die Summe exakt `total` ergibt.
 */
export function buildSeatLayout(total: number, opts: SeatLayoutOptions): SeatPosition[] {
  const { cx, cy, rInner, rOuter, rows } = opts;
  if (total <= 0 || rows <= 0) return [];

  const radii = Array.from({ length: rows }, (_, i) =>
    rows === 1 ? (rInner + rOuter) / 2 : rInner + (i * (rOuter - rInner)) / (rows - 1),
  );
  const radiusSum = radii.reduce((s, r) => s + r, 0);

  // Sitze proportional zum Radius, Restverteilung nach größtem Bruchteil.
  const exact = radii.map((r) => (r / radiusSum) * total);
  const counts = exact.map((v) => Math.floor(v));
  let rest = total - counts.reduce((s, v) => s + v, 0);
  const byFraction = exact
    .map((v, i) => ({ i, frac: v - Math.floor(v) }))
    .sort((a, b) => b.frac - a.frac);
  for (let k = 0; rest > 0; k++, rest--) {
    counts[byFraction[k % byFraction.length].i] += 1;
  }

  const seats: SeatPosition[] = [];
  radii.forEach((radius, rowIndex) => {
    const count = counts[rowIndex];
    for (let i = 0; i < count; i++) {
      // Ein Sitz in der Reihe sitzt mittig, sonst gleichmäßig von π nach 0.
      const tRel = count === 1 ? 0.5 : i / (count - 1);
      const angle = Math.PI * (1 - tRel);
      seats.push({
        x: cx + radius * Math.cos(angle),
        y: cy - radius * Math.sin(angle),
        angle,
      });
    }
  });

  // Von links (π) nach rechts (0) — das ist die Sitzordnung im Plenum.
  return seats.sort((a, b) => b.angle - a.angle);
}

/** Radius eines Sitzpunkts, damit Reihen und Nachbarn sich nicht berühren. */
export function seatRadius(opts: SeatLayoutOptions, total: number): number {
  const { rInner, rOuter, rows } = opts;
  const rowGap = rows > 1 ? (rOuter - rInner) / (rows - 1) : rOuter - rInner;
  // Bogenabstand in der innersten Reihe ist der engste Fall.
  const perRow = Math.max(1, Math.ceil(total / rows));
  const arcGap = (Math.PI * rInner) / perRow;
  return Math.max(1.2, Math.min(rowGap, arcGap) * 0.38);
}
