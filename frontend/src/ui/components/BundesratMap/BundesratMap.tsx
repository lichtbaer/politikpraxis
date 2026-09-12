import { useEffect, useRef, useState, useMemo } from 'react';
import { useTranslation } from 'react-i18next';
import ReactEChartsCore from 'echarts-for-react/esm/core';
import type { EChartsOption } from 'echarts';
import { echarts } from '../../lib/echarts';
import { useChartTheme } from '../../hooks/useChartTheme';
import type { BundesratLand } from '../../../core/types';
import styles from './BundesratMap.module.css';

const MAP_NAME = 'germany-bundeslaender';

/** Lager → Token-Name; die konkrete Farbe kommt aus dem aktiven Theme. */
const ALIGN_TOKENS = {
  koalition: 'green',
  neutral: 'text2',
  opposition: 'red',
} as const;

interface BundesratMapProps {
  laender: BundesratLand[];
}

export function BundesratMap({ laender }: BundesratMapProps) {
  const { t } = useTranslation('game');
  const { theme: chartTheme, tokens } = useChartTheme();
  const alignColors = useMemo(
    () => ({
      koalition: tokens[ALIGN_TOKENS.koalition],
      neutral: tokens[ALIGN_TOKENS.neutral],
      opposition: tokens[ALIGN_TOKENS.opposition],
    }),
    [tokens],
  );
  const [mapReady, setMapReady] = useState(false);
  const loadedRef = useRef(false);

  useEffect(() => {
    if (loadedRef.current) return;
    loadedRef.current = true;
    fetch('/geo/germany-bundeslaender.geojson')
      .then((r) => r.json())
      .then((geoJson) => {
        echarts.registerMap(MAP_NAME, geoJson);
        setMapReady(true);
      })
      .catch(() => {});
  }, []);

  const seriesData = useMemo(() =>
    laender.map((land) => {
      const color = alignColors[land.alignment];
      // mood 1-5 → opacity 0.45-1.0
      const opacity = 0.45 + (Math.min(5, Math.max(1, land.mood)) - 1) * 0.14;
      return {
        name: `DE-${land.id}`,
        value: land.votes,
        itemStyle: {
          areaColor: color,
          opacity,
          borderColor: tokens.bg3,
          borderWidth: 0.8,
        },
        emphasis: {
          itemStyle: { areaColor: color, opacity: 1, borderColor: tokens.text, borderWidth: 1.5 },
        },
        tooltip: {
          formatter: `${land.name}<br/>${land.mp} (${land.party})<br/>${t('bundesratMap.votes', { count: land.votes })}`,
        },
      };
    }),
  [laender, t, alignColors, tokens]);

  const option: EChartsOption = useMemo(() => ({
    animation: true,
    animationDuration: 800,
    tooltip: {
      trigger: 'item',
      backgroundColor: tokens.bg2,
      borderColor: tokens.border2,
      borderWidth: 1,
      textStyle: { color: tokens.text, fontSize: 11, fontFamily: tokens.sans },
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
          areaColor: tokens.bg3,
          borderColor: tokens.border2,
          borderWidth: 0.8,
        },
        label: {
          show: true,
          fontSize: 8,
          color: tokens.text2,
          formatter: (params: unknown) => {
            const p = params as { name: string };
            // GeoJSON name is like 'DE-BY' → show short code
            return p.name.replace('DE-', '');
          },
        },
        emphasis: {
          label: { show: true, fontSize: 8, color: tokens.text },
        },
        data: seriesData,
        zoom: 1,
        layoutCenter: ['50%', '50%'],
        layoutSize: '95%',
      },
    ],
  }), [seriesData, tokens]);

  // Vote tallies per alignment for legend display
  const voteTotals = useMemo(() => {
    const totals = { koalition: 0, neutral: 0, opposition: 0 };
    for (const land of laender) {
      totals[land.alignment] += land.votes;
    }
    return totals;
  }, [laender]);

  const mapAriaLabel = t('bundesratMap.ariaLabel', {
    koalition: voteTotals.koalition,
    neutral: voteTotals.neutral,
    opposition: voteTotals.opposition,
    total: laender.length,
  });

  if (!mapReady) return <div className={styles.placeholder} />;

  return (
    <div className={styles.mapWrap}>
      <div role="img" aria-label={mapAriaLabel} style={{ width: '100%', height: '100%' }}>
        <ReactEChartsCore
          echarts={echarts}
          option={option}
          theme={chartTheme}
          style={{ width: '100%', height: '100%' }}
          opts={{ renderer: 'canvas' }}
          notMerge={false}
        />
      </div>
      <ul className="visually-hidden" aria-label={t('bundesratMap.detailsLabel')}>
        {laender.map((land) => (
          <li key={land.id}>
            {t('bundesratMap.landItem', {
              name: land.name,
              votes: land.votes,
              mp: land.mp,
              party: land.party,
              alignment: t(`bundesratMap.${land.alignment}`),
            })}
          </li>
        ))}
      </ul>
      <div className={styles.legend}>
        <span className={styles.legendItem} style={{ color: alignColors.koalition }}>
          ● {t('bundesratMap.koalition')} {voteTotals.koalition > 0 && <span className={styles.legendVotes}>{voteTotals.koalition}</span>}
        </span>
        <span className={styles.legendItem} style={{ color: alignColors.neutral }}>
          ● {t('bundesratMap.neutral')} {voteTotals.neutral > 0 && <span className={styles.legendVotes}>{voteTotals.neutral}</span>}
        </span>
        <span className={styles.legendItem} style={{ color: alignColors.opposition }}>
          ● {t('bundesratMap.opposition')} {voteTotals.opposition > 0 && <span className={styles.legendVotes}>{voteTotals.opposition}</span>}
        </span>
      </div>
    </div>
  );
}
