import { describe, it, expect, vi, afterEach } from 'vitest';
import { render, screen, cleanup } from '@testing-library/react';
import { CoalitionMeter } from './CoalitionMeter';

vi.mock('react-i18next', () => ({
  useTranslation: () => ({
    t: (k: string, opts?: Record<string, unknown>): string =>
      opts ? `${k}:${JSON.stringify(opts)}` : k,
  }),
}));

afterEach(() => cleanup());

describe('CoalitionMeter', () => {
  it('rendert den Chart mit role="img" und einem nicht-leeren aria-label', () => {
    render(<CoalitionMeter value={72} />);
    const figure = screen.getByRole('img');
    expect(figure).toBeInTheDocument();
    expect(figure.getAttribute('aria-label')).toBeTruthy();
  });

  it('nimmt den gerundeten Wert in das aria-label auf', () => {
    render(<CoalitionMeter value={41.6} />);
    const figure = screen.getByRole('img');
    expect(figure.getAttribute('aria-label')).toContain('"value":42');
  });
});
