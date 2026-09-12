/**
 * Radar-Diagramm für die 5-dimensionale Legislatur-Bewertung (SMA-343).
 * Zeigt Demokratie, Wirtschaft, Gesellschaft, Kommunikation, Effizienz.
 */
import { useMemo } from 'react';
import { useTranslation } from 'react-i18next';
import ReactEChartsCore from 'echarts-for-react/esm/core';
import type { EChartsOption } from 'echarts';
import { echarts } from '../../lib/echarts';
import { useChartTheme } from '../../hooks/useChartTheme';
import { withAlpha } from '../../lib/chartTokens';
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

const DIM_KEYS = ['demokratie', 'wirtschaft', 'gesellschaft', 'kommunikation', 'effizienz'] as const;

export function BewertungRadarChart({ dimensionen }: BewertungRadarChartProps) {
  const { theme: chartTheme, tokens } = useChartTheme();
  const { t } = useTranslation('game');

  const dimMeta = useMemo(
    () => DIM_KEYS.map((key) => ({
      key,
      label: t(`bewertungRadar.${key}.label`),
      desc: t(`bewertungRadar.${key}.desc`),
    })),
    [t],
  );

  const values = useMemo(
    () => dimMeta.map((d) => dimensionen[d.key]),
    [dimensionen, dimMeta],
  );

  const option: EChartsOption = useMemo(
    () => ({
      animation: true,
      animationDuration: 900,
      animationEasing: 'cubicOut',
      tooltip: {
        trigger: 'item',
        backgroundColor: tokens.bg2,
        borderColor: '#444',
        borderWidth: 1,
        padding: [8, 12],
        textStyle: { color: tokens.text, fontSize: 11, fontFamily: tokens.sans },
        formatter: () =>
          dimMeta.map((d, i) => {
            const v = values[i];
            const bar =
              '█'.repeat(Math.round(v / 10)) +
              '░'.repeat(10 - Math.round(v / 10));
            return (
              `<div style="margin-bottom:6px">` +
              `<strong style="color:${tokens.text}">${d.label}</strong>` +
              `<span style="float:right;color:${tokens.green};font-weight:700;margin-left:12px">${v}</span>` +
              `<br/><span style="font-family:${tokens.mono};color:${tokens.green};font-size:10px">${bar}</span>` +
              `<br/><span style="color:#888;font-size:10px">${d.desc}</span>` +
              `</div>`
            );
          }).join(''),
      },
      radar: {
        shape: 'polygon',
        indicator: dimMeta.map((d) => ({ name: d.label, max: 100 })),
        center: ['50%', '52%'],
        radius: '68%',
        axisName: {
          color: tokens.text2,
          fontSize: 11,
          fontWeight: 600,
        },
        splitNumber: 4,
        splitArea: {
          areaStyle: {
            color: [
              withAlpha(tokens.bg2, 0.4),
              withAlpha(tokens.bg3, 0.4),
              withAlpha(tokens.bg3, 0.7),
              withAlpha(tokens.bg4, 0.7),
            ],
          },
        },
        axisLine: { lineStyle: { color: tokens.border } },
        splitLine: { lineStyle: { color: tokens.border, type: 'dashed' } },
      },
      series: [
        {
          type: 'radar',
          data: [
            {
              value: values,
              name: t('bewertungRadar.bewertung'),
              areaStyle: {
                color: {
                  type: 'radial' as const,
                  x: 0.5,
                  y: 0.5,
                  r: 0.7,
                  colorStops: [
                    { offset: 0, color: withAlpha(tokens.green, 0.45) },
                    { offset: 1, color: withAlpha(tokens.green, 0.08) },
                  ],
                },
              },
              lineStyle: { color: tokens.green, width: 2.5 },
              itemStyle: { color: tokens.green, borderColor: tokens.bg2, borderWidth: 2 },
              symbol: 'circle',
              symbolSize: 5,
            },
          ],
        },
      ],
    }),
    [values, dimMeta, t, tokens],
  );

  return (
    <div className={styles.container}>
      <p className={styles.hint}>
        {t('bewertungRadar.hint')}
      </p>
      {/* Decorative: the dimLegend list below provides the equivalent data as text for screen readers. */}
      <div aria-hidden="true">
        <ReactEChartsCore
          echarts={echarts}
          option={option}
          theme={chartTheme}
          style={{ width: '100%', height: 260 }}
          opts={{ renderer: 'canvas' }}
          notMerge={false}
        />
      </div>
      <div className={styles.dimLegend}>
        {dimMeta.map((d, i) => (
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
