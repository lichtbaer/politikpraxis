import { useTranslation } from 'react-i18next';
import { useGameStore } from '../../../store/gameStore';
import { useUIStore } from '../../../store/uiStore';
import styles from './CharacterDetail.module.css';

const MOOD_EMOJIS = ['😠', '😟', '😐', '🙂', '😊'];

export function CharacterDetail() {
  const { t } = useTranslation('game');
  const charDetailId = useUIStore((s) => s.charDetailId);
  const closeCharDetail = useUIStore((s) => s.closeCharDetail);
  const { state } = useGameStore();
  const character = state.chars.find((c) => c.id === charDetailId);

  if (!charDetailId || !character) return null;

  const moodIdx = Math.min(4, Math.max(0, character.mood));
  const moodText = t(`game:mood.${moodIdx}`);
  const moodEmoji = MOOD_EMOJIS[moodIdx];
  const nearUltimatum = character.mood <= character.ultimatum.moodThresh + 1;

  return (
    <div
      className={styles.overlay}
      onClick={closeCharDetail}
      onKeyDown={(e) => e.key === 'Escape' && closeCharDetail()}
      role="presentation"
    >
      <div
        className={styles.card}
        onClick={(e) => e.stopPropagation()}
        role="dialog"
        aria-modal="true"
        aria-labelledby="char-detail-name"
      >
        <button
          type="button"
          className={styles.close}
          onClick={closeCharDetail}
          aria-label={t('game:charDetail.close')}
        >
          ×
        </button>

        <div
          className={styles.avatar}
          style={{
            backgroundColor: `${character.color}33`,
            borderColor: character.color,
          }}
        >
          {character.initials}
        </div>

        <h2 id="char-detail-name" className={styles.name}>
          {t(`game:chars.${character.id}.name`)}
        </h2>
        <p className={styles.role}>{t(`game:chars.${character.id}.role`)}</p>
        <p className={styles.bio}>{t(`game:chars.${character.id}.bio`)}</p>

        <div className={styles.mood}>
          <span className={styles.moodEmoji}>{moodEmoji}</span>
          <span>{moodText}</span>
        </div>

        <div className={styles.loyalty}>
          {[1, 2, 3, 4, 5].map((i) => (
            <span
              key={i}
              className={i <= character.loyalty ? styles.loyaltyFilled : styles.loyaltyEmpty}
            >
              {i <= character.loyalty ? '●' : '○'}
            </span>
          ))}
        </div>

        <div className={styles.bonus}>
          {t(`game:chars.${character.id}.bonus.desc`)}
        </div>

        {nearUltimatum && (
          <div className={styles.warning}>
            {t('game:charDetail.ultimatumWarning', { threshold: character.ultimatum.moodThresh + 1 })}
          </div>
        )}

        <div className={styles.interests}>
          {character.interests.map((_, i) => (
            <span key={i} className={styles.pill}>
              {t(`game:chars.${character.id}.interests.${i}`)}
            </span>
          ))}
        </div>
      </div>
    </div>
  );
}
