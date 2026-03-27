/**
 * SMA-274: Gesetz-Agenda View — Alle Gesetze auf allen Stufen sichtbar.
 * SMA-290: Stufe 3+: Gruppierung (VORBEREITUNG LÄUFT | BEREIT ZUM EINBRINGEN | NOCH KEINE VORBEREITUNG)
 * SMA-287: Top-3 Gesetze mit Empfohlen-Badge (Kongruenz zur Spieler-Ausrichtung)
 * SMA-293: Clustering nach Politikfeld + personalisierte Reihenfolge nach Ideologie (alle Stufen)
 */
import { useMemo, useState } from 'react';
import { useTranslation } from 'react-i18next';
import { useGameStore } from '../../store/gameStore';
import { useContentStore } from '../../store/contentStore';
import { AgendaCard } from '../components/AgendaCard/AgendaCard';
import { featureActive } from '../../core/systems/features';
import type { LawStatus } from '../../core/types';
import { gruppiereNachPolitikfeld } from '../../core/gesetzAgenda';
import { getRecommendedLaws } from '../../core/systems/recommendations';
import { PolitikfeldIcon, Hourglass } from '../icons';
import { PendingEffekteChart } from '../components/PendingEffekteChart/PendingEffekteChart';
import { Erklaerung } from '../components/Erklaerung/Erklaerung';
import { KPI_TO_BEGRIFF } from '../../constants/begriffe';
import styles from './GesetzAgendaView.module.css';

type StatusFilterKey = 'alle' | LawStatus;
type SortMode = 'standard' | 'empfohlen';

const STATUS_FILTERS: Array<{
  key: StatusFilterKey;
  labelKey: string;
  tooltipKey: string;
  fallback: string;
}> = [
  {
    key: 'alle',
    labelKey: 'game:gesetzAgenda.filterAlle',
    tooltipKey: 'game:gesetzAgenda.filterAlleTooltip',
    fallback: 'Alle',
  },
  {
    key: 'entwurf',
    labelKey: 'game:gesetzAgenda.filterEntwurf',
    tooltipKey: 'game:gesetzAgenda.filterEntwurfTooltip',
    fallback: 'Entwurf',
  },
  {
    key: 'eingebracht',
    labelKey: 'game:gesetzAgenda.filterEingebracht',
    tooltipKey: 'game:gesetzAgenda.filterEingebrachtTooltip',
    fallback: 'Eingebracht',
  },
  {
    key: 'aktiv',
    labelKey: 'game:gesetzAgenda.filterAktiv',
    tooltipKey: 'game:gesetzAgenda.filterAktivTooltip',
    fallback: 'Aktiv',
  },
  {
    key: 'blockiert',
    labelKey: 'game:gesetzAgenda.filterBlockiert',
    tooltipKey: 'game:gesetzAgenda.filterBlockiertTooltip',
    fallback: 'Blockiert',
  },
  {
    key: 'beschlossen',
    labelKey: 'game:gesetzAgenda.filterBeschlossen',
    tooltipKey: 'game:gesetzAgenda.filterBeschlossenTooltip',
    fallback: 'Beschlossen',
  },
];

const KPI_ABBREV: Record<string, string> = {
  al: 'AL',
  hh: 'HH',
  gi: 'GI',
  zf: 'ZF',
  mk: 'MK',
};

/** Returns true when the delta is "good" for the given KPI key. */
function isPositiveEffect(key: string, delta: number): boolean {
  // Lower is better for al, gi; higher is better for hh, zf
  if (key === 'al' || key === 'gi') return delta < 0;
  return delta > 0;
}

function formatMonth(month: number): string {
  const m = ((month - 1) % 12) + 1;
  const y = 2025 + Math.floor((month - 1) / 12);
  return `${String(m).padStart(2, '0')}/${y}`;
}

export function GesetzAgendaView() {
  const { t } = useTranslation('game');
  const { state, ausrichtung, complexity } = useGameStore();
  const politikfelder = useContentStore((s) => s.politikfelder);
  const showCollapsible = complexity >= 2;
  const showDruck = featureActive(complexity, 'politikfeld_druck');
  const politikfeldDruck = state.politikfeldDruck ?? {};

  const visibleGesetze = state.gesetze.filter((g) => (g.min_complexity ?? 1) <= complexity);
  const clusters = gruppiereNachPolitikfeld(visibleGesetze, politikfelder, ausrichtung);

  // Recommendation scoring — top 5 by score, also provides per-law scores
  const recommended = useMemo(
    () => getRecommendedLaws(visibleGesetze, state.kpi, ausrichtung),
    [visibleGesetze, state.kpi, ausrichtung],
  );
  const top5Empfohlen = useMemo(() => {
    const ids = new Set<string>();
    for (let i = 0; i < Math.min(5, recommended.length); i++) {
      ids.add(recommended[i].law.id);
    }
    return ids;
  }, [recommended]);
  const scoreMap = useMemo(() => {
    const map = new Map<string, number>();
    for (const r of recommended) map.set(r.law.id, r.score);
    return map;
  }, [recommended]);

  const [collapsedIds, setCollapsedIds] = useState<Set<string>>(new Set());
  const [pendingCollapsed, setPendingCollapsed] = useState(false);
  const [statusFilter, setStatusFilter] = useState<StatusFilterKey>('alle');
  const [searchText, setSearchText] = useState('');
  const [sortMode, setSortMode] = useState<SortMode>('standard');

  // Group pending effects by month
  const pendingByMonth = (state.pending ?? []).reduce<Record<number, typeof state.pending>>(
    (acc, eff) => {
      (acc[eff.month] ??= []).push(eff);
      return acc;
    },
    {},
  );
  const pendingMonths = Object.keys(pendingByMonth)
    .map(Number)
    .sort((a, b) => a - b);

  const searchLower = searchText.trim().toLowerCase();
  const isFiltering = statusFilter !== 'alle' || searchLower.length > 0;

  const filteredClusters = useMemo(() => {
    let result = clusters;
    if (isFiltering) {
      result = result
        .map(({ feldId, gesetze, avgKongruenz }) => ({
          feldId,
          avgKongruenz,
          gesetze: gesetze.filter((law) => {
            if (statusFilter !== 'alle' && law.status !== statusFilter) return false;
            if (searchLower.length > 0) {
              const titel = (law.titel ?? t(`game:laws.${law.id}.titel`, '')).toLowerCase();
              const kurz = (law.kurz ?? t(`game:laws.${law.id}.kurz`, '')).toLowerCase();
              if (!titel.includes(searchLower) && !kurz.includes(searchLower)) return false;
            }
            return true;
          }),
        }))
        .filter(({ gesetze }) => gesetze.length > 0);
    }
    if (sortMode === 'empfohlen') {
      result = result.map((cluster) => ({
        ...cluster,
        gesetze: [...cluster.gesetze].sort(
          (a, b) => (scoreMap.get(b.id) ?? 0) - (scoreMap.get(a.id) ?? 0),
        ),
      }));
    }
    return result;
  }, [clusters, statusFilter, searchLower, t, isFiltering, sortMode, scoreMap]);

  const matchCount = filteredClusters.reduce((sum, c) => sum + c.gesetze.length, 0);

  const toggleFeld = (feldId: string) => {
    if (!showCollapsible) return;
    setCollapsedIds((prev) => {
      const next = new Set(prev);
      if (next.has(feldId)) next.delete(feldId);
      else next.add(feldId);
      return next;
    });
  };

  return (
    <div className={styles.root}>
      <h1 className={styles.title}>
        {t('game:gesetzAgenda.title')}
        {isFiltering && (
          <span className={styles.matchCount}>
            {' '}&mdash; {matchCount} {t('game:gesetzAgenda.gesetzeCount', 'Gesetze')}
          </span>
        )}
      </h1>

      <div className={styles.filterBar}>
        <div className={styles.filterChips}>
          {STATUS_FILTERS.map(({ key, labelKey, tooltipKey, fallback }) => (
            <button
              key={key}
              className={`${styles.filterChip} ${statusFilter === key ? styles.filterChipActive : ''}`}
              onClick={() => setStatusFilter(key)}
              type="button"
              title={t(tooltipKey)}
            >
              {t(labelKey, fallback)}
            </button>
          ))}
        </div>
        <div className={styles.sortToggle}>
          <button
            type="button"
            className={`${styles.filterChip} ${sortMode === 'standard' ? styles.filterChipActive : ''}`}
            onClick={() => setSortMode('standard')}
            title={t('game:gesetzAgenda.sortStandardTooltip')}
          >
            {t('game:gesetzAgenda.sortStandard', 'Standard')}
          </button>
          <button
            type="button"
            className={`${styles.filterChip} ${sortMode === 'empfohlen' ? styles.filterChipActive : ''}`}
            onClick={() => setSortMode('empfohlen')}
            title={t('game:gesetzAgenda.sortEmpfohlenTooltip')}
          >
            {t('game:gesetzAgenda.sortEmpfohlen', 'Empfohlen')}
          </button>
        </div>
        <input
          className={styles.searchInput}
          type="text"
          value={searchText}
          onChange={(e) => setSearchText(e.target.value)}
          placeholder={t('game:gesetzAgenda.searchPlaceholder', 'Gesetz suchen\u2026')}
        />
      </div>

      {pendingMonths.length > 0 && (
        <section className={styles.pendingSection}>
          <header
            className={`${styles.pendingHeader} ${styles.clickable}`}
            onClick={() => setPendingCollapsed((v) => !v)}
            role="button"
            aria-expanded={!pendingCollapsed}
          >
            <span className={styles.pendingIcon}><Hourglass size={14} /></span>
            <span className={styles.pendingTitle}>
              {t('game:gesetzAgenda.pendingTitle', 'Ausstehende Wirkungen')}
            </span>
            <span className={styles.politikfeldCount}>
              ({state.pending.length})
            </span>
            <span className={styles.toggle}>{pendingCollapsed ? '\u25B6' : '\u25BC'}</span>
          </header>
          {!pendingCollapsed && (
            <div className={styles.pendingList}>
              <PendingEffekteChart pending={state.pending ?? []} currentMonth={state.month} />
              {pendingMonths.map((month) => (
                <div key={month} className={styles.pendingMonthGroup}>
                  <div className={styles.pendingMonthLabel}>{formatMonth(month)}</div>
                  {pendingByMonth[month].map((eff, i) => {
                    const remaining = eff.month - state.month;
                    const total = Math.max(remaining, 1);
                    const progress = Math.max(0, Math.min(100, ((total - remaining) / total) * 100 || 100));
                    const positive = isPositiveEffect(eff.key, eff.delta);
                    const deltaStr = `${eff.delta > 0 ? '+' : ''}${eff.delta}`;
                    return (
                      <div key={`${eff.key}-${eff.month}-${i}`} className={styles.pendingRow}>
                        <div className={styles.pendingBar}>
                          <div
                            className={styles.pendingBarFill}
                            style={{ width: `${progress}%` }}
                          />
                        </div>
                        <span className={styles.pendingLabel}>{eff.label}</span>
                        <span
                          className={positive ? styles.deltaPositive : styles.deltaNegative}
                        >
                          {KPI_TO_BEGRIFF[eff.key] ? (
                            <Erklaerung begriff={KPI_TO_BEGRIFF[eff.key]} kinder={KPI_ABBREV[eff.key] ?? eff.key.toUpperCase()} inline={false} />
                          ) : (
                            KPI_ABBREV[eff.key] ?? eff.key.toUpperCase()
                          )}{' '}
                          {deltaStr}
                        </span>
                      </div>
                    );
                  })}
                </div>
              ))}
            </div>
          )}
        </section>
      )}

      {filteredClusters.length === 0 ? (
        <p className={styles.leer}>
          {isFiltering
            ? t('game:gesetzAgenda.keineErgebnisse', 'Keine Gesetze gefunden.')
            : t('game:gesetzAgenda.leer')}
        </p>
      ) : (
        <div className={styles.clusterList}>
          {filteredClusters.map(({ feldId, gesetze }) => {
            const isCollapsed = showCollapsible && collapsedIds.has(feldId);
            const druck = showDruck ? (politikfeldDruck[feldId] ?? 0) : 0;
            const icon = feldId;
            const feldName =
              feldId === '_ohne_feld'
                ? t('game:gesetzAgenda.ohneFeld', 'Sonstige')
                : t(`game:politikfeld.${feldId}`, feldId);

            return (
              <section key={feldId} className={styles.politikfeldSection}>
                <header
                  className={`${styles.politikfeldHeader} ${showCollapsible ? styles.clickable : ''}`}
                  onClick={() => toggleFeld(feldId)}
                  role={showCollapsible ? 'button' : undefined}
                  aria-expanded={!isCollapsed}
                >
                  <span className={styles.politikfeldIcon}><PolitikfeldIcon feldId={icon} size={16} /></span>
                  <span className={styles.politikfeldName}>{feldName}</span>
                  <span className={styles.politikfeldCount}>
                    ({gesetze.length} {t('game:gesetzAgenda.gesetzeCount', 'Gesetze')})
                  </span>
                  {showDruck && (
                    <div className={styles.druckBar}>
                      <div
                        className={`${styles.druckFill} ${druck > 70 ? styles.kritisch : druck > 40 ? styles.warn : styles.ok}`}
                        style={{ width: `${Math.min(100, druck)}%` }}
                      />
                    </div>
                  )}
                  {showCollapsible && (
                    <span className={styles.toggle}>{isCollapsed ? '▶' : '▼'}</span>
                  )}
                </header>
                {!isCollapsed && (
                  <div className={styles.list}>
                    {gesetze.map((law) => (
                      <AgendaCard
                        key={law.id}
                        law={law}
                        isRecommended={top5Empfohlen.has(law.id)}
                        showKongruenz={complexity >= 2}
                        recommendationScore={law.status === 'entwurf' ? scoreMap.get(law.id) : undefined}
                      />
                    ))}
                  </div>
                )}
              </section>
            );
          })}
        </div>
      )}
    </div>
  );
}
