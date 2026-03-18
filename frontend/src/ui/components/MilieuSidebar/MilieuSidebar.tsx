import { useState } from 'react';
import { useTranslation } from 'react-i18next';
import { useContentStore } from '../../../stores/contentStore';
import { useGameStore } from '../../../store/gameStore';
import { featureActive } from '../../../core/systems/features';
import { MilieuBar } from '../MilieuBar/MilieuBar';
import { MilieuDetailPanel } from '../MilieuDetailPanel/MilieuDetailPanel';
import styles from './MilieuSidebar.module.css';

/** Aggregation für Stufe 1: konservativ = etablierte, buergerliche_mitte, traditionelle */
const AGG_KONSERVATIV = ['etablierte', 'buergerliche_mitte', 'traditionelle'];
/** arbeit = leistungstraeger, prekaere */
const AGG_ARBEIT = ['leistungstraeger', 'prekaere'];
/** progressiv = soziale_mitte, postmaterielle */
const AGG_PROGRESSIV = ['soziale_mitte', 'postmaterielle'];

const EMPTY_MILIEU_ZUSTIMMUNG: Record<string, number> = {};
const EMPTY_MILIEU_HISTORY: Record<string, number[]> = {};

function gewichtesMittel(
  milieuIds: string[],
  milieuZustimmung: Record<string, number>,
  zust: { arbeit: number; mitte: number; prog: number },
): number {
  const MILIEU_TO_ZUST: Record<string, number> = {
    postmaterielle: zust.prog,
    soziale_mitte: zust.arbeit,
    prekaere: zust.arbeit,
    buergerliche_mitte: zust.mitte,
    leistungstraeger: zust.mitte,
    etablierte: zust.mitte,
    traditionelle: zust.mitte,
  };
  let sum = 0;
  let count = 0;
  for (const id of milieuIds) {
    const v = milieuZustimmung[id] ?? MILIEU_TO_ZUST[id] ?? 50;
    sum += v;
    count++;
  }
  return count > 0 ? Math.round(sum / count) : 50;
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

function getBarColor(value: number): string {
  if (value >= 55) return 'var(--green)';
  if (value >= 35) return 'var(--warn)';
  return 'var(--red)';
}

export function MilieuSidebar() {
  const { t } = useTranslation(['common', 'game']);
  const milieus = useContentStore((s) => s.milieus);
  const complexity = useGameStore((s) => s.complexity);
  const milieuZustimmung = useGameStore((s) => s.state.milieuZustimmung ?? EMPTY_MILIEU_ZUSTIMMUNG);
  const milieuZustimmungHistory = useGameStore((s) => s.state.milieuZustimmungHistory ?? EMPTY_MILIEU_HISTORY);
  const zust = useGameStore((s) => s.state.zust);

  const useAggregated = complexity === 1;
  const showFullMilieus = featureActive(complexity, 'milieus_voll') && milieus.length > 0;

  if (!showFullMilieus && !useAggregated) {
    return (
      <div className={styles.milieus}>
        <MilieuBar name={t('game:milieu.arbeit')} value={zust.arbeit} color="var(--land-c)" />
        <MilieuBar name={t('game:milieu.mitte')} value={zust.mitte} color="var(--eu-c)" />
        <MilieuBar name={t('game:milieu.prog')} value={zust.prog} color="var(--blue)" />
      </div>
    );
  }

  if (useAggregated) {
    const konservativ = gewichtesMittel(AGG_KONSERVATIV, milieuZustimmung, zust);
    const arbeit = gewichtesMittel(AGG_ARBEIT, milieuZustimmung, zust);
    const progressiv = gewichtesMittel(AGG_PROGRESSIV, milieuZustimmung, zust);
    return (
      <div className={styles.milieus}>
        <MilieuBar name={t('game:milieu.konservativ')} value={konservativ} color={getBarColor(konservativ)} />
        <MilieuBar name={t('game:milieu.arbeit')} value={arbeit} color={getBarColor(arbeit)} />
        <MilieuBar name={t('game:milieu.prog')} value={progressiv} color={getBarColor(progressiv)} />
      </div>
    );
  }

  const visibleMilieus = milieus.filter((m) => m.min_complexity <= complexity);
  const [selectedMilieu, setSelectedMilieu] = useState<string | null>(null);
  const selectedMilieuData = selectedMilieu ? visibleMilieus.find((m) => m.id === selectedMilieu) : null;

  return (
    <div className={styles.milieusWrapper}>
      <div className={styles.milieus}>
        {visibleMilieus.map((m) => {
          const value = milieuZustimmung[m.id] ?? 50;
          const history = milieuZustimmungHistory[m.id] ?? [];
          const trend = getTrend(history);
          const trendChar = trend === 'up' ? '↑' : trend === 'down' ? '↓' : '→';
          const label = `${t(`game:milieu.${m.id}`, m.kurz ?? m.id)} ${trendChar}`;
          return (
            <div
              key={m.id}
              className={`${styles.milieuItem} ${styles.clickable}`}
              onClick={() => setSelectedMilieu(m.id)}
              onKeyDown={(e) => e.key === 'Enter' && setSelectedMilieu(m.id)}
              role="button"
              tabIndex={0}
              title={t('game:milieu.milieuDetail.openHint')}
            >
              <MilieuBar name={label} value={value} color={getBarColor(value)} history={history} />
            </div>
          );
        })}
      </div>
      {selectedMilieuData && (
        <MilieuDetailPanel
          milieu={selectedMilieuData}
          onClose={() => setSelectedMilieu(null)}
        />
      )}
    </div>
  );
}
