/**
 * SMA-320: Sidebar reduziert — nur permanente KPIs
 * Behalten: Wahlprognose, MedienklimaBadge, KoalitionsStabilität, HaushaltAmpel, MilieuBalken3, EreignisLog compact
 * Entfernt: Kabinett-Liste, Politikfeld-Icons, Koalitionspartner-Panel (→ KabinettView)
 */
import { useTranslation } from 'react-i18next';
import { useGameStore } from '../../store/gameStore';
import { CoalitionMeter } from '../components/CoalitionMeter/CoalitionMeter';
import { MedienklimaBadge } from '../components/MedienklimaBadge/MedienklimaBadge';
import { MilieuSidebar } from '../components/MilieuSidebar/MilieuSidebar';
import { ApprovalChart } from '../components/ApprovalChart/ApprovalChart';
import { formatMrdSaldo } from '../../utils/format';
import { Erklaerung } from '../components/Erklaerung/Erklaerung';
import styles from './LeftPanel.module.css';

const EMPTY_APPROVAL_HISTORY: number[] = [];

function getSaldoKlasse(saldo: number): string {
  if (saldo > 0) return 'saldoAusgeglichen';
  if (saldo >= -15) return 'saldoDefizit';
  if (saldo >= -30) return 'saldoKritisch';
  return 'saldoKrise';
}

export function LeftPanel() {
  const { t } = useTranslation('game');
  const zustG = useGameStore((s) => s.state.zust.g);
  const electionThreshold = useGameStore((s) => s.state.electionThreshold ?? 40);
  const coalition = useGameStore((s) => s.state.coalition);
  const approvalHistory = useGameStore((s) => s.state.approvalHistory) ?? EMPTY_APPROVAL_HISTORY;
  const haushalt = useGameStore((s) => s.state.haushalt);
  const complexity = useGameStore((s) => s.complexity);

  return (
    <aside className={styles.panel}>
      <section className={styles.section}>
        <h3 className={styles.sectionTitle}><Erklaerung begriff="wahlprognose" kinder={t('game:leftPanel.wahlprognose')} /></h3>
        <div className={styles.wahlprognose}>
          <span
            className={styles.wahlprognoseValue}
            style={{ color: zustG >= electionThreshold ? 'var(--green)' : zustG >= electionThreshold - 5 ? 'var(--warn)' : 'var(--red)' }}
          >{Math.round(zustG)}%</span>
          <div className={styles.progressBar}>
            <div
              className={styles.progressFill}
              style={{
                width: `${Math.min(100, zustG)}%`,
                background: zustG >= electionThreshold ? 'var(--green)' : zustG >= electionThreshold - 5 ? 'var(--warn)' : 'var(--red)',
              }}
            />
          </div>
          <span className={styles.target}>{t('game:leftPanel.target', { percent: electionThreshold })}</span>
        </div>
        <MedienklimaBadge />
        <ApprovalChart history={approvalHistory} threshold={electionThreshold} />
      </section>

      <section className={styles.section}>
        <h3 className={styles.sectionTitle}><Erklaerung begriff="koalitionsstabilitaet" kinder={t('game:leftPanel.koalitionsstabilitaet')} /></h3>
        <CoalitionMeter value={coalition} />
      </section>

      {haushalt && complexity >= 2 && (
        <section className={styles.section}>
          <h3 className={styles.sectionTitle}><Erklaerung begriff="haushaltssaldo" kinder={t('haushalt.saldo')} /></h3>
          <div className={`${styles.haushaltAmpel} ${styles[getSaldoKlasse(haushalt.saldo)]}`}>
            <span className={styles.haushaltSaldo}>
              {formatMrdSaldo(haushalt.saldo)}
            </span>
          </div>
        </section>
      )}

      <section className={styles.section}>
        <h3 className={styles.sectionTitle}><Erklaerung begriff="milieus" kinder={t('game:leftPanel.milieus')} /></h3>
        <MilieuSidebar />
      </section>

      {/* SMA-321: Ereignisprotokoll nur im rechten Panel, nicht in der Sidebar */}
    </aside>
  );
}
