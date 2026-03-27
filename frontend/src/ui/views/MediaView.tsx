import { useState } from 'react';
import { useTranslation } from 'react-i18next';
import { useGameStore } from '../../store/gameStore';
import { useContentStore } from '../../store/contentStore';
import { featureActive } from '../../core/systems/features';
import { MilieuBar } from '../components/MilieuBar/MilieuBar';
import { MedienklimaSektion } from '../components/MedienklimaSektion/MedienklimaSektion';
import { MilieuDetailPanel } from '../components/MilieuDetailPanel/MilieuDetailPanel';
import { MedienklimaTrendChart } from '../components/MedienklimaTrendChart/MedienklimaTrendChart';
import { MedienAkteureGrid } from '../components/MedienAkteure/MedienAkteureGrid';
import { MedienAktionen } from '../components/MedienAkteure/MedienAktionen';
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

/** SMA-324: Alle 7 Milieus in kanonischer Reihenfolge (Stufe 3+) */
const ALL_7_IDS = [
  'etablierte', 'soziale_mitte', 'buergerliche_mitte', 'postmaterielle',
  'leistungstraeger', 'traditionelle', 'prekaere',
] as const;

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

function getTrendDelta(history: number[]): number | null {
  if (!history || history.length < 2) return null;
  const recent = history[history.length - 1];
  const older = history[history.length - 2];
  return Math.round(recent - older);
}

function getTrend(history: number[]): 'up' | 'down' | 'flat' {
  const delta = getTrendDelta(history);
  if (delta == null || delta === 0) return 'flat';
  return delta > 0 ? 'up' : 'down';
}

/** Liefert die anzuzeigenden Milieus/Gruppen je nach Komplexitätsstufe (SMA-292, SMA-324) */
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
  /** SMA-324: Alle 7 Milieus auf Stufe 3+ — keine min_complexity-Filterung */
  const items = ALL_7_IDS.map((id) => milieus.find((m) => m.id === id)).filter((m): m is Milieu => !!m);
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
  const [selectedMilieu, setSelectedMilieu] = useState<Milieu | null>(null);

  const gruppen = getMilieuGruppen(complexity, milieus);

  return (
    <div className={styles.root}>
      <h1 className={styles.title}>{t('game:media.title')}</h1>
      <p className={styles.desc}>{t('game:media.desc')}</p>

      <MedienklimaSektion />

      {(state.medienKlimaHistory ?? []).length >= 1 && (
        <MedienklimaTrendChart
          history={state.medienKlimaHistory ?? []}
          current={state.medienKlima ?? 50}
        />
      )}

      <MedienAkteureGrid />

      <MedienAktionen />

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
            const trendDelta = gruppen.showDrift ? getTrendDelta(history) : null;
            const trendChar = trend === 'up' ? '↑' : trend === 'down' ? '↓' : '→';
            const desc = m.beschreibung ?? t(`game:milieu.${m.id}`, m.kurz ?? m.id);
            const canClick = gruppen.type === 'milieus';
            return (
              <div
                key={m.id}
                className={`${styles.card} ${canClick ? styles.cardClickable : ''}`}
                role={canClick ? 'button' : undefined}
                tabIndex={canClick ? 0 : undefined}
                onClick={canClick ? () => setSelectedMilieu(m) : undefined}
                onKeyDown={canClick ? (e) => e.key === 'Enter' && setSelectedMilieu(m) : undefined}
              >
                <div className={styles.cardHeader}>
                  <h3 className={styles.cardTitle} style={{ color: getBarColor(value) }}>
                    {t(`game:milieu.${m.id}`, m.kurz ?? m.id)}
                  </h3>
                  <span className={styles.percentage}>{Math.round(value)}%</span>
                </div>
                {gruppen.showDrift && trendDelta != null && (
                  <span
                    className={`${styles.trend} ${
                      trendDelta > 0 ? styles.trendUp : trendDelta < 0 ? styles.trendDown : styles.trendNeutral
                    }`}
                  >
                    {trendChar} {Math.abs(trendDelta)}%
                  </span>
                )}
                <p className={styles.cardDesc}>{desc}</p>
                <MilieuBar name="" value={value} color={getBarColor(value)} history={history} />
              </div>
            );
          })
        )}
      </div>

      {selectedMilieu && (
        <MilieuDetailPanel milieu={selectedMilieu} onClose={() => setSelectedMilieu(null)} />
      )}
    </div>
  );
}
