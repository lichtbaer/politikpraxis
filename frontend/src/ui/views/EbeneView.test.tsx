import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import { render, screen, fireEvent, cleanup } from '@testing-library/react';
import { makeState, makeLaw } from '../../core/test-helpers';
import { DEFAULT_CONTENT } from '../../data/defaults/scenarios';

vi.mock('react-i18next', async (importOriginal) => {
  const actual = await importOriginal<typeof import('react-i18next')>();
  return {
    ...actual,
    useTranslation: () => ({
      t: (k: string, defaultOrOpts?: string | Record<string, unknown>): string => {
        if (typeof defaultOrOpts === 'string') return defaultOrOpts;
        return k;
      },
    }),
  };
});
vi.mock('../../store/gameStore', () => ({ useGameStore: vi.fn() }));
vi.mock('../../store/contentStore', () => ({ useContentStore: vi.fn() }));
vi.mock('../components/VorbereitungModal/VorbereitungModal', () => ({
  VorbereitungModal: ({ onClose }: { onClose: () => void }) => (
    <div data-testid="vorbereitung-modal">
      <button type="button" onClick={onClose}>close-modal</button>
    </div>
  ),
}));

import { EbeneView } from './EbeneView';
import { useGameStore } from '../../store/gameStore';
import { useContentStore } from '../../store/contentStore';

const mockStaedtebuendnis = vi.fn();
const mockKommunalKonferenz = vi.fn();

function setupStore(overrides: { complexity?: number; state?: Record<string, unknown> } = {}) {
  const complexity = overrides.complexity ?? 3;
  const potentialLaw = makeLaw({
    id: 'law_kommune',
    titel: 'Kommunales Gesetz',
    kurz: 'Kommunales Gesetz',
    status: 'entwurf',
    kommunal_pilot_moeglich: true,
  });
  const store = {
    state: makeState({
      month: 1,
      pk: 50,
      gesetze: [potentialLaw],
      kommunalKonferenzJahr: undefined,
      ...(overrides.state ?? {}),
    }),
    complexity,
    doStaedtebuendnis: mockStaedtebuendnis,
    doKommunalKonferenz: mockKommunalKonferenz,
  };
  (vi.mocked(useGameStore) as ReturnType<typeof vi.fn>).mockImplementation(
    (sel?: (s: typeof store) => unknown) => (sel ? sel(store) : store),
  );
  (vi.mocked(useContentStore) as ReturnType<typeof vi.fn>).mockImplementation(
    (sel?: (s: typeof DEFAULT_CONTENT) => unknown) => (sel ? sel(DEFAULT_CONTENT) : DEFAULT_CONTENT),
  );
  return store;
}

afterEach(() => cleanup());

beforeEach(() => {
  vi.clearAllMocks();
});

describe('EbeneView — Kommune (Stufe 3)', () => {
  beforeEach(() => setupStore({ complexity: 3 }));

  it('rendert ohne Crash', () => {
    render(<EbeneView type="kommune" />);
    expect(document.body).toBeInTheDocument();
  });

  it('zeigt Aktionen-Buttons für die Kommunal-Ebene', () => {
    render(<EbeneView type="kommune" />);
    expect(screen.getByText(/game:ebene.staedtebuendnis/)).toBeInTheDocument();
  });

  it('ruft doStaedtebuendnis() beim Klick auf den Städtebündnis-Button auf', () => {
    render(<EbeneView type="kommune" />);
    fireEvent.click(screen.getByText(/game:ebene.staedtebuendnis/));
    expect(mockStaedtebuendnis).toHaveBeenCalled();
  });

  it('zeigt potenzielle Gesetze mit Start-Pilot-Button und öffnet das Vorbereitungs-Modal', () => {
    render(<EbeneView type="kommune" />);
    expect(screen.getByText('Kommunales Gesetz')).toBeInTheDocument();
    fireEvent.click(screen.getByText('game:ebene.startPilot.kommune'));
    expect(screen.getByTestId('vorbereitung-modal')).toBeInTheDocument();

    fireEvent.click(screen.getByText('close-modal'));
    expect(screen.queryByTestId('vorbereitung-modal')).not.toBeInTheDocument();
  });

  it('zeigt den Leer-Hinweis, wenn keine aktiven oder potenziellen Gesetze existieren', () => {
    setupStore({ complexity: 3, state: { gesetze: [] } });
    render(<EbeneView type="kommune" />);
    expect(screen.getByText('game:ebene.empty')).toBeInTheDocument();
  });
});

describe('EbeneView — EU (Stufe 4)', () => {
  it('zeigt die aktive EU-Route mit Fortschritt', () => {
    setupStore({
      complexity: 4,
      state: {
        gesetze: [makeLaw({ id: 'law_eu', kurz: 'EU-Gesetz', status: 'ausweich', route: 'eu' })],
        eu: {
          klima: {},
          aktiveRoute: { gesetzId: 'law_eu', startMonat: 1, dauer: 6, erfolgschance: 0.6 },
        },
      },
    });
    render(<EbeneView type="eu" />);
    expect(screen.getByText('game:eu.aktiveRoute')).toBeInTheDocument();
  });
});
