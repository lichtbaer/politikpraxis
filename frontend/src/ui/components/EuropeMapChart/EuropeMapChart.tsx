import { useEffect, useRef, useState, useMemo } from 'react';
import { useTranslation } from 'react-i18next';
import ReactEChartsCore from 'echarts-for-react/esm/core';
import type { EChartsOption } from 'echarts';
import { echarts } from '../../lib/echarts';
import { useChartTheme } from '../../hooks/useChartTheme';
import { mix } from '../../lib/chartTokens';
import styles from './EuropeMapChart.module.css';

const MAP_NAME = 'europe-politikpraxis';

const EU_COUNTRIES = new Set([
  'Austria', 'Belgium', 'Bulgaria', 'Croatia', 'Cyprus', 'Czech Republic',
  'Denmark', 'Estonia', 'Finland', 'France', 'Germany', 'Greece', 'Hungary',
  'Ireland', 'Italy', 'Latvia', 'Lithuania', 'Luxembourg', 'Malta',
  'Netherlands', 'Poland', 'Portugal', 'Romania', 'Slovakia', 'Slovenia',
  'Spain', 'Sweden',
]);

export function EuropeMapChart() {
  const { theme: chartTheme, tokens } = useChartTheme();
  const { t } = useTranslation('game');
  const [mapReady, setMapReady] = useState(false);
  const loadedRef = useRef(false);

  useEffect(() => {
    if (loadedRef.current) return;
    loadedRef.current = true;

    fetch('/geo/europe.geojson')
      .then((r) => r.json())
      .then((geoJson) => {
        const euOnly = {
          ...geoJson,
          features: geoJson.features.filter(
            (f: { properties?: { name?: string } }) => EU_COUNTRIES.has(f.properties?.name ?? '')
          ),
        };
        echarts.registerMap(MAP_NAME, euOnly);
        setMapReady(true);
      })
      .catch(() => {
        // Silently fail — fallback SVG still in place if needed
      });
  }, []);

  const option: EChartsOption = useMemo(() => ({
    animation: true,
    animationDuration: 1200,
    animationEasing: 'cubicOut',
    tooltip: {
      trigger: 'item',
      backgroundColor: tokens.bg2,
      borderColor: tokens.border2,
      borderWidth: 1,
      textStyle: { color: tokens.text, fontSize: 12, fontFamily: tokens.sans },
      formatter: (params: unknown) => {
        const p = params as { name: string };
        if (p.name === 'Germany') return `<b>${t('europaKarte.deutschland')}</b>`;
        return p.name || '';
      },
    },
    series: [
      {
        type: 'map',
        map: MAP_NAME,
        roam: false,
        silent: false,
        selectedMode: false,
        itemStyle: {
          areaColor: tokens.bg3,
          borderColor: tokens.border2,
          borderWidth: 0.8,
        },
        emphasis: {
          label: { show: false },
          itemStyle: {
            areaColor: mix(tokens.green, tokens.bg3, 0.45),
            borderColor: tokens.green,
          },
        },
        // Germany highlighted
        data: [
          {
            name: 'Germany',
            itemStyle: {
              areaColor: mix(tokens.gold, tokens.bg3, 0.3),
              borderColor: tokens.gold,
              borderWidth: 1.5,
            },
            emphasis: {
              itemStyle: {
                areaColor: mix(tokens.gold, tokens.bg3, 0.5),
                borderColor: tokens.gold,
              },
            },
            label: {
              show: true,
              formatter: 'DE',
              color: tokens.text,
              fontSize: 9,
              fontWeight: 'bold',
            },
          },
        ],
        zoom: 1.4,
        center: [10, 52],
        layoutCenter: ['50%', '50%'],
        layoutSize: '140%',
      },
    ],
  }), [t, tokens]);

  if (!mapReady) {
    return <div className={styles.placeholder} aria-hidden="true" />;
  }

  return (
    <div className={styles.mapWrap} aria-hidden="true">
      <ReactEChartsCore
        echarts={echarts}
        option={option}
        theme={chartTheme}
        style={{ width: '100%', height: '100%' }}
        opts={{ renderer: 'canvas' }}
        notMerge={false}
      />
    </div>
  );
}
