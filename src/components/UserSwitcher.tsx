import React from 'react';
import { Contact } from '../types';
import { Shield, Sparkles } from 'lucide-react';

interface UserSwitcherProps {
  contacts: Contact[];
  currentUser: Contact;
  onUserChange: (user: Contact) => void;
  isSwitcherUnlocked?: boolean;
  onUnlockRequest?: () => void;
  onBackToSelectionRequest?: () => void;
  moreMenu?: React.ReactNode;
}

export const UserSwitcher: React.FC<UserSwitcherProps> = ({
  contacts,
  currentUser,
  onUserChange,
  isSwitcherUnlocked = false,
  onUnlockRequest,
  onBackToSelectionRequest,
  moreMenu,
}) => {
  const isPrivileged = currentUser.role === 'admin' || isSwitcherUnlocked;

  return (
    <div id="user-identity-switcher" className="bg-slate-900 border-b border-teal-500/15 text-white px-3 sm:px-4 py-2 flex flex-col md:flex-row items-stretch md:items-center justify-between gap-2.5 text-xs sm:text-sm z-30 shadow-md">
      {/* Left side: Active user identity info */}
      <div className="flex flex-row items-center justify-between md:justify-start gap-2 pr-1 min-w-0">
        <div className="flex items-center gap-1.5 min-w-0">
          <span className="flex h-2 w-2 rounded-full bg-emerald-450 shrink-0" />
          <div className="text-slate-400 font-bold text-[10.5px] uppercase tracking-wider select-none shrink-0">
            Multiperfil:
          </div>
          <div className={`px-2.5 py-1 rounded-full text-xs font-semibold flex items-center gap-1 shadow-sm border border-white/5 ${currentUser.avatarColor} truncate max-w-[140px] xs:max-w-none`}>
            <span>{currentUser.avatarEmoji}</span>
            <span className="truncate">{currentUser.name}</span>
          </div>
        </div>

        {/* Small desktop indicator label */}
        {currentUser.role === 'admin' && (
          <span className="bg-amber-400/10 text-amber-350 px-1.5 py-0.5 rounded text-[8px] font-black tracking-wider uppercase shrink-0 border border-amber-400/10 hidden xs:inline-flex items-center gap-0.5">
            <Shield className="w-2.5 h-2.5" /> PAPÁ
          </span>
        )}
      </div>
      
      {/* Right side: Dynamic profiles or actions and MoreMenu kebab */}
      <div className="flex items-center gap-1.5 min-w-0 max-w-full justify-between md:justify-end flex-wrap sm:flex-nowrap">
        <div className="flex items-center gap-1 flex-1 sm:flex-initial min-w-0">
          {isPrivileged ? (
            <div className="flex items-center gap-1.5 w-full">
              {/* Back to selection page directly (since already authorized/admin) */}
              <button
                onClick={onBackToSelectionRequest}
                className="bg-slate-800 hover:bg-slate-750 text-slate-300 hover:text-white text-[10px] font-bold px-2 py-1.5 rounded-lg border border-slate-700/60 transition-colors cursor-pointer flex items-center gap-1 shrink-0"
                title="Volver a la selección general de perfiles"
              >
                🔄 <span>Selección</span>
              </button>

              <div className="flex gap-1 overflow-x-auto scrollbar-none py-0.5 w-full">
                {contacts.map((c) => {
                  const isSelected = c.id === currentUser.id;
                  return (
                    <button
                      key={c.id}
                      id={`switch-to-${c.id}`}
                      onClick={() => onUserChange(c)}
                      className={`flex items-center gap-1 px-2.5 py-1 rounded-lg text-xs transition-all tracking-wide font-medium relative whitespace-nowrap shrink-0 cursor-pointer ${
                        isSelected
                          ? 'bg-teal-500/25 text-teal-350 border border-teal-500/40 font-bold shadow-inner'
                          : 'text-slate-350 hover:text-white hover:bg-slate-800 border border-transparent'
                      }`}
                    >
                      <span>{c.avatarEmoji}</span>
                      <span>{c.name.split(' ')[0]}</span>
                    </button>
                  );
                })}
              </div>
            </div>
          ) : (
            <div className="flex items-center gap-1.5 w-full">
              {/* Unlock switcher option (requests PIN) */}
              <button
                onClick={onUnlockRequest}
                className="bg-slate-800 hover:bg-slate-750 text-slate-200 text-[10px] font-bold px-2.5 py-1.5 rounded-lg border border-slate-700/60 transition-colors flex items-center gap-1 shadow-sm cursor-pointer flex-1 justify-center whitespace-nowrap"
                title="Desbloquear resto de cuentas de la familia"
              >
                🔒 <span>Habilitar Switcher</span>
              </button>

              {/* Back to Selection options with password challenge safeguard */}
              <button
                onClick={onBackToSelectionRequest}
                className="bg-emerald-650 hover:bg-emerald-600 text-white text-[10px] font-bold px-2.5 py-1.5 rounded-lg border border-emerald-500/10 transition-colors flex items-center gap-1 shadow-sm cursor-pointer flex-1 justify-center whitespace-nowrap"
                title="Volver a selección general (solicita PIN de administrador)"
              >
                🔄 <span>Cambiar Perfil</span>
              </button>
            </div>
          )}
        </div>

        {/* Integration slot for the Kebab MoreOptions menu */}
        {moreMenu && (
          <div className="shrink-0 border-l border-slate-800 pl-1.5">
            {moreMenu}
          </div>
        )}
      </div>
    </div>
  );
};
