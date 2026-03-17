import { useTranslation } from 'react-i18next';
import { useGameStore } from '../../../store/gameStore';
import { useGameActions } from '../../hooks/useGameActions';
import { ROUTE_INFO } from '../../../core/systems/levels';
import { gesetzKongruenz } from '../../../core/ideologie';
import { featureActive } from '../../../core/systems/features';
import type { Law, LawStatus, RouteType } from '../../../core/types';
import styles from './AgendaCard.module.css';

interface AgendaCardProps {
  law: Law;
}

const STATUS_KEYS: Record<LawStatus, string> = {
  entwurf: 'game.status.entwurf',
  aktiv: 'game.status.aktiv',
  bt_passed: 'game.status.bt_passed',
  blockiert: 'game.status.blockiert',
  beschlossen: 'game.status.beschlossen',
  ausweich: 'game.status.ausweich',
};

const STATUS_CLASS: Record<LawStatus, string> = {
  entwurf: styles.statusEntwurf,
  aktiv: styles.statusAktiv,
  bt_passed: styles.statusAktiv,
  blockiert: styles.statusBlockiert,
  beschlossen: styles.statusBeschlossen,
  ausweich: styles.statusAusweich,
};

export function AgendaCard({ law }: AgendaCardProps) {
  const { t } = useTranslation(['common', 'game']);
  const { state, complexity, ausrichtung } = useGameStore();
  const actions = useGameActions();
  const expanded = law.expanded;
  const pk = state.pk;

  const kongruenz = gesetzKongruenz(ausrichtung, law);

  const handleHeaderClick = () => actions.toggleAgenda(law.id);

  const canEinbringen = law.status === 'entwurf' && pk >= 20;
  const canLobbying = (law.status === 'entwurf' || law.status === 'aktiv') && pk >= 12;

  const total = law.ja + law.nein;
  const pct = total > 0 ? Math.round((law.ja / total) * 100) : 0;

  return (
    <div className={styles.card}>
      <header className={styles.header} onClick={handleHeaderClick}>
        <span className={`${styles.badge} ${STATUS_CLASS[law.status]}`}>
          {t(STATUS_KEYS[law.status], { ns: 'common' })}
        </span>
        <h3 className={styles.title}>{t(`game:laws.${law.id}.titel`)}</h3>
        <span className={styles.arrow}>{expanded ? '▲' : '▼'}</span>
      </header>

      {expanded && (
        <div className={styles.body}>
          <p className={styles.desc}>{t(`game:laws.${law.id}.desc`)}</p>

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

          {(law.status === 'entwurf' || law.status === 'aktiv') && (
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

          {law.status === 'bt_passed' && law.brVoteMonth != null && (
            <div className={styles.progressBar}>
              <span className={styles.progressLabel}>
                {t('game:agenda.brVoteIn', { months: law.brVoteMonth - state.month })}
              </span>
            </div>
          )}

          <div className={styles.actions}>
            {law.status === 'entwurf' && (
              <button
                type="button"
                className={styles.btn}
                disabled={!canEinbringen}
                onClick={() => actions.einbringen(law.id)}
              >
                {t('game:agenda.einbringen')}
              </button>
            )}
            {(law.status === 'entwurf' || law.status === 'aktiv') && (
              <button
                type="button"
                className={styles.btn}
                disabled={!canLobbying}
                onClick={() => actions.lobbying(law.id)}
              >
                {t('game:agenda.lobbying')}
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
                  const canRoute = pk >= info.cost;
                  return (
                    <button
                      key={route}
                      type="button"
                      className={styles.btn}
                      disabled={!canRoute}
                      onClick={() => actions.startRoute(law.id, route)}
                    >
                      {t(`game:routes.${route}`)} ({info.cost} PK, {info.dur} Mo)
                    </button>
                  );
                })}
              </>
            )}
          </div>
        </div>
      )}
    </div>
  );
}
