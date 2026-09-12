/**
 * ECharts: tree-shaken Modulauswahl.
 *
 * Themes werden nicht mehr hier registriert, sondern pro UI-Theme aus den
 * CSS-Token gebaut — siehe `lib/chartTokens.ts`. Das frühere einzelne
 * `politikpraxis`-Theme hatte die Amtsstube-Farben fest verdrahtet, sodass
 * Diagramme beim Theme-Wechsel unverändert blieben.
 *
 * Dieses Modul wird von den Chart-Komponenten importiert (nicht eager in
 * main.tsx) — sonst landet die Bibliothek im Entry-Chunk des Hauptmenüs.
 */
import * as echarts from 'echarts/core';
import { LineChart, BarChart, GaugeChart, MapChart, RadarChart } from 'echarts/charts';
import {
  GridComponent,
  TooltipComponent,
  MarkLineComponent,
  MarkAreaComponent,
  VisualMapComponent,
  GeoComponent,
  LegendComponent,
  RadarComponent,
} from 'echarts/components';
import { CanvasRenderer } from 'echarts/renderers';

echarts.use([
  LineChart,
  BarChart,
  GaugeChart,
  MapChart,
  RadarChart,
  GridComponent,
  TooltipComponent,
  MarkLineComponent,
  MarkAreaComponent,
  VisualMapComponent,
  GeoComponent,
  LegendComponent,
  RadarComponent,
  CanvasRenderer,
]);

export { echarts };
