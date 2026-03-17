import { useState } from 'react';
import { useTranslation } from 'react-i18next';
import { useGameStore } from '../../store/gameStore';
import { featureActive } from '../../core/systems/features';
import {
  isLobbyingActive,
  calcBundesratMehrheit,
  getBundesratVoteDetails,
  getBundesratAbstimmungsFelder,
  getAggregierteZustimmung,
} from '../../core/systems/bundesrat';
import type { BundesratFraktion, Law } from '../../core/types';
import { useUIStore } from '../../store/uiStore';
import { LobbyingOverlay } from '../components/LobbyingOverlay/LobbyingOverlay';
import styles from './BundesratView.module.css';

function getBeziehungsFarbe(beziehung: number): string {
  if (beziehung >= 60) return 'var(--green)';
  if (beziehung >= 30) return 'var(--warn)';
  return 'var(--red)';
}

function canLobby(fraktion: BundesratFraktion, state: { month: number }): boolean {
  if (fraktion.beziehung >= 20) return true;
  if (fraktion.reparaturEndMonth != null && state.month >= fraktion.reparaturEndMonth) return true;
  return false;
}

interface FraktionskarteProps {
  fraktion: BundesratFraktion;
  law: Law | null;
  voteDetail: { bereitschaft: number } | null;
  onGespraechSuchen: () => void;
  complexity: number;
}

function Fraktionskarte({ fraktion, law, voteDetail, onGespraechSuchen, complexity }: FraktionskarteProps) {
  const { t } = useTranslation('game');
  const state = useGameStore((s) => s.state);

  const fullView = featureActive(complexity, 'bundesrat_detail');
  const lobbyingActive = law && isLobbyingActive(state, law.id);
  const lobbyGesperrt = !canLobby(fraktion, state);
  const showGespraechBtn = fullView && lobbyingActive && !lobbyGesperrt;

  const bereitschaft = voteDetail?.bereitschaft ?? fraktion.basisBereitschaft;

  return (
    <article className={styles.karte}>
      <div className={styles.karteHeader}>
        <div
          className={styles.avatar}
          style={{
            backgroundColor: `${fraktion.sprecher.color}33`,
            borderColor: fraktion.sprecher.color,
          }}
        >
          {fraktion.sprecher.initials}
        </div>
        <div className={styles.karteMeta}>
          <span className={styles.sprecherName}>{fraktion.sprecher.name}</span>
          <span className={styles.parteiLand}>
            {fraktion.sprecher.partei} · {fraktion.sprecher.land}
          </span>
          <span className={styles.laenderListe}>{fraktion.laender.join(', ')}</span>
        </div>
      </div>
      <div className={styles.beziehungsBalken}>
        <div className={styles.balkenLabel}>
          <span>{t('game:bundesrat.beziehung')}</span>
          <span>{fraktion.beziehung}</span>
        </div>
        <div className={styles.balkenTrack}>
          <div
            className={styles.balkenFill}
            style={{
              width: `${fraktion.beziehung}%`,
              backgroundColor: getBeziehungsFarbe(fraktion.beziehung),
            }}
          />
        </div>
      </div>
      <div className={styles.bereitschaft}>
        <span>{t('game:bundesrat.abstimmungsbereitschaft')}</span>
        <span className={styles.bereitschaftValue}>{bereitschaft}%</span>
      </div>
      {showGespraechBtn && (
        <button type="button" className={styles.btnGespraech} onClick={onGespraechSuchen}>
          {t('game:bundesrat.gespraechSuchen')}
        </button>
      )}
    </article>
  );
}

interface AbstimmungsbalkenProps {
  law: Law;
  felder: { landId: string; fraktionId: string; color: string; stimmtJa: boolean }[];
  ja: number;
  nein: number;
  mehrheit: boolean;
}

function Abstimmungsbalken({ law, felder, ja, nein, mehrheit }: AbstimmungsbalkenProps) {
  const { t } = useTranslation('game');
  const fraktionen = useGameStore((s) => s.state.bundesratFraktionen);
  const showToast = useUIStore((s) => s.showToast);

  const handleFeldClick = (fraktionId: string) => {
    const f = fraktionen.find((x) => x.id === fraktionId);
    if (f) showToast(`${t(`game:bundesratFraktionen.${f.id}.name`)}: ${f.sprecher.name} (${f.sprecher.partei})`);
  };

  return (
    <div className={styles.abstimmungsBalken}>
      <div className={styles.abstimmungsHeader}>
        <span className={styles.abstimmungsLaw}>{law.kurz || law.titel || t(`game:laws.${law.id}.kurz`)}</span>
        <span className={styles.abstimmungsErgebnis}>
          {t('game:bundesrat.jaNein', { ja, nein, mehrheit: mehrheit ? t('game:bundesrat.mehrheitJa') : t('game:bundesrat.mehrheitNein') })}
        </span>
      </div>
      <div className={styles.felderContainer}>
        {felder.map((f, i) => (
          <button
            key={`${f.landId}-${i}`}
            type="button"
            className={`${styles.feld} ${f.stimmtJa ? styles.feldJa : styles.feldNein}`}
            style={{
              backgroundColor: f.stimmtJa ? f.color : `${f.color}44`,
              borderColor: f.color,
            }}
            onClick={() => handleFeldClick(f.fraktionId)}
            title={`${f.landId}: ${f.stimmtJa ? 'Ja' : 'Nein'}`}
          />
        ))}
        <div className={styles.mehrheitsLinie} title={t('game:bundesrat.mehrheitTitle')} />
      </div>
      <span className={styles.mehrheitsLabel}>{t('game:bundesrat.mehrheitBei')}</span>
    </div>
  );
}

/** SMA-291: Stufe 2 — aggregierter Zustimmungsbalken, keine Fraktions-Details */
function BundesratSimple({
  prozent,
  law,
  mehrheit,
}: {
  prozent: number;
  law: Law | null;
  mehrheit: boolean;
}) {
  const { t } = useTranslation('game');
  return (
    <section className={styles.bundesratSimple}>
      <h2 className={styles.title}>{t('game:bundesrat.title')}</h2>
      <p className={styles.subtitle}>{t('game:bundesrat.subtitleSimple')}</p>
      {law ? (
        <>
          <div className={styles.aggregierterBalken}>
            <div className={styles.balkenTrack}>
              <div
                className={styles.balkenFill}
                style={{
                  width: `${prozent}%`,
                  backgroundColor: mehrheit ? 'var(--green)' : 'var(--red)',
                }}
              />
            </div>
            <p className={styles.aggregiertText}>
              {t('game:bundesrat.aggregiertUnterstuetzen', { prozent })}
            </p>
          </div>
        </>
      ) : (
        <p className={styles.keineAbstimmung}>{t('game:bundesrat.keineAbstimmung')}</p>
      )}
    </section>
  );
}

export function BundesratView() {
  const { t } = useTranslation('game');
  const state = useGameStore((s) => s.state);
  const complexity = useGameStore((s) => s.complexity);
  const [lobbyingFraktion, setLobbyingFraktion] = useState<BundesratFraktion | null>(null);

  if (!featureActive(complexity, 'bundesrat_sichtbar')) return null;

  const activeLaws = state.gesetze.filter(
    (g) => g.status === 'bt_passed' && isLobbyingActive(state, g.id),
  );
  const displayLaw =
    activeLaws[0] ?? state.gesetze.find((g) => g.status === 'bt_passed' && g.brVoteMonth);

  if (!featureActive(complexity, 'bundesrat_detail')) {
    const prozent = displayLaw ? getAggregierteZustimmung(state, displayLaw.id) : 0;
    const { mehrheit } = displayLaw ? calcBundesratMehrheit(state, displayLaw.id) : { mehrheit: false };
    return (
      <BundesratSimple prozent={prozent} law={displayLaw ?? null} mehrheit={mehrheit} />
    );
  }

  const voteDetails = displayLaw
    ? getBundesratVoteDetails(state, displayLaw.id)
    : [];
  const felder = displayLaw ? getBundesratAbstimmungsFelder(state, displayLaw.id) : [];

  const voteDetailMap = Object.fromEntries(
    voteDetails.map((d) => [d.fraktionId, { bereitschaft: d.bereitschaft }]),
  );

  return (
    <div className={styles.container}>
      <div className={styles.header}>
        <h2 className={styles.title}>{t('game:bundesrat.title')}</h2>
        <p className={styles.subtitle}>
          {t('game:bundesrat.subtitle')}
        </p>
      </div>

      <section className={styles.fraktionskarten}>
        {state.bundesratFraktionen.map((f) => (
          <Fraktionskarte
            key={f.id}
            fraktion={f}
            law={displayLaw ?? null}
            voteDetail={voteDetailMap[f.id] ?? null}
            onGespraechSuchen={() => setLobbyingFraktion(f)}
            complexity={complexity}
          />
        ))}
      </section>

      {displayLaw && (() => {
        const { ja, nein, mehrheit } = calcBundesratMehrheit(state, displayLaw.id);
        return (
          <section className={styles.abstimmung}>
            <Abstimmungsbalken
              law={displayLaw}
              felder={felder}
              ja={ja}
              nein={nein}
              mehrheit={mehrheit}
            />
          </section>
        );
      })()}

      {!displayLaw && (
        <p className={styles.keineAbstimmung}>
          {t('game:bundesrat.keineAbstimmung')}
        </p>
      )}

      {lobbyingFraktion && displayLaw && (
        <LobbyingOverlay
          fraktion={lobbyingFraktion}
          law={displayLaw}
          onClose={() => setLobbyingFraktion(null)}
        />
      )}
    </div>
  );
}
