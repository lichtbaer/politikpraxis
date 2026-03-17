import type { GameState, Ideologie } from '../types';
import { berechneKongruenz, gesetzKongruenz } from '../ideologie';
import { featureActive } from './features';

export interface KongruenzEffekt {
  pkModifikator: number;
  charEffekte: Record<string, number>;
  score: number;
}

const BASE_PK_EINBRINGEN = 20;

/**
 * Wendet Kongruenz-Effekte beim Einbringen eines Gesetzes an.
 * - PK-Kosten: Score ≥80: -3, ≥40: 0, ≥20: +8, <20: +12 (Stufe 2: 50% reduziert)
 * - Char-Mood: Bei Score <20 und char_ideologie: Chars mit gegensätzlichem Profil -1
 */
export function applyKongruenzEffekte(
  state: GameState,
  gesetzId: string,
  ausrichtung: Ideologie,
  complexity: number,
): KongruenzEffekt {
  const gesetz = state.gesetze.find((g) => g.id === gesetzId);
  const score = gesetzKongruenz(ausrichtung, gesetz);

  if (!featureActive(complexity, 'kongruenz_effekte')) {
    return { pkModifikator: 0, charEffekte: {}, score };
  }

  let pkModifikator = 0;
  if (score >= 80) pkModifikator = -3;
  else if (score >= 40) pkModifikator = 0;
  else if (score >= 20) pkModifikator = 8;
  else pkModifikator = 12;

  if (complexity === 2) pkModifikator = Math.round(pkModifikator * 0.5);

  const charEffekte: Record<string, number> = {};
  if (score < 20 && featureActive(complexity, 'char_ideologie') && gesetz?.ideologie) {
    for (const char of state.chars) {
      const charScore = berechneKongruenz(char.ideologie ?? { wirtschaft: 0, gesellschaft: 0, staat: 0 }, gesetz.ideologie);
      if (charScore < 20) charEffekte[char.id] = -1;
    }
  }

  return { pkModifikator, charEffekte, score };
}

/** PK-Kosten für Einbringen inkl. Kongruenz-Modifikator */
export function getEinbringenPkKosten(pkModifikator: number): number {
  return Math.max(5, BASE_PK_EINBRINGEN + pkModifikator);
}
