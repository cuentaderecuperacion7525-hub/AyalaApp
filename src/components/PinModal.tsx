import React, { useState, useEffect, useRef } from 'react';
import { ShieldAlert, Lock, CheckCircle, X, ShieldCheck } from 'lucide-react';

interface PinModalProps {
  isOpen: boolean;
  onClose: () => void;
  onSuccess: () => void;
  description?: string;
  successMessage?: string;
}

export const PinModal: React.FC<PinModalProps> = ({
  isOpen,
  onClose,
  onSuccess,
  description = 'Solo el administrador principal (Papá) puede añadir miembros. Introduce la clave de seguridad para continuar.',
  successMessage = 'Acceso concedido...',
}) => {
  const [pin, setPin] = useState('');
  const [error, setError] = useState('');
  const [isSuccess, setIsSuccess] = useState(false);
  const inputRef = useRef<HTMLInputElement>(null);

  useEffect(() => {
    if (isOpen) {
      setPin('');
      setError('');
      setIsSuccess(false);
      // Auto focus after short delay to allow transition
      setTimeout(() => {
        inputRef.current?.focus();
      }, 100);
    }
  }, [isOpen]);

  const getExpectedPin = () => {
    return localStorage.getItem('famichat_admin_pin') || '1122';
  };

  if (!isOpen) return null;

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    const expected = getExpectedPin();
    if (pin === expected) {
      setIsSuccess(true);
      setError('');
      setTimeout(() => {
        onSuccess();
        onClose();
      }, 800);
    } else {
      setError('Clave incorrecta. Acceso denegado de administrador.');
      setPin('');
      inputRef.current?.focus();
    }
  };

  return (
    <div 
      id="pin-verification-modal-overlay" 
      className="fixed inset-0 bg-slate-950/75 backdrop-blur-sm z-[10000] flex items-center justify-center p-4 animate-fade-in"
    >
      <div 
        id="pin-verification-modal-container"
        className="bg-white rounded-2xl shadow-2xl border border-slate-200 max-w-sm w-full overflow-hidden transition-all transform scale-100"
      >
        {/* Header */}
        <div className="bg-slate-900 text-white px-5 py-4 flex items-center justify-between border-b border-slate-800">
          <div className="flex items-center gap-2">
            <Lock className="w-4 h-4 text-emerald-400 shrink-0" />
            <h3 className="font-extrabold text-[12px] tracking-wider uppercase text-slate-100 font-sans">
              Seguridad del Administrador
            </h3>
          </div>
          <button 
            type="button"
            onClick={onClose}
            className="text-slate-400 hover:text-white hover:bg-slate-800 p-1 rounded-lg transition-colors cursor-pointer"
          >
            <X className="w-4 h-4" />
          </button>
        </div>

        {/* Content */}
        <div className="px-6 py-6 flex flex-col items-center">
          {isSuccess ? (
            <div className="flex flex-col items-center justify-center py-4 text-center space-y-2 animate-bounce">
              <div className="w-14 h-14 bg-emerald-500/10 text-emerald-500 rounded-full flex items-center justify-center border border-emerald-500/20">
                <ShieldCheck className="w-8 h-8" />
              </div>
              <p className="font-extrabold text-emerald-600 text-sm">Clave Correcta</p>
              <p className="text-xs text-slate-450 font-medium">{successMessage}</p>
            </div>
          ) : (
            <form onSubmit={handleSubmit} className="w-full flex flex-col items-center space-y-4">
              <div className="w-12 h-12 bg-teal-50 text-teal-600 rounded-full flex items-center justify-center border border-teal-200/25 shadow-sm">
                <Lock className="w-5 h-5 text-teal-600" />
              </div>

              <div className="text-center space-y-1">
                <p className="font-bold text-slate-800 text-sm">Ingresar Clave Familiar</p>
                <p className="text-xs text-slate-500 max-w-[250px] leading-relaxed mx-auto">
                  {description}
                </p>
              </div>

              {/* Password Secret PIN input */}
              <div className="w-full max-w-[180px] space-y-2">
                <input
                  ref={inputRef}
                  id="admin-security-pin-input"
                  type="password"
                  pattern="[0-9]*"
                  inputMode="numeric"
                  maxLength={4}
                  placeholder="••••"
                  value={pin}
                  onChange={(e) => {
                    const val = e.target.value.replace(/[^0-9]/g, '');
                    setPin(val);
                    const expected = getExpectedPin();
                    if (val.length === expected.length && val === expected) {
                      setIsSuccess(true);
                      setError('');
                      setTimeout(() => {
                        onSuccess();
                        onClose();
                      }, 700);
                    } else if (val.length === expected.length) {
                      // auto submit on target length to feel snappy
                      setTimeout(() => {
                        if (val !== expected) {
                          setError('Clave incorrecta. Inténtalo de nuevo.');
                          setPin('');
                          inputRef.current?.focus();
                        }
                      }, 120);
                    }
                  }}
                  className="w-full text-center text-3xl tracking-[0.55em] py-3.5 border border-slate-200 focus:border-teal-500 focus:ring-4 focus:ring-teal-500/15 rounded-xl font-mono text-slate-800 placeholder-slate-300 font-extrabold focus:outline-none transition-all"
                />
              </div>

              {error && (
                <div className="flex items-center gap-1.5 text-xs text-rose-600 font-semibold bg-rose-50 border border-rose-100 rounded-lg px-3 py-1.5 animate-pulse text-center">
                  <ShieldAlert className="w-3.5 h-3.5 shrink-0" />
                  <span>{error}</span>
                </div>
              )}

              {/* Action buttons */}
              <div className="w-full pt-1.5 flex gap-2">
                <button
                  type="button"
                  onClick={onClose}
                  className="flex-1 bg-slate-100 hover:bg-slate-200 text-slate-650 font-semibold py-2 rounded-xl text-xs tracking-wide transition-colors cursor-pointer"
                >
                  Cancelar
                </button>
                <button
                  type="submit"
                  className="flex-1 bg-teal-600 hover:bg-teal-700 text-white font-semibold py-2 rounded-xl text-xs tracking-wide shadow-md shadow-teal-600/10 transition-all cursor-pointer"
                >
                  Confirmar
                </button>
              </div>
            </form>
          )}
        </div>
      </div>
    </div>
  );
};
