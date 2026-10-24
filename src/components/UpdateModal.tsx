import React from 'react';
import { ReleaseInfo } from '../config/version';
import { DownloadCloud, X, ArrowDownCircle, CheckCircle2 } from 'lucide-react';

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
  if (!isOpen || !release) return null;

  // Limitar el cuerpo de notas de la versión a máximo 5 líneas
  const formatBodyLines = (text: string) => {
    if (!text) return ['Nuevas mejoras de rendimiento y estabilidad para la familia.'];
    const lines = text
      .split('\n')
      .map(l => l.trim())
      .filter(Boolean);
    return lines.slice(0, 5);
  };

  const bodyLines = formatBodyLines(release.body);

  return (
    <div 
      id="update-modal-overlay"
      className="fixed inset-0 bg-slate-950/70 backdrop-blur-sm z-[10000] flex items-center justify-center p-4 animate-fade-in select-none"
    >
      <div 
        id="update-modal-card"
        className="bg-white dark:bg-slate-900 text-slate-800 dark:text-slate-100 rounded-2xl shadow-2xl border border-slate-200 dark:border-slate-800 w-full max-w-sm overflow-hidden animate-scale-up"
      >
        {/* Header con gradiente distintivo de la app */}
        <div className="bg-gradient-to-r from-emerald-600 to-teal-700 text-white px-5 py-4 flex items-center justify-between">
          <div className="flex items-center gap-2.5">
            <div className="p-1.5 bg-white/15 rounded-lg">
              <DownloadCloud className="w-5 h-5 text-emerald-100" />
            </div>
            <div>
              <h3 className="font-extrabold text-sm tracking-wide">
                Actualización disponible: {release.version}
              </h3>
              <p className="text-[10px] text-emerald-100/90 font-medium">Nueva versión de FamiChat</p>
            </div>
          </div>
          <button 
            onClick={onClose}
            className="text-white/80 hover:text-white hover:bg-white/10 p-1.5 rounded-full transition-colors cursor-pointer"
            title="Cerrar"
          >
            <X className="w-4 h-4" />
          </button>
        </div>

        {/* Contenido con notas de versión y ayuda */}
        <div className="p-5 space-y-4">
          <div className="bg-emerald-50/60 dark:bg-slate-800/60 border border-emerald-100 dark:border-slate-700/60 rounded-xl p-3.5 space-y-1.5">
            <span className="text-[10px] font-bold uppercase tracking-wider text-emerald-700 dark:text-emerald-400 block">
              Notas de la versión:
            </span>
            <div className="text-xs text-slate-650 dark:text-slate-300 space-y-1 leading-relaxed">
              {bodyLines.map((line, idx) => (
                <p key={idx} className="line-clamp-1 flex items-start gap-1.5">
                  <span className="text-emerald-500 font-bold shrink-0">•</span>
                  <span>{line.replace(/^[-*#]\s*/, '')}</span>
                </p>
              ))}
            </div>
          </div>

          {/* Línea de ayuda obligatoria */}
          <div className="flex items-center gap-2 text-xs font-semibold text-teal-700 dark:text-teal-300 bg-teal-50 dark:bg-teal-950/40 p-2.5 rounded-xl border border-teal-200/50 dark:border-teal-800/40">
            <ArrowDownCircle className="w-4 h-4 text-teal-600 dark:text-teal-400 shrink-0" />
            <span>Toca Instalar al terminar de descargar.</span>
          </div>

          {/* Botones de acción */}
          <div className="pt-2 flex gap-2.5">
            <button
              type="button"
              onClick={onClose}
              className="flex-1 py-2.5 px-3 rounded-xl border border-slate-200 dark:border-slate-700 hover:bg-slate-100 dark:hover:bg-slate-800 text-slate-650 dark:text-slate-300 font-semibold text-xs transition-colors cursor-pointer text-center"
            >
              Más tarde
            </button>
            <button
              type="button"
              onClick={onUpdateNow}
              className="flex-1 py-2.5 px-3 rounded-xl bg-gradient-to-r from-emerald-600 to-teal-600 hover:from-emerald-700 hover:to-teal-700 text-white font-bold text-xs shadow-md shadow-emerald-700/20 transition-all cursor-pointer flex items-center justify-center gap-1.5"
            >
              <DownloadCloud className="w-4 h-4 shrink-0" />
              <span>Actualizar ahora</span>
            </button>
          </div>
        </div>
      </div>
    </div>
  );
};
