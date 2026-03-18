/**
 * SMA-320: HaushaltView — Einnahmen/Ausgaben, Ampel, Saldo-Verlauf
 * Übernimmt Haushalt-KPIs + Wirtschaftslage aus dem rechten Panel
 */
import { useMemo } from 'react';
import { useTranslation } from 'react-i18next';
import ReactECharts from 'echarts-for-react';
import type { EChartsOption } from 'echarts';
import { useGameStore } from '../../store/gameStore';
import { featureActive } from '../../core/systems/features';
import { checkSchuldenbremse } from '../../core/systems/haushalt';
import { formatMrdSaldo, normalizeZero } from '../../utils/format';
import type { SchuldenbremsenStatus } from '../../core/types';
import { Check, AlertTriangle } from '../icons';
import styles from './HaushaltView.module.css';

function getSaldoKlasse(saldo: number): string {
  if (saldo > 0) return 'saldoAusgeglichen';
  if (saldo >= -15) return 'saldoDefizit';
  if (saldo >= -30) return 'saldoKritisch';
  return 'saldoKrise';
}

function SchuldenbremsenBadge({ status }: { status: SchuldenbremsenStatus }) {
  const { t } = useTranslation('game');
  if (status === 'inaktiv') return null;

  const config: Record<Exclude<SchuldenbremsenStatus, 'inaktiv'>, { label: string; className: string }> = {
    ausgeglichen: { label: t('haushalt.schuldenbremseAusgeglichen'), className: styles.sbAusgeglichen },
    grenzwertig: { label: t('haushalt.schuldenbremseGrenzwertig'), className: styles.sbGrenzwertig },
    verletzt_mild: { label: t('haushalt.schuldenbremseVerletzt'), className: styles.sbVerletzt },
    verletzt_stark: { label: t('haushalt.schuldenbremseKritisch'), className: styles.sbKritisch },
  };
  const { label, className } = config[status];

  return (
    <div className={`${styles.schuldenbremsenBadge} ${className}`}>
      <span className={styles.sbIcon}>{status === 'ausgeglichen' ? <Check size={14} /> : <AlertTriangle size={14} />}</span>
      <span>{label}</span>
    </div>
  );
}

function KonjunkturIndikator({ value }: { value: number }) {
  const { t } = useTranslation('game');
  const pct = ((value + 3) / 6) * 100;
  const color =
    value > 1 ? 'var(--green)' : value > -1 ? 'var(--warn)' : 'var(--red)';

  return (
    <div className={styles.konjunkturIndikator} title={t('haushalt.konjunkturTooltip')}>
      <span className={styles.konjunkturLabel}>{t('haushalt.konjunktur')}</span>
      <div className={styles.konjunkturBar}>
        <div
          className={styles.konjunkturFill}
          style={{ width: `${pct}%`, backgroundColor: color }}
        />
      </div>
      <span className={styles.konjunkturValue}>{normalizeZero(value) > 0 ? '+' : ''}{normalizeZero(value).toFixed(1)}</span>
    </div>
  );
}

export function HaushaltView() {
  const { t } = useTranslation('game');
  const { state, complexity } = useGameStore();
  const haushalt = state.haushalt;
  const saldoHistory = state.kpiHistory?.hh ?? [];

  const chartOption: EChartsOption = useMemo(() => ({
    animation: true,
    grid: { top: 8, right: 8, bottom: 24, left: 36, containLabel: true },
    xAxis: {
      type: 'category',
      data: saldoHistory.map((_, i) => i + 1),
      axisLabel: { color: '#888', fontSize: 10 },
      axisLine: { show: false },
      axisTick: { show: false },
    },
    yAxis: {
      type: 'value',
      axisLabel: { color: '#888', fontSize: 10, formatter: '{value}%' },
      splitLine: { lineStyle: { color: '#333', type: 'dashed' } },
    },
    tooltip: {
      trigger: 'axis',
      formatter: (params: unknown) => {
        const p = params as Array<{ dataIndex: number; value: number }>;
        const v = p[0]?.value;
        return `Monat ${(p[0]?.dataIndex ?? 0) + 1}: <b>${v?.toFixed(1)}%</b>`;
      },
    },
    series: [{
      type: 'line',
      data: saldoHistory,
      smooth: 0.3,
      symbol: 'none',
      lineStyle: { color: (haushalt?.saldo ?? 0) >= 0 ? '#5a9870' : '#c05848', width: 2 },
      areaStyle: {
        color: (haushalt?.saldo ?? 0) >= 0
          ? { type: 'linear', x: 0, y: 0, x2: 0, y2: 1, colorStops: [{ offset: 0, color: 'rgba(90,152,112,0.3)' }, { offset: 1, color: 'rgba(90,152,112,0.02)' }] }
          : { type: 'linear', x: 0, y: 0, x2: 0, y2: 1, colorStops: [{ offset: 0, color: 'rgba(192,88,72,0.3)' }, { offset: 1, color: 'rgba(192,88,72,0.02)' }] },
      },
    }],
  }), [saldoHistory, haushalt?.saldo ?? 0]);

  if (!haushalt || complexity < 2) {
    return (
      <div className={styles.root}>
        <h1 className={styles.title}>{t('haushalt.title')}</h1>
        <p className={styles.desc}>
          {t('haushalt.stufe2Info', 'Haushaltsübersicht ab Stufe 2 verfügbar.')}
        </p>
      </div>
    );
  }

  const schuldenbremsenStatus = checkSchuldenbremse(state, complexity);
  const totalAusgaben = haushalt.pflichtausgaben + haushalt.laufendeAusgaben;
  const maxVal = Math.max(haushalt.einnahmen, totalAusgaben, 400);
  const einnahmenPct = (haushalt.einnahmen / maxVal) * 100;
  const pflichtPct = (haushalt.pflichtausgaben / maxVal) * 100;
  const laufendPct = (haushalt.laufendeAusgaben / maxVal) * 100;

  return (
    <div className={styles.root}>
      <h1 className={styles.title}>{t('haushalt.title')}</h1>
      <p className={styles.desc}>
        {t('haushalt.desc', 'Einnahmen, Pflichtausgaben und Gesetzeskosten. Der Saldo beeinflusst die Wirtschaftslage.')}
      </p>

      <section className={styles.section}>
        <h2 className={styles.sectionTitle}>{t('haushalt.aufkommen', 'Einnahmen vs. Ausgaben')}</h2>
        <div className={styles.balkenStack}>
          <div className={styles.balkenRow}>
            <span className={styles.balkenLabel}>{t('haushalt.einnahmen')}</span>
            <div className={styles.balkenTrack}>
              <div className={styles.balkenFill} style={{ width: `${einnahmenPct}%`, backgroundColor: 'var(--green)' }} />
            </div>
            <span className={styles.balkenValue}>+{haushalt.einnahmen} Mrd.</span>
          </div>
          <div className={styles.balkenRow}>
            <span className={styles.balkenLabel}>{t('haushalt.pflichtausgaben')}</span>
            <div className={styles.balkenTrack}>
              <div className={styles.balkenFill} style={{ width: `${pflichtPct}%`, backgroundColor: 'var(--warn)' }} />
            </div>
            <span className={styles.balkenValue}>-{haushalt.pflichtausgaben} Mrd.</span>
          </div>
          <div className={styles.balkenRow}>
            <span className={styles.balkenLabel}>{t('haushalt.laufendeAusgaben')}</span>
            <div className={styles.balkenTrack}>
              <div className={styles.balkenFill} style={{ width: `${laufendPct}%`, backgroundColor: 'var(--red)' }} />
            </div>
            <span className={styles.balkenValue}>-{normalizeZero(haushalt.laufendeAusgaben).toFixed(1)} Mrd.</span>
          </div>
        </div>
      </section>

      <section className={`${styles.ampelSection} ${styles[getSaldoKlasse(haushalt.saldo)]}`}>
        <h2 className={styles.sectionTitle}>{t('haushalt.saldo')}</h2>
        <div className={styles.ampelValue}>
          {formatMrdSaldo(haushalt.saldo)}
        </div>
      </section>

      {saldoHistory.length > 0 && (
        <section className={styles.section}>
          <h2 className={styles.sectionTitle}>{t('haushalt.saldoVerlauf', 'Saldo-Verlauf (letzte 12 Monate)')}</h2>
          <ReactECharts
            option={chartOption}
            theme="politikpraxis"
            style={{ width: '100%', height: 160 }}
            opts={{ renderer: 'canvas' }}
          />
        </section>
      )}

      {featureActive(complexity, 'konjunkturindex') && (
        <section className={styles.section}>
          <KonjunkturIndikator value={haushalt.konjunkturIndex} />
        </section>
      )}

      {featureActive(complexity, 'schuldenbremse') && (
        <SchuldenbremsenBadge status={schuldenbremsenStatus} />
      )}
    </div>
  );
}
