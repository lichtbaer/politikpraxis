/**
 * SMA-312: Gesetz-Abhängigkeitssystem — requires, excludes, enhances
 */

import type { GameState, GesetzRelation } from './types';

/** Beschlossene Gesetze (status === 'beschlossen') */
function getBeschlosseneGesetze(state: GameState): string[] {
  return state.gesetze.filter((g) => g.status === 'beschlossen').map((g) => g.id);
}

/**
 * Prüft ob ein Gesetz eingebracht werden kann (requires + excludes).
 */
export function kannGesetzEingebracht(
  state: GameState,
  gesetzId: string,
  relationen: Record<string, GesetzRelation[]> | undefined,
): boolean {
  const rels = relationen?.[gesetzId] ?? [];
  const beschlossen = getBeschlosseneGesetze(state);

  const requires = rels.filter((r) => r.typ === 'requires');
  if (requires.some((r) => !beschlossen.includes(r.targetId))) {
    return false;
  }

  const excludes = rels.filter((r) => r.typ === 'excludes');
  if (excludes.some((r) => beschlossen.includes(r.targetId))) {
    return false;
  }

  return true;
}

/**
 * Berechnet Gesetz-Effekt mit Synergien (enhances).
 */
export function berechneGesetzEffektMitSynergien(
  state: GameState,
  gesetzId: string,
  basisEffekt: number,
  relationen: Record<string, GesetzRelation[]> | undefined,
): number {
  const rels = relationen?.[gesetzId] ?? [];
  const beschlossen = getBeschlosseneGesetze(state);

  const synergien = rels.filter(
    (r) => r.typ === 'enhances' && beschlossen.includes(r.targetId),
  );
  const synergieFaktor = synergien.reduce((f, r) => f * (r.enhancesFaktor ?? 1.0), 1.0);
  return basisEffekt * synergieFaktor;
}

/**
 * Gibt die fehlende requires-Relation zurück (wenn gesperrt).
 */
export function getFehlendeRequires(
  state: GameState,
  gesetzId: string,
  relationen: Record<string, GesetzRelation[]> | undefined,
): GesetzRelation | null {
  const rels = relationen?.[gesetzId] ?? [];
  const beschlossen = getBeschlosseneGesetze(state);
  return rels.find((r) => r.typ === 'requires' && !beschlossen.includes(r.targetId)) ?? null;
}

/**
 * Gibt die ausschließende excludes-Relation zurück (wenn ausgeschlossen).
 */
export function getAusschliessendeExcludes(
  state: GameState,
  gesetzId: string,
  relationen: Record<string, GesetzRelation[]> | undefined,
): GesetzRelation | null {
  const rels = relationen?.[gesetzId] ?? [];
  const beschlossen = getBeschlosseneGesetze(state);
  return rels.find((r) => r.typ === 'excludes' && beschlossen.includes(r.targetId)) ?? null;
}

/**
 * Gibt aktive Enhances-Relationen zurück (Synergie-Badges).
 */
export function getAktiveEnhances(
  state: GameState,
  gesetzId: string,
  relationen: Record<string, GesetzRelation[]> | undefined,
): GesetzRelation[] {
  const rels = relationen?.[gesetzId] ?? [];
  const beschlossen = getBeschlosseneGesetze(state);
  return rels.filter((r) => r.typ === 'enhances' && beschlossen.includes(r.targetId));
}
