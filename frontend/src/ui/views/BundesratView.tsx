import { useEffect, useRef } from 'react';
import Phaser from 'phaser';
import { PhaserContainer, type PhaserContainerHandle } from '../../phaser/PhaserContainer';
import { BundesratScene } from '../../phaser/scenes/BundesratScene';
import { useGameStore } from '../../store/gameStore';
import { useUIStore } from '../../store/uiStore';
import { isLobbyingActive } from '../../core/systems/bundesrat';
import styles from './BundesratView.module.css';

const PK_SCHICHT_1 = 15;
const PK_SCHICHT_1_REDUZIERT = 10;

function getPkCost(beziehung: number): number {
  return beziehung >= 60 && beziehung <= 79 ? PK_SCHICHT_1_REDUZIERT : PK_SCHICHT_1;
}

export function BundesratView() {
  const state = useGameStore(s => s.state);
  const doLobbyFraktion = useGameStore(s => s.doLobbyFraktion);
  const bundesrat = state.bundesrat;
  const phaserRef = useRef<PhaserContainerHandle>(null);

  const activeLaws = state.gesetze.filter(g => g.status === 'bt_passed' && isLobbyingActive(state, g.id));

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

      {activeLaws.length > 0 && (
        <div className={styles.lobbyPanel}>
          <h3 className={styles.lobbyTitle}>Lobbying (3-Monats-Fenster)</h3>
          {activeLaws.map((law) => (
            <div key={law.id} className={styles.lobbyLaw}>
              <span className={styles.lobbyLawName}>{law.kurz}</span>
              <span className={styles.lobbyLawCountdown}>
                Abstimmung in {law.brVoteMonth! - state.month} Monaten
              </span>
              <div className={styles.fraktionen}>
                {state.bundesratFraktionen.map((f) => {
                  const lobby = law.lobbyFraktionen?.[f.id];
                  const pkCost = getPkCost(f.beziehung);
                  const canPk = !lobby?.pkInvestiert && state.pk >= pkCost && f.beziehung >= 20;
                  return (
                    <div key={f.id} className={styles.fraktionRow}>
                      <span className={styles.fraktionName} style={{ color: f.sprecher.color }}>
                        {f.sprecher.name}: {f.beziehung} Beziehung
                      </span>
                      {canPk && (
                        <button
                          type="button"
                          className={styles.btn}
                          onClick={() => doLobbyFraktion(f.id, law.id, 1)}
                        >
                          PK-Investition ({pkCost} PK)
                        </button>
                      )}
                      {lobby?.pkInvestiert && (
                        <span className={styles.done}>✓ PK investiert</span>
                      )}
                    </div>
                  );
                })}
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}
