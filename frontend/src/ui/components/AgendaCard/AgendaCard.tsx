import { useState } from 'react';
import { useTranslation } from 'react-i18next';
import { useGameStore } from '../../../store/gameStore';
import { useGameActions } from '../../hooks/useGameActions';
import { ROUTE_INFO } from '../../../core/systems/levels';
import { gesetzKongruenz } from '../../../core/ideologie';
import { featureActive } from '../../../core/systems/features';
import { getVorstufenBoni } from '../../../core/systems/gesetzLebenszyklus';
import { isVerfassungsgerichtBlockiert } from '../../../core/systems/parliament';
import { applyKongruenzEffekte, getEinbringenPkKosten } from '../../../core/systems/kongruenz';
import { getMedienPkZusatzkosten } from '../../../core/systems/medienklima';
import { VorstufeBadge } from '../VorstufeBadge/VorstufeBadge';
import { VorbereitungModal } from '../VorbereitungModal/VorbereitungModal';
import { FramingModal } from '../FramingModal/FramingModal';
import type { Law, LawStatus, RouteType } from '../../../core/types';
import styles from './AgendaCard.module.css';

/** SMA-305: Formatiert Milliarden-Beträge mit Vorzeichen */
function formatMrd(wert: number): string {
  if (wert === 0) return '0';
  const prefix = wert < 0 ? '−' : '+';
  return `${prefix}${Math.abs(wert).toFixed(1)} Mrd. €`;
}

/** SMA-305: Kostenampel basierend auf Haushaltslage (< 5% grün, 5–15% gelb, > 15% rot) */
function getKostenFarbe(kosten: number, spielraum: number): 'gruen' | 'gelb' | 'rot' | null {
  if (spielraum <= 0) return null;
  const anteil = Math.abs(kosten) / spielraum;
  if (anteil < 0.05) return 'gruen';
  if (anteil < 0.15) return 'gelb';
  return 'rot';
}

interface AgendaCardProps {
  law: Law;
  /** SMA-287: Empfohlen-Badge für Top-3 zur Spieler-Ausrichtung */
  isRecommended?: boolean;
  /** SMA-293: Kongruenz-Anzeige (Stufe 2+) neben dem Gesetz */
  showKongruenz?: boolean;
}

const STATUS_KEYS: Record<LawStatus, string> = {
  entwurf: 'game.status.entwurf',
  eingebracht: 'game.status.eingebracht',
  aktiv: 'game.status.aktiv',
  bt_passed: 'game.status.bt_passed',
  blockiert: 'game.status.blockiert',
  beschlossen: 'game.status.beschlossen',
  ausweich: 'game.status.ausweich',
};

const STATUS_CLASS: Record<LawStatus, string> = {
  entwurf: styles.statusEntwurf,
  eingebracht: styles.statusEingebracht,
  aktiv: styles.statusAktiv,
  bt_passed: styles.statusAktiv,
  blockiert: styles.statusBlockiert,
  beschlossen: styles.statusBeschlossen,
  ausweich: styles.statusAusweich,
};

export function AgendaCard({ law, isRecommended, showKongruenz }: AgendaCardProps) {
  const { t } = useTranslation(['common', 'game']);
  const { state, complexity, ausrichtung } = useGameStore();
  const actions = useGameActions();
  const [showVorbereitungModal, setShowVorbereitungModal] = useState(false);
  const [showFramingModal, setShowFramingModal] = useState(false);
  const expanded = law.expanded;
  const pk = state.pk;

  const kongruenz = gesetzKongruenz(ausrichtung, law);
  const projekt = state.gesetzProjekte?.[law.id];
  const boni = getVorstufenBoni(state, law.id);
  const hasVorstufen = featureActive(complexity, 'kommunal_pilot') || featureActive(complexity, 'laender_pilot') || featureActive(complexity, 'eu_route');
  const hasFraming = featureActive(complexity, 'framing') && (law.framing_optionen?.length ?? 0) > 0;

  const haushalt = state.haushalt;
  const spielraum = haushalt?.spielraum ?? 0;
  const jahresbudget = haushalt ? haushalt.einnahmen - haushalt.pflichtausgaben : 0;

  const kongruenzEffekt = applyKongruenzEffekte(state, law.id, ausrichtung, complexity);
  const medienZusatz = featureActive(complexity, 'medienklima')
    ? getMedienPkZusatzkosten(state.medienKlima ?? 55)
    : 0;
  const geschaetztePkKosten =
    law.status === 'entwurf'
      ? Math.max(2, getEinbringenPkKosten(kongruenzEffekt.pkModifikator) - boni.pkKostenRabatt + medienZusatz)
      : 0;

  const handleHeaderClick = () => actions.toggleAgenda(law.id);

  const verfassungsgerichtBlockiert = isVerfassungsgerichtBlockiert(state, law);
  const canEinbringen =
    law.status === 'entwurf' &&
    pk >= 20 &&
    !verfassungsgerichtBlockiert;
  const canLobbying = (law.status === 'entwurf' || law.status === 'aktiv' || law.status === 'eingebracht') && pk >= 12;

  // Tooltip-Erklärung für deaktivierte Buttons
  const einbringenTooltip = !canEinbringen && law.status === 'entwurf'
    ? verfassungsgerichtBlockiert
      ? t('game:gesetz.blockiertVerfassungsgericht')
      : pk < 20
        ? t('game:gesetz.pkNichtGenug', { required: 20, current: pk })
        : ''
    : '';
  const lobbyingTooltip = !canLobbying
    ? pk < 12
      ? t('game:gesetz.pkNichtGenug', { required: 12, current: pk })
      : ''
    : '';

  const eingebrachtInfo = state.eingebrachteGesetze?.find((e) => e.gesetzId === law.id);
  const monateNoch = eingebrachtInfo ? Math.max(0, eingebrachtInfo.abstimmungMonat - state.month) : 0;
  const fortschritt = eingebrachtInfo
    ? Math.min(eingebrachtInfo.lagMonths, state.month - eingebrachtInfo.eingebrachtMonat)
    : 0;

  const total = law.ja + law.nein;
  const pct = total > 0 ? Math.round((law.ja / total) * 100) : 0;
  const effectivePct = Math.min(95, pct + boni.btStimmenBonus);

  return (
    <div className={styles.card}>
      <header className={styles.header} onClick={handleHeaderClick}>
        <span className={`${styles.badge} ${STATUS_CLASS[law.status]}`}>
          {t(STATUS_KEYS[law.status], { ns: 'common' })}
        </span>
        {isRecommended && (
          <span className={styles.empfohlenBadge}>{t('game:gesetzAgenda.empfohlen')}</span>
        )}
        <h3 className={styles.title}>{law.titel || t(`game:laws.${law.id}.titel`)}</h3>
        {showKongruenz && (
          <span className={styles.kongruenzBadge}>
            {t('game:gesetzAgenda.kongruenz', { percent: kongruenz })}%
          </span>
        )}
        <span className={styles.arrow}>{expanded ? '▲' : '▼'}</span>
      </header>

      {expanded && (
        <div className={styles.body}>
          <p className={styles.desc}>{law.desc || t(`game:laws.${law.id}.desc`)}</p>

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
                    💰 {t('game:gesetz.kostenEinmalig')}: {formatMrd(-law.kosten_einmalig)}
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
                    🔄 {t('game:gesetz.kostenLaufend')}: {formatMrd(-law.kosten_laufend)}/J
                  </span>
                )}
              </div>
              <div className={styles.gesetzKostenZeile}>
                {(law.einnahmeeffekt ?? 0) !== 0 && (
                  <span className={styles.kostenPositiv}>
                    📈 {t('game:gesetz.einnahmeeffekt')}: +{Math.abs(law.einnahmeeffekt!).toFixed(1)} Mrd. €/J
                  </span>
                )}
                {law.status === 'entwurf' && geschaetztePkKosten > 0 && (
                  <span className={styles.pkKosten}>⚡ {t('game:gesetz.pkKosten')}: {geschaetztePkKosten} PK</span>
                )}
                {law.investiv && (
                  <span className={styles.investivBadge}>💡 {t('game:gesetz.investivLabel')}</span>
                )}
              </div>
            </div>
          )}

          {kongruenz < 60 && featureActive(complexity, 'kongruenz_effekte') && (
            <div className={`${styles.kongruenzSignal} ${kongruenz < 40 ? styles.kongruenzRot : styles.kongruenzAmber}`}>
              <span className={styles.kongruenzIcon}>{kongruenz < 40 ? '⚠' : '!'}</span>
              <span>{kongruenz < 40 ? t('game:gesetz.gegenKurs') : t('game:gesetz.erhoehterAufwand')}</span>
            </div>
          )}

          <div className={styles.tags}>
            {law.tags.map((tag) => (
              <span key={tag} className={styles.tag}>
                {t(`game.tags.${tag}`, { ns: 'common' }) ?? tag}
              </span>
            ))}
          </div>

          {(law.status === 'entwurf' || law.status === 'aktiv' || law.status === 'eingebracht') && (
            <div className={styles.voteBar}>
              <div className={styles.voteTrack}>
                <div
                  className={styles.voteFill}
                  style={{ width: `${pct}%` }}
                />
              </div>
              <span className={styles.voteLabel}>
                {law.ja} Ja / {law.nein} Nein ({pct}%)
              </span>
              {hasVorstufen && boni.btStimmenBonus > 0 && (
                <div className={styles.btChanceBonus}>
                  {t('game:vorstufen.btChanceMitBonus', { base: pct, effective: effectivePct })}
                  <span className={styles.bonusTag}>
                    {t('game:vorstufen.bonusTag', { bonus: boni.btStimmenBonus })}
                  </span>
                </div>
              )}
            </div>
          )}

          {hasVorstufen && law.status === 'entwurf' && (
            <div className={styles.vorstufenStatus}>
              <VorstufeBadge
                typ="kommunal"
                projekt={projekt}
                month={state.month}
                onAbbrechen={featureActive(complexity, 'kommunal_pilot') ? actions.abbrechenVorstufe : undefined}
              />
              <VorstufeBadge
                typ="laender"
                projekt={projekt}
                month={state.month}
                onAbbrechen={featureActive(complexity, 'laender_pilot') ? actions.abbrechenVorstufe : undefined}
              />
              {featureActive(complexity, 'eu_route') && (
                <VorstufeBadge
                  typ="eu"
                  projekt={projekt}
                  month={state.month}
                  onAbbrechen={actions.abbrechenVorstufe}
                />
              )}
            </div>
          )}

          {law.status === 'ausweich' && law.route && (
            <div className={styles.progressBar}>
              <div className={styles.progressTrack}>
                <div
                  className={styles.progressFill}
                  style={{
                    width: `${(law.rprog / law.rdur) * 100}%`,
                  }}
                />
              </div>
              <span className={styles.progressLabel}>
                {t('game:agenda.routeFormat', { route: t(`game:routes.${law.route}`), progress: law.rprog, duration: law.rdur })}
              </span>
            </div>
          )}

          {law.status === 'blockiert' && law.blockiert && (
            <div className={styles.blockiertPanel}>
              {t('game:agenda.blockiertDurch', { blocker: law.blockiert === 'bundestag' ? t('game:agenda.blockerBundestag') : t('game:agenda.blockerBundesrat') })}
            </div>
          )}

          {law.status === 'eingebracht' && eingebrachtInfo && (
            <div className={styles.progressBar}>
              <div className={styles.progressTrack}>
                <div
                  className={`${styles.progressFill} ${styles.progressFillEingebracht}`}
                  style={{
                    width: `${(fortschritt / eingebrachtInfo.lagMonths) * 100}%`,
                  }}
                />
              </div>
              <span className={styles.progressLabel}>
                {t('game:agenda.ausschussphaseIn', { months: monateNoch })}
              </span>
              <span className={styles.progressLabel}>
                {t('game:agenda.ausschussphaseProgress', {
                  progress: fortschritt,
                  total: eingebrachtInfo.lagMonths,
                })}
              </span>
            </div>
          )}

          {law.status === 'bt_passed' && law.brVoteMonth != null && (
            <div className={styles.progressBar}>
              <span className={styles.progressLabel}>
                {t('game:agenda.brVoteIn', { months: law.brVoteMonth - state.month })}
              </span>
            </div>
          )}

          <div className={styles.actions}>
            {law.status === 'entwurf' && (
              <>
                {featureActive(complexity, 'kommunal_pilot') && law.kommunal_pilot_moeglich !== false && (
                  <button
                    type="button"
                    className={styles.btn}
                    onClick={() => setShowVorbereitungModal(true)}
                  >
                    + {t('game:vorstufen.vorbereitung')}
                  </button>
                )}
                <button
                  type="button"
                  className={styles.btn}
                  disabled={!canEinbringen}
                  title={einbringenTooltip}
                  onClick={() => {
                    if (hasFraming) {
                      setShowFramingModal(true);
                    } else {
                      actions.einbringen(law.id);
                    }
                  }}
                >
                  {t('game:agenda.einbringen')} ({geschaetztePkKosten} PK)
                </button>
              </>
            )}
            {(law.status === 'entwurf' || law.status === 'aktiv' || law.status === 'eingebracht') && (
              <button
                type="button"
                className={styles.btn}
                disabled={!canLobbying}
                title={lobbyingTooltip}
                onClick={() => actions.lobbying(law.id)}
              >
                {t('game:agenda.lobbying')} (12 PK)
              </button>
            )}
            {law.status === 'aktiv' && (
              <button
                type="button"
                className={styles.btn}
                onClick={() => actions.abstimmen(law.id)}
              >
                {t('game:agenda.abstimmen')}
              </button>
            )}
            {law.status === 'bt_passed' && (
              <button
                type="button"
                className={styles.btn}
                onClick={() => actions.setView('bundesrat')}
              >
                {t('game:agenda.bundesratLobbying')}
              </button>
            )}
            {law.status === 'blockiert' && law.blockiert === 'bundesrat' && (
              <>
                {(['eu', 'land', 'kommune'] as RouteType[]).map((route) => {
                  const info = ROUTE_INFO[route];
                  const overrides = law.route_overrides?.[route];
                  const cost = overrides?.cost ?? info.cost;
                  const dur = overrides?.dur ?? info.dur;
                  const canRoute = pk >= cost;
                  return (
                    <button
                      key={route}
                      type="button"
                      className={styles.btn}
                      disabled={!canRoute}
                      onClick={() => actions.startRoute(law.id, route)}
                    >
                      {t(`game:routes.${route}`)} ({cost} PK, {dur} Mo)
                    </button>
                  );
                })}
              </>
            )}
          </div>

          {showVorbereitungModal && (
            <VorbereitungModal law={law} onClose={() => setShowVorbereitungModal(false)} />
          )}
          {showFramingModal && hasFraming && (
            <FramingModal
              law={law}
              onConfirm={(framingKey) => {
                actions.einbringenMitFraming(law.id, framingKey);
                setShowFramingModal(false);
              }}
              onClose={() => setShowFramingModal(false)}
            />
          )}
        </div>
      )}
    </div>
  );
}
