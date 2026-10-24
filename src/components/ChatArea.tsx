import React, { useState, useRef, useEffect } from 'react';
import { Contact, Message } from '../types';
import { 
  Send, Smile, Paperclip, MoreVertical, Search, Bell, Phone, Video, Trash2, ChevronLeft, Info, Mic, Image, Sparkles, X, Play, Pause, AlertCircle, HelpCircle, Check, CheckCheck, Star, Camera, Reply
} from 'lucide-react';
import { VoiceMessagePlayer } from './VoiceMessagePlayer';
import { ConfirmModal } from './ConfirmModal';
import { formatLastActive, getFormattedDateDivider } from '../utils/date';

interface ChatAreaProps {
  currentUser: Contact;
  activeChannelId: string | 'family-group';
  contacts: Contact[];
  messages: Message[];
  activeTypingLabel?: string | null;
  onSendMessage: (
    text: string, 
    messageType?: 'text' | 'image' | 'audio', 
    mediaUrl?: string,
    replyToId?: string,
    replyToText?: string,
    replyToSenderName?: string
  ) => void;
  onClearChat: (id: string | 'family-group') => void;
  onDeleteMessage: (messageId: string) => void;
  onReactToMessage?: (messageId: string, reaction: string) => void;
  onStarMessage?: (messageId: string) => void;
  onBackMobile: () => void;
  showMemberInfo: boolean;
  onToggleMemberInfo: () => void;
  darkMode?: boolean;
}

function isOnlyEmojis(str: string): boolean {
  if (!str || typeof str !== 'string') return false;
  const clean = str.trim();
  if (!clean) return false;
  
  // Exclude letters, numbers, common punctuation, standard symbols
  if (/[a-zA-Z0-9ñÑáéíóúÁÉÍÓÚüÜ¿?¡!.,;:()[\]{}"'+\-*/=_%$&@#|/<>\\]/.test(clean)) {
    return false;
  }
  
  // Test for emojis under Unicode support
  try {
    const emojiRegex = /[\p{Extended_Pictographic}\u2700-\u27BF\uE000-\uF8FF\uD83C\uDC00-\uD83D\uDFFF\u2011-\u26FF]/u;
    return emojiRegex.test(clean);
  } catch (e) {
    return true; 
  }
}

export const ChatArea: React.FC<ChatAreaProps> = ({
  currentUser,
  activeChannelId,
  contacts,
  messages,
  activeTypingLabel,
  onSendMessage,
  onClearChat,
  onDeleteMessage,
  onReactToMessage,
  onStarMessage,
  onBackMobile,
  showMemberInfo,
  onToggleMemberInfo,
  darkMode,
}) => {
  const [inputText, setInputText] = useState('');
  const [showEmojiDrawer, setShowEmojiDrawer] = useState(false);
  const [isUploading, setIsUploading] = useState(false);
  const [selectedReactMessageId, setSelectedReactMessageId] = useState<string | null>(null);

  // Selection states for WhatsApp style bubble selection, holding, and instant emojis
  const [activeSelectedMsgId, setActiveSelectedMsgId] = useState<string | null>(null);
  const touchTimerRef = useRef<any>(null);
  const isMovedRef = useRef<boolean>(false);

  // New swipe-to-reply elements
  const [replyMsg, setReplyMsg] = useState<Message | null>(null);
  const touchStartXRef = useRef<number>(0);
  const touchStartYRef = useRef<number>(0);
  const touchActiveIdRef = useRef<string | null>(null);
  const [swipedMessageId, setSwipedMessageId] = useState<string | null>(null);

  const handleTouchStart = (e: React.TouchEvent, msg: Message) => {
    isMovedRef.current = false;
    touchStartXRef.current = e.touches[0].clientX;
    touchStartYRef.current = e.touches[0].clientY;
    touchActiveIdRef.current = msg.id;

    if (touchTimerRef.current) clearTimeout(touchTimerRef.current);
    touchTimerRef.current = setTimeout(() => {
      if (!isMovedRef.current && touchActiveIdRef.current === msg.id) {
        setActiveSelectedMsgId(msg.id);
        setSelectedReactMessageId(msg.id);
      }
    }, 500);
  };

  const handleTouchMove = (e: React.TouchEvent, msg: Message) => {
    isMovedRef.current = true;
    if (touchActiveIdRef.current !== msg.id) return;

    if (touchTimerRef.current) clearTimeout(touchTimerRef.current);

    const currentX = e.touches[0].clientX;
    const currentY = e.touches[0].clientY;
    const diffX = touchStartXRef.current - currentX;
    const diffY = Math.abs(touchStartYRef.current - currentY);

    const isMsgMe = msg.senderId === currentUser.id;

    if (isMsgMe) {
      // Swipe right: finger moves from left to right (currentX - touchStartXRef)
      const diffRight = currentX - touchStartXRef.current;
      if (diffRight > 55 && diffY < 40) {
        setSwipedMessageId(msg.id);
      } else {
        setSwipedMessageId(null);
      }
    } else {
      // Swipe left: finger moves from right to left (touchStartXRef - currentX)
      if (diffX > 55 && diffY < 40) {
        setSwipedMessageId(msg.id);
      } else {
        setSwipedMessageId(null);
      }
    }
  };

  const handleTouchEnd = (msg: Message) => {
    if (touchTimerRef.current) clearTimeout(touchTimerRef.current);

    if (swipedMessageId === msg.id) {
      setReplyMsg(msg);
      // Play brief high-quality mobile rumble/vibrate if supported
      if (typeof navigator !== 'undefined' && navigator.vibrate) {
        navigator.vibrate(12);
      }
    }

    setSwipedMessageId(null);
    touchActiveIdRef.current = null;
  };

  const handleBubbleInteraction = (e: React.MouseEvent | React.TouchEvent, msgId: string) => {
    e.stopPropagation(); // Avoid closing selection from page clicks
    if (activeSelectedMsgId === msgId) {
      setActiveSelectedMsgId(null);
      setSelectedReactMessageId(null);
    } else {
      setActiveSelectedMsgId(msgId);
      setSelectedReactMessageId(msgId);
    }
  };
  
  // Real-time chat search states
  const [showChatSearch, setShowChatSearch] = useState(false);
  const [chatSearchQuery, setChatSearchQuery] = useState('');

  const selectedMessage = activeSelectedMsgId ? messages.find(m => m.id === activeSelectedMsgId) : null;

  const [confirmModal, setConfirmModal] = useState<{
    isOpen: boolean;
    message: string;
    onConfirm: () => void;
  }>({ isOpen: false, message: '', onConfirm: () => {} });
  
  // Audio Note Recording states
  const [isRecording, setIsRecording] = useState(false);
  const [recordDuration, setRecordDuration] = useState(0);
  const mediaRecorderRef = useRef<MediaRecorder | null>(null);
  const audioChunksRef = useRef<Blob[]>([]);
  const recordIntervalRef = useRef<number | null>(null);

  // File Reference
  const fileInputRef = useRef<HTMLInputElement>(null);

  // Lightbox view for image messages
  const [lightboxImage, setLightboxImage] = useState<string | null>(null);

  // Selector de Fondos de Pantalla
  const [chatWallpaper, setChatWallpaper] = useState<string>(() => {
    return localStorage.getItem('famichat_wallpaper') || 'classic';
  });

  const changeWallpaper = (theme: string) => {
    setChatWallpaper(theme);
    localStorage.setItem('famichat_wallpaper', theme);
  };

  // Selector de Estilo de Burbujas
  const [bubbleStyle, setBubbleStyle] = useState<'minimalista' | 'whatsapp'>(() => {
    return (localStorage.getItem('famichat_bubble_style') as 'minimalista' | 'whatsapp') || 'whatsapp';
  });

  const changeBubbleStyle = (style: 'minimalista' | 'whatsapp') => {
    setBubbleStyle(style);
    localStorage.setItem('famichat_bubble_style', style);
  };

  const [simulatedCustomText, setSimulatedCustomText] = useState<Record<string, string>>({});

  const handleSimulateStatus = async (contactId: string, state: 'online' | 'offline' | 'typing_group' | 'typing_private' | 'trigger_message') => {
    try {
      const msgText = simulatedCustomText[contactId] || '';
      const response = await fetch('/api/presence-simulation', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ 
          contactId, 
          state, 
          activeUserId: currentUser.id,
          text: state === 'trigger_message' ? msgText : undefined
        })
      });
      if (response.ok) {
        if (state === 'trigger_message') {
          setSimulatedCustomText(prev => ({ ...prev, [contactId]: '' }));
        }
        // Force passive local audio cue
        const playSnd = (window as any).playFamiChatAudio;
        if (playSnd) {
          try { playSnd('click'); } catch(err){}
        }
      }
    } catch(err) {
      console.error("Presence simulator request failed:", err);
    }
  };

  const WALLPAPERS = [
    { id: 'classic', name: 'Clásico Beige', colorBg: 'bg-[#efeae2]', colorDot: 'bg-[#14b8a6]', border: 'border-emerald-250' },
    { id: 'midnight', name: 'Noche Oscura', colorBg: 'bg-[#0b141a]', colorDot: 'bg-[#1f2c34]', border: 'border-slate-800' },
    { id: 'emerald', name: 'Verde Pino', colorBg: 'bg-[#062f27]', colorDot: 'bg-[#00a884]', border: 'border-emerald-900' },
    { id: 'peach', name: 'Durazno Cálido', colorBg: 'bg-[#fdf6f0]', colorDot: 'bg-[#fb923c]', border: 'border-orange-150' },
    { id: 'lavender', name: 'Lavanda Dulce', colorBg: 'bg-[#f3f0f7]', colorDot: 'bg-[#a78bfa]', border: 'border-violet-150' }
  ];

  const getWallpaperStyle = () => {
    switch (chatWallpaper) {
      case 'midnight':
        return {
          backgroundImage: `radial-gradient(#1f2c34 0.5px, transparent 0.5px), radial-gradient(#1f2c34 0.5px, #0b141a 0.5px)`,
          backgroundSize: '24px 24px',
          backgroundPosition: '0 0, 12px 12px',
          opacity: 1
        };
      case 'emerald':
        return {
          backgroundImage: `radial-gradient(#00a884 0.4px, transparent 0.4px), radial-gradient(#00a884 0.4px, #062f27 0.4px)`,
          backgroundSize: '20px 20px',
          backgroundPosition: '0 0, 10px 10px',
          opacity: 0.96
        };
      case 'peach':
        return {
          backgroundImage: `radial-gradient(#fb923c 0.4px, transparent 0.4px), radial-gradient(#fb923c 0.4px, #fdf6f0 0.4px)`,
          backgroundSize: '20px 20px',
          backgroundPosition: '0 0, 10px 10px',
          opacity: 0.96
        };
      case 'lavender':
        return {
          backgroundImage: `radial-gradient(#a78bfa 0.4px, transparent 0.4px), radial-gradient(#a78bfa 0.4px, #f3f0f7 0.4px)`,
          backgroundSize: '20px 20px',
          backgroundPosition: '0 0, 10px 10px',
          opacity: 0.96
        };
      case 'classic':
      default:
        return {
          backgroundImage: darkMode
            ? `radial-gradient(#1f2c34 0.4px, transparent 0.4px), radial-gradient(#1f2c34 0.4px, #0b141a 0.4px)`
            : `radial-gradient(#14b8a6 0.4px, transparent 0.4px), radial-gradient(#14b8a6 0.4px, #efeae2 0.4px)`,
          backgroundSize: '20px 20px',
          backgroundPosition: '0 0, 10px 10px',
          opacity: darkMode ? 0.96 : 0.94
        };
    }
  };

  // Categorized emojis for WhatsApp picker
  const EMOJI_CATEGORIES = {
    'Populares': ['❤️', '😂', '👍', '🙏', '😍', '🔥', '🎉', '💡', '✨', '👏'],
    'Caritas & Gente': ['😊', '😂', '🤣', '😉', '🥰', '😍', '😎', '🤩', '🤔', '🤨', '🙄', '😋', '😴', '😷', '🙋🏽‍♂️', '🙋🏽‍♀️'],
    'Familia & Comida': ['🏡', '👨‍👩‍👧‍👦', '🍲', '🥖', '☕', '🍕', '🍰', '🍎', '🥩', '🥘'],
    'Expresiones': ['🙌', '👏', '🤝', '👍', '👎', '👊', '👋', '🎉', '🎁', '🎈']
  };

  const activeRoomMessages = messages.filter(m => 
    activeChannelId === 'family-group'
      ? m.receiverId === 'family-group'
      : (m.senderId === activeChannelId && m.receiverId === currentUser.id) ||
        (m.senderId === currentUser.id && m.receiverId === activeChannelId)
  );

  const parsedSearchQuery = chatSearchQuery.trim().toLowerCase();
  const searchFilteredMessages = parsedSearchQuery
    ? activeRoomMessages.filter(m => m.text?.toLowerCase().includes(parsedSearchQuery))
    : activeRoomMessages;

  const activeContact = contacts.find(c => c.id === activeChannelId);
  const isGroup = activeChannelId === 'family-group';
  const chatEndRef = useRef<HTMLDivElement>(null);
  const scrollContainerRef = useRef<HTMLDivElement>(null);
  const lastMessagesLengthRef = useRef<number>(0);
  const prevActiveChannelIdRef = useRef<string>('');

  // Auto-scroll logic safely handled to avoid forcing scrolls on history inspection
  useEffect(() => {
    const container = scrollContainerRef.current;
    if (!container) return;

    const currentMsgCount = activeRoomMessages.length;
    const isChannelChanged = prevActiveChannelIdRef.current !== activeChannelId;
    
    // Check if the last message was sent by the current active user
    const lastMsg = activeRoomMessages[currentMsgCount - 1];
    const sentByMe = lastMsg ? lastMsg.senderId === currentUser.id : false;

    // Check if user is scrolled near the bottom (margin of 150px)
    const isAtBottom = container.scrollHeight - container.scrollTop - container.clientHeight < 155;

    if (isChannelChanged) {
      // Always scroll immediately when opening a new chat
      container.scrollTop = container.scrollHeight;
      prevActiveChannelIdRef.current = activeChannelId;
      lastMessagesLengthRef.current = currentMsgCount;
    } else if (currentMsgCount > lastMessagesLengthRef.current) {
      // New message added to the current chat room
      if (isAtBottom || sentByMe) {
        container.scrollTo({
          top: container.scrollHeight,
          behavior: 'smooth'
        });
      }
      lastMessagesLengthRef.current = currentMsgCount;
    } else {
      // If messages are polled or deleted, update registry without forcing scroll
      lastMessagesLengthRef.current = currentMsgCount;
    }
  }, [activeRoomMessages.length, activeChannelId, currentUser.id]);

  // Real-time API Typing signal trigger
  const lastTypingSignaledRef = useRef<number>(0);
  useEffect(() => {
    if (!inputText.trim()) {
      // Clear typing
      fetch('/api/typing', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ userId: currentUser.id, roomId: activeChannelId, isTyping: false })
      }).catch(() => {});
      return;
    }

    const now = Date.now();
    if (now - lastTypingSignaledRef.current > 2000) {
      lastTypingSignaledRef.current = now;
      fetch('/api/typing', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ userId: currentUser.id, roomId: activeChannelId, isTyping: true })
      }).catch(() => {});
    }
  }, [inputText, currentUser.id, activeChannelId]);

  const handleSend = (e?: React.FormEvent) => {
    if (e) e.preventDefault();
    if (!inputText.trim()) return;
    
    onSendMessage(
      inputText.trim(), 
      'text', 
      undefined, 
      replyMsg?.id, 
      replyMsg ? (replyMsg.messageType === 'image' ? '📷 Foto de familia' : replyMsg.messageType === 'audio' ? '🎤 Nota de voz familiar' : replyMsg.text) : undefined, 
      replyMsg?.senderName
    );
    setInputText('');
    setReplyMsg(null);
    setShowEmojiDrawer(false);
  };

  const insertEmoji = (emoji: string) => {
    setInputText(prev => prev + emoji);
  };

  const formatMessageTime = (isoString: Date | string) => {
    const d = new Date(isoString);
    return d.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' });
  };

  // --- HTML5 Core Audio Note Recorder Logic ---
  const startRecordingAudio = async () => {
    try {
      const stream = await navigator.mediaDevices.getUserMedia({ audio: true });
      audioChunksRef.current = [];
      const mediaRecorder = new MediaRecorder(stream);
      mediaRecorderRef.current = mediaRecorder;

      mediaRecorder.ondataavailable = (event) => {
        if (event.data.size > 0) {
          audioChunksRef.current.push(event.data);
        }
      };

      mediaRecorder.onstop = () => {
        const audioBlob = new Blob(audioChunksRef.current, { type: 'audio/webm' });
        const reader = new FileReader();
        reader.readAsDataURL(audioBlob);
        reader.onloadend = () => {
          const base64Audio = reader.result as string;
          // Send audio message with descriptive label and the actual base64 attachment!
          onSendMessage("🎙️ Nota de voz familiar", "audio", base64Audio);
        };

        // Stop all media stream tracks to shut off microphone recording state lights on device cleanly
        stream.getTracks().forEach(track => track.stop());
      };

      // Start recording
      mediaRecorder.start();
      setIsRecording(true);
      setRecordDuration(0);

      // Increment duration ticking
      recordIntervalRef.current = window.setInterval(() => {
        setRecordDuration(prev => prev + 1);
      }, 1000);

    } catch (err) {
      alert("No se pudo acceder al micrófono del teléfono/computador. Por favor asegúrate de otorgar los permisos correspondientes.");
      console.warn("Microphone access blocked:", err);
    }
  };

  const stopRecordingAudioAndSend = () => {
    if (mediaRecorderRef.current && isRecording) {
      mediaRecorderRef.current.stop();
      setIsRecording(false);
      if (recordIntervalRef.current) {
        clearInterval(recordIntervalRef.current);
      }
    }
  };

  const cancelRecordingAudio = () => {
    if (mediaRecorderRef.current && isRecording) {
      // release stream without sending
      mediaRecorderRef.current.onstop = () => {
        // stop tracks
        const stream = mediaRecorderRef.current?.stream;
        stream?.getTracks().forEach(t => t.stop());
      };
      mediaRecorderRef.current.stop();
      setIsRecording(false);
      if (recordIntervalRef.current) {
        clearInterval(recordIntervalRef.current);
      }
    }
  };

  // --- Real Image file selector from device roll and gallery ---
  const handlePhotoUploadTrigger = () => {
    fileInputRef.current?.click();
  };

  const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    if (!file.type.startsWith('image/')) {
      alert("Por favor selecciona un archivo de tipo imagen (JPEG, PNG, GIF, etc.).");
      return;
    }

    setIsUploading(true);
    const reader = new FileReader();
    reader.readAsDataURL(file);
    
    reader.onload = () => {
      const dataUri = reader.result as string;
      onSendMessage(file.name || "📷 Imagen compartida", "image", dataUri);
      setIsUploading(false);
      if (fileInputRef.current) fileInputRef.current.value = ''; // Reset uploader
    };

    reader.onerror = () => {
      alert("Error al procesar la imagen elegida.");
      setIsUploading(false);
    };
  };

  // Format record duration label
  const formatDuration = (secs: number) => {
    const mins = Math.floor(secs / 60);
    const remaining = secs % 60;
    return `${mins}:${remaining < 10 ? '0' : ''}${remaining}`;
  };

  return (
    <div id="chat-active-pane" className="flex-1 bg-[#efeae2] flex flex-col h-full relative border-slate-200 min-h-0 overflow-hidden pb-[calc(env(safe-area-inset-bottom))]">
      
      {/* Hidden native input for actual camera / gallery roll selection */}
      <input
        type="file"
        ref={fileInputRef}
        onChange={handleFileChange}
        accept="image/*"
        className="hidden"
      />

      {/* Dynamic Header */}
      <div id="chat-header-banner" className="bg-slate-50 border-b border-slate-200 px-3 pt-[calc(var(--sat,0px)+0.75rem)] md:pt-3 pb-3 flex items-center justify-between shadow-sm z-10 select-none">
        <div className="flex items-center gap-2.5 min-w-0">
          
          {/* Mobile Back navigation button */}
          <button 
            id="mobile-back-to-sidebar-btn"
            onClick={onBackMobile}
            className="md:hidden p-1.5 hover:bg-slate-200 rounded-full transition-colors text-slate-600 shrink-0 cursor-pointer"
            title="Volver a chats"
          >
            <ChevronLeft className="w-5 h-5 stroke-[2.5px]" />
          </button>

          {/* Avatar frame */}
          {isGroup ? (
            <div className="w-10 h-10 rounded-full bg-emerald-600 text-white flex items-center justify-center text-xl shadow shrink-0">
              🏡
            </div>
          ) : (
            <div className="relative shrink-0 select-none">
              <div className={`w-10 h-10 rounded-full ${activeContact?.avatarColor || 'bg-slate-500'} text-white flex items-center justify-center text-xl shadow`}>
                {activeContact?.avatarEmoji || '👤'}
              </div>
              {activeContact?.isOnline && (
                <span className="absolute bottom-0 right-0 h-2.5 w-2.5 rounded-full bg-emerald-500 border-2 border-white ring-1 ring-emerald-500/10 animate-pulse" />
              )}
            </div>
          )}

          {/* Profile presence state names */}
          <div className="min-w-0">
            <h2 id="chat-partner-fullname" className="font-semibold text-slate-800 text-[14.5px] truncate leading-tight flex items-center gap-1.5">
              <span>{isGroup ? 'Familia Unida 🏡' : activeContact?.name}</span>
              {!isGroup && (
                <span className="text-[10px] bg-slate-250 text-slate-650 px-1.5 rounded-full font-medium border border-slate-200 capitalize">
                  {activeContact?.relationship}
                </span>
              )}
            </h2>
            <p className="text-[11px] text-slate-500 leading-none mt-1.5 flex items-center gap-1 min-h-[14px] overflow-hidden max-w-[180px] sm:max-w-[240px]">
              {activeTypingLabel ? (
                <span className="text-[#00a884] font-bold animate-pulse flex items-center gap-1">
                  <span className="h-1.5 w-1.5 rounded-full bg-[#00a884] animate-bounce shrink-0" />
                  {activeTypingLabel}
                </span>
              ) : (
                isGroup 
                  ? <span className="truncate">{contacts.length} familiares activos</span>
                  : activeContact ? (
                      activeContact.isOnline ? (
                        <span className="text-emerald-600 font-semibold truncate">En línea</span>
                      ) : (
                        <span key={activeContact.id} className="animate-status-slide-twice inline-block whitespace-nowrap">
                          {formatLastActive(activeContact)}
                        </span>
                      )
                    ) : (
                      <span className="truncate">Desconectado</span>
                    )
              )}
            </p>
          </div>
        </div>

        {/* Action Controls */}
        <div className="flex items-center gap-1.5 sm:gap-2 shrink-0">
          {/* Cancel Selection button if a message is selected */}
          {selectedMessage && (
            <button
              onClick={() => {
                setActiveSelectedMsgId(null);
                setSelectedReactMessageId(null);
              }}
              className="p-1.5 sm:p-2 text-slate-500 hover:text-slate-800 hover:bg-slate-200 border border-slate-250 rounded-full transition-all flex items-center justify-center gap-1 cursor-pointer bg-white"
              title="Cancelar selección"
            >
              <X className="w-4 h-4" />
              <span className="text-[10px] font-bold hidden sm:inline px-0.5">Cancelar</span>
            </button>
          )}

          {/* Header Star button to toggle Star on currently selected message */}
          {selectedMessage && (
            <button
              id="header-star-toggle-btn"
              onClick={() => {
                onStarMessage?.(selectedMessage.id);
              }}
              className={`p-1.5 sm:p-2 rounded-full transition-all flex items-center justify-center gap-1 cursor-pointer bg-white border ${
                selectedMessage.isStarred 
                  ? 'text-amber-500 border-amber-205 bg-amber-50/70 hover:bg-amber-100' 
                  : 'text-slate-500 border-slate-200 hover:text-amber-500 hover:bg-amber-50'
              }`}
              title={selectedMessage.isStarred ? "Quitar de destacados" : "Destacar mensaje"}
            >
              <Star className={`w-4 h-4 ${selectedMessage.isStarred ? 'fill-amber-400' : ''}`} />
              <span className="text-[10px] font-bold hidden sm:inline px-0.5">
                {selectedMessage.isStarred ? "Destacado ⭐" : "Destacar"}
              </span>
            </button>
          )}

          {/* Header Reply button to Reply to currently selected message */}
          {selectedMessage && (
            <button
              id="header-reply-btn"
              onClick={() => {
                setReplyMsg(selectedMessage);
                setActiveSelectedMsgId(null);
                setSelectedReactMessageId(null);
              }}
              className="p-1.5 sm:p-2 text-[#00a884] hover:text-white hover:bg-[#00a884] border border-emerald-200 rounded-full transition-all flex items-center justify-center gap-1 cursor-pointer bg-white"
              title="Responder mensaje style WhatsApp"
            >
              <Reply className="w-4 h-4" />
              <span className="text-[10px] font-bold hidden sm:inline px-0.5">Responder</span>
            </button>
          )}

          <button
            id="chat-toggle-search-btn"
            onClick={() => {
              setShowChatSearch(!showChatSearch);
              setChatSearchQuery('');
            }}
            className={`p-2 rounded-full hover:bg-slate-200 transition-colors cursor-pointer ${showChatSearch ? 'bg-slate-250 text-emerald-600' : 'text-slate-600'}`}
            title="Buscar mensajes en esta conversación"
          >
            <Search className="w-4.5 h-4.5" />
          </button>

          {!selectedMessage && (
            <button
              id="chat-toggle-info-btn"
              onClick={onToggleMemberInfo}
              className={`p-2 rounded-full hover:bg-slate-200 transition-colors cursor-pointer ${showMemberInfo ? 'bg-slate-200 text-teal-600' : 'text-slate-600'}`}
              title="Ver más información"
            >
              <Info className="w-4.5 h-4.5" />
            </button>
          )}

          {!replyMsg && ((selectedMessage && selectedMessage.senderId === currentUser.id) || !selectedMessage) && (
            <button
              id="chat-clear-conversation-btn"
              onClick={() => {
                if (selectedMessage) {
                  setConfirmModal({
                    isOpen: true,
                    message: '¿Estás completamente seguro de que deseas borrar este mensaje para todos en el chat familiar?',
                    onConfirm: () => {
                      onDeleteMessage(selectedMessage.id);
                      setActiveSelectedMsgId(null);
                      setSelectedReactMessageId(null);
                    }
                  });
                } else {
                  setConfirmModal({
                    isOpen: true,
                    message: '¿Estás completamente seguro de que quieres vaciar (borrar todos los mensajes) de esta conversación?',
                    onConfirm: () => onClearChat(activeChannelId)
                  });
                }
              }}
              className={`p-2 text-rose-600 hover:text-white hover:bg-rose-550 border rounded-full transition-all flex items-center justify-center gap-1 cursor-pointer bg-white ${
                selectedMessage ? 'border-rose-300' : 'border-slate-250 hover:border-transparent'
              }`}
              title={selectedMessage ? "Eliminar Mensaje Seleccionado" : "Vaciar Conversación"}
            >
              <Trash2 className="w-4.5 h-4.5" />
              <span className="text-[11px] font-bold hidden sm:inline px-0.5">
                {selectedMessage ? "Eliminar" : "Vaciar chat"}
              </span>
            </button>
          )}
        </div>
      </div>

      {/* Search Input Bar */}
      {showChatSearch && (
        <div className="bg-white border-b border-slate-200 px-4 py-2 flex items-center justify-between gap-2.5 z-10 animate-fade-in select-none">
          <div className="relative flex-1">
            <input
              type="text"
              placeholder="Buscar mensajes..."
              value={chatSearchQuery}
              onChange={(e) => setChatSearchQuery(e.target.value)}
              className="w-full bg-slate-50 border border-slate-200 py-1.5 pl-8 pr-8 rounded-lg text-xs text-slate-800 placeholder-slate-400 focus:outline-none focus:border-teal-500"
            />
            <Search className="w-3.5 h-3.5 text-slate-400 absolute left-2.5 top-2.5" />
            {chatSearchQuery && (
              <button
                onClick={() => setChatSearchQuery('')}
                className="absolute right-2.5 top-2 hover:bg-slate-200 rounded-full w-5 h-5 flex items-center justify-center text-slate-500 hover:text-slate-850 cursor-pointer font-bold text-xs"
              >
                ×
              </button>
            )}
          </div>
          <button
            onClick={() => {
              setShowChatSearch(false);
              setChatSearchQuery('');
            }}
            className="text-[10px] font-bold text-slate-500 hover:text-slate-800 transition-colors uppercase px-1 py-1 cursor-pointer"
          >
            Cerrar
          </button>
        </div>
      )}

      {/* Grid of messages with styled WhatsApp backdrop background wallpaper */}
      <div 
        id="messages-wallpaper-container" 
        ref={scrollContainerRef}
        onClick={() => {
          setActiveSelectedMsgId(null);
          setSelectedReactMessageId(null);
        }}
        className="flex-1 overflow-y-auto px-4 py-5 flex flex-col space-y-3.5 custom-scrollbar relative cursor-default transition-all duration-300"
        style={getWallpaperStyle()}
      >
        
        {/* Safe Encryption Notice Card - Only shown if the chat room has no messages yet */}
        {activeRoomMessages.length === 0 && (
          <div className="mx-auto bg-[#ffeecd] border border-amber-200/40 rounded-lg p-2.5 max-w-sm text-center shadow-sm select-none">
            <p className="text-[10px] text-slate-650 font-semibold leading-relaxed">
              🔒 Red Familiar En Vivo: Tu navegador está conectado a la base de datos Express instalada. Cualquier integrante de la familia que abra su teléfono verá tus fotos, audios e imágenes en el instante.
            </p>
          </div>
        )}

        {activeRoomMessages.length === 0 ? (
          <div className="my-auto text-center py-10 flex flex-col items-center justify-center gap-3">
            <span className="text-4xl">💬</span>
            <div className="bg-white/90 backdrop-blur px-5 py-3 rounded-xl shadow-md max-w-xs border border-slate-150">
              <h3 className="font-bold text-slate-700 text-xs">Sin mensajes aún</h3>
              <p className="text-[11px] text-slate-500 mt-1">¡Utiliza la barra de abajo para mandar textos, fotos de tu galería o notas de voz!</p>
            </div>
          </div>
        ) : searchFilteredMessages.length === 0 ? (
          <div className="my-auto text-center py-10 flex flex-col items-center justify-center gap-3 select-none">
            <div className="text-4xl">🔍</div>
            <div className="bg-white/95 backdrop-blur px-5 py-4 rounded-xl shadow-md max-w-xs border border-slate-150">
              <h3 className="font-bold text-slate-700 text-xs">Sin resultados</h3>
              <p className="text-[11px] text-slate-500 mt-1">No hay mensajes en este chat que coincidan con su búsqueda.</p>
              <button 
                onClick={() => setChatSearchQuery('')}
                className="mt-3 px-3 py-1 bg-emerald-600 hover:bg-emerald-700 text-white rounded font-bold text-[10px] shadow cursor-pointer transition-colors"
              >
                Limpiar Búsqueda
              </button>
            </div>
          </div>
        ) : (() => {
          let lastDateLabel = "";
          return searchFilteredMessages.map((msg) => {
            const isMe = msg.senderId === currentUser.id;
            const isDarkWallpaper = chatWallpaper === 'midnight' || chatWallpaper === 'emerald';
            
            // Custom Modern & Beautiful Theme Colors (Elegant slate, jade, and soft pastel mint)
            let bubbleBgClass = '';
            let textColorClass = '';
            let timeColorClass = '';
            let borderColorClass = '';

            if (isMe) {
              if (isDarkWallpaper) {
                bubbleBgClass = 'bg-gradient-to-br from-[#0c6a58] to-[#075446]'; // Beautiful dark rich jade
                textColorClass = 'text-emerald-50';
                timeColorClass = 'text-emerald-300/70';
                borderColorClass = 'border-emerald-600/30';
              } else {
                bubbleBgClass = 'bg-gradient-to-br from-[#e4fcf5] to-[#d6f4ec]'; // Super clean modern premium soft mint
                textColorClass = 'text-[#043329] font-[450]';
                timeColorClass = 'text-[#043329]/50';
                borderColorClass = 'border-[#b5ecd2]';
              }
            } else {
              if (isDarkWallpaper) {
                bubbleBgClass = 'bg-gradient-to-br from-[#1f2c34] to-[#1a252c]'; // Ultra sleek slate gray
                textColorClass = 'text-slate-100 font-[450]';
                timeColorClass = 'text-slate-400/80';
                borderColorClass = 'border-slate-800/10';
              } else {
                bubbleBgClass = 'bg-gradient-to-br from-[#f8fafc] to-[#f1f5f9]'; // Modern warm off-white/light gray hybrid
                textColorClass = 'text-[#1e293b] font-[450]';
                timeColorClass = 'text-slate-400/80';
                borderColorClass = 'border-slate-200/50';
              }
            }

            const timeColor = timeColorClass;

            // Resolve dynamic client-side date label based on current message timestamp
            const dateLabel = getFormattedDateDivider(msg.timestamp);
            const showDivider = dateLabel && dateLabel !== lastDateLabel;
            if (dateLabel) {
              lastDateLabel = dateLabel;
            }

            // Colorful labels for participants in group chat
            let groupSenderColor = isDarkWallpaper ? 'text-teal-400 font-extrabold' : 'text-teal-600 font-extrabold';
            if (msg.senderId === 'mama-tila') groupSenderColor = isDarkWallpaper ? 'text-pink-400 font-extrabold' : 'text-pink-600 font-extrabold';
            if (msg.senderId === 'hijo-christian') groupSenderColor = isDarkWallpaper ? 'text-sky-400 font-extrabold' : 'text-sky-600 font-extrabold';
            if (msg.senderId === 'hijo-cristopher') groupSenderColor = isDarkWallpaper ? 'text-amber-400 font-extrabold' : 'text-amber-600 font-extrabold';
            if (msg.senderId === 'papa-jose') groupSenderColor = isDarkWallpaper ? 'text-teal-400 font-extrabold' : 'text-teal-600 font-extrabold';

            return (
              <React.Fragment key={msg.id}>
                {showDivider && (
                  <div className="flex justify-center my-4 select-none w-full">
                    <span className={`text-[11px] uppercase font-extrabold tracking-widest font-sans ${
                      isDarkWallpaper 
                        ? 'text-slate-400/80' 
                        : 'text-slate-500/85'
                    }`}>
                      {dateLabel}
                    </span>
                  </div>
                )}
                
                <div 
                  id={`message-bubble-${msg.id}`}
                  className="flex w-full group relative items-center animate-fade-in-up"
                  style={{ justifyContent: isMe ? 'flex-end' : 'flex-start' }}
                >
                  {/* Visual swipe-to-reply background indicator icon */}
                  {swipedMessageId === msg.id && (
                    <div 
                      className={`absolute text-emerald-500 flex items-center gap-1.5 font-bold text-xs select-none animate-pulse ${
                        isMe ? 'left-4' : 'right-4'
                      }`}
                    >
                      {isMe ? (
                        <>
                          <Reply className="w-5 h-5 animate-pulse transform scale-x-[-1]" />
                          <span>Responder</span>
                        </>
                      ) : (
                        <>
                          <span>Responder</span>
                          <Reply className="w-5 h-5 animate-pulse" />
                        </>
                      )}
                    </div>
                  )}

                  <div 
                    onTouchStart={(e) => handleTouchStart(e, msg)}
                    onTouchEnd={() => handleTouchEnd(msg)}
                    onTouchMove={(e) => handleTouchMove(e, msg)}
                    onClick={(e) => handleBubbleInteraction(e, msg.id)}
                    className={`max-w-[85%] sm:max-w-[78%] pt-2 pb-1 px-3.5 relative transition-all duration-200 cursor-pointer ${
                      activeSelectedMsgId === msg.id
                        ? 'ring-4 ring-emerald-500/50 scale-[1.015] z-30 shadow-lg'
                        : ''
                    } ${
                      bubbleStyle === 'minimalista'
                        ? 'rounded-2xl border-0 shadow-none'
                        : `shadow-[0_2px_5px_rgba(0,0,0,0.04),0_1px_2px_rgba(0,0,0,0.02)] border ${borderColorClass} ${
                            isMe 
                              ? 'rounded-[18px] rounded-tr-[3px] mr-2' 
                              : 'rounded-[18px] rounded-tl-[3px] ml-2'
                          }`
                    } ${bubbleBgClass} ${textColorClass}`}
                    style={{
                      ...((swipedMessageId === msg.id)
                        ? { transform: isMe ? 'translateX(60px)' : 'translateX(-60px)', transition: 'transform 0.15s cubic-bezier(0.16, 1, 0.3, 1)' }
                        : { transition: 'transform 0.2s ease' }
                      )
                    }}
                  >

                    {/* Render Reply Reference if present */}
                    {msg.replyToId && (
                      <div 
                        onClick={(e) => {
                          e.stopPropagation();
                          const targetElement = document.getElementById(`message-bubble-${msg.replyToId}`);
                          if (targetElement) {
                            targetElement.scrollIntoView({ behavior: 'smooth', block: 'center' });
                            targetElement.classList.add('ring-4', 'ring-amber-400', 'bg-amber-100', 'scale-[1.02]');
                            setTimeout(() => {
                              targetElement.classList.remove('ring-4', 'ring-amber-400', 'bg-amber-100', 'scale-[1.02]');
                            }, 1500);
                          }
                        }}
                        className={`mb-2 p-2 rounded border-l-4 text-left select-none text-xs cursor-pointer transition-all max-w-full overflow-hidden ${
                          isDarkWallpaper 
                            ? 'bg-black/25 hover:bg-black/35 border-emerald-500 text-slate-300' 
                            : 'bg-black/5 hover:bg-black/10 border-[#00a884] text-slate-705'
                        }`}
                      >
                        <p className="font-extrabold text-[10px] text-[#00a884] truncate mb-0.5">
                          {msg.replyToSenderName === currentUser.name ? 'Tú' : msg.replyToSenderName}
                        </p>
                        <p className="opacity-90 truncate max-w-full leading-relaxed">
                          {msg.replyToText}
                        </p>
                      </div>
                    )}

                    {/* Sender title tag */}
                    {isGroup && !isMe && (
                      <div className="text-[11px] font-bold mb-1 flex items-center gap-1.5 select-none leading-tight border-b border-dashed border-slate-100/10 pb-0.5">
                        <span className={`${groupSenderColor}`}>{msg.senderName}</span>
                        <span className={`text-[8.5px] px-1 rounded font-medium border ${
                          isDarkWallpaper 
                            ? 'bg-white/10 border-white/5 text-slate-300' 
                            : 'bg-slate-100 border-slate-200 text-slate-500'
                        }`}>
                          {contacts.find(c => c.id === msg.senderId)?.relationship || 'Familiar'}
                        </span>
                      </div>
                    )}

                    {/* Render content based on dynamic custom format type! */}
                    {msg.messageType === 'image' && msg.mediaUrl ? (
                      <div className="space-y-1.5 w-full">
                        <div 
                          className="relative rounded-[12px] overflow-hidden cursor-zoom-in bg-slate-200/40 max-h-[280px] shadow-inner border border-slate-200/50 flex items-center justify-center"
                          onClick={() => setLightboxImage(msg.mediaUrl || null)}
                        >
                          <img 
                            src={msg.mediaUrl} 
                            alt="Galería Familiar"
                            className="max-h-[280px] w-auto max-w-full object-contain rounded-[12px] hover:opacity-95 transition-all duration-200" 
                            referrerPolicy="no-referrer"
                          />
                          <div className="absolute inset-x-0 bottom-0 bg-gradient-to-t from-black/60 via-black/20 to-transparent p-1.5 text-[9.5px] text-white font-medium flex items-center justify-between select-none">
                            <span>🖼️ Foto de Familia</span>
                            <span className="font-sans text-[8.5px] bg-emerald-600/90 text-white px-1 py-0.5 rounded-sm">🔍 Ampliar</span>
                          </div>
                        </div>
                        
                        {msg.text ? (
                          <div className="text-[14px] leading-snug break-words font-medium mt-1">
                            <span>{msg.text}</span>
                            <span className={`float-right ml-1.5 mt-0.5 select-none inline-flex items-center gap-1 text-[10px] font-sans font-medium whitespace-nowrap opacity-65 ${timeColor}`}>
                              {msg.isStarred && (
                                <Star className="w-2.5 h-2.5 shrink-0 text-amber-500 fill-amber-500" />
                              )}
                              <span>{formatMessageTime(msg.timestamp)}</span>
                              {isMe && (
                                <span className="flex items-center shrink-0 ml-0.5">
                                  {msg.status === 'sent' && <Check className="w-3.5 h-3.5 text-slate-400 opacity-90" />}
                                  {msg.status === 'delivered' && <CheckCheck className="w-3.5 h-3.5 text-slate-400 opacity-90" />}
                                  {(msg.status === 'read' || !msg.status) && <CheckCheck className="w-3.5 h-3.5 text-[#53bdeb]" />}
                                </span>
                              )}
                            </span>
                          </div>
                        ) : (
                          <div className="absolute bottom-1.5 right-1.5 bg-black/45 text-white/90 px-1.5 py-0.5 rounded-full text-[10px] flex items-center gap-1 select-none leading-none z-10">
                            {msg.isStarred && (
                              <Star className="w-2.5 h-2.5 text-white/80 fill-white/80 shrink-0" />
                            )}
                            <span>{formatMessageTime(msg.timestamp)}</span>
                            {isMe && (
                              <span className="flex items-center shrink-0 ml-0.5">
                                {msg.status === 'sent' && <Check className="w-3.5 h-3.5 text-white/60" />}
                                {msg.status === 'delivered' && <CheckCheck className="w-3.5 h-3.5 text-white/70" />}
                                {(msg.status === 'read' || !msg.status) && <CheckCheck className="w-3.5 h-3.5 text-[#53bdeb]" />}
                              </span>
                            )}
                          </div>
                        )}
                      </div>
                    ) : msg.messageType === 'audio' && msg.mediaUrl ? (
                      <div className="space-y-1 mt-0.5 min-w-[220px] xs:min-w-[260px] flex flex-col">
                        <div className="flex items-center gap-2 mb-1">
                          <div className="w-7 h-7 rounded-full bg-emerald-600/10 text-emerald-650 flex items-center justify-center text-xs shrink-0 font-medium select-none">
                            🎙️
                          </div>
                          <div className="min-w-0 flex-1 select-none">
                            <p className="text-[11px] font-bold opacity-80 truncate">Nota de voz familiar</p>
                          </div>
                        </div>
                        <VoiceMessagePlayer mediaUrl={msg.mediaUrl} />
                        
                        {/* Compact inline timestamp */}
                        <div className={`flex items-center justify-end gap-1 select-none text-[10px] mt-0.5 pr-1 self-end opacity-65 ${timeColor}`}>
                          {msg.isStarred && (
                            <Star className="w-2.5 h-2.5 text-amber-500 fill-amber-500 shrink-0" />
                          )}
                          <span>{formatMessageTime(msg.timestamp)}</span>
                          {isMe && (
                            <span className="flex items-center shrink-0 ml-0.5">
                              {msg.status === 'sent' && <Check className="w-3.5 h-3.5 text-slate-400 opacity-90" />}
                              {msg.status === 'delivered' && <CheckCheck className="w-3.5 h-3.5 text-slate-400 opacity-90" />}
                              {(msg.status === 'read' || !msg.status) && <CheckCheck className="w-3.5 h-3.5 text-[#53bdeb]" />}
                            </span>
                          )}
                        </div>
                      </div>
                    ) : (
                      /* Default Fallback representation (Text messages / Emojis) */
                      <div className={`${isOnlyEmojis(msg.text || '') ? 'text-[32px] leading-tight select-all py-1 font-serif' : 'text-[14px] leading-snug'} break-words whitespace-pre-wrap`}>
                        <span>{msg.text}</span>
                        <span className={`float-right ml-1.5 mt-0.5 select-none inline-flex items-center gap-1 text-[10px] font-sans font-medium whitespace-nowrap opacity-65 ${timeColor}`}>
                          {msg.isStarred && (
                            <Star className="w-2.5 h-2.5 shrink-0 text-amber-500 fill-amber-500" />
                          )}
                          <span>{formatMessageTime(msg.timestamp)}</span>
                          {isMe && (
                            <span className="flex items-center shrink-0 ml-0.5">
                              {msg.status === 'sent' && <Check className="w-3.5 h-3.5 text-slate-400 opacity-90" />}
                              {msg.status === 'delivered' && <CheckCheck className="w-3.5 h-3.5 text-slate-400 opacity-90" />}
                              {(msg.status === 'read' || !msg.status) && <CheckCheck className="w-3.5 h-3.5 text-[#53bdeb]" />}
                            </span>
                          )}
                        </span>
                      </div>
                    )}

                    {/* Active Message Reactions Pill */}
                    {msg.reactions && msg.reactions.length > 0 && (
                      <div className="absolute -bottom-3.5 left-3 bg-white/95 backdrop-blur px-2 py-1 rounded-full shadow-md border border-slate-150 flex items-center gap-1.5 select-none z-10 hover:scale-105 transition-transform">
                        {Array.from(new Set(msg.reactions)).map((emoji, idx) => {
                           const count = msg.reactions!.filter(r => r === emoji).length;
                           return (
                             <span 
                               key={idx} 
                               className="flex items-center gap-1 font-sans font-extrabold text-slate-800 cursor-pointer"
                               title={`${count} reacción(es)`}
                               onClick={(el) => {
                                 el.stopPropagation();
                                 onReactToMessage?.(msg.id, emoji);
                               }}
                             >
                               <span className="text-[16px] inline-block hover:scale-135 transition-transform duration-150 leading-none">{emoji}</span>
                               {count > 1 && <span className="text-[9.5px] text-teal-650 font-black">{count}</span>}
                             </span>
                           );
                        })}
                      </div>
                    )}

                    {/* Quick Reactions Picker Popup */}
                    {selectedReactMessageId === msg.id && (
                      <div className="absolute -top-15 right-3 bg-white/95 backdrop-blur-md border border-slate-200 shadow-xl rounded-full px-3 py-1.5 flex items-center gap-3.5 z-20 animate-emoji-pop select-none ring-4 ring-black/5">
                        {['❤️', '👍', '😂', '😮', '😢', '🙏'].map((emoji, idx) => (
                          <button
                            key={emoji}
                            type="button"
                            onClick={(e) => {
                              e.stopPropagation();
                              onReactToMessage?.(msg.id, emoji);
                              setSelectedReactMessageId(null);
                              setActiveSelectedMsgId(null);
                            }}
                            style={{ animationDelay: `${idx * 40}ms` }}
                            className={`text-[25px] hover-emoji-active cursor-pointer transition-all duration-150 active:scale-90 select-none ${
                              idx % 2 === 0 ? 'animate-float-even' : 'animate-float-odd'
                            }`}
                          >
                            {emoji}
                          </button>
                        ))}
                      </div>
                    )}


                  </div>
                </div>
              </React.Fragment>
            );
          });
        })()}
        
        {/* Auto Scroll Point */}
        <div ref={chatEndRef} />
      </div>

      {/* Loading simulated upload banner */}
      {isUploading && (
        <div id="file-uploading-ticker" className="bg-teal-50 border-t border-teal-200 px-4 py-2 flex items-center gap-2.5 text-xs text-teal-700 animate-pulse select-none z-10">
          <span className="flex h-1.5 w-1.5 rounded-full bg-teal-500 animate-ping" />
          <span>Subiendo imagen familiar a la base de datos...</span>
        </div>
      )}

      {/* FOOTER INPUT CONTROLS */}
      <div id="chat-input-toolbar-footer" className="bg-[#0b141a] p-3 pb-[calc(16px+env(safe-area-inset-bottom))] border-t border-neutral-800/50 flex flex-col gap-2 relative z-10 shrink-0">
        
        {/* Dynamic Reply Preview above input bar */}
        {replyMsg && (
          <div className="bg-[#1f2c34] border-l-4 border-[#00a884] rounded-lg p-2.5 mb-1 flex items-center justify-between gap-3 animate-fade-in text-xs shadow-md select-none">
            <div className="min-w-0 flex-1">
              <p className="font-extrabold text-[11px] text-[#00a884] mb-0.5 flex items-center gap-1.5">
                <Reply className="w-3.5 h-3.5" />
                <span>Respondiendo a {replyMsg.senderName === currentUser.name ? 'ti mismo' : replyMsg.senderName}</span>
              </p>
              <p className="text-slate-300 truncate">
                {replyMsg.messageType === 'image' ? '📷 Foto de familia' : replyMsg.messageType === 'audio' ? '🎤 Nota de voz familiar' : replyMsg.text}
              </p>
            </div>
            <button 
              type="button"
              onClick={() => setReplyMsg(null)}
              className="bg-transparent text-slate-400 hover:text-white hover:bg-[#2a3942] rounded-full p-1 cursor-pointer transition-colors"
              title="Cancelar respuesta"
            >
              <X className="w-4 h-4" />
            </button>
          </div>
        )}

        {/* Dynamic Voice Recording Console vs Text Form Box */}
        {isRecording ? (
          <div id="voice-recording-console" className="flex items-center justify-between bg-[#2d1e21] border border-rose-900/50 rounded-xl p-2.5 gap-3 animate-pulse shadow-inner select-none ring-1 ring-rose-500/10">
            <div className="flex items-center gap-2.5 pl-2 min-w-0">
              <span className="relative flex h-3 w-3 shrink-0">
                <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-rose-455 opacity-75"></span>
                <span className="relative inline-flex rounded-full h-3 w-3 bg-rose-600"></span>
              </span>
              <div className="flex flex-col min-w-0 leading-tight">
                <span className="text-[11px] font-bold text-rose-300 truncate">Grabando audio con tu micrófono...</span>
                <span className="text-[9.5px] text-rose-400">Mantente cerca para un sonido claro</span>
              </div>
              <span className="font-mono bg-rose-950/50 text-rose-200 px-2 py-0.5 rounded text-[11px] font-extrabold border border-rose-800">
                {formatDuration(recordDuration)}
              </span>
            </div>
 
            {/* Action buttons inside the bar */}
            <div className="flex items-center gap-2 shrink-0">
              <button 
                type="button" 
                onClick={cancelRecordingAudio}
                className="bg-[#202c33] hover:bg-[#2a3942] text-slate-300 text-[11px] font-bold px-3 py-1.8 rounded-lg transition-all active:scale-95 cursor-pointer border border-neutral-700/50 shadow-sm"
                title="Descartar y borrar grabación"
              >
                Cancelar
              </button>
              <button 
                type="button" 
                onClick={stopRecordingAudioAndSend}
                className="bg-rose-600 hover:bg-rose-700 text-white text-[11px] font-bold px-3.5 py-1.8 rounded-lg transition-all active:scale-95 cursor-pointer shadow-md shadow-rose-600/10 flex items-center gap-1"
                title="Detener grabación y enviar al chat familiar"
              >
                <Send className="w-3.5 h-3.5" /> Enviar
              </button>
            </div>
          </div>
        ) : (
          /* Input box form container */
          <form onSubmit={handleSend} className="w-full max-w-full flex items-center gap-2 select-none">
            {/* Charcoal Rounded Input Capsule */}
            <div className="flex-1 flex items-center bg-[#202c33] rounded-full px-3 py-1 shadow-md border border-neutral-700/20 min-w-0">
              
              {/* Main Emoji Drawer Switch */}
              <button
                id="chat-toggle-emojis-drawer-btn"
                type="button"
                onClick={() => setShowEmojiDrawer(!showEmojiDrawer)}
                className={`p-2 rounded-full hover:bg-[#2a3942] transition-colors cursor-pointer shrink-0 text-slate-400 hover:text-white ${showEmojiDrawer ? 'text-[#00a884] bg-[#2a3942]' : ''}`}
                title="Símbolos y Emojis"
              >
                <Smile className="w-6 h-6 pointer-events-none" />
              </button>

              {/* Core TextInput */}
              <input
                id="chat-message-text-input"
                type="text"
                disabled={isRecording}
                placeholder="Mensaje"
                value={inputText}
                onChange={(e) => setInputText(e.target.value)}
                autoComplete="off"
                autoCorrect="off"
                autoCapitalize="sentences"
                spellCheck={false}
                className="flex-1 min-w-0 bg-transparent border-0 outline-none focus:ring-0 focus:outline-none py-2 px-2 text-[15px] text-white placeholder-[#8696a0] disabled:opacity-50"
              />

              {/* Core paperclip attachment trigger */}
              <button
                id="chat-photos-gallery-roll-btn"
                type="button"
                onClick={handlePhotoUploadTrigger}
                className="p-2 rounded-full hover:bg-[#2a3942] text-slate-400 hover:text-white transition-colors cursor-pointer shrink-0"
                title="Adjuntar Imagen de la Galería del Celular"
              >
                <Paperclip className="w-5.5 h-5.5" />
              </button>

              {/* Core Camera trigger */}
              <button
                id="chat-photos-camera-trigger-btn"
                type="button"
                onClick={handlePhotoUploadTrigger}
                className="p-2 rounded-full hover:bg-[#2a3942] text-slate-400 hover:text-white transition-colors cursor-pointer shrink-0 mr-1"
                title="Tomar foto o subir imagen"
              >
                <Camera className="w-5.5 h-5.5" />
              </button>
            </div>

            {/* Standalone Circular White Button on the Right */}
            {inputText.trim() ? (
              <button
                id="chat-submit-message-btn"
                type="submit"
                className="w-12 h-12 rounded-full bg-white hover:bg-neutral-100 flex items-center justify-center text-[#111b21] active:scale-95 transition-all shadow-md shrink-0 cursor-pointer"
                title="Enviar Mensaje"
              >
                <Send className="w-5.5 h-5.5 text-[#111b21] fill-current" />
              </button>
            ) : (
              <button
                id="chat-record-voice-note-btn"
                type="button"
                onClick={startRecordingAudio}
                className="w-12 h-12 rounded-full bg-white hover:bg-neutral-100 flex items-center justify-center text-[#111b21] active:scale-95 transition-all shadow-md shrink-0 cursor-pointer"
                title="Presiona para grabar nota de voz"
              >
                <Mic className="w-5.5 h-5.5 text-[#111b21]" />
              </button>
            )}
          </form>
        )}

        {/* EMOJI DRAWER POP-DOWN WINDOW */}
        {showEmojiDrawer && (
          <div id="chat-emojis-drawer-popover" className="bg-[#1f2c34] border border-neutral-700/65 rounded-2xl shadow-2xl p-4 flex flex-col h-64 z-20 animate-fade-in mt-2 select-none">
            <div className="flex justify-between items-center pb-2 border-b border-[#2a3942] mb-2.5">
              <span className="text-[12px] font-bold text-[#e9edef] flex items-center gap-1.5">
                <Sparkles className="w-3.5 h-3.5 text-[#00a884] fill-[#00a884]" /> Selector de Emoticones de WhatsApp
              </span>
              <button 
                type="button" 
                onClick={() => setShowEmojiDrawer(false)}
                className="text-xs text-[#8696a0] hover:text-white font-semibold transition-colors duration-150 cursor-pointer"
              >
                Cerrar
              </button>
            </div>

            <div className="flex-1 overflow-y-auto space-y-4 custom-scrollbar">
              {Object.entries(EMOJI_CATEGORIES).map(([category, list]) => (
                <div key={category}>
                  <h4 className="text-[11px] font-bold text-[#8696a0] uppercase tracking-wider mb-2 mt-1">
                    {category}
                  </h4>
                  <div className="grid grid-cols-7 sm:grid-cols-9 gap-2.5">
                    {list.map(emo => (
                      <button
                        key={emo}
                        type="button"
                        onClick={() => insertEmoji(emo)}
                        className="text-[34px] hover:bg-[#2a3942] hover:scale-110 active:scale-90 p-1.5 rounded-xl transition-all duration-150 cursor-pointer text-center select-none leading-none flex items-center justify-center font-sans"
                      >
                        {emo}
                      </button>
                    ))}
                  </div>
                </div>
              ))}
            </div>
          </div>
        )}
      </div>

      {/* DETAILS RIGHT SIDEBAR PANEL */}
      {showMemberInfo && (
        <div id="chat-partner-info-sidebar" className="absolute top-[calc(var(--sat,0px)+3.75rem)] md:top-16 right-0 bottom-0 bg-white shadow-2xl border-l border-slate-200 w-full sm:w-[310px] z-15 flex flex-col p-5 overflow-y-auto animate-slide-in-right">
          <div className="flex items-center justify-between pb-3 border-b border-slate-200 mb-4 select-none">
            <h3 className="font-bold text-slate-800 text-sm tracking-wide">Detalles de la Red</h3>
            <button 
              onClick={onToggleMemberInfo}
              className="text-slate-400 hover:text-slate-650 font-bold text-xs bg-slate-100 hover:bg-slate-200 px-2 py-1.2 rounded cursor-pointer"
            >
              Cerrar
            </button>
          </div>

          <div className="flex flex-col items-center text-center space-y-3 mt-2 select-none">
            {isGroup ? (
              <div className="w-20 h-20 rounded-full bg-emerald-600 text-white flex items-center justify-center text-4xl shadow-md">
                🏡
              </div>
            ) : (
              <div className={`w-20 h-20 rounded-full ${activeContact?.avatarColor || 'bg-slate-500'} text-white flex items-center justify-center text-4xl shadow-md border-2 border-white`}>
                {activeContact?.avatarEmoji || '👤'}
              </div>
            )}

            <div>
              <h4 className="font-bold text-slate-800 text-base">{isGroup ? 'Familia Unida 🏡' : activeContact?.name}</h4>
              <p className="text-xs bg-emerald-50 text-emerald-700 font-semibold px-2.5 py-0.8 rounded-full inline-block mt-1 uppercase tracking-wide border border-emerald-100 text-[9.5px]">
                {isGroup ? 'Historial Grupal' : activeContact?.relationship}
              </p>
            </div>
          </div>

          <div className="mt-6 space-y-4 text-xs">
            <div className="bg-slate-50 p-3 rounded-lg border border-slate-150">
              <h5 className="font-bold text-slate-700 uppercase text-[9px] tracking-wider mb-1">Estado de Conexión Real</h5>
              <p className="text-slate-655 font-medium leading-relaxed">
                {isGroup ? 'El canal grupal une a los 4 fundadores y todas sus dependencias.' : (activeContact?.isOnline ? '🟢 En línea ahora' : `🕒 ${activeContact?.lastActive}`)}
              </p>
            </div>

            {!isGroup && (
              <div className="bg-slate-50 p-3 rounded-lg border border-slate-150 text-slate-700 space-y-2.5">
                <div>
                  <h5 className="font-bold text-slate-700 uppercase text-[9px] tracking-wider mb-0.5">Teléfono Registrado</h5>
                  <p className="text-slate-600 font-mono text-[11px]">{activeContact?.phone || 'No registrado'}</p>
                </div>
                <div>
                  <h5 className="font-bold text-slate-700 uppercase text-[9px] tracking-wider mb-0.5">Parentesco</h5>
                  <p className="text-slate-600 capitalize">{activeContact?.relationship || 'Familiar'}</p>
                </div>
              </div>
            )}

            {/* Starred Messages Section (Mensajes Destacados) */}
            <div className="bg-amber-50/70 border border-amber-200/50 p-3 rounded-lg text-slate-700 space-y-2">
              <h5 className="font-bold text-amber-950 uppercase text-[9px] tracking-wider mb-1 flex items-center gap-1.5 select-none">
                <Star className="w-3.5 h-3.5 text-amber-500 fill-amber-500 shrink-0" /> 
                <span>Mensajes Destacados ({activeRoomMessages.filter(m => m.isStarred).length})</span>
              </h5>
              {activeRoomMessages.filter(m => m.isStarred).length === 0 ? (
                <p className="text-[10px] text-slate-500 italic leading-relaxed">
                  No hay mensajes destacados en esta conversación. Coloca la flecha sobre cualquier mensaje y presiona el botón estrella ⭐ para guardarlo aquí.
                </p>
              ) : (
                <div className="space-y-2 max-h-48 overflow-y-auto custom-scrollbar">
                  {activeRoomMessages.filter(m => m.isStarred).map(msg => (
                    <div key={msg.id} className="bg-white/95 p-2 rounded-lg border border-amber-200/20 text-[10.5px] shadow-xs flex flex-col gap-1">
                      <div className="flex justify-between items-center text-[9px] font-bold text-slate-550 border-b border-slate-150 pb-0.5 select-none">
                        <span>{msg.senderName}</span>
                        <button
                          type="button"
                          onClick={() => onStarMessage?.(msg.id)}
                          className="text-rose-500 hover:text-rose-700 hover:underline cursor-pointer font-bold"
                          title="Quitar"
                        >
                          Quitar
                        </button>
                      </div>
                      <p className="break-words font-medium leading-relaxed text-slate-850">
                        {msg.messageType === 'image' ? '📸 Imagen compartida' : msg.messageType === 'audio' ? '🎙️ Nota de voz familiar' : msg.text}
                      </p>
                    </div>
                  ))}
                </div>
              )}
            </div>

            {/* Chat Wallpaper Customizer (Fondo del Chat) */}
            <div className="bg-slate-50 border border-slate-250 p-3.5 rounded-lg text-slate-700 space-y-2">
              <h5 className="font-bold text-slate-700 uppercase text-[9px] tracking-wider flex items-center gap-1.5 select-none">
                🎨 Fondo del Chat (Wallpaper)
              </h5>
              <p className="text-[10px] text-slate-500 leading-normal select-none">
                Personaliza el diseño de tus conversaciones familiares en tiempo real:
              </p>
              <div className="grid grid-cols-5 gap-1.5 pt-0.5">
                {WALLPAPERS.map((wp) => (
                  <button
                    key={wp.id}
                    onClick={() => changeWallpaper(wp.id)}
                    className={`h-11 rounded-lg border flex flex-col items-center justify-center relative cursor-pointer overflow-hidden transition-all duration-150 group shrink-0 ${wp.colorBg} ${
                      chatWallpaper === wp.id
                        ? 'ring-2 ring-emerald-500 border-transparent scale-[1.03] shadow-inner'
                        : 'border-slate-200 hover:scale-[1.03] hover:shadow-xs'
                    }`}
                    title={wp.name}
                  >
                    {/* Outer radial simulator inside the small tile */}
                    <div className="absolute inset-x-0 inset-y-0 flex items-center justify-center opacity-60">
                      <div className={`w-3.5 h-3.5 rounded-full ${wp.colorDot} opacity-40`} />
                    </div>
                    {/* Small checking sign if selected */}
                    {chatWallpaper === wp.id && (
                      <span className="text-[9.5px] font-extrabold text-emerald-600 bg-white rounded-full px-1.2 py-0.2 scale-[0.85] z-10 shrink-0 select-none shadow-xs border border-emerald-100">
                        ✓
                      </span>
                    )}
                  </button>
                ))}
              </div>
            </div>

            {/* Bubble Style Customizer (Estilo de Burbujas) */}
            <div className="bg-slate-50 border border-slate-250 p-3.5 rounded-lg text-slate-700 space-y-2">
              <h5 className="font-bold text-slate-700 uppercase text-[9px] tracking-wider flex items-center gap-1.5 select-none">
                💬 Estilo de Burbujas
              </h5>
              <p className="text-[10px] text-slate-500 leading-normal select-none">
                Elige el diseño que prefieras para tus mensajes:
              </p>
              <div className="grid grid-cols-2 gap-2 pt-0.5">
                <button
                  type="button"
                  onClick={() => changeBubbleStyle('minimalista')}
                  className={`py-2 px-3 rounded-lg border text-[11px] font-bold cursor-pointer transition-all duration-150 select-none ${
                    bubbleStyle === 'minimalista'
                      ? 'bg-emerald-600 border-emerald-600 text-white shadow-sm'
                      : 'bg-white border-slate-200 text-slate-700 hover:bg-slate-100'
                  }`}
                >
                  Minimalista
                </button>
                <button
                  type="button"
                  onClick={() => changeBubbleStyle('whatsapp')}
                  className={`py-2 px-3 rounded-lg border text-[11px] font-bold cursor-pointer transition-all duration-150 select-none ${
                    bubbleStyle === 'whatsapp'
                      ? 'bg-emerald-600 border-emerald-600 text-white shadow-sm'
                      : 'bg-white border-slate-200 text-slate-700 hover:bg-slate-100'
                  }`}
                >
                  WhatsApp
                </button>
              </div>
            </div>

            <div className="bg-emerald-50 border border-emerald-200/50 p-3.5 rounded-lg leading-relaxed text-emerald-900 shadow-sm">
              <h4 className="font-extrabold text-[11px] text-emerald-950 uppercase tracking-wider mb-1">💡 Consejos para la Familia:</h4>
              <ul className="space-y-1.5 list-disc pl-3 text-[11px] text-emerald-850">
                <li>Puedes presionar el botón 🎤 para grabar una nota de voz con tu voz viva.</li>
                <li>Presiona el icono 📷 para subir cualquier foto de tu galería de fotos.</li>
                <li>Cambia de familiar arriba para responderte a ti mismo desde otra perspectiva.</li>
              </ul>
            </div>
          </div>
        </div>
      )}

      {/* GORGEOUS LIGHTBOX MODAL TRIGGER FOR PHOTO CLICKS */}
      {lightboxImage && (
        <div 
          id="image-lightbox-modal" 
          onClick={() => setLightboxImage(null)}
          className="fixed inset-0 bg-slate-950/95 z-50 flex flex-col items-center justify-between p-4 cursor-zoom-out select-none"
        >
          {/* Top Info Header with clear Back & Return options */}
          <div 
            onClick={(e) => e.stopPropagation()} 
            className="w-full max-w-4xl flex items-center justify-between text-white pb-3 mb-2 border-b border-white/10 cursor-default"
          >
            <button 
              onClick={() => setLightboxImage(null)}
              className="bg-emerald-600/90 hover:bg-emerald-500 hover:scale-105 active:scale-95 text-white px-4 py-2 rounded-full text-xs font-bold transition-all cursor-pointer flex items-center gap-1.5 shadow-md shadow-emerald-950/30"
              title="Regresar a la pantalla de chat"
            >
              <ChevronLeft className="w-4.5 h-4.5" /> Regresar al Chat
            </button>
            <span className="text-xs font-bold tracking-wide uppercase text-teal-400 hidden sm:inline">Ver Foto Compartida</span>
            <button 
              onClick={() => setLightboxImage(null)}
              className="bg-white/10 hover:bg-white/20 active:scale-95 px-3.5 py-1.5 rounded-lg text-xs font-extrabold transition-all cursor-pointer flex items-center gap-1.5"
            >
              <X className="w-4 h-4" /> Cerrar
            </button>
          </div>

          {/* Full Resolution Photo with propagation stopped to prevent accidental closing on image tap */}
          <div 
            onClick={(e) => e.stopPropagation()}
            className="flex-1 w-full max-w-4xl flex flex-col items-center justify-center p-2 cursor-default"
          >
            <img 
              src={lightboxImage} 
              alt="Lightbox" 
              className="max-w-full max-h-[65vh] sm:max-h-[70vh] object-contain rounded-lg shadow-2xl border border-white/10"
              referrerPolicy="no-referrer"
            />
          </div>

          {/* Bottom prominent action area for intuitive navigation */}
          <div 
            onClick={(e) => e.stopPropagation()}
            className="w-full max-w-sm flex flex-col items-center gap-3 pb-4 cursor-default"
          >
            <button 
              onClick={() => setLightboxImage(null)}
              className="w-full bg-emerald-600 hover:bg-emerald-500 active:scale-95 text-white py-3 px-6 rounded-xl font-bold text-sm tracking-wide shadow-lg shadow-emerald-950/40 transition-all flex items-center justify-center gap-2 cursor-pointer"
            >
              <ChevronLeft className="w-5 h-5 text-white animate-pulse" /> Regresar al Chat de FamiChat
            </button>
            <p className="text-[11px] text-slate-400 italic text-center">
              Toca fuera de la imagen o en cualquiera de los botones de arriba para volver al chat.
            </p>
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
    </div>
  );
};
