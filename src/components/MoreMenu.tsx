import React, { useState, useEffect, useRef } from 'react';
import { Contact } from '../types';
import { 
  MoreVertical, Shield, User, Radio, Volume2, VolumeX, 
  Check, Lock, Unlock, HelpCircle, X, ExternalLink, Cpu, ChevronRight,
  Moon, Sun, DownloadCloud, RefreshCw
} from 'lucide-react';

interface MoreMenuProps {
  currentUser: Contact;
  contacts: Contact[];
  soundOn: boolean;
  setSoundOn: (val: boolean) => void;
  pushEnabled: boolean;
  pushSupported: boolean;
  subscribingPush: boolean;
  onTogglePush: () => void;
  hasUpdate: boolean;
  onCheckUpdates: () => void;
  autoCheckUpdates: boolean;
  onToggleAutoCheckUpdates: (val: boolean) => void;
  checkingUpdate?: boolean;
  isOpen: boolean;
  onOpenChange: (open: boolean) => void;
  showFaqGuide: boolean;
  onFaqGuideChange: (open: boolean) => void;
  onOpenCredits: () => void;
  onBackToSelection: () => void;
  darkMode: boolean;
  setDarkMode: (val: boolean) => void;
}

export const MoreMenu: React.FC<MoreMenuProps> = ({
  currentUser,
  contacts,
  soundOn,
  setSoundOn,
  pushEnabled,
  pushSupported,
  subscribingPush,
  onTogglePush,
  hasUpdate,
  onCheckUpdates,
  autoCheckUpdates,
  onToggleAutoCheckUpdates,
  checkingUpdate = false,
  isOpen,
  onOpenChange,
  showFaqGuide,
  onFaqGuideChange,
  onOpenCredits,
  onBackToSelection,
  darkMode,
  setDarkMode,
}) => {
  const [customStatus, setCustomStatus] = useState(() => {
    return localStorage.getItem(`famichat_status_${currentUser.id}`) || 'En línea';
  });
  
  const menuRef = useRef<HTMLDivElement>(null);

  // Toggle helper that delegates to controlled state triggers
  const toggleMenu = (openState: boolean) => {
    onOpenChange(openState);
  };

  const toggleFaq = (openState: boolean) => {
    onFaqGuideChange(openState);
  };

  // Close when clicking outside
  useEffect(() => {
    const handleClickOutside = (e: MouseEvent) => {
      if (menuRef.current && !menuRef.current.contains(e.target as Node)) {
        const hasOverlayOpen = 
          document.getElementById('credits-modal-overlay') || 
          document.getElementById('pwa-install-modal-overlay') || 
          document.getElementById('pin-verification-modal-overlay') ||
          document.getElementById('famichat-help-modal') ||
          document.getElementById('update-modal-overlay');
        
        if (hasOverlayOpen) {
          return;
        }
        onOpenChange(false);
      }
    };
    if (isOpen) {
      document.addEventListener('mousedown', handleClickOutside);
    }
    return () => {
      document.removeEventListener('mousedown', handleClickOutside);
    };
  }, [isOpen, onOpenChange]);

  const handleStatusChange = (status: string) => {
    setCustomStatus(status);
    localStorage.setItem(`famichat_status_${currentUser.id}`, status);
    
    // Also store custom global status in localstorage so other components can fetch it if needed
    const event = new CustomEvent('status-change', { detail: { userId: currentUser.id, status } });
    window.dispatchEvent(event);
  };

  const statusOptions = [
    { label: '🟢 En línea', value: 'En línea' },
    { label: '🟡 Ocupado', value: 'Ocupado' },
    { label: '🔴 Ausente', value: 'Ausente' },
    { label: '😴 Durmiendo', value: 'Durmiendo' }
  ];

  return (
    <div className="relative" ref={menuRef} id="header-more-actions-container">
      {/* Three vertical dots button */}
      <button
        id="header-kebab-menu-trigger"
        onClick={() => toggleMenu(!isOpen)}
        className="p-1.5 rounded-lg hover:bg-white/10 text-white/90 hover:text-white transition-colors cursor-pointer flex items-center justify-center relative"
        title="Más Opciones"
      >
        <MoreVertical className="w-5 h-5 text-teal-10" />
        {/* Update notification dot if new version is available */}
        {hasUpdate && (
          <span className="absolute top-1.5 right-1.5 w-2 h-2 rounded-full bg-emerald-400 ring-2 ring-emerald-800 animate-pulse" />
        )}
      </button>

      {/* Popover Dropdown Card with smooth touch scrolling */}
      {isOpen && (
        <div 
          id="header-kebab-dropdown" 
          className="absolute right-0 top-10 w-72 max-h-[calc(100dvh-85px)] md:max-h-[min(580px,calc(92vh-85px))] overflow-y-auto overscroll-contain custom-scrollbar bg-white rounded-2xl shadow-[0_12px_36px_-6px_rgba(0,0,0,0.22)] border border-slate-150 py-3 z-50 text-slate-800 animate-fade-in flex flex-col gap-2"
          style={{ touchAction: 'pan-y', WebkitOverflowScrolling: 'touch' }}
        >
          {/* Active Profile Info Header Card inside menu */}
          <div className="px-4 pb-2.5 border-b border-slate-100">
            <div className="flex items-center gap-2.5">
              <div className={`w-11 h-11 rounded-xl flex items-center justify-center text-xl shadow-inner border border-black/5 ${currentUser.avatarColor}`}>
                {currentUser.avatarEmoji}
              </div>
              <div className="min-w-0 flex-1">
                <span className="font-bold text-xs uppercase tracking-wider text-slate-400 block">Mi Perfil Familiar</span>
                <span className="font-extrabold text-[13.5px] text-slate-800 truncate block">{currentUser.name}</span>
                <span className="text-[10px] text-slate-500 font-medium italic block">
                  {currentUser.relationship}
                </span>
                {currentUser.phone && (
                  <span className="text-[9.5px] text-slate-400 block truncate mt-0.5">{currentUser.phone}</span>
                )}
              </div>
            </div>

            {/* Custom availability state switcher */}
            <div className="mt-3 bg-slate-50 border border-slate-150 p-2 rounded-xl">
              <span className="text-[9.5px] font-bold text-slate-500 uppercase tracking-widest block mb-1">Mi Estado Actual:</span>
              <div className="grid grid-cols-2 gap-1">
                {statusOptions.map((opt) => (
                  <button
                    key={opt.value}
                    onClick={() => handleStatusChange(opt.value)}
                    className={`px-1.5 py-1 text-center rounded text-[10px] sm:text-[10.5px] font-semibold transition-all border cursor-pointer ${
                      customStatus === opt.value
                        ? 'bg-emerald-50 border-emerald-300 text-emerald-800 shadow-sm'
                        : 'bg-white border-transparent text-slate-650 hover:bg-slate-100 hover:border-slate-200'
                    }`}
                  >
                    {opt.label}
                  </button>
                ))}
              </div>
            </div>
          </div>

          {/* Quick Hardware / Utilities Toggle Grid */}
          <div className="px-4 py-1.5 border-b border-slate-100 space-y-1.5">
            <span className="text-[9.5px] font-bold text-slate-400 uppercase tracking-widest block">Herramientas</span>
            
            {/* Sound Toggle row item */}
            <button
              onClick={() => {
                setSoundOn(!soundOn);
              }}
              className="w-full flex items-center justify-between text-left p-1.5 hover:bg-slate-50 rounded-lg transition-colors text-xs font-semibold text-slate-700 cursor-pointer"
            >
              <div className="flex items-center gap-1.5">
                {soundOn ? (
                  <>
                    <Volume2 className="w-4 h-4 text-emerald-600 shrink-0" />
                    <span>Tonos de Notificación</span>
                  </>
                ) : (
                  <>
                    <VolumeX className="w-4 h-4 text-slate-400 shrink-0" />
                    <span className="text-slate-500">Tonos Silenciados</span>
                  </>
                )}
              </div>
              <div className={`w-8 h-4 rounded-full relative flex items-center px-0.5 transition-colors cursor-pointer ${soundOn ? 'bg-emerald-500' : 'bg-slate-300'}`}>
                <div className={`w-3.5 h-3.5 rounded-full bg-white shadow-sm transition-transform ${soundOn ? 'translate-x-3.5' : 'translate-x-0'}`} />
              </div>
            </button>

            {/* Dark Theme Toggle row item */}
            <button
              onClick={() => {
                setDarkMode(!darkMode);
              }}
              className="w-full flex items-center justify-between text-left p-1.5 hover:bg-slate-50 rounded-lg transition-colors text-xs font-semibold text-slate-700 cursor-pointer"
            >
              <div className="flex items-center gap-1.5">
                {darkMode ? (
                  <>
                    <Moon className="w-4 h-4 text-[#00a884] shrink-0" />
                    <span>Tema Oscuro Familiar</span>
                  </>
                ) : (
                  <>
                    <Sun className="w-4 h-4 text-amber-500 shrink-0" />
                    <span>Tema Claro Clásico</span>
                  </>
                )}
              </div>
              <div className={`w-8 h-4 rounded-full relative flex items-center px-0.5 transition-colors cursor-pointer ${darkMode ? 'bg-emerald-500' : 'bg-slate-300'}`}>
                <div className={`w-3.5 h-3.5 rounded-full bg-white shadow-sm transition-transform ${darkMode ? 'translate-x-3.5' : 'translate-x-0'}`} />
              </div>
            </button>

            {/* Background Push Toggle row item if supported */}
            {pushSupported && (
              <button
                onClick={onTogglePush}
                disabled={subscribingPush}
                className="w-full flex items-center justify-between text-left p-1.5 hover:bg-slate-50 rounded-lg transition-colors text-xs font-semibold text-slate-700 cursor-pointer disabled:opacity-50"
              >
                <div className="flex items-center gap-1.5">
                  <Radio className={`w-4 h-4 shrink-0 ${pushEnabled ? 'text-amber-500 animate-pulse' : 'text-slate-400'}`} />
                  <div>
                    <span>Alertas Push Móviles</span>
                    <span className="block text-[8.5px] text-slate-400 font-normal">Recibe mensajes apagado</span>
                  </div>
                </div>
                <div className={`w-8 h-4 rounded-full relative flex items-center px-0.5 transition-colors cursor-pointer ${pushEnabled ? 'bg-emerald-500' : 'bg-slate-300'}`}>
                  <div className={`w-3.5 h-3.5 rounded-full bg-white shadow-sm transition-transform ${pushEnabled ? 'translate-x-3.5' : 'translate-x-0'}`} />
                </div>
              </button>
            )}

            {/* Buscar actualización automática - Única opción de actualización */}
            <div className="w-full flex items-center justify-between p-1.5 hover:bg-slate-50 rounded-lg transition-colors text-xs font-semibold text-slate-700">
              <button
                type="button"
                onClick={() => {
                  if (hasUpdate && onCheckUpdates) {
                    onCheckUpdates();
                  } else {
                    onToggleAutoCheckUpdates(!autoCheckUpdates);
                  }
                }}
                className="flex items-center gap-1.5 flex-1 text-left cursor-pointer select-none"
              >
                <RefreshCw className={`w-4 h-4 shrink-0 ${hasUpdate ? 'text-emerald-600' : 'text-teal-600'}`} />
                <div>
                  <div className="flex items-center gap-1.5">
                    <span>Buscar actualización automática</span>
                    {hasUpdate && (
                      <span className="w-2 h-2 rounded-full bg-emerald-500 animate-pulse" />
                    )}
                  </div>
                  <span className="block text-[8.5px] text-slate-400 font-normal">
                    {hasUpdate ? '¡Actualización lista! Toca para ver' : 'Revisar al abrir la app'}
                  </span>
                </div>
              </button>
              <button
                type="button"
                onClick={(e) => {
                  e.stopPropagation();
                  onToggleAutoCheckUpdates(!autoCheckUpdates);
                }}
                className={`w-8 h-4 rounded-full relative flex items-center px-0.5 transition-colors cursor-pointer shrink-0 ml-2 ${autoCheckUpdates ? 'bg-emerald-500' : 'bg-slate-300'}`}
                title="Activar o desactivar búsqueda automática"
              >
                <div className={`w-3.5 h-3.5 rounded-full bg-white shadow-sm transition-transform ${autoCheckUpdates ? 'translate-x-3.5' : 'translate-x-0'}`} />
              </button>
            </div>
          </div>

          {/* Multiperfil & Switcher de Perfil */}
          <div className="px-4 py-1.5 border-b border-slate-100 space-y-1.5">
            <span className="text-[9.5px] font-bold text-slate-400 uppercase tracking-widest block">Acceso de Cuentas</span>
            
            <button
              onClick={() => {
                onBackToSelection();
              }}
              className="w-full flex items-center justify-between text-left p-1.5 hover:bg-slate-50 border border-slate-150 bg-slate-50/50 rounded-xl transition-all text-xs font-semibold text-slate-700 cursor-pointer"
            >
              <div className="flex items-center gap-1.5">
                <User className="w-4 h-4 text-emerald-600 shrink-0" />
                <div>
                  <span>Switcher de Perfil</span>
                  <span className="block text-[8.5px] text-slate-400 font-normal">Volver a selección de usuario</span>
                </div>
              </div>
              <ChevronRight className="w-3.5 h-3.5 text-slate-400 shrink-0" />
            </button>

            {/* Application Maintenance Notice (Credits launcher button) */}
            <button
              onClick={() => {
                onOpenCredits();
              }}
              className="w-full flex items-center justify-between gap-2 p-1.5 hover:bg-slate-50 border border-teal-100 bg-gradient-to-br from-teal-50/10 to-teal-100/10 rounded-xl transition-all cursor-pointer text-left shadow-sm mt-1"
            >
              <div className="flex items-center gap-1.5 min-w-0">
                <Cpu className="w-4 h-4 text-teal-600 shrink-0" />
                <div className="min-w-0">
                  <span className="block text-xs font-bold text-slate-750">Créditos de App</span>
                  <span className="block text-[8.5px] text-slate-400 font-normal truncate">Mantenimiento y creador</span>
                </div>
              </div>
              <ChevronRight className="w-3.5 h-3.5 text-slate-450 shrink-0" />
            </button>
          </div>

          {/* Informative Help Guide tab trigger */}
          <div className="px-4 pt-1 space-y-1">
            <button
              onClick={() => {
                toggleFaq(true);
              }}
              className="w-full flex items-center gap-1.5 text-slate-500 hover:text-slate-800 p-1 hover:bg-slate-50 rounded-lg transition-colors text-xs font-medium cursor-pointer text-left"
            >
              <HelpCircle className="w-4 h-4 text-slate-400 shrink-0" />
              <span>Manual de Ayuda de FamiChat</span>
            </button>

            <span className="block border-t border-slate-100/65 my-1" />

            <p className="text-[9px] text-slate-400 text-center select-none pt-0.5">
              Ref: Martinez Alejandro • v2.6.2 Encriptado
            </p>
          </div>
        </div>
      )}

      {/* Informative FAQ / Help Modal Sheet Overlay */}
      {showFaqGuide && (
        <div id="famichat-help-modal" className="fixed inset-0 bg-slate-950/60 backdrop-blur-sm z-50 flex items-center justify-center p-4">
          <div className="bg-white rounded-2xl shadow-2xl w-full max-w-sm border border-slate-200 overflow-hidden animate-scale-up text-slate-800 flex flex-col max-h-[85vh]">
            {/* Modal Header */}
            <div className="p-4 bg-gradient-to-r from-teal-600 to-emerald-700 text-white flex items-center justify-between">
              <div className="flex items-center gap-2">
                <HelpCircle className="w-5 h-5 text-amber-300" />
                <div>
                  <h3 className="font-bold text-sm">Ayuda e Instrucciones</h3>
                  <p className="text-[10px] text-teal-100">FamiChat para la Familia Martínez</p>
                </div>
              </div>
              <button 
                onClick={() => toggleFaq(false)}
                className="text-white/80 hover:text-white hover:bg-white/10 p-1 rounded-full transition-all cursor-pointer"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            {/* Scrollable Modal Content */}
            <div className="p-4 overflow-y-auto space-y-3.5 text-xs text-slate-600 leading-relaxed scrollbar-thin">
              <div className="p-2.5 bg-teal-50 border border-teal-150 rounded-xl text-teal-850 font-medium">
                🛡️ <strong>¿Qué es FamiChat?</strong><br />
                Es nuestra plataforma de mensajería privada familiar fuera de WhatsApp. Protege nuestras conversaciones, fotos y notas de voz con almacenamiento privado local.
              </div>

              <div className="space-y-2">
                <h4 className="font-bold text-slate-800 text-xs uppercase tracking-wider">Preguntas Frecuentes</h4>
                
                <div className="bg-slate-50 p-2.5 rounded-xl border border-slate-150">
                  <p className="font-bold text-slate-750 mb-0.5">🔒 ¿Por qué desaparecen perfiles?</p>
                  <p className="text-[11px]">Cuando seleccionas tu cuenta por primera vez se activa el <strong>Cierre de Identidad</strong>. Así, los niños u otros miembros en este celular no pueden leer fácilmente los chats de Mamá, Papá o hermanos sin usar la clave pin de seguridad.</p>
                </div>

                <div className="bg-slate-50 p-2.5 rounded-xl border border-slate-150">
                  <p className="font-bold text-slate-750 mb-0.5">📞 ¿Cómo cambio de usuario si no soy Administrador?</p>
                  <p className="text-[11px]">Abre el menú de 3 puntos, presiona <strong>Desbloquear Switcher</strong> y escribe el PIN numérico de administrador para desbloquear los perfiles temporalmente.</p>
                </div>

                <div className="bg-slate-50 p-2.5 rounded-xl border border-slate-150">
                  <p className="font-bold text-slate-750 mb-0.5">🔋 ¿Cómo instalar FamiChat como App real?</p>
                  <p className="text-[11px]">Presiona "Instalar App" para ver la guía. En iPhone usa "Compartir &gt; Añadir a pantalla de inicio". En Android, acepta el banner automático para verlo en tu escritorio físico.</p>
                </div>
              </div>

              <div className="pt-2 text-center text-[10px] text-slate-400">
                Diseñado exclusivamente para la conexión unida de la familia Martínez.
              </div>
            </div>

            {/* Footer */}
            <div className="p-3 bg-slate-50 border-t border-slate-100 flex justify-end">
              <button
                onClick={() => toggleFaq(false)}
                className="bg-teal-600 hover:bg-teal-700 text-white font-bold py-1.5 px-4 rounded-lg text-xs cursor-pointer transition-colors shadow-inner"
              >
                Entendido
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};
