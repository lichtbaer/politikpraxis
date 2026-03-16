import { useGameStore } from '../../../store/gameStore';
import { useUIStore } from '../../../store/uiStore';
import styles from './CharacterDetail.module.css';

const MOOD_TEXTS = ['Sehr unzufrieden', 'Unzufrieden', 'Neutral', 'Zufrieden', 'Sehr zufrieden'];
const MOOD_EMOJIS = ['😠', '😟', '😐', '🙂', '😊'];

export function CharacterDetail() {
  const charDetailId = useUIStore((s) => s.charDetailId);
  const closeCharDetail = useUIStore((s) => s.closeCharDetail);
  const { state } = useGameStore();
  const character = state.chars.find((c) => c.id === charDetailId);

  if (!charDetailId || !character) return null;

  const moodIdx = Math.min(4, Math.max(0, character.mood));
  const moodText = MOOD_TEXTS[moodIdx];
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
          aria-label="Schließen"
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
          {character.name}
        </h2>
        <p className={styles.role}>{character.role}</p>
        <p className={styles.bio}>{character.bio}</p>

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
          {character.bonus.desc}
        </div>

        {nearUltimatum && (
          <div className={styles.warning}>
            Nahe Ultimatum-Schwelle (Stimmung ≤ {character.ultimatum.moodThresh + 1})
          </div>
        )}

        <div className={styles.interests}>
          {character.interests.map((interest) => (
            <span key={interest} className={styles.pill}>
              {interest}
            </span>
          ))}
        </div>
      </div>
    </div>
  );
}
