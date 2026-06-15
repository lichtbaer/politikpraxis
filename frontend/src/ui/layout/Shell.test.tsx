import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import { render, fireEvent, cleanup } from '@testing-library/react';
import React from 'react';

// Child-Komponenten leer mocken, damit Shell isoliert testbar ist
vi.mock('./Header', () => ({ Header: () => React.createElement('div', { 'data-testid': 'header' }) }));
vi.mock('../components/EbenenTabBar/EbenenTabBar', () => ({ EbenenTabBar: () => null }));
vi.mock('../panels/LeftPanel', () => ({ LeftPanel: () => null }));
vi.mock('../panels/CenterPanel', () => ({ CenterPanel: () => null }));
vi.mock('../panels/RightPanel', () => ({ RightPanel: () => null }));
vi.mock('../components/CharacterDetail/CharacterDetail', () => ({ CharacterDetail: () => null }));
vi.mock('../screens/WahlnachtScreen', () => ({ WahlnachtScreen: () => null }));
vi.mock('../components/Toast/Toast', () => ({ Toast: () => null }));
vi.mock('../components/GameTips/GameTips', () => ({ GameTips: () => null }));
vi.mock('../components/IntroTour/IntroTour', () => ({ IntroTour: () => null }));
vi.mock('../screens/HaushaltsdebatteScreen', () => ({ HaushaltsdebatteScreen: () => null }));
vi.mock('../screens/LegislaturBilanzScreen', () => ({ LegislaturBilanzScreen: () => null }));
vi.mock('../components/MonatszusammenfassungModal/MonatszusammenfassungModal', () => ({
  MonatszusammenfassungModal: () => null,
}));
vi.mock('../icons', () => ({ Users: () => null }));
vi.mock('../hooks/useGameTick', () => ({ useGameTick: vi.fn() }));
vi.mock('../hooks/useAutoSave', () => ({ useAutoSave: vi.fn() }));
vi.mock('react-i18next', () => ({
  useTranslation: () => ({ t: (k: string) => k }),
}));
vi.mock('../../store/gameStore', () => ({ useGameStore: vi.fn() }));
vi.mock('../../store/uiStore', () => ({ useUIStore: vi.fn() }));

import { Shell } from './Shell';
import { useGameStore } from '../../store/gameStore';
import { useUIStore } from '../../store/uiStore';

const mockSetView = vi.fn();
const mockTogglePause = vi.fn();
const mockSetSpeed = vi.fn();
const mockDoResolveEvent = vi.fn();
const mockSetShowShortcutHelp = vi.fn();

function makeGameStore(overrides: Record<string, unknown> = {}) {
  const state = { aktivesStrukturEvent: null, letzterMonatsDiff: null, speed: 1, activeEvent: null, pk: 10, ...overrides };
  const store = {
    state,
    content: { laws: [] },
    setSpeed: mockSetSpeed,
    togglePause: mockTogglePause,
    doResolveEvent: mockDoResolveEvent,
    setView: mockSetView,
  };
  return store;
}

function makeUIStore(overrides: Record<string, unknown> = {}) {
  return {
    openMonatszusammenfassung: false,
    showShortcutHelp: false,
    setOpenMonatszusammenfassung: vi.fn(),
    requestFocusEreignisprotokoll: vi.fn(),
    setShowShortcutHelp: mockSetShowShortcutHelp,
    ...overrides,
  };
}

function setupMocks(gameOverrides = {}, uiOverrides = {}) {
  const gs = makeGameStore(gameOverrides);
  const us = makeUIStore(uiOverrides);

  const gameStoreMock = vi.mocked(useGameStore) as unknown as ReturnType<typeof vi.fn> & { getState: () => typeof gs };
  gameStoreMock.mockImplementation((sel?: (s: typeof gs) => unknown) => (sel ? sel(gs) : gs));
  gameStoreMock.getState = () => gs;

  const uiStoreMock = vi.mocked(useUIStore) as unknown as ReturnType<typeof vi.fn> & { getState: () => typeof us };
  uiStoreMock.mockImplementation((sel?: (s: typeof us) => unknown) => (sel ? sel(us) : us));
  uiStoreMock.getState = () => us;

  return { gs, us };
}

afterEach(() => cleanup());

beforeEach(() => {
  vi.clearAllMocks();
  setupMocks();
});

describe('Shell — Rendering', () => {
  it('rendert ohne Crash', () => {
    const { getByTestId } = render(<Shell />);
    expect(getByTestId('header')).toBeInTheDocument();
  });
});

describe('Shell — Alt+Ziffern Tab-Wechsel', () => {
  it('Alt+1 ruft setView("agenda") auf', () => {
    render(<Shell />);
    fireEvent.keyDown(window, { key: '1', altKey: true });
    expect(mockSetView).toHaveBeenCalledWith('agenda');
  });

  it('Alt+2 ruft setView("bundestag") auf', () => {
    render(<Shell />);
    fireEvent.keyDown(window, { key: '2', altKey: true });
    expect(mockSetView).toHaveBeenCalledWith('bundestag');
  });

  it('Alt+w ruft setView("wahlkampf") auf', () => {
    render(<Shell />);
    fireEvent.keyDown(window, { key: 'w', altKey: true });
    expect(mockSetView).toHaveBeenCalledWith('wahlkampf');
  });
});

describe('Shell — Zeitsteuerung', () => {
  it('Space ruft togglePause auf wenn kein activeEvent', () => {
    render(<Shell />);
    fireEvent.keyDown(window, { key: ' ', code: 'Space' });
    expect(mockTogglePause).toHaveBeenCalled();
  });
});

describe('Shell — Shortcut-Hilfe', () => {
  it('"?" öffnet Shortcut-Hilfe', () => {
    render(<Shell />);
    fireEvent.keyDown(window, { key: '?' });
    expect(mockSetShowShortcutHelp).toHaveBeenCalled();
  });
});

describe('Shell — Event-Lösung per Tastatur', () => {
  it('Taste "1" löst Event-Choice aus wenn activeEvent mit 1 Choice und ausreichend PK', () => {
    const mockEvent = { id: 'ev1', choices: [{ id: 'c1', cost: 0 }] };
    setupMocks({ activeEvent: mockEvent, pk: 10 });

    render(<Shell />);
    fireEvent.keyDown(window, { key: '1' });
    expect(mockDoResolveEvent).toHaveBeenCalledWith(mockEvent, mockEvent.choices[0]);
  });

  it('Taste "1" löst Event NICHT aus wenn pk < cost', () => {
    const mockEvent = { id: 'ev2', choices: [{ id: 'c1', cost: 20 }] };
    setupMocks({ activeEvent: mockEvent, pk: 0 });

    render(<Shell />);
    fireEvent.keyDown(window, { key: '1' });
    expect(mockDoResolveEvent).not.toHaveBeenCalled();
  });

  it('Enter bestätigt Choice wenn activeEvent mit genau 1 Choice', () => {
    const mockEvent = { id: 'ev3', choices: [{ id: 'c1', cost: 0 }] };
    setupMocks({ activeEvent: mockEvent, pk: 5 });

    render(<Shell />);
    fireEvent.keyDown(window, { key: 'Enter' });
    expect(mockDoResolveEvent).toHaveBeenCalledWith(mockEvent, mockEvent.choices[0]);
  });
});
