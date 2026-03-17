import { useTranslation } from 'react-i18next';
import { useGameStore } from '../../store/gameStore';
import { AgendaCard } from '../components/AgendaCard/AgendaCard';
import type { Law, LawStatus } from '../../core/types';
import styles from './AgendaView.module.css';

const STATUS_ORDER: LawStatus[] = ['blockiert', 'aktiv', 'ausweich', 'entwurf', 'beschlossen'];

function orderLaws(laws: Law[]): Law[] {
  const byStatus = new Map<LawStatus, Law[]>();
  for (const law of laws) {
    const arr = byStatus.get(law.status) ?? [];
    arr.push(law);
    byStatus.set(law.status, arr);
  }
  const result: Law[] = [];
  for (const status of STATUS_ORDER) {
    const arr = byStatus.get(status);
    if (arr) result.push(...arr);
  }
  return result;
}

export function AgendaView() {
  const { t } = useTranslation('game');
  const { state, complexity } = useGameStore();
  const visibleGesetze = state.gesetze.filter((g) => (g.min_complexity ?? 1) <= complexity);
  const ordered = orderLaws(visibleGesetze);

  return (
    <div className={styles.root}>
      <h1 className={styles.title}>{t('agenda.title')}</h1>
      <div className={styles.list}>
        {ordered.map((law) => (
          <AgendaCard key={law.id} law={law} />
        ))}
      </div>
    </div>
  );
}
