import { describe, it, expect, vi, afterEach } from 'vitest';
import { render, screen, cleanup } from '@testing-library/react';
import { BundesratMap } from './BundesratMap';
import type { BundesratLand } from '../../../core/types';

vi.mock('react-i18next', () => ({
  useTranslation: () => ({
    t: (k: string, opts?: Record<string, unknown>): string => (opts ? `${k}:${JSON.stringify(opts)}` : k),
  }),
}));

vi.mock('echarts-for-react/lib/core', () => ({
  default: () => <div data-testid="echarts-mock" />,
}));

// registerMap etc. are not exercised; only the accessible fallback markup is under test.
vi.mock('../../lib/echarts', () => ({
  echarts: { registerMap: vi.fn() },
}));

afterEach(() => {
  cleanup();
  vi.unstubAllGlobals();
});

const LAENDER: BundesratLand[] = [
  {
    id: 'by',
    name: 'Bayern',
    mp: 'Ministerpräsident Bayern',
    party: 'CSU',
    alignment: 'koalition',
    mood: 4,
    interests: [],
    votes: 6,
  },
  {
    id: 'sh',
    name: 'Schleswig-Holstein',
    mp: 'Ministerpräsidentin SH',
    party: 'Grüne',
    alignment: 'opposition',
    mood: 2,
    interests: [],
    votes: 4,
  },
];

describe('BundesratMap', () => {
  it('provides a visually-hidden per-state breakdown as a screen-reader text alternative', async () => {
    vi.stubGlobal(
      'fetch',
      vi.fn(() => Promise.resolve({ json: () => Promise.resolve({ type: 'FeatureCollection', features: [] }) })),
    );
    render(<BundesratMap laender={LAENDER} />);
    // Map registration happens async in an effect; wait for the map wrapper to appear.
    const list = await screen.findByLabelText('bundesratMap.detailsLabel');
    expect(list.children).toHaveLength(2);
    expect(list.textContent).toContain('Bayern');
    expect(list.textContent).toContain('Schleswig-Holstein');
  });
});
