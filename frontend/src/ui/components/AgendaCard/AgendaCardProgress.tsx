import { useTranslation } from 'react-i18next';
import { featureActive } from '../../../core/systems/features';
import { Hourglass } from '../../icons';
import { Erklaerung } from '../Erklaerung/Erklaerung';
import { KPI_TO_BEGRIFF } from '../../../constants/begriffe';
import { VorstufeBadge } from '../VorstufeBadge/VorstufeBadge';
import type { Law, GesetzProjekt } from '../../../core/types';
import type { PendingEffect } from '../../../core/types';
import styles from './AgendaCard.module.css';

interface AgendaCardProgressProps {
  law: Law;
  state: {
    month: number;
    pending: PendingEffect[];
    eingebrachteGesetze?: Array<{ gesetzId: string; abstimmungMonat: number; eingebrachtMonat: number; lagMonths: number }>;
    gekoppelteGesetze?: Record<string, string[]>;
  };
  complexity: number;
  projekt: GesetzProjekt | undefined;
  boni: { btStimmenBonus: number; pkKostenRabatt: number };
  actions: {
    abbrechenVorstufe: (lawId: string, typ: 'kommunal' | 'laender' | 'eu') => void;
  };
  getGesetzTitel: (id: string) => string;
}

export function AgendaCardProgress({ law, state, complexity, projekt, boni, actions, getGesetzTitel }: AgendaCardProgressProps) {
  const { t } = useTranslation(['common', 'game']);
  const hasVorstufen = featureActive(complexity, 'kommunal_pilot') || featureActive(complexity, 'laender_pilot') || featureActive(complexity, 'eu_route');

  const eingebrachtInfo = state.eingebrachteGesetze?.find((e) => e.gesetzId === law.id);
  const monateNoch = eingebrachtInfo ? Math.max(0, eingebrachtInfo.abstimmungMonat - state.month) : 0;
  const fortschritt = eingebrachtInfo
    ? Math.min(eingebrachtInfo.lagMonths, state.month - eingebrachtInfo.eingebrachtMonat)
    : 0;

  const total = law.ja + law.nein;
  const pct = total > 0 ? Math.round((law.ja / total) * 100) : 0;
  const effectivePct = Math.min(95, pct + boni.btStimmenBonus);

  return (
    <>
      {(law.status === 'entwurf' || law.status === 'aktiv' || law.status === 'eingebracht') && (
        <div className={styles.voteBar}>
          <div className={styles.voteTrack}>
            <div className={styles.voteFill} style={{ width: `${pct}%` }} />
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
            <div className={styles.progressFill} style={{ width: `${(law.rprog / law.rdur) * 100}%` }} />
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
              style={{ width: `${(fortschritt / eingebrachtInfo.lagMonths) * 100}%` }}
            />
          </div>
          <span className={styles.progressLabel}>
            {t('game:agenda.ausschussphaseIn', { months: monateNoch })}
          </span>
          <span className={styles.progressLabel}>
            {t('game:agenda.ausschussphaseProgress', { progress: fortschritt, total: eingebrachtInfo.lagMonths })}
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

      {law.status === 'beschlossen' && (() => {
        const lawPending = state.pending.filter(pe => pe.label === law.kurz);
        if (lawPending.length === 0) return null;
        const KPI_LABELS: Record<string, string> = { al: 'AL', hh: 'HH', gi: 'GI', zf: 'ZF', mk: 'MK' };
        return (
          <div className={styles.pendingEffects}>
            {lawPending.map((pe, i) => {
              const monthsLeft = Math.max(0, pe.month - state.month);
              const begriff = KPI_TO_BEGRIFF[pe.key];
              return (
                <span key={i} className={styles.pendingBadge}>
                  <Hourglass size={14} />{' '}
                  {begriff ? (
                    <Erklaerung begriff={begriff} kinder={KPI_LABELS[pe.key] ?? pe.key} inline={false} />
                  ) : (
                    KPI_LABELS[pe.key] ?? pe.key
                  )}{' '}
                  {pe.delta > 0 ? '+' : ''}{pe.delta.toFixed(1)} in {monthsLeft} Mo.
                </span>
              );
            })}
          </div>
        );
      })()}

      {/* Kopplungs-Hinweis */}
      {(() => {
        const gekoppelt = state.gekoppelteGesetze?.[law.id];
        return gekoppelt && gekoppelt.length > 0 ? (
        <span className={styles.kopplungsHinweis}>
          🔗 {t('game:gesetz.wartetAuf', {
            gesetz: gekoppelt.map((id) => getGesetzTitel(id)).join(', '),
            defaultValue: `Wartet auf: ${gekoppelt.map((id) => getGesetzTitel(id)).join(', ')}`,
          })}
        </span>
        ) : null;
      })()}
    </>
  );
}
