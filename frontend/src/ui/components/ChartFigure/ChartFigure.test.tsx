import { describe, it, expect, afterEach } from 'vitest';
import { render, screen, cleanup } from '@testing-library/react';
import { ChartFigure } from './ChartFigure';

afterEach(() => cleanup());

describe('ChartFigure', () => {
  it('rendert mit role="img" und dem übergebenen aria-label', () => {
    render(
      <ChartFigure ariaLabel="Testwert: 42%">
        <canvas />
      </ChartFigure>,
    );
    const figure = screen.getByRole('img', { name: 'Testwert: 42%' });
    expect(figure).toBeInTheDocument();
  });

  it('rendert die Kind-Elemente innerhalb der Figure', () => {
    render(
      <ChartFigure ariaLabel="Testwert">
        <span data-testid="chart-child">Chart</span>
      </ChartFigure>,
    );
    expect(screen.getByTestId('chart-child')).toBeInTheDocument();
  });
});
