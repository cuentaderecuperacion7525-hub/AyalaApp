import React, { useEffect } from 'react';
import { ShieldCheck, ArrowLeft, Cpu, Shield, HelpCircle, X, Heart } from 'lucide-react';

interface CreditsModalProps {
  isOpen: boolean;
  onClose: () => void;
}

export const CreditsModal: React.FC<CreditsModalProps> = ({ isOpen, onClose }) => {
  if (!isOpen) return null;

  return (
    <div 
      id="credits-modal-overlay" 
      className="fixed inset-0 bg-slate-950/70 backdrop-blur-md z-[60] flex items-center justify-center p-4 animate-fade-in"
    >
      <div 
        id="credits-modal-content" 
        className="bg-white rounded-3xl shadow-[0_24px_48px_rgba(0,0,0,0.16)] w-full max-w-md border border-slate-200 overflow-hidden transform animate-scale-up text-slate-800 flex flex-col max-h-[90vh]"
      >
        {/* Header styling matching the family identity */}
        <div className="p-5 bg-gradient-to-r from-teal-700 to-emerald-700 text-white flex items-center justify-between shadow-sm">
          <div className="flex items-center gap-3">
            <div className="p-2 bg-white/10 rounded-xl">
              <Cpu className="w-5 h-5 text-emerald-200" />
            </div>
            <div>
              <h3 className="font-extrabold text-sm tracking-wide">Créditos y Mantenimiento</h3>
              <p className="text-[10px] text-teal-100 font-medium tracking-wider">FamiChat Martínez v2.7.0</p>
            </div>
          </div>
          <button 
            onClick={onClose}
            className="text-white/80 hover:text-white hover:bg-white/10 p-1.5 rounded-full transition-all cursor-pointer"
            title="Volver"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Informative Body Content */}
        <div className="p-6 overflow-y-auto space-y-5">
          {/* Main developer banner */}
          <div className="p-5 bg-gradient-to-br from-slate-50 to-teal-50/20 border border-teal-100 rounded-2xl flex flex-col items-center text-center space-y-2.5">
            <div className="w-14 h-14 bg-emerald-50 text-emerald-600 rounded-full flex items-center justify-center border border-emerald-250 shadow-inner">
              <ShieldCheck className="w-7 h-7" />
            </div>
            <div className="space-y-1">
              <span className="text-[10px] uppercase font-bold text-slate-400 tracking-widest block">Desarrollador Oficial</span>
              <h4 className="text-base font-extrabold text-slate-800">
                José Manuel Martínez Ayala
              </h4>
              <p className="text-xs font-semibold text-teal-700">Diseño Técnico & Gestión de Servidores</p>
            </div>
          </div>

          {/* Under Maintenance Notice block */}
          <div className="space-y-3">
            <span className="text-[9.5px] font-bold text-slate-400 uppercase tracking-widest block">Estado de la Red</span>
            
            <div className="p-4 bg-teal-50/50 border border-teal-150/50 rounded-2xl space-y-2 text-xs text-slate-650 leading-relaxed">
              <div className="flex items-start gap-2.5">
                <span className="mt-0.5 text-base text-emerald-600">🛠️</span>
                <p>
                  Esta plataforma está bajo **Mantenimiento Técnico Permanente** para garantizar el almacenamiento encriptado, la velocidad en las llamadas push, y que las fotos queden resguardadas de forma 100% privada e intrasferible.
                </p>
              </div>
              <div className="flex items-start gap-2.5 pt-1 border-t border-teal-200/25">
                <span className="mt-0.5 text-base text-teal-600">🛡️</span>
                <p>
                  Cada actualización se realiza cuidando que los chats no se mezclen y protegiendo el historial familiar ante posibles pérdidas accidentales de datos.
                </p>
              </div>
            </div>
          </div>

          {/* Device Telemetry info */}
          <div className="bg-slate-50 p-4 rounded-2xl border border-slate-150 text-center space-y-1">
            <p className="text-[11px] font-bold text-slate-700">FamiChat Martínez está operativo</p>
            <p className="text-[10px] text-slate-500 leading-relaxed">
              Despliegue distribuido de alto rendimiento independiente de WhatsApp. Datos procesados en servidores dedicados.
            </p>
          </div>
        </div>

        {/* Footer with a close action that goes back */}
        <div className="p-4 bg-slate-50 border-t border-slate-100 flex items-center justify-between">
          <button
            onClick={onClose}
            className="flex items-center gap-1.5 text-slate-500 hover:text-slate-800 text-xs font-semibold px-3 py-1.5 rounded-xl hover:bg-slate-200/50 transition-colors cursor-pointer"
          >
            <ArrowLeft className="w-4 h-4" />
            <span>Atrás</span>
          </button>
          <div className="flex items-center gap-1 text-[10px] text-slate-450 font-semibold select-none">
            <span>Hecho con amor</span>
            <Heart className="w-3 h-3 text-red-500 fill-red-500" />
          </div>
        </div>
      </div>
    </div>
  );
};
