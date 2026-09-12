import { useMemo } from 'react';
import { useUIStore } from '../../store/uiStore';
import { ensureChartTheme, chartTokens, type ChartTokens } from '../lib/chartTokens';

/**
 * Liefert Theme-Name und aufgelöste Farbtoken für ein Diagramm.
 *
 * `theme` gehört an `<ReactEChartsCore theme={...}>`, `tokens` an alle Farbwerte,
 * die direkt in der Chart-Option stehen (ECharts-Optionen können keine CSS-Variablen
 * auflösen — siehe `lib/chartTokens.ts`).
 */
export function useChartTheme(): { theme: string; tokens: ChartTokens } {
  const uiTheme = useUIStore((s) => s.theme);
  return useMemo(
    () => ({ theme: ensureChartTheme(uiTheme), tokens: chartTokens(uiTheme) }),
    [uiTheme],
  );
}
