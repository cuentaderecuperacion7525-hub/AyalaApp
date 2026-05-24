import React, { useState } from 'react';
import { X, Smartphone, ArrowRight, Share, Plus, HelpCircle, LayoutGrid, CheckCircle, ExternalLink } from 'lucide-react';
import { FamiChatLogo } from './FamiChatLogo';

interface PwaInstallModalProps {
  isOpen: boolean;
  onClose: () => void;
  isInstallable: boolean;
  onTriggerInstall: () => void;
}

export const PwaInstallModal: React.FC<PwaInstallModalProps> = ({
  isOpen,
  onClose,
  isInstallable,
  onTriggerInstall
}) => {
  const [activeTab, setActiveTab] = useState<'android' | 'ios'>('android');
  const [copied, setCopied] = useState(false);

  if (!isOpen) return null;

  const currentUrl = window.location.href;

  const handleCopyLink = () => {
    navigator.clipboard.writeText(currentUrl);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  };

  const handleOpenExternal = () => {
    // Escape the sandbox / iframe context to open the direct link
    window.open(currentUrl, '_blank');
  };

  return (
    <div 
      id="pwa-install-modal-overlay"
      className="fixed inset-0 bg-slate-950/75 backdrop-blur-sm z-[10000] flex items-center justify-center p-4 animate-fade-in"
    >
      <div 
        id="pwa-install-modal-container"
        className="bg-white rounded-2xl shadow-2xl border border-slate-200 max-w-md w-full overflow-hidden transition-all transform scale-100 flex flex-col max-h-[90vh]"
      >
        {/* Header decoration */}
        <div className="bg-gradient-to-r from-teal-600 to-emerald-700 text-white px-5 py-4 flex items-center justify-between shadow-sm shrink-0">
          <div className="flex items-center gap-2.5">
            <FamiChatLogo className="w-5 h-5 text-emerald-350" />
            <div>
              <h3 className="font-extrabold text-[12px] tracking-wider uppercase text-slate-50 font-sans">
                Instalar FamiChat App
              </h3>
              <p className="text-[10px] text-emerald-100 font-light">Sin barras de navegación ni URL</p>
            </div>
          </div>
          <button 
            type="button"
            onClick={onClose}
            className="text-white/80 hover:text-white hover:bg-white/10 p-1 rounded-lg transition-colors cursor-pointer"
          >
            <X className="w-4 h-4" />
          </button>
        </div>

        {/* Scrollable Content */}
        <div className="p-5 flex-1 overflow-y-auto space-y-4 text-xs select-none custom-scrollbar text-slate-650">
          {/* Main Context Box */}
          <div className="bg-slate-50 p-4 rounded-xl border border-slate-100 space-y-2">
            <span className="font-bold text-slate-800 text-sm flex items-center gap-1.5">
              <Smartphone className="w-4 h-4 text-emerald-600" />
              ¿Por qué se ve la barra de direcciones?
            </span>
            <p className="text-slate-600 leading-relaxed text-[11px]">
              Al abrir FamiChat como una web tradicional, o al estar viéndola dentro del visualizador del editor, verás la barra gris con el enlace URL de internet.
            </p>
            <p className="text-emerald-800 font-semibold leading-relaxed text-[11px]">
              Para disfrutar de FamiChat a **pantalla completa como una App nativa real**, debes agregarla formalmente a la barra o pantalla de tu móvil.
            </p>
          </div>

          {/* Quick Sandbox Warning */}
          {window.self !== window.top && (
            <div className="bg-amber-50 border border-amber-200 p-3.5 rounded-xl space-y-2">
              <p className="font-bold text-amber-900 text-[11px] flex items-center gap-1">
                ⚠️ Estás dentro del visualizador de edición
              </p>
              <p className="text-amber-800 text-[10px] leading-relaxed">
                Los navegadores no permiten instalar apps que se encuentran dentro de marcos incrustados. Para continuar, abre FamiChat en una pestaña externa independiente.
              </p>
              <button
                type="button"
                onClick={handleOpenExternal}
                className="w-full bg-amber-500 hover:bg-amber-600 text-white font-bold py-2 px-3 rounded-lg flex items-center justify-center gap-1.5 transition-colors cursor-pointer shadow-sm text-[11px]"
              >
                <ExternalLink className="w-3.5 h-3.5" />
                Abrir en Pestaña Independiente
              </button>
            </div>
          )}

          {/* Native Install Alert */}
          {isInstallable && window.self === window.top && (
            <div className="bg-emerald-50 border border-emerald-200/60 p-4 rounded-xl text-center space-y-2">
              <p className="font-extrabold text-emerald-800 text-sm">🏡 ¡Listo para instalar en un clic!</p>
              <p className="text-emerald-700 text-[10px]">Tu navegador soporta instalación directa e instantánea:</p>
              <button
                type="button"
                onClick={() => {
                  onTriggerInstall();
                  onClose();
                }}
                className="w-full bg-emerald-600 hover:bg-emerald-700 text-white font-bold py-2.5 px-4 rounded-xl flex items-center justify-center gap-1.5 transition-all cursor-pointer shadow-lg shadow-emerald-650/20 text-xs tracking-wide"
              >
                <span>📥 Descargar e Instalar FamiChat</span>
              </button>
            </div>
          )}

          {/* Manuel Guide Tab Toggles */}
          <div className="space-y-2.5">
            <p className="font-bold text-slate-800 text-xs">Instrucciones Manuales de Instalación:</p>
            <div className="flex bg-slate-100 p-1 rounded-lg">
              <button
                type="button"
                onClick={() => setActiveTab('android')}
                className={`flex-1 py-1.5 rounded-md font-bold text-center transition-all ${
                  activeTab === 'android' ? 'bg-white text-emerald-700 shadow-sm' : 'text-slate-500 hover:text-slate-800'
                }`}
              >
                🤖 Android / Chrome
              </button>
              <button
                type="button"
                onClick={() => setActiveTab('ios')}
                className={`flex-1 py-1.5 rounded-md font-bold text-center transition-all ${
                  activeTab === 'ios' ? 'bg-white text-emerald-700 shadow-sm' : 'text-slate-500 hover:text-slate-800'
                }`}
              >
                🍎 iPhone / iPad (Safari)
              </button>
            </div>

            {/* Android Guide */}
            {activeTab === 'android' && (
              <div className="space-y-3.5 p-1 animate-fade-in text-[11.5px]">
                <div className="flex items-start gap-2.5">
                  <div className="w-5 h-5 rounded-full bg-teal-50 border border-teal-200 text-teal-600 flex items-center justify-center font-bold text-[10px] shrink-0">1</div>
                  <p className="text-slate-650">
                    Abre Chrome y navega al enlace de la aplicación de forma directa (pestaña independiente fuera del editor).
                  </p>
                </div>
                <div className="flex items-start gap-2.5">
                  <div className="w-5 h-5 rounded-full bg-teal-50 border border-teal-200 text-teal-600 flex items-center justify-center font-bold text-[10px] shrink-0">2</div>
                  <p className="text-slate-650">
                    Toca el icono de los <strong>tres puntos verticales (⋮)</strong> en la esquina superior derecha del navegador Chrome.
                  </p>
                </div>
                <div className="flex items-start gap-2.5">
                  <div className="w-5 h-5 rounded-full bg-teal-50 border border-teal-200 text-teal-600 flex items-center justify-center font-bold text-[10px] shrink-0">3</div>
                  <p className="text-slate-650">
                    Selecciona la opción <strong>"Instalar aplicación"</strong> o bien <strong>"Agregar a la pantalla principal"</strong>.
                  </p>
                </div>
                <div className="flex items-start gap-2.5">
                  <div className="w-5 h-5 rounded-full bg-teal-50 border border-teal-200 text-teal-600 flex items-center justify-center font-bold text-[10px] shrink-0">4</div>
                  <p className="text-slate-650 font-medium text-emerald-850">
                    ¡Listo! Abre FamiChat desde el logo de tu pantalla. Verás la app en increíble pantalla completa inmersiva.
                  </p>
                </div>

                {/* Chrome Cache Solution Advice block */}
                <div className="mt-4 p-3 bg-amber-50/70 border border-amber-200 rounded-xl space-y-2 text-[10.5px] leading-relaxed text-slate-700">
                  <p className="font-extrabold text-amber-900 flex items-center gap-1">
                    💡 ¿Sigue saliendo la letra "R" genérica o "Acceso Directo"?
                  </p>
                  <p className="text-slate-600">
                    Chrome en tu celular ha guardado el estado previo de la web en caché. Para obligarlo a actualizar la configuración al instante:
                  </p>
                  <ul className="list-disc list-inside space-y-1 text-slate-600 pl-1">
                    <li>Desliza el dedo hacia abajo en la pantalla de Chrome para <strong>volver a cargar / refrescar</strong> el chat.</li>
                    <li>O bien, cierra la pestaña y vuelve a entrar abriendo una pestaña en <strong>Modo Incógnito</strong> en Chrome para comprobar que el botón de instalar aparece perfectamente con el logo original de FamiChat.</li>
                  </ul>
                </div>
              </div>
            )}

            {/* iOS Guide */}
            {activeTab === 'ios' && (
              <div className="space-y-3 p-1 animate-fade-in text-[11.5px]">
                <div className="flex items-start gap-2.5">
                  <div className="w-5 h-5 rounded-full bg-teal-50 border border-teal-200 text-teal-600 flex items-center justify-center font-bold text-[10px] shrink-0">1</div>
                  <p className="text-slate-650">
                    Abre obligatoriamente la aplicación usando el navegador oficial <strong>Safari</strong> de Apple.
                  </p>
                </div>
                <div className="flex items-start gap-2.5">
                  <div className="w-5 h-5 rounded-full bg-teal-50 border border-teal-200 text-teal-600 flex items-center justify-center font-bold text-[10px] shrink-0">2</div>
                  <div className="text-slate-650 flex flex-wrap items-center gap-1 leading-normal">
                    Toca el icono de <strong>"Compartir"</strong>
                    <span className="inline-flex items-center justify-center p-1 bg-slate-150 rounded border border-slate-200 text-slate-800 shrink-0">
                      <Share className="w-3 h-3" />
                    </span>
                    (el cuadro con la flecha hacia arriba) en la barra de menú inferior.
                  </div>
                </div>
                <div className="flex items-start gap-2.5">
                  <div className="w-5 h-5 rounded-full bg-teal-50 border border-teal-200 text-teal-600 flex items-center justify-center font-bold text-[10px] shrink-0">3</div>
                  <div className="text-slate-650 flex flex-wrap items-center gap-1 leading-normal">
                    Desplázate hacia abajo y selecciona <strong>"Agregar al inicio"</strong> o <strong>"A la pantalla de inicio"</strong>
                    <span className="inline-flex items-center justify-center p-1 bg-slate-150 rounded border border-slate-200 text-slate-800 shrink-0">
                      <Plus className="w-3 h-3" />
                    </span>.
                  </div>
                </div>
                <div className="flex items-start gap-2.5">
                  <div className="w-5 h-5 rounded-full bg-teal-50 border border-teal-200 text-teal-600 flex items-center justify-center font-bold text-[10px] shrink-0">4</div>
                  <p className="text-slate-650 font-medium text-emerald-850">
                    Aparecerá el icono de FamiChat en tu pantalla inicial. Ábrelo y se cargará en pantalla completa nativa sin ninguna barra de URL.
                  </p>
                </div>
              </div>
            )}
          </div>

          {/* Copy link share utility */}
          <div className="bg-slate-50 border border-slate-100 rounded-xl p-3.5 space-y-2 shrink-0">
            <span className="font-bold text-slate-800 text-xs">Compartir Enlace con la Familia:</span>
            <div className="flex gap-2">
              <input
                type="text"
                readOnly
                value={currentUrl}
                className="flex-1 bg-white border border-slate-200 rounded-lg py-1.5 px-2.5 text-[9.5px] font-mono text-slate-500 focus:outline-none"
              />
              <button
                type="button"
                onClick={handleCopyLink}
                className={`px-3 py-1.5 rounded-lg font-bold text-[10px] tracking-wide transition-all cursor-pointer ${
                  copied 
                    ? 'bg-emerald-50 text-emerald-700 border border-emerald-200' 
                    : 'bg-slate-900 border border-slate-800 text-white hover:bg-slate-855'
                }`}
              >
                {copied ? '¡Copiado!' : 'Copiar'}
              </button>
            </div>
          </div>
        </div>

        {/* Footer actions */}
        <div className="px-5 py-4 bg-slate-50 border-t border-slate-100 flex gap-2.5 shrink-0">
          <button
            type="button"
            onClick={onClose}
            className="flex-1 bg-white border border-slate-200 hover:bg-slate-100 text-slate-600 font-bold py-2 rounded-xl text-xs transition-colors cursor-pointer"
          >
            Entendido, Cerrar
          </button>
        </div>
      </div>
    </div>
  );
};
