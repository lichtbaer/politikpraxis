import type { ContentBundle, Character, GameEvent, Law } from './types';

interface ValidationResult {
  valid: boolean;
  errors: string[];
}

const VALID_EVENT_TYPES = new Set(['danger', 'warn', 'good', 'info']);
const VALID_CHOICE_TYPES = new Set(['safe', 'primary', 'danger']);
const VALID_TAGS = new Set(['bund', 'eu', 'land', 'kommune']);

function validateCharacter(char: Partial<Character>, index: number): string[] {
  const errors: string[] = [];
  const required = ['id', 'name', 'role', 'initials', 'color', 'mood', 'loyalty', 'bio', 'interests'] as const;

  for (const field of required) {
    if (char[field] === undefined) {
      errors.push(`Character [${index}]: missing field '${field}'`);
    }
  }

  if (typeof char.mood === 'number' && (char.mood < 0 || char.mood > 4)) {
    errors.push(`Character [${index}]: mood must be 0-4`);
  }
  if (typeof char.loyalty === 'number' && (char.loyalty < 0 || char.loyalty > 5)) {
    errors.push(`Character [${index}]: loyalty must be 0-5`);
  }

  return errors;
}

function validateEvent(event: Partial<GameEvent>, index: number): string[] {
  const errors: string[] = [];

  if (!event.id) errors.push(`Event [${index}]: missing id`);
  if (!event.type || !VALID_EVENT_TYPES.has(event.type)) {
    errors.push(`Event [${index}]: invalid type '${event.type}'`);
  }
  if (!event.choices?.length) {
    errors.push(`Event [${index}]: must have at least 1 choice`);
  }

  event.choices?.forEach((ch, j) => {
    if (!VALID_CHOICE_TYPES.has(ch.type)) {
      errors.push(`Event [${index}] choice [${j}]: invalid type '${ch.type}'`);
    }
    if (typeof ch.cost !== 'number' || ch.cost < 0) {
      errors.push(`Event [${index}] choice [${j}]: cost must be >= 0`);
    }
  });

  return errors;
}

function validateLaw(law: Partial<Law>, index: number): string[] {
  const errors: string[] = [];

  if (!law.id) errors.push(`Law [${index}]: missing id`);
  if (!law.titel) errors.push(`Law [${index}]: missing titel`);

  law.tags?.forEach(tag => {
    if (!VALID_TAGS.has(tag)) {
      errors.push(`Law [${index}]: invalid tag '${tag}'`);
    }
  });

  return errors;
}

export function validateModContent(content: Partial<ContentBundle>): ValidationResult {
  const errors: string[] = [];

  if (content.characters) {
    content.characters.forEach((c, i) => errors.push(...validateCharacter(c, i)));
  }

  if (content.events) {
    content.events.forEach((e, i) => errors.push(...validateEvent(e, i)));
  }

  if (content.laws) {
    content.laws.forEach((l, i) => errors.push(...validateLaw(l, i)));
  }

  return { valid: errors.length === 0, errors };
}
