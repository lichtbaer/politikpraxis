/**
 * ECharts tree-shaken setup + Politikpraxis dark theme registration.
 * Import this file once (e.g. in main.tsx or App.tsx) before using any ReactECharts component.
 */
import * as echarts from 'echarts/core';
import { LineChart, BarChart, GaugeChart, MapChart } from 'echarts/charts';
import {
  GridComponent,
  TooltipComponent,
  MarkLineComponent,
  MarkAreaComponent,
  VisualMapComponent,
  GeoComponent,
  LegendComponent,
} from 'echarts/components';
import { CanvasRenderer } from 'echarts/renderers';

echarts.use([
  LineChart,
  BarChart,
  GaugeChart,
  MapChart,
  GridComponent,
  TooltipComponent,
  MarkLineComponent,
  MarkAreaComponent,
  VisualMapComponent,
  GeoComponent,
  LegendComponent,
  CanvasRenderer,
]);

echarts.registerTheme('politikpraxis', {
  backgroundColor: 'transparent',
  textStyle: {
    fontFamily: 'var(--sans)',
    fontSize: 11,
  },
  color: ['#5a9870', '#c05848', '#c8a84b', '#4a7ab5', '#888'],
  line: {
    smooth: true,
    symbol: 'none',
    lineStyle: { width: 2 },
  },
  bar: {
    itemStyle: { borderRadius: [2, 2, 0, 0] },
  },
  categoryAxis: {
    axisLine: { show: false },
    axisTick: { show: false },
    splitLine: { show: false },
    axisLabel: { color: '#888', fontSize: 9 },
  },
  valueAxis: {
    axisLine: { show: false },
    axisTick: { show: false },
    splitLine: { lineStyle: { color: 'rgba(255,255,255,0.07)', type: 'dashed' } },
    axisLabel: { color: '#888', fontSize: 9 },
  },
  tooltip: {
    backgroundColor: '#1e1c18',
    borderColor: '#333',
    borderWidth: 1,
    textStyle: { color: '#d0cfc8', fontSize: 11 },
    extraCssText: 'border-radius:4px;padding:6px 10px;box-shadow:0 4px 16px rgba(0,0,0,0.45);',
  },
});

export { echarts };
