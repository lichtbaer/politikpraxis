import { useTranslation } from 'react-i18next';
import { useGameStore } from '../../store/gameStore';
import { useContentStore } from '../../stores/contentStore';
import { useGameActions } from '../hooks/useGameActions';
import { featureActive } from '../../core/systems/features';
import type { RouteType } from '../../core/types';
import styles from './EbeneView.module.css';

const STAEDTEBUENDNIS_PK = 10;
const KOMMUNAL_KONFERENZ_PK = 8;
const LAENDER_GIPFEL_PK = 12;
const PILOT_BESCHLEUNIGEN_PK = 6;

const FELD_ICONS: Record<string, string> = {
  umwelt_energie: '🌱',
  wirtschaft_finanzen: '📊',
  bildung_forschung: '📚',
  arbeit_soziales: '👷',
  innere_sicherheit: '🛡️',
  gesundheit_pflege: '🏥',
  digital_infrastruktur: '📡',
  landwirtschaft: '🌾',
  umwelt: '🌱',
  wirtschaft: '📊',
  arbeit: '👷',
};

interface EbeneViewProps {
  type: 'eu' | 'land' | 'kommune';
}

const COLOR_VAR: Record<RouteType, string> = {
  eu: 'var(--eu-c)',
  land: 'var(--land-c)',
  kommune: 'var(--kom-c)',
};

export function EbeneView({ type }: EbeneViewProps) {
  const { t } = useTranslation('game');
  const { state, complexity } = useGameStore();
  const content = useContentStore();
  const actions = useGameActions();
  const activeLaws = state.gesetze.filter(
    (g) => g.status === 'ausweich' && g.route === type
  );
  const color = COLOR_VAR[type];
  const eu = state.eu;
  const showEUKlima = type === 'eu' && featureActive(complexity, 'eu_klima');
  const aktiveRoute = eu?.aktiveRoute;
  const politikfelder = content.politikfelder ?? [];

  const hasKommunalPilot = featureActive(complexity, 'kommunal_pilot');
  const hasLaenderPilot = featureActive(complexity, 'laender_pilot');
  const jahr = Math.floor(state.month / 12);
  const kommunalKonferenzVerfuegbar =
    hasKommunalPilot && (state.kommunalKonferenzJahr ?? -1) < jahr;

  const potentialLaws =
    complexity >= 2
      ? state.gesetze.filter((g) => {
          if (g.status !== 'entwurf') return false;
          if (type === 'kommune') return g.kommunal_pilot_moeglich !== false;
          if (type === 'land') return g.laender_pilot_moeglich !== false;
          return false;
        })
      : [];

  const aktiveVorstufe =
    type === 'kommune' || type === 'land'
      ? Object.entries(state.gesetzProjekte ?? {}).find(([, p]) =>
          p.aktiveVorstufen.some(
            (v) => !v.abgeschlossen && v.typ === (type === 'kommune' ? 'kommunal' : 'laender')
          )
        )
      : null;

  const getGesetz = (id: string) => state.gesetze.find((g) => g.id === id);

  return (
    <div className={styles.root}>
      <h1 className={styles.title} style={{ color }}>
        {t(`game:routes.${type}`)}
      </h1>
      <p className={styles.desc}>{t(`game:ebene.${type}`)}</p>

      {showEUKlima && eu?.klima && Object.keys(eu.klima).length > 0 && (
        <div className={styles.euKlimaGrid}>
          <h3 className={styles.euKlimaTitle}>{t('game:eu.klimaTitle')}</h3>
          <div className={styles.euKlimaItems}>
            {(politikfelder.length > 0 ? politikfelder : Object.keys(eu.klima).map((id) => ({ id }))).map(
              (feld) => {
                const klimaVal = eu.klima[feld.id] ?? 50;
                const klimaClass =
                  klimaVal > 60 ? styles.klimaGut : klimaVal > 40 ? styles.klimaMittel : styles.klimaSchlecht;
                return (
                  <div key={feld.id} className={styles.euKlimaItem}>
                    <span className={styles.feldIcon}>{FELD_ICONS[feld.id] ?? '📋'}</span>
                    <div className={styles.euKlimaBar}>
                      <div
                        className={`${styles.euKlimaFill} ${klimaClass}`}
                        style={{ width: `${klimaVal}%` }}
                      />
                    </div>
                    <span className={styles.feldKurz}>
                      {t(`game:politikfeld.${feld.id}`, feld.id)}
                    </span>
                  </div>
                );
              }
            )}
          </div>
        </div>
      )}

      {type === 'kommune' && hasKommunalPilot && (
        <div className={styles.aktionen}>
          <h3 className={styles.aktionenTitle}>Aktionen</h3>
          <div className={styles.aktionenRow}>
            <button
              type="button"
              className={styles.aktionBtn}
              style={{ borderColor: color }}
              disabled={state.pk < STAEDTEBUENDNIS_PK}
              onClick={() => actions.staedtebuendnis()}
            >
              {t('game:ebene.staedtebuendnis')} ({STAEDTEBUENDNIS_PK} PK)
            </button>
            <button
              type="button"
              className={styles.aktionBtn}
              style={{ borderColor: color }}
              disabled={state.pk < KOMMUNAL_KONFERENZ_PK || !kommunalKonferenzVerfuegbar}
              onClick={() => actions.kommunalKonferenz()}
            >
              {t('game:ebene.kommunalKonferenz')} ({KOMMUNAL_KONFERENZ_PK} PK)
            </button>
            {aktiveVorstufe && (
              <button
                type="button"
                className={styles.aktionBtn}
                style={{ borderColor: color }}
                disabled={state.pk < PILOT_BESCHLEUNIGEN_PK}
                onClick={() => actions.pilotBeschleunigen(aktiveVorstufe[0], 'kommunal')}
              >
                {t('game:ebene.pilotBeschleunigen')} ({PILOT_BESCHLEUNIGEN_PK} PK)
              </button>
            )}
          </div>
        </div>
      )}

      {type === 'land' && hasLaenderPilot && (
        <div className={styles.aktionen}>
          <h3 className={styles.aktionenTitle}>Aktionen</h3>
          <div className={styles.aktionenRow}>
            <button
              type="button"
              className={styles.aktionBtn}
              style={{ borderColor: color }}
              disabled={state.pk < LAENDER_GIPFEL_PK}
              onClick={() => actions.laenderGipfel()}
            >
              {t('game:ebene.laenderGipfel')} ({LAENDER_GIPFEL_PK} PK)
            </button>
            {aktiveVorstufe && (
              <button
                type="button"
                className={styles.aktionBtn}
                style={{ borderColor: color }}
                disabled={state.pk < PILOT_BESCHLEUNIGEN_PK}
                onClick={() => actions.pilotBeschleunigen(aktiveVorstufe[0], 'laender')}
              >
                {t('game:ebene.pilotBeschleunigen')} ({PILOT_BESCHLEUNIGEN_PK} PK)
              </button>
            )}
          </div>
        </div>
      )}

      {type === 'eu' && aktiveRoute && (
        <div className={styles.euRouteAktiv}>
          <h3 className={styles.euRouteTitle}>{t('game:eu.aktiveRoute')}</h3>
          <div className={styles.euRouteCard}>
            <span className={styles.euRouteGesetz}>
              {getGesetz(aktiveRoute.gesetzId)?.kurz ?? aktiveRoute.gesetzId}
            </span>
            <div className={styles.euRouteProgress}>
              <div className={styles.progressTrack}>
                <div
                  className={styles.progressFill}
                  style={{
                    width: `${Math.min(100, ((state.month - aktiveRoute.startMonat) / aktiveRoute.dauer) * 100)}%`,
                    backgroundColor: color,
                  }}
                />
              </div>
              <span className={styles.euRouteMonate}>
                {t('game:ebene.monate', {
                  progress: Math.min(aktiveRoute.dauer, state.month - aktiveRoute.startMonat),
                  duration: aktiveRoute.dauer,
                })}
              </span>
            </div>
            <span className={styles.euRouteChance}>
              {t('game:eu.erfolgschance', {
                pct: Math.round(aktiveRoute.erfolgschance * 100),
                  })}
            </span>
            <div className={styles.euRouteActions}>
              <button
                type="button"
                className={styles.euBtn}
                disabled={state.pk < 10}
                onClick={() => actions.euLobbyingRunde(aktiveRoute.gesetzId)}
              >
                {t('game:eu.lobbyingRunde')} (10 PK)
              </button>
              <button
                type="button"
                className={styles.euBtn}
                onClick={() => actions.euKompromissAnbieten(aktiveRoute.gesetzId)}
              >
                {t('game:eu.kompromissAnbieten')}
              </button>
            </div>
          </div>
        </div>
      )}

      {potentialLaws.length > 0 && activeLaws.length === 0 && (
        <div className={styles.potential}>
          <h3 className={styles.potentialTitle}>{t('game:ebene.potentialTitle')}</h3>
          <p className={styles.potentialHint}>{t('game:ebene.potentialHint')}</p>
          <ul className={styles.potentialList}>
            {potentialLaws.slice(0, 8).map((law) => (
              <li key={law.id} className={styles.potentialItem}>
                {law.kurz || law.titel || t(`game:laws.${law.id}.kurz`)}
              </li>
            ))}
          </ul>
        </div>
      )}

      <div className={styles.list}>
        {activeLaws.length === 0 ? (
          potentialLaws.length === 0 ? (
            <p className={styles.empty}>{t('game:ebene.empty')}</p>
          ) : null
        ) : (
          activeLaws.map((law) => {
            const routeProgress =
              type === 'eu' && aktiveRoute?.gesetzId === law.id
                ? Math.min(aktiveRoute.dauer, state.month - aktiveRoute.startMonat)
                : law.rprog;
            const routeDur = type === 'eu' && aktiveRoute?.gesetzId === law.id ? aktiveRoute.dauer : law.rdur;

            return (
              <div key={law.id} className={styles.lawCard}>
                <div className={styles.lawHeader}>
                  <span className={styles.lawTitle}>{law.kurz || law.titel || t(`game:laws.${law.id}.kurz`)}</span>
                  <span className={styles.lawProgress}>
                    {t('game:ebene.monate', { progress: routeProgress, duration: routeDur })}
                  </span>
                </div>
                <div className={styles.progressTrack}>
                  <div
                    className={styles.progressFill}
                    style={{
                      width: `${(routeProgress / routeDur) * 100}%`,
                      backgroundColor: color,
                    }}
                  />
                </div>
              </div>
            );
          })
        )}
      </div>
    </div>
  );
}
