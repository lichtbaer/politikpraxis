/**
 * SMA-320: KabinettView — Chars + Koalitionspartner aus Sidebar ausgelagert
 * Char-Karten (groß, mit Bio + Zitat aufklappbar via CharacterDetail)
 * Koalitionspartner-Panel, Ultimatum-Anzeige, Kabinett-Initiativen (Stufe 3+)
 */
import { useTranslation } from 'react-i18next';
import { useGameStore } from '../../store/gameStore';
import { featureActive } from '../../core/systems/features';
import { CharacterRow } from '../components/CharacterRow/CharacterRow';
import { KoalitionspartnerPanel } from '../components/KoalitionspartnerPanel/KoalitionspartnerPanel';
import styles from './KabinettView.module.css';

export function KabinettView() {
  const { t } = useTranslation('game');
  const { state, complexity } = useGameStore();

  const chars = state.chars.filter((c) => (c.min_complexity ?? 1) <= complexity);
  const ultimatumChar = chars.find((c) => c.mood <= (c.ultimatum?.moodThresh ?? 0) + 1);
  const aktiveInitiative = state.aktiveMinisterialInitiative;
  const showInitiativen = featureActive(complexity, 'ministerial_initiativen');

  return (
    <div className={styles.root}>
      <h1 className={styles.title}>{t('game:kabinett.title', 'Kabinett')}</h1>
      <p className={styles.desc}>
        {t('game:kabinett.desc', 'Ihr Kabinett und der Koalitionspartner. Stimmung und Loyalität beeinflussen die Regierungsarbeit.')}
      </p>

      {ultimatumChar && (
        <div className={styles.ultimatumBanner}>
          <span className={styles.ultimatumIcon}>⚠</span>
          <span>
            {t('game:kabinett.ultimatumWarnung', {
              name: ultimatumChar.name || t(`game:chars.${ultimatumChar.id}.name`),
              defaultValue: '{{name}} droht mit Ultimatum — Stimmung kritisch.',
            })}
          </span>
        </div>
      )}

      <section className={styles.section}>
        <h2 className={styles.sectionTitle}>{t('game:leftPanel.kabinett')}</h2>
        <div className={styles.kabinettGrid}>
          {chars.map((char) => (
            <CharacterRow key={char.id} character={char} />
          ))}
        </div>
      </section>

      <KoalitionspartnerPanel />

      {showInitiativen && aktiveInitiative && (
        <section className={styles.section}>
          <h2 className={styles.sectionTitle}>
            {t('game:kabinett.initiativeTitle', 'Ministerial-Initiative')}
          </h2>
          <div className={styles.initiativeBadge}>
            {t('game:kabinett.initiativeAktiv', {
              char: state.chars.find((c) => c.id === aktiveInitiative.charId)?.name ?? aktiveInitiative.charId,
              gesetz: state.gesetze.find((g) => g.id === aktiveInitiative.gesetzId)?.kurz ?? aktiveInitiative.gesetzId,
              defaultValue: '{{char}} bringt {{gesetz}} ein.',
            })}
          </div>
        </section>
      )}
    </div>
  );
}
