import { useEffect, useRef, useState, useMemo } from 'react';
import ReactECharts from 'echarts-for-react';
import type { EChartsOption } from 'echarts';
import { useTranslation } from 'react-i18next';
import { echarts } from '../../lib/echarts';
import styles from './StartMapView.module.css';

/** SMA-314: Lokale GeoJSON-Dateien (DSGVO-konform, offline-fähig) */
const EUROPE_GEO_URL = '/geo/europe.geojson';
const GERMANY_GEO_URL = '/geo/germany-bundeslaender.geojson';

const MAP_EUROPE = 'startmap-europe';
const MAP_GERMANY = 'startmap-germany';

/** GeoJSON-Cache (modulweit) — kein Re-Fetch bei Re-Render */
// eslint-disable-next-line @typescript-eslint/no-explicit-any
const geoCache: { europe?: any; germany?: any } = {};

async function loadGeoJson(): Promise<{ europe: unknown; germany: unknown }> {
  if (geoCache.europe && geoCache.germany) {
    return { europe: geoCache.europe, germany: geoCache.germany };
  }
  const [europeGeo, germanyGeo] = await Promise.all([
    fetch(EUROPE_GEO_URL).then((r) => r.json()),
    fetch(GERMANY_GEO_URL).then((r) => r.json()),
  ]);
  geoCache.europe = europeGeo;
  geoCache.germany = germanyGeo;
  return { europe: europeGeo, germany: germanyGeo };
}

export function StartMapView() {
  const { t } = useTranslation();
  const [mapReady, setMapReady] = useState(false);
  const loadedRef = useRef(false);

  useEffect(() => {
    if (loadedRef.current) return;
    loadedRef.current = true;

    loadGeoJson()
      .then(({ europe, germany }) => {
        echarts.registerMap(MAP_EUROPE, europe as Parameters<typeof echarts.registerMap>[1]);
        echarts.registerMap(MAP_GERMANY, germany as Parameters<typeof echarts.registerMap>[1]);
        setMapReady(true);
      })
      .catch(() => {
        // Silently fail — placeholder bleibt
      });
  }, []);

  const option: EChartsOption = useMemo(
    () => ({
      backgroundColor: 'transparent',
      animation: false,
      graphic: [
        {
          type: 'group',
          children: [
            {
              type: 'text',
              style: {
                text: t('startMap.subtitle'),
                font: '11px var(--sans)',
                fill: '#4a6a30',
                textAlign: 'center',
              },
              left: 'center',
              bottom: 24,
            },
          ],
        },
      ],
      series: [
        // Ebene 1: Europa (Hintergrund)
        {
          type: 'map',
          map: MAP_EUROPE,
          silent: true,
          roam: false,
          aspectScale: 1,
          layoutCenter: ['50%', '42%'],
          layoutSize: '160%',
          zlevel: 0,
          itemStyle: {
            areaColor: '#1a1a14',
            borderColor: '#2a2a1e',
            borderWidth: 0.8,
          },
          emphasis: { disabled: true },
          select: { disabled: true },
        },
        // Ebene 2+3: Deutschland mit Bundesländern (hervorgehoben)
        {
          type: 'map',
          map: MAP_GERMANY,
          silent: true,
          roam: false,
          aspectScale: 1,
          layoutCenter: ['50%', '42%'],
          layoutSize: '160%',
          zlevel: 1,
          itemStyle: {
            areaColor: '#2d4a1e',
            borderColor: '#4a7a28',
            borderWidth: 1.2,
            shadowColor: 'rgba(70, 150, 43, 0.15)',
            shadowBlur: 12,
          },
          emphasis: { disabled: true },
          select: { disabled: true },
        },
      ],
    }),
    [t]
  );

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
