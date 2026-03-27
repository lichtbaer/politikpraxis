import { useTranslation } from 'react-i18next';
import type { KoalitionspartnerParteiId } from '../../../core/types';
import styles from './PartnerWiderstandModal.module.css';

export interface PartnerWiderstandModalProps {
  partnerName: string;
  partnerKuerzel?: string;
  partnerId: KoalitionspartnerParteiId;
  intensitaet: 'hinweis' | 'widerstand' | 'veto';
  koalitionsMalus: number;
  currentPk: number;
  onTrotzdem: () => void;
  onAbbrechen: () => void;
  onKoalitionsverhandlung: () => void;
  onAnpassen: () => void;
}

export function PartnerWiderstandModal({
  partnerName,
  partnerKuerzel,
  partnerId,
  intensitaet,
  koalitionsMalus,
  currentPk,
  onTrotzdem,
  onAbbrechen,
  onKoalitionsverhandlung,
  onAnpassen,
}: PartnerWiderstandModalProps) {
  const { t } = useTranslation('game');
  const pkOk = currentPk >= 15;

  const messageKey =
    intensitaet === 'veto'
      ? 'game:partnerWiderstand.messageVeto'
      : intensitaet === 'widerstand'
        ? 'game:partnerWiderstand.messageWiderstand'
        : 'game:partnerWiderstand.messageHinweis';

  return (
    <div className={styles.overlay} onClick={onAbbrechen} role="presentation">
      <div className={styles.dialog} onClick={(e) => e.stopPropagation()} role="dialog" aria-modal="true">
        <h3 className={styles.title}>
          {intensitaet === 'veto'
            ? t('game:partnerWiderstand.titleVeto', { partner: partnerName })
            : intensitaet === 'widerstand'
              ? t('game:partnerWiderstand.titleWiderstand', { partner: partnerName })
              : t('game:partnerWiderstand.titleHinweis', { partner: partnerName })}
        </h3>
        <p className={styles.message}>
          {t(messageKey, {
            partner: partnerName,
            kuerzel: partnerKuerzel ?? partnerId.toUpperCase(),
            malus: Math.abs(koalitionsMalus),
            defaultValue:
              intensitaet === 'veto'
                ? `${partnerName} lehnt dieses Gesetz mit der Koalition ab.`
                : intensitaet === 'widerstand'
                  ? `${partnerName} warnt: Einbringen belastet die Koalition (−${Math.abs(koalitionsMalus)} Beziehung).`
                  : `${partnerName} sieht dieses Gesetz kritisch. Einbringen kostet −${Math.abs(koalitionsMalus)} Beziehung.`,
          })}
        </p>
        <div className={styles.buttons}>
          <button type="button" className={styles.btn} onClick={onAbbrechen}>
            {t('game:ui.cancel', 'Abbrechen')}
          </button>
          {intensitaet === 'veto' ? (
            <>
              <button type="button" className={styles.btn} onClick={onAnpassen}>
                {t('game:partnerWiderstand.anpassen', 'Später / Agenda')}
              </button>
              <button
                type="button"
                className={styles.btnPrimary}
                onClick={onKoalitionsverhandlung}
                disabled={!pkOk}
                title={!pkOk ? t('game:partnerWiderstand.pkZuWenig') : undefined}
              >
                {t('game:partnerWiderstand.koalitionsverhandlung', 'Koalitionsrunde (15 PK)')}
              </button>
            </>
          ) : (
            <button type="button" className={styles.btnDanger} onClick={onTrotzdem}>
              {t('game:partnerWiderstand.trotzdem', {
                malus: Math.abs(koalitionsMalus),
                defaultValue: `Trotzdem einbringen (−${Math.abs(koalitionsMalus)} Koalition)`,
              })}
            </button>
          )}
        </div>
      </div>
    </div>
  );
}
