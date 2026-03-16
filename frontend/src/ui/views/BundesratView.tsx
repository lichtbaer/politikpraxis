import { useEffect, useRef } from 'react';
import Phaser from 'phaser';
import { PhaserContainer, type PhaserContainerHandle } from '../../phaser/PhaserContainer';
import { BundesratScene } from '../../phaser/scenes/BundesratScene';
import { useGameStore } from '../../store/gameStore';
import { useUIStore } from '../../store/uiStore';
import styles from './BundesratView.module.css';

export function BundesratView() {
  const bundesrat = useGameStore(s => s.state.bundesrat);
  const lobbyLand = useGameStore(s => s.doLobbyLand);
  const phaserRef = useRef<PhaserContainerHandle>(null);

  const phaserConfig: Phaser.Types.Core.GameConfig = {
    type: Phaser.AUTO,
    width: 440,
    height: 380,
    backgroundColor: '#1a1712',
    scene: [BundesratScene],
    banner: false,
  };

  useEffect(() => {
    const scene = phaserRef.current?.getScene<BundesratScene>('bundesrat');
    if (scene) {
      scene.updateLaender(bundesrat);
      scene.setClickHandler((landId) => {
        useUIStore.getState().showToast(`Land: ${landId}`);
      });
    }
  }, [bundesrat]);

  return (
    <div className={styles.container}>
      <div className={styles.header}>
        <h2 className={styles.title}>Bundesrat</h2>
        <p className={styles.subtitle}>
          16 Bundesländer mit eigenen Ministerpräsidenten. Lobbying beeinflusst Abstimmungsverhalten.
        </p>
      </div>
      <PhaserContainer ref={phaserRef} config={phaserConfig} className={styles.map} />
      <div className={styles.legend}>
        <span className={styles.legendItem}>
          <span className={styles.dot} style={{ background: '#5a9870' }} /> Koalition
        </span>
        <span className={styles.legendItem}>
          <span className={styles.dot} style={{ background: '#9a9080' }} /> Neutral
        </span>
        <span className={styles.legendItem}>
          <span className={styles.dot} style={{ background: '#c05848' }} /> Opposition
        </span>
      </div>
    </div>
  );
}
