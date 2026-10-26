import React from 'react';
import { FamiChatLogo } from './FamiChatLogo';

interface SplashScreenProps {
  darkMode?: boolean;
}

export const SplashScreen: React.FC<SplashScreenProps> = ({ darkMode = true }) => {
  return (
    <div
      id="famichat-splash-screen"
      className={`fixed inset-0 z-[99999] flex flex-col items-center justify-center p-6 select-none overflow-hidden transition-colors duration-300 ${
        darkMode ? 'bg-slate-950 text-white' : 'bg-slate-50 text-slate-900'
      }`}
    >
      {/* Resplandores de ambiente (violeta + coral) */}
      <div className="absolute -top-24 -left-24 w-80 h-80 bg-emerald-500/20 rounded-full blur-[110px] pointer-events-none" />
      <div className="absolute -bottom-24 -right-24 w-80 h-80 bg-teal-500/20 rounded-full blur-[110px] pointer-events-none" />

      <div className="flex flex-col items-center text-center animate-splash-fade-in z-10 max-w-xs w-full">
        {/* Icono de app: cuadrado redondeado con gradiente de marca */}
        <div className="relative mb-6">
          <div className="w-24 h-24 rounded-[30px] bg-gradient-to-br from-emerald-500 to-teal-500 flex items-center justify-center shadow-2xl shadow-emerald-500/40 animate-heartbeat">
            <FamiChatLogo className="w-14 h-14 text-white" />
          </div>
        </div>

        <h1 className="text-3xl font-extrabold tracking-tight font-sans mb-1">
          Fami<span className="text-teal-500">Chat</span>
        </h1>
        <p className="text-sm font-medium text-slate-500 mb-7">Tu familia, siempre cerca</p>

        <div className="w-36 h-1.5 bg-slate-200 dark:bg-slate-800 rounded-full overflow-hidden relative">
          <div className="h-full bg-gradient-to-r from-emerald-500 to-teal-500 rounded-full animate-indeterminate-bar" />
        </div>
      </div>
    </div>
  );
};
