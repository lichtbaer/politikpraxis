import { useEffect, useRef, useState, useMemo } from 'react';
import { useTranslation } from 'react-i18next';
import ReactECharts from 'echarts-for-react';
import type { EChartsOption } from 'echarts';
import { echarts } from '../../lib/echarts';
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
  const { t } = useTranslation('game');
  const [mapReady, setMapReady] = useState(false);
  const loadedRef = useRef(false);

  useEffect(() => {
    if (loadedRef.current) return;
    loadedRef.current = true;

    fetch('/europe.geo.json')
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
      backgroundColor: '#1a1814',
      borderColor: '#3a3830',
      borderWidth: 1,
      textStyle: { color: '#c0bfb8', fontSize: 12, fontFamily: 'var(--sans)' },
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
          areaColor: '#2a2820',
          borderColor: '#4a4840',
          borderWidth: 0.8,
        },
        emphasis: {
          label: { show: false },
          itemStyle: {
            areaColor: '#4a6858',
            borderColor: '#6a8878',
          },
        },
        // Germany highlighted
        data: [
          {
            name: 'Germany',
            itemStyle: {
              areaColor: '#3d4e30',
              borderColor: '#7a9860',
              borderWidth: 1.5,
            },
            emphasis: {
              itemStyle: {
                areaColor: '#4d6240',
                borderColor: '#9ab870',
              },
            },
            label: {
              show: true,
              formatter: 'DE',
              color: '#c8d8a0',
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
  }), [t]);

  if (!mapReady) {
    return <div className={styles.placeholder} aria-hidden="true" />;
  }

  return (
    <div className={styles.mapWrap} aria-hidden="true">
      <ReactECharts
        option={option}
        theme="politikpraxis"
        style={{ width: '100%', height: '100%' }}
        opts={{ renderer: 'canvas' }}
        notMerge={false}
      />
    </div>
  );
}
