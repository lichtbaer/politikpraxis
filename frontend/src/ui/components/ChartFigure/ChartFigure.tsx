import type { ReactNode } from 'react';

interface ChartFigureProps {
  /** Accessible name for the chart, announced by screen readers via role="img". */
  ariaLabel: string;
  children: ReactNode;
  className?: string;
}

/**
 * Wraps a canvas-rendered ECharts chart with an accessible name.
 * The canvas itself is opaque to screen readers, so role="img" + aria-label
 * exposes a short textual summary of what the chart shows instead.
 */
export function ChartFigure({ ariaLabel, children, className }: ChartFigureProps) {
  return (
    <div role="img" aria-label={ariaLabel} className={className}>
      {children}
    </div>
  );
}
