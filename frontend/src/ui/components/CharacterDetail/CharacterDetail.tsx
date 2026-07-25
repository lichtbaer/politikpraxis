import { useTranslation } from 'react-i18next';
import { useGameStore } from '../../../store/gameStore';
import { useUIStore } from '../../../store/uiStore';
import { featureActive } from '../../../core/systems/features';
import { MOOD_ICONS } from '../../icons';
import { DotRating } from '../DotRating/DotRating';
import { Modal } from '../Modal/Modal';
import styles from './CharacterDetail.module.css';

export function CharacterDetail() {
  const { t } = useTranslation('game');
  const charDetailId = useUIStore((s) => s.charDetailId);
  const closeCharDetail = useUIStore((s) => s.closeCharDetail);
  const { state, complexity, doEntlasseMinister } = useGameStore();
  const character = state.chars.find((c) => c.id === charDetailId);

  if (!charDetailId || !character) return null;

  const moodIdx = Math.min(4, Math.max(0, character.mood));
  const moodText = t(`game:mood.${moodIdx}`);
  const MoodIcon = MOOD_ICONS[moodIdx];
  const nearUltimatum = character.mood <= character.ultimatum.moodThresh + 1;

  return (
    <Modal
      onClose={closeCharDetail}
      overlayClassName={styles.overlay}
      dialogClassName={styles.card}
      ariaLabelledBy="char-detail-name"
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
          {character.name || t(`game:chars.${character.id}.name`)}
        </h2>
        <p className={styles.role}>{character.role || t(`game:chars.${character.id}.role`)}</p>
        {character.eingangszitat && (
          <blockquote className={styles.eingangszitat}>{character.eingangszitat}</blockquote>
        )}
        <p className={styles.bio}>{character.bio || t(`game:chars.${character.id}.bio`)}</p>

        <div className={styles.mood}>
          <span className={styles.moodEmoji}><MoodIcon size={18} /></span>
          <span>{moodText}</span>
        </div>

        <div className={styles.loyalty}>
          <DotRating value={character.loyalty} max={5} />
        </div>

        <div className={styles.bonus}>
          {character.bonus?.desc || t(`game:chars.${character.id}.bonus.desc`)}
        </div>

        {nearUltimatum && (
          <div className={styles.warning}>
            {t('game:charDetail.ultimatumWarning', { threshold: character.ultimatum.moodThresh + 1 })}
          </div>
        )}

        {featureActive(complexity, 'ministerial_initiativen') &&
          character.id !== 'kanzler' &&
          !character.ist_kanzler &&
          character.pool_partei &&
          state.month >= 20 &&
          state.pk >= 20 && (
            <button
              type="button"
              className={styles.entlassenBtn}
              onClick={() => {
                doEntlasseMinister(character.id);
                closeCharDetail();
              }}
            >
              {t('game:kabinett.entlassen', 'Entlassen (20 PK)')}
            </button>
          )}

        <div className={styles.interests}>
          {character.interests.map((interest, i) => (
            <span key={i} className={styles.pill}>
              {interest || t(`game:chars.${character.id}.interests.${i}`)}
            </span>
          ))}
        </div>
    </Modal>
  );
}
