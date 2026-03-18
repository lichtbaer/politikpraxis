import { useTranslation } from 'react-i18next';
import { MessageCircle } from 'lucide-react';
import type { Character } from '../../../core/types';
import { useUIStore } from '../../../store/uiStore';
import { useGameStore } from '../../../store/gameStore';
import { MOOD_ICONS } from '../../icons';
import styles from './CharacterRow.module.css';

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
  const pk = useGameStore((s) => s.state.pk);
  const month = useGameStore((s) => s.state.month);
  const cooldowns = useGameStore((s) => s.state.charGespraechCooldowns);
  const doKabinettsgespraech = useGameStore((s) => s.doKabinettsgespraech);
  const { id, initials, color, mood, loyalty } = character;
  const MoodIcon = MOOD_ICONS[Math.min(4, Math.max(0, mood))];

  const badgeColor = character.partei_farbe ?? color;

  const cooldownUntil = cooldowns?.[id] ?? 0;
  const onCooldown = month < cooldownUntil;
  const cooldownRemaining = onCooldown ? cooldownUntil - month : 0;
  const notEnoughPK = pk < 8;
  const gespraechDisabled = onCooldown || notEnoughPK;

  return (
    <div className={styles.rowWrap}>
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
        <span className={styles.mood} title={t('game:kabinett.stimmungTooltip', { value: mood, max: 4 })}>
          <MoodIcon size={16} aria-hidden />
        </span>
      </button>
      <button
        type="button"
        className={styles.gespraechBtn}
        disabled={gespraechDisabled}
        title={
          onCooldown
            ? t('game:kabinett.gespraechCooldown', { months: cooldownRemaining })
            : notEnoughPK
              ? t('game:kabinett.gespraechKeinPK', { pk: 8 })
              : t('game:kabinett.gespraechTooltip', { pk: 8 })
        }
        onClick={(e) => {
          e.stopPropagation();
          doKabinettsgespraech(id);
        }}
      >
        <MessageCircle size={16} aria-hidden />
        {onCooldown && <span className={styles.cooldownBadge}>{cooldownRemaining}M</span>}
      </button>
    </div>
  );
}
