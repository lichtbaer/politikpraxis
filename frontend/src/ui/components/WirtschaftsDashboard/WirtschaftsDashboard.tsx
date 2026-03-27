/**
 * SMA-405: Wirtschafts-Dashboard im Haushalt-Tab — Indikatoren, Sektoren, optional Verlauf-Charts
 */
import { useMemo } from 'react';
import { useTranslation } from 'react-i18next';
import ReactECharts from 'echarts-for-react';
import type { EChartsOption } from 'echarts';
import { featureActive } from '../../../core/systems/features';
import type { GameState, Verband } from '../../../core/types';
import type { WirtschaftIndikatorenSnapshot } from '../../../core/types/wirtschaft';
import {
  WIRTSCHAFT_SEKTOR_IDS,
  WIRTSCHAFT_SEKTOR_NAME_DE,
  WIRTSCHAFT_SEKTOR_VERBAND_IDS,
  WIRTSCHAFT_INDIKATOREN_START_SNAPSHOT,
} from '../../../core/systems/wirtschaft';
import styles from './WirtschaftsDashboard.module.css';

type IndikatorKey = 'bip' | 'inflation' | 'arbeitslosigkeit' | 'investitionsklima';

function sektorBalkenFarbe(zustand: number): string {
  if (zustand < 30) return 'var(--red)';
  if (zustand < 50) return '#f97316';
  if (zustand < 65) return 'var(--warn)';
  return 'var(--green)';
}

function trendLabelKey(trend: number): 'boom' | 'stabil' | 'schwach' {
  if (trend > 0.15) return 'boom';
  if (trend < -0.15) return 'schwach';
  return 'stabil';
}

function trendBadgeClass(key: 'boom' | 'stabil' | 'schwach'): string {
  if (key === 'boom') return styles.trendBoom;
  if (key === 'schwach') return styles.trendSchwach;
  return styles.trendStabil;
}

function trendSymbol(key: 'boom' | 'stabil' | 'schwach'): string {
  if (key === 'boom') return '▲';
  if (key === 'schwach') return '▼';
  return '→';
}

function IndikatorKarte({
  label,
  wert,
  delta,
  deltaInvertiert,
  tooltip,
  wertClassName,
  warnung,
  formatDelta,
  flatEpsilon = 0.05,
}: {
  label: string;
  wert: string;
  delta: number;
  deltaInvertiert?: boolean;
  tooltip: string;
  wertClassName?: string;
  warnung?: boolean;
  formatDelta: (d: number) => string;
  /** Unterhalb gilt Delta als „±0“ (bei Investitionsklima z. B. 0.5) */
  flatEpsilon?: number;
}) {
  const d = deltaInvertiert ? -delta : delta;
  const flat = Math.abs(delta) < flatEpsilon;
  let deltaCls = styles.deltaFlat;
  let sym = '→';
  if (!flat) {
    if (d > 0) {
      deltaCls = styles.deltaUp;
      sym = '▲';
    } else {
      deltaCls = styles.deltaDown;
      sym = '▼';
    }
  }
  return (
    <div className={`${styles.indikatorKarte} ${warnung ? styles.warnBorder : ''}`}>
      <span className={styles.indikatorLabel} title={tooltip}>
        {label}
      </span>
      <div className={styles.indikatorRow}>
        <span className={`${styles.indikatorWert} ${wertClassName ?? ''}`}>{wert}</span>
        <span className={`${styles.indikatorDelta} ${deltaCls}`}>
          {sym} {flat ? '±0' : formatDelta(delta)}
        </span>
      </div>
    </div>
  );
}

function buildIndikatorChartOption(
  daten: WirtschaftIndikatorenSnapshot[],
  indikator: IndikatorKey,
  referenzlinie: number | undefined,
  referenzLabel: string | undefined,
  yFormatter: (v: number) => string,
  t: (k: string, opts?: Record<string, unknown>) => string,
): EChartsOption {
  const xs = daten.map((s) => s.monat);
  const ys = daten.map((s) => s[indikator]);
  const markLine =
    referenzlinie != null
      ? {
          silent: true,
          symbol: 'none',
          data: [{ yAxis: referenzlinie, label: { formatter: referenzLabel ?? '', color: '#888', fontSize: 9 } }],
          lineStyle: { type: 'dashed' as const, color: '#666', width: 1 },
        }
      : undefined;
  return {
    animation: false,
    grid: { top: 6, right: 4, bottom: 2, left: 2, containLabel: true },
    xAxis: {
      type: 'category',
      data: xs,
      axisLabel: { fontSize: 9, color: '#888' },
      axisLine: { show: false },
      axisTick: { show: false },
    },
    yAxis: {
      type: 'value',
      scale: true,
      axisLabel: { fontSize: 9, color: '#888', formatter: (v: number) => yFormatter(v) },
      splitLine: { lineStyle: { color: '#333', type: 'dashed' } },
    },
    tooltip: {
      trigger: 'axis',
      formatter: (params: unknown) => {
        const p = params as Array<{ dataIndex: number; value: number }>;
        const idx = p[0]?.dataIndex ?? 0;
        const m = xs[idx];
        const v = p[0]?.value;
        return t('wirtschaft.chartTooltip', { month: m, value: v != null ? yFormatter(v) : '—' });
      },
    },
    series: [
      {
        type: 'line',
        data: ys,
        smooth: 0.2,
        symbol: 'circle',
        symbolSize: 4,
        lineStyle: { width: 1.5 },
        markLine,
      },
    ],
  };
}

function IndikatorVerlaufChart({
  option,
  label,
}: {
  option: EChartsOption;
  label: string;
}) {
  return (
    <div className={styles.chartWrap}>
      <p className={styles.chartLabel}>{label}</p>
      <ReactECharts option={option} theme="politikpraxis" style={{ width: '100%', height: 100 }} opts={{ renderer: 'canvas' }} />
    </div>
  );
}

export function WirtschaftsDashboard({
  state,
  complexity,
  verbaende,
}: {
  state: GameState;
  complexity: number;
  verbaende: Verband[];
}) {
  const { t } = useTranslation('game');
  const w = state.wirtschaft;
  const dashboardAktiv = Boolean(w) && featureActive(complexity, 'wirtschaftssektoren');

  const verbandById = useMemo(() => {
    const m = new Map<string, Verband>();
    for (const v of verbaende) m.set(v.id, v);
    return m;
  }, [verbaende]);

  const chartDaten = useMemo(
    () => (w?.indikatoren_verlauf.length ? w.indikatoren_verlauf.slice(-12) : []),
    [w],
  );
  const showCharts =
    dashboardAktiv && featureActive(complexity, 'wirtschaft_indikatoren_charts') && chartDaten.length > 0;

  const chartOptBip = useMemo(
    () =>
      showCharts
        ? buildIndikatorChartOption(
            chartDaten,
            'bip',
            0,
            t('wirtschaft.ref.nullwachstum', 'Nullwachstum'),
            (v) => `${v.toFixed(1)}%`,
            t,
          )
        : null,
    [showCharts, chartDaten, t],
  );
  const chartOptInf = useMemo(
    () =>
      showCharts
        ? buildIndikatorChartOption(
            chartDaten,
            'inflation',
            2,
            t('wirtschaft.ref.ezb2', 'EZB-Ziel 2%'),
            (v) => `${v.toFixed(1)}%`,
            t,
          )
        : null,
    [showCharts, chartDaten, t],
  );
  const chartOptAl = useMemo(
    () =>
      showCharts
        ? buildIndikatorChartOption(chartDaten, 'arbeitslosigkeit', undefined, undefined, (v) => `${v.toFixed(1)}%`, t)
        : null,
    [showCharts, chartDaten, t],
  );
  const chartOptInv = useMemo(
    () =>
      showCharts
        ? buildIndikatorChartOption(
            chartDaten,
            'investitionsklima',
            undefined,
            undefined,
            (v) => String(Math.round(v)),
            t,
          )
        : null,
    [showCharts, chartDaten, t],
  );

  if (!dashboardAktiv || !w) return null;

  const verlauf = w.indikatoren_verlauf;
  const prevSnap =
    verlauf.length >= 2 ? verlauf[verlauf.length - 2]! : WIRTSCHAFT_INDIKATOREN_START_SNAPSHOT;

  const dBip = w.bip_wachstum - prevSnap.bip;
  const dInf = w.inflation - prevSnap.inflation;
  const dAl = w.arbeitslosigkeit - prevSnap.arbeitslosigkeit;
  const dInv = w.investitionsklima - prevSnap.investitionsklima;

  return (
    <>
      <section className={styles.panel}>
        <h3 className={styles.panelTitle}>{t('wirtschaft.indikatorenTitle', 'Wirtschaftsindikatoren')}</h3>
        <div className={styles.indikatorenGrid}>
          <IndikatorKarte
            label={t('wirtschaft.indikator.bip', 'BIP-Wachstum')}
            wert={`${w.bip_wachstum >= 0 ? '+' : ''}${w.bip_wachstum.toFixed(1)}%`}
            delta={dBip}
            tooltip={t('wirtschaft.tooltip.bip')}
            wertClassName={w.bip_wachstum > 0 ? styles.indikatorWertGruen : w.bip_wachstum < 0 ? styles.indikatorWertRot : undefined}
            formatDelta={(d) => `${d >= 0 ? '+' : ''}${d.toFixed(1)}%`}
          />
          <IndikatorKarte
            label={t('wirtschaft.indikator.inflation', 'Inflation')}
            wert={`${w.inflation.toFixed(1)}%`}
            delta={dInf}
            tooltip={t('wirtschaft.tooltip.inflation')}
            warnung={w.inflation > 4}
            formatDelta={(d) => `${d >= 0 ? '+' : ''}${d.toFixed(1)}%`}
          />
          <IndikatorKarte
            label={t('wirtschaft.indikator.arbeitslosigkeit', 'Arbeitslosigkeit')}
            wert={`${w.arbeitslosigkeit.toFixed(1)}%`}
            delta={dAl}
            deltaInvertiert
            tooltip={t('wirtschaft.tooltip.arbeitslosigkeit')}
            formatDelta={(d) => `${d >= 0 ? '+' : ''}${d.toFixed(1)}%`}
          />
          <IndikatorKarte
            label={t('wirtschaft.indikator.investitionsklima', 'Investitionsklima')}
            wert={`${Math.round(w.investitionsklima)}/100`}
            delta={dInv}
            tooltip={t('wirtschaft.tooltip.investitionsklima')}
            flatEpsilon={0.5}
            formatDelta={(d) => `${d >= 0 ? '+' : ''}${Math.round(d)}`}
          />
        </div>
      </section>

      <section className={styles.panel}>
        <h3 className={styles.panelTitle}>{t('wirtschaft.sektorenTitle', 'Wirtschaftssektoren')}</h3>
        <div className={styles.sektorenList}>
          {WIRTSCHAFT_SEKTOR_IDS.map((id) => {
            const sek = w.sektoren[id] ?? { zustand: 50, trend: 0 };
            const name = WIRTSCHAFT_SEKTOR_NAME_DE[id] ?? id;
            const tkey = trendLabelKey(sek.trend);
            const vids = WIRTSCHAFT_SEKTOR_VERBAND_IDS[id] ?? [];
            return (
              <div key={id} className={styles.sektorKarte}>
                <div className={styles.sektorHeader}>
                  <h4 className={styles.sektorTitle}>{name}</h4>
                  <span className={`${styles.trendBadge} ${trendBadgeClass(tkey)}`}>
                    {trendSymbol(tkey)} {t(`wirtschaft.trend.${tkey}`)}
                  </span>
                </div>
                <div className={styles.zustandRow}>
                  <div className={styles.zustandTrack}>
                    <div
                      className={styles.zustandFill}
                      style={{
                        width: `${Math.min(100, Math.max(0, sek.zustand))}%`,
                        backgroundColor: sektorBalkenFarbe(sek.zustand),
                      }}
                    />
                  </div>
                  <span className={styles.zustandZahl}>{Math.round(sek.zustand)}/100</span>
                </div>
                {vids.length > 0 && (
                  <div className={styles.verbandsZeile}>
                    <span className={styles.verbandsLabel}>{t('wirtschaft.verbandsHinweis', 'Verbände')}:</span>
                    {vids.map((vid) => {
                      const vb = verbandById.get(vid);
                      const bez = state.verbandsBeziehungen?.[vid] ?? vb?.beziehung_start ?? 50;
                      const low = bez < 30;
                      return (
                        <span
                          key={vid}
                          className={`${styles.verbandChip} ${low ? styles.verbandChipWarn : ''}`}
                          title={t('wirtschaft.verbandBeziehungTooltip', { name: vb?.kurz ?? vid, wert: Math.round(bez) })}
                        >
                          {vb?.kurz ?? vid} ({Math.round(bez)})
                        </span>
                      );
                    })}
                  </div>
                )}
                {sek.zustand < 30 && (
                  <p className={styles.krisenWarnung}>
                    {t('wirtschaft.sektorKrise', 'Sektor in der Krise — Verbände werden aktiv.')}
                  </p>
                )}
              </div>
            );
          })}
        </div>
      </section>

      {showCharts && chartOptBip && chartOptInf && chartOptAl && chartOptInv && (
        <section className={styles.panel}>
          <h3 className={styles.panelTitle}>{t('wirtschaft.verlaufTitle', 'Indikatoren-Verlauf (12 Monate)')}</h3>
          <div className={styles.chartsGrid}>
            <IndikatorVerlaufChart option={chartOptBip} label={t('wirtschaft.indikator.bip')} />
            <IndikatorVerlaufChart option={chartOptInf} label={t('wirtschaft.indikator.inflation')} />
            <IndikatorVerlaufChart option={chartOptAl} label={t('wirtschaft.indikator.arbeitslosigkeit')} />
            <IndikatorVerlaufChart option={chartOptInv} label={t('wirtschaft.indikator.investitionsklima')} />
          </div>
        </section>
      )}
    </>
  );
}
