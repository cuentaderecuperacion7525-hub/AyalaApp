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

  const KEYPAD_KEYS = [
    { num: '1', letters: '' },
    { num: '2', letters: 'ABC' },
    { num: '3', letters: 'DEF' },
    { num: '4', letters: 'GHI' },
    { num: '5', letters: 'JKL' },
    { num: '6', letters: 'MNO' },
    { num: '7', letters: 'PQRS' },
    { num: '8', letters: 'TUV' },
    { num: '9', letters: 'WXYZ' },
  ];

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
        {!selectedCandidate ? (
          /* Selection Screen State */
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
        ) : (
          /* PIN Challenge Screen State for Admin only */
          <div className="w-full bg-slate-900 border border-slate-800 rounded-3xl px-4 py-3.5 sm:p-5 shadow-[0_24px_64px_rgba(0,0,0,0.8)] space-y-2.5 animate-scale-up relative">
            <button
              onClick={() => setSelectedCandidate(null)}
              className="absolute left-3.5 top-3.5 text-slate-400 hover:text-white flex items-center gap-1 text-[11px] font-bold bg-white/5 px-2.5 py-1 rounded-xl transition-all cursor-pointer"
            >
              <ArrowLeft className="w-3 h-3" />
              <span>Volver</span>
            </button>

            <div className="flex flex-col items-center text-center space-y-1 pt-1">
              <div className={`w-11 h-11 rounded-2xl flex items-center justify-center text-2xl shadow-md border border-white/10 ${selectedCandidate.avatarColor}`}>
                {selectedCandidate.avatarEmoji}
              </div>
              <div className="space-y-0.5">
                <h3 className="font-extrabold text-white text-sm">{selectedCandidate.name}</h3>
                <p className="text-[9px] text-amber-400 font-semibold tracking-wider uppercase flex items-center gap-1 justify-center">
                  <Lock className="w-2.5 h-2.5" />
                  <span>Acceso Protegido de Administrador</span>
                </p>
              </div>
            </div>

            {/* Display digits filled dots */}
            <div className="flex justify-center gap-3 py-0.5">
              {[0, 1, 2, 3].map((idx) => (
                <div
                  key={idx}
                  className={`w-3 h-3 rounded-full border-2 transition-all duration-150 ${
                    idx < pinCode.length
                      ? 'bg-emerald-450 border-emerald-400 scale-110 shadow-[0_0_10px_#34d399]'
                      : 'border-slate-700 bg-transparent'
                  }`}
                />
              ))}
            </div>

            {pinError && (
              <div className="flex items-center gap-1.5 text-[10.5px] text-rose-300 font-semibold bg-rose-950/40 border border-rose-800 rounded-xl px-2.5 py-1 animate-pulse justify-center text-center">
                <AlertCircle className="w-3 h-3 shrink-0" />
                <span>{pinError}</span>
              </div>
            )}

            {isSuccess && (
              <div className="flex items-center gap-1.5 text-[10.5px] text-emerald-300 font-bold bg-emerald-950/40 border border-emerald-800 rounded-xl px-2.5 py-1 animate-bounce justify-center text-center">
                <ShieldCheck className="w-3 h-3 text-emerald-400 shrink-0" />
                <span>Llave Correcta. Iniciando...</span>
              </div>
            )}

            {/* Compact Alphanumeric Lock Security Keypad */}
            <div className="grid grid-cols-3 gap-1.5 max-w-[205px] mx-auto pt-0.5">
              {KEYPAD_KEYS.map(({ num, letters }) => (
                <button
                  key={num}
                  disabled={isSuccess}
                  onClick={() => handleKeypadPress(num)}
                  className="h-10 sm:h-11 bg-slate-800 hover:bg-slate-750 active:bg-slate-700 text-white rounded-xl flex flex-col items-center justify-center transition-colors cursor-pointer focus:outline-none border border-slate-700/80 select-none shadow-sm"
                >
                  <span className="font-black text-sm sm:text-base leading-none">{num}</span>
                  <span className="text-[7.5px] font-bold tracking-[0.15em] text-slate-400 leading-none mt-0.5 uppercase">
                    {letters || '\u00A0'}
                  </span>
                </button>
              ))}
              <div />
              <button
                disabled={isSuccess}
                onClick={() => handleKeypadPress('0')}
                className="h-10 sm:h-11 bg-slate-800 hover:bg-slate-750 active:bg-slate-700 text-white rounded-xl flex flex-col items-center justify-center transition-colors cursor-pointer focus:outline-none border border-slate-700/80 select-none shadow-sm"
              >
                <span className="font-black text-sm sm:text-base leading-none">0</span>
                <span className="text-[7.5px] font-bold tracking-widest text-slate-400 leading-none mt-0.5">+</span>
              </button>
              <button
                disabled={isSuccess}
                onClick={handleBackspace}
                className="h-10 sm:h-11 bg-slate-850 hover:bg-slate-800 active:bg-slate-750 text-slate-400 hover:text-white font-bold text-sm rounded-xl flex items-center justify-center transition-all cursor-pointer focus:outline-none border border-slate-800 select-none"
                title="Borrar"
              >
                ⌫
              </button>
            </div>
          </div>
        )}
      </div>

      {/* Low-profile secure credits legend at the bottom */}
      <div className="text-center text-[9.5px] text-white/35 pb-0.5 font-medium select-none shrink-0">
        Encriptación local activa • FamiChat Martínez r2.7
      </div>
    </div>
  );
};
