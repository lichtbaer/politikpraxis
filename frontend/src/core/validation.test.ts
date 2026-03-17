import { describe, it, expect } from 'vitest';
import { validateModContent } from './validation';

describe('validateModContent', () => {
  it('gibt valid:true bei leerem Content', () => {
    const result = validateModContent({});
    expect(result.valid).toBe(true);
    expect(result.errors).toHaveLength(0);
  });

  it('validiert Character mit allen Pflichtfeldern', () => {
    const result = validateModContent({
      characters: [
        {
          id: 'test',
          name: 'Test',
          role: 'Minister',
          initials: 'T',
          color: '#fff',
          mood: 2,
          loyalty: 3,
          bio: 'bio',
          interests: ['Politik'],
          bonus: { trigger: '', desc: '', applies: '' },
          ultimatum: { moodThresh: 0, event: '' },
        },
      ],
    });
    expect(result.valid).toBe(true);
    expect(result.errors).toHaveLength(0);
  });

  it('meldet fehlende Character-Felder', () => {
    const result = validateModContent({
      characters: [{ id: 'test' } as any],
    });
    expect(result.valid).toBe(false);
    expect(result.errors.length).toBeGreaterThan(0);
    expect(result.errors.some(e => e.includes('name'))).toBe(true);
    expect(result.errors.some(e => e.includes('role'))).toBe(true);
  });

  it('meldet ungültigen mood-Wert (>4)', () => {
    const result = validateModContent({
      characters: [
        {
          id: 'x', name: 'X', role: 'R', initials: 'X', color: '#000',
          mood: 5, loyalty: 3, bio: 'b', interests: [],
          bonus: { trigger: '', desc: '', applies: '' },
          ultimatum: { moodThresh: 0, event: '' },
        } as any,
      ],
    });
    expect(result.errors.some(e => e.includes('mood must be 0-4'))).toBe(true);
  });

  it('meldet ungültigen loyalty-Wert (>5)', () => {
    const result = validateModContent({
      characters: [
        {
          id: 'x', name: 'X', role: 'R', initials: 'X', color: '#000',
          mood: 2, loyalty: 6, bio: 'b', interests: [],
          bonus: { trigger: '', desc: '', applies: '' },
          ultimatum: { moodThresh: 0, event: '' },
        } as any,
      ],
    });
    expect(result.errors.some(e => e.includes('loyalty must be 0-5'))).toBe(true);
  });

  it('validiert gültige Events', () => {
    const result = validateModContent({
      events: [
        {
          id: 'e1', type: 'danger', icon: '', typeLabel: '', title: '', quote: '', context: '',
          choices: [{ label: 'OK', desc: '', cost: 5, type: 'safe', effect: {}, log: '' }],
          ticker: '',
        },
      ],
    });
    expect(result.valid).toBe(true);
  });

  it('meldet fehlende Event-ID', () => {
    const result = validateModContent({
      events: [{ type: 'danger', choices: [{ type: 'safe', cost: 0 }] } as any],
    });
    expect(result.errors.some(e => e.includes('missing id'))).toBe(true);
  });

  it('meldet ungültigen Event-Type', () => {
    const result = validateModContent({
      events: [{ id: 'e1', type: 'invalid', choices: [{ type: 'safe', cost: 0 }] } as any],
    });
    expect(result.errors.some(e => e.includes('invalid type'))).toBe(true);
  });

  it('meldet Event ohne Choices', () => {
    const result = validateModContent({
      events: [{ id: 'e1', type: 'danger', choices: [] } as any],
    });
    expect(result.errors.some(e => e.includes('at least 1 choice'))).toBe(true);
  });

  it('meldet ungültigen Choice-Type', () => {
    const result = validateModContent({
      events: [{ id: 'e1', type: 'danger', choices: [{ type: 'invalid', cost: 0 }] } as any],
    });
    expect(result.errors.some(e => e.includes('choice [0]: invalid type'))).toBe(true);
  });

  it('meldet negative Choice-Cost', () => {
    const result = validateModContent({
      events: [{ id: 'e1', type: 'danger', choices: [{ type: 'safe', cost: -1 }] } as any],
    });
    expect(result.errors.some(e => e.includes('cost must be >= 0'))).toBe(true);
  });

  it('validiert gültige Laws', () => {
    const result = validateModContent({
      laws: [{ id: 'l1', titel: 'Law 1', tags: ['bund'] } as any],
    });
    expect(result.valid).toBe(true);
  });

  it('meldet fehlende Law-ID und Titel', () => {
    const result = validateModContent({
      laws: [{} as any],
    });
    expect(result.errors.some(e => e.includes('missing id'))).toBe(true);
    expect(result.errors.some(e => e.includes('missing titel'))).toBe(true);
  });

  it('meldet ungültigen Law-Tag', () => {
    const result = validateModContent({
      laws: [{ id: 'l1', titel: 'L', tags: ['invalid'] } as any],
    });
    expect(result.errors.some(e => e.includes("invalid tag 'invalid'"))).toBe(true);
  });

  it('akzeptiert alle gültigen Tags', () => {
    const result = validateModContent({
      laws: [{ id: 'l1', titel: 'L', tags: ['bund', 'eu', 'land', 'kommune'] } as any],
    });
    expect(result.valid).toBe(true);
  });

  it('validiert mehrere Entities gleichzeitig', () => {
    const result = validateModContent({
      characters: [{} as any],
      events: [{} as any],
      laws: [{} as any],
    });
    expect(result.valid).toBe(false);
    expect(result.errors.length).toBeGreaterThan(3);
  });
});
