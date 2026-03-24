import type { GameState, Character, MinisterialInitiative } from '../types';
import { addLog } from '../engine';
import { withPause } from '../eventPause';
import { einbringen } from './parliament';
import { featureActive } from './features';
import { resolveCharById } from './characters';

const COOLDOWN_MONTHS = 8;

/** Zählt erfüllte Bedingungen einer Initiative für einen Charakter */
function countBedingungen(init: MinisterialInitiative, char: Character): number {
  const bedingungen = init.bedingungen ?? [];
  if (bedingungen.length === 0) return 2; // Keine Bedingungen = immer erfüllt

  let count = 0;
  for (const b of bedingungen) {
    if (b.type === 'mood' && typeof b.value === 'number' && char.mood >= b.value) count++;
    else if (b.type === 'loyalty' && typeof b.value === 'number' && char.loyalty >= b.value) count++;
    else if (b.type === 'interest' && typeof b.value === 'string' && char.interests?.includes(b.value)) count++;
    else if (b.type === 'min_mood' && char.mood >= 2) count++;
    else if (b.type === 'min_loyalty' && char.loyalty >= 2) count++;
  }
  return count;
}

/** Prüft ob Initiative ausgelöst werden kann (Charakter im Kabinett, Gesetz existiert) */
function canTrigger(
  init: MinisterialInitiative,
  char: Character | undefined,
  state: GameState,
): boolean {
  if (!char) return false;
  const lawExists = state.gesetze.some(g => g.id === init.gesetz_ref_id && g.status === 'entwurf');
  return lawExists;
}

/**
 * Prüft Ministerial-Initiativen im Tick.
 * Max. 1 aktiv gleichzeitig. Cooldown 8 Monate pro Char.
 * Zwei-Bedingungen-Check vor Auslösung.
 */
export function checkMinisterialInitiativen(
  state: GameState,
  initiativen: MinisterialInitiative[],
  complexity: number,
): GameState {
  if (!featureActive(complexity, 'ministerial_initiativen')) return state;
  if (state.aktiveMinisterialInitiative) return state;
  if (state.activeEvent) return state;
  if (!initiativen.length) return state;

  for (const init of initiativen) {
    const char = resolveCharById(state.chars, init.char_id);
    if (!canTrigger(init, char, state)) continue;

    const cooldownKey = char?.id ?? init.char_id;
    const lastFired = state.ministerialCooldowns?.[cooldownKey] ?? 0;
    const cooldown = init.cooldown_months ?? COOLDOWN_MONTHS;
    if (state.month - lastFired < cooldown) continue;

    const bedingungen = countBedingungen(init, char!);
    if (bedingungen < 2) continue;

    return {
      ...state,
      aktiveMinisterialInitiative: {
        initId: init.id,
        charId: char!.id,
        gesetzId: init.gesetz_ref_id,
      },
      activeEvent: {
        id: `mi_${init.id}`,
        type: 'warn',
        icon: 'ministerial',
        typeLabel: 'Ministerial-Initiative',
        title: `${char!.name} bringt Initiative ein`,
        quote: '',
        context: `Minister ${char!.name} möchte das Gesetz auf die Agenda setzen.`,
        ticker: `Ministerial-Initiative: ${char!.name}`,
        choices: [
          {
            label: 'Unterstützen',
            desc: 'Gesetz einbringen mit reduzierten PK-Kosten. Koalitionspartner verärgert.',
            cost: 0,
            type: 'primary',
            effect: {},
            ministerialAction: 'unterstuetzen',
            log: 'Initiative unterstützt.',
          },
          {
            label: 'Ablehnen',
            desc: 'Minister enttäuscht.',
            cost: 0,
            type: 'danger',
            effect: {},
            ministerialAction: 'ablehnen',
            log: 'Initiative abgelehnt.',
          },
          {
            label: 'Ignorieren',
            desc: 'Gesetz läuft mit reduzierter Chance durch.',
            cost: 0,
            type: 'safe',
            effect: {},
            ministerialAction: 'ignorieren',
            log: 'Initiative ignoriert.',
          },
        ],
        charId: char!.id,
      },
      ...withPause(state),
    };
  }

  return state;
}

/**
 * Spieler-Reaktion auf Ministerial-Initiative.
 */
export function resolveMinisterialInitiative(
  state: GameState,
  aktion: 'unterstuetzen' | 'ablehnen' | 'ignorieren',
): GameState {
  const mi = state.aktiveMinisterialInitiative;
  if (!mi) return state;

  const charIdx = state.chars.findIndex(c => c.id === mi.charId);
  if (charIdx === -1) {
    return { ...state, aktiveMinisterialInitiative: null, activeEvent: null };
  }

  const char = state.chars[charIdx];
  const cooldowns = { ...(state.ministerialCooldowns ?? {}), [mi.charId]: state.month };

  if (aktion === 'unterstuetzen') {
    const newMood = Math.min(4, char.mood + 2);
    const newLoyalty = Math.min(5, char.loyalty + 1);
    const chars = state.chars.map((c, i) =>
      i === charIdx ? { ...c, mood: newMood, loyalty: newLoyalty } : c,
    );
    const newCoalition = Math.max(0, state.coalition - 5);
    let newState: GameState = {
      ...state,
      chars,
      coalition: newCoalition,
      ministerialCooldowns: cooldowns,
      aktiveMinisterialInitiative: null,
      activeEvent: null,
    };
    newState = einbringen(newState, mi.gesetzId, { pkRabatt: 0.2 });
    return addLog(newState, `${char.name}s Initiative unterstützt — Gesetz eingebracht`, 'g');
  }

  if (aktion === 'ablehnen') {
    const newMood = Math.max(0, char.mood - 2);
    const newLoyalty = Math.max(0, char.loyalty - 1);
    const chars = state.chars.map((c, i) =>
      i === charIdx ? { ...c, mood: newMood, loyalty: newLoyalty } : c,
    );
    return addLog(
      {
        ...state,
        chars,
        ministerialCooldowns: cooldowns,
        aktiveMinisterialInitiative: null,
        activeEvent: null,
      },
      `${char.name}s Initiative abgelehnt`,
      'r',
    );
  }

  // ignorieren
  const erfolg = Math.random() < 0.3;
  if (erfolg) {
    const newCoalition = Math.max(0, state.coalition - 8);
    return addLog(
      {
        ...state,
        coalition: newCoalition,
        ministerialCooldowns: cooldowns,
        aktiveMinisterialInitiative: null,
        activeEvent: null,
      },
      `${char.name}s Initiative unerwartet beschlossen.`,
      'r',
    );
  } else {
    const newMood = Math.max(0, char.mood - 1);
    const chars = state.chars.map((c, i) =>
      i === charIdx ? { ...c, mood: newMood } : c,
    );
    return addLog(
      {
        ...state,
        chars,
        ministerialCooldowns: cooldowns,
        aktiveMinisterialInitiative: null,
        activeEvent: null,
      },
      `${char.name}s Initiative verpufft.`,
      '',
    );
  }
}
