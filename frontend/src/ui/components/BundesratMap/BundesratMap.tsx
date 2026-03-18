import { useEffect, useRef, useState, useMemo } from 'react';
import ReactECharts from 'echarts-for-react';
import type { EChartsOption } from 'echarts';
import { echarts } from '../../lib/echarts';
import type { BundesratLand } from '../../../core/types';
import styles from './BundesratMap.module.css';

const MAP_NAME = 'germany-bundeslaender';

// Alignment → base color
const ALIGN_COLORS = {
  koalition: '#5a9870',
  neutral: '#7a7870',
  opposition: '#c05848',
} as const;

interface BundesratMapProps {
  laender: BundesratLand[];
}

export function BundesratMap({ laender }: BundesratMapProps) {
  const [mapReady, setMapReady] = useState(false);
  const loadedRef = useRef(false);

  useEffect(() => {
    if (loadedRef.current) return;
    loadedRef.current = true;
    fetch('/germany-states.geo.json')
      .then((r) => r.json())
      .then((geoJson) => {
        echarts.registerMap(MAP_NAME, geoJson);
        setMapReady(true);
      })
      .catch(() => {});
  }, []);

  const seriesData = useMemo(() =>
    laender.map((land) => {
      const color = ALIGN_COLORS[land.alignment];
      // mood 1-5 → opacity 0.45-1.0
      const opacity = 0.45 + (Math.min(5, Math.max(1, land.mood)) - 1) * 0.14;
      return {
        name: `DE-${land.id}`,
        value: land.votes,
        itemStyle: {
          areaColor: color,
          opacity,
          borderColor: '#2a2820',
          borderWidth: 0.8,
        },
        emphasis: {
          itemStyle: { areaColor: color, opacity: 1, borderColor: '#d0cfc8', borderWidth: 1.5 },
        },
        tooltip: {
          formatter: `${land.name}<br/>${land.mp} (${land.party})<br/>${land.votes} Stimmen`,
        },
      };
    }),
  [laender]);

  const option: EChartsOption = useMemo(() => ({
    animation: true,
    animationDuration: 800,
    tooltip: {
      trigger: 'item',
      backgroundColor: '#1a1814',
      borderColor: '#3a3830',
      borderWidth: 1,
      textStyle: { color: '#c0bfb8', fontSize: 11 },
      formatter: (params: unknown) => {
        const p = params as { name: string; data?: { tooltip?: { formatter?: string } } };
        return p.data?.tooltip?.formatter ?? p.name;
      },
    },
    series: [
      {
        type: 'map',
        map: MAP_NAME,
        roam: false,
        selectedMode: false,
        itemStyle: {
          areaColor: '#2a2820',
          borderColor: '#3a3830',
          borderWidth: 0.8,
        },
        label: {
          show: true,
          fontSize: 8,
          color: '#d0cfc8',
          formatter: (params: unknown) => {
            const p = params as { name: string };
            // GeoJSON name is like 'DE-BY' → show short code
            return p.name.replace('DE-', '');
          },
        },
        emphasis: {
          label: { show: true, fontSize: 8, color: '#fff' },
        },
        data: seriesData,
        zoom: 1,
        layoutCenter: ['50%', '50%'],
        layoutSize: '95%',
      },
    ],
  }), [seriesData]);

  // Vote tallies per alignment for legend display
  const voteTotals = useMemo(() => {
    const totals = { koalition: 0, neutral: 0, opposition: 0 };
    for (const land of laender) {
      totals[land.alignment] += land.votes;
    }
    return totals;
  }, [laender]);

  if (!mapReady) return <div className={styles.placeholder} />;

  return (
    <div className={styles.mapWrap}>
      <ReactECharts
        option={option}
        theme="politikpraxis"
        style={{ width: '100%', height: '100%' }}
        opts={{ renderer: 'canvas' }}
        notMerge={false}
      />
      <div className={styles.legend}>
        <span className={styles.legendItem} style={{ color: ALIGN_COLORS.koalition }}>
          ● Koalition {voteTotals.koalition > 0 && <span className={styles.legendVotes}>{voteTotals.koalition}</span>}
        </span>
        <span className={styles.legendItem} style={{ color: ALIGN_COLORS.neutral }}>
          ● Neutral {voteTotals.neutral > 0 && <span className={styles.legendVotes}>{voteTotals.neutral}</span>}
        </span>
        <span className={styles.legendItem} style={{ color: ALIGN_COLORS.opposition }}>
          ● Opposition {voteTotals.opposition > 0 && <span className={styles.legendVotes}>{voteTotals.opposition}</span>}
        </span>
      </div>
    </div>
  );
}
