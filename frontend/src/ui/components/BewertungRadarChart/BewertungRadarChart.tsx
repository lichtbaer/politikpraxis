/**
 * Radar-Diagramm für die 5-dimensionale Legislatur-Bewertung (SMA-343).
 * Zeigt Demokratie, Wirtschaft, Gesellschaft, Kommunikation, Effizienz.
 */
import { useMemo } from 'react';
import ReactECharts from 'echarts-for-react';
import type { EChartsOption } from 'echarts';
import styles from './BewertungRadarChart.module.css';

interface Dimensionen {
  demokratie: number;
  wirtschaft: number;
  gesellschaft: number;
  kommunikation: number;
  effizienz: number;
}

interface BewertungRadarChartProps {
  dimensionen: Dimensionen;
}

const DIM_META = [
  {
    key: 'demokratie' as const,
    label: 'Demokratie',
    desc: 'Koalitionsstabilität und Erfüllung des Koalitionsvertrags',
  },
  {
    key: 'wirtschaft' as const,
    label: 'Wirtschaft',
    desc: 'Haushaltssaldo, Arbeitslosigkeit und Konjunkturindex',
  },
  {
    key: 'gesellschaft' as const,
    label: 'Gesellschaft',
    desc: 'Milieu-Zustimmung und Gini-Koeffizient (Ungleichheit)',
  },
  {
    key: 'kommunikation' as const,
    label: 'Kommunikation',
    desc: 'Medienklima und öffentliche Außenwirkung',
  },
  {
    key: 'effizienz' as const,
    label: 'Effizienz',
    desc: 'Beschlossene Gesetze im Verhältnis zum verbrauchten Politischen Kapital',
  },
];

export function BewertungRadarChart({ dimensionen }: BewertungRadarChartProps) {
  const values = useMemo(
    () => DIM_META.map((d) => dimensionen[d.key]),
    [dimensionen],
  );

  const option: EChartsOption = useMemo(
    () => ({
      animation: true,
      animationDuration: 900,
      animationEasing: 'cubicOut',
      tooltip: {
        trigger: 'item',
        backgroundColor: '#1e1c18',
        borderColor: '#444',
        borderWidth: 1,
        padding: [8, 12],
        textStyle: { color: '#d0cfc8', fontSize: 11 },
        formatter: () =>
          DIM_META.map((d, i) => {
            const v = values[i];
            const bar =
              '█'.repeat(Math.round(v / 10)) +
              '░'.repeat(10 - Math.round(v / 10));
            return (
              `<div style="margin-bottom:6px">` +
              `<strong style="color:#e8e4d8">${d.label}</strong>` +
              `<span style="float:right;color:#5a9870;font-weight:700;margin-left:12px">${v}</span>` +
              `<br/><span style="font-family:monospace;color:#5a9870;font-size:10px">${bar}</span>` +
              `<br/><span style="color:#888;font-size:10px">${d.desc}</span>` +
              `</div>`
            );
          }).join(''),
      },
      radar: {
        shape: 'polygon',
        indicator: DIM_META.map((d) => ({ name: d.label, max: 100 })),
        center: ['50%', '52%'],
        radius: '68%',
        axisName: {
          color: '#c8c4bc',
          fontSize: 11,
          fontWeight: 600,
        },
        splitNumber: 4,
        splitArea: {
          areaStyle: {
            color: [
              'rgba(255,255,255,0.01)',
              'rgba(255,255,255,0.03)',
              'rgba(255,255,255,0.05)',
              'rgba(255,255,255,0.07)',
            ],
          },
        },
        axisLine: { lineStyle: { color: 'rgba(255,255,255,0.08)' } },
        splitLine: { lineStyle: { color: 'rgba(255,255,255,0.08)', type: 'dashed' } },
      },
      series: [
        {
          type: 'radar',
          data: [
            {
              value: values,
              name: 'Bewertung',
              areaStyle: {
                color: {
                  type: 'radial' as const,
                  x: 0.5,
                  y: 0.5,
                  r: 0.7,
                  colorStops: [
                    { offset: 0, color: 'rgba(90,152,112,0.45)' },
                    { offset: 1, color: 'rgba(90,152,112,0.08)' },
                  ],
                },
              },
              lineStyle: { color: '#5a9870', width: 2.5 },
              itemStyle: { color: '#5a9870', borderColor: '#1e1c18', borderWidth: 2 },
              symbol: 'circle',
              symbolSize: 5,
            },
          ],
        },
      ],
    }),
    [values],
  );

  return (
    <div className={styles.container}>
      <p className={styles.hint}>
        Hover für Details zu jeder Dimension
      </p>
      <ReactECharts
        option={option}
        theme="politikpraxis"
        style={{ width: '100%', height: 260 }}
        opts={{ renderer: 'canvas' }}
        notMerge={false}
      />
      <div className={styles.dimLegend}>
        {DIM_META.map((d, i) => (
          <div key={d.key} className={styles.dimLegendItem}>
            <span className={styles.dimLegendDot} />
            <span className={styles.dimLegendLabel}>{d.label}</span>
            <span className={styles.dimLegendValue}>{values[i]}</span>
          </div>
        ))}
      </div>
    </div>
  );
}
