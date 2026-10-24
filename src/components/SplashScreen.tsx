import React from 'react';

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
      {/* Ambient background glow */}
      <div className="absolute top-1/4 left-1/2 -translate-x-1/2 -translate-y-1/2 w-72 h-72 bg-emerald-500/10 rounded-full blur-[100px] pointer-events-none" />

      {/* Main centered container with 300ms smooth fade-in */}
      <div className="flex flex-col items-center text-center animate-splash-fade-in z-10 max-w-xs w-full">
        
        {/* Minimalist, warm SVG logo: chat bubble with gentle heartbeat in the center */}
        <div className="relative mb-5 flex items-center justify-center">
          <svg
            viewBox="0 0 100 100"
            className="w-24 h-24 drop-shadow-md"
            fill="none"
            xmlns="http://www.w3.org/2000/svg"
          >
            {/* Soft background glow disc inside logo */}
            <circle cx="50" cy="50" r="44" className="fill-emerald-500/5 dark:fill-emerald-400/10" />

            {/* Clean, minimalist chat bubble outline */}
            <path
              d="M50 18 C30.67 18 15 32.55 15 50.5 C15 57.1 17.2 63.2 21 68.2 L17.5 82 L31.5 77.8 C36.9 81.1 43.2 83 50 83 C69.33 83 85 68.45 85 50.5 C85 32.55 69.33 18 50 18 Z"
              className="fill-emerald-500/10 stroke-emerald-600 dark:stroke-emerald-400"
              strokeWidth="4"
              strokeLinecap="round"
              strokeLinejoin="round"
            />

            {/* Small warm center heart with gentle heartbeat pulse */}
            <path
              d="M50 60 C50 60 36 50.8 36 41 C36 35.5 40.5 31 46 31 C48.5 31 50 32.5 50 32.5 C50 32.5 51.5 31 54 31 C59.5 31 64 35.5 64 41 C64 50.8 50 60 50 60 Z"
              className="fill-rose-500 stroke-rose-500 animate-heartbeat origin-center"
              strokeWidth="1.5"
              strokeLinecap="round"
              strokeLinejoin="round"
            />
          </svg>
        </div>

        {/* Name of the app */}
        <h1 className="text-2xl font-black tracking-tight bg-clip-text text-transparent bg-gradient-to-r from-emerald-500 via-teal-400 to-emerald-300 font-sans mb-5">
          FamiChat
        </h1>

        {/* Fine, minimalist progress bar with app colors */}
        <div className="w-40 h-1 bg-slate-200 dark:bg-slate-800 rounded-full overflow-hidden relative shadow-inner">
          <div className="h-full bg-gradient-to-r from-teal-500 to-emerald-400 rounded-full animate-indeterminate-bar" />
        </div>
      </div>
    </div>
  );
};
