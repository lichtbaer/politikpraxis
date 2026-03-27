import { useTranslation } from 'react-i18next';
import type { LawStatus } from '../../../core/types';
import styles from './GesetzStepper.module.css';

interface GesetzStepperProps {
  status: LawStatus;
  /** Whether the law requires Bundesrat approval */
  brauchtBundesrat?: boolean;
}

const STEPS_STANDARD: { status: LawStatus; label: string }[] = [
  { status: 'entwurf', label: 'Entwurf' },
  { status: 'eingebracht', label: 'Eingebracht' },
  { status: 'aktiv', label: 'Ausschuss' },
  { status: 'beschlossen', label: 'Beschlossen' },
];

const STEPS_MIT_BUNDESRAT: { status: LawStatus; label: string }[] = [
  { status: 'entwurf', label: 'Entwurf' },
  { status: 'eingebracht', label: 'Eingebracht' },
  { status: 'aktiv', label: 'Ausschuss' },
  { status: 'bt_passed', label: 'BT ✓' },
  { status: 'beschlossen', label: 'Beschlossen' },
];

const STATUS_ORDER: Record<LawStatus, number> = {
  entwurf: 0,
  eingebracht: 1,
  aktiv: 2,
  bt_passed: 3,
  beschlossen: 4,
  blockiert: -1,
  ausweich: -1,
  br_einspruch: -1,
};

function getStepClass(stepStatus: LawStatus, currentStatus: LawStatus): string {
  if (currentStatus === 'blockiert') {
    // For blocked laws, show steps up to aktiv as done, then blockiert
    const stepIdx = STATUS_ORDER[stepStatus];
    return stepIdx <= 2 ? styles.done : styles.blocked;
  }
  if (currentStatus === 'ausweich') {
    const stepIdx = STATUS_ORDER[stepStatus];
    return stepIdx <= 2 ? styles.done : styles.ausweich;
  }
  const currentIdx = STATUS_ORDER[currentStatus];
  const stepIdx = STATUS_ORDER[stepStatus];
  if (stepIdx < currentIdx) return styles.done;
  if (stepIdx === currentIdx) return styles.active;
  return styles.pending;
}

export function GesetzStepper({ status, brauchtBundesrat }: GesetzStepperProps) {
  const { t } = useTranslation('game');
  const steps = brauchtBundesrat ? STEPS_MIT_BUNDESRAT : STEPS_STANDARD;

  return (
    <div className={styles.stepper}>
      {steps.map((step, i) => (
        <div key={step.status} className={styles.stepWrap}>
          <div className={`${styles.dot} ${getStepClass(step.status, status)}`} />
          <span className={`${styles.label} ${getStepClass(step.status, status)}`}>
            {step.label}
          </span>
          {i < steps.length - 1 && (
            <div className={`${styles.connector} ${getStepClass(step.status, status)}`} />
          )}
        </div>
      ))}
      {status === 'blockiert' && (
        <div className={styles.blockedBadge}>{t('gesetzStepper.blockiert')}</div>
      )}
      {status === 'ausweich' && (
        <div className={styles.ausweichBadge}>{t('gesetzStepper.ausweichroute')}</div>
      )}
    </div>
  );
}
