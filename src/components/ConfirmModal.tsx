import React from 'react';
import { ShieldAlert } from 'lucide-react';

interface ConfirmModalProps {
  isOpen: boolean;
  title?: string;
  message: string;
  onConfirm: () => void;
  onCancel: () => void;
  confirmText?: string;
  cancelText?: string;
}

export const ConfirmModal: React.FC<ConfirmModalProps> = ({
  isOpen,
  title = 'Resguardo Familiar',
  message,
  onConfirm,
  onCancel,
  confirmText = 'Sí, confirmo',
  cancelText = 'Cancelar'
}) => {
  if (!isOpen) return null;

  return (
    <div
      id="custom-confirm-modal-overlay"
      onClick={onCancel}
      className="fixed inset-0 bg-slate-950/60 backdrop-blur-md z-[9999] flex items-end sm:items-center justify-center p-3 pb-[calc(12px+env(safe-area-inset-bottom))] animate-fade-in"
    >
      <div
        id="custom-confirm-modal-content"
        role="alertdialog"
        aria-modal="true"
        onClick={(e) => e.stopPropagation()}
        className="bg-white rounded-[28px] shadow-2xl border border-slate-200 max-w-sm w-full overflow-hidden animate-fade-in-up"
      >
        <div className="px-6 pt-7 pb-2 flex flex-col items-center text-center">
          <div className="w-14 h-14 rounded-2xl bg-rose-500/10 text-rose-500 flex items-center justify-center mb-4">
            <ShieldAlert className="w-7 h-7" />
          </div>
          <h3 className="font-extrabold text-lg text-slate-900 tracking-tight">{title}</h3>
          <p className="text-slate-600 text-[15px] leading-relaxed mt-2">{message}</p>
        </div>

        <div className="px-6 pt-5 pb-6 flex flex-col-reverse sm:flex-row gap-2.5">
          <button onClick={onCancel} className="btn btn-ghost flex-1">
            {cancelText}
          </button>
          <button
            onClick={() => {
              onConfirm();
              onCancel();
            }}
            className="btn btn-danger-solid flex-1"
          >
            {confirmText}
          </button>
        </div>
      </div>
    </div>
  );
};
