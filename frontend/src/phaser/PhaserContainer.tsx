import { useEffect, useRef, forwardRef, useImperativeHandle } from 'react';
import Phaser from 'phaser';

interface PhaserContainerProps {
  config: Phaser.Types.Core.GameConfig;
  onReady?: (game: Phaser.Game) => void;
  className?: string;
}

export interface PhaserContainerHandle {
  game: Phaser.Game | null;
  getScene: <T extends Phaser.Scene>(key: string) => T | undefined;
}

export const PhaserContainer = forwardRef<PhaserContainerHandle, PhaserContainerProps>(
  function PhaserContainer({ config, onReady, className }, ref) {
    const containerRef = useRef<HTMLDivElement>(null);
    const gameRef = useRef<Phaser.Game | null>(null);

    useImperativeHandle(ref, () => ({
      game: gameRef.current,
      getScene: <T extends Phaser.Scene>(key: string) => {
        return gameRef.current?.scene.getScene(key) as T | undefined;
      },
    }));

    useEffect(() => {
      if (!containerRef.current) return;

      const game = new Phaser.Game({
        ...config,
        parent: containerRef.current,
      });

      gameRef.current = game;
      onReady?.(game);

      return () => {
        game.destroy(true);
        gameRef.current = null;
      };
    }, []); // eslint-disable-line react-hooks/exhaustive-deps

    return <div ref={containerRef} className={className} />;
  },
);
