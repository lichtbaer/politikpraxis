import { useTranslation } from 'react-i18next';
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
  const { t } = useTranslation('game');
  const showCharDetail = useUIStore((s) => s.showCharDetail);
  const { id, initials, color, mood, loyalty } = character;
  const emoji = MOOD_EMOJI[Math.min(4, Math.max(0, mood))] ?? '😐';

  const badgeColor = character.partei_farbe ?? color;

  return (
    <button
      type="button"
      className={styles.root}
      onClick={() => showCharDetail(id)}
    >
      <div className={styles.avatarWrap}>
        <div
          className={styles.avatar}
          style={{
            backgroundColor: `${color}33`,
            borderColor: color,
          }}
        >
          {initials}
        </div>
        {character.partei_kuerzel && (
          <span
            className={styles.parteiBadge}
            style={{ backgroundColor: badgeColor, color: '#fff' }}
            title={character.partei_kuerzel}
          >
            {character.partei_kuerzel}
          </span>
        )}
      </div>
      <div className={styles.info}>
        <span className={styles.name}>{character.name || t(`game:chars.${id}.name`)}</span>
        <span
          className={styles.role}
          style={{ color: getRoleColor(loyalty) }}
        >
          {character.role || t(`game:chars.${id}.role`)}
        </span>
      </div>
      <span className={styles.mood}>{emoji}</span>
    </button>
  );
}
