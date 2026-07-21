import { type ReactNode, useEffect } from "react";
import { createPortal } from "react-dom";

import { Button } from "./Button";
import { ptBR } from "../../i18n";

interface ConfirmDialogProps {
  open: boolean;
  title: string;
  description: ReactNode;
  confirmLabel: string;
  cancelLabel: string;
  onConfirm: () => void | Promise<void>;
  onCancel: () => void;
  loading?: boolean;
}

export function ConfirmDialog({
  open,
  title,
  description,
  confirmLabel,
  cancelLabel,
  onConfirm,
  onCancel,
  loading = false,
}: ConfirmDialogProps) {
  useEffect(() => {
    if (!open) {
      return;
    }

    const handleKeyDown = (event: KeyboardEvent) => {
      if (event.key === "Escape" && !loading) {
        onCancel();
      }
    };

    const originalOverflow = document.body.style.overflow;
    document.body.style.overflow = "hidden";
    window.addEventListener("keydown", handleKeyDown);

    return () => {
      document.body.style.overflow = originalOverflow;
      window.removeEventListener("keydown", handleKeyDown);
    };
  }, [open, loading, onCancel]);

  if (!open || typeof document === "undefined") {
    return null;
  }

  return createPortal(
    <div className="confirm-modal" role="presentation" onMouseDown={loading ? undefined : onCancel}>
      <section
        className="confirm-modal__panel"
        role="dialog"
        aria-modal="true"
        aria-labelledby="confirm-modal-title"
        aria-describedby="confirm-modal-description"
        onMouseDown={(event) => event.stopPropagation()}
      >
        <span className="eyebrow">{ptBR.common.dialogs.confirmationEyebrow}</span>
        <h2 id="confirm-modal-title">{title}</h2>
        <p id="confirm-modal-description">{description}</p>

        <div className="confirm-modal__actions">
          <Button variant="danger" type="button" disabled={loading} onClick={onConfirm}>
            {loading ? ptBR.common.buttons.removing : confirmLabel}
          </Button>
          <Button variant="secondary" type="button" disabled={loading} onClick={onCancel}>
            {cancelLabel}
          </Button>
        </div>
      </section>
    </div>,
    document.body,
  );
}
