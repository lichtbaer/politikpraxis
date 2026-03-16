import type { Character } from '../../../core/types';
import { useUIStore } from '../../../store/uiStore';
import styles from './CharacterRow.module.css';

const MOOD_EMOJI: Record<number, string> = {
  0: '😠',
  1: '😟',
  2: '😐',
  3: '🙂',
  4: '😊',
};

interface CharacterRowProps {
  character: Character;
}

function getRoleColor(loyalty: number): string {
  if (loyalty >= 4) return 'var(--green)';
  if (loyalty <= 1) return 'var(--red)';
  return 'var(--text2)';
}

export function CharacterRow({ character }: CharacterRowProps) {
  const showCharDetail = useUIStore((s) => s.showCharDetail);
  const { id, name, role, initials, color, mood, loyalty } = character;
  const emoji = MOOD_EMOJI[Math.min(4, Math.max(0, mood))] ?? '😐';

  return (
    <button
      type="button"
      className={styles.root}
      onClick={() => showCharDetail(id)}
    >
      <div
        className={styles.avatar}
        style={{
          backgroundColor: `${color}33`,
          borderColor: color,
        }}
      >
        {initials}
      </div>
      <div className={styles.info}>
        <span className={styles.name}>{name}</span>
        <span
          className={styles.role}
          style={{ color: getRoleColor(loyalty) }}
        >
          {role}
        </span>
      </div>
      <span className={styles.mood}>{emoji}</span>
    </button>
  );
}
