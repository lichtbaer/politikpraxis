import { useState } from 'react';
import { useShallow } from 'zustand/react/shallow';
import { useTranslation } from 'react-i18next';
import { useGameStore } from '../../store/gameStore';
import { useAuthStore } from '../../store/authStore';
import { useUIStore } from '../../store/uiStore';
import { upsertSaveSlot } from '../../services/saves';
import { saveGame } from '../../services/localStorageSave';
import { useGameActions } from '../hooks/useGameActions';
import { featureActive } from '../../core/systems/features';
import { PK_REGEN_DIVISOR, PK_REGEN_MIN } from '../../core/constants';
import { PLAYTEST_CONFIG } from '../../config/playtest';
import { PressemitteilungModal } from '../components/PressemitteilungModal/PressemitteilungModal';
import { Glossar } from '../components/Glossar/Glossar';
import { Erklaerung } from '../components/Erklaerung/Erklaerung';
import { LoginModal } from '../components/LoginModal/LoginModal';
import { UserTestFeedbackModal } from '../components/UserTestFeedbackModal/UserTestFeedbackModal';
import type { SpeedLevel } from '../../core/types';
import { Megaphone } from '../icons';
import styles from './Header.module.css';

export function Header() {
  const { t } = useTranslation();
  const { t: tGame } = useTranslation('game');
  const accessToken = useAuthStore((s) => s.accessToken);
  const [manualSlot, setManualSlot] = useState(2);
  const [showPressemitteilungModal, setShowPressemitteilungModal] = useState(false);
  const [showGlossar, setShowGlossar] = useState(false);
  const [showLoginModal, setShowLoginModal] = useState(false);
  const [showFeedbackModal, setShowFeedbackModal] = useState(false);
  const isLoggedIn = useAuthStore((s) => s.isLoggedIn);
  const email = useAuthStore((s) => s.email);
  const logout = useAuthStore((s) => s.logout);
  const deleteAccount = useAuthStore((s) => s.deleteAccount);
  const { month, speed, pk, letztesPressemitteilungMonat, zustG, letzterMonatsDiff } = useGameStore(
    useShallow(s => ({
      month: s.state.month,
      speed: s.state.speed,
      pk: s.state.pk,
      letztesPressemitteilungMonat: s.state.letztesPressemitteilungMonat,
      zustG: s.state.zust.g,
      letzterMonatsDiff: s.state.letzterMonatsDiff,
    })),
  );
  const setOpenMonatszusammenfassung = useUIStore((s) => s.setOpenMonatszusammenfassung);
  const complexity = useGameStore((s) => s.complexity);
  const playerName = useGameStore((s) => s.playerName);
  const ausrichtung = useGameStore((s) => s.ausrichtung);
  const spielerPartei = useGameStore((s) => s.spielerPartei);
  const kanzlerGeschlecht = useGameStore((s) => s.kanzlerGeschlecht);
  const { setSpeed, doPressemitteilung } = useGameActions();

  const manualSave = () => {
    const tok = useAuthStore.getState().accessToken;
    if (!tok) return;
    const { state } = useGameStore.getState();
    void upsertSaveSlot(tok, manualSlot, {
      gameState: state,
      complexity,
      playerName,
      ausrichtung,
      spielerPartei,
      kanzlerGeschlecht: state.kanzlerGeschlecht ?? kanzlerGeschlecht,
    })
      .then(() => {
        useUIStore.getState().showToast(t('game.manualSaveOk'), 'success');
      })
      .catch(() => {
        saveGame({
          gameState: state,
          playerName: state.kanzlerName ?? playerName,
          complexity,
          ausrichtung,
          spielerPartei: state.spielerPartei,
          kanzlerGeschlecht: state.kanzlerGeschlecht ?? kanzlerGeschlecht,
        });
        useUIStore.getState().showToast(t('game.manualSaveFallback'), 'warning');
      });
  };

  const pkRegenDivisor = PK_REGEN_DIVISOR + (complexity - 1) * 3;
  const pkRegen = Math.max(PK_REGEN_MIN, Math.floor(zustG / pkRegenDivisor));
  const pkRegenTooltip = t('game:headerUI.pkRegenTooltip', {
    regen: pkRegen,
    approval: Math.round(zustG),
    divisor: pkRegenDivisor,
  });

  const canPressemitteilung =
    featureActive(complexity, 'pressemitteilung') &&
    letztesPressemitteilungMonat !== month &&
    pk >= 5;
  const year = 2025 + Math.floor((month - 1) / 12);

  /** Tooltips aus common.json (game.speed.*) — game.speed.* in game.json existiert nicht */
  const pauseTooltip = t('game.speed.pauseTitle');
  const speeds: { level: SpeedLevel; label: string; title: string; shortcut: string }[] = [
    { level: 0, label: '⏸', title: pauseTooltip, shortcut: '␣' },
    { level: 1, label: t('game.speed.slow'), title: t('game.speed.slowTitle'), shortcut: '1' },
    { level: 2, label: t('game.speed.fast'), title: t('game.speed.fastTitle'), shortcut: '3' },
  ];

  return (
    <header className={styles.header}>
      <div className={styles.title}>{t('app.title')}</div>
      <div className={styles.meta}>
        {PLAYTEST_CONFIG.playtest_modus && (
          <button
            type="button"
            className={styles.playtestFeedbackBtn}
            onClick={() => setShowFeedbackModal(true)}
          >
            🐛 {t('header.playtestFeedback')}
          </button>
        )}
        <div className={styles.monthRow}>
          <span>{t('header.monthFormat', { month, year })}</span>
          {letzterMonatsDiff && (
            <button
              type="button"
              className={styles.monatsSummaryBtn}
              onClick={() => setOpenMonatszusammenfassung(true)}
              title={tGame('monatszusammenfassung.topBarTitle', { monat: letzterMonatsDiff.monat })}
            >
              {tGame('monatszusammenfassung.topBarButton')}
            </button>
          )}
        </div>
        <div className={styles.speedRow}>
          {speed === 0 && (
            <span className={styles.pauseBadge}>{t('header.paused')}</span>
          )}
          {speeds.map(s => (
            <button
              key={s.level}
              type="button"
              className={`${styles.spd} ${speed === s.level ? styles.on : ''}`}
              onClick={() => setSpeed(s.level)}
              title={s.title}
              aria-label={s.level === 0 ? pauseTooltip : undefined}
            >
              {s.label}
              <kbd className={styles.kbd}>{s.shortcut}</kbd>
            </button>
          ))}
        </div>
        <div className={styles.pk} title={pkRegenTooltip}>
          <Erklaerung begriff="pk" kinder="PK" inline /> <span>{pk}</span>
          <div className={styles.pkBar}>
            <div className={styles.pkBarFill} style={{ width: `${Math.min(100, (pk / 150) * 100)}%` }} />
          </div>
          <span className={styles.pkRegen}>{t('game:headerUI.pkRegen', { regen: pkRegen })}</span>
        </div>
        <div className={styles.authSlot}>
          {!isLoggedIn ? (
            <button type="button" className={styles.authBtn} onClick={() => setShowLoginModal(true)}>
              {t('auth.signIn')}
            </button>
          ) : (
            <div className={styles.userMenu}>
              <span className={styles.userEmail} title={email ?? ''}>
                {email && email.length > 28 ? `${email.slice(0, 26)}…` : email}
              </span>
              <button type="button" className={styles.authBtnSecondary} onClick={() => void logout()}>
                {t('auth.signOut')}
              </button>
              <button
                type="button"
                className={styles.authBtnDanger}
                onClick={() => {
                  if (window.confirm(t('auth.deleteConfirm'))) {
                    void deleteAccount();
                  }
                }}
              >
                {t('auth.deleteAccount')}
              </button>
            </div>
          )}
        </div>
        {canPressemitteilung && (
          <button
            type="button"
            className={styles.pressemitteilungBtn}
            onClick={() => setShowPressemitteilungModal(true)}
          >
            <Megaphone size={14} /> {t('game:pressemitteilung.button')}
          </button>
        )}
        {isLoggedIn && accessToken && (
          <div className={styles.cloudSave}>
            <select
              className={styles.saveSlotSelect}
              value={manualSlot}
              onChange={(e) => setManualSlot(Number(e.target.value))}
              aria-label={t('game.manualSaveSlotLabel')}
            >
              <option value={1}>1</option>
              <option value={2}>2</option>
              <option value={3}>3</option>
            </select>
            <button
              type="button"
              className={styles.saveCloudBtn}
              onClick={manualSave}
              title={t('game.manualSaveTooltip')}
            >
              💾
            </button>
          </div>
        )}
        <button
          type="button"
          className={styles.glossarBtn}
          onClick={() => setShowGlossar(true)}
          title={t('game:headerUI.glossarTitle')}
        >
          ?
        </button>
      </div>
      {showPressemitteilungModal && (
        <PressemitteilungModal
          onConfirm={(thema) => doPressemitteilung(thema)}
          onClose={() => setShowPressemitteilungModal(false)}
        />
      )}
      {showGlossar && <Glossar onClose={() => setShowGlossar(false)} />}
      {showLoginModal && <LoginModal onClose={() => setShowLoginModal(false)} />}
      {showFeedbackModal && (
        <UserTestFeedbackModal kontext="header" onClose={() => setShowFeedbackModal(false)} />
      )}
    </header>
  );
}
