import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import { render, screen, fireEvent, waitFor, cleanup } from '@testing-library/react';
import React from 'react';

vi.mock('react-i18next', () => ({
  useTranslation: () => ({
    t: (k: string, defaultOrOpts?: string | object, _opts?: object): string => {
      if (typeof defaultOrOpts === 'string') return defaultOrOpts;
      return k;
    },
  }),
}));
vi.mock('react-router-dom', () => ({ useNavigate: vi.fn() }));
vi.mock('../../store/gameStore', () => ({ useGameStore: vi.fn() }));
vi.mock('../../store/authStore', () => ({ useAuthStore: vi.fn() }));
vi.mock('../../store/contentStore', () => ({ useContentStore: vi.fn() }));
vi.mock('../../store/uiStore', () => ({ useUIStore: vi.fn() }));
vi.mock('../../services/stats', () => ({
  postGameStats: vi.fn(() => Promise.resolve({ id: 'stat-1' })),
  fetchCommunityStats: vi.fn(() => Promise.resolve(null)),
  getOrCreateStatsSessionId: vi.fn(() => 'session-test'),
}));
vi.mock('../../core/auswertung', () => ({
  berechneLegislaturBewertung: vi.fn(() => ({
    gesamtnote: 'B',
    dimensionen: { demokratie: 70, wirtschaft: 65, gesellschaft: 72, kommunikation: 68, effizienz: 60 },
  })),
  berechneMilieuBilanz: vi.fn(() => ({ gewinner: [], verlierer: [] })),
  berechneTitel: vi.fn(() => 'Kanzler der Mitte'),
  berechneTop3Gesetze: vi.fn(() => []),
  berechneTopPolitikfeld: vi.fn(() => null),
}));
vi.mock('../../core/systems/koalition', () => ({
  getKoalitionspartner: vi.fn(() => null),
}));
vi.mock('../../core/systems/achievements', () => ({
  checkAchievements: vi.fn(),
  getAllAchievements: vi.fn(() => []),
}));
vi.mock('../components/BewertungRadarChart/BewertungRadarChart', () => ({
  BewertungRadarChart: () => React.createElement('div', { 'data-testid': 'radar-chart' }),
}));
vi.mock('../components/UserTestFeedbackModal/UserTestFeedbackModal', () => ({
  UserTestFeedbackModal: () => null,
}));
vi.mock('../../config/playtest', () => ({ PLAYTEST_CONFIG: { enabled: false } }));

import { SpielauswertungScreen } from './SpielauswertungScreen';
import { useGameStore } from '../../store/gameStore';
import { useAuthStore } from '../../store/authStore';
import { useContentStore } from '../../store/contentStore';
import { useUIStore } from '../../store/uiStore';
import { useNavigate } from 'react-router-dom';
import { postGameStats } from '../../services/stats';

const mockResetGame = vi.fn();
const mockNavigate = vi.fn();

const baseState = {
  gesetze: [],
  kpi: { al: 5.2, gi: 28.0 },
  haushalt: { saldo: -5.0 },
  haushaltSaldoHistory: [],
  medienKlima: 50,
  skandaleGesamt: 0,
  pkVerbrauchtGesamt: 0,
  month: 48,
  firedEvents: [],
  wahlUeberHuerde: null,
  koalitionspartner: null,
  spielziel: null,
};

function setupMocks(overrides: { gewonnen?: boolean } = {}) {
  const gs = {
    state: baseState,
    complexity: 1,
    spielerPartei: { id: 'sdp', kuerzel: 'SDP', farbe: '#e3000f', name: 'SDP' },
    content: { laws: [], koalitionsZiele: [] },
    resetGame: mockResetGame,
  };
  (vi.mocked(useGameStore) as ReturnType<typeof vi.fn>).mockImplementation(
    (sel?: (s: typeof gs) => unknown) => (sel ? sel(gs) : gs),
  );
  (vi.mocked(useAuthStore) as ReturnType<typeof vi.fn>).mockImplementation(
    (sel?: (s: { isLoggedIn: boolean; accessToken: null }) => unknown) => {
      const s = { isLoggedIn: false, accessToken: null };
      return sel ? sel(s) : s;
    },
  );
  (vi.mocked(useContentStore) as ReturnType<typeof vi.fn>).mockImplementation(
    (sel?: (s: { milieus: unknown[] }) => unknown) => {
      const s: { milieus: unknown[] } = { milieus: [] };
      return sel ? sel(s) : s;
    },
  );
  (vi.mocked(useUIStore) as ReturnType<typeof vi.fn>).mockImplementation(
    (sel?: (s: { showToast: () => void }) => unknown) => {
      const s = { showToast: vi.fn() };
      return sel ? sel(s) : s;
    },
  );
  vi.mocked(useNavigate).mockReturnValue(mockNavigate);
  return overrides;
}

const defaultProps = { wahlergebnis: 42.5, gewonnen: true, threshold: 40 };

afterEach(() => cleanup());

beforeEach(() => {
  vi.clearAllMocks();
  setupMocks();
});

describe('SpielauswertungScreen — Rendering', () => {
  it('rendert ohne Crash', () => {
    render(<SpielauswertungScreen {...defaultProps} />);
    expect(document.body).toBeInTheDocument();
  });

  it('zeigt den Kanzler-Titel', () => {
    render(<SpielauswertungScreen {...defaultProps} />);
    expect(screen.getByText('Kanzler der Mitte')).toBeInTheDocument();
  });

  it('zeigt Note aus Legislatur-Bewertung', () => {
    render(<SpielauswertungScreen {...defaultProps} />);
    expect(screen.getByText('B')).toBeInTheDocument();
  });

  it('zeigt Bilanz-Werte (Gesetze beschlossen/gescheitert)', () => {
    render(<SpielauswertungScreen {...defaultProps} />);
    expect(screen.getByText('Gesetze beschlossen')).toBeInTheDocument();
    expect(screen.getByText('Gesetze gescheitert')).toBeInTheDocument();
  });

  it('zeigt Haushalt-KPI (Arbeitslosigkeit)', () => {
    render(<SpielauswertungScreen {...defaultProps} />);
    expect(screen.getByText('Arbeitslosigkeit')).toBeInTheDocument();
  });
});

describe('SpielauswertungScreen — Aktionsbuttons', () => {
  it('zeigt "Neues Spiel"-Button', () => {
    render(<SpielauswertungScreen {...defaultProps} />);
    expect(screen.getByText('Neues Spiel')).toBeInTheDocument();
  });

  it('"Neues Spiel" ruft resetGame() auf und navigiert zu /setup', async () => {
    render(<SpielauswertungScreen {...defaultProps} />);
    fireEvent.click(screen.getByText('Neues Spiel'));

    await waitFor(() => {
      expect(mockResetGame).toHaveBeenCalled();
      expect(mockNavigate).toHaveBeenCalledWith('/setup');
    });
  });

  it('"Zum Hauptmenü" navigiert zu /', async () => {
    render(<SpielauswertungScreen {...defaultProps} />);
    fireEvent.click(screen.getByText('Zum Hauptmenü'));

    await waitFor(() => {
      expect(mockNavigate).toHaveBeenCalledWith('/');
    });
  });

  it('zeigt keinen "Auswertung speichern"-Button wenn nicht eingeloggt', () => {
    render(<SpielauswertungScreen {...defaultProps} />);
    expect(screen.queryByText('Auswertung speichern')).not.toBeInTheDocument();
  });
});

describe('SpielauswertungScreen — postGameStats nicht sofort', () => {
  it('postGameStats wird nicht ohne optIn aufgerufen (kein useEffect-Trigger)', () => {
    render(<SpielauswertungScreen {...defaultProps} />);
    expect(vi.mocked(postGameStats)).not.toHaveBeenCalled();
  });
});
