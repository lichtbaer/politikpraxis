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
