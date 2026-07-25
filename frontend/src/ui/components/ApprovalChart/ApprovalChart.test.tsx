import { describe, it, expect, vi, afterEach } from 'vitest';
import { render, screen, cleanup } from '@testing-library/react';
import { ApprovalChart } from './ApprovalChart';

vi.mock('react-i18next', () => ({
  useTranslation: () => ({
    t: (k: string, opts?: Record<string, unknown>): string => (opts ? `${k}:${JSON.stringify(opts)}` : k),
  }),
}));

vi.mock('echarts-for-react/lib/core', () => ({
  default: () => <div data-testid="echarts-mock" />,
}));

afterEach(() => cleanup());

describe('ApprovalChart', () => {
  it('exposes the chart canvas as an accessible role="img" with a descriptive aria-label', () => {
    render(<ApprovalChart history={[40, 42, 45, 50]} threshold={45} currentMonth={4} />);
    const img = screen.getByRole('img');
    const label = img.getAttribute('aria-label');
    expect(label).toContain('approvalChart.ariaLabel');
    expect(label).toContain('"count":4');
    expect(label).toContain('"threshold":45');
  });
});
