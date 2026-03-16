import { useGameStore } from '../../../store/gameStore';
import { useGameActions } from '../../hooks/useGameActions';
import { routeLabel, ROUTE_INFO } from '../../../core/systems/levels';
import type { Law, LawStatus, RouteType } from '../../../core/types';
import styles from './AgendaCard.module.css';

interface AgendaCardProps {
  law: Law;
}

const STATUS_LABELS: Record<LawStatus, string> = {
  entwurf: 'Entwurf',
  aktiv: 'Aktiv',
  blockiert: 'Blockiert',
  beschlossen: 'Beschlossen',
  ausweich: 'Ausweichroute',
};

const STATUS_CLASS: Record<LawStatus, string> = {
  entwurf: styles.statusEntwurf,
  aktiv: styles.statusAktiv,
  blockiert: styles.statusBlockiert,
  beschlossen: styles.statusBeschlossen,
  ausweich: styles.statusAusweich,
};

const TAG_LABELS: Record<string, string> = {
  bund: 'Bund',
  eu: 'EU',
  land: 'Land',
  kommune: 'Kommune',
};

export function AgendaCard({ law }: AgendaCardProps) {
  const { state } = useGameStore();
  const actions = useGameActions();
  const expanded = law.expanded;
  const pk = state.pk;

  const handleHeaderClick = () => actions.toggleAgenda(law.id);

  const canEinbringen = law.status === 'entwurf' && pk >= 20;
  const canLobbying = (law.status === 'entwurf' || law.status === 'aktiv') && pk >= 12;

  const total = law.ja + law.nein;
  const pct = total > 0 ? Math.round((law.ja / total) * 100) : 0;

  return (
    <div className={styles.card}>
      <header className={styles.header} onClick={handleHeaderClick}>
        <span className={`${styles.badge} ${STATUS_CLASS[law.status]}`}>
          {STATUS_LABELS[law.status]}
        </span>
        <h3 className={styles.title}>{law.titel}</h3>
        <span className={styles.arrow}>{expanded ? '▲' : '▼'}</span>
      </header>

      {expanded && (
        <div className={styles.body}>
          <p className={styles.desc}>{law.desc}</p>

          <div className={styles.tags}>
            {law.tags.map((tag) => (
              <span key={tag} className={styles.tag}>
                {TAG_LABELS[tag] ?? tag}
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
                {routeLabel(law.route)}: {law.rprog}/{law.rdur} Monate
              </span>
            </div>
          )}

          {law.status === 'blockiert' && law.blockiert && (
            <div className={styles.blockiertPanel}>
              Blockiert durch: {law.blockiert === 'bundestag' ? 'Bundestag' : 'Bundesrat'}
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
                Einbringen (20 PK)
              </button>
            )}
            {(law.status === 'entwurf' || law.status === 'aktiv') && (
              <button
                type="button"
                className={styles.btn}
                disabled={!canLobbying}
                onClick={() => actions.lobbying(law.id)}
              >
                Lobbying (12 PK)
              </button>
            )}
            {law.status === 'aktiv' && (
              <button
                type="button"
                className={styles.btn}
                onClick={() => actions.abstimmen(law.id)}
              >
                Abstimmung ansetzen
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
                      {routeLabel(route)} ({info.cost} PK, {info.dur} Mo)
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
