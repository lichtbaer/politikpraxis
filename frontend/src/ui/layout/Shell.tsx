import { useEffect, useState } from 'react';
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
import styles from './Shell.module.css';

export function Shell() {
  useGameTick();
  useAutoSave();
  const aktivesStrukturEvent = useGameStore((s) => s.state.aktivesStrukturEvent);
  const setSpeed = useGameStore((s) => s.setSpeed);
  const togglePause = useGameStore((s) => s.togglePause);

  const [leftOpen, setLeftOpen] = useState(false);
  const [rightOpen, setRightOpen] = useState(false);

  const closeDrawers = () => {
    setLeftOpen(false);
    setRightOpen(false);
  };

  // SMA-295: Keyboard-Shortcuts für Zeitsteuerung
  useEffect(() => {
    const handleKey = (e: KeyboardEvent) => {
      if (e.target instanceof HTMLInputElement || e.target instanceof HTMLTextAreaElement) return;
      if (e.code === 'Space') {
        e.preventDefault();
        togglePause();
      }
      if (e.key === '1') setSpeed(1);
      if (e.key === '3') setSpeed(2);
    };
    window.addEventListener('keydown', handleKey);
    return () => window.removeEventListener('keydown', handleKey);
  }, [setSpeed, togglePause]);

  return (
    <>
      <Header />
      <EbenenTabBar />
      <div className={styles.shell}>
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
        aria-label="Agenda anzeigen"
      >
        ☰
      </button>
      <button
        type="button"
        className={`${styles.drawerToggle} ${styles.toggleRight}`}
        onClick={() => { setRightOpen(!rightOpen); setLeftOpen(false); }}
        aria-label="Kabinett anzeigen"
      >
        👥
      </button>

      <CharacterDetail />
      <WahlnachtScreen />
      <Toast />
      <GameTips />
      {aktivesStrukturEvent && <HaushaltsdebatteScreen />}
      <LegislaturBilanzScreen />
    </>
  );
}
