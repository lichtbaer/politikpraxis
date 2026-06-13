/**
 * SMA-396: „Was ist passiert?“ nach jedem Monats-Tick
 */
import type { TFunction } from 'i18next';
import { useTranslation } from 'react-i18next';
import type { Law, MonatsDiff, MonatsUrsache } from '../../../core/types';
import { useUIStore } from '../../../store/uiStore';
import styles from './MonatszusammenfassungModal.module.css';

interface MonatszusammenfassungModalProps {
  diff: MonatsDiff;
  laws: Law[];
  onWeiter: () => void;
  onDetails: () => void;
}

function getGesetzMeta(laws: Law[], id: string): { kurz: string; ja?: number } | null {
  const g = laws.find((l) => l.id === id);
  return g ? { kurz: g.kurz, ja: g.ja } : null;
}

/**
 * Issue #209: Ist die Änderung aus Regierungssicht positiv? Bei AL/Gini ist
 * niedriger besser; sonst ist höher besser. `null` = neutral/narrativ.
 */
function istGutFuerSpieler(u: MonatsUrsache): boolean | null {
  if (u.art === 'narrativ' || u.delta === 0) return null;
  const niedrigerBesser = u.kpi === 'al' || u.kpi === 'gi';
  return niedrigerBesser ? u.delta < 0 : u.delta > 0;
}

function formatUrsacheDelta(delta: number): string {
  const abs = Math.abs(delta);
  const betrag = Number.isInteger(abs) ? String(abs) : abs.toFixed(1);
  const sign = delta > 0 ? '+' : delta < 0 ? '−' : '±';
  return `${sign}${betrag}`;
}

/** Issue #209: „{Kategorie}: {KPI}" bzw. nur Kategorie / Event-Titel. */
function ursacheLabel(t: TFunction, u: MonatsUrsache): string {
  if (u.kategorie === 'event') {
    return u.label ?? t('monatszusammenfassung.ursache.event');
  }
  const kat = t(`monatszusammenfassung.ursache.${u.kategorie}`);
  if (u.kpi) {
    return `${kat}: ${t(`monatszusammenfassung.ursacheKpi.${u.kpi}`)}`;
  }
  return kat;
}

function KpiDeltaZeile(props: {
  label: string;
  vor: number;
  nach: number;
  delta: number;
  suffix?: string;
  decimals?: number;
}) {
  const { label, vor, nach, delta, suffix = '', decimals } = props;
  const fmt = (n: number) =>
    decimals != null ? n.toFixed(decimals) : String(Math.round(n));
  const farbe = delta > 0 ? styles.positiv : delta < 0 ? styles.negativ : styles.neutral;
  /** SMA-408: Bei Δ=0 „→“ wie bei positiv/negativ Pfeil-Symbole, kein langer Gedankenstrich. */
  const pfeil = delta > 0 ? '▲' : delta < 0 ? '▼' : '→';
  const deltaStr =
    delta === 0
      ? `±${decimals != null ? (0).toFixed(decimals) : '0'}`
      : `${delta > 0 ? '+' : ''}${decimals != null ? delta.toFixed(decimals) : delta}`;
  return (
    <div className={styles.kpiRow}>
      <span className={styles.kpiLabel}>{label}</span>
      <span className={styles.kpiValues}>
        {fmt(vor)}
        {suffix} → {fmt(nach)}
        {suffix}{' '}
        <span className={`${styles.kpiDelta} ${farbe}`}>
          {pfeil} {deltaStr}
          {suffix}
        </span>
      </span>
    </div>
  );
}

export function MonatszusammenfassungModal({
  diff,
  laws,
  onWeiter,
  onDetails,
}: MonatszusammenfassungModalProps) {
  const { t } = useTranslation('game');
  const monatszusammenfassung = useUIStore((s) => s.playerSettings.monatszusammenfassung);
  const setPlayerSettings = useUIStore((s) => s.setPlayerSettings);

  const hatGesetze =
    diff.beschlosseneGesetze.length > 0 || diff.gescheiterteGesetze.length > 0;

  // Issue #209: Fallback für ältere Spielstände ohne topUrsachen.
  const topUrsachen = diff.topUrsachen ?? [];

  // Issue #209: Handlungs-Tipp zur stärksten Ursache, die der Regierung schadet.
  const schlechtesteUrsache = topUrsachen.find((u) => istGutFuerSpieler(u) === false);
  const tipp = schlechtesteUrsache
    ? t(`monatszusammenfassung.tipp.${schlechtesteUrsache.kategorie}_negativ`, {
        defaultValue: '',
      })
    : '';

  return (
    <div className={styles.overlay} role="dialog" aria-modal="true" aria-labelledby="monatszusammenfassung-title">
      <div className={styles.modal} onClick={(e) => e.stopPropagation()}>
        <div className={styles.header}>
          <h2 id="monatszusammenfassung-title" className={styles.title}>
            {t('monatszusammenfassung.title', { monat: diff.monat })}
          </h2>
          <p className={styles.sub}>{t('monatszusammenfassung.subtitle')}</p>
        </div>

        <div className={styles.body}>
          <section className={styles.block}>
            <h3 className={styles.blockTitle}>{t('monatszusammenfassung.blockUrsachen')}</h3>
            {topUrsachen.length === 0 ? (
              <p className={styles.neutralMsg}>{t('monatszusammenfassung.keineAenderung')}</p>
            ) : (
              <>
                {topUrsachen.map((u, i) => {
                  const gut = istGutFuerSpieler(u);
                  const farbe =
                    gut === true ? styles.positiv : gut === false ? styles.negativ : styles.neutral;
                  const pfeil = u.delta > 0 ? '▲' : u.delta < 0 ? '▼' : '→';
                  const istEvent = u.art === 'narrativ';
                  return (
                    <div key={`${u.kategorie}-${u.kpi ?? u.refId ?? i}`} className={styles.ursacheRow}>
                      <span
                        className={`${styles.ursacheBadge} ${istEvent ? styles.ursacheBadgeEvent : ''}`}
                      >
                        {t(istEvent ? 'monatszusammenfassung.badgeEvent' : 'monatszusammenfassung.badgeZahl')}
                      </span>
                      <span className={styles.ursacheLabel}>{ursacheLabel(t, u)}</span>
                      {istEvent ? (
                        <span className={styles.neutral} />
                      ) : (
                        <span className={`${styles.ursacheDelta} ${farbe}`}>
                          {pfeil} {formatUrsacheDelta(u.delta)}
                        </span>
                      )}
                    </div>
                  );
                })}
                {tipp && (
                  <p className={styles.ursacheTipp}>
                    <span className={styles.ursacheTippLabel}>
                      {t('monatszusammenfassung.tippLabel')}
                    </span>{' '}
                    {tipp}
                  </p>
                )}
              </>
            )}
          </section>

          {hatGesetze && (
            <section className={styles.block}>
              <h3 className={styles.blockTitle}>{t('monatszusammenfassung.blockGesetze')}</h3>
              {diff.beschlosseneGesetze.map((id) => {
                const meta = getGesetzMeta(laws, id);
                const name = meta?.kurz ?? id;
                const pct = meta?.ja != null ? Math.round(meta.ja) : null;
                const key =
                  pct != null
                    ? 'monatszusammenfassung.gesetzBeschlossenBt'
                    : 'monatszusammenfassung.gesetzBeschlossen';
                return (
                  <p key={id} className={`${styles.line} ${styles.linePositiv}`}>
                    {pct != null ? t(key, { name, pct }) : t(key, { name })}
                  </p>
                );
              })}
              {diff.gescheiterteGesetze.map((id) => {
                const meta = getGesetzMeta(laws, id);
                const name = meta?.kurz ?? id;
                const law = laws.find((l) => l.id === id);
                const grundKey =
                  law?.blockiert === 'bundesrat'
                    ? 'monatszusammenfassung.gesetzGescheitertBr'
                    : 'monatszusammenfassung.gesetzGescheitertBt';
                const ja = meta?.ja != null ? Math.round(meta.ja) : null;
                return (
                  <p key={id} className={`${styles.line} ${styles.lineNegativ}`}>
                    {ja != null ? t(grundKey, { name, ja }) : t('monatszusammenfassung.gesetzGescheitert', { name })}
                  </p>
                );
              })}
            </section>
          )}

          <section className={styles.block}>
            <h3 className={styles.blockTitle}>{t('monatszusammenfassung.blockKennzahlen')}</h3>
            <KpiDeltaZeile
              label={t('monatszusammenfassung.wahlprognose')}
              vor={diff.wahlprognose_vor}
              nach={diff.wahlprognose_nach}
              delta={diff.wahlprognose_delta}
              suffix="%"
            />
            <KpiDeltaZeile
              label={t('monatszusammenfassung.medienklima')}
              vor={diff.medienklima_vor}
              nach={diff.medienklima_nach}
              delta={diff.medienklima_delta}
            />
            <KpiDeltaZeile
              label={t('monatszusammenfassung.saldo')}
              vor={diff.saldo_vor}
              nach={diff.saldo_nach}
              delta={diff.saldo_delta}
              suffix={` ${t('ui.mrd')}`}
              decimals={1}
            />
            {Math.abs(diff.koalition_delta) >= 2 && (
              <KpiDeltaZeile
                label={t('monatszusammenfassung.koalition')}
                vor={diff.koalition_vor}
                nach={diff.koalition_nach}
                delta={diff.koalition_delta}
              />
            )}
          </section>

          {Object.keys(diff.milieu_deltas).length > 0 && (
            <section className={styles.block}>
              <h3 className={styles.blockTitle}>{t('monatszusammenfassung.blockMilieus')}</h3>
              {Object.entries(diff.milieu_deltas)
                .sort((a, b) => Math.abs(b[1]) - Math.abs(a[1]))
                .slice(0, 4)
                .map(([milieuId, delta]) => {
                  const label =
                    t(`milieu.${milieuId}`, { defaultValue: '' }) ||
                    milieuId.replace(/_/g, ' ');
                  const farbe = delta > 0 ? styles.positiv : delta < 0 ? styles.negativ : styles.neutral;
                  const pfeil = delta > 0 ? '▲' : delta < 0 ? '▼' : '→';
                  return (
                    <p key={milieuId} className={styles.line}>
                      <span className={styles.kpiLabel}>{label}</span>{' '}
                      <span className={farbe}>
                        {pfeil}{' '}
                        {delta === 0 ? '±0' : `${delta > 0 ? '+' : ''}${delta}`}
                      </span>
                    </p>
                  );
                })}
            </section>
          )}

          {diff.medien_highlights.length > 0 && (
            <section className={styles.block}>
              <h3 className={styles.blockTitle}>{t('monatszusammenfassung.blockMedien')}</h3>
              {diff.medien_highlights.map((h) => {
                const gutFuerSpieler = h.spieler_perspektive === 'positiv';
                const farbe = gutFuerSpieler ? styles.positiv : styles.negativ;
                const sign = h.delta > 0 ? '+' : '';
                const tooltipKey =
                  h.delta_bedeutung === 'reichweite'
                    ? gutFuerSpieler
                      ? 'monatszusammenfassung.medienTooltipReichweiteGut'
                      : 'monatszusammenfassung.medienTooltipReichweiteSchlecht'
                    : gutFuerSpieler
                      ? 'monatszusammenfassung.medienTooltipStimmungGut'
                      : 'monatszusammenfassung.medienTooltipStimmungSchlecht';
                return (
                  <div key={`${h.akteurId}-${h.delta}`} className={styles.medienRow}>
                    <span className={styles.medienAkteur}>{h.akteurLabel}</span>
                    <span className={farbe} title={t(tooltipKey)}>
                      {' '}
                      {sign}
                      {h.delta}
                    </span>
                    <span className={styles.medienGrund}>{h.grund}</span>
                  </div>
                );
              })}
            </section>
          )}
        </div>

        <div className={styles.footer}>
          <label className={styles.settingRow}>
            <input
              type="checkbox"
              checked={monatszusammenfassung}
              onChange={(e) => setPlayerSettings({ monatszusammenfassung: e.target.checked })}
            />
            <span>{t('monatszusammenfassung.settingAutoShow')}</span>
          </label>
          <div className={styles.actions}>
            <button type="button" className={styles.btn} onClick={onDetails}>
              {t('monatszusammenfassung.details')}
            </button>
            <button type="button" className={styles.btnPrimary} onClick={onWeiter}>
              {t('monatszusammenfassung.weiter')}
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}
