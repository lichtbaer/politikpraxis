import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import { render, screen, fireEvent, cleanup } from '@testing-library/react';
import { makeState, makeLaw, makeFraktion } from '../../core/test-helpers';

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
vi.mock('../../store/uiStore', () => ({ useUIStore: vi.fn() }));
vi.mock('../components/BundesratMap/BundesratMap', () => ({
  BundesratMap: () => <div data-testid="bundesrat-map" />,
}));
vi.mock('../components/LobbyingOverlay/LobbyingOverlay', () => ({
  LobbyingOverlay: ({ onClose }: { onClose: () => void }) => (
    <div data-testid="lobbying-overlay">
      <button type="button" onClick={onClose}>close-overlay</button>
    </div>
  ),
}));

import { BundesratView } from './BundesratView';
import { useGameStore } from '../../store/gameStore';
import { useUIStore } from '../../store/uiStore';

const mockDoBundeslandGespraech = vi.fn();
const mockShowToast = vi.fn();

function setupStore(overrides: { complexity?: number; state?: Record<string, unknown> } = {}) {
  const complexity = overrides.complexity ?? 3;
  const law = makeLaw({ id: 'law_br', kurz: 'BR-Gesetz', status: 'bt_passed', brVoteMonth: 7 });
  const fraktionen = [
    makeFraktion({
      id: 'union',
      laender: ['by', 'bw'],
      sprecher: { name: 'Anna Beispiel', partei: 'CDP', land: 'BY', initials: 'AB', color: '#000', bio: 'bio' },
    }),
    makeFraktion({
      id: 'sozial',
      laender: ['nw', 'ni'],
      sprecher: { name: 'Ben Muster', partei: 'SDP', land: 'NW', initials: 'BM', color: '#111', bio: 'bio' },
    }),
  ];
  const store = {
    state: makeState({
      month: 5,
      gesetze: [law],
      pk: 50,
      bundesratFraktionen: fraktionen,
      ...(overrides.state ?? {}),
    }),
    complexity,
    doBundeslandGespraech: mockDoBundeslandGespraech,
  };
  (vi.mocked(useGameStore) as ReturnType<typeof vi.fn>).mockImplementation(
    (sel?: (s: typeof store) => unknown) => (sel ? sel(store) : store),
  );
  (vi.mocked(useUIStore) as ReturnType<typeof vi.fn>).mockImplementation(
    (sel?: (s: { showToast: typeof mockShowToast }) => unknown) => {
      const s = { showToast: mockShowToast };
      return sel ? sel(s) : s;
    },
  );
  return store;
}

afterEach(() => cleanup());

beforeEach(() => {
  vi.clearAllMocks();
});

describe('BundesratView — Stufe < 2', () => {
  it('rendert nichts (bundesrat_sichtbar ab Stufe 2)', () => {
    setupStore({ complexity: 1 });
    const { container } = render(<BundesratView />);
    expect(container).toBeEmptyDOMElement();
  });
});

describe('BundesratView — Stufe 2 (vereinfacht)', () => {
  beforeEach(() => setupStore({ complexity: 2 }));

  it('zeigt die vereinfachte Ansicht mit aggregiertem Balken statt Fraktionskarten', () => {
    render(<BundesratView />);
    expect(screen.getByText('game:bundesrat.subtitleSimple')).toBeInTheDocument();
    expect(screen.queryByTestId('bundesrat-map')).not.toBeInTheDocument();
  });
});

describe('BundesratView — Stufe 3 (Detailansicht)', () => {
  let store: ReturnType<typeof setupStore>;
  beforeEach(() => {
    store = setupStore({ complexity: 3 });
  });

  it('rendert ohne Crash', () => {
    render(<BundesratView />);
    expect(document.body).toBeInTheDocument();
  });

  it('zeigt die Bundesrat-Karte und eine Fraktionskarte je Fraktion', () => {
    render(<BundesratView />);
    expect(screen.getByTestId('bundesrat-map')).toBeInTheDocument();
    expect(screen.getAllByText(new RegExp(store.state.bundesratFraktionen[0].sprecher.name))).not.toHaveLength(0);
  });

  it('öffnet das Lobbying-Overlay bei Klick auf "Gespräch suchen" und schließt es wieder', () => {
    render(<BundesratView />);
    const lobbyButtons = screen.getAllByText('game:bundesrat.lobbyingButton');
    fireEvent.click(lobbyButtons[0]);
    expect(screen.getByTestId('lobbying-overlay')).toBeInTheDocument();

    fireEvent.click(screen.getByText('close-overlay'));
    expect(screen.queryByTestId('lobbying-overlay')).not.toBeInTheDocument();
  });
});

describe('BundesratView — bilaterale Gespräche (Stufe 3, bundeslaender_aktionen)', () => {
  it('ruft doBundeslandGespraech(landId) beim Klick auf einen Bilateral-Button auf', () => {
    setupStore({ complexity: 3 });
    render(<BundesratView />);
    const bilateralButtons = screen
      .getAllByRole('button')
      .filter((b) => b.className.includes('btnBilateral'));
    expect(bilateralButtons.length).toBeGreaterThan(0);
    fireEvent.click(bilateralButtons[0]);
    expect(mockDoBundeslandGespraech).toHaveBeenCalled();
  });
});
