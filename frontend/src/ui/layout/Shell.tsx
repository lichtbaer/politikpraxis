import { Header } from './Header';
import { LeftPanel } from '../panels/LeftPanel';
import { CenterPanel } from '../panels/CenterPanel';
import { RightPanel } from '../panels/RightPanel';
import { CharacterDetail } from '../components/CharacterDetail/CharacterDetail';
import { EndScreen } from '../components/EndScreen/EndScreen';
import { Toast } from '../components/Toast/Toast';
import { useGameTick } from '../hooks/useGameTick';
import { useAutoSave } from '../hooks/useAutoSave';
import styles from './Shell.module.css';

export function Shell() {
  useGameTick();
  useAutoSave();

  return (
    <>
      <Header />
      <div className={styles.shell}>
        <LeftPanel />
        <CenterPanel />
        <RightPanel />
      </div>
      <CharacterDetail />
      <EndScreen />
      <Toast />
    </>
  );
}
