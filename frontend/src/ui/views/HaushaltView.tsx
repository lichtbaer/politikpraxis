/**
 * SMA-320/SMA-323: HaushaltView — Einnahmen/Ausgaben, Ampel, Saldo-Verlauf,
 * Konjunktur, Schuldenbremse, Steuerquote-Regler, Verbands-Forderungen
 */
import { useMemo } from 'react';
import { useTranslation } from 'react-i18next';
import ReactECharts from 'echarts-for-react';
import type { EChartsOption } from 'echarts';
import { useGameStore } from '../../store/gameStore';
import { featureActive } from '../../core/systems/features';
import { checkSchuldenbremse } from '../../core/systems/haushalt';
import { SCHULDENBREMSE_SPIELRAUM_BASIS } from '../../core/constants';
import { formatMrdSaldo, normalizeZero } from '../../utils/format';
import type { SchuldenbremsenStatus, Verband, Haushalt, SteuerContent } from '../../core/types';
import { Check, AlertTriangle } from '../icons';
import { Erklaerung } from '../components/Erklaerung/Erklaerung';
import styles from './HaushaltView.module.css';

function getSaldoKlasse(saldo: number): string {
  if (saldo > 0) return 'saldoAusgeglichen';
  if (saldo >= -15) return 'saldoDefizit';
  if (saldo >= -30) return 'saldoKritisch';
  return 'saldoKrise';
}

/** SMA-336: Schuldenbremse-Widget mit Spielraum-Balken (verbraucht/erlaubt), Stufe 2+ */
function SchuldenbremseWidget({
  spielraum,
  erlaubt,
  status,
}: {
  spielraum: number;
  erlaubt: number;
  status: SchuldenbremsenStatus;
}) {
  const { t } = useTranslation('game');
  const verbraucht = Math.max(0, erlaubt - spielraum);
  const pct = erlaubt > 0 ? (verbraucht / erlaubt) * 100 : 0;

  return (
    <section className={styles.schuldenbremseWidget}>
      <h3>{t('haushalt.schuldenbremse', 'Schuldenbremse')}</h3>
      <div className={styles.spielraumBalken}>
        <div
          className={`${styles.spielraumUsed} ${pct >= 100 ? styles.voll : ''}`}
          style={{ width: `${Math.min(100, pct)}%` }}
        />
      </div>
      <p>
        {t('haushaltView.verbraucht', { used: formatMrdSaldo(verbraucht, 0), allowed: formatMrdSaldo(erlaubt, 0) })}
      </p>
      {status !== 'inaktiv' && <SchuldenbremsenBadge status={status} />}
    </section>
  );
}

function SchuldenbremsenBadge({ status }: { status: SchuldenbremsenStatus }) {
  const { t } = useTranslation('game');
  if (status === 'inaktiv') return null;

  const config: Record<Exclude<SchuldenbremsenStatus, 'inaktiv'>, { label: string; className: string }> = {
    ausgeglichen: { label: t('haushalt.schuldenbremseAusgeglichen'), className: styles.sbAusgeglichen },
    grenzwertig: { label: t('haushalt.schuldenbremseGrenzwertig'), className: styles.sbGrenzwertig },
    verletzt_mild: { label: t('haushalt.schuldenbremseVerletzt'), className: styles.sbVerletzt },
    verletzt_stark: { label: t('haushalt.schuldenbremseKritisch'), className: styles.sbKritisch },
  };
  const { label, className } = config[status];

  return (
    <div className={`${styles.schuldenbremsenBadge} ${className}`}>
      <span className={styles.sbIcon}>{status === 'ausgeglichen' ? <Check size={14} /> : <AlertTriangle size={14} />}</span>
      <span>{label}</span>
      <Erklaerung begriff="schuldenbremse" inline={false} />
    </div>
  );
}

function KonjunkturIndikator({ value }: { value: number }) {
  const { t } = useTranslation('game');
  const pct = ((value + 3) / 6) * 100;
  const color =
    value > 1 ? 'var(--green)' : value > -1 ? 'var(--warn)' : 'var(--red)';

  return (
    <div className={styles.konjunkturIndikator} title={t('haushalt.konjunkturTooltip')}>
      <span className={styles.konjunkturLabel}><Erklaerung begriff="konjunkturindex" kinder={t('haushalt.konjunktur')} /></span>
      <div className={styles.konjunkturBar}>
        <div
          className={styles.konjunkturFill}
          style={{ width: `${pct}%`, backgroundColor: color }}
        />
      </div>
      <span className={styles.konjunkturValue}>{normalizeZero(value) > 0 ? '+' : ''}{normalizeZero(value).toFixed(1)}</span>
    </div>
  );
}

/** SMA-323: Steuerquote-Regler — +2 oder -3 Mrd./Jahr, 1× pro Jahr, 15 PK */
function SteuerquoteRegler() {
  const { t } = useTranslation('game');
  const { state, complexity, doSteuerquoteChange } = useGameStore();
  const haushalt = state.haushalt;
  if (!featureActive(complexity, 'steuerquote') || !haushalt) return null;

  const currentJahr = Math.floor((state.month - 1) / 12) + 1;
  const bereitsGenutzt = state.steuerquoteAktionJahr === currentJahr;
  const pkReicht = state.pk >= 15;

  if (bereitsGenutzt) return null;

  return (
    <section className={styles.section}>
      <h2 className={styles.sectionTitle}>{t('haushalt.steuerquoteTitle', 'Steuerquote anpassen')}</h2>
      <p className={styles.steuerquoteDesc}>
        {t('haushalt.steuerquoteDesc', '1× pro Jahr, 15 PK. Erhöhung: BdI -8, GBD +5. Senkung: BdI +8, GBD -8.')}
      </p>
      <div className={styles.steuerquoteButtons}>
        <button
          type="button"
          className={styles.steuerquoteBtn}
          disabled={!pkReicht}
          onClick={() => doSteuerquoteChange(2)}
          title={t('haushalt.steuerquoteErhoehen', '+2 Mrd./Jahr Einnahmen')}
        >
          {t('haushalt.steuerquoteErhoehen')}
        </button>
        <button
          type="button"
          className={styles.steuerquoteBtn}
          disabled={!pkReicht}
          onClick={() => doSteuerquoteChange(-3)}
          title={t('haushalt.steuerquoteSenken')}
        >
          {t('haushalt.steuerquoteSenken')}
        </button>
      </div>
      {!pkReicht && (
        <span className={styles.steuerquoteHint}>{t('haushalt.steuerquotePk', '15 PK benötigt')}</span>
      )}
    </section>
  );
}

/** SMA-336: Steuer-Dashboard — Direkte/Indirekte Steuern, Gesamtsumme */
function SteuernDashboard({
  haushalt,
  steuern,
}: {
  haushalt: Haushalt;
  steuern?: SteuerContent[];
}) {
  const { t } = useTranslation('game');
  const einnahmen = haushalt.einnahmen;

  if (!steuern || steuern.length === 0) {
    return (
      <section className={styles.section}>
        <h2 className={styles.sectionTitle}>{t('haushalt.steuereinnahmen', 'Steuereinnahmen')}</h2>
        <div className={styles.steuerSumme}>
          <span>{t('haushalt.steuereinnahmenGesamt', 'Steuereinnahmen gesamt')}:</span>
          <strong>+{einnahmen.toFixed(1)} {t('ui.mrd')}</strong>
        </div>
      </section>
    );
  }

  const direkteSteuern = steuern.filter((s) => s.typ === 'direkt');
  const indirekteSteuern = steuern.filter((s) => s.typ === 'indirekt');

  return (
    <section className={styles.section}>
      <h2 className={styles.sectionTitle}>{t('haushalt.steuereinnahmen', 'Steuereinnahmen')}</h2>
      {direkteSteuern.length > 0 && (
        <div className={styles.steuerGruppe}>
          <h3 className={styles.steuerGruppeTitel}>{t('haushalt.direkteSteuern', 'Direkte Steuern')}</h3>
          {direkteSteuern.map((steuer) => (
            <div key={steuer.id} className={styles.steuerZeile}>
              <span className={styles.steuerLabel}>{steuer.name_de}</span>
              <span className={styles.steuerSatz}>{steuer.aktueller_satz}%</span>
              <span className={styles.steuerEinnahmen}>+{steuer.einnahmen_basis.toFixed(1)} {t('ui.mrd')}</span>
              {steuer.satz_delta !== undefined && steuer.satz_delta !== 0 && (
                <span className={steuer.satz_delta > 0 ? styles.trendUp : styles.trendDown}>
                  {steuer.satz_delta > 0 ? '↑' : '↓'} {Math.abs(steuer.satz_delta)}%
                </span>
              )}
            </div>
          ))}
        </div>
      )}
      {indirekteSteuern.length > 0 && (
        <div className={styles.steuerGruppe}>
          <h3 className={styles.steuerGruppeTitel}>{t('haushalt.indirekteSteuern', 'Indirekte Steuern')}</h3>
          {indirekteSteuern.map((steuer) => (
            <div key={steuer.id} className={styles.steuerZeile}>
              <span className={styles.steuerLabel}>{steuer.name_de}</span>
              <span className={styles.steuerSatz}>{steuer.aktueller_satz}%</span>
              <span className={styles.steuerEinnahmen}>+{steuer.einnahmen_basis.toFixed(1)} {t('ui.mrd')}</span>
              {steuer.satz_delta !== undefined && steuer.satz_delta !== 0 && (
                <span className={steuer.satz_delta > 0 ? styles.trendUp : styles.trendDown}>
                  {steuer.satz_delta > 0 ? '↑' : '↓'} {Math.abs(steuer.satz_delta)}%
                </span>
              )}
            </div>
          ))}
        </div>
      )}
      <div className={styles.steuerSumme}>
        <span>{t('haushalt.steuereinnahmenGesamt', 'Steuereinnahmen gesamt')}:</span>
        <strong>+{einnahmen.toFixed(1)} {t('ui.mrd')}</strong>
      </div>
    </section>
  );
}

/** SMA-323: Verbands-Haushaltsforderungen — Verbände mit cost_pk=0 Trade-offs */
function VerbandsForderungen({ verbaende }: { verbaende: Verband[] }) {
  const { t } = useTranslation('game');
  const forderungen = verbaende.filter((v) =>
    v.tradeoffs?.some((to) => (to.cost_pk ?? 0) === 0),
  );
  if (forderungen.length === 0) return null;

  return (
    <section className={styles.section}>
      <h2 className={styles.sectionTitle}>{t('haushalt.verbandsForderungen', 'Verbands-Haushaltsforderungen')}</h2>
      <ul className={styles.verbandsList}>
        {forderungen.map((v) => (
          <li key={v.id} className={styles.verbandsItem}>
            <span className={styles.verbandsKurz}>{v.kurz}</span>
            {v.tradeoffs?.filter((to) => (to.cost_pk ?? 0) === 0).map((to) => (
              <span key={to.key} className={styles.verbandsForderung}>
                {to.label ?? to.key}
              </span>
            ))}
          </li>
        ))}
      </ul>
    </section>
  );
}

export function HaushaltView() {
  const { t } = useTranslation('game');
  const { state, complexity, content } = useGameStore();
  const haushalt = state.haushalt;
  const saldoHistory = state.haushaltSaldoHistory ?? [];
  const haushaltSaldo = haushalt?.saldo ?? 0;

  const chartOption: EChartsOption = useMemo(() => ({
    animation: true,
    grid: { top: 8, right: 8, bottom: 24, left: 40, containLabel: true },
    xAxis: {
      type: 'category',
      data: saldoHistory.map((_, i) => i + 1),
      axisLabel: { color: '#888', fontSize: 10 },
      axisLine: { show: false },
      axisTick: { show: false },
    },
    yAxis: {
      type: 'value',
      axisLabel: { color: '#888', fontSize: 10, formatter: `{value} ${t('ui.mrd')}` },
      splitLine: { lineStyle: { color: '#333', type: 'dashed' } },
    },
    tooltip: {
      trigger: 'axis',
      formatter: (params: unknown) => {
        const p = params as Array<{ dataIndex: number; value: number }>;
        const v = p[0]?.value;
        return t('haushaltView.monatTooltip', { month: (p[0]?.dataIndex ?? 0) + 1, value: v != null ? formatMrdSaldo(v) : '—' });
      },
    },
    series: [{
      type: 'line',
      data: saldoHistory,
      smooth: 0.3,
      symbol: 'none',
      lineStyle: { color: haushaltSaldo >= 0 ? '#5a9870' : '#c05848', width: 2 },
      areaStyle: {
        color: haushaltSaldo >= 0
          ? { type: 'linear', x: 0, y: 0, x2: 0, y2: 1, colorStops: [{ offset: 0, color: 'rgba(90,152,112,0.3)' }, { offset: 1, color: 'rgba(90,152,112,0.02)' }] }
          : { type: 'linear', x: 0, y: 0, x2: 0, y2: 1, colorStops: [{ offset: 0, color: 'rgba(192,88,72,0.3)' }, { offset: 1, color: 'rgba(192,88,72,0.02)' }] },
      },
    }],
  }), [saldoHistory, haushaltSaldo, t]);

  if (!haushalt || complexity < 2) {
    return (
      <div className={styles.root}>
        <h1 className={styles.title}>{t('haushalt.title')}</h1>
        <p className={styles.desc}>
          {t('haushalt.stufe2Info', 'Haushaltsübersicht ab Stufe 2 verfügbar.')}
        </p>
      </div>
    );
  }

  const schuldenbremsenStatus = checkSchuldenbremse(state, complexity);

  // SMA-323: Balken proportional — max der drei Werte, alle relativ dazu
  const maxWert = Math.max(
    Math.abs(haushalt.einnahmen),
    Math.abs(haushalt.pflichtausgaben),
    Math.abs(haushalt.laufendeAusgaben),
    1,
  );
  const einnahmenPct = (haushalt.einnahmen / maxWert) * 100;
  const pflichtPct = (haushalt.pflichtausgaben / maxWert) * 100;
  const laufendPct = (haushalt.laufendeAusgaben / maxWert) * 100;

  return (
    <div className={styles.root}>
      <h1 className={styles.title}>{t('haushalt.title')}</h1>
      <p className={styles.desc}>
        {t('haushalt.desc', 'Einnahmen, Pflichtausgaben und Gesetzeskosten. Der Saldo beeinflusst die Wirtschaftslage.')}
      </p>

      <section className={styles.section}>
        <h2 className={styles.sectionTitle}>{t('haushalt.aufkommen', 'Einnahmen vs. Ausgaben')}</h2>
        <div className={styles.balkenStack}>
          <div className={styles.balkenRow}>
            <span className={styles.balkenLabel}>{t('haushalt.einnahmen')}</span>
            <div className={styles.balkenTrack}>
              <div className={styles.balkenFill} style={{ width: `${einnahmenPct}%`, backgroundColor: 'var(--green)' }} />
            </div>
            <span className={styles.balkenValue}>+{haushalt.einnahmen} {t('ui.mrd')}</span>
          </div>
          <div className={styles.balkenRow}>
            <span className={styles.balkenLabel}><Erklaerung begriff="pflichtausgaben" kinder={t('haushalt.pflichtausgaben')} /></span>
            <div className={styles.balkenTrack}>
              <div className={styles.balkenFill} style={{ width: `${pflichtPct}%`, backgroundColor: 'var(--warn)' }} />
            </div>
            <span className={styles.balkenValue}>-{haushalt.pflichtausgaben} {t('ui.mrd')}</span>
          </div>
          {haushalt.laufendeAusgaben !== 0 ? (
            <div className={styles.balkenRow}>
              <span className={styles.balkenLabel}>{t('haushalt.laufendeAusgaben')}</span>
              <div className={styles.balkenTrack}>
                <div className={styles.balkenFill} style={{ width: `${laufendPct}%`, backgroundColor: 'var(--red)' }} />
              </div>
              <span className={styles.balkenValue}>-{normalizeZero(haushalt.laufendeAusgaben).toFixed(1)} {t('ui.mrd')}</span>
            </div>
          ) : (
            <p className={styles.keineGesetze}>{t('haushalt.keineLaufendenGesetze', 'Keine laufenden Gesetzeskosten')}</p>
          )}
        </div>
      </section>

      <section className={`${styles.ampelSection} ${styles[getSaldoKlasse(haushalt.saldo)]}`}>
        <h2 className={styles.sectionTitle}><Erklaerung begriff="haushaltssaldo" kinder={t('haushalt.saldo')} /></h2>
        <div className={styles.ampelValue}>
          {formatMrdSaldo(haushalt.saldo)}
        </div>
      </section>

      {saldoHistory.length > 0 && (
        <section className={styles.section}>
          <h2 className={styles.sectionTitle}>{t('haushalt.saldoVerlauf', 'Saldo-Verlauf (letzte 12 Monate)')}</h2>
          <ReactECharts
            option={chartOption}
            theme="politikpraxis"
            style={{ width: '100%', height: 160 }}
            opts={{ renderer: 'canvas' }}
          />
        </section>
      )}

      {featureActive(complexity, 'konjunktur_anzeige') && (
        <section className={styles.section}>
          <KonjunkturIndikator value={haushalt.konjunkturIndex} />
        </section>
      )}

      {featureActive(complexity, 'schuldenbremse_widget') && (
        <SchuldenbremseWidget
          spielraum={haushalt.schuldenbremseSpielraum ?? SCHULDENBREMSE_SPIELRAUM_BASIS}
          erlaubt={SCHULDENBREMSE_SPIELRAUM_BASIS}
          status={schuldenbremsenStatus}
        />
      )}
      {featureActive(complexity, 'schuldenbremse') && (
        <SchuldenbremsenBadge status={schuldenbremsenStatus} />
      )}

      {featureActive(complexity, 'steuern_dashboard') && (
        <SteuernDashboard haushalt={haushalt} steuern={content.steuern} />
      )}

      <SteuerquoteRegler />

      {featureActive(complexity, 'verbands_lobbying') && (
        <VerbandsForderungen verbaende={content.verbaende ?? []} />
      )}
    </div>
  );
}
