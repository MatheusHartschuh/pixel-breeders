import { useEffect } from "react";
import { createPortal } from "react-dom";

import { Button } from "../ui/Button";
import { ptBR } from "../../i18n";

interface AuthPromptModalProps {
  open: boolean;
  nextPath: string;
  contextLabel?: string;
  onClose: () => void;
}

export function AuthPromptModal({ open, nextPath, contextLabel, onClose }: AuthPromptModalProps) {
  useEffect(() => {
    if (!open) {
      return;
    }

    const handleKeyDown = (event: KeyboardEvent) => {
      if (event.key === "Escape") {
        onClose();
      }
    };

    const originalOverflow = document.body.style.overflow;
    document.body.style.overflow = "hidden";
    window.addEventListener("keydown", handleKeyDown);

    return () => {
      document.body.style.overflow = originalOverflow;
      window.removeEventListener("keydown", handleKeyDown);
    };
  }, [open, onClose]);

  if (!open || typeof document === "undefined") {
    return null;
  }

  return createPortal(
    <div className="auth-modal" role="presentation" onMouseDown={onClose}>
      <section
        className="auth-modal__panel"
        role="dialog"
        aria-modal="true"
        aria-labelledby="auth-modal-title"
        aria-describedby="auth-modal-description"
        onMouseDown={(event) => event.stopPropagation()}
      >
        <span className="eyebrow">{ptBR.auth.modal.eyebrow}</span>
        <h2 id="auth-modal-title">{ptBR.auth.modal.title}</h2>
        <p id="auth-modal-description">
          {contextLabel ? ptBR.auth.modal.withContext(contextLabel) : ptBR.auth.modal.withoutContext}
          <span> {ptBR.auth.modal.descriptionTail}</span>
        </p>

        <div className="auth-modal__actions">
          <Button variant="primary" to={`/login?next=${nextPath}`}>
            {ptBR.auth.modal.signIn}
          </Button>
          <Button variant="secondary" to={`/register?next=${nextPath}`}>
            {ptBR.auth.modal.createAccount}
          </Button>
          <Button variant="text" type="button" onClick={onClose}>
            {ptBR.auth.modal.later}
          </Button>
        </div>
      </section>
    </div>,
    document.body,
  );
}
