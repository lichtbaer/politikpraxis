import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import { render, screen, fireEvent, cleanup } from '@testing-library/react';
import { makeState, makeLaw } from '../../core/test-helpers';

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
vi.mock('../components/AgendaCard/AgendaCard', () => ({
  AgendaCard: ({ law }: { law: { id: string; kurz: string } }) => (
    <div data-testid={`agenda-card-${law.id}`}>{law.kurz}</div>
  ),
}));
vi.mock('../components/PendingEffekteChart/PendingEffekteChart', () => ({
  PendingEffekteChart: () => <div data-testid="pending-effekte-chart" />,
}));

import { GesetzAgendaView } from './GesetzAgendaView';
import { useGameStore } from '../../store/gameStore';
import { useContentStore } from '../../store/contentStore';

const DEFAULT_AUSRICHTUNG = { wirtschaft: 0, gesellschaft: 0, staat: 0 };

function setupStore(overrides: { complexity?: number; gesetze?: ReturnType<typeof makeLaw>[] } = {}) {
  const complexity = overrides.complexity ?? 2;
  const gesetze =
    overrides.gesetze ??
    [
      makeLaw({ id: 'law_a', kurz: 'Gesetz A', status: 'entwurf', politikfeldId: 'wirtschaft' }),
      makeLaw({ id: 'law_b', kurz: 'Gesetz B', status: 'beschlossen', politikfeldId: 'soziales' }),
    ];
  const store = {
    state: makeState({ gesetze, pending: [], politikfeldDruck: {} }),
    ausrichtung: DEFAULT_AUSRICHTUNG,
    complexity,
  };
  (vi.mocked(useGameStore) as ReturnType<typeof vi.fn>).mockImplementation(
    (sel?: (s: typeof store) => unknown) => (sel ? sel(store) : store),
  );
  (vi.mocked(useContentStore) as ReturnType<typeof vi.fn>).mockImplementation(
    (sel?: (s: { politikfelder: unknown[] }) => unknown) => {
      const s = { politikfelder: [] };
      return sel ? sel(s) : s;
    },
  );
  return store;
}

afterEach(() => cleanup());

beforeEach(() => {
  vi.clearAllMocks();
  setupStore();
});

describe('GesetzAgendaView — Rendering', () => {
  it('rendert ohne Crash', () => {
    render(<GesetzAgendaView />);
    expect(document.body).toBeInTheDocument();
  });

  it('zeigt beide Gesetze als AgendaCard', () => {
    render(<GesetzAgendaView />);
    expect(screen.getByTestId('agenda-card-law_a')).toBeInTheDocument();
    expect(screen.getByTestId('agenda-card-law_b')).toBeInTheDocument();
  });

  it('zeigt einen Leer-Hinweis ohne Gesetze', () => {
    setupStore({ gesetze: [] });
    render(<GesetzAgendaView />);
    expect(screen.getByText('game:gesetzAgenda.leer')).toBeInTheDocument();
  });
});

describe('GesetzAgendaView — Status-Filter', () => {
  it('filtert nach Status "Beschlossen" und blendet andere Gesetze aus', () => {
    render(<GesetzAgendaView />);
    fireEvent.click(screen.getByText('Beschlossen'));
    expect(screen.queryByTestId('agenda-card-law_a')).not.toBeInTheDocument();
    expect(screen.getByTestId('agenda-card-law_b')).toBeInTheDocument();
  });

  it('zeigt "Keine Gesetze gefunden" wenn der Filter nichts matcht', () => {
    render(<GesetzAgendaView />);
    fireEvent.click(screen.getByText('Blockiert'));
    expect(screen.getByText('Keine Gesetze gefunden.')).toBeInTheDocument();
  });
});

describe('GesetzAgendaView — Suche', () => {
  it('filtert Gesetze per Freitextsuche auf Titel/Kurz', () => {
    render(<GesetzAgendaView />);
    const searchInput = screen.getByPlaceholderText('Gesetz suchen…');
    fireEvent.change(searchInput, { target: { value: 'Gesetz A' } });
    expect(screen.getByTestId('agenda-card-law_a')).toBeInTheDocument();
    expect(screen.queryByTestId('agenda-card-law_b')).not.toBeInTheDocument();
  });
});
