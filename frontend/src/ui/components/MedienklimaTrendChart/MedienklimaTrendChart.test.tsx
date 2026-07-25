import { describe, it, expect, vi, afterEach } from 'vitest';
import { render, screen, cleanup } from '@testing-library/react';
import { MedienklimaTrendChart } from './MedienklimaTrendChart';

vi.mock('react-i18next', () => ({
  useTranslation: () => ({
    t: (k: string, opts?: Record<string, unknown>): string =>
      opts ? `${k}:${JSON.stringify(opts)}` : k,
  }),
}));

afterEach(() => cleanup());

describe('MedienklimaTrendChart', () => {
  it('rendert bei vorhandenem Verlauf einen Chart mit role="img" und aria-label', () => {
    render(<MedienklimaTrendChart history={[50, 55, 60, 62]} current={62} />);
    const figure = screen.getByRole('img');
    expect(figure).toBeInTheDocument();
    expect(figure.getAttribute('aria-label')).toContain('"value":62');
  });

  it('zeigt bei leerem Verlauf keinen Chart', () => {
    render(<MedienklimaTrendChart history={[]} current={55} />);
    expect(screen.queryByRole('img')).not.toBeInTheDocument();
  });
});
