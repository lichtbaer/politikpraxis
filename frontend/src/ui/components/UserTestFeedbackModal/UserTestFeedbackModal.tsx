import { useState } from 'react';
import { useTranslation } from 'react-i18next';
import { useAuthStore } from '../../../store/authStore';
import { getOrCreateStatsSessionId } from '../../../services/stats';
import { submitUserTestFeedback } from '../../../services/userTestFeedback';
import styles from './UserTestFeedbackModal.module.css';

type Props = {
  kontext: 'header' | 'spielende';
  gameStatId?: string | null;
  onClose: () => void;
};

function StarRating({
  value,
  onChange,
  label,
}: {
  value: number | null;
  onChange: (v: number) => void;
  label: string;
}) {
  return (
    <div className={styles.starRow} aria-label={label}>
      {[1, 2, 3, 4, 5].map((n) => (
        <button
          key={n}
          type="button"
          className={`${styles.star} ${value !== null && n <= value ? styles.starOn : ''}`}
          onClick={() => onChange(n)}
          aria-label={`${n} von 5`}
        >
          ★
        </button>
      ))}
    </div>
  );
}

export function UserTestFeedbackModal({ kontext, gameStatId, onClose }: Props) {
  const { t } = useTranslation('common');
  const accessToken = useAuthStore((s) => s.accessToken);

  const [bewertung, setBewertung] = useState<number | null>(null);
  const [verstaendlichkeit, setVerstaendlichkeit] = useState<number | null>(null);
  const [fehlerGemeldet, setFehlerGemeldet] = useState(false);
  const [fehlerBeschreibung, setFehlerBeschreibung] = useState('');
  const [positives, setPositives] = useState('');
  const [verbesserungen, setVerbesserungen] = useState('');
  const [sonstiges, setSonstiges] = useState('');

  const [loading, setLoading] = useState(false);
  const [submitted, setSubmitted] = useState(false);
  const [error, setError] = useState('');

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);
    setError('');
    try {
      await submitUserTestFeedback(
        {
          session_id: getOrCreateStatsSessionId(),
          kontext,
          game_stat_id: gameStatId ?? null,
          bewertung_gesamt: bewertung,
          verstaendlichkeit,
          fehler_gemeldet: fehlerGemeldet,
          fehler_beschreibung: fehlerBeschreibung.trim() || null,
          positives: positives.trim() || null,
          verbesserungen: verbesserungen.trim() || null,
          sonstiges: sonstiges.trim() || null,
        },
        accessToken,
      );
      setSubmitted(true);
    } catch {
      setError(t('userTestFeedback.fehler', 'Feedback konnte nicht gesendet werden. Bitte erneut versuchen.'));
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className={styles.backdrop} onClick={onClose}>
      <div className={styles.dialog} onClick={(e) => e.stopPropagation()}>
        <button type="button" className={styles.close} onClick={onClose} aria-label="Schließen">
          ×
        </button>
        <h2 className={styles.title}>{t('userTestFeedback.titel', 'Playtest-Feedback')}</h2>
        <p className={styles.subtitle}>
          {t('userTestFeedback.untertitel', 'Alle Antworten sind freiwillig und werden nur intern ausgewertet.')}
        </p>

        {submitted ? (
          <div className={styles.success}>
            {t('userTestFeedback.danke', 'Vielen Dank für dein Feedback!')}
          </div>
        ) : (
          <form onSubmit={(e) => void handleSubmit(e)}>
            <div className={styles.field}>
              <span className={styles.label}>{t('userTestFeedback.gesamtbewertung', 'Gesamteindruck')}</span>
              <StarRating
                value={bewertung}
                onChange={setBewertung}
                label={t('userTestFeedback.gesamtbewertung', 'Gesamteindruck')}
              />
            </div>

            <div className={styles.field}>
              <span className={styles.label}>{t('userTestFeedback.verstaendlichkeit', 'Verständlichkeit')}</span>
              <StarRating
                value={verstaendlichkeit}
                onChange={setVerstaendlichkeit}
                label={t('userTestFeedback.verstaendlichkeit', 'Verständlichkeit')}
              />
            </div>

            <div className={styles.field}>
              <span className={styles.label}>{t('userTestFeedback.fehlerFrage', 'Fehler oder Probleme erlebt?')}</span>
              <div className={styles.toggleRow}>
                <button
                  type="button"
                  className={`${styles.toggleBtn} ${fehlerGemeldet ? styles.toggleOn : ''}`}
                  onClick={() => setFehlerGemeldet(true)}
                >
                  {t('yes', 'Ja')}
                </button>
                <button
                  type="button"
                  className={`${styles.toggleBtn} ${!fehlerGemeldet ? styles.toggleOn : ''}`}
                  onClick={() => {
                    setFehlerGemeldet(false);
                    setFehlerBeschreibung('');
                  }}
                >
                  {t('no', 'Nein')}
                </button>
              </div>
            </div>

            {fehlerGemeldet && (
              <div className={styles.field}>
                <label className={styles.label} htmlFor="fb-fehler">
                  {t('userTestFeedback.fehlerBeschreibung', 'Was ist passiert?')}
                </label>
                <textarea
                  id="fb-fehler"
                  className={styles.textarea}
                  rows={3}
                  maxLength={1000}
                  value={fehlerBeschreibung}
                  onChange={(e) => setFehlerBeschreibung(e.target.value)}
                  placeholder={t('userTestFeedback.fehlerPlaceholder', 'Beschreibe den Fehler kurz …')}
                />
              </div>
            )}

            <div className={styles.field}>
              <label className={styles.label} htmlFor="fb-positives">
                {t('userTestFeedback.positives', 'Was hat gut funktioniert?')}
              </label>
              <textarea
                id="fb-positives"
                className={styles.textarea}
                rows={2}
                maxLength={1000}
                value={positives}
                onChange={(e) => setPositives(e.target.value)}
                placeholder={t('userTestFeedback.positivesPlaceholder', 'Optional …')}
              />
            </div>

            <div className={styles.field}>
              <label className={styles.label} htmlFor="fb-verbesserungen">
                {t('userTestFeedback.verbesserungen', 'Was war verwirrend oder schwierig?')}
              </label>
              <textarea
                id="fb-verbesserungen"
                className={styles.textarea}
                rows={2}
                maxLength={1000}
                value={verbesserungen}
                onChange={(e) => setVerbesserungen(e.target.value)}
                placeholder={t('userTestFeedback.verbesserungenPlaceholder', 'Optional …')}
              />
            </div>

            <div className={styles.field}>
              <label className={styles.label} htmlFor="fb-sonstiges">
                {t('userTestFeedback.sonstiges', 'Sonstiges')}
              </label>
              <textarea
                id="fb-sonstiges"
                className={styles.textarea}
                rows={2}
                maxLength={1000}
                value={sonstiges}
                onChange={(e) => setSonstiges(e.target.value)}
                placeholder={t('userTestFeedback.sonstigesPlaceholder', 'Optional …')}
              />
            </div>

            {error && <p className={styles.error}>{error}</p>}

            <div className={styles.row}>
              <button type="submit" className={styles.primary} disabled={loading}>
                {loading
                  ? t('userTestFeedback.senden', 'Senden …')
                  : t('userTestFeedback.absenden', 'Feedback absenden')}
              </button>
              <button type="button" className={styles.secondary} onClick={onClose}>
                {t('userTestFeedback.abbrechen', 'Abbrechen')}
              </button>
            </div>
          </form>
        )}
      </div>
    </div>
  );
}
