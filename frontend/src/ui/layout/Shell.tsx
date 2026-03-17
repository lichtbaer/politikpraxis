import { useEffect } from 'react';
import { Header } from './Header';
import { EbenenTabBar } from '../components/EbenenTabBar/EbenenTabBar';
import { LeftPanel } from '../panels/LeftPanel';
import { CenterPanel } from '../panels/CenterPanel';
import { RightPanel } from '../panels/RightPanel';
import { CharacterDetail } from '../components/CharacterDetail/CharacterDetail';
import { WahlnachtScreen } from '../screens/WahlnachtScreen';
import { Toast } from '../components/Toast/Toast';
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
        <LeftPanel />
        <CenterPanel />
        <RightPanel />
      </div>
      <CharacterDetail />
      <WahlnachtScreen />
      <Toast />
      {aktivesStrukturEvent && <HaushaltsdebatteScreen />}
      <LegislaturBilanzScreen />
    </>
  );
}
