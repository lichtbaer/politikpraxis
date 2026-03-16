import Phaser from 'phaser';
import type { BundesratLand } from '../../core/types';

const LAND_POSITIONS: Record<string, { x: number; y: number; w: number; h: number }> = {
  SH: { x: 200, y: 20,  w: 60, h: 40 },
  HH: { x: 210, y: 65,  w: 30, h: 25 },
  MV: { x: 290, y: 30,  w: 80, h: 40 },
  HB: { x: 170, y: 80,  w: 25, h: 20 },
  NI: { x: 150, y: 100, w: 90, h: 60 },
  BE: { x: 330, y: 95,  w: 25, h: 25 },
  BB: { x: 310, y: 80,  w: 70, h: 60 },
  ST: { x: 270, y: 100, w: 50, h: 55 },
  NW: { x: 100, y: 140, w: 70, h: 60 },
  HE: { x: 150, y: 190, w: 50, h: 50 },
  TH: { x: 240, y: 160, w: 50, h: 40 },
  SN: { x: 300, y: 150, w: 60, h: 50 },
  RP: { x: 95,  y: 215, w: 45, h: 55 },
  SL: { x: 80,  y: 260, w: 30, h: 25 },
  BW: { x: 140, y: 255, w: 70, h: 60 },
  BY: { x: 220, y: 230, w: 100, h: 90 },
};

const ALIGNMENT_COLORS: Record<string, number> = {
  koalition: 0x5a9870,
  neutral: 0x9a9080,
  opposition: 0xc05848,
};

export class BundesratScene extends Phaser.Scene {
  private landGraphics: Map<string, Phaser.GameObjects.Rectangle> = new Map();
  private landLabels: Map<string, Phaser.GameObjects.Text> = new Map();
  private onLandClick: ((landId: string) => void) | null = null;

  constructor() {
    super({ key: 'bundesrat' });
  }

  setClickHandler(handler: (landId: string) => void) {
    this.onLandClick = handler;
  }

  create() {
    this.cameras.main.setBackgroundColor(0x1a1712);

    const title = this.add.text(20, 10, 'Bundesrat', {
      fontFamily: 'Playfair Display, Georgia, serif',
      fontSize: '18px',
      color: '#c8a84a',
    });

    const subtitle = this.add.text(20, 34, '16 Länder · 69 Stimmen', {
      fontFamily: 'DM Sans, sans-serif',
      fontSize: '11px',
      color: '#9a9080',
    });
  }

  updateLaender(laender: BundesratLand[]) {
    this.landGraphics.forEach(g => g.destroy());
    this.landLabels.forEach(l => l.destroy());
    this.landGraphics.clear();
    this.landLabels.clear();

    for (const land of laender) {
      const pos = LAND_POSITIONS[land.id];
      if (!pos) continue;

      const color = ALIGNMENT_COLORS[land.alignment] || 0x9a9080;
      const alpha = 0.6 + (land.mood / 4) * 0.4;

      const rect = this.add.rectangle(pos.x + pos.w / 2, pos.y + pos.h / 2 + 50, pos.w, pos.h, color, alpha)
        .setInteractive({ useHandCursor: true })
        .setStrokeStyle(1, 0x38342a);

      rect.on('pointerover', () => rect.setStrokeStyle(2, 0xc8a84a));
      rect.on('pointerout', () => rect.setStrokeStyle(1, 0x38342a));
      rect.on('pointerdown', () => this.onLandClick?.(land.id));

      const label = this.add.text(
        pos.x + pos.w / 2,
        pos.y + pos.h / 2 + 50,
        land.id,
        {
          fontFamily: 'DM Mono, monospace',
          fontSize: '10px',
          color: '#e8e0cc',
          align: 'center',
        },
      ).setOrigin(0.5);

      this.landGraphics.set(land.id, rect);
      this.landLabels.set(land.id, label);
    }
  }
}
