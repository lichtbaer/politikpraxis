import { useMemo } from 'react';
import ReactECharts from 'echarts-for-react';
import type { EChartsOption } from 'echarts';
import { useTranslation } from 'react-i18next';
import { useGameStore } from '../../../store/gameStore';
import { checkAchievements } from '../../../core/systems/achievements';
import styles from './EndScreen.module.css';

function ApprovalHistoryChart({ data, threshold }: { data: number[]; threshold?: number }) {
  const option: EChartsOption = useMemo(() => ({
    animation: true,
    animationDuration: 1000,
    grid: { top: 12, right: 10, bottom: 24, left: 36 },
    xAxis: {
      type: 'category',
      data: data.map((_, i) => i + 1),
      boundaryGap: false,
      axisLabel: {
        color: '#888', fontSize: 9,
        interval: (i: number) => [0, 11, 23, 35, data.length - 1].includes(i),
        formatter: (v: string) => `M${v}`,
      },
      axisLine: { show: false }, axisTick: { show: false },
    },
    yAxis: {
      type: 'value', min: 0, max: 100, interval: 25,
      axisLabel: { color: '#888', fontSize: 9, formatter: '{value}%' },
      splitLine: { lineStyle: { color: '#333', type: 'dashed' } },
    },
    tooltip: {
      trigger: 'axis',
      backgroundColor: '#1e1c18', borderColor: '#444', borderWidth: 1,
      textStyle: { color: '#d0cfc8', fontSize: 11 },
      formatter: (p: unknown) => {
        const arr = p as Array<{ dataIndex: number; value: number }>;
        const pt = arr[0];
        if (!pt) return '';
        return `Monat ${pt.dataIndex + 1}: <b>${(pt.value as number).toFixed(1)}%</b>`;
      },
    },
    series: [
      {
        type: 'line',
        data,
        smooth: 0.3,
        symbol: 'none',
        lineStyle: { color: '#5a9870', width: 2 },
        areaStyle: {
          color: {
            type: 'linear', x: 0, y: 0, x2: 0, y2: 1,
            colorStops: [
              { offset: 0, color: 'rgba(90,152,112,0.4)' },
              { offset: 1, color: 'rgba(90,152,112,0.03)' },
            ],
          },
        },
        markLine: threshold != null ? {
          silent: true, symbol: 'none',
          data: [{ yAxis: threshold }],
          lineStyle: { color: '#c8a84b', type: 'dashed', width: 1 },
          label: {
            show: true, position: 'insideEndTop',
            formatter: `Ziel: ${threshold}%`, color: '#c8a84b', fontSize: 9,
          },
        } : undefined,
      },
    ],
  }), [data, threshold]);

  return (
    <ReactECharts
      option={option}
      theme="politikpraxis"
      style={{ width: '100%', height: 160 }}
      opts={{ renderer: 'canvas' }}
    />
  );
}

function KPIBarChart({ kpi }: { kpi: { al: number; hh: number; gi: number; zf: number } }) {
  const option: EChartsOption = useMemo(() => ({
    animation: true,
    animationDuration: 800,
    animationDelay: 400,
    grid: { top: 6, right: 16, bottom: 4, left: 40 },
    xAxis: { type: 'value', show: false, min: 0, max: 100 },
    yAxis: {
      type: 'category',
      data: ['ZF', 'GI', 'HH', 'AL'],
      axisLabel: { color: '#888', fontSize: 10 },
      axisLine: { show: false }, axisTick: { show: false },
    },
    series: [
      {
        type: 'bar',
        barMaxWidth: 14,
        data: [
          { value: Math.min(100, kpi.zf), itemStyle: { color: kpi.zf > 50 ? '#5a9870' : kpi.zf > 25 ? '#c8a84b' : '#c05848', borderRadius: [0, 3, 3, 0] } },
          { value: Math.min(100, kpi.gi), itemStyle: { color: kpi.gi < 30 ? '#5a9870' : kpi.gi < 50 ? '#c8a84b' : '#c05848', borderRadius: [0, 3, 3, 0] } },
          { value: Math.max(0, Math.min(100, 50 + kpi.hh)), itemStyle: { color: kpi.hh > 0 ? '#5a9870' : kpi.hh > -5 ? '#c8a84b' : '#c05848', borderRadius: [0, 3, 3, 0] } },
          { value: Math.min(100, kpi.al * 5), itemStyle: { color: kpi.al < 5 ? '#5a9870' : kpi.al < 10 ? '#c8a84b' : '#c05848', borderRadius: [0, 3, 3, 0] } },
        ],
        label: {
          show: true, position: 'right', color: '#888', fontSize: 9,
          formatter: (_p: unknown) => {
            const p = _p as { dataIndex: number };
            const vals = [kpi.zf, kpi.gi, kpi.hh, kpi.al];
            const labels = ['%', '', '%', '%'];
            const v = vals[3 - p.dataIndex];
            const l = labels[3 - p.dataIndex];
            return `${v.toFixed(1)}${l}`;
          },
        },
      },
    ],
  }), [kpi]);

  return (
    <ReactECharts
      option={option}
      theme="politikpraxis"
      style={{ width: '100%', height: 100 }}
      opts={{ renderer: 'canvas' }}
    />
  );
}

export function EndScreen() {
  const { t } = useTranslation('game');
  const { state } = useGameStore();

  if (!state.gameOver) return null;

  const beschlosseneGesetze = state.gesetze.filter((g) => g.status === 'beschlossen');
  const blockierteGesetze = state.gesetze.filter((g) => g.status === 'blockiert');
  const approvalHistory = state.approvalHistory ?? [];

  // Milestones — summarize key achievements
  const milestones: string[] = useMemo(() => {
    const m: string[] = [];
    if (beschlosseneGesetze.length > 0) m.push(`${beschlosseneGesetze.length} Gesetze beschlossen`);
    if (blockierteGesetze.length > 0) m.push(`${blockierteGesetze.length} Gesetze blockiert`);
    const firedEvents = state.firedEvents?.length ?? 0;
    if (firedEvents > 0) m.push(`${firedEvents} Ereignisse bewältigt`);
    if (state.koalitionspartner && state.koalitionspartner.beziehung >= 50) m.push('Koalition stabil gehalten');
    if (state.koalitionspartner && state.koalitionspartner.beziehung < 15) m.push('Koalitionskrise erlebt');
    if ((state.haushalt?.saldo ?? 0) >= 0) m.push('Haushalt im Plus');
    if ((state.haushalt?.saldo ?? 0) < -15) m.push('Schuldenbremse gerissen');
    if (state.wahlkampfAktiv) m.push('Wahlkampf durchlaufen');
    return m;
  }, [beschlosseneGesetze.length, blockierteGesetze.length, state.firedEvents, state.koalitionspartner, state.haushalt, state.wahlkampfAktiv]);

  // Start KPI snapshot from game initialization
  const startKpi = state.kpiStart ?? null;

  return (
    <div className={styles.overlay}>
      <div className={styles.content}>
        <h1 className={state.won ? styles.titleWon : styles.titleLost}>
          {state.won ? t('game:endScreen.won') : t('game:endScreen.lost')}
        </h1>
        <p className={styles.subtitle}>
          {state.won
            ? t('game:endScreen.wonSubtitle', { percent: state.zust.g.toFixed(1) })
            : t('game:endScreen.lostSubtitle', { percent: state.zust.g.toFixed(1) })}
        </p>

        {approvalHistory.length > 1 && (
          <div className={styles.chartSection}>
            <span className={styles.chartSectionLabel}>Zustimmungsverlauf</span>
            <ApprovalHistoryChart data={approvalHistory} threshold={state.electionThreshold} />
          </div>
        )}

        <div className={styles.statsRow}>
          <div className={styles.statBlock}>
            <span className={styles.statLabel}>{t('game:endScreen.finaleKPIs')}</span>
            <KPIBarChart kpi={state.kpi} />
            {startKpi && (
              <div className={styles.kpiComparison}>
                {(['al', 'hh', 'gi', 'zf'] as const).map((key) => {
                  const diff = state.kpi[key] - startKpi[key];
                  if (Math.abs(diff) < 0.1) return null;
                  const sign = diff > 0 ? '+' : '';
                  const labels = { al: 'AL', hh: 'HH', gi: 'GI', zf: 'ZF' };
                  return (
                    <span key={key} className={diff > 0 ? styles.kpiUp : styles.kpiDown}>
                      {labels[key]} {sign}{diff.toFixed(1)}
                    </span>
                  );
                })}
              </div>
            )}
          </div>
          <div className={styles.statBlock}>
            <span className={styles.statLabel}>{t('game:endScreen.beschlosseneGesetze')}</span>
            <span className={styles.statBig}>{beschlosseneGesetze.length}</span>
            {beschlosseneGesetze.length > 0 && (
              <ul className={styles.lawList}>
                {beschlosseneGesetze.map((g) => (
                  <li key={g.id} className={styles.lawItem}>{g.titel}</li>
                ))}
              </ul>
            )}
          </div>
        </div>

        {/* Milestones */}
        {milestones.length > 0 && (
          <div className={styles.milestonesSection}>
            <span className={styles.chartSectionLabel}>Meilensteine</span>
            <div className={styles.milestonesList}>
              {milestones.map((m, i) => (
                <span key={i} className={styles.milestone}>{m}</span>
              ))}
            </div>
          </div>
        )}

        {/* Achievements — newly unlocked */}
        {(() => {
          const newAchievements = checkAchievements(state);
          if (newAchievements.length === 0) return null;
          return (
            <div className={styles.milestonesSection}>
              <span className={styles.chartSectionLabel}>Neue Erfolge freigeschaltet!</span>
              <div className={styles.milestonesList}>
                {newAchievements.map((a) => (
                  <span key={a.id} className={styles.achievementBadge} title={a.desc}>
                    {a.title}
                  </span>
                ))}
              </div>
            </div>
          );
        })()}

        <p className={styles.spielzeit}>{state.month} Monate gespielt</p>

        <button
          type="button"
          className={styles.restart}
          onClick={() => location.reload()}
        >
          {t('game:endScreen.neueLegislatur')}
        </button>
      </div>
    </div>
  );
}
