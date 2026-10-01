/**
 * #482: End-Screen unterscheidet reguläres Legislaturende (Wahlnacht mit Hochrechnung)
 * vom vorzeitigen Sturz der Regierung (keine Wahl, keine Hochrechnung).
 */
import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import { render, screen, fireEvent, cleanup } from '@testing-library/react';
import React from 'react';
import type { GameState, SpielendeGrund } from '../../core/types';

vi.mock('react-i18next', () => ({
  useTranslation: () => ({
    t: (k: string) => k,
  }),
}));
vi.mock('../../store/gameStore', () => ({ useGameStore: vi.fn() }));
vi.mock('./SpielauswertungScreen', () => ({
  SpielauswertungScreen: vi.fn((props: { vorzeitigesEnde?: boolean }) =>
    React.createElement('div', {
      'data-testid': 'auswertung',
      'data-vorzeitig': String(props.vorzeitigesEnde ?? false),
    }),
  ),
}));
vi.mock('./KanzlerbilanzBeat', () => ({
  KanzlerbilanzBeat: (props: { onWeiter: () => void }) =>
    React.createElement('button', { 'data-testid': 'kanzlerbilanz', onClick: props.onWeiter }, 'zurück'),
}));

import { WahlnachtScreen } from './WahlnachtScreen';
import { useGameStore } from '../../store/gameStore';
import { SpielauswertungScreen } from './SpielauswertungScreen';

function setupStore(state: Partial<GameState>) {
  const gs = {
    state: {
      month: 21,
      zust: { g: 30, arbeit: 30, mitte: 30, prog: 30 },
      gameOver: true,
      won: false,
      ...state,
    },
    content: {},
    complexity: 2,
  };
  (vi.mocked(useGameStore) as ReturnType<typeof vi.fn>).mockImplementation(
    (sel?: (s: typeof gs) => unknown) => (sel ? sel(gs) : gs),
  );
}

afterEach(() => cleanup());

beforeEach(() => {
  vi.clearAllMocks();
});

describe('WahlnachtScreen — vorzeitiges Spielende (#482)', () => {
  const faelle: [Exclude<SpielendeGrund, 'legislatur'>, string][] = [
    ['koalitionsbruch', 'game:endScreen.lostKoalitionsbruch'],
    ['partner_kuendigt', 'game:endScreen.lostPartnerKuendigt'],
    ['misstrauensvotum', 'game:endScreen.lostMisstrauen'],
    ['vertrauensfrage', 'game:endScreen.lostVertrauensfrage'],
    ['ruecktritt', 'game:endScreen.lostRuecktritt'],
  ];

  it.each(faelle)('%s: „Regierung gestürzt“ mit Begründung, ohne Hochrechnung', (grund, textKey) => {
    setupStore({ spielendeGrund: grund });
    render(<WahlnachtScreen />);

    expect(screen.getByRole('heading', { level: 1 })).toHaveTextContent('game:endScreen.gestuerzt');
    expect(screen.getByText(textKey)).toBeInTheDocument();
    expect(screen.getByText('game:endScreen.gestuerztKeineWahl')).toBeInTheDocument();
    // Keine Wahlnacht-Elemente
    expect(screen.queryByText('game:wahlnacht.hochrechnung')).not.toBeInTheDocument();
    expect(screen.queryByText('game:endScreen.lost')).not.toBeInTheDocument();
    expect(screen.queryByText('game:endScreen.lostSubtitle')).not.toBeInTheDocument();
  });

  it('übergibt vorzeitigesEnde an die Auswertung (Wahlergebnis ausblenden)', () => {
    setupStore({ spielendeGrund: 'misstrauensvotum' });
    render(<WahlnachtScreen />);

    expect(screen.getByTestId('auswertung')).toHaveAttribute('data-vorzeitig', 'true');
    expect(vi.mocked(SpielauswertungScreen).mock.calls[0][0]).toMatchObject({
      gewonnen: false,
      vorzeitigesEnde: true,
    });
  });

  it('Kanzlerbilanz und zurück bleiben in der Sturz-Ansicht', () => {
    setupStore({ spielendeGrund: 'koalitionsbruch' });
    render(<WahlnachtScreen />);

    fireEvent.click(screen.getByText('game:wahlnacht.weiterKanzlerbilanz'));
    expect(screen.getByTestId('kanzlerbilanz')).toBeInTheDocument();
    expect(screen.queryByText('game:endScreen.gestuerzt')).not.toBeInTheDocument();

    fireEvent.click(screen.getByTestId('kanzlerbilanz'));
    expect(screen.getByText('game:endScreen.gestuerzt')).toBeInTheDocument();
    expect(screen.queryByText('game:wahlnacht.hochrechnung')).not.toBeInTheDocument();
  });
});

describe('WahlnachtScreen — reguläres Legislaturende', () => {
  it('legislatur: beginnt mit der Hochrechnung', () => {
    setupStore({ month: 48, spielendeGrund: 'legislatur', wahlergebnis: 41 });
    render(<WahlnachtScreen />);

    expect(screen.getByText('game:wahlnacht.hochrechnung')).toBeInTheDocument();
    expect(screen.queryByText('game:endScreen.gestuerzt')).not.toBeInTheDocument();
  });

  it('alter Spielstand ohne spielendeGrund: bisheriges Verhalten (Hochrechnung)', () => {
    setupStore({ month: 48, wahlergebnis: 41 });
    render(<WahlnachtScreen />);

    expect(screen.getByText('game:wahlnacht.hochrechnung')).toBeInTheDocument();
    expect(screen.queryByText('game:endScreen.gestuerzt')).not.toBeInTheDocument();
  });

  it('rendert nichts, solange das Spiel läuft', () => {
    setupStore({ gameOver: false });
    const { container } = render(<WahlnachtScreen />);
    expect(container).toBeEmptyDOMElement();
  });
});
