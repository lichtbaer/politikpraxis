/**
 * SMA-324: Medienklima-Sektion für Medien-Tab
 * Zeigt Wert, Verlauf-Chart (letzte 12 Monate), Opposition, ggf. aktive Skandale
 */
import { useMemo } from 'react';
import { useTranslation } from 'react-i18next';
import ReactECharts from 'echarts-for-react';
import type { EChartsOption } from 'echarts';
import { useGameStore } from '../../../store/gameStore';
import { featureActive } from '../../../core/systems/features';
import { AlertTriangle } from '../../icons';
import styles from './MedienklimaSektion.module.css';

// Matches --gold token (#c8a84a) — ECharts can't consume CSS variables directly
const CHART_GOLD = '#c8a84a';

/** Stabile Fallback-Referenz — vermeidet neues `[]` pro Render (exhaustive-deps / useMemo). */
const EMPTY_MEDIEN_HISTORY: number[] = [];

function medienklimaChartOption(history: number[]): EChartsOption {
  const data = history.slice(-12);
  const months = data.map((_, i) => i + 1);
  return {
    animation: false,
    grid: { top: 4, right: 4, bottom: 16, left: 28, containLabel: false },
    xAxis: {
      type: 'category',
      data: months,
      boundaryGap: false,
      axisLabel: { color: 'rgba(255,255,255,0.3)', fontSize: 9 },
      axisLine: { show: false },
      axisTick: { show: false },
    },
    yAxis: {
      type: 'value',
      min: 0,
      max: 100,
      show: true,
      axisLabel: { color: 'rgba(255,255,255,0.3)', fontSize: 9, formatter: '{value}' },
      splitLine: { show: false },
      axisLine: { show: false },
      axisTick: { show: false },
    },
    series: [
      {
        type: 'line',
        data,
        smooth: 0.3,
        symbol: 'circle',
        symbolSize: 4,
        lineStyle: { color: CHART_GOLD, width: 2 },
        itemStyle: { color: CHART_GOLD },
        areaStyle: {
          color: {
            type: 'linear',
            x: 0, y: 0, x2: 0, y2: 1,
            colorStops: [
              { offset: 0, color: 'rgba(200,168,74,0.28)' },
              { offset: 1, color: 'rgba(200,168,74,0.02)' },
            ],
          },
        },
      },
    ],
  };
}

export function MedienklimaSektion() {
  const { t } = useTranslation('game');
  const complexity = useGameStore((s) => s.complexity);
  const state = useGameStore((s) => s.state);

  const history = state.medienKlimaHistory ?? EMPTY_MEDIEN_HISTORY;
  const chartOption = useMemo(() => medienklimaChartOption(history), [history]);

  if (!featureActive(complexity, 'medienklima')) return null;

  const medienKlima = state.medienKlima ?? 55;
  const verlauf = history.slice(-12);
  const showChart = featureActive(complexity, 'milieus_4') && verlauf.length >= 2;

  const klimaClass =
    medienKlima > 65 ? styles.positiv : medienKlima > 35 ? styles.neutral : styles.negativ;

  const oppositionStaerke = state.opposition?.staerke ?? 0;
  const oppositionLabel =
    oppositionStaerke > 70 ? 'stark' : oppositionStaerke > 40 ? 'aktiv' : 'schwach';

  const isSkandalAktiv = state.activeEvent?.id?.startsWith('medien_skandal') ?? false;

  return (
    <section className={`${styles.root} ${klimaClass}`}>
      <h3 className={styles.title}>{t('game:medienklima.label')}</h3>
      <div className={styles.content}>
        <div className={styles.wertRow}>
          <div className={`${styles.klimaBar} ${klimaClass}`}>
            <div className={styles.klimaFill} style={{ width: `${medienKlima}%` }} />
          </div>
          <span className={styles.wert}>{medienKlima}/100</span>
        </div>
        {showChart && (
          <div className={styles.chartWrap}>
            <ReactECharts
              option={chartOption}
              theme="politikpraxis"
              style={{ width: '100%', height: 80 }}
              opts={{ renderer: 'canvas' }}
              notMerge={false}
            />
          </div>
        )}
        {featureActive(complexity, 'opposition') && (
          <span className={styles.opposition}>
            {t('game:medienklima.opposition')}:{' '}
            {oppositionLabel === 'stark' && <strong>Stark</strong>}
            {oppositionLabel === 'aktiv' && <>Aktiv</>}
            {oppositionLabel === 'schwach' && <span className={styles.oppositionSchwach}>Schwach</span>}
          </span>
        )}
        {featureActive(complexity, 'skandale') && isSkandalAktiv && (
          <span className={styles.skandal}>
            <AlertTriangle size={12} />
            Skandal-Ereignis aktiv
          </span>
        )}
      </div>
    </section>
  );
}
