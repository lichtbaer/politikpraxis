/**
 * Deterministischer Pseudo-Zufallsgenerator (PRNG) auf Basis von Mulberry32.
 *
 * Verwendung:
 *   seedRng(state.rngSeed + state.month * 1_000_003);
 *   const value = nextRandom();   // [0, 1)
 *
 * Durch das Seeden am Anfang jedes Ticks mit (seed + month) ist
 * jeder Spielmonat vollständig reproduzierbar — Voraussetzung für Replay und Tests.
 */

let _state = 1;

/**
 * Initialisiert den PRNG mit dem angegebenen Seed.
 * Wird am Anfang jedes Engine-Ticks aufgerufen.
 */
export function seedRng(seed: number): void {
  // Stellt sicher, dass _state nie 0 ist (würde Mulberry32 stoppen)
  _state = (seed >>> 0) || 1;
}

/**
 * Gibt eine Pseudo-Zufallszahl im Intervall [0, 1) zurück.
 * Mulberry32 — schnell, ausreichende statistische Qualität für Spiellogik.
 */
export function nextRandom(): number {
  let t = (_state += 0x6d2b79f5);
  t = Math.imul(t ^ (t >>> 15), t | 1);
  t ^= t + Math.imul(t ^ (t >>> 7), t | 61);
  _state = t;
  return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
}

/** Gibt einen zufälligen Integer in [0, n) zurück. */
export function nextInt(n: number): number {
  return Math.floor(nextRandom() * n);
}
