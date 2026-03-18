import { useTranslation } from 'react-i18next';
import { useGameStore } from '../../../store/gameStore';
import { MilieuBar } from '../MilieuBar/MilieuBar';
import styles from './MilieuSidebar.module.css';

/** SMA-321: Immer 3 aggregierte Gruppen in der Sidebar (nie individuelle Milieus) */
const AGG_KONSERVATIV = ['etablierte', 'buergerliche_mitte', 'traditionelle'];
const AGG_ARBEIT = ['leistungstraeger', 'soziale_mitte', 'prekaere'];
const AGG_PROGRESSIV = ['postmaterielle'];

const EMPTY_MILIEU_ZUSTIMMUNG: Record<string, number> = {};

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

function getBarColor(value: number): string {
  if (value >= 55) return 'var(--green)';
  if (value >= 35) return 'var(--warn)';
  return 'var(--red)';
}

export function MilieuSidebar() {
  const { t } = useTranslation(['common', 'game']);
  const milieuZustimmung = useGameStore((s) => s.state.milieuZustimmung ?? EMPTY_MILIEU_ZUSTIMMUNG);
  const zust = useGameStore((s) => s.state.zust);

  /** SMA-321: Sidebar zeigt immer 3 aggregierte Gruppen (Konservativ/Arbeit/Progressiv), nie individuelle Milieus */
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
