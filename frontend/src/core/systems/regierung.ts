/**
 * Regierungserklärung & Vertrauensfrage.
 *
 * Regierungserklärung: 30 PK, Zustimmungseffekt abhängig von Medienklima.
 *   - Medienklima > 50: +8–15% Zustimmung (Erfolg)
 *   - Medienklima ≤ 50 und > 30: +2–5% Zustimmung (mäßig)
 *   - Medienklima ≤ 30: -5% Zustimmung (Fehlschlag)
 *   - Cooldown: 12 Monate
 *
 * Vertrauensfrage (Art. 68 GG): 40 PK, Alles-oder-Nichts.
 *   - Koalitionsstabilität ≥ 40: Erfolg → Koalitionspartner-Beziehung +25, Chars +1 Mood
 *   - Koalitionsstabilität < 40: Scheitern → Game Over
 *   - 1× pro Legislatur
 */
import type { GameState } from '../types';
import { addLog } from '../engine';
import { verbrauchePK } from '../pk';
import { featureActive } from './features';
import { adjustMedienKlimaGlobal } from './medienklima';
import { applyMoodChange } from './characters';
import { recalcApproval } from './economy';

const PK_REGIERUNGSERKLAERUNG = 30;
const PK_VERTRAUENSFRAGE = 40;
const REGIERUNGSERKLAERUNG_COOLDOWN = 12;
const VERTRAUENSFRAGE_SCHWELLE = 40;

// --- Regierungserklärung ---

/** Prüft ob eine Regierungserklärung möglich ist */
export function kannRegierungserklaerung(state: GameState, complexity: number): boolean {
  if (!featureActive(complexity, 'regierungserklaerung')) return false;
  if (state.pk < PK_REGIERUNGSERKLAERUNG) return false;
  if (state.gameOver) return false;
  // Cooldown: 12 Monate seit letzter Erklärung
  const letzteMonat = state.letzteRegierungserklaerungMonat ?? 0;
  if (letzteMonat > 0 && state.month - letzteMonat < REGIERUNGSERKLAERUNG_COOLDOWN) return false;
  return true;
}

/** Regierungserklärung abgeben — Zustimmungseffekt hängt von Medienklima ab */
export function regierungserklaerung(state: GameState, complexity: number): GameState {
  if (!kannRegierungserklaerung(state, complexity)) return state;

  const next = verbrauchePK(state, PK_REGIERUNGSERKLAERUNG);
  if (!next) return state;

  const medienKlima = next.medienKlima ?? 55;
  let zustDelta: number;
  let logType: string;
  let logMsg: string;

  if (medienKlima > 50) {
    // Erfolg: +8 bis +15 (proportional zum Medienklima)
    zustDelta = 8 + Math.round((medienKlima - 50) * 0.14);
    logType = 'g';
    logMsg = `Regierungserklärung: Breite Zustimmung — +${zustDelta}% Zustimmung`;
  } else if (medienKlima > 30) {
    // Mäßig: +2 bis +5
    zustDelta = 2 + Math.round((medienKlima - 30) * 0.15);
    logType = 'info';
    logMsg = `Regierungserklärung: Verhaltene Reaktion — +${zustDelta}% Zustimmung`;
  } else {
    // Fehlschlag: -5
    zustDelta = -5;
    logType = 'r';
    logMsg = 'Regierungserklärung: Medien zerpflücken Rede — Zustimmung −5%';
  }

  const newG = Math.max(15, Math.min(95, next.zust.g + zustDelta));
  const newZust = recalcApproval(next.kpi, { ...next.zust, g: newG });

  let out: GameState = {
    ...next,
    zust: { ...newZust, g: newG },
    letzteRegierungserklaerungMonat: next.month,
  };
  if (medienKlima > 50) {
    out = adjustMedienKlimaGlobal(out, 5, complexity);
  } else if (medienKlima <= 30) {
    out = adjustMedienKlimaGlobal(out, -3, complexity);
  }
  return addLog(out, logMsg, logType);
}

// --- Vertrauensfrage ---

/** Prüft ob die Vertrauensfrage gestellt werden kann */
export function kannVertrauensfrage(state: GameState, complexity: number): boolean {
  if (!featureActive(complexity, 'vertrauensfrage')) return false;
  if (state.pk < PK_VERTRAUENSFRAGE) return false;
  if (state.gameOver) return false;
  // 1× pro Legislatur
  if (state.vertrauensfrageGestellt) return false;
  // Nur sinnvoll wenn Koalitionspartner existiert
  if (!state.koalitionspartner) return false;
  return true;
}

/** Vertrauensfrage stellen — Alles-oder-Nichts basierend auf Koalitionsstabilität */
export function vertrauensfrage(state: GameState, complexity: number): GameState {
  if (!kannVertrauensfrage(state, complexity)) return state;

  const next = verbrauchePK(state, PK_VERTRAUENSFRAGE);
  if (!next) return state;

  const stabilität = next.coalition;

  if (stabilität >= VERTRAUENSFRAGE_SCHWELLE) {
    // Erfolg: Koalition gefestigt
    const kp = next.koalitionspartner!;
    const newBeziehung = Math.min(100, kp.beziehung + 25);

    // Alle Chars +1 Mood
    const moodChanges: Record<string, number> = {};
    for (const c of next.chars) {
      if (c.mood < 4) moodChanges[c.id] = 1;
    }

    let result: GameState = {
      ...next,
      koalitionspartner: { ...kp, beziehung: newBeziehung },
      vertrauensfrageGestellt: true,
      // Koalitionsbruch-Timer zurücksetzen
      koalitionsbruchSeitMonat: undefined,
    };

    if (Object.keys(moodChanges).length > 0) {
      result = applyMoodChange(result, moodChanges);
    }

    return addLog(
      result,
      'Vertrauensfrage gewonnen! Koalition gefestigt — Beziehung +25, Kabinett-Stimmung steigt',
      'g',
    );
  } else {
    // Scheitern: Koalition zerbricht → Game Over
    return addLog(
      {
        ...next,
        vertrauensfrageGestellt: true,
        gameOver: true,
        won: false,
        speed: 0,
      },
      'Vertrauensfrage gescheitert — Koalition zerbrochen, Regierung gestürzt',
      'danger',
    );
  }
}
