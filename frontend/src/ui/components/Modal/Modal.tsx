import { useRef, type MouseEvent, type ReactNode } from 'react';
import { useModalA11y } from '../../hooks/useModalA11y';

interface ModalProps {
  onClose: () => void;
  overlayClassName: string;
  dialogClassName: string;
  ariaLabelledBy?: string;
  ariaLabel?: string;
  /** Default true — Klick auf den Hintergrund schließt den Dialog. */
  closeOnBackdropClick?: boolean;
  children: ReactNode;
}

/**
 * Issue #258: gemeinsame Basis für alle Modal-/Overlay-Komponenten —
 * ESC-Handling, Focus-Trap und Fokus-Rückgabe kommen aus useModalA11y,
 * hier nur Markup/ARIA. Styling bleibt bei den Aufrufern (eigene CSS-Module).
 */
export function Modal({
  onClose,
  overlayClassName,
  dialogClassName,
  ariaLabelledBy,
  ariaLabel,
  closeOnBackdropClick = true,
  children,
}: ModalProps) {
  const dialogRef = useRef<HTMLDivElement>(null);
  useModalA11y(dialogRef, onClose);

  const handleOverlayClick = closeOnBackdropClick
    ? onClose
    : undefined;
  const handleDialogClick = (e: MouseEvent) => e.stopPropagation();

  return (
    // Backdrop-Klick ist eine Zusatzfunktion für Maus/Touch; die Tastatur-Entsprechung
    // zum Schließen ist ESC (useModalA11y). role="presentation" markiert das Element für
    // Assistive Technologien ohnehin als nicht-interaktiv (von jsx-a11y als Ausnahme erkannt).
    <div
      className={overlayClassName}
      onClick={handleOverlayClick}
      role="presentation"
    >
      {/* stopPropagation nur, damit ein Klick im Dialog nicht als Backdrop-Klick zählt —
          kein echter Interaktions-Handler, daher keine Tastatur-Entsprechung nötig. */}
      {/* eslint-disable-next-line jsx-a11y/click-events-have-key-events, jsx-a11y/no-noninteractive-element-interactions */}
      <div
        ref={dialogRef}
        className={dialogClassName}
        onClick={handleDialogClick}
        role="dialog"
        aria-modal="true"
        aria-labelledby={ariaLabelledBy}
        aria-label={ariaLabel}
        tabIndex={-1}
      >
        {children}
      </div>
    </div>
  );
}
