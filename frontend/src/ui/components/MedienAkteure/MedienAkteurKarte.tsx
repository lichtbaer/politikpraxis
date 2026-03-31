import { useTranslation } from 'react-i18next';
import type { MedienAkteurContent } from '../../../data/defaults/medienAkteure';
import {
  getMedienAkteurIcon,
} from '../../../data/defaults/medienAkteure';
import { effektiveMedienAkteurStimmung } from '../../../core/systems/medienklima';
import type { GameState } from '../../../core/types';
import { formatStimmung } from '../../lib/medienDisplay';
import styles from './MedienAkteurKarte.module.css';

function typClass(typ: MedienAkteurContent['typ']): string {
  switch (typ) {
    case 'oeffentlich':
      return styles.typOeffentlich;
    case 'boulevard':
      return styles.typBoulevard;
    case 'qualitaet':
      return styles.typQualitaet;
    case 'social':
      return styles.typSocial;
    case 'konservativ':
      return styles.typKonservativ;
    case 'alternativ':
      return styles.typAlternativ;
    default:
      return '';
  }
}

function getStimmungsLabelKey(wert: number): string {
  if (wert <= -40) return 'sehrKritisch';
  if (wert <= -15) return 'kritisch';
  if (wert < 15) return 'neutral';
  if (wert < 40) return 'freundlich';
  return 'sehrPositiv';
}

interface MedienAkteurKarteProps {
  def: MedienAkteurContent;
  stateRow: { stimmung: number; reichweite: number };
  game: Pick<GameState, 'month' | 'medienAkteurBuffs'>;
}

export function MedienAkteurKarte({ def, stateRow, game }: MedienAkteurKarteProps) {
  const { t } = useTranslation('game');
  const effStimmungRaw = effektiveMedienAkteurStimmung(def.id, stateRow, game.medienAkteurBuffs, game.month);
  const effStimmung = Math.round(effStimmungRaw);
  const pct = ((effStimmung + 100) / 200) * 100;

  return (
    <article className={`${styles.card} ${typClass(def.typ)}`}>
      <div className={styles.header}>
        <span className={styles.icon} aria-hidden>
          {getMedienAkteurIcon(def.typ)}
        </span>
        <div className={styles.headerText}>
          <h3 className={styles.title}>{def.name}</h3>
          <div className={styles.reichweite}>{t('medienAkteure.reichweite', { value: Math.round(stateRow.reichweite) })}</div>
        </div>
      </div>

      <div className={styles.stimmungWrap}>
        <span className={styles.stimmungLabel}>{t('medienAkteure.stimmung')}</span>
        <div className={styles.barTrack} role="img" aria-label={`${t('medienAkteure.stimmung')} ${formatStimmung(effStimmungRaw)}`}>
          <span className={styles.barCenter} />
          <span className={styles.barMarker} style={{ left: `${pct}%` }} />
        </div>
        <span className={styles.stimmungLabel}>
          {t(`medienAkteure.${getStimmungsLabelKey(effStimmung)}`)} ({formatStimmung(effStimmungRaw)})
        </span>
      </div>

      {def.typ === 'social' && (
        <div className={styles.warnVolatil}>
          {t('medienAkteure.warnVolatil')}
        </div>
      )}

      {def.typ === 'alternativ' && stateRow.reichweite > 10 && (
        <div className={styles.warnAlternativ}>
          {t('medienAkteure.warnAlternativ')}
        </div>
      )}

      <p className={styles.agenda}>{t(`medienAkteure.agenda.${def.typ}`)}</p>

      {['oeffentlich', 'alternativ'].includes(def.typ) && (
        <span className={styles.passivBadge}>{t('medienAkteure.passiv')}</span>
      )}
    </article>
  );
}
