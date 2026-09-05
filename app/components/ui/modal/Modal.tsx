import { useModalViewModel } from "./hooks/useModalViewModel";
import type { ModalProps } from "./models/ModalProps.interface";

export const Modal = ({ isOpen, onClose, title, children }: ModalProps): React.JSX.Element | null => {
  useModalViewModel({ isOpen, onClose });

  if (!isOpen) {
    return null;
  }

  return (
    <div
      className="fixed inset-0 z-50 flex items-center justify-center bg-black/40 p-4"
      onClick={onClose}
    >
      <div
        role="dialog"
        aria-modal="true"
        aria-label={title}
        onClick={(event) => event.stopPropagation()}
        className="w-full max-w-md rounded-tacha-card border border-tacha-border bg-tacha-surface p-6 shadow-lg"
      >
        {title ? (
          <h2 className="mb-4 font-display text-xl font-semibold text-tacha-text">{title}</h2>
        ) : null}
        {children}
      </div>
    </div>
  );
};
