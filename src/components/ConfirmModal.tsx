import React from 'react';
import { ShieldAlert, Check, X } from 'lucide-react';

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
  confirmText = 'Sí, Confirmo',
  cancelText = 'Cancelar'
}) => {
  if (!isOpen) return null;

  return (
    <div id="custom-confirm-modal-overlay" className="fixed inset-0 bg-slate-950/70 backdrop-blur-sm z-[9999] flex items-center justify-center p-4">
      <div 
        id="custom-confirm-modal-content"
        className="bg-white rounded-2xl shadow-2xl border border-slate-205 max-w-sm w-full overflow-hidden transform scale-100 transition-all animate-slide-in-down"
      >
        {/* Header */}
        <div className="bg-slate-900 text-white px-5 py-4 flex items-center gap-3">
          <div className="w-8 h-8 rounded-full bg-rose-500/10 flex items-center justify-center text-rose-500 shrink-0">
            <ShieldAlert className="w-5 h-5 text-rose-450" />
          </div>
          <div className="flex-1 min-w-0">
            <h3 className="font-extrabold text-[13px] tracking-wider uppercase text-slate-100 font-sans truncate">
              {title}
            </h3>
          </div>
          <button 
            onClick={onCancel}
            className="text-slate-400 hover:text-white hover:bg-slate-800 p-1 rounded-lg transition-colors cursor-pointer"
          >
            <X className="w-4 h-4" />
          </button>
        </div>

        {/* Body */}
        <div className="px-5 py-6">
          <p className="text-slate-700 text-sm leading-relaxed font-medium">
            {message}
          </p>
        </div>

        {/* Actions */}
        <div className="bg-slate-50 border-t border-slate-100 px-5 py-4 flex items-center justify-end gap-2.5">
          <button
            onClick={onCancel}
            className="px-4 py-2 text-xs font-semibold text-slate-650 hover:text-slate-900 bg-white border border-slate-250 hover:bg-slate-100 transition-all rounded-xl cursor-pointer"
          >
            {cancelText}
          </button>
          <button
            onClick={() => {
              onConfirm();
              onCancel();
            }}
            className="px-4 py-2 text-xs font-extrabold text-white bg-rose-600 hover:bg-rose-700 active:bg-rose-800 shadow-sm transition-all rounded-xl cursor-pointer flex items-center gap-1.5"
          >
            <Check className="w-3.5 h-3.5 shrink-0" />
            {confirmText}
          </button>
        </div>
      </div>
    </div>
  );
};
