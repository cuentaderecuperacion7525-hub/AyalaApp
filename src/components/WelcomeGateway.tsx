import React, { useState } from 'react';
import { Contact } from '../types';
import { ShieldCheck, Lock, ArrowLeft, AlertCircle, Delete } from 'lucide-react';

interface WelcomeGatewayProps {
  contacts: Contact[];
  onSelectUser: (user: Contact) => void;
}

// Letras decorativas bajo cada número (solo diseño, el PIN sigue siendo numérico)
const KEY_LETTERS: Record<string, string> = {
  '1': '', '2': 'ABC', '3': 'DEF', '4': 'GHI', '5': 'JKL',
  '6': 'MNO', '7': 'PQRS', '8': 'TUV', '9': 'WXYZ', '0': '',
};

const KEY_HEIGHT = 'clamp(52px, 8.2dvh, 76px)';

export const WelcomeGateway: React.FC<WelcomeGatewayProps> = ({ contacts, onSelectUser }) => {
  const [selectedCandidate, setSelectedCandidate] = useState<Contact | null>(null);
  const [pinCode, setPinCode] = useState<string>('');
  const [pinError, setPinError] = useState<string>('');
  const [isSuccess, setIsSuccess] = useState<boolean>(false);
  const [shake, setShake] = useState<boolean>(false); // solo animación visual

  const getExpectedPin = () => {
    return localStorage.getItem('famichat_admin_pin') || '1122';
  };

  const handleSelect = (user: Contact) => {
    if (user.role === 'admin') {
      setSelectedCandidate(user);
      setPinCode('');
      setPinError('');
      setIsSuccess(false);
    } else {
      // Normal family members enter directly with absolute privacy active
      onSelectUser(user);
    }
  };

  // Retroalimentación visual/táctil al fallar (no afecta la lógica)
  const triggerErrorFeedback = () => {
    setShake(true);
    setTimeout(() => setShake(false), 350);
    try {
      if (typeof navigator !== 'undefined' && 'vibrate' in navigator) {
        navigator.vibrate(120);
      }
    } catch {
      /* si el dispositivo no vibra, se ignora */
    }
  };

  const handleKeypadPress = (num: string) => {
    setPinError('');
    const expected = getExpectedPin();
    if (pinCode.length >= expected.length) return;
    const nextPin = pinCode + num;
    setPinCode(nextPin);

    if (nextPin === expected) {
      setIsSuccess(true);
      setTimeout(() => {
        if (selectedCandidate) {
          onSelectUser(selectedCandidate);
        }
      }, 700);
    } else if (nextPin.length === expected.length) {
      setTimeout(() => {
        setPinError('Clave de administrador incorrecta. Acceso denegado.');
        setPinCode('');
        triggerErrorFeedback();
      }, 150);
    }
  };

  const handleBackspace = () => {
    setPinCode(prev => prev.slice(0, -1));
    setPinError('');
  };

  const KEYPAD_NUMBERS = ['1', '2', '3', '4', '5', '6', '7', '8', '9'];

  // Tecla numérica: número arriba + letras pequeñas debajo (línea siempre reservada)
  const renderNumberKey = (num: string) => (
    <button
      key={num}
      type="button"
      disabled={isSuccess}
      onClick={() => handleKeypadPress(num)}
      aria-label={`Número ${num}`}
      style={{ height: KEY_HEIGHT }}
      className="w-full rounded-[18px] flex flex-col items-center justify-center bg-slate-900/70 border border-slate-700/60 text-white transition-all duration-100 active:scale-95 active:bg-emerald-400/15 active:border-emerald-400/50 focus:outline-none focus-visible:ring-2 focus-visible:ring-emerald-400 disabled:opacity-60 cursor-pointer select-none"
    >
      <span className="text-[28px] sm:text-[30px] font-semibold leading-none tabular-nums">{num}</span>
      <span className="mt-1 h-[11px] text-[10px] sm:text-[11px] leading-none tracking-[0.2em] text-slate-400">
        {KEY_LETTERS[num]}
      </span>
    </button>
  );

  if (selectedCandidate) {
    const expectedLength = getExpectedPin().length;

    return (
      <div
        id="welcome-identity-gateway"
        className="fixed inset-0 h-[100dvh] w-full bg-slate-900 bg-gradient-to-tr from-slate-950 via-teal-950 to-emerald-950 text-white z-[99999] flex flex-col overflow-hidden select-none"
        style={{
          paddingTop: 'calc(max(env(safe-area-inset-top, 0px), var(--sat, 0px)) + 10px)',
          paddingBottom: 'calc(max(env(safe-area-inset-bottom, 0px), var(--sab, 0px)) + 12px)',
        }}
      >
        <style>{`
          @keyframes fc-shake {
            0%, 100% { transform: translateX(0); }
            20% { transform: translateX(-8px); }
            40% { transform: translateX(8px); }
            60% { transform: translateX(-6px); }
            80% { transform: translateX(6px); }
          }
          .fc-shake { animation: fc-shake 300ms ease-in-out; }
          @media (prefers-reduced-motion: reduce) {
            .fc-shake { animation: none; }
          }
        `}</style>

        {/* Tarjeta contenedora con borde */}
        <div className="w-full max-w-[430px] flex-1 min-h-0 mx-auto px-3">
          <div className="w-full h-full rounded-[28px] border border-slate-700/60 bg-slate-950/70 backdrop-blur px-4 pt-3 pb-2 flex flex-col overflow-hidden">

            {/* BLOQUE 1 (ARRIBA): Título, avatar y puntos del PIN */}
            <div className="w-full shrink-0 flex flex-col items-center">
              <span className="text-xs font-black tracking-[0.2em] uppercase text-emerald-300/90 font-sans">
                FamiChat
              </span>

              <div className="flex flex-col items-center text-center mt-2">
                <div
                  className={`flex items-center justify-center rounded-[20px] border border-emerald-400/40 shadow-md text-3xl sm:text-4xl ${selectedCandidate.avatarColor}`}
                  style={{ width: 'clamp(48px, 7.5dvh, 68px)', height: 'clamp(48px, 7.5dvh, 68px)' }}
                >
                  {selectedCandidate.avatarEmoji}
                </div>

                <h3 className="mt-2 font-bold text-white text-[19px] sm:text-[22px] leading-tight">
                  {selectedCandidate.name}
                </h3>

                <p className="mt-0.5 text-[10px] sm:text-[11px] text-amber-400 font-semibold tracking-[0.16em] uppercase flex items-center gap-1.5 justify-center">
                  <Lock className="w-3.5 h-3.5" />
                  <span>Acceso Protegido de Administrador</span>
                </p>

                <p className="mt-1 text-xs sm:text-sm text-slate-300">Ingresa tu PIN</p>
              </div>

              {/* Puntos del PIN */}
              <div className={`flex justify-center gap-4 sm:gap-5 mt-2.5 ${shake ? 'fc-shake' : ''}`}>
                {Array.from({ length: expectedLength }).map((_, idx) => (
                  <div
                    key={idx}
                    className={`w-3.5 h-3.5 sm:w-4 sm:h-4 rounded-full border-2 transition-colors duration-100 ${
                      idx < pinCode.length
                        ? 'bg-emerald-400 border-emerald-400 shadow-[0_0_10px_#9486fb]'
                        : 'border-slate-600 bg-slate-800'
                    }`}
                  />
                ))}
              </div>

              {/* Mensajes (altura reservada para que el teclado no salte) */}
              <div className="w-full min-h-[34px] mt-1.5 flex items-center justify-center" aria-live="polite">
                {pinError && (
                  <div className="flex items-center gap-1.5 text-xs text-rose-300 font-semibold bg-rose-950/60 border border-rose-800 rounded-[12px] px-3 py-1.5 justify-center text-center">
                    <AlertCircle className="w-4 h-4 shrink-0" />
                    <span>{pinError}</span>
                  </div>
                )}
                {isSuccess && (
                  <div className="flex items-center gap-1.5 text-xs text-emerald-300 font-bold bg-emerald-950/60 border border-emerald-800 rounded-[12px] px-3 py-1.5 justify-center text-center">
                    <ShieldCheck className="w-4 h-4 text-emerald-400 shrink-0" />
                    <span>Llave Correcta. Iniciando...</span>
                  </div>
                )}
              </div>
            </div>

            {/* BLOQUE 2 (MEDIO): Espacio flexible */}
            <div className="flex-1 min-h-1" />

            {/* BLOQUE 3 (ABAJO): Teclado 3x4 */}
            <div className="w-full shrink-0">
              <div
                className="grid w-full"
                style={{ gridTemplateColumns: 'repeat(3, 1fr)', gap: '9px' }}
              >
                {KEYPAD_NUMBERS.map(renderNumberKey)}

                {/* Fila 4: [vacío]  0  [borrar] */}
                <div style={{ height: KEY_HEIGHT }} aria-hidden="true" />
                {renderNumberKey('0')}
                <button
                  type="button"
                  disabled={isSuccess}
                  onClick={handleBackspace}
                  aria-label="Borrar"
                  title="Borrar"
                  style={{ height: KEY_HEIGHT }}
                  className="w-full rounded-[18px] flex items-center justify-center bg-slate-900/40 border border-slate-700/40 text-slate-200 transition-all duration-100 active:scale-95 active:bg-emerald-400/15 active:border-emerald-400/50 focus:outline-none focus-visible:ring-2 focus-visible:ring-emerald-400 disabled:opacity-60 cursor-pointer select-none"
                >
                  <Delete className="w-7 h-7" />
                </button>
              </div>

              {/* Línea divisoria y botón Volver como enlace de texto */}
              <div className="mt-2 border-t border-slate-700/50">
                <button
                  type="button"
                  onClick={() => setSelectedCandidate(null)}
                  className="w-full h-11 flex items-center justify-center gap-2 text-sm font-medium text-slate-300 active:text-white transition-colors duration-100 cursor-pointer focus:outline-none focus-visible:ring-2 focus-visible:ring-emerald-400 rounded-[12px]"
                >
                  <ArrowLeft className="w-4 h-4" />
                  <span>Volver</span>
                </button>
              </div>
            </div>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div 
      id="welcome-identity-gateway" 
      className="fixed inset-0 h-[100dvh] w-full bg-slate-900 bg-gradient-to-tr from-slate-950 via-teal-950 to-emerald-950 text-white z-[99999] flex flex-col justify-between items-center overflow-y-auto px-4 pt-[calc(var(--sat,0px)+0.75rem)] md:pt-6 pb-[calc(var(--sab,0px)+0.5rem)] md:pb-6 select-none"
    >
      {/* Top ambient brand head */}
      <div className="text-center shrink-0 animate-fade-in">
        <div className="inline-flex items-center gap-1.5 bg-emerald-500/10 border border-emerald-500/20 px-3 py-0.5 rounded-full mb-1 text-[9.5px] font-bold tracking-[0.16em] text-emerald-300 uppercase">
          🛡️ Red Familiar Privada
        </div>
        <h1 className="text-2xl sm:text-3xl font-black tracking-tight bg-clip-text text-transparent bg-gradient-to-r from-emerald-150 via-teal-100 to-emerald-300 font-sans leading-tight">
          FamiChat
        </h1>
        <p className="text-[10.5px] text-teal-300/80 font-serif italic">by Martinez Alejandro</p>
      </div>

      {/* Center Dynamic Card Container */}
      <div className="w-full max-w-[340px] sm:max-w-sm mx-auto my-1.5 flex flex-col items-center shrink-0">
        <div className="w-full bg-white/5 backdrop-blur-md border border-white/10 rounded-3xl p-4 sm:p-6 shadow-[0_24px_64px_rgba(0,0,0,0.5)] space-y-3.5 animate-scale-up">
          <div className="text-center space-y-1">
            <h2 className="text-base sm:text-lg font-extrabold text-white text-center">¿Quién está ingresando hoy?</h2>
            <p className="text-[11px] text-white/60 leading-snug max-w-[250px] mx-auto text-center">
              Selecciona tu perfil para cargar tus mensajes privados y notas familiares del teléfono.
            </p>
          </div>

          {/* Avatars Listing Grid */}
          <div className="grid grid-cols-2 gap-2.5">
            {contacts.map((c) => (
              <button
                key={c.id}
                onClick={() => handleSelect(c)}
                className="group relative flex flex-col items-center p-3 bg-white/[0.03] hover:bg-white/[0.12] border border-white/5 hover:border-emerald-500/30 rounded-2xl transition-all cursor-pointer shadow-sm text-center active:scale-95 focus:outline-none"
              >
                <div className={`w-11 h-11 rounded-2xl flex items-center justify-center text-2xl shadow-lg border border-white/10 group-hover:scale-105 duration-200 transition-all ${c.avatarColor}`}>
                  {c.avatarEmoji}
                </div>
                <span className="font-extrabold text-[11.5px] text-white/95 mt-2 block truncate max-w-full">
                  {c.name}
                </span>
                <span className="text-[9px] text-teal-300/70 font-medium block truncate max-w-full italic">
                  {c.relationship} {c.role === 'admin' && '★'}
                </span>

                {c.role === 'admin' && (
                  <span className="absolute top-2 right-2 p-1 bg-amber-500/15 rounded text-[8px] font-black text-amber-300 border border-amber-500/25">
                    PIN
                  </span>
                )}
              </button>
            ))}
          </div>
        </div>
      </div>

      {/* Low-profile secure credits legend at the bottom */}
      <div className="text-center text-[9.5px] text-white/35 pb-0.5 font-medium select-none shrink-0">
        Encriptación local activa • FamiChat Martínez r2.7
      </div>
    </div>
  );
};
