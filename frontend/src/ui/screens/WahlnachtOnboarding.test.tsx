import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import { render, screen, fireEvent, cleanup } from '@testing-library/react';

vi.mock('react-i18next', () => ({
  useTranslation: () => ({ t: (k: string) => k, i18n: { language: 'de' } }),
}));
vi.mock('../../store/gameStore', () => ({ useGameStore: vi.fn() }));
vi.mock('../../store/authStore', () => ({ useAuthStore: vi.fn() }));
vi.mock('../../core/systems/features', () => ({ featureActive: vi.fn(() => false) }));
vi.mock('../../core/systems/medien/wahlprognose', () => ({ berechneWahlprognose: vi.fn(() => 42.5) }));
vi.mock('../../core/systems/koalition', () => ({
  berechneKoalitionspartner: vi.fn(() => null),
  getKoalitionspartner: vi.fn(() => null),
}));
vi.mock('../../core/gesetzAgenda', () => ({
  getKoalitionsStanz: vi.fn(() => 'neutral'),
  gruppiereNachKoalitionsStanz: vi.fn(() => ({})),
}));
vi.mock('../components/IdeologieSlider/IdeologieSlider', () => ({ IdeologieSlider: () => null }));
vi.mock('../../services/saves', () => ({ postGameAgenda: vi.fn(() => Promise.resolve()) }));

import { WahlnachtOnboarding } from './WahlnachtOnboarding';
import { useGameStore } from '../../store/gameStore';
import { useAuthStore } from '../../store/authStore';

const mockStartGame = vi.fn();
const mockInit = vi.fn();
const mockSetSpielerPartei = vi.fn();
const mockSetAusrichtung = vi.fn();
const mockSetSpielerAgendaIds = vi.fn();

const baseState = {
  chars: [],
  kanzlerName: 'Test Kanzler',
  pk: 10,
  spielerPartei: null,
  koalitionspartner: null,
  koalitionsAgenda: [],
  koalitionsvertragProfil: { wirtschaft: 0, gesellschaft: 0, staat: 0 },
  gesetze: [],
  agendaZiele: [],
  koalitionsZiele: [],
};

const baseContent = {
  milieus: [],
  agendaZiele: [],
  koalitionsZiele: [],
  laws: [],
};

function setupGameStore(overrides: { complexity?: number; state?: Record<string, unknown> } = {}) {
  const complexity = overrides.complexity ?? 1;
  const store = {
    state: { ...baseState, ...(overrides.state ?? {}) },
    content: baseContent,
    playerName: 'Max Mustermann',
    complexity,
    init: mockInit,
    startGame: mockStartGame,
    setSpielerPartei: mockSetSpielerPartei,
    setAusrichtung: mockSetAusrichtung,
    setSpielerAgendaIds: mockSetSpielerAgendaIds,
    cloudSaveId: null,
  };
  const mock = vi.mocked(useGameStore) as unknown as ReturnType<typeof vi.fn>;
  mock.mockImplementation((sel?: (s: typeof store) => unknown) => (sel ? sel(store) : store));
  return store;
}

afterEach(() => cleanup());

beforeEach(() => {
  vi.clearAllMocks();
  setupGameStore();
  vi.mocked(useAuthStore).mockReturnValue(null as unknown as ReturnType<typeof useAuthStore>);
  (vi.mocked(useAuthStore) as ReturnType<typeof vi.fn>).mockImplementation((sel?: (s: { accessToken: null }) => unknown) => {
    const s = { accessToken: null };
    return sel ? sel(s) : s;
  });
});

describe('WahlnachtOnboarding — Spielstart (Komplexität 1)', () => {
  it('rendert ohne Crash bei complexity=1', () => {
    setupGameStore({ complexity: 1 });
    render(<WahlnachtOnboarding />);
    // Bei complexity=1 kein Partei-Screen (Beat startet bei 3 = Schlagzeile)
    expect(document.body).toBeInTheDocument();
  });

  it('zeigt keinen Partei-Auswahlscreen bei complexity=1', () => {
    setupGameStore({ complexity: 1 });
    render(<WahlnachtOnboarding />);
    expect(screen.queryByText('game:onboarding.parteiTitle')).not.toBeInTheDocument();
  });
});

describe('WahlnachtOnboarding — Partei-Auswahl (Komplexität 2)', () => {
  it('zeigt Partei-Auswahlscreen bei complexity=2', () => {
    setupGameStore({ complexity: 2 });
    render(<WahlnachtOnboarding />);
    expect(screen.getByText('game:onboarding.parteiTitle')).toBeInTheDocument();
  });

  it('zeigt alle spielbaren Parteien', () => {
    setupGameStore({ complexity: 2 });
    render(<WahlnachtOnboarding />);
    expect(screen.getByText('Sozialdemokratische Partei')).toBeInTheDocument();
    expect(screen.getByText('Christlich-Demokratische Partei')).toBeInTheDocument();
    expect(screen.getByText('Liberal-Demokratische Partei')).toBeInTheDocument();
  });

  it('Klick auf Partei ruft setSpielerPartei auf und zeigt Beat 1', () => {
    setupGameStore({ complexity: 2 });
    render(<WahlnachtOnboarding />);

    fireEvent.click(screen.getByText('Sozialdemokratische Partei'));

    expect(mockSetSpielerPartei).toHaveBeenCalledWith(
      expect.objectContaining({ id: 'sdp', kuerzel: 'SDP' }),
    );
  });

  it('zeigt Bestätigungs-Beat nach Partei-Auswahl', () => {
    setupGameStore({ complexity: 2 });
    render(<WahlnachtOnboarding />);

    fireEvent.click(screen.getByText('Sozialdemokratische Partei'));

    // Beat 1: Partei-Bestätigung — Weiter-Button sichtbar
    expect(screen.getByText('game:onboarding.weiter')).toBeInTheDocument();
  });
});

describe('WahlnachtOnboarding — Fortschritts-Dots', () => {
  it('rendert Fortschritts-Dots (aria-label)', () => {
    setupGameStore({ complexity: 2 });
    render(<WahlnachtOnboarding />);
    const dotsContainer = document.querySelector('[aria-label*="game:onboarding.stepProgress"]');
    expect(dotsContainer).toBeInTheDocument();
  });
});
