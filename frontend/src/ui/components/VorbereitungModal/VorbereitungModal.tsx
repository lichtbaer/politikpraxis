/**
 * SMA-274: Vorbereitungs-Modal — Auswahl von Vorstufen (Kommunal, Länder, EU).
 * Stadttyp-Auswahl (Stufe 2 abstrakt, Stufe 3+ konkret), Länder-Fraktion, EU-Klima.
 */
import { useTranslation } from 'react-i18next';
import { useGameStore } from '../../../store/gameStore';
import { useGameActions } from '../../hooks/useGameActions';
import { featureActive } from '../../../core/systems/features';
import { getVorstufenBoni } from '../../../core/systems/gesetzLebenszyklus';
import { bewerteEURoute } from '../../../core/systems/eu';
import type { Law } from '../../../core/types';
import { X as XIcon, AlertTriangle } from '../../icons';
import styles from './VorbereitungModal.module.css';

const STADTTYP_KEYS: ('progressiv' | 'konservativ' | 'industrie')[] = ['progressiv', 'konservativ', 'industrie'];

/** Stufe 3+: Konkrete Städte nach Stadttyp */
const STAEDTE_STUFE3: Record<string, { name: string; stadttyp: 'progressiv' | 'konservativ' | 'industrie' }[]> = {
  progressiv: [
    { name: 'Hamburg', stadttyp: 'progressiv' },
    { name: 'Berlin', stadttyp: 'progressiv' },
    { name: 'München', stadttyp: 'progressiv' },
  ],
  konservativ: [
    { name: 'Leipzig', stadttyp: 'konservativ' },
    { name: 'Dresden', stadttyp: 'konservativ' },
  ],
  industrie: [
    { name: 'Dortmund', stadttyp: 'industrie' },
    { name: 'Duisburg', stadttyp: 'industrie' },
  ],
};

interface VorbereitungModalProps {
  law: Law;
  onClose: () => void;
}

export function VorbereitungModal({ law, onClose }: VorbereitungModalProps) {
  const { t } = useTranslation('game');
  const { state, content, complexity } = useGameStore();
  const actions = useGameActions();
  const projekt = state.gesetzProjekte?.[law.id];
  const pk = state.pk;

  const hasKommunal = featureActive(complexity, 'kommunal_pilot') && law.kommunal_pilot_moeglich !== false;
  const hasLaender = featureActive(complexity, 'laender_pilot') && law.laender_pilot_moeglich !== false;
  const hasEU = featureActive(complexity, 'eu_route') && law.eu_initiative_moeglich !== false;

  const kommunalAktiv = projekt?.aktiveVorstufen?.some((v) => v.typ === 'kommunal' && !v.abgeschlossen);
  const laenderAktiv = projekt?.aktiveVorstufen?.some((v) => v.typ === 'laender' && !v.abgeschlossen);
  const euAktiv = projekt?.aktiveVorstufen?.some((v) => v.typ === 'eu' && !v.abgeschlossen);

  const boni = getVorstufenBoni(state, law.id);
  const verbaende = content.verbaende ?? [];
  const euBewertung = hasEU ? bewerteEURoute(state, law.id, verbaende, complexity) : null;

  const kommunalKosten = 8;
  const kommunalDauer = 4;
  const laenderKosten = 12;
  const laenderDauer = 5;
  const euDauer = 9;

  const zeitdruckWarnung = (dauer: number) => state.month + dauer > 48;

  const fraktionen = state.bundesratFraktionen ?? [];
  const fraktionenOk = fraktionen.filter((f) => (f.beziehung ?? 50) >= 30);

  const handleKommunalStadttyp = (stadttyp: 'progressiv' | 'konservativ' | 'industrie', stadtname?: string) => {
    if (pk >= kommunalKosten && !kommunalAktiv) {
      actions.startKommunalPilot(law.id, stadttyp, stadtname);
      onClose();
    }
  };

  const handleLaender = (fraktionId: string) => {
    if (pk >= laenderKosten && !laenderAktiv) {
      actions.startLaenderPilot(law.id, fraktionId);
      onClose();
    }
  };

  const handleEU = () => {
    if (!euAktiv) {
      actions.startEUInitiativeAlsVorstufe(law.id);
      onClose();
    }
  };

  const useKonkreteStaedte = complexity >= 3;

  return (
    <div className={styles.overlay} onClick={onClose} role="dialog" aria-modal="true" aria-labelledby="vorbereitung-title">
      <div className={styles.modal} onClick={(e) => e.stopPropagation()}>
        <header className={styles.header}>
          <h2 id="vorbereitung-title">{t('game:vorbereitung.title', { gesetz: law.kurz })}</h2>
          <button type="button" className={styles.close} onClick={onClose} aria-label={t('game:bundesrat.close')}>
            <XIcon size={16} />
          </button>
        </header>

        <div className={styles.body}>
          {hasKommunal && (
            <section className={styles.section}>
              <h3>{t('vorbereitungModal.kommunalPilot')}</h3>
              <p className={styles.meta}>
                {t('vorbereitungModal.kommunalPilotDesc', { cost: kommunalKosten, duration: kommunalDauer })}
              </p>
              {zeitdruckWarnung(kommunalDauer) && (
                <p className={styles.warn}><AlertTriangle size={12} /> {t('vorbereitungModal.nachWahltermin')}</p>
              )}
              {kommunalAktiv ? (
                <p className={styles.aktiv}>{t('vorbereitungModal.vorstufeLaeuft')}</p>
              ) : useKonkreteStaedte ? (
                <div className={styles.stadtGrid}>
                  {Object.entries(STAEDTE_STUFE3).map(([typ, staedte]) => (
                    <div key={typ} className={styles.stadtGruppe}>
                      <span className={styles.stadtTypLabel}>
                        {t(`game:vorbereitung.stadttyp.${typ}`) ?? typ}
                      </span>
                      {staedte.map((s) => (
                        <button
                          key={s.name}
                          type="button"
                          className={styles.stadtBtn}
                          disabled={pk < kommunalKosten}
                          onClick={() => handleKommunalStadttyp(s.stadttyp, s.name)}
                        >
                          {s.name}
                        </button>
                      ))}
                    </div>
                  ))}
                </div>
              ) : (
                <div className={styles.stadttypRow}>
                  {STADTTYP_KEYS.map((key) => (
                    <button
                      key={key}
                      type="button"
                      className={styles.stadttypBtn}
                      disabled={pk < kommunalKosten}
                      onClick={() => handleKommunalStadttyp(key)}
                    >
                      {t(`game:vorbereitung.stadttyp.${key}`)}
                    </button>
                  ))}
                </div>
              )}
            </section>
          )}

          {hasLaender && (
            <section className={styles.section}>
              <h3>{t('vorbereitungModal.laenderPilot')}</h3>
              <p className={styles.meta}>
                {t('vorbereitungModal.laenderPilotDesc', { cost: laenderKosten, duration: laenderDauer })}
              </p>
              {zeitdruckWarnung(laenderDauer) && (
                <p className={styles.warn}><AlertTriangle size={12} /> {t('vorbereitungModal.nachWahltermin')}</p>
              )}
              {laenderAktiv ? (
                <p className={styles.aktiv}>{t('vorbereitungModal.vorstufeLaeuft')}</p>
              ) : (
                <div className={styles.fraktionGrid}>
                  {fraktionenOk.map((f) => (
                    <button
                      key={f.id}
                      type="button"
                      className={styles.fraktionBtn}
                      disabled={pk < laenderKosten}
                      onClick={() => handleLaender(f.id)}
                    >
                      {f.name} ({t('vorbereitungModal.beziehung', { value: f.beziehung ?? 50 })})
                    </button>
                  ))}
                  {fraktionenOk.length === 0 && (
                    <p className={styles.hinweis}>{t('vorbereitungModal.keineFraktion')}</p>
                  )}
                </div>
              )}
            </section>
          )}

          {hasEU && (
            <section className={styles.section}>
              <h3>{t('vorbereitungModal.euInitiative')}</h3>
              <p className={styles.meta}>
                {t('vorbereitungModal.euInitiativeDesc', { duration: euDauer })}
              </p>
              {euBewertung && (
                <p className={styles.klima}>
                  {t('vorbereitungModal.euKlimaIndikator', { pct: Math.round(euBewertung.erfolgschance * 100) })}
                </p>
              )}
              {zeitdruckWarnung(euDauer) && (
                <p className={styles.warn}><AlertTriangle size={12} /> {t('vorbereitungModal.nachWahltermin')}</p>
              )}
              {euAktiv ? (
                <p className={styles.aktiv}>{t('vorbereitungModal.vorstufeLaeuft')}</p>
              ) : (
                <button
                  type="button"
                  className={styles.btn}
                  disabled={pk < 1}
                  onClick={handleEU}
                >
                  {t('vorbereitungModal.euStarten')}
                </button>
              )}
            </section>
          )}

          <div className={styles.akkumuliert}>
            <strong>{t('vorbereitungModal.akkumulierteBoni', { bt: boni.btStimmenBonus, pk: boni.pkKostenRabatt })}</strong>
          </div>
        </div>
      </div>
    </div>
  );
}
