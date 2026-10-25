import React, { useState } from 'react';
import { Contact } from '../types';
import { ShieldCheck, Lock, Check, HelpCircle, ArrowLeft, KeyRound, AlertCircle } from 'lucide-react';

interface WelcomeGatewayProps {
  contacts: Contact[];
  onSelectUser: (user: Contact) => void;
}

export const WelcomeGateway: React.FC<WelcomeGatewayProps> = ({ contacts, onSelectUser }) => {
  const [selectedCandidate, setSelectedCandidate] = useState<Contact | null>(null);
  const [pinCode, setPinCode] = useState<string>('');
  const [pinError, setPinError] = useState<string>('');
  const [isSuccess, setIsSuccess] = useState<boolean>(false);

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

  const handleKeypadPress = (num: string) => {
    setPinError('');
    if (pinCode.length >= 4) return;
    const nextPin = pinCode + num;
    setPinCode(nextPin);

    const expected = getExpectedPin();
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
      }, 150);
    }
  };

  const handleBackspace = () => {
    setPinCode(prev => prev.slice(0, -1));
    setPinError('');
  };

  const KEYPAD_NUMBERS = ['1', '2', '3', '4', '5', '6', '7', '8', '9'];

  if (selectedCandidate) {
    return (
      <div
        id="welcome-identity-gateway"
        className="fixed inset-0 h-[100dvh] w-full bg-slate-900 bg-gradient-to-tr from-slate-950 via-teal-950 to-emerald-950 text-white z-[99999] flex flex-col overflow-hidden select-none"
        style={{
          paddingTop: 'calc(max(env(safe-area-inset-top, 0px), var(--sat, 0px)) + 12px)',
          paddingBottom: 'calc(max(env(safe-area-inset-bottom, 0px), var(--sab, 0px)) + 16px)',
        }}
      >
        <div className="w-full max-w-[430px] h-full mx-auto px-4 flex flex-col justify-between">
          {/* BLOQUE 1 (ARRIBA): Logo/Título y puntos del PIN */}
          <div className="w-full shrink-0 flex flex-col items-center">
            <div className="w-full flex items-center justify-between mb-2">
              <button
                type="button"
                onClick={() => setSelectedCandidate(null)}
                className="text-slate-300 active:bg-white/15 flex items-center gap-1.5 text-xs font-bold bg-white/10 px-3 py-1.5 rounded-[12px] transition-colors duration-75 cursor-pointer"
              >
                <ArrowLeft className="w-4 h-4" />
                <span>Volver</span>
              </button>
              <span className="text-xs font-black tracking-wider uppercase text-emerald-300/90 font-sans">
                FamiChat
              </span>
              <div className="w-[72px]" />
            </div>

            <div className="flex flex-col items-center text-center space-y-1.5 mt-1">
              <div className={`w-14 h-14 rounded-2xl flex items-center justify-center text-3xl shadow-md border border-white/10 ${selectedCandidate.avatarColor}`}>
                {selectedCandidate.avatarEmoji}
              </div>
              <h3 className="font-extrabold text-white text-base sm:text-lg leading-tight">
                {selectedCandidate.name}
              </h3>
              <p className="text-[10px] text-amber-400 font-semibold tracking-wider uppercase flex items-center gap-1 justify-center">
                <Lock className="w-3 h-3" />
                <span>Acceso Protegido de Administrador</span>
              </p>
            </div>

            {/* Puntos del PIN */}
            <div className="flex justify-center gap-4 mt-4 mb-1">
              {[0, 1, 2, 3].map((idx) => (
                <div
                  key={idx}
                  className={`w-4 h-4 rounded-full border-2 transition-colors duration-75 ${
                    idx < pinCode.length
                      ? 'bg-emerald-400 border-emerald-400 shadow-[0_0_10px_#34d399]'
                      : 'border-slate-600 bg-transparent'
                  }`}
                />
              ))}
            </div>

            {pinError && (
              <div className="flex items-center gap-1.5 text-xs text-rose-300 font-semibold bg-rose-950/60 border border-rose-800 rounded-[12px] px-3 py-1.5 mt-2 justify-center text-center">
                <AlertCircle className="w-3.5 h-3.5 shrink-0" />
                <span>{pinError}</span>
              </div>
            )}

            {isSuccess && (
              <div className="flex items-center gap-1.5 text-xs text-emerald-300 font-bold bg-emerald-950/60 border border-emerald-800 rounded-[12px] px-3 py-1.5 mt-2 justify-center text-center">
                <ShieldCheck className="w-3.5 h-3.5 text-emerald-400 shrink-0" />
                <span>Llave Correcta. Iniciando...</span>
              </div>
            )}
          </div>

          {/* BLOQUE 2 (MEDIO): Espacio flexible */}
          <div className="flex-1 min-h-2" />

          {/* BLOQUE 3 (ABAJO): Teclado tipo calculadora 3x4 pegado a la parte baja con margen */}
          <div className="w-full shrink-0">
            <div
              className="grid w-full"
              style={{
                gridTemplateColumns: 'repeat(3, 1fr)',
                gap: '8px',
              }}
            >
              {KEYPAD_NUMBERS.map((num) => (
                <button
                  key={num}
                  type="button"
                  disabled={isSuccess}
                  onClick={() => handleKeypadPress(num)}
                  style={{ height: 'clamp(64px, 9dvh, 78px)' }}
                  className="w-full bg-slate-800/95 active:bg-slate-600 text-white rounded-[12px] flex items-center justify-center transition-colors duration-75 cursor-pointer focus:outline-none border border-slate-700/80 select-none"
                >
                  <span className="font-bold text-[28px] leading-none">{num}</span>
                </button>
              ))}

              {/* Fila 4: [vacío]  0  [borrar ⌫] */}
              <div style={{ height: 'clamp(64px, 9dvh, 78px)' }} />

              <button
                type="button"
                disabled={isSuccess}
                onClick={() => handleKeypadPress('0')}
                style={{ height: 'clamp(64px, 9dvh, 78px)' }}
                className="w-full bg-slate-800/95 active:bg-slate-600 text-white rounded-[12px] flex items-center justify-center transition-colors duration-75 cursor-pointer focus:outline-none border border-slate-700/80 select-none"
              >
                <span className="font-bold text-[28px] leading-none">0</span>
              </button>

              <button
                type="button"
                disabled={isSuccess}
                onClick={handleBackspace}
                style={{ height: 'clamp(64px, 9dvh, 78px)' }}
                className="w-full bg-slate-800/60 active:bg-slate-600 text-slate-200 rounded-[12px] flex items-center justify-center transition-colors duration-75 cursor-pointer focus:outline-none border border-slate-700/60 select-none"
                title="Borrar"
              >
                <span className="font-bold text-[28px] leading-none">⌫</span>
              </button>
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
