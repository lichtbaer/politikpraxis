import { useState } from 'react';
import { useTranslation } from 'react-i18next';
import { useGameStore } from '../../store/gameStore';
import { getKoalitionspartner } from '../../core/systems/koalition';
import { PolitikfeldGrid } from '../components/PolitikfeldGrid/PolitikfeldGrid';
import { ProgressBar } from '../components/ProgressBar/ProgressBar';
import type { ContentBundle } from '../../core/types';
import styles from './HaushaltsdebatteScreen.module.css';

/** Gesetz-ID → Politikfeld-ID für Partner-Forderung */
const SCHLUESSELTHEMA_TO_FELD: Record<string, string> = {
  ee: 'umwelt_energie',
  bp: 'bildung_forschung',
  wb: 'arbeit_soziales',
  sr: 'wirtschaft_finanzen',
};

function getPartnerHaushaltsfeld(
  content: ContentBundle,
  state?: Pick<import('../../core/types').GameState, 'koalitionspartner' | 'spielerPartei'>,
): string | null {
  const partner = getKoalitionspartner(content, state);
  const first = partner.schluesselthemen?.[0];
  return first ? (SCHLUESSELTHEMA_TO_FELD[first] ?? first) : null;
}

function LehmannAvatar({ quote }: { quote: string }) {
  const lehmann = useGameStore((s) => s.state.chars.find((c) => c.id === 'fm'));
  if (!lehmann) return null;
  return (
    <div className={styles.avatar}>
      <div
        className={styles.avatarCircle}
        style={{ backgroundColor: lehmann.color }}
      >
        {lehmann.initials}
      </div>
      <blockquote className={styles.quote}>„{quote}"</blockquote>
    </div>
  );
}

const LEHMANN_QUOTES: Record<string, string> = {
  ueberschuss: 'Der Haushalt ist solide. Wir haben Spielraum für Investitionen.',
  ausgeglichen: 'Ausgeglichener Haushalt — aber kein Raum für Experimente.',
  defizit: 'Das Defizit ist besorgniserregend. Jede Ausgabe muss gerechtfertigt werden.',
};

function HaushaltsGrafik({
  einnahmen,
  pflichtausgaben,
  laufendeAusgaben,
}: {
  einnahmen: number;
  pflichtausgaben: number;
  laufendeAusgaben: number;
}) {
  const gesamt = einnahmen;
  const pflPct = gesamt > 0 ? (pflichtausgaben / gesamt) * 100 : 0;
  const laufPct = gesamt > 0 ? (laufendeAusgaben / gesamt) * 100 : 0;

  return (
    <div className={styles.grafik}>
      <div className={styles.grafikBar}>
        <div
          className={styles.grafikFillEinnahmen}
          style={{ width: '100%' }}
        />
      </div>
      <div className={styles.grafikLegende}>
        <span>Einnahmen: {einnahmen} Mrd.</span>
      </div>
      <div className={styles.grafikBar}>
        <div
          className={styles.grafikFillPflicht}
          style={{ width: `${pflPct}%` }}
        />
        <div
          className={styles.grafikFillLaufend}
          style={{ width: `${laufPct}%` }}
        />
      </div>
      <div className={styles.grafikLegende}>
        <span>Pflicht: {pflichtausgaben} Mrd.</span>
        <span>Gesetze: {laufendeAusgaben.toFixed(1)} Mrd.</span>
      </div>
    </div>
  );
}

function HaushaltsAbstimmungsResult({ stimmen }: { stimmen: number }) {
  const { t } = useTranslation('game');
  const pct = Math.min(100, Math.max(0, 50 + stimmen));
  const color = pct >= 50 ? 'var(--green)' : 'var(--red)';

  return (
    <div className={styles.abstimmung}>
      <ProgressBar
        label={t('haushaltsdebatte.abstimmungLabel')}
        progress={pct / 100}
        color={color}
        detail={`${Math.round(pct)}%`}
      />
    </div>
  );
}

export function HaushaltsdebatteScreen() {
  const { t } = useTranslation('game');
  const { state, content, complexity } = useGameStore();
  const ev = state.aktivesStrukturEvent;
  const haushalt = state.haushalt;

  const [prioritaeten, setPrioritaeten] = useState<string[]>([]);

  const doPrioritaeten = useGameStore((s) => s.doHaushaltsdebattePrioritaeten);
  const doNext = useGameStore((s) => s.doHaushaltsdebatteNext);
  const doSchliessen = useGameStore((s) => s.doHaushaltsdebatteSchliessen);

  if (!ev || ev.type !== 'haushaltsdebatte' || !haushalt) return null;

  const jahr = 2025 + Math.floor((state.month - 1) / 12);
  const partnerFeld = getPartnerHaushaltsfeld(content, state);
  const partnerFeldGewaehlt = partnerFeld ? ev.gewaehlePrioritaeten.includes(partnerFeld) : true;
  const felder = ev.verfuegbarePrioritaeten.map((id) => ({ id }));

  const handlePrioritaetenBestätigen = () => {
    if (prioritaeten.length === 2) {
      doPrioritaeten(prioritaeten);
      setPrioritaeten([]);
      doNext();
    }
  };

  const handleBeat3Weiter = () => {
    doNext();
  };

  const berechneStimmen = () => {
    const basis = 45;
    const bonus = ev.gewaehlePrioritaeten.length * 5;
    const partnerBonus = partnerFeldGewaehlt ? 8 : 0;
    return basis + bonus + partnerBonus + (state.koalitionspartner?.beziehung ?? 0) * 0.1;
  };

  return (
    <div className={styles.overlay}>
      <div className={styles.modal}>
        {ev.phase === 1 && (
          <div className={styles.beat}>
            <h2 className={styles.title}>
              {t('haushaltsdebatte.entwurfTitle', { jahr })}
            </h2>
            <LehmannAvatar quote={LEHMANN_QUOTES[ev.ausgangslage]} />
            {complexity >= 3 && (
              <HaushaltsGrafik
                einnahmen={haushalt.einnahmen}
                pflichtausgaben={haushalt.pflichtausgaben}
                laufendeAusgaben={haushalt.laufendeAusgaben}
              />
            )}
            <div className={styles.saldoKurz}>
              {t('haushalt.saldo')}: {haushalt.saldo > 0 ? '+' : ''}
              {haushalt.saldo.toFixed(1)} Mrd.
            </div>
            <button type="button" className={styles.btn} onClick={doNext}>
              {t('haushaltsdebatte.weiter')}
            </button>
          </div>
        )}

        {ev.phase === 2 && (
          <div className={styles.beat}>
            <h2 className={styles.title}>{t('haushaltsdebatte.prioritaetenTitle')}</h2>
            <p className={styles.desc}>{t('haushaltsdebatte.prioritaetenDesc')}</p>
            <PolitikfeldGrid
              selectable={2}
              onSelect={setPrioritaeten}
              selectedIds={prioritaeten}
              druckScores={state.politikfeldDruck ?? {}}
              felder={felder}
            />
            <button
              type="button"
              className={styles.btn}
              disabled={prioritaeten.length < 2}
              onClick={handlePrioritaetenBestätigen}
            >
              {t('haushaltsdebatte.bestaetigen')}
            </button>
          </div>
        )}

        {ev.phase === 3 && (
          <div className={styles.beat}>
            <h2 className={styles.title}>{t('haushaltsdebatte.koalitionTitle')}</h2>
            <div className={styles.koalitionPanel}>
              <p>
                {partnerFeld
                  ? t('haushaltsdebatte.partnerForderung', {
                      feld: t(`game:politikfeld.${partnerFeld}`, partnerFeld),
                    })
                  : t('haushaltsdebatte.partnerKeineForderung')}
              </p>
              <p className={styles.hinweis}>
                {partnerFeldGewaehlt
                  ? t('haushaltsdebatte.forderungErfuelllt')
                  : t('haushaltsdebatte.forderungNichtErfuelllt')}
              </p>
            </div>
            <button type="button" className={styles.btn} onClick={handleBeat3Weiter}>
              {partnerFeldGewaehlt
                ? t('haushaltsdebatte.forderungErfuellltBtn')
                : t('haushaltsdebatte.weiterOhneZugestaendnis')}
            </button>
          </div>
        )}

        {ev.phase === 4 && (
          <div className={styles.beat}>
            <h2 className={styles.title}>{t('haushaltsdebatte.abstimmungTitle')}</h2>
            <HaushaltsAbstimmungsResult stimmen={berechneStimmen()} />
            <button type="button" className={styles.btn} onClick={doSchliessen}>
              {t('haushaltsdebatte.insKanzleramt')}
            </button>
          </div>
        )}
      </div>
    </div>
  );
}
