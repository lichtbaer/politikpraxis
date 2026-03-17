/**
 * SMA-274: Gesetz-Agenda View — Alle Gesetze auf allen Stufen sichtbar.
 * SMA-290: Stufe 1-2: Einfache Liste. Stufe 3+: Gruppierung (VORBEREITUNG LÄUFT | BEREIT ZUM EINBRINGEN | NOCH KEINE VORBEREITUNG)
 * SMA-287: Top-3 Gesetze mit Empfohlen-Badge (Kongruenz zur Spieler-Ausrichtung)
 */
import { useTranslation } from 'react-i18next';
import { useGameStore } from '../../store/gameStore';
import { AgendaCard } from '../components/AgendaCard/AgendaCard';
import { featureActive } from '../../core/systems/features';
import { gesetzKongruenz } from '../../core/ideologie';
import type { Law, LawStatus } from '../../core/types';
import styles from './GesetzAgendaView.module.css';

const STATUS_ORDER: LawStatus[] = ['blockiert', 'aktiv', 'ausweich', 'entwurf', 'beschlossen'];

function orderLawsSimple(laws: Law[]): Law[] {
  const byStatus = new Map<LawStatus, Law[]>();
  for (const law of laws) {
    const arr = byStatus.get(law.status) ?? [];
    arr.push(law);
    byStatus.set(law.status, arr);
  }
  const result: Law[] = [];
  for (const status of STATUS_ORDER) {
    const arr = byStatus.get(status);
    if (arr) result.push(...arr);
  }
  return result;
}

function gruppiereGesetze(
  laws: Law[],
  gesetzProjekte: Record<string, { aktiveVorstufen: { abgeschlossen: boolean }[]; boni: { btStimmenBonus: number } }> | undefined,
): { vorbereitungLaeuft: Law[]; bereitEinbringen: Law[]; keineVorbereitung: Law[]; andere: Law[] } {
  const vorbereitungLaeuft: Law[] = [];
  const bereitEinbringen: Law[] = [];
  const keineVorbereitung: Law[] = [];
  const andere: Law[] = [];

  for (const law of laws) {
    if (law.status !== 'entwurf') {
      andere.push(law);
      continue;
    }

    const projekt = gesetzProjekte?.[law.id];
    const hatAktiveVorstufen = projekt?.aktiveVorstufen?.some((v) => !v.abgeschlossen) ?? false;
    const hatBoni = (projekt?.boni?.btStimmenBonus ?? 0) > 0;

    if (hatAktiveVorstufen) {
      vorbereitungLaeuft.push(law);
    } else if (hatBoni) {
      bereitEinbringen.push(law);
    } else {
      keineVorbereitung.push(law);
    }
  }

  return { vorbereitungLaeuft, bereitEinbringen, keineVorbereitung, andere };
}

function getTop3Empfohlen(keineVorbereitung: Law[], ausrichtung: { wirtschaft: number; gesellschaft: number; staat: number }): Set<string> {
  if (keineVorbereitung.length === 0) return new Set();
  const sorted = [...keineVorbereitung]
    .map((law) => ({ law, kongruenz: gesetzKongruenz(ausrichtung, law) }))
    .sort((a, b) => b.kongruenz - a.kongruenz);
  return new Set(sorted.slice(0, 3).map(({ law }) => law.id));
}

export function GesetzAgendaView() {
  const { t } = useTranslation('game');
  const { state, ausrichtung, complexity } = useGameStore();
  const showGruppierung = featureActive(complexity, 'gesetz_agenda');

  const { vorbereitungLaeuft, bereitEinbringen, keineVorbereitung, andere } = gruppiereGesetze(
    state.gesetze,
    state.gesetzProjekte,
  );

  const top3Empfohlen = getTop3Empfohlen(keineVorbereitung, ausrichtung);

  // Stufe 1-2: Einfache Liste (alle Gesetze, keine Gruppierung)
  if (!showGruppierung) {
    const ordered = orderLawsSimple(state.gesetze);
    return (
      <div className={styles.root}>
        <h1 className={styles.title}>{t('game:gesetzAgenda.title')}</h1>
        <div className={styles.list}>
          {ordered.map((law) => (
            <AgendaCard key={law.id} law={law} />
          ))}
        </div>
      </div>
    );
  }

  // Stufe 3+: Gruppierte Ansicht
  return (
    <div className={styles.root}>
      <h1 className={styles.title}>{t('game:gesetzAgenda.title')}</h1>

      {andere.length > 0 && (
        <section className={styles.section}>
          <h2 className={styles.sectionTitle}>{t('game:gesetzAgenda.andere', { count: andere.length })}</h2>
          <div className={styles.list}>
            {andere.map((law) => (
              <AgendaCard key={law.id} law={law} />
            ))}
          </div>
        </section>
      )}

      {vorbereitungLaeuft.length > 0 && (
        <section className={styles.section}>
          <h2 className={styles.sectionTitle}>
            {t('game:gesetzAgenda.vorbereitungLaeuft', { count: vorbereitungLaeuft.length })}
          </h2>
          <div className={styles.list}>
            {vorbereitungLaeuft.map((law) => (
              <AgendaCard key={law.id} law={law} />
            ))}
          </div>
        </section>
      )}

      {bereitEinbringen.length > 0 && (
        <section className={styles.section}>
          <h2 className={styles.sectionTitle}>
            {t('game:gesetzAgenda.bereitEinbringen', { count: bereitEinbringen.length })}
          </h2>
          <p className={styles.hinweis}>{t('game:gesetzAgenda.empfehlungEinbringen')}</p>
          <div className={styles.list}>
            {bereitEinbringen.map((law) => (
              <AgendaCard key={law.id} law={law} />
            ))}
          </div>
        </section>
      )}

      {keineVorbereitung.length > 0 && (
        <section className={styles.section}>
          <h2 className={styles.sectionTitle}>
            {t('game:gesetzAgenda.keineVorbereitung', { count: keineVorbereitung.length })}
          </h2>
          <div className={styles.list}>
            {keineVorbereitung.map((law) => (
              <AgendaCard key={law.id} law={law} isRecommended={top3Empfohlen.has(law.id)} />
            ))}
          </div>
        </section>
      )}

      {vorbereitungLaeuft.length === 0 && bereitEinbringen.length === 0 && keineVorbereitung.length === 0 && andere.length === 0 && (
        <p className={styles.leer}>{t('game:gesetzAgenda.leer')}</p>
      )}
    </div>
  );
}
