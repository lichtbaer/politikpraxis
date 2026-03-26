/**
 * SMA-343: Vollständige Legislatur-Auswertung (6 Blöcke + Opt-In + Aktionen)
 */
import { useCallback, useEffect, useRef, useState } from 'react';
import { useTranslation } from 'react-i18next';
import { useNavigate } from 'react-router-dom';
import {
  berechneLegislaturBewertung,
  berechneMilieuBilanz,
  berechneTitel,
  berechneTop3Gesetze,
  berechneTopPolitikfeld,
} from '../../core/auswertung';
import { getKoalitionspartner } from '../../core/systems/koalition';
import { useGameStore } from '../../store/gameStore';
import { useAuthStore } from '../../store/authStore';
import { useContentStore } from '../../store/contentStore';
import type { Milieu } from '../../core/types';
import { BewertungRadarChart } from '../components/BewertungRadarChart/BewertungRadarChart';

const EMPTY_MILIEUS: Milieu[] = [];
import { fetchCommunityStats, getOrCreateStatsSessionId, postGameStats } from '../../services/stats';
import { useUIStore } from '../../store/uiStore';
import { PLAYTEST_CONFIG } from '../../config/playtest';
import { UserTestFeedbackModal } from '../components/UserTestFeedbackModal/UserTestFeedbackModal';
import styles from './SpielauswertungScreen.module.css';

type Props = {
  wahlergebnis: number;
  gewonnen: boolean;
  threshold: number;
};

export function SpielauswertungScreen({ wahlergebnis, gewonnen, threshold }: Props) {
  const { t } = useTranslation(['game', 'common']);
  const { state, complexity, spielerPartei, content } = useGameStore();
  const isLoggedIn = useAuthStore((s) => s.isLoggedIn);
  const accessToken = useAuthStore((s) => s.accessToken);
  const milieus = useContentStore((s) => s.milieus ?? EMPTY_MILIEUS);
  const navigate = useNavigate();
  const showToast = useUIStore((s) => s.showToast);

  const [optIn, setOptIn] = useState(false);
  const [showFeedbackModal, setShowFeedbackModal] = useState(false);
  const [gameStatId, setGameStatId] = useState<string | null>(null);
  const submittedRef = useRef(false);
  const [community, setCommunity] = useState<Awaited<ReturnType<typeof fetchCommunityStats>> | null>(
    null,
  );

  const bewertung = berechneLegislaturBewertung(state);
  const titel = berechneTitel(state);
  const top3 = berechneTop3Gesetze(state);
  const topPf = berechneTopPolitikfeld(state);

  const milieuLabel = useCallback(
    (id: string) => {
      const m = milieus.find((x) => x.id === id);
      return m ? t(`game:milieu.${id}`, m.kurz ?? id) : id;
    },
    [milieus, t],
  );
  const { gewinner, verlierer } = berechneMilieuBilanz(state, milieuLabel);

  const beschlossen = state.gesetze.filter((g) => g.status === 'beschlossen').length;
  /** Am BT gescheitert (blockiert) */
  const gescheitert = state.gesetze.filter(
    (g) => g.status === 'blockiert' && g.blockiert === 'bundestag',
  ).length;
  const koalBruch = state.firedEvents?.includes('koalitionsbruch') ?? false;
  const saldo = state.haushalt?.saldo ?? 0;
  const saldoStart = -20;
  const konjunkturHistory = state.haushaltSaldoHistory ?? [];

  const buildPayload = useCallback(() => {
    const partei = spielerPartei?.id ?? 'sdp';
    return {
      session_id: getOrCreateStatsSessionId(),
      partei,
      complexity,
      gewonnen,
      wahlprognose: Math.round(wahlergebnis * 10) / 10,
      monate_gespielt: state.month,
      gesetze_beschlossen: beschlossen,
      gesetze_gescheitert: gescheitert,
      koalitionsbruch: koalBruch,
      saldo_final: saldo,
      gini_final: state.kpi.gi,
      arbeitslosigkeit_final: state.kpi.al,
      medienklima_final: Math.round(state.medienKlima ?? 50),
      skandale_gesamt: state.skandaleGesamt ?? 0,
      pk_verbraucht: state.pkVerbrauchtGesamt ?? 0,
      top_politikfeld: topPf,
      bewertung_gesamt: bewertung.gesamtnote,
      titel,
    };
  }, [
    beschlossen,
    bewertung.gesamtnote,
    complexity,
    gescheitert,
    gewonnen,
    koalBruch,
    saldo,
    spielerPartei?.id,
    state.kpi.al,
    state.kpi.gi,
    state.medienKlima,
    state.month,
    state.pkVerbrauchtGesamt,
    state.skandaleGesamt,
    titel,
    topPf,
    wahlergebnis,
  ]);

  const sendStatsOnce = useCallback(async () => {
    if (submittedRef.current) return true;
    submittedRef.current = true;
    try {
      const result = await postGameStats({ ...buildPayload(), opt_in_community: optIn }, accessToken);
      setGameStatId(result.id ?? null);
      return true;
    } catch (e) {
      submittedRef.current = false;
      showToast(
        t('common:stats.submitError', 'Statistik konnte nicht gesendet werden.'),
        'warning',
      );
      console.warn(e);
      return false;
    }
  }, [accessToken, buildPayload, optIn, showToast, t]);

  useEffect(() => {
    if (!optIn) return;
    let cancelled = false;
    void (async () => {
      try {
        const c = await fetchCommunityStats();
        if (!cancelled) setCommunity(c);
      } catch {
        if (!cancelled) setCommunity(null);
      }
    })();
    return () => {
      cancelled = true;
    };
  }, [optIn]);

  const handleNeuesSpiel = async () => {
    await sendStatsOnce();
    window.location.reload();
  };

  const handleNochmalPartei = async () => {
    await sendStatsOnce();
    navigate('/setup');
  };

  const handleSaveAuswertung = async () => {
    const ok = await sendStatsOnce();
    if (ok) {
      showToast(t('common:stats.savedHint', 'Auswertung wurde übermittelt.'), 'success');
    }
  };

  const partnerName = getKoalitionspartner(content, state)?.name ?? '—';
  const maxBar = Math.max(1, ...konjunkturHistory.map((x) => Math.abs(x)));

  return (
    <div className={styles.wrap}>
      <div className={styles.block}>
        <div className={styles.grade}>{bewertung.gesamtnote}</div>
        <div className={styles.titel}>{titel}</div>
        <p className={styles.muted}>
          {t('game:auswertung.noteHint', 'Note aus fünf Dimensionen (Demokratie, Wirtschaft, …).')}
        </p>
        <BewertungRadarChart dimensionen={bewertung.dimensionen} />
        <div className={styles.dimGrid}>
          {(
            [
              ['demokratie', bewertung.dimensionen.demokratie],
              ['wirtschaft', bewertung.dimensionen.wirtschaft],
              ['gesellschaft', bewertung.dimensionen.gesellschaft],
              ['kommunikation', bewertung.dimensionen.kommunikation],
              ['effizienz', bewertung.dimensionen.effizienz],
            ] as const
          ).map(([key, val]) => (
            <div key={key} className={styles.dimItem}>
              {t(`game:auswertung.dim.${key}`, key)}: {val}
            </div>
          ))}
        </div>
      </div>

      <div className={styles.block}>
        <h3>{t('game:auswertung.blockWahl', 'Wahlergebnis')}</h3>
        <p>
          {gewonnen
            ? t('game:auswertung.wonLine', {
                pct: wahlergebnis.toFixed(1),
                threshold,
                partei: spielerPartei?.kuerzel ?? '—',
              })
            : t('game:auswertung.lostLine', {
                pct: wahlergebnis.toFixed(1),
                threshold,
                partei: spielerPartei?.kuerzel ?? '—',
              })}
        </p>
        <p className={styles.muted}>
          {t('game:auswertung.koalition', 'Koalition: {{partner}}', { partner: partnerName })}
        </p>
      </div>

      <div className={styles.block}>
        <h3>{t('game:auswertung.blockBilanz', 'Regierungsbilanz')}</h3>
        <div className={styles.grid2}>
          <span>{t('game:auswertung.beschlossen', 'Gesetze beschlossen')}</span>
          <strong>{beschlossen}</strong>
          <span>{t('game:auswertung.gescheitert', 'Gesetze gescheitert')}</span>
          <strong>{gescheitert}</strong>
          <span>{t('game:auswertung.pk', 'PK verbraucht (geschätzt)')}</span>
          <strong>{state.pkVerbrauchtGesamt ?? 0}</strong>
          <span>{t('game:auswertung.koalBruch', 'Koalitionsbruch-Ereignis')}</span>
          <strong>{koalBruch ? t('common:yes', 'Ja') : t('common:no', 'Nein')}</strong>
          <span>{t('game:auswertung.skandale', 'Medien-Skandale')}</span>
          <strong>{state.skandaleGesamt ?? 0}</strong>
        </div>
      </div>

      <div className={styles.block}>
        <h3>{t('game:auswertung.blockWirtschaft', 'Wirtschaft & Haushalt')}</h3>
        <div className={styles.grid2}>
          <span>{t('game:auswertung.saldoStart', 'Saldo zu Beginn (Beispiel)')}</span>
          <strong>{saldoStart} Mrd. €</strong>
          <span>{t('game:auswertung.saldoEnde', 'Saldo am Ende')}</span>
          <strong>{saldo.toFixed(1)} Mrd. €</strong>
          <span>{t('game:auswertung.al', 'Arbeitslosigkeit')}</span>
          <strong>{state.kpi.al.toFixed(1)}%</strong>
          <span>{t('game:auswertung.gini', 'Gini')}</span>
          <strong>{state.kpi.gi.toFixed(1)}</strong>
        </div>
        {konjunkturHistory.length > 0 && (
          <div>
            <p className={styles.muted}>{t('game:auswertung.konjunktur', 'Haushalt-Saldo-Verlauf')}</p>
            <div className={styles.chartRow} aria-hidden>
              {konjunkturHistory.slice(-24).map((v, i) => (
                <div
                  key={i}
                  className={styles.bar}
                  style={{ height: `${(Math.abs(v) / maxBar) * 100}%` }}
                />
              ))}
            </div>
          </div>
        )}
      </div>

      <div className={styles.block}>
        <h3>{t('game:auswertung.blockMilieu', 'Milieus — Gewinner & Verlierer')}</h3>
        <p className={styles.muted}>{t('game:auswertung.milieuHint', 'Zustimmung vs. Legislaturbeginn')}</p>
        <p>
          <strong>{t('game:auswertung.gewinner', 'Gewinner')}</strong>
        </p>
        <ul className={styles.list}>
          {gewinner.length === 0 ? (
            <li>—</li>
          ) : (
            gewinner.map((r) => (
              <li key={r.milieuId}>
                {r.label}: {r.start} → {r.ende} ({r.delta > 0 ? '+' : ''}
                {r.delta})
              </li>
            ))
          )}
        </ul>
        <p>
          <strong>{t('game:auswertung.verlierer', 'Verlierer')}</strong>
        </p>
        <ul className={styles.list}>
          {verlierer.length === 0 ? (
            <li>—</li>
          ) : (
            verlierer.map((r) => (
              <li key={r.milieuId}>
                {r.label}: {r.start} → {r.ende} ({r.delta})
              </li>
            ))
          )}
        </ul>
      </div>

      <div className={styles.block}>
        <h3>{t('game:auswertung.blockTopGesetze', 'Prägende Gesetze (Milieu-Impact)')}</h3>
        <ol className={styles.list}>
          {top3.length === 0 ? (
            <li>—</li>
          ) : (
            top3.map((e) => (
              <li key={e.gesetz.id}>
                {e.gesetz.kurz} ({e.impactScore.toFixed(0)} Impact)
              </li>
            ))
          )}
        </ol>
      </div>

      {optIn && community && community.gesamt > 0 && (
        <div className={styles.block}>
          <h3>{t('game:auswertung.blockCommunity', 'Vergleich (Community)')}</h3>
          <p className={styles.communityHint}>
            {t('game:auswertung.communityHint', 'Nur anonyme Opt-in-Daten.')}
          </p>
          <div className={styles.grid2}>
            <span>{t('game:auswertung.commGewinnrate', 'Ø Gewinnrate')}</span>
            <strong>{community.gewinnrate}%</strong>
            <span>{t('game:auswertung.commWahl', 'Ø Wahlprognose')}</span>
            <strong>{community.wahlprognose_avg}%</strong>
          </div>
        </div>
      )}

      <div className={styles.noteRow}>
        <input
          id="stats-opt-in"
          type="checkbox"
          checked={optIn}
          onChange={(e) => setOptIn(e.target.checked)}
        />
        <label htmlFor="stats-opt-in">
          {t(
            'game:auswertung.optIn',
            'Ich möchte zu den anonymen Community-Statistiken beitragen. Es werden keine persönlichen Daten übertragen.',
          )}
        </label>
      </div>

      {PLAYTEST_CONFIG.playtest_modus && (
        <div className={styles.feedbackHint}>
          <span>{t('common:userTestFeedback.spielendeHinweis', 'Wie war dein Erlebnis?')}</span>
          <button
            type="button"
            className={styles.feedbackHintBtn}
            onClick={() => setShowFeedbackModal(true)}
          >
            🐛 {t('common:userTestFeedback.spielendeLink', 'Feedback geben')}
          </button>
        </div>
      )}

      <div className={styles.actions}>
        <button type="button" className={styles.btnPrimary} onClick={() => void handleNeuesSpiel()}>
          {t('game:endScreen.neueLegislatur', 'Neues Spiel')}
        </button>
        <button type="button" className={styles.btnSecondary} onClick={() => void handleNochmalPartei()}>
          {t('game:auswertung.nochmalPartei', 'Nochmal als {{partei}}', {
            partei: spielerPartei?.kuerzel ?? 'SDP',
          })}
        </button>
        {isLoggedIn && (
          <button type="button" className={styles.btnSecondary} onClick={() => void handleSaveAuswertung()}>
            {t('game:auswertung.save', 'Auswertung speichern')}
          </button>
        )}
      </div>

      {showFeedbackModal && (
        <UserTestFeedbackModal
          kontext="spielende"
          gameStatId={gameStatId}
          onClose={() => setShowFeedbackModal(false)}
        />
      )}
    </div>
  );
}
