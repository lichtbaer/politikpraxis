/**
 * Geplante Auswirkungen: vier getrennte Balkendiagramme (AL, HH, GI, ZF) mit Gesamteffekt-Linie.
 */
import { useCallback, useMemo } from 'react';
import { useTranslation } from 'react-i18next';
import type { KPI, Law, PendingEffect } from '../../../core/types';
import { useContentStore } from '../../../store/contentStore';
import { useGameStore } from '../../../store/gameStore';
import { buildPendingAuswirkungsChartDaten } from '../../lib/pendingAuswirkungsChartDaten';
import { AuswirkungsBarChart } from './AuswirkungsBarChart';
import styles from './PendingEffekteChart.module.css';

interface PendingEffekteChartProps {
  pending: PendingEffect[];
  currentMonth: number;
}

const KPI_KEYS: (keyof KPI)[] = ['al', 'hh', 'gi', 'zf'];

function formatMonthLabel(month: number): string {
  const m = ((month - 1) % 12) + 1;
  const y = 2025 + Math.floor((month - 1) / 12);
  return `${String(m).padStart(2, '0')}/${y}`;
}

export function PendingEffekteChart({ pending, currentMonth }: PendingEffekteChartProps) {
  const { t } = useTranslation('game');
  const contentGesetze = useContentStore((s) => s.gesetze);
  const spielGesetze = useGameStore((s) => s.state.gesetze);

  const getLawTitel = useCallback(
    (gesetzId: string): string | undefined =>
      spielGesetze.find((g: Law) => g.id === gesetzId)?.titel
      ?? contentGesetze.find((g: Law) => g.id === gesetzId)?.titel,
    [spielGesetze, contentGesetze],
  );

  const chartDaten = useMemo(
    () => buildPendingAuswirkungsChartDaten(pending, currentMonth, getLawTitel),
    [pending, currentMonth, getLawTitel],
  );

  const xLabels = useMemo(() => {
    if (!chartDaten) return [];
    return chartDaten.monate.map((m) => {
      const offset = m - currentMonth;
      return offset === 0 ? t('pendingEffekte.now') : formatMonthLabel(m);
    });
  }, [chartDaten, currentMonth, t]);

  const kpiDesc = useCallback((key: keyof KPI) => t(`pendingEffekte.${key}.desc`), [t]);

  const summaryLines = useMemo(() => {
    if (!chartDaten || chartDaten.monate.length === 0) return [];
    const last = chartDaten.monate.length - 1;
    return KPI_KEYS.map((key) => {
      let sum = 0;
      for (let i = 0; i <= last; i++) sum += chartDaten.gesamteffekt[key][i];
      if (sum === 0) return null;
      const label = t(`pendingEffekte.${key}.label`);
      const u = t(`pendingEffekte.unit.${key}`);
      const sign = sum > 0 ? '+' : '';
      const num = Number.isInteger(sum) ? String(sum) : sum.toFixed(1);
      const valueStr = u ? `${sign}${num}${u}` : `${sign}${num}`;
      return { key, text: t('pendingEffekte.summaryLine', { label, value: valueStr }) };
    }).filter((x): x is { key: keyof KPI; text: string } => x != null);
  }, [chartDaten, t]);

  if (pending.length === 0) {
    return (
      <div className={styles.empty}>
        {t('pendingEffekte.noData')}
      </div>
    );
  }

  if (!chartDaten || chartDaten.monate.length === 0) {
    return (
      <div className={styles.empty}>
        {t('pendingEffekte.noData')}
      </div>
    );
  }

  const totalEffects = pending.length;
  const nearestMonth = chartDaten.monate[0];
  const offsetToNearest = nearestMonth !== undefined ? nearestMonth - currentMonth : null;

  const offsetLabel =
    offsetToNearest === 0
      ? t('pendingEffekte.thisMonth')
      : offsetToNearest === 1
        ? t('pendingEffekte.monthSingular', { count: offsetToNearest ?? 0 })
        : t('pendingEffekte.monthPlural', { count: offsetToNearest ?? 0 });

  return (
    <div className={styles.container}>
      <div className={styles.header}>
        <span className={styles.headerLabel}>{t('pendingEffekte.title')}</span>
        <span className={styles.headerCount}>{t('pendingEffekte.effekte', { count: totalEffects })}</span>
      </div>
      {offsetToNearest !== null && (
        <p className={styles.nextHint}>
          {t('pendingEffekte.nextHint', { offset: offsetLabel })}
        </p>
      )}

      <div className={styles.gesetzLegende} aria-label={t('pendingEffekte.gesetzLegendeAria')}>
        {chartDaten.gesetze.map((g) => (
          <div key={g.id} className={styles.gesetzLegendeItem} title={g.titel_de}>
            <span className={styles.gesetzSwatch} style={{ backgroundColor: g.farbe }} />
            <span className={styles.gesetzName}>{g.titel_de}</span>
          </div>
        ))}
      </div>

      <div className={styles.chartsGrid}>
        <AuswirkungsBarChart
          effektTyp="al"
          effektLabel={t('pendingEffekte.al.label')}
          einheit={t('pendingEffekte.unit.al')}
          invertiert
          daten={chartDaten}
          currentMonth={currentMonth}
          xLabels={xLabels}
        />
        <AuswirkungsBarChart
          effektTyp="hh"
          effektLabel={t('pendingEffekte.hh.label')}
          einheit={t('pendingEffekte.unit.hh')}
          daten={chartDaten}
          currentMonth={currentMonth}
          xLabels={xLabels}
        />
        <AuswirkungsBarChart
          effektTyp="gi"
          effektLabel={t('pendingEffekte.gi.label')}
          einheit={t('pendingEffekte.unit.gi')}
          invertiert
          daten={chartDaten}
          currentMonth={currentMonth}
          xLabels={xLabels}
        />
        <AuswirkungsBarChart
          effektTyp="zf"
          effektLabel={t('pendingEffekte.zf.label')}
          einheit={t('pendingEffekte.unit.zf')}
          daten={chartDaten}
          currentMonth={currentMonth}
          xLabels={xLabels}
        />
      </div>

      {summaryLines.length > 0 && (
        <div className={styles.effektSummary}>
          <div className={styles.effektSummaryTitle}>{t('pendingEffekte.summaryTitle')}</div>
          <ul className={styles.effektSummaryList}>
            {summaryLines.map((line) => (
              <li key={line.key}>{line.text}</li>
            ))}
          </ul>
        </div>
      )}

      <div className={styles.kpiLegend}>
        {KPI_KEYS.map((k) => (
          <div key={k} className={styles.kpiLegendItem} title={kpiDesc(k)}>
            <span className={styles.kpiKey}>{k.toUpperCase()}</span>
            <span className={styles.kpiDesc}>{kpiDesc(k)}</span>
          </div>
        ))}
      </div>
    </div>
  );
}
