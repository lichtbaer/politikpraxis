/**
 * SMA-509: Kanzlerbilanz als dritter Wahlnacht-Beat — drei Karten + Gesamtnote, Details ab Stufe 3.
 */
import { useCallback, useMemo, useState } from 'react';
import { createPortal } from 'react-dom';
import { useTranslation } from 'react-i18next';
import { noteFromHundred } from '../../core/spielziel';
import { buildAgendaSidebarRows } from '../../core/agendaTracking';
import { berechneTitel } from '../../core/auswertung';
import type { ContentBundle, GameState, LegislaturBilanzNote, Law } from '../../core/types';
import styles from './KanzlerbilanzBeat.module.css';

type DetailTab = 'bilanz' | 'agenda' | 'urteil' | null;

type Props = {
  state: GameState;
  content: ContentBundle;
  showDetails: boolean;
  /** Stufe 4: Kanzler-Archetyp aus berechneTitel */
  showArchetype: boolean;
  onWeiter: () => void;
};

function bilanzKurztextKey(note: LegislaturBilanzNote): string {
  return `game:kanzlerbilanz.bilanzText.${note}`;
}

function agendaKurztextKey(note: LegislaturBilanzNote): string {
  return `game:kanzlerbilanz.agendaText.${note}`;
}

function urteilKurztextKey(note: LegislaturBilanzNote): string {
  return `game:kanzlerbilanz.urteilText.${note}`;
}

function collectUrteilFromLaws(beschlossen: Law[]): {
  positiv: string[];
  negativ: string[];
  scores: number[];
} {
  const positiv: string[] = [];
  const negativ: string[] = [];
  const scores: number[] = [];
  for (const g of beschlossen) {
    for (const s of g.langzeitwirkung_positiv ?? []) {
      if (s.trim()) positiv.push(s.trim());
    }
    for (const s of g.langzeitwirkung_negativ ?? []) {
      if (s.trim()) negativ.push(s.trim());
    }
    const raw = g.langzeit_score;
    if (raw != null && raw > 0) scores.push(Math.max(0, Math.min(10, raw)));
  }
  return { positiv, negativ, scores };
}

export function KanzlerbilanzBeat({ state, content, showDetails, showArchetype, onWeiter }: Props) {
  const { t } = useTranslation(['game', 'common']);
  const [detailTab, setDetailTab] = useState<DetailTab>(null);
  const [historischOpen, setHistorischOpen] = useState(false);

  const sz = state.spielziel;
  const bilanz = state.legislaturBilanz;
  const beschlossen = useMemo(
    () => state.gesetze.filter((g) => g.status === 'beschlossen'),
    [state.gesetze],
  );

  const noteBilanz = bilanz?.bilanzNote ?? (sz ? noteFromHundred(sz.bilanzPunkte) : 'C');
  const noteAgenda = sz ? noteFromHundred(sz.agendaPunkte) : 'C';
  const noteUrteil = sz ? noteFromHundred(sz.urteilPunkte) : 'C';
  const gesamtnote = sz?.gesamtnote ?? noteBilanz;
  const gesamtpunkte = sz?.gesamtpunkte;

  const archetyp = showArchetype ? berechneTitel(state) : null;

  const agendaRows = useMemo(() => buildAgendaSidebarRows(state, content), [state, content]);

  const urteilData = useMemo(() => collectUrteilFromLaws(beschlossen), [beschlossen]);
  const nachhaltigkeit = useMemo(() => {
    const { scores } = urteilData;
    if (scores.length === 0) return null;
    const avg = scores.reduce((a, b) => a + b, 0) / scores.length;
    const min = Math.min(...scores);
    const max = Math.max(...scores);
    return { avg, min, max, n: scores.length };
  }, [urteilData]);

  const detailBilanz = bilanz?.bilanzPunkteDetail;

  const formatSubtitle = useCallback(
    (row: (typeof agendaRows)[0]) => t(row.subtitle.key, row.subtitle.params),
    [t],
  );

  const closeDetail = () => setDetailTab(null);

  const detailModal =
    detailTab &&
    showDetails &&
    createPortal(
      <div
        className={styles.modalOverlay}
        role="dialog"
        aria-modal="true"
        aria-labelledby="kb-detail-title"
        onClick={closeDetail}
      >
        <div className={styles.modal} onClick={(e) => e.stopPropagation()}>
          <div className={styles.modalHeader}>
            <h2 id="kb-detail-title" className={styles.modalTitle}>
              {detailTab === 'bilanz' && t('game:kanzlerbilanz.detailBilanz', 'Bilanz — KPI-Aufschlüsselung')}
              {detailTab === 'agenda' && t('game:kanzlerbilanz.detailAgenda', 'Agenda — Ziele')}
              {detailTab === 'urteil' && t('game:kanzlerbilanz.detailUrteil', 'Historisches Urteil')}
            </h2>
            <button type="button" className={styles.modalClose} onClick={closeDetail} aria-label={t('common:close', 'Schließen')}>
              ×
            </button>
          </div>
          <div className={styles.modalBody}>
            {detailTab === 'bilanz' && detailBilanz && (
              <ul className={styles.detailList}>
                <li className={styles.detailRow}>
                  <span>{t('game:kanzlerbilanz.kpi.gesetze', 'Gesetze (Punkte)')}</span>
                  <strong>{detailBilanz.gesetze}</strong>
                </li>
                <li className={styles.detailRow}>
                  <span>{t('game:kanzlerbilanz.kpi.politikfelder', 'Politikfelder (Punkte)')}</span>
                  <strong>{detailBilanz.politikfelder}</strong>
                </li>
                <li className={styles.detailRow}>
                  <span>{t('game:kanzlerbilanz.kpi.haushalt', 'Haushalt (Punkte)')}</span>
                  <strong>{detailBilanz.haushalt}</strong>
                </li>
                <li className={styles.detailRow}>
                  <span>{t('game:kanzlerbilanz.kpi.stabilitaet', 'Stabilität (Punkte)')}</span>
                  <strong>{detailBilanz.stabilitaet}</strong>
                </li>
                <li className={styles.detailRow}>
                  <span>{t('game:kanzlerbilanz.kpi.koalition', 'Koalition (Punkte)')}</span>
                  <strong>{detailBilanz.koalition}</strong>
                </li>
                <li className={styles.detailRow}>
                  <span>{t('game:kanzlerbilanz.kpi.zusammenhalt', 'Milieu-Zusammenhalt (Punkte)')}</span>
                  <strong>{detailBilanz.zusammenhalt}</strong>
                </li>
                <li className={styles.detailRow}>
                  <span>{t('game:kanzlerbilanz.kpi.reformTiefe', 'Reformtiefe (Punkte)')}</span>
                  <strong>{detailBilanz.reformTiefe}</strong>
                </li>
              </ul>
            )}
            {detailTab === 'bilanz' && !detailBilanz && (
              <p className={styles.subtitle}>{t('game:kanzlerbilanz.noBilanzDetail', 'Keine Detaildaten verfügbar.')}</p>
            )}

            {detailTab === 'agenda' && (
              <>
                {agendaRows.length === 0 ? (
                  <p className={styles.subtitle}>{t('game:kanzlerbilanz.noAgenda', 'Keine Agenda-Ziele gesetzt.')}</p>
                ) : (
                  <ul className={styles.checkList}>
                    {agendaRows.map((row) => (
                      <li key={`${row.source}-${row.id}`} className={styles.checkRow}>
                        <span
                          className={`${styles.checkMark} ${row.erfuellt ? styles.checkMarkOk : styles.checkMarkNo}`}
                          aria-hidden
                        >
                          {row.erfuellt ? '✓' : '✗'}
                        </span>
                        <div>
                          <div>
                            {row.source === 'spieler'
                              ? t('game:kanzlerbilanz.agendaSpielerPrefix', 'Spieler')
                              : t('game:kanzlerbilanz.agendaKoalitionPrefix', 'Koalition')}
                            : {row.titel}
                          </div>
                          <div className={styles.subtitle} style={{ marginTop: 4, textAlign: 'left' }}>
                            {formatSubtitle(row)}
                          </div>
                        </div>
                      </li>
                    ))}
                  </ul>
                )}
              </>
            )}

            {detailTab === 'urteil' && (
              <>
                {nachhaltigkeit && (
                  <ul className={styles.detailList}>
                    <li className={styles.detailRow}>
                      <span>{t('game:kanzlerbilanz.nachhaltAvg', 'Ø Langzeit-Score (0–10)')}</span>
                      <strong>{nachhaltigkeit.avg.toFixed(1)}</strong>
                    </li>
                    <li className={styles.detailRow}>
                      <span>{t('game:kanzlerbilanz.nachhaltMin', 'Minimum')}</span>
                      <strong>{nachhaltigkeit.min.toFixed(1)}</strong>
                    </li>
                    <li className={styles.detailRow}>
                      <span>{t('game:kanzlerbilanz.nachhaltMax', 'Maximum')}</span>
                      <strong>{nachhaltigkeit.max.toFixed(1)}</strong>
                    </li>
                    <li className={styles.detailRow}>
                      <span>{t('game:kanzlerbilanz.nachhaltN', 'Gesetze mit Score')}</span>
                      <strong>{nachhaltigkeit.n}</strong>
                    </li>
                  </ul>
                )}
                {urteilData.positiv.length > 0 && (
                  <div className={styles.subBlock}>
                    <h4>{t('game:kanzlerbilanz.langzeitPos', 'Positive Langzeitwirkungen')}</h4>
                    <ul className={styles.bulletList}>
                      {urteilData.positiv.slice(0, 12).map((x, i) => (
                        <li key={`p-${i}`}>{x}</li>
                      ))}
                    </ul>
                  </div>
                )}
                {urteilData.negativ.length > 0 && (
                  <div className={styles.subBlock}>
                    <h4>{t('game:kanzlerbilanz.langzeitNeg', 'Negative Langzeitwirkungen')}</h4>
                    <ul className={styles.bulletList}>
                      {urteilData.negativ.slice(0, 12).map((x, i) => (
                        <li key={`n-${i}`}>{x}</li>
                      ))}
                    </ul>
                  </div>
                )}
                {urteilData.positiv.length === 0 &&
                  urteilData.negativ.length === 0 &&
                  !nachhaltigkeit && (
                    <p className={styles.subtitle}>
                      {t(
                        'game:kanzlerbilanz.noUrteilContent',
                        'Keine Langzeit-Texte im Content hinterlegt. Die Note basiert auf den Standard-Langzeit-Scores der Gesetze.',
                      )}
                    </p>
                  )}
              </>
            )}
          </div>
        </div>
      </div>,
      document.body,
    );

  const historischModal =
    historischOpen &&
    showDetails &&
    createPortal(
      <div
        className={`${styles.modalOverlay} ${styles.modalOverlayHighZ}`}
        role="dialog"
        aria-modal="true"
        aria-labelledby="kb-hist-title"
        onClick={() => setHistorischOpen(false)}
      >
        <div className={`${styles.modal} ${styles.historischModal}`} onClick={(e) => e.stopPropagation()}>
          <div className={styles.modalHeader}>
            <h2 id="kb-hist-title" className={styles.modalTitle}>
              {t('game:kanzlerbilanz.historischTitle', 'Fünf Jahre später')}
            </h2>
            <button
              type="button"
              className={styles.modalClose}
              onClick={() => setHistorischOpen(false)}
              aria-label={t('common:close', 'Schließen')}
            >
              ×
            </button>
          </div>
          <div className={styles.modalBody}>
            <p className={styles.subtitle} style={{ textAlign: 'left' }}>
              {t(
                'game:kanzlerbilanz.historischIntro',
                'Rückblick: Wie wirken deine beschlossenen Gesetze langfristig?',
              )}
            </p>
            {nachhaltigkeit && (
              <ul className={styles.detailList}>
                <li className={styles.detailRow}>
                  <span>{t('game:kanzlerbilanz.nachhaltAvg', 'Ø Langzeit-Score (0–10)')}</span>
                  <strong>{nachhaltigkeit.avg.toFixed(1)}</strong>
                </li>
              </ul>
            )}
            {urteilData.positiv.length > 0 && (
              <div className={styles.subBlock}>
                <h4>{t('game:kanzlerbilanz.langzeitPos', 'Positive Langzeitwirkungen')}</h4>
                <ul className={styles.bulletList}>
                  {urteilData.positiv.slice(0, 8).map((x, i) => (
                    <li key={`hp-${i}`}>{x}</li>
                  ))}
                </ul>
              </div>
            )}
            {urteilData.negativ.length > 0 && (
              <div className={styles.subBlock}>
                <h4>{t('game:kanzlerbilanz.langzeitNeg', 'Negative Langzeitwirkungen')}</h4>
                <ul className={styles.bulletList}>
                  {urteilData.negativ.slice(0, 8).map((x, i) => (
                    <li key={`hn-${i}`}>{x}</li>
                  ))}
                </ul>
              </div>
            )}
            {showArchetype && archetyp && (
              <p className={styles.archetype} style={{ textAlign: 'left', marginTop: 16 }}>
                <strong>{t('game:kanzlerbilanz.archetypLabel', 'Archetyp')}: </strong>
                {archetyp}
              </p>
            )}
          </div>
        </div>
      </div>,
      document.body,
    );

  return (
    <div className={styles.wrap}>
      <h2 className={styles.title}>{t('game:kanzlerbilanz.title', 'Kanzlerbilanz')}</h2>
      <p className={styles.subtitle}>
        {t(
          'game:kanzlerbilanz.subtitle',
          'Bilanz, Agenda und historisches Urteil — gewichtet zur Gesamtnote (Wahlbonus separat).',
        )}
      </p>

      <div className={styles.cards}>
        <div className={styles.card}>
          <div className={styles.cardHead}>
            <span className={styles.cardLabel}>{t('game:kanzlerbilanz.cardBilanz', 'Bilanz')}</span>
            <span className={styles.grade}>{noteBilanz}</span>
          </div>
          <p className={styles.cardText}>{t(bilanzKurztextKey(noteBilanz))}</p>
          <div className={styles.cardFooter}>
            <button
              type="button"
              className={styles.detailLink}
              disabled={!showDetails}
              onClick={() => showDetails && setDetailTab('bilanz')}
            >
              {t('game:kanzlerbilanz.details', 'Details →')}
            </button>
          </div>
        </div>

        <div className={styles.card}>
          <div className={styles.cardHead}>
            <span className={styles.cardLabel}>{t('game:kanzlerbilanz.cardAgenda', 'Agenda')}</span>
            <span className={styles.grade}>{noteAgenda}</span>
          </div>
          <p className={styles.cardText}>{t(agendaKurztextKey(noteAgenda))}</p>
          <div className={styles.cardFooter}>
            <button
              type="button"
              className={styles.detailLink}
              disabled={!showDetails}
              onClick={() => showDetails && setDetailTab('agenda')}
            >
              {t('game:kanzlerbilanz.details', 'Details →')}
            </button>
          </div>
        </div>

        <div className={styles.card}>
          <div className={styles.cardHead}>
            <span className={styles.cardLabel}>{t('game:kanzlerbilanz.cardUrteil', 'Urteil')}</span>
            <span className={styles.grade}>{noteUrteil}</span>
          </div>
          <p className={styles.cardText}>{t(urteilKurztextKey(noteUrteil))}</p>
          <div className={styles.cardFooter}>
            <button
              type="button"
              className={styles.detailLink}
              disabled={!showDetails}
              onClick={() => showDetails && setDetailTab('urteil')}
            >
              {t('game:kanzlerbilanz.details', 'Details →')}
            </button>
          </div>
        </div>
      </div>

      <div className={styles.totalRow}>
        <p className={styles.totalLabel}>{t('game:kanzlerbilanz.gesamtnote', 'Gesamtnote')}</p>
        <p className={styles.totalGrade}>{gesamtnote}</p>
        {gesamtpunkte != null && (
          <p className={styles.totalPoints}>
            {t('game:kanzlerbilanz.gesamtpunkte', '{{pts}} von 100 Punkten', {
              pts: gesamtpunkte.toFixed(1),
            })}
          </p>
        )}
        {showArchetype && archetyp && (
          <p className={styles.archetype}>
            {t('game:kanzlerbilanz.archetypLabel', 'Archetyp')}: {archetyp}
          </p>
        )}
      </div>

      <div className={styles.actions}>
        <button type="button" className={styles.btnPrimary} onClick={onWeiter}>
          {t('game:kanzlerbilanz.zuruckAuswertung', 'Zurück zur Auswertung')}
        </button>
        {showDetails && (
          <button type="button" className={styles.btnGhost} onClick={() => setHistorischOpen(true)}>
            {t('game:kanzlerbilanz.historischCta', '5 Jahre später — historisches Urteil')}
          </button>
        )}
      </div>

      {detailModal}
      {historischModal}
    </div>
  );
}
