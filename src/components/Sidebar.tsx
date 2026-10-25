import React, { useState } from 'react';
import { Contact, Message } from '../types';
import { Search, UserPlus, Shield, Trash2, Users, AlertCircle, Phone, X, CheckCircle, Smartphone, Star } from 'lucide-react';
import { ConfirmModal } from './ConfirmModal';
import { PinModal } from './PinModal';
import { formatLastActive, formatLastMessageTime } from '../utils/date';

interface SidebarProps {
  contacts: Contact[];
  currentUser: Contact;
  activeId: string | 'family-group';
  onSelectChat: (id: string | 'family-group') => void;
  onAddContact: (newContact: Omit<Contact, 'role'>) => void;
  onClearChat: (id: string | 'family-group') => void;
  messages: Message[];
  onStarMessage?: (messageId: string) => void;
  typingRegistry?: Record<string, string>;
}

export const Sidebar: React.FC<SidebarProps> = ({
  contacts,
  currentUser,
  activeId,
  onSelectChat,
  onAddContact,
  onClearChat,
  messages,
  onStarMessage,
  typingRegistry,
}) => {
  const [activeTab, setActiveTab] = useState<'chats' | 'starred'>('chats');
  const [searchQuery, setSearchQuery] = useState('');
  const [showAddModal, setShowAddModal] = useState(false);
  const [showPinModal, setShowPinModal] = useState(false);
  const [successMsg, setSuccessMsg] = useState('');
  const [adminModalTab, setAdminModalTab] = useState<'add-member' | 'security'>('add-member');
  const [tempPin, setTempPin] = useState(() => localStorage.getItem('famichat_admin_pin') || '1122');
  const [pinSuccessMsg, setPinSuccessMsg] = useState('');
  const [pinError, setPinError] = useState('');
  const [confirmModal, setConfirmModal] = useState<{
    isOpen: boolean;
    message: string;
    onConfirm: () => void;
  }>({ isOpen: false, message: '', onConfirm: () => {} });
  
  // Backing form states for Papá José Manuel Admin
  const [newMemberName, setNewMemberName] = useState('');
  const [newMemberRel, setNewMemberRel] = useState('');
  const [newMemberPhone, setNewMemberPhone] = useState('');
  const [newMemberEmoji, setNewMemberEmoji] = useState('🧑🏽');
  const [newMemberColor, setNewMemberColor] = useState('bg-teal-500');

  // Emojis lists to select for custom family member
  const EMOJI_OPTIONS = ['🧑🏽', '👩🏽', '👦🏽', '👧🏽', '🧔🏽', '👵🏽', '👴🏽', '👶🏽', '🎓', '✈️'];
  const COLOR_OPTIONS = [
    { label: 'Teal', bg: 'bg-teal-500' },
    { label: 'Azul', bg: 'bg-blue-500' },
    { label: 'Púrpura', bg: 'bg-purple-500' },
    { label: 'Rosa', bg: 'bg-pink-500' },
    { label: 'Rojo', bg: 'bg-rose-500' },
    { label: 'Naranja', bg: 'bg-orange-500' },
    { label: 'Indigo', bg: 'bg-indigo-500' },
    { label: 'Esmeralda', bg: 'bg-emerald-500' }
  ];

  // Exclude current simulated identity from the sidebar list of direct chats
  const chatContacts = contacts.filter(c => c.id !== currentUser.id);

  // Search filter
  const filteredContacts = chatContacts.filter(c =>
    c.name.toLowerCase().includes(searchQuery.toLowerCase()) ||
    c.relationship.toLowerCase().includes(searchQuery.toLowerCase())
  );

  // Retrieve the preview text of the last message in a direct or group channel
  const getLastMessage = (channelId: string | 'family-group') => {
    const channelMsgs = messages.filter(m => 
      channelId === 'family-group' 
        ? m.receiverId === 'family-group'
        : (m.senderId === channelId && m.receiverId === currentUser.id) ||
          (m.senderId === currentUser.id && m.receiverId === channelId)
    );
    if (channelMsgs.length === 0) return 'Sin mensajes';
    const last = channelMsgs[channelMsgs.length - 1];
    
    const senderName = last.senderId === currentUser.id ? 'Tú' : last.senderName.split(' ')[0];
    let bodyText = last.text;
    if (last.messageType === 'image') {
      bodyText = '📷 Foto compartida';
    } else if (last.messageType === 'audio') {
      bodyText = '🎙️ Nota de voz';
    }
    
    return `${senderName}: ${bodyText.length > 25 ? bodyText.substring(0, 25) + '...' : bodyText}`;
  };

  const getLastMessageTime = (channelId: string | 'family-group') => {
    const channelMsgs = messages.filter(m => 
      channelId === 'family-group' 
        ? m.receiverId === 'family-group'
        : (m.senderId === channelId && m.receiverId === currentUser.id) ||
          (m.senderId === currentUser.id && m.receiverId === channelId)
    );
    if (channelMsgs.length === 0) return '';
    const last = channelMsgs[channelMsgs.length - 1];
    return formatLastMessageTime(last.timestamp);
  };

  const handleCreateContactSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!newMemberName.trim() || !newMemberRel.trim()) return;

    // Create unique random id
    const newId = 'family-member-' + Date.now();
    onAddContact({
      id: newId,
      name: newMemberName.trim(),
      avatarEmoji: newMemberEmoji,
      avatarColor: newMemberColor,
      relationship: newMemberRel.trim(),
      isOnline: false,
      lastActive: 'Sin conexión registrada',
      lastActiveTimestamp: undefined,
      phone: newMemberPhone.trim() || undefined
    });

    setSuccessMsg('¡Familiar agregado con éxito!');
    setNewMemberName('');
    setNewMemberRel('');
    setNewMemberPhone('');
    
    setTimeout(() => {
      setSuccessMsg('');
      setShowAddModal(false);
    }, 1500);
  };

  return (
    <div id="sidebar-container" className="grow-0 shrink-0 w-full md:w-[350px] lg:w-[400px] bg-white border-r border-slate-200 flex flex-col h-full relative">
      
      {/* Sidebar Header */}
      <div className="p-4 bg-slate-50 border-b border-slate-200 flex items-center justify-between">
        <div className="flex items-center gap-3">
          <div className={`w-10 h-10 rounded-full ${currentUser.avatarColor} flex items-center justify-center text-xl shadow-inner`}>
            {currentUser.avatarEmoji}
          </div>
          <div>
            <h1 className="font-semibold text-slate-800 text-[15px] flex items-center gap-1">
              {currentUser.name}
            </h1>
            <p className="text-[11px] text-teal-600 font-medium">
              Rol: {currentUser.relationship}
            </p>
          </div>
        </div>

        {/* Action Button: Add Contact (Admin Only, exclusive to Papá Jose) */}
        {currentUser.role === 'admin' && (
          <button
            id="admin-add-contact-btn"
            onClick={() => setShowPinModal(true)}
            className="p-2 rounded-full bg-emerald-50 hover:bg-emerald-100 text-emerald-600 border border-emerald-200 hover:border-emerald-300 transition-all flex items-center gap-1 cursor-pointer"
            title="Añadir Integrante Familiar (Solo Admin)"
          >
            <UserPlus className="w-4 h-4" />
            <span className="text-xs font-semibold px-0.5">Añadir</span>
          </button>
        )}
      </div>

      {/* Modern Search Filters */}
      <div className="p-3 bg-white border-b border-slate-100">
        <div className="relative">
          <input
            id="sidebar-search-input"
            type="text"
            placeholder="Buscar conversación o familiar..."
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            className="w-full bg-slate-100 border border-transparent rounded-lg py-2 pl-9 pr-4 text-xs text-slate-750 focus:outline-none focus:bg-white focus:ring-1 focus:ring-emerald-500/50 focus:border-emerald-500 transition-all"
          />
          <Search className="w-3.5 h-3.5 text-slate-400 absolute left-3 top-2.5" />
        </div>
      </div>

      {/* Tab Switcher */}
      <div className="flex border-b border-slate-150 bg-slate-50 select-none shrink-0 font-sans shadow-xs">
        <button
          onClick={() => setActiveTab('chats')}
          className={`flex-1 py-3 text-center text-xs font-bold transition-all relative cursor-pointer ${
            activeTab === 'chats' 
              ? 'text-emerald-700 bg-white' 
              : 'text-slate-500 hover:text-slate-800 hover:bg-slate-100/50'
          }`}
        >
          Conversaciones 🏡
          {activeTab === 'chats' && (
            <div className="absolute bottom-0 left-0 right-0 h-0.5 bg-emerald-600 rounded-t-full" />
          )}
        </button>
        <button
          onClick={() => setActiveTab('starred')}
          className={`flex-1 py-3 text-center text-xs font-bold transition-all relative flex items-center justify-center gap-1.5 cursor-pointer ${
            activeTab === 'starred' 
              ? 'text-amber-600 bg-white' 
              : 'text-slate-500 hover:text-slate-800 hover:bg-slate-100/50'
          }`}
        >
          <Star className={`w-3.5 h-3.5 ${activeTab === 'starred' ? 'fill-amber-500 text-amber-500' : 'text-slate-400'}`} />
          <span>Destacados</span>
          {messages.filter(m => m.isStarred).length > 0 && (
            <span className="bg-amber-100 text-amber-900 border border-amber-300 text-[9px] font-extrabold px-1.5 py-0.2 rounded-full leading-none">
              {messages.filter(m => m.isStarred).length}
            </span>
          )}
          {activeTab === 'starred' && (
            <div className="absolute bottom-0 left-0 right-0 h-0.5 bg-amber-500 rounded-t-full" />
          )}
        </button>
      </div>

      {/* Contacts and Rooms Scrollable Directory */}
      <div className="flex-1 overflow-y-auto divide-y divide-slate-100 custom-scrollbar bg-slate-50/10">
        {activeTab === 'starred' ? (
          <div className="p-3 bg-slate-100/40 space-y-2.5 min-h-full">
            {messages.filter(m => m.isStarred).filter(m => 
              (m.text || '').toLowerCase().includes(searchQuery.toLowerCase()) ||
              m.senderName.toLowerCase().includes(searchQuery.toLowerCase())
            ).length === 0 ? (
              <div className="p-8 text-center text-slate-400 flex flex-col items-center justify-center gap-2 select-none">
                <div className="p-3 bg-amber-50 rounded-full border border-amber-100 animate-pulse">
                  <Star className="w-7 h-7 text-amber-400 fill-amber-300" />
                </div>
                <p className="text-xs font-bold text-slate-700">No hay destacados</p>
                <p className="text-[10px] text-slate-450 leading-relaxed max-w-[200px]">
                  {searchQuery ? 'No coinciden con tu búsqueda.' : 'Pon el mouse o mantén presionado un mensaje en el chat, luego presiona "Destacar" ⭐.'}
                </p>
              </div>
            ) : (
              messages.filter(m => m.isStarred).filter(m => 
                (m.text || '').toLowerCase().includes(searchQuery.toLowerCase()) ||
                m.senderName.toLowerCase().includes(searchQuery.toLowerCase())
              ).map((msg) => {
                const getChatIdForMessage = (m: Message) => {
                  if (m.receiverId === 'family-group') return 'family-group';
                  return m.senderId === currentUser.id ? m.receiverId : m.senderId;
                };
                const chatId = getChatIdForMessage(msg);
                const senderContact = contacts.find(c => c.id === msg.senderId) || currentUser;
                const isGroup = msg.receiverId === 'family-group';
                
                return (
                  <div
                    key={msg.id}
                    className="p-3.5 rounded-xl bg-white hover:bg-emerald-50/15 border border-slate-200/80 hover:border-emerald-200 transition-all shadow-xs cursor-pointer flex flex-col gap-2 relative min-w-0"
                    onClick={() => onSelectChat(chatId)}
                  >
                    {/* Card Header & Sender Profile */}
                    <div className="flex items-center justify-between gap-1.5 select-none">
                      <div className="flex items-center gap-2 min-w-0">
                        <div className={`w-7 h-7 rounded-full ${senderContact.id === currentUser.id ? currentUser.avatarColor : senderContact.avatarColor} text-white flex items-center justify-center text-xs shrink-0 shadow-xs border border-white`}>
                          {senderContact.id === currentUser.id ? currentUser.avatarEmoji : senderContact.avatarEmoji}
                        </div>
                        <div className="min-w-0 leading-tight">
                          <h4 className="font-bold text-slate-800 text-[11.5px] truncate">
                            {msg.senderName}
                          </h4>
                          <span className="text-[8.5px] bg-slate-100 border border-slate-200 text-slate-600 font-extrabold px-1.5 py-0.2 rounded-full uppercase">
                            {senderContact.relationship} {isGroup ? '• Grupal 🏡' : ''}
                          </span>
                        </div>
                      </div>
                      
                      <span className="text-[9px] text-slate-400 font-bold whitespace-nowrap">
                        {formatLastMessageTime(msg.timestamp)}
                      </span>
                    </div>

                    {/* Chat Bubble Body */}
                    <div className="bg-slate-50/60 p-2.5 rounded-lg border border-slate-200/50 text-[11.5px] text-slate-700 break-words leading-relaxed font-sans">
                      {msg.messageType === 'image' ? (
                        <div className="flex items-center gap-1.5 text-emerald-600 font-bold select-none">
                          <span className="text-sm">📸</span>
                          <span>Foto compartida</span>
                        </div>
                      ) : msg.messageType === 'audio' ? (
                        <div className="flex items-center gap-1.5 text-sky-600 font-bold select-none">
                          <span className="text-sm">🎙️</span>
                          <span>Nota de voz familiar</span>
                        </div>
                      ) : (
                        <p className="font-semibold text-slate-800">{msg.text}</p>
                      )}
                    </div>

                    {/* Action Bar */}
                    <div className="flex justify-between items-center select-none pt-2 border-t border-slate-100">
                      <span className="text-[9.5px] text-emerald-600 font-bold hover:underline">Ver conversación →</span>
                      <button
                        type="button"
                        onClick={(e) => {
                          e.stopPropagation();
                          onStarMessage?.(msg.id);
                        }}
                        className="text-amber-600 hover:text-rose-600 hover:bg-rose-50 p-1 px-1.5 rounded transition-all text-[9px] font-extrabold border border-amber-200 hover:border-rose-200 cursor-pointer flex items-center gap-1 bg-white shadow-xs"
                        title="Quitar de Destacados"
                      >
                        <Star className="w-3 h-3 fill-amber-500 text-amber-500" />
                        <span>Quitar</span>
                      </button>
                    </div>
                  </div>
                );
              })
            )}
          </div>
        ) : (
          <>
            {/* GROUP CHAT OPTION - Always available if query allows */}
            {('familia unida').includes(searchQuery.toLowerCase()) && (() => {
              const groupWriters = typingRegistry ? Object.entries(typingRegistry)
                .filter(([writerId, roomId]) => writerId !== currentUser?.id && roomId === 'family-group')
                .map(([writerId]) => {
                  const c = contacts.find(contact => contact.id === writerId);
                  return c ? c.name.split(' ')[0] : '';
                })
                .filter(Boolean) : [];
              const groupIsWriting = groupWriters.length > 0;

              return (
                <div
                  id="group-chat-room-item"
                  className={`p-3.5 flex items-start gap-3 cursor-pointer transition-all hover:bg-slate-50 relative ${
                    activeId === 'family-group' ? 'bg-emerald-50/70 border-l-4 border-emerald-500' : ''
                  }`}
                  onClick={() => onSelectChat('family-group')}
                >
                  <div className="w-11 h-11 rounded-full bg-emerald-600 text-white flex items-center justify-center text-xl shadow-md border border-white shrink-0">
                    🏡
                  </div>
                  
                  <div className="flex-1 min-w-0">
                    <div className="flex items-center justify-between">
                      <span className="font-semibold text-slate-800 text-sm tracking-wide">
                        Familia Unida 🏡
                      </span>
                      <span className="text-[10px] text-slate-400 font-medium">
                        {getLastMessageTime('family-group')}
                      </span>
                    </div>
                    
                    <div className="flex items-center justify-between mt-0.5">
                      {groupIsWriting ? (
                        <p className="text-xs text-emerald-600 font-bold truncate pr-4 animate-pulse">
                          Escribiendo...
                        </p>
                      ) : (
                        <p className="text-xs text-slate-500 truncate pr-4">
                          {getLastMessage('family-group')}
                        </p>
                      )}
                      
                      <button
                        onClick={(e) => {
                          e.stopPropagation();
                          setConfirmModal({
                            isOpen: true,
                            message: '¿Deseas vaciar la conversación de Familia Unida?',
                            onConfirm: () => onClearChat('family-group')
                          });
                        }}
                        className="opacity-0 group-hover:opacity-100 hover:text-red-500 p-1 text-slate-350 transition-opacity absolute right-4 bottom-3 hover:bg-slate-100 rounded"
                        title="Vaciar chat grupal"
                      >
                        <Trash2 className="w-3.5 h-3.5" />
                      </button>
                    </div>
                    
                    <div className="flex gap-1.5 mt-1">
                      {contacts.slice(0, 3).map((item) => (
                        <span 
                          key={item.id} 
                          className="text-[10px] bg-slate-100 text-slate-600 px-1.5 py-0.2 rounded font-medium border border-slate-200"
                        >
                          {item.name.split(' ')[0]}
                        </span>
                      ))}
                      {contacts.length > 3 && (
                        <span className="text-[10px] text-slate-450 self-center font-semibold">
                          +{contacts.length - 3}
                        </span>
                      )}
                    </div>
                  </div>
                </div>
              );
            })()}

            {/* 1-on-1 DIRECT MESSAGES */}
            {filteredContacts.length === 0 ? (
              <div className="p-8 text-center text-slate-450 flex flex-col items-center gap-2">
                <AlertCircle className="w-8 h-8 text-slate-300" />
                <p className="text-xs">No se encontraron familiares.</p>
              </div>
            ) : (
               filteredContacts.map((contact) => {
                 const isActive = activeId === contact.id;
                 const isWriting = typingRegistry && typingRegistry[contact.id] && (
                   typingRegistry[contact.id] === 'family-group' || 
                   typingRegistry[contact.id] === currentUser.id
                 );
                 return (
                   <div
                     key={contact.id}
                     id={`chat-room-item-${contact.id}`}
                     className={`group p-3.5 flex items-start gap-3 cursor-pointer transition-all hover:bg-slate-50 relative ${
                       isActive ? 'bg-emerald-50/70 border-l-4 border-emerald-500' : ''
                     }`}
                     onClick={() => onSelectChat(contact.id)}
                   >
                     {/* Avatar with live status rings */}
                     <div className="relative shrink-0 select-none">
                       <div className={`w-11 h-11 rounded-full ${contact.avatarColor} text-white flex items-center justify-center text-xl shadow-md border border-white`}>
                         {contact.avatarEmoji}
                       </div>
                       {contact.isOnline ? (
                         <span 
                           className="absolute bottom-0 right-0 h-3 w-3 rounded-full bg-emerald-500 border-[2px] border-white shadow-sm ring-1 ring-emerald-500/20" 
                           title="Conectado"
                         />
                       ) : (
                         <span 
                           className="absolute bottom-0 right-0 h-3 w-3 rounded-full bg-slate-300 border-[2px] border-white shadow-sm"
                           title="Desconectado" 
                         />
                       )}
                     </div>

                     {/* Info and Preview */}
                     <div className="flex-1 min-w-0">
                       <div className="flex items-center justify-between">
                         <div className="flex items-center gap-1.5 min-w-0">
                           <span className="font-semibold text-slate-800 text-[13.5px] truncate">
                             {contact.name}
                           </span>
                           <span className="text-[10px] bg-slate-100 text-slate-500 px-1.5 rounded-full font-semibold border border-slate-200 capitalize shrink-0">
                             {contact.relationship}
                           </span>
                         </div>
                         <span className="text-[10px] text-slate-400 font-medium shrink-0">
                           {getLastMessageTime(contact.id)}
                         </span>
                       </div>

                       {isWriting ? (
                         <p className="text-[12.5px] text-emerald-600 font-bold mt-0.5 truncate pr-8 animate-pulse">
                           Escribiendo...
                         </p>
                       ) : (
                         <p className="text-[12.5px] text-slate-500 mt-0.5 truncate pr-8">
                           {getLastMessage(contact.id)}
                         </p>
                       )}

                       <div className="flex items-center gap-2 mt-1">
                         {contact.isOnline ? (
                           <span className="text-[10.5px] text-emerald-650 font-semibold uppercase tracking-wider text-[9px] animate-pulse">
                             {formatLastActive(contact)}
                           </span>
                         ) : (
                           <span className="text-[10.5px] text-slate-400 font-medium whitespace-nowrap overflow-hidden text-ellipsis max-w-[200px]">
                             {formatLastActive(contact)}
                           </span>
                         )}
                       </div>
                     </div>

                    {/* Hover clear chat action */}
                    <button
                      id={`clear-chat-shortcut-${contact.id}`}
                      onClick={(e) => {
                        e.stopPropagation();
                        setConfirmModal({
                          isOpen: true,
                          message: `¿Deseas vaciar la conversación con ${contact.name}?`,
                          onConfirm: () => onClearChat(contact.id)
                        });
                      }}
                      className="opacity-0 group-hover:opacity-100 hover:text-rose-500 p-1.5 text-slate-400 transition-opacity absolute right-4 bottom-3 hover:bg-slate-100 rounded"
                      title="Borrar conversación completa de chat"
                    >
                      <Trash2 className="w-3.5 h-3.5" />
                    </button>
                  </div>
                );
              })
            )}
          </>
        )}
      </div>

      {/* ADMIN ADD CONTACT MODAL / DRAWER (gorgeously layouted inside) */}
      {showAddModal && (
        <div id="admin-add-contact-modal" className="absolute inset-0 bg-slate-950/65 backdrop-blur-sm z-40 flex items-center justify-center p-4">
          <div className="bg-white rounded-xl shadow-2xl w-full max-w-sm border border-slate-100 overflow-hidden flex flex-col justify-between animate-fade-in">
            
            {/* Modal Header */}
            <div className="p-4 bg-teal-655 text-white flex flex-col gap-2.5">
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-2">
                  <Shield className="w-5 h-5 text-amber-300 animate-pulse" />
                  <div>
                    <h3 className="font-bold text-sm tracking-wide">Panel de Administrador</h3>
                    <p className="text-[10px] text-teal-100">Solo administradores autorizados</p>
                  </div>
                </div>
                <button 
                  onClick={() => setShowAddModal(false)}
                  className="text-white/80 hover:text-white hover:bg-white/10 p-1 rounded-full transition-all cursor-pointer"
                >
                  <X className="w-5 h-5" />
                </button>
              </div>

              {/* Subtabs for Modal Navigation */}
              <div className="flex gap-1.5 p-0.5 bg-slate-950/20 rounded-lg text-xs">
                <button
                  type="button"
                  onClick={() => { setAdminModalTab('add-member'); setSuccessMsg(''); }}
                  className={`flex-1 py-1.5 px-2 rounded-md font-medium text-center transition-all cursor-pointer ${
                    adminModalTab === 'add-member' 
                      ? 'bg-white text-teal-700 shadow-sm' 
                      : 'text-teal-50 hover:text-white hover:bg-white/5'
                  }`}
                >
                  ➕ Añadir Miembro
                </button>
                <button
                  type="button"
                  onClick={() => { 
                    setAdminModalTab('security'); 
                    setPinSuccessMsg(''); 
                    setPinError('');
                    setTempPin(localStorage.getItem('famichat_admin_pin') || '1122');
                  }}
                  className={`flex-1 py-1.5 px-2 rounded-md font-medium text-center transition-all cursor-pointer ${
                    adminModalTab === 'security' 
                      ? 'bg-white text-teal-700 shadow-sm' 
                      : 'text-teal-50 hover:text-white hover:bg-white/5'
                  }`}
                >
                  🔒 Clave Switcher
                </button>
              </div>
            </div>

            {/* Modal Content body depending on Active Tab */}
            {adminModalTab === 'security' ? (
              <div className="p-4 space-y-4">
                {pinSuccessMsg ? (
                  <div className="py-8 text-center flex flex-col items-center justify-center gap-2 text-emerald-600 animate-pulse">
                    <CheckCircle className="w-12 h-12" />
                    <p className="font-bold text-sm">{pinSuccessMsg}</p>
                  </div>
                ) : (
                  <div className="space-y-4">
                    <div className="bg-amber-50 rounded-lg p-3 border border-amber-200 text-[11px] text-amber-800 leading-relaxed">
                      El PIN de seguridad restringe que otros usuarios cambien de perfil en este navegador. Para cambiarlo, asigne un número de 4 a 8 dígitos.
                    </div>

                    <div>
                      <label className="block text-[11px] font-bold text-slate-655 uppercase tracking-wider mb-1">
                        Nuevo PIN Numérico *
                      </label>
                      <input
                        id="new-temp-pin-input"
                        type="password"
                        pattern="[0-9]*"
                        inputMode="numeric"
                        maxLength={8}
                        placeholder="Mínimo 4 dígitos"
                        value={tempPin}
                        onChange={(e) => {
                          setPinError('');
                          setTempPin(e.target.value.replace(/[^0-9]/g, ''));
                        }}
                        className="w-full text-center text-lg tracking-widest border border-slate-200 rounded-lg p-2.5 font-mono text-slate-800 focus:outline-none focus:ring-1 focus:ring-teal-500 focus:border-teal-500 transition-all font-bold"
                      />
                      {pinError && (
                        <p className="text-rose-600 text-[10px] font-semibold mt-1 bg-rose-50 px-2 py-1 rounded border border-rose-150 animate-pulse">
                          {pinError}
                        </p>
                      )}
                    </div>

                    <div className="pt-2 flex gap-2">
                      <button
                        type="button"
                        onClick={() => setShowAddModal(false)}
                        className="flex-1 bg-slate-100 hover:bg-slate-200 text-slate-650 font-semibold py-2 rounded-lg text-xs tracking-wide transition-colors cursor-pointer"
                      >
                        Cancelar
                      </button>
                      <button
                        type="button"
                        onClick={() => {
                          if (tempPin.length < 4) {
                            setPinError("La clave debe tener al menos 4 números.");
                            return;
                          }
                          localStorage.setItem('famichat_admin_pin', tempPin);
                          setPinSuccessMsg('¡Clave de seguridad actualizada con éxito!');
                          setTimeout(() => {
                            setPinSuccessMsg('');
                            setShowAddModal(false);
                          }, 1500);
                        }}
                        className="flex-1 bg-teal-600 hover:bg-teal-700 text-white font-semibold py-2 rounded-lg text-xs tracking-wide shadow-md shadow-teal-600/15 transition-all cursor-pointer"
                      >
                        Guardar Clave
                      </button>
                    </div>
                  </div>
                )}
              </div>
            ) : (
              <form onSubmit={handleCreateContactSubmit} className="p-4 flex-1 space-y-3.5">
                {successMsg ? (
                  <div className="py-8 text-center flex flex-col items-center justify-center gap-2 text-emerald-600 animate-pulse">
                    <CheckCircle className="w-12 h-12" />
                    <p className="font-bold text-sm">{successMsg}</p>
                  </div>
                ) : (
                  <>
                    <div>
                      <label className="block text-[11px] font-bold text-slate-650 uppercase tracking-wider mb-1">
                        Nombre Completo *
                      </label>
                      <input
                        id="new-member-name-input"
                        type="text"
                        required
                        placeholder="Ej. Tía Margarita Silva"
                        value={newMemberName}
                        onChange={(e) => setNewMemberName(e.target.value)}
                        className="w-full text-xs border border-slate-200 rounded-lg p-2.5 focus:outline-none focus:ring-1 focus:ring-teal-500 focus:border-teal-500 transition-all text-slate-800"
                      />
                    </div>

                    <div className="grid grid-cols-2 gap-2">
                      <div>
                        <label className="block text-[11px] font-bold text-slate-650 uppercase tracking-wider mb-1">
                          Parentesco / Rol *
                        </label>
                        <input
                          id="new-member-relation-input"
                          type="text"
                          required
                          placeholder="Ej. Primita / Hermano"
                          value={newMemberRel}
                          onChange={(e) => setNewMemberRel(e.target.value)}
                          className="w-full text-xs border border-slate-200 rounded-lg p-2.5 focus:outline-none focus:ring-1 focus:ring-teal-500 focus:border-teal-500 transition-all text-slate-800"
                        />
                      </div>

                      <div>
                        <label className="block text-[11px] font-bold text-slate-650 uppercase tracking-wider mb-1">
                          Teléfono
                        </label>
                        <input
                          id="new-member-phone-input"
                          type="text"
                          placeholder="Ej. +569 ..."
                          value={newMemberPhone}
                          onChange={(e) => setNewMemberPhone(e.target.value)}
                          className="w-full text-xs border border-slate-200 rounded-lg p-2.5 focus:outline-none focus:ring-1 focus:ring-teal-500 focus:border-teal-500 transition-all text-slate-800"
                        />
                      </div>
                    </div>

                    {/* Icon Selectors */}
                    <div>
                      <label className="block text-[11px] font-bold text-slate-655 uppercase tracking-wider mb-1.5">
                        Seleccionar Emoji Avatar
                      </label>
                      <div className="flex gap-1.5 overflow-x-auto pb-1 scrollbar-none">
                        {EMOJI_OPTIONS.map(em => (
                          <button
                            key={em}
                            type="button"
                            onClick={() => setNewMemberEmoji(em)}
                            className={`w-9 h-9 rounded-lg border text-lg flex items-center justify-center shrink-0 transition-all cursor-pointer ${
                              newMemberEmoji === em 
                                ? 'bg-teal-50 border-teal-500 shadow-sm outline-none ring-2 ring-teal-500/20' 
                                : 'bg-slate-50 border-slate-200 hover:bg-slate-105'
                            }`}
                          >
                            {em}
                          </button>
                        ))}
                      </div>
                    </div>

                    {/* Color Selectors */}
                    <div>
                      <label className="block text-[11px] font-bold text-slate-655 uppercase tracking-wider mb-1.5">
                        Color de Fondo
                      </label>
                      <div className="flex gap-2 overflow-x-auto pb-1 scrollbar-none">
                        {COLOR_OPTIONS.map(col => (
                          <button
                            key={col.bg}
                            type="button"
                            onClick={() => setNewMemberColor(col.bg)}
                            className={`w-6 h-6 rounded-full shrink-0 transition-all relative border border-black/5 cursor-pointer ${col.bg} ${
                              newMemberColor === col.bg ? 'scale-110 ring-2 ring-emerald-500 border-white ring-offset-1' : ''
                            }`}
                            title={col.label}
                          />
                        ))}
                      </div>
                    </div>


                    <div className="pt-2 flex gap-2">
                      <button
                        type="button"
                        onClick={() => setShowAddModal(false)}
                        className="flex-1 bg-slate-100 hover:bg-slate-200 text-slate-650 font-semibold py-2 rounded-lg text-xs tracking-wide transition-colors cursor-pointer"
                      >
                        Cancelar
                      </button>
                      <button
                        id="save-new-member-btn"
                        type="submit"
                        className="flex-1 bg-teal-600 hover:bg-teal-700 text-white font-semibold py-2 rounded-lg text-xs tracking-wide shadow-md shadow-teal-600/15 transition-all cursor-pointer"
                      >
                        Registrar Integrante
                      </button>
                    </div>
                  </>
                )}
              </form>
            )}
          </div>
        </div>
      )}

      {/* Reusable custom non-browser alert confirmation modal */}
      <ConfirmModal
        isOpen={confirmModal.isOpen}
        message={confirmModal.message}
        onConfirm={confirmModal.onConfirm}
        onCancel={() => setConfirmModal(prev => ({ ...prev, isOpen: false }))}
      />

      {/* Admin security verification modal */}
      <PinModal
        isOpen={showPinModal}
        onClose={() => setShowPinModal(false)}
        onSuccess={() => setShowAddModal(true)}
      />
    </div>
  );
};
