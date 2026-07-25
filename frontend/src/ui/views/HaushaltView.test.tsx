import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import { render, screen, fireEvent, cleanup } from '@testing-library/react';
import { makeState } from '../../core/test-helpers';
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
vi.mock('echarts-for-react/lib/core', () => ({ default: () => <div data-testid="echarts-mock" /> }));
vi.mock('../lib/echarts', () => ({ echarts: {} }));
vi.mock('../components/WirtschaftsDashboard/WirtschaftsDashboard', () => ({
  WirtschaftsDashboard: () => <div data-testid="wirtschafts-dashboard" />,
}));
vi.mock('../components/KpiVerlaufChart/KpiVerlaufChart', () => ({
  KpiVerlaufChart: () => <div data-testid="kpi-verlauf-chart" />,
}));

import { HaushaltView } from './HaushaltView';
import { useGameStore } from '../../store/gameStore';

const mockDoSteuerquoteChange = vi.fn();

function setupStore(overrides: { complexity?: number; state?: Record<string, unknown> } = {}) {
  const complexity = overrides.complexity ?? 3;
  const baseState = makeState({
    pk: 100,
    month: 1,
    steuerquoteAktionJahr: undefined,
    haushalt: {
      einnahmen: 120,
      pflichtausgaben: 80,
      laufendeAusgaben: 10,
      spielraum: 30,
      saldo: 30,
      saldoKumulativ: 30,
      konjunkturIndex: 1.5,
      steuerpolitikModifikator: 0,
      investitionsquote: 0,
      schuldenbremseAktiv: true,
      haushaltsplanMonat: 1,
      haushaltsplanBeschlossen: false,
      planPrioritaeten: [],
    },
    haushaltSaldoHistory: [10, 20, 30],
    ...(overrides.state ?? {}),
  });
  const store = {
    state: baseState,
    complexity,
    content: DEFAULT_CONTENT,
    doSteuerquoteChange: mockDoSteuerquoteChange,
  };
  (vi.mocked(useGameStore) as ReturnType<typeof vi.fn>).mockImplementation(
    (sel?: (s: typeof store) => unknown) => (sel ? sel(store) : store),
  );
  return store;
}

afterEach(() => cleanup());

beforeEach(() => {
  vi.clearAllMocks();
});

describe('HaushaltView — Stufe < 2', () => {
  it('zeigt Stufe-2-Hinweis statt der vollen Ansicht', () => {
    setupStore({ complexity: 1 });
    render(<HaushaltView />);
    expect(screen.getByText('Haushaltsübersicht ab Stufe 2 verfügbar.')).toBeInTheDocument();
    expect(screen.queryByText('Einnahmen vs. Ausgaben')).not.toBeInTheDocument();
  });
});

describe('HaushaltView — Stufe 3', () => {
  beforeEach(() => setupStore({ complexity: 3 }));

  it('rendert ohne Crash', () => {
    render(<HaushaltView />);
    expect(document.body).toBeInTheDocument();
  });

  it('zeigt Einnahmen/Ausgaben-Balken', () => {
    render(<HaushaltView />);
    expect(screen.getByText('Einnahmen vs. Ausgaben')).toBeInTheDocument();
    expect(screen.getByText('+120 ui.mrd')).toBeInTheDocument();
  });

  it('zeigt den Haushaltssaldo', () => {
    render(<HaushaltView />);
    expect(screen.getByText('haushalt.saldo')).toBeInTheDocument();
  });

  it('zeigt das Wirtschafts-Dashboard (wirtschaftssektoren-Feature ab Stufe 2)', () => {
    render(<HaushaltView />);
    expect(screen.getByTestId('wirtschafts-dashboard')).toBeInTheDocument();
  });

  it('zeigt die Steuerquote-Regler-Sektion mit aktivierten Buttons bei ausreichend PK', () => {
    render(<HaushaltView />);
    expect(screen.getByText('Steuerquote anpassen')).toBeInTheDocument();
    expect(screen.getByText('haushalt.steuerquoteErhoehen')).not.toBeDisabled();
  });

  it('Klick auf "Steuerquote erhöhen" ruft doSteuerquoteChange(2) auf', () => {
    render(<HaushaltView />);
    fireEvent.click(screen.getByText('haushalt.steuerquoteErhoehen'));
    expect(mockDoSteuerquoteChange).toHaveBeenCalledWith(2);
  });

  it('Klick auf "Steuerquote senken" ruft doSteuerquoteChange(-3) auf', () => {
    render(<HaushaltView />);
    fireEvent.click(screen.getByText('haushalt.steuerquoteSenken'));
    expect(mockDoSteuerquoteChange).toHaveBeenCalledWith(-3);
  });

  it('verbirgt den Steuerquote-Regler, wenn im laufenden Jahr bereits genutzt', () => {
    setupStore({ complexity: 3, state: { steuerquoteAktionJahr: 1, month: 1 } });
    render(<HaushaltView />);
    expect(screen.queryByText('Steuerquote anpassen')).not.toBeInTheDocument();
  });
});
