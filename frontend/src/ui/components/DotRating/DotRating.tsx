import styles from './DotRating.module.css';

interface DotRatingProps {
  value: number;
  max: number;
  className?: string;
}

export function DotRating({ value, max, className }: DotRatingProps) {
  return (
    <span className={`${styles.dots} ${className ?? ''}`}>
      {Array.from({ length: max }, (_, i) => (
        <span
          key={i}
          className={i < value ? styles.filled : styles.empty}
        />
      ))}
    </span>
  );
}
