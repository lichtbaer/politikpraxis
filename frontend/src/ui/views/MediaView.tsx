import { useTranslation } from 'react-i18next';
import { useGameStore } from '../../store/gameStore';
import { useContentStore } from '../../stores/contentStore';
import { featureActive } from '../../core/systems/features';
import { MilieuBar } from '../components/MilieuBar/MilieuBar';
import type { Milieu } from '../../core/types';
import styles from './MediaView.module.css';

/** Stufe 1: 3 aggregierte Gruppen — Mapping für Anzeige */
const STUFE1_KEYS = ['arbeit', 'mitte', 'prog'] as const;
const STUFE1_COLORS: Record<string, string> = {
  arbeit: 'var(--land-c)',
  mitte: 'var(--eu-c)',
  prog: 'var(--blue)',
};

/** Stufe 2: 4 politisch wichtigste Milieus (Reihenfolge aus GDD) */
const STUFE2_IDS = ['etablierte', 'soziale_mitte', 'buergerliche_mitte', 'postmaterielle'] as const;

/** Aggregation Stufe 1: Milieu-IDs → zust-Gruppe (für Fallback wenn milieuZustimmung fehlt) */
const MILIEU_TO_ZUST: Record<string, 'arbeit' | 'mitte' | 'prog'> = {
  postmaterielle: 'prog',
  soziale_mitte: 'arbeit',
  prekaere: 'arbeit',
  buergerliche_mitte: 'mitte',
  leistungstraeger: 'mitte',
  etablierte: 'mitte',
  traditionelle: 'mitte',
};

function getBarColor(value: number): string {
  if (value >= 55) return 'var(--green)';
  if (value >= 35) return 'var(--warn)';
  return 'var(--red)';
}

function getTrend(history: number[]): 'up' | 'down' | 'flat' {
  if (!history || history.length < 2) return 'flat';
  const recent = history[history.length - 1];
  const older = history[0];
  const diff = recent - older;
  if (diff > 2) return 'up';
  if (diff < -2) return 'down';
  return 'flat';
}

/** Liefert die anzuzeigenden Milieus/Gruppen je nach Komplexitätsstufe (SMA-292) */
function getMilieuGruppen(
  complexity: number,
  milieus: Milieu[],
): { type: 'aggregated'; keys: readonly string[] } | { type: 'milieus'; items: Milieu[]; showDrift: boolean } {
  if (!featureActive(complexity, 'milieus_4')) {
    return { type: 'aggregated', keys: STUFE1_KEYS };
  }
  if (!featureActive(complexity, 'milieus_7')) {
    const items = STUFE2_IDS.map((id) => milieus.find((m) => m.id === id)).filter((m): m is Milieu => !!m);
    if (items.length === 0) return { type: 'aggregated', keys: STUFE1_KEYS };
    return { type: 'milieus', items, showDrift: false };
  }
  const items = milieus.filter((m) => m.min_complexity <= complexity);
  if (items.length === 0) return { type: 'aggregated', keys: STUFE1_KEYS };
  const showDrift = featureActive(complexity, 'milieu_drift');
  return { type: 'milieus', items, showDrift };
}

export function MediaView() {
  const { t } = useTranslation('game');
  const { state } = useGameStore();
  const milieus = useContentStore((s) => s.milieus) ?? [];
  const complexity = useGameStore((s) => s.complexity);
  const zust = state.zust;
  const milieuZustimmung = state.milieuZustimmung ?? {};
  const milieuZustimmungHistory = state.milieuZustimmungHistory ?? {};

  const gruppen = getMilieuGruppen(complexity, milieus);

  return (
    <div className={styles.root}>
      <h1 className={styles.title}>{t('game:media.title')}</h1>
      <p className={styles.desc}>{t('game:media.desc')}</p>
      <div className={styles.cards}>
        {gruppen.type === 'aggregated' ? (
          STUFE1_KEYS.map((key) => {
            const value = zust[key] ?? 50;
            return (
              <div key={key} className={styles.card}>
                <div className={styles.cardHeader}>
                  <h3 className={styles.cardTitle} style={{ color: STUFE1_COLORS[key] }}>
                    {t(`game:media.${key}.name`)}
                  </h3>
                  <span className={styles.percentage}>{Math.round(value)}%</span>
                </div>
                <p className={styles.cardDesc}>{t(`game:media.${key}.desc`)}</p>
                <MilieuBar name="" value={value} color={getBarColor(value)} />
              </div>
            );
          })
        ) : (
          gruppen.items.map((m) => {
            const value = milieuZustimmung[m.id] ?? zust[MILIEU_TO_ZUST[m.id] ?? 'mitte'] ?? 50;
            const history = milieuZustimmungHistory[m.id] ?? [];
            const trend = gruppen.showDrift ? getTrend(history) : 'flat';
            const trendChar = trend === 'up' ? '↑' : trend === 'down' ? '↓' : '→';
            const title = gruppen.showDrift
              ? `${t(`game:milieu.${m.id}`, m.kurz ?? m.id)} ${trendChar}`
              : t(`game:milieu.${m.id}`, m.kurz ?? m.id);
            const desc = m.beschreibung ?? t(`game:milieu.${m.id}`, m.kurz ?? m.id);
            return (
              <div key={m.id} className={styles.card}>
                <div className={styles.cardHeader}>
                  <h3 className={styles.cardTitle} style={{ color: getBarColor(value) }}>
                    {title}
                  </h3>
                  <span className={styles.percentage}>{Math.round(value)}%</span>
                </div>
                <p className={styles.cardDesc}>{desc}</p>
                <MilieuBar name="" value={value} color={getBarColor(value)} />
              </div>
            );
          })
        )}
      </div>
    </div>
  );
}
