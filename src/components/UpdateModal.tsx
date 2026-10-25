import React, { useState } from 'react';
import { ReleaseInfo } from '../config/version';
import { DownloadCloud, X, ArrowDownCircle, ChevronDown } from 'lucide-react';

interface UpdateModalProps {
  isOpen: boolean;
  release: ReleaseInfo | null;
  onClose: () => void;
  onUpdateNow: () => void;
}

export const UpdateModal: React.FC<UpdateModalProps> = ({
  isOpen,
  release,
  onClose,
  onUpdateNow
}) => {
  // Solo interfaz: muestra u oculta la ayuda del conflicto de instalación
  const [showInstallHelp, setShowInstallHelp] = useState(false);

  if (!isOpen || !release) return null;

  const formatBodyLines = (text: string) => {
    if (!text) return ['Nuevas mejoras de rendimiento y estabilidad para la familia.'];
    const lines = text
      .split('\n')
      .map(l => l.trim())
      .filter(Boolean);
    return lines.slice(0, 5);
  };

  const bodyLines = formatBodyLines(release.body);
  const versionLabel = release.version.startsWith('v') ? release.version : `v${release.version}`;

  return (
    <div
      id="update-modal-overlay"
      className="fixed inset-0 bg-slate-950/70 backdrop-blur-sm z-[10000] flex items-end justify-center select-none"
      style={{ animation: 'fc-fade 200ms ease-out' }}
    >
      <style>{`
        @keyframes fc-fade { from { opacity: 0; } to { opacity: 1; } }
        @keyframes fc-slide-up { from { transform: translateY(100%); } to { transform: translateY(0); } }
        @media (prefers-reduced-motion: reduce) {
          #update-modal-overlay, #update-modal-card { animation: none !important; }
        }
      `}</style>

      <div
        id="update-modal-card"
        role="dialog"
        aria-modal="true"
        aria-labelledby="update-modal-title"
        className="w-full max-w-[430px] bg-white dark:bg-slate-900 text-slate-800 dark:text-slate-100 rounded-t-[24px] shadow-2xl border-t border-slate-200 dark:border-slate-800 overflow-hidden"
        style={{
          animation: 'fc-slide-up 250ms cubic-bezier(0.2, 0.8, 0.2, 1)',
          paddingBottom: 'calc(max(env(safe-area-inset-bottom, 0px), var(--sab, 0px)) + 16px)',
        }}
      >
        {/* Barra de arrastre */}
        <div className="pt-2.5 pb-1 flex justify-center">
          <div className="w-10 h-1 rounded-full bg-slate-300 dark:bg-slate-700" />
        </div>

        {/* Encabezado */}
        <div className="px-5 pt-2 pb-3 flex items-center gap-3">
          <div className="w-11 h-11 rounded-[12px] bg-gradient-to-br from-emerald-600 to-teal-600 flex items-center justify-center shrink-0 shadow-md shadow-emerald-700/20">
            <DownloadCloud className="w-5 h-5 text-white" />
          </div>
          <div className="flex-1 min-w-0">
            <h3 id="update-modal-title" className="font-bold text-[17px] leading-tight">
              Actualización disponible: {versionLabel}
            </h3>
            <p className="text-sm text-slate-500 dark:text-slate-400">Nueva versión de FamiChat</p>
          </div>
          <button
            type="button"
            onClick={onClose}
            aria-label="Cerrar"
            title="Cerrar"
            className="w-11 h-11 -mr-2 rounded-[12px] flex items-center justify-center text-slate-500 dark:text-slate-400 active:bg-slate-100 dark:active:bg-slate-800 transition-colors cursor-pointer shrink-0"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        <div className="px-5 space-y-3">
          {/* Notas de la versión */}
          <div className="bg-emerald-50/60 dark:bg-slate-800/60 border border-emerald-100 dark:border-slate-700/60 rounded-[16px] p-4 space-y-2">
            <span className="text-xs font-bold uppercase tracking-wider text-emerald-700 dark:text-emerald-400 block">
              Notas de la versión
            </span>
            <div className="text-sm text-slate-600 dark:text-slate-300 space-y-1.5 leading-relaxed">
              {bodyLines.map((line, idx) => (
                <p key={idx} className="flex items-start gap-2">
                  <span className="text-emerald-500 font-bold shrink-0">•</span>
                  <span
                    style={{
                      display: '-webkit-box',
                      WebkitLineClamp: 2,
                      WebkitBoxOrient: 'vertical',
                      overflow: 'hidden',
                    }}
                  >
                    {line.replace(/^[-*#]\s*/, '')}
                  </span>
                </p>
              ))}
            </div>
          </div>

          {/* Indicación de instalación + ayuda plegable */}
          <div className="bg-teal-50 dark:bg-teal-950/40 px-4 py-3 rounded-[16px] border border-teal-200/50 dark:border-teal-800/40">
            <div className="flex items-center gap-2 text-sm font-semibold text-teal-700 dark:text-teal-300">
              <ArrowDownCircle className="w-5 h-5 text-teal-600 dark:text-teal-400 shrink-0" />
              <span>Toca Instalar al terminar de descargar.</span>
            </div>

            <button
              type="button"
              onClick={() => setShowInstallHelp(v => !v)}
              aria-expanded={showInstallHelp}
              className="mt-1 ml-7 min-h-[44px] flex items-center gap-1 text-xs font-medium text-slate-500 dark:text-slate-400 cursor-pointer"
            >
              <span>¿Problemas al instalar?</span>
              <ChevronDown className={`w-4 h-4 transition-transform duration-150 ${showInstallHelp ? 'rotate-180' : ''}`} />
            </button>

            {showInstallHelp && (
              <p className="ml-7 pb-1 text-[13px] text-slate-500 dark:text-slate-400 leading-snug">
                Si Android dice que hay un conflicto, desinstala la versión anterior una sola vez e instala esta.
              </p>
            )}
          </div>

          {/* Botones */}
          <div className="pt-1 flex gap-3">
            <button
              type="button"
              onClick={onClose}
              className="flex-1 h-12 px-3 rounded-[12px] border border-slate-200 dark:border-slate-700 active:bg-slate-100 dark:active:bg-slate-800 text-slate-600 dark:text-slate-300 font-semibold text-[15px] transition-colors cursor-pointer text-center"
            >
              Más tarde
            </button>

            <button
              type="button"
              onClick={onUpdateNow}
              className="flex-[1.4] h-12 px-3 rounded-[12px] bg-gradient-to-r from-emerald-600 to-teal-600 active:scale-[0.97] text-white font-bold text-[15px] shadow-md shadow-emerald-700/20 transition-all cursor-pointer flex items-center justify-center gap-2"
            >
              <DownloadCloud className="w-5 h-5 shrink-0" />
              <span>Actualizar ahora</span>
            </button>
          </div>
        </div>
      </div>
    </div>
  );
};
