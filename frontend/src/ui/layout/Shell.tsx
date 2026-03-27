import { useEffect, useState } from 'react';
import { useTranslation } from 'react-i18next';
import { Header } from './Header';
import { EbenenTabBar } from '../components/EbenenTabBar/EbenenTabBar';
import { LeftPanel } from '../panels/LeftPanel';
import { CenterPanel } from '../panels/CenterPanel';
import { RightPanel } from '../panels/RightPanel';
import { CharacterDetail } from '../components/CharacterDetail/CharacterDetail';
import { WahlnachtScreen } from '../screens/WahlnachtScreen';
import { Toast } from '../components/Toast/Toast';
import { GameTips } from '../components/GameTips/GameTips';
import { HaushaltsdebatteScreen } from '../screens/HaushaltsdebatteScreen';
import { LegislaturBilanzScreen } from '../screens/LegislaturBilanzScreen';
import { useGameTick } from '../hooks/useGameTick';
import { useAutoSave } from '../hooks/useAutoSave';
import { useGameStore } from '../../store/gameStore';
import { useUIStore } from '../../store/uiStore';
import type { ViewName } from '../../core/types';
import { Users } from '../icons';
import { MonatszusammenfassungModal } from '../components/MonatszusammenfassungModal/MonatszusammenfassungModal';
import styles from './Shell.module.css';

/** Alt+number → view tab mapping */
const ALT_VIEW_MAP: Record<string, ViewName> = {
  '1': 'agenda',
  '2': 'bundestag',
  '3': 'kabinett',
  '4': 'haushalt',
  '5': 'medien',
  '6': 'verbaende',
  '7': 'bundesrat',
  '8': 'laender',
  '9': 'kommunen',
  '0': 'eu',
};

export function Shell() {
  const { t } = useTranslation('game');
  useGameTick();
  useAutoSave();
  const aktivesStrukturEvent = useGameStore((s) => s.state.aktivesStrukturEvent);
  const letzterMonatsDiff = useGameStore((s) => s.state.letzterMonatsDiff);
  const laws = useGameStore((s) => s.content.laws);
  const setSpeed = useGameStore((s) => s.setSpeed);
  const togglePause = useGameStore((s) => s.togglePause);
  const speed = useGameStore((s) => s.state.speed);
  const doResolveEvent = useGameStore((s) => s.doResolveEvent);
  const setView = useGameStore((s) => s.setView);
  const openMonatszusammenfassung = useUIStore((s) => s.openMonatszusammenfassung);
  const setOpenMonatszusammenfassung = useUIStore((s) => s.setOpenMonatszusammenfassung);
  const requestFocusEreignisprotokoll = useUIStore((s) => s.requestFocusEreignisprotokoll);

  const [leftOpen, setLeftOpen] = useState(false);
  const [rightOpen, setRightOpen] = useState(false);
  const [showShortcuts, setShowShortcuts] = useState(false);

  const closeDrawers = () => {
    setLeftOpen(false);
    setRightOpen(false);
  };

  // SMA-295: Keyboard-Shortcuts für Zeitsteuerung + Event-Auswahl
  useEffect(() => {
    const handleKey = (e: KeyboardEvent) => {
      if (e.target instanceof HTMLInputElement || e.target instanceof HTMLTextAreaElement) return;

      // Escape: Drawers schließen
      if (e.key === 'Escape') {
        closeDrawers();
        return;
      }

      const { activeEvent, pk } = useGameStore.getState().state;

      // Event-Shortcuts: Ziffern 1-3 wählen Choice, Enter bestätigt bei einzelner Choice
      if (activeEvent) {
        if (e.key === 'Enter' && activeEvent.choices.length === 1) {
          const choice = activeEvent.choices[0];
          if (pk >= (choice.cost || 0)) {
            e.preventDefault();
            doResolveEvent(activeEvent, choice);
          }
          return;
        }
        const choiceIdx = parseInt(e.key, 10) - 1;
        if (choiceIdx >= 0 && choiceIdx < activeEvent.choices.length) {
          const choice = activeEvent.choices[choiceIdx];
          if (pk >= (choice.cost || 0)) {
            e.preventDefault();
            doResolveEvent(activeEvent, choice);
          }
          return;
        }
      }

      // ? — Shortcut-Hilfe anzeigen
      if (e.key === '?' || (e.shiftKey && e.code === 'Slash')) {
        e.preventDefault();
        setShowShortcuts((prev) => !prev);
        return;
      }

      // Alt + Ziffer — Tab-Wechsel
      if (e.altKey && ALT_VIEW_MAP[e.key]) {
        e.preventDefault();
        setView(ALT_VIEW_MAP[e.key]);
        return;
      }

      // Geschwindigkeits-Steuerung (nur wenn kein Event aktiv)
      if (e.code === 'Space') {
        e.preventDefault();
        togglePause();
      }
      if (e.key === '1') setSpeed(1);
      if (e.key === '3') setSpeed(2);
    };
    window.addEventListener('keydown', handleKey);
    return () => window.removeEventListener('keydown', handleKey);
  }, [setSpeed, togglePause, doResolveEvent, setView]);

  return (
    <>
      <Header />
      <EbenenTabBar />
      <div className={`${styles.shell} ${speed === 0 ? styles.shellPaused : ''}`}>
        {speed === 0 && (
          <div className={styles.pauseOverlay} aria-hidden="true" />
        )}
        <div className={`${styles.left} ${leftOpen ? styles.open : ''}`}>
          <LeftPanel />
        </div>
        <CenterPanel />
        <div className={`${styles.right} ${rightOpen ? styles.open : ''}`}>
          <RightPanel />
        </div>
      </div>

      {(leftOpen || rightOpen) && (
        <div className={styles.drawerOverlay} onClick={closeDrawers} />
      )}

      <button
        type="button"
        className={`${styles.drawerToggle} ${styles.toggleLeft}`}
        onClick={() => { setLeftOpen(!leftOpen); setRightOpen(false); }}
        aria-label={t('shortcuts.showAgenda')}
      >
        ☰
      </button>
      <button
        type="button"
        className={`${styles.drawerToggle} ${styles.toggleRight}`}
        onClick={() => { setRightOpen(!rightOpen); setLeftOpen(false); }}
        aria-label={t('shortcuts.showKabinett')}
      >
        <Users size={18} />
      </button>

      <CharacterDetail />
      <WahlnachtScreen />
      <Toast />
      <GameTips />
      {aktivesStrukturEvent && <HaushaltsdebatteScreen />}
      <LegislaturBilanzScreen />

      {openMonatszusammenfassung && letzterMonatsDiff && (
        <MonatszusammenfassungModal
          diff={letzterMonatsDiff}
          laws={laws}
          onWeiter={() => setOpenMonatszusammenfassung(false)}
          onDetails={() => {
            setOpenMonatszusammenfassung(false);
            setRightOpen(true);
            setLeftOpen(false);
            requestFocusEreignisprotokoll();
          }}
        />
      )}

      {/* Keyboard Shortcuts Help */}
      {showShortcuts && (
        <div className={styles.shortcutOverlay} onClick={() => setShowShortcuts(false)}>
          <div className={styles.shortcutModal} onClick={(e) => e.stopPropagation()}>
            <h3 className={styles.shortcutTitle}>{t('shortcuts.title')}</h3>
            <div className={styles.shortcutGrid}>
              <kbd>{t('shortcuts.space')}</kbd><span>{t('shortcuts.pauseResume')}</span>
              <kbd>1</kbd><span>{t('shortcuts.slowSpeed')}</span>
              <kbd>3</kbd><span>{t('shortcuts.fastSpeed')}</span>
              <kbd>Esc</kbd><span>{t('shortcuts.closeDrawer')}</span>
              <kbd>1-3</kbd><span>{t('shortcuts.eventChoice')}</span>
              <kbd>Enter</kbd><span>{t('shortcuts.confirmOnly')}</span>
              <kbd>Alt+1–0</kbd><span>{t('shortcuts.switchTab')}</span>
              <kbd>?</kbd><span>{t('shortcuts.showHelp')}</span>
            </div>
            <button
              type="button"
              className={styles.shortcutClose}
              onClick={() => setShowShortcuts(false)}
            >
              {t('shortcuts.close')}
            </button>
          </div>
        </div>
      )}
    </>
  );
}
