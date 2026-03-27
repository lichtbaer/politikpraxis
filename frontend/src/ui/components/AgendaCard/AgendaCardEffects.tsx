import { useTranslation } from 'react-i18next';
import { featureActive } from '../../../core/systems/features';
import { Coins, RefreshCw, TrendingUp, Zap, Lightbulb, AlertTriangle, Hourglass } from '../../icons';
import { formatMrd } from '../../../utils/format';
import { Erklaerung } from '../Erklaerung/Erklaerung';
import { KPI_TO_BEGRIFF } from '../../../constants/begriffe';
import type { Law } from '../../../core/types';
import styles from './AgendaCard.module.css';

/** SMA-305: Kostenampel basierend auf Haushaltslage */
function getKostenFarbe(kosten: number, spielraum: number): 'gruen' | 'gelb' | 'rot' | null {
  if (spielraum <= 0) return null;
  const anteil = Math.abs(kosten) / spielraum;
  if (anteil < 0.05) return 'gruen';
  if (anteil < 0.15) return 'gelb';
  return 'rot';
}

interface AgendaCardEffectsProps {
  law: Law;
  complexity: number;
  kongruenz: number;
  geschaetztePkKosten: number;
  spielraum: number;
  jahresbudget: number;
}

export function AgendaCardEffects({ law, complexity, kongruenz, geschaetztePkKosten, spielraum, jahresbudget }: AgendaCardEffectsProps) {
  const { t } = useTranslation(['common', 'game']);

  return (
    <>
      {law.status === 'entwurf' && law.effekte && Object.values(law.effekte).some(v => v !== 0) && (
        <div className={styles.effectPreview}>
          <span className={styles.effectPreviewLabel}>{t('game:gesetz.erwarteteWirkung')}:</span>
          <div className={styles.effectPreviewTags}>
            {Object.entries(law.effekte).map(([k, v]) => {
              if (!v || v === 0) return null;
              const kpiLabels: Record<string, string> = { al: 'AL', hh: 'HH', gi: 'GI', zf: 'ZF', mk: 'MK' };
              const kpiInverted = new Set(['al', 'gi']);
              const isGood = kpiInverted.has(k) ? v < 0 : v > 0;
              const begriff = KPI_TO_BEGRIFF[k];
              return (
                <span
                  key={k}
                  className={`${styles.effectPreviewTag} ${isGood ? styles.effectPreviewPos : styles.effectPreviewNeg}`}
                >
                  {begriff ? (
                    <Erklaerung begriff={begriff} kinder={kpiLabels[k] ?? k} inline={false} />
                  ) : (
                    kpiLabels[k] ?? k
                  )}{' '}
                  {v > 0 ? '+' : ''}{v.toFixed(1)}
                </span>
              );
            })}
            <span className={styles.effectPreviewLag}>
              <Hourglass size={12} /> {t('game:gesetz.wirkungNach', { defaultValue: 'nach {{months}} Mo.', months: law.lag })}
            </span>
          </div>
        </div>
      )}

      {complexity >= 2 &&
        ((law.kosten_einmalig ?? 0) !== 0 ||
          (law.kosten_laufend ?? 0) !== 0 ||
          (law.einnahmeeffekt ?? 0) !== 0 ||
          law.investiv ||
          (law.status === 'entwurf' && geschaetztePkKosten > 0)) && (
        <div className={styles.gesetzKosten}>
          <div className={styles.gesetzKostenZeile}>
            {law.kosten_einmalig != null && law.kosten_einmalig !== 0 && (
              <span
                className={
                  spielraum > 0
                    ? styles[`kostenAmpel_${getKostenFarbe(law.kosten_einmalig, spielraum) ?? 'neutral'}`]
                    : styles.kostenEinmalig
                }
              >
                <Coins size={14} /> {t('game:gesetz.kostenEinmalig')}: {formatMrd(-law.kosten_einmalig)}
                {spielraum > 0 && law.kosten_einmalig > 0 && jahresbudget > 0 && (
                  <span className={styles.haushaltKontext}>
                    {' '}
                    ({t('game:gesetz.haushaltAnteil', {
                      percent: Math.round((law.kosten_einmalig / jahresbudget) * 100),
                    })}
                    )
                  </span>
                )}
              </span>
            )}
            {law.kosten_laufend != null && law.kosten_laufend !== 0 && (
              <span
                className={
                  spielraum > 0 && law.kosten_laufend > 0
                    ? styles[`kostenAmpel_${getKostenFarbe(law.kosten_laufend * 4, spielraum) ?? 'neutral'}`]
                    : law.kosten_laufend > 0
                      ? styles.kostenNegativ
                      : styles.kostenPositiv
                }
              >
                <RefreshCw size={14} /> {t('game:gesetz.kostenLaufend')}: {formatMrd(-law.kosten_laufend)}/J
              </span>
            )}
          </div>
          <div className={styles.gesetzKostenZeile}>
            {(law.einnahmeeffekt ?? 0) !== 0 && (
              <span className={styles.kostenPositiv}>
                <TrendingUp size={14} /> {t('game:gesetz.einnahmeeffekt')}: +{Math.abs(law.einnahmeeffekt!).toFixed(1)} Mrd. €/J
              </span>
            )}
            {law.status === 'entwurf' && geschaetztePkKosten > 0 && (
              <span className={styles.pkKosten}><Zap size={14} /> {t('game:gesetz.pkKosten')}: {geschaetztePkKosten} PK</span>
            )}
            {law.investiv && (
              <span className={styles.investivBadge}><Lightbulb size={14} /> <Erklaerung begriff="investiv" kinder={t('game:gesetz.investivLabel')} /></span>
            )}
          </div>
        </div>
      )}

      {kongruenz < 60 && featureActive(complexity, 'kongruenz_effekte') && (
        <div className={`${styles.kongruenzSignal} ${kongruenz < 40 ? styles.kongruenzRot : styles.kongruenzAmber}`}>
          <span className={styles.kongruenzIcon}><AlertTriangle size={14} /></span>
          <span>{kongruenz < 40 ? t('game:gesetz.gegenKurs') : t('game:gesetz.erhoehterAufwand')}</span>
        </div>
      )}
    </>
  );
}
