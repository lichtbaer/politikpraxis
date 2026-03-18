/**
 * SMA-327: Minister-Entlassung (Stufe 3+)
 */
import type { GameState, Character } from '../types';
import { addLog } from '../../core/engine';
import { featureActive } from './features';
import { waehleMinisterAusPool } from '../kabinett';

function getChar(state: GameState, charId: string): Character | undefined {
  return state.chars.find((c) => c.id === charId);
}

function getErsatzMinister(
  contentChars: Character[],
  cabinetIds: Set<string>,
  poolPartei: string,
  ressort: string
): Character | null {
  const available = contentChars.filter((c) => !cabinetIds.has(c.id));
  const m = waehleMinisterAusPool(available, poolPartei, ressort as 'arbeit' | 'soziales' | 'justiz' | 'bildung' | 'finanzen' | 'innen' | 'wirtschaft' | 'umwelt' | 'digital' | 'wohnen' | 'gesundheit');
  if (!m) return null;
  const c = contentChars.find((x) => x.id === m.id);
  return c ?? null;
}

/**
 * Entlässt einen Minister und setzt Ersatz aus dem Pool ein.
 * Stufe 3+, kostet 20 PK. Bei Partner-Minister: Koalitions-Beziehung -15.
 */
export function entlasseMinister(
  state: GameState,
  charId: string,
  complexity: number,
  contentChars: Character[]
): GameState {
  if (!featureActive(complexity, 'ministerial_initiativen')) return state;
  if (state.month < 20) return state;
  if (state.pk < 20) return state;

  const char = getChar(state, charId);
  if (!char) return state;
  if (char.id === 'kanzler' || char.ist_kanzler) return state;

  const poolPartei = char.pool_partei;
  const ressort = char.ressort ?? char.ressort_partner;
  if (!poolPartei || !ressort) return state;

  let next: GameState = {
    ...state,
    pk: state.pk - 20,
    chars: state.chars.filter((c) => c.id !== charId),
  };

  const spielerPartei = state.spielerPartei?.id;
  if (char.pool_partei !== spielerPartei && state.koalitionspartner) {
    next = {
      ...next,
      koalitionspartner: {
        ...state.koalitionspartner,
        beziehung: Math.max(0, state.koalitionspartner.beziehung - 15),
      },
    };
    next = addLog(next, `${char.name} entlassen — Koalitionspartner empört`, 'g');
  } else {
    next = addLog(next, `${char.name} entlassen`, 'g');
  }

  const cabinetIds = new Set(state.chars.map((c) => c.id));
  const ersatz = getErsatzMinister(contentChars, cabinetIds, poolPartei, ressort);
  if (ersatz) {
    const ersatzChar: Character = {
      ...ersatz,
      mood: ersatz.mood,
      loyalty: ersatz.loyalty,
    };
    next = {
      ...next,
      chars: [...next.chars, ersatzChar],
    };
    next = addLog(next, `${ersatz.name} als neuer Minister eingesetzt`, 'g');
  }

  return next;
}
