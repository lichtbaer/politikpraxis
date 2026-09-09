import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import { render, fireEvent, cleanup, screen } from '@testing-library/react';
import React from 'react';
import type { Aufmerksamkeitsalert } from '../../../core/aufmerksamkeit';

vi.mock('react-i18next', () => ({
  useTranslation: () => ({ t: (k: string) => k }),
}));
vi.mock('../../icons', () => ({ AlertTriangle: () => null }));
vi.mock('../../../store/gameStore', () => ({ useGameStore: vi.fn() }));
vi.mock('../../../core/aufmerksamkeit', () => ({ berechneAufmerksamkeit: vi.fn() }));

import { AufmerksamkeitsPanel } from './AufmerksamkeitsPanel';
import { useGameStore } from '../../../store/gameStore';
import { berechneAufmerksamkeit } from '../../../core/aufmerksamkeit';

const mockSetView = vi.fn();

function setupStore() {
  const store = {
    state: { month: 12 },
    complexity: 4,
    content: { laws: [] },
    setView: mockSetView,
  };
  const mock = vi.mocked(useGameStore) as unknown as ReturnType<typeof vi.fn>;
  mock.mockImplementation((sel?: (s: typeof store) => unknown) => (sel ? sel(store) : store));
  return store;
}

function alert(over: Partial<Aufmerksamkeitsalert> = {}): Aufmerksamkeitsalert {
  return {
    id: 'pk',
    kategorie: 'pk',
    stufe: 'warnung',
    i18nKey: 'aufmerksamkeit.pk.warnung',
    view: 'agenda',
    gewicht: 70,
    ...over,
  };
}

describe('AufmerksamkeitsPanel', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    setupStore();
  });
  afterEach(cleanup);

  it('rendert nichts, wenn es nichts zu melden gibt', () => {
    vi.mocked(berechneAufmerksamkeit).mockReturnValue([]);
    const { container } = render(React.createElement(AufmerksamkeitsPanel));
    expect(container).toBeEmptyDOMElement();
  });

  it('listet jeden Alert als eigene Zeile', () => {
    vi.mocked(berechneAufmerksamkeit).mockReturnValue([
      alert(),
      alert({ id: 'koalition', kategorie: 'koalition', i18nKey: 'aufmerksamkeit.koalition.kritisch', stufe: 'kritisch', view: 'kabinett' }),
    ]);
    render(React.createElement(AufmerksamkeitsPanel));
    expect(screen.getAllByRole('button')).toHaveLength(2);
    expect(screen.getByText('aufmerksamkeit.pk.warnung')).toBeTruthy();
    expect(screen.getByText('aufmerksamkeit.koalition.kritisch')).toBeTruthy();
  });

  it('springt bei Klick in den betroffenen Tab', () => {
    vi.mocked(berechneAufmerksamkeit).mockReturnValue([alert({ view: 'bundestag' })]);
    render(React.createElement(AufmerksamkeitsPanel));
    fireEvent.click(screen.getByRole('button'));
    expect(mockSetView).toHaveBeenCalledWith('bundestag');
  });
});
