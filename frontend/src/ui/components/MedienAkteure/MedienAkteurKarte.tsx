import type { MedienAkteurContent } from '../../../data/defaults/medienAkteure';
import {
  AKTEUR_AGENDA_TEXTE,
  getMedienAkteurIcon,
} from '../../../data/defaults/medienAkteure';
import { effektiveMedienAkteurStimmung } from '../../../core/systems/medienklima';
import type { GameState } from '../../../core/types';
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

function getStimmungsLabel(wert: number): string {
  if (wert <= -40) return 'Sehr kritisch';
  if (wert <= -15) return 'Kritisch';
  if (wert < 15) return 'Neutral';
  if (wert < 40) return 'Freundlich';
  return 'Sehr positiv';
}

interface MedienAkteurKarteProps {
  def: MedienAkteurContent;
  stateRow: { stimmung: number; reichweite: number };
  game: Pick<GameState, 'month' | 'medienAkteurBuffs'>;
}

export function MedienAkteurKarte({ def, stateRow, game }: MedienAkteurKarteProps) {
  const effStimmung = effektiveMedienAkteurStimmung(def.id, stateRow, game.medienAkteurBuffs, game.month);
  const pct = ((effStimmung + 100) / 200) * 100;

  return (
    <article className={`${styles.card} ${typClass(def.typ)}`}>
      <div className={styles.header}>
        <span className={styles.icon} aria-hidden>
          {getMedienAkteurIcon(def.typ)}
        </span>
        <div className={styles.headerText}>
          <h3 className={styles.title}>{def.name_de}</h3>
          <div className={styles.reichweite}>{Math.round(stateRow.reichweite)}% Reichweite</div>
        </div>
      </div>

      <div className={styles.stimmungWrap}>
        <span className={styles.stimmungLabel}>Stimmung</span>
        <div className={styles.barTrack} role="img" aria-label={`Stimmung ${effStimmung}`}>
          <span className={styles.barCenter} />
          <span className={styles.barMarker} style={{ left: `${pct}%` }} />
        </div>
        <span className={styles.stimmungLabel}>
          {getStimmungsLabel(effStimmung)} ({effStimmung})
        </span>
      </div>

      {def.typ === 'social' && (
        <div className={styles.warnVolatil}>
          Sehr volatil — Stimmung kann schnell kippen
        </div>
      )}

      {def.typ === 'alternativ' && stateRow.reichweite > 10 && (
        <div className={styles.warnAlternativ}>
          Wachsende Reichweite — Medienklima leidet
        </div>
      )}

      <p className={styles.agenda}>{AKTEUR_AGENDA_TEXTE[def.typ]}</p>

      {['oeffentlich', 'alternativ'].includes(def.typ) && (
        <span className={styles.passivBadge}>Nicht direkt beeinflussbar</span>
      )}
    </article>
  );
}
