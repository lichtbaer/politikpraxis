/** #284: reines CSS-Konfetti für die Wahlnacht-Sieg-Inszenierung — keine neue Abhängigkeit. */

export const CONFETTI_COUNT = 18;
const CONFETTI_COLORS = ['var(--gold)', '#7a9860', '#c8d8a0', '#e8b84b', '#f4e4c1'];

export interface ConfettiPiece {
  left: number;
  delay: number;
  duration: number;
  color: string;
  rotateFrom: number;
  rotateTo: number;
}

export function generateConfettiPieces(): ConfettiPiece[] {
  return Array.from({ length: CONFETTI_COUNT }, (_, i) => {
    const rotateFrom = Math.random() * 360;
    const spin = 360 + Math.random() * 360;
    return {
      left: (i / CONFETTI_COUNT) * 100 + (Math.random() * 6 - 3),
      delay: Math.random() * 0.5,
      duration: 2.1 + Math.random() * 1.3,
      color: CONFETTI_COLORS[i % CONFETTI_COLORS.length],
      rotateFrom,
      rotateTo: rotateFrom + spin,
    };
  });
}
