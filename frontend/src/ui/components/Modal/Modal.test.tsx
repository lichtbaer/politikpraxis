import { describe, it, expect, vi, afterEach } from 'vitest';
import { render, screen, fireEvent, cleanup } from '@testing-library/react';
import { Modal } from './Modal';

afterEach(() => cleanup());

function renderModal(onClose = vi.fn(), extraProps: Partial<React.ComponentProps<typeof Modal>> = {}) {
  render(
    <Modal
      onClose={onClose}
      overlayClassName="overlay"
      dialogClassName="dialog"
      ariaLabelledBy="modal-title"
      {...extraProps}
    >
      <h2 id="modal-title">Titel</h2>
      <button type="button">Erster Button</button>
      <button type="button">Letzter Button</button>
    </Modal>,
  );
  return onClose;
}

describe('Modal', () => {
  it('rendert mit role="dialog" und aria-modal', () => {
    renderModal();
    const dialog = screen.getByRole('dialog');
    expect(dialog).toBeInTheDocument();
    expect(dialog).toHaveAttribute('aria-modal', 'true');
    expect(dialog).toHaveAttribute('aria-labelledby', 'modal-title');
  });

  it('fokussiert beim Öffnen das erste fokussierbare Element im Dialog', () => {
    renderModal();
    expect(screen.getByText('Erster Button')).toHaveFocus();
  });

  it('ruft onClose bei ESC auf', () => {
    const onClose = renderModal();
    fireEvent.keyDown(screen.getByRole('dialog'), { key: 'Escape' });
    expect(onClose).toHaveBeenCalledTimes(1);
  });

  it('ruft onClose bei Klick auf den Hintergrund auf (Default)', () => {
    const onClose = renderModal();
    fireEvent.click(screen.getByRole('presentation'));
    expect(onClose).toHaveBeenCalledTimes(1);
  });

  it('ruft onClose NICHT bei Klick auf den Hintergrund auf, wenn closeOnBackdropClick=false', () => {
    const onClose = renderModal(vi.fn(), { closeOnBackdropClick: false });
    fireEvent.click(screen.getByRole('presentation'));
    expect(onClose).not.toHaveBeenCalled();
  });

  it('ruft onClose NICHT auf bei Klick innerhalb des Dialogs', () => {
    const onClose = renderModal();
    fireEvent.click(screen.getByRole('dialog'));
    expect(onClose).not.toHaveBeenCalled();
  });

  it('Tab am letzten Element springt zurück zum ersten (Focus-Trap)', () => {
    renderModal();
    const last = screen.getByText('Letzter Button');
    last.focus();
    fireEvent.keyDown(screen.getByRole('dialog'), { key: 'Tab' });
    expect(screen.getByText('Erster Button')).toHaveFocus();
  });

  it('Shift+Tab am ersten Element springt zum letzten (Focus-Trap)', () => {
    renderModal();
    const first = screen.getByText('Erster Button');
    first.focus();
    fireEvent.keyDown(screen.getByRole('dialog'), { key: 'Tab', shiftKey: true });
    expect(screen.getByText('Letzter Button')).toHaveFocus();
  });
});
