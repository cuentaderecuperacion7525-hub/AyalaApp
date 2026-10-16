import React, { useState, useEffect, useCallback } from 'react';
import { Contact, Message, LocalNotification } from './types';
import { INITIAL_CONTACTS } from './data/initialData';
import { UserSwitcher } from './components/UserSwitcher';
import { Sidebar } from './components/Sidebar';
import { ChatArea } from './components/ChatArea';
import { NotificationsContainer } from './components/NotificationsContainer';
import { FamiChatLogo } from './components/FamiChatLogo';
import { PwaInstallModal } from './components/PwaInstallModal';
import { PinModal } from './components/PinModal';
import { MoreMenu } from './components/MoreMenu';
import { WelcomeGateway } from './components/WelcomeGateway';
import { CreditsModal } from './components/CreditsModal';
import { playSendSound, playNotificationSound } from './utils/audio';
import { 
  Volume2, VolumeX, MessageSquare, AlertCircle, RefreshCw, Radio, Smartphone
} from 'lucide-react';

// Helper function to safely parse a public VAPID key into browser-supported Uint8Array format
function urlBase64ToUint8Array(base64String: string) {
  const padding = '='.repeat((4 - base64String.length % 4) % 4);
  const base64 = (base64String + padding)
    .replace(/\-/g, '+')
    .replace(/_/g, '/');

  const rawData = window.atob(base64);
  const outputArray = new Uint8Array(rawData.length);

  for (let i = 0; i < rawData.length; ++i) {
    outputArray[i] = rawData.charCodeAt(i);
  }
  return outputArray;
}

export default function App() {
  const [contacts, setContacts] = useState<Contact[]>(INITIAL_CONTACTS);
  const [messages, setMessages] = useState<Message[]>([]);
  const [typingRegistry, setTypingRegistry] = useState<Record<string, string>>({});

  const [activeUser, setActiveUser] = useState<Contact | null>(() => {
    // Restore user from localStorage to safeguard lock sessions
    const savedUserId = localStorage.getItem('famichat_active_user_id');
    if (savedUserId) {
      const found = INITIAL_CONTACTS.find(c => c.id === savedUserId);
      if (found) return found;
    }
    // Deep security check: Fresh application downloads default securely to null
    return null;
  });

  const [showCreditsModal, setShowCreditsModal] = useState<boolean>(false);
  const [showMoreMenu, setShowMoreMenu] = useState<boolean>(false);
  const [showFaqGuide, setShowFaqGuide] = useState<boolean>(false);

  const [activeChannelId, setActiveChannelId] = useState<string | 'family-group'>('family-group');
  const [mobileView, setMobileView] = useState<'list' | 'chat'>('list');
  const [showChatInfo, setShowChatInfo] = useState<boolean>(false);

  // Auto-push baseline state when active user is logged in
  useEffect(() => {
    if (activeUser) {
      if (!window.history.state || typeof window.history.state.view === 'undefined') {
        window.history.replaceState({ view: 'list' }, '');
      }
    } else {
      // Clear all active overlays when returning to Selection Gateway
      setShowMoreMenu(false);
      setShowFaqGuide(false);
      setShowCreditsModal(false);
      setShowPwaModal(false);
      setShowIdentityPinModal(false);
    }
  }, [activeUser]);

  // Synchronize mobileView and modal overlays with browser history (back button handling)
  useEffect(() => {
    const handlePopState = (event: PopStateEvent) => {
      const state = event.state;
      if (!state) {
        setMobileView('list');
        setShowChatInfo(false);
        setShowMoreMenu(false);
        setShowFaqGuide(false);
        setShowCreditsModal(false);
        setShowPwaModal(false);
        setShowIdentityPinModal(false);
      } else {
        const view = state.view;
        setShowMoreMenu(view === 'menu');
        setShowFaqGuide(view === 'faq');
        setShowCreditsModal(view === 'credits');
        setShowPwaModal(view === 'pwa_modal');
        setShowIdentityPinModal(view === 'pin_modal');
        
        if (view === 'chat') {
          setMobileView('chat');
          setShowChatInfo(false);
        } else if (view === 'chat_info') {
          setMobileView('chat');
          setShowChatInfo(true);
        } else if (view === 'list') {
          setMobileView('list');
          setShowChatInfo(false);
        }
      }
    };

    window.addEventListener('popstate', handlePopState);
    return () => {
      window.removeEventListener('popstate', handlePopState);
    };
  }, []);

  // Whenever mobileView changes programmatically:
  const handleSetMobileView = useCallback((view: 'list' | 'chat') => {
    if (view === 'chat') {
      // Only push state if not already in chat state to avoid multiple pushes
      if (window.history.state?.view !== 'chat' && window.history.state?.view !== 'chat_info') {
        window.history.pushState({ view: 'chat' }, '');
      }
      setMobileView('chat');
    } else {
      // If we are moving back to list view programmatically (like clicking on-screen back button)
      // and the current history state is indeed at some chat level, pop it by calling history back/go
      if (window.history.state?.view === 'chat_info') {
        window.history.go(-2);
      } else if (window.history.state?.view === 'chat') {
        window.history.back();
      } else {
        setMobileView('list');
        setShowChatInfo(false);
      }
    }
  }, []);

  const handleToggleChatInfo = useCallback(() => {
    setShowChatInfo(prev => {
      const nextVal = !prev;
      if (nextVal) {
        // Opening details panel -> push state
        if (window.history.state?.view !== 'chat_info') {
          window.history.pushState({ view: 'chat_info' }, '');
        }
      } else {
        // Closing details panel -> pop state if it was custom info active
        if (window.history.state?.view === 'chat_info') {
          window.history.back();
        }
      }
      return nextVal;
    });
  }, []);

  const [notifications, setNotifications] = useState<LocalNotification[]>([]);
  const [soundOn, setSoundOn] = useState<boolean>(true);
  const [darkMode, setDarkMode] = useState<boolean>(() => {
    return localStorage.getItem('famichat_dark_mode') === 'true';
  });
  const [loading, setLoading] = useState<boolean>(true);

  useEffect(() => {
    localStorage.setItem('famichat_dark_mode', darkMode ? 'true' : 'false');
  }, [darkMode]);
  const [serverState, setServerState] = useState<'connected' | 'reconnecting'>('connected');

  const [deferredPrompt, setDeferredPrompt] = useState<any>(null);
  const [isInstallable, setIsInstallable] = useState<boolean>(false);
  const [showPwaModal, setShowPwaModal] = useState<boolean>(false);

  const [pushSupported, setPushSupported] = useState<boolean>(false);
  const [pushEnabled, setPushEnabled] = useState<boolean>(false);
  const [subscribingPush, setSubscribingPush] = useState<boolean>(false);

  const [showIdentityPinModal, setShowIdentityPinModal] = useState<boolean>(false);
  const [pendingUserToSwitch, setPendingUserToSwitch] = useState<Contact | null>(null);
  const [isSwitcherUnlocked, setIsSwitcherUnlocked] = useState<boolean>(false);
  const [pinAction, setPinAction] = useState<'unlock_switcher' | 'back_to_selection' | null>(null);

  // Monitor browser's native PWA install availability
  useEffect(() => {
    const handleBeforeInstallPrompt = (e: any) => {
      e.preventDefault();
      setDeferredPrompt(e);
      setIsInstallable(true);
    };
    
    // Also track when app is successfully installed
    const handleAppInstalled = () => {
      console.log('App successfully installed into system');
      setIsInstallable(false);
      setDeferredPrompt(null);
    };

    window.addEventListener('beforeinstallprompt', handleBeforeInstallPrompt);
    window.addEventListener('appinstalled', handleAppInstalled);

    return () => {
      window.removeEventListener('beforeinstallprompt', handleBeforeInstallPrompt);
      window.removeEventListener('appinstalled', handleAppInstalled);
    };
  }, []);

  // Check if Web Push has browser support
  useEffect(() => {
    if (typeof window !== 'undefined' && 'serviceWorker' in navigator && 'PushManager' in window) {
      setPushSupported(true);
    }
  }, []);

  // Listen to messages from our Service Worker for reactive navigation
  useEffect(() => {
    const handleServiceWorkerMessage = (event: MessageEvent) => {
      if (event.data && event.data.type === 'NAVIGATE_ROOM') {
        const urlStr = event.data.url;
        try {
          const urlObj = new URL(urlStr, window.location.origin);
          const roomId = urlObj.searchParams.get('roomId');
          if (roomId) {
            setActiveChannelId(roomId);
            handleSetMobileView('chat');
          }
        } catch (e) {
          console.error("Error parsing push navigate URL:", e);
        }
      }
    };

    if ('serviceWorker' in navigator) {
      navigator.serviceWorker.addEventListener('message', handleServiceWorkerMessage);
      return () => {
        navigator.serviceWorker.removeEventListener('message', handleServiceWorkerMessage);
      };
    }
  }, [handleSetMobileView]);

  // Sync Push subscription with current active user upon change
  useEffect(() => {
    if (!pushSupported || !activeUser) return;

    let active = true;
    navigator.serviceWorker.ready.then(async (reg) => {
      if (!active) return;
      const sub = await reg.pushManager.getSubscription();
      if (sub) {
        setPushEnabled(true);
        // Refresh subscription with the server to keep it linked to the correct user ID
        try {
          await fetch('/api/push-subscribe', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({
              userId: activeUser.id,
              subscription: sub
            })
          });
        } catch (err) {
          console.warn("Failed to auto-sync existing push subscription on user transition:", err);
        }
      } else {
        setPushEnabled(false);
      }
    });

    return () => {
      active = false;
    };
  }, [pushSupported, activeUser?.id]);

  const subscribeUserToPush = async (userId: string) => {
    if (!('serviceWorker' in navigator) || !('PushManager' in window)) {
      console.warn('Push Notifications are not supported by this browser.');
      return;
    }

    try {
      setSubscribingPush(true);
      const registration = await navigator.serviceWorker.ready;

      // 1. Fetch public VAPID key from server
      const keyRes = await fetch('/api/push-public-key');
      if (!keyRes.ok) {
        throw new Error('No se pudo obtener la clave pública VAPID del servidor');
      }
      const { publicKey } = await keyRes.json();

      // 2. Request Notification Permission
      const permission = await Notification.requestPermission();
      if (permission !== 'granted') {
        throw new Error('Permiso de notificaciones denegado por el navegador');
      }

      // 3. Subscribe with the PushManager
      const convertedVapidKey = urlBase64ToUint8Array(publicKey);
      const subscription = await registration.pushManager.subscribe({
        userVisibleOnly: true,
        applicationServerKey: convertedVapidKey
      });

      // 4. Send subscription to server
      const subRes = await fetch('/api/push-subscribe', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          userId,
          subscription
        })
      });

      if (!subRes.ok) {
        throw new Error('Error al registrar la suscripción en el servidor');
      }

      setPushEnabled(true);
      
      // Push registration Toast feedback
      const toast: LocalNotification = {
        id: 'push-registered-' + Date.now(),
        title: 'Notificaciones Push Activas 🔔',
        body: '¡Excelente! Ahora recibirás avisos del chat familiar incluso si cierras la app o el navegador.',
        avatarEmoji: '🔔',
        avatarColor: 'bg-emerald-650',
        timestamp: new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })
      };
      setNotifications(prev => [toast, ...prev.slice(0, 2)]);
    } catch (error: any) {
      console.error('Error enabling push notifications:', error);
      // Local Notification block
      const toast: LocalNotification = {
        id: 'push-error-' + Date.now(),
        title: 'Error de Notificación ⚠️',
        body: error.message || 'No se pudieron activar las notificaciones push.',
        avatarEmoji: '⚠️',
        avatarColor: 'bg-rose-500',
        timestamp: new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })
      };
      setNotifications(prev => [toast, ...prev.slice(0, 2)]);
    } finally {
      setSubscribingPush(false);
    }
  };

  const unsubscribeUserFromPush = async (userId: string) => {
    if (!('serviceWorker' in navigator) || !('PushManager' in window)) return;
    try {
      setSubscribingPush(true);
      const registration = await navigator.serviceWorker.ready;
      const subscription = await registration.pushManager.getSubscription();
      if (subscription) {
        await subscription.unsubscribe();
        
        // Notify server
        await fetch('/api/push-unsubscribe', {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json'
          },
          body: JSON.stringify({
            userId,
            endpoint: subscription.endpoint
          })
        });
      }
      setPushEnabled(false);
      
      const toast: LocalNotification = {
        id: 'push-unsubscribed-' + Date.now(),
        title: 'Notificaciones Silenciadas 🔕',
        body: 'Has desactivado las notificaciones push para esta cuenta.',
        avatarEmoji: '🔕',
        avatarColor: 'bg-slate-600',
        timestamp: new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })
      };
      setNotifications(prev => [toast, ...prev.slice(0, 2)]);
    } catch (e) {
      console.error("Error unsubscribing from push:", e);
    } finally {
      setSubscribingPush(false);
    }
  };

  const handleTriggerInstall = () => {
    if (deferredPrompt) {
      deferredPrompt.prompt();
      deferredPrompt.userChoice.then((choiceResult: any) => {
        if (choiceResult.outcome === 'accepted') {
          console.log('User completed installation prompt successfully');
        }
        setDeferredPrompt(null);
        setIsInstallable(false);
      });
    }
  };

  // Welcome session initiated notification toast upon user selection
  useEffect(() => {
    if (!activeUser) return;
    const welcomeToast: LocalNotification = {
      id: 'welcome-session-' + Date.now(),
      title: 'Sesión Iniciada',
      body: `Bienvenido de vuelta a FamiChat. Sesión activa iniciada de forma segura para ${activeUser.name}.`,
      avatarEmoji: activeUser.avatarEmoji,
      avatarColor: activeUser.avatarColor,
      timestamp: new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })
    };
    
    const welcomeTimer = setTimeout(() => {
      setNotifications(prev => [welcomeToast, ...prev]);
    }, 1200);

    return () => clearTimeout(welcomeTimer);
  }, [activeUser?.id]);

  // --- Dynamic REAL-TIME syncing Poller ---
  useEffect(() => {
    if (!activeUser) {
      setLoading(false);
      return;
    }

    // Sync current user states through backend
    const loadState = async () => {
      try {
        let currentContactsList = contacts;
        const cRes = await fetch(`/api/contacts?activeUser=${activeUser.id}`);
        if (cRes.ok) {
          const list = await cRes.json();
          currentContactsList = list;
          setContacts(list);
          // Sync current active user in case its isOnline/lastActive status is changed by server
          const currentInList = list.find((c: Contact) => c.id === activeUser.id);
          if (currentInList) {
            setActiveUser(prev => {
              if (!prev) return currentInList;
              if (prev.isOnline !== currentInList.isOnline || prev.lastActive !== currentInList.lastActive) {
                return currentInList;
               }
              return prev;
            });
          }
        }
        
        const mRes = await fetch('/api/messages');
        if (mRes.ok) {
          const list = await mRes.json();
          
          // Before updating messages state, let's detect if there is any brand new message
          // from other senders that we didn't have before, to play a notification and sound!
          setMessages(prev => {
            if (prev.length > 0 && list.length > prev.length) {
              const lastPrevId = prev[prev.length - 1].id;
              const lastPrevIndex = list.findIndex((m: Message) => m.id === lastPrevId);
              
              const newMsgs = lastPrevIndex !== -1 ? list.slice(lastPrevIndex + 1) : list;
              
              // Filter messages NOT written by us
              const externalMsgs = newMsgs.filter((m: Message) => m.senderId !== activeUser.id);
              if (externalMsgs.length > 0) {
                // Play notification alert for first incoming message
                const leadMsg = externalMsgs[externalMsgs.length - 1];
                const senderContact = currentContactsList.find(c => c.id === leadMsg.senderId);
                
                // If it is from another room we are not currently watching, show a Toast message
                const isWatchingAndActive = activeChannelId === leadMsg.receiverId || 
                                          (activeChannelId === leadMsg.senderId && leadMsg.receiverId === activeUser.id);
                
                if (!isWatchingAndActive) {
                   const toast: LocalNotification = {
                    id: 'notif-' + Date.now(),
                    title: `Nuevo mensaje de ${leadMsg.senderName}`,
                    body: leadMsg.messageType === 'text' 
                      ? leadMsg.text 
                      : `📥 Mandó un archivo multimedia (${leadMsg.messageType === 'audio' ? 'Nota de Voz 🎤' : 'Imagen 📷'})`,
                    avatarEmoji: senderContact?.avatarEmoji || '👤',
                    avatarColor: senderContact?.avatarColor || 'bg-slate-500',
                    timestamp: new Date(leadMsg.timestamp).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })
                  };
                  setNotifications(prevNot => [toast, ...prevNot.slice(0, 3)]);
                  if (soundOn) playNotificationSound();
                } else {
                  // If we are currently watching, just make a passive click sound
                  if (soundOn) playSendSound();
                }
              }
            }
            return list;
          });
        }

        const tRes = await fetch('/api/typing');
        if (tRes.ok) {
          const dict = await tRes.json();
          setTypingRegistry(dict);
        }

        setServerState('connected');
      } catch (e) {
        console.warn("Connection reconnecting/polling...", e);
        setServerState('reconnecting');
      } finally {
        setLoading(false);
      }
    };

    loadState();
    const interval = setInterval(loadState, 2200); // Polling every 2.2 seconds for perfect speed/bandwidth balance

    return () => clearInterval(interval);
  }, [activeUser?.id, activeChannelId, soundOn]);

  // Handle active identity shift
  const handleUserChange = (newUser: Contact) => {
    // If current active user is not an administrator, intercept swap with security PIN challenge
    if (activeUser.role !== 'admin' && !isSwitcherUnlocked) {
      setPendingUserToSwitch(newUser);
      setShowIdentityPinModal(true);
      return;
    }

    // Admins can switch identity instantly without a PIN challenge
    executeUserChange(newUser);
  };

  const executeUserChange = (newUser: Contact) => {
    setActiveUser(newUser);
    localStorage.setItem('famichat_active_user_id', newUser.id);
    setIsSwitcherUnlocked(false);

    // Notify session change with high-quality Toast banner
    const toast: LocalNotification = {
      id: 'session-switch-' + Date.now(),
      title: 'Sesión Cambiada 👤',
      body: `Ahora estás controlando la cuenta de ${newUser.name}. Puedes chatear con los demás desde su perspectiva en tiempo real.`,
      avatarEmoji: newUser.avatarEmoji,
      avatarColor: newUser.avatarColor,
      timestamp: new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })
    };
    setNotifications(prev => [toast, ...prev.slice(0, 2)]);
    if (soundOn) playNotificationSound();
    
    // Automatically select the family group chat by default
    setActiveChannelId('family-group');
    handleSetMobileView('list');
  };

  // --- Send Message Action Engine (Communicates with database API) ---
  const handleSendMessage = async (
    text: string, 
    messageType?: 'text' | 'image' | 'audio', 
    mediaUrl?: string,
    replyToId?: string,
    replyToText?: string,
    replyToSenderName?: string
  ) => {
    const payload = {
      id: 'msg-' + Date.now(),
      senderId: activeUser.id,
      senderName: activeUser.name,
      receiverId: activeChannelId,
      text: text,
      messageType: messageType || 'text',
      mediaUrl: mediaUrl || undefined,
      replyToId: replyToId || undefined,
      replyToText: replyToText || undefined,
      replyToSenderName: replyToSenderName || undefined,
      activeUser: activeUser.id // reports presence
    };

    try {
      // Optimistic update
      const optimisticMsg: Message = {
        id: payload.id,
        senderId: payload.senderId,
        senderName: payload.senderName,
        receiverId: payload.receiverId,
        text: payload.text,
        timestamp: new Date().toISOString(),
        status: 'sent', // Shows single checkmark while syncing
        messageType: payload.messageType as any,
        mediaUrl: payload.mediaUrl,
        replyToId: payload.replyToId,
        replyToText: payload.replyToText,
        replyToSenderName: payload.replyToSenderName
      };

      setMessages(p => [...p, optimisticMsg]);
      if (soundOn) playSendSound();

      // Clear typing indicator instantly
      await fetch('/api/typing', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ userId: activeUser.id, isTyping: false })
      });

      const response = await fetch('/api/messages', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(payload)
      });

      if (response.ok) {
        const saved = await response.json();
        // Replace optimistic msg with real database authenticated message
        setMessages(prev => prev.map(m => m.id === payload.id ? saved : m));
      }
    } catch (e) {
      console.error("Error communicating message to Server API:", e);
    }
  };

  // --- Clear chat conversation option (Borrar conversaciones) ---
  const handleClearChat = async (channelId: string | 'family-group') => {
    try {
      const response = await fetch('/api/messages', {
        method: 'DELETE',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          channelId,
          userId: activeUser.id
        })
      });

      if (response.ok) {
        // filter locally
        setMessages(prev => prev.filter(m => {
          if (channelId === 'family-group') {
            return m.receiverId !== 'family-group';
          } else {
            const isBetweenThem = (m.senderId === activeUser.id && m.receiverId === channelId) ||
                                  (m.senderId === channelId && m.receiverId === activeUser.id);
            return !isBetweenThem;
          }
        }));

        const toast: LocalNotification = {
          id: 'clear-' + Date.now(),
          title: 'Historial Removido',
          body: `Se borraron los mensajes de esta conversación en el servidor familiar de forma segura.`,
          avatarEmoji: '🗑️',
          avatarColor: 'bg-rose-600',
          timestamp: new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })
        };
        setNotifications(prev => [toast, ...prev.slice(0, 1)]);
        if (soundOn) playNotificationSound();
      }
    } catch (e) {
      console.error("Failed to clear chat room on server:", e);
    }
  };

  // --- Delete individual message (Borrar mensaje específico) ---
  const handleDeleteMessage = async (messageId: string) => {
    try {
      const response = await fetch(`/api/messages/${messageId}`, {
        method: 'DELETE'
      });
      if (response.ok) {
        setMessages(prev => prev.filter(m => m.id !== messageId));

        // Toast alert for single message deletion
        const toast: LocalNotification = {
          id: 'deleted-' + Date.now(),
          title: 'Mensaje Eliminado',
          body: `Se eliminó un mensaje de la conversación de forma segura.`,
          avatarEmoji: '🗑️',
          avatarColor: 'bg-rose-600',
          timestamp: new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })
        };
        setNotifications(prev => [toast, ...prev.slice(0, 1)]);
        if (soundOn) playNotificationSound();
      }
    } catch (e) {
      console.error("Failed to delete message on backend server:", e);
    }
  };

  // --- React to message with emoji ---
  const handleReactToMessage = async (messageId: string, reaction: string) => {
    try {
      // Optimistic update
      setMessages(prev => prev.map(m => {
        if (m.id === messageId) {
          const reactions = m.reactions ? [...m.reactions] : [];
          const idx = reactions.indexOf(reaction);
          if (idx !== -1) {
            reactions.splice(idx, 1);
          } else {
            reactions.push(reaction);
          }
          return { ...m, reactions };
        }
        return m;
      }));

      const response = await fetch(`/api/messages/${messageId}/react`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ reaction })
      });

      if (!response.ok) {
        console.warn("Reactions out of sync");
      }
    } catch (e) {
      console.error("Failed to react to message:", e);
    }
  };

  // --- Toggle Star (Mensaje Destacado) ---
  const handleToggleStarMessage = async (messageId: string) => {
    try {
      // Optimistic update
      setMessages(prev => prev.map(m => {
        if (m.id === messageId) {
          return { ...m, isStarred: !m.isStarred };
        }
        return m;
      }));

      const response = await fetch(`/api/messages/${messageId}/star`, {
        method: 'POST'
      });

      if (!response.ok) {
        console.warn("Starring state out of sync");
      }
    } catch (e) {
      console.error("Failed to toggle star on message:", e);
    }
  };

  // --- Add new contact option (Admin Only - Papá José Manuel) ---
  const handleAddNewContact = async (newContact: Omit<Contact, 'role'>) => {
    try {
      const response = await fetch('/api/contacts', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          contact: newContact,
          activeUser: activeUser?.id
        })
      });

      if (response.ok) {
        const result = await response.json();
        setContacts(result.contacts);
        
        // Notify family member added successfully!
        const alertToast: LocalNotification = {
          id: 'added-' + Date.now(),
          title: 'Familiar Registrado',
          body: `¡Excelente José! El integrante "${newContact.name}" ha sido agregado a la red familiar.`,
          avatarEmoji: '✨',
          avatarColor: 'bg-amber-500',
          timestamp: new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })
        };
        setNotifications(prev => [alertToast, ...prev.slice(0, 1)]);
        if (soundOn) playNotificationSound();
      }
    } catch (e) {
      console.error("Failed to add new contact on server:", e);
    }
  };

  // --- Dismiss notifications banner ---
  const handleDismissNotification = useCallback((id: string) => {
    setNotifications(prev => prev.filter(n => n.id !== id));
  }, []);

  // Setup initial active room if deleted in side states
  const activeRoomExists = activeChannelId === 'family-group' || contacts.some(c => c.id === activeChannelId);
  const currentChatId = activeRoomExists ? activeChannelId : 'family-group';

  // Format typing indicator text for group chat or direct chats
  const getTypingIndicatorText = () => {
    const list: string[] = [];
    Object.entries(typingRegistry).forEach(([writerId, roomId]) => {
      // Exclude ourselves
      if (writerId === activeUser?.id) return;
      
      const targetContact = contacts.find(c => c.id === writerId);
      if (!targetContact) return;

      const isWritingHere = currentChatId === 'family-group' 
        ? roomId === 'family-group'
        : roomId === activeUser?.id && currentChatId === writerId;

      if (isWritingHere) {
        list.push(targetContact.name.split(' ')[0]);
      }
    });

    if (list.length === 0) return null;
    if (list.length === 1) return `${list[0]} está escribiendo...`;
    return `${list.join(', ')} están escribiendo...`;
  };

  const activeTypingLabel = getTypingIndicatorText();

  if (!activeUser) {
    return (
      <WelcomeGateway 
        contacts={contacts} 
        onSelectUser={executeUserChange} 
      />
    );
  }

  return (
    <div className="min-h-[100dvh] w-full bg-slate-950 flex items-center justify-center p-0 md:p-4 bg-gradient-to-tr from-slate-900 via-emerald-950/20 to-slate-900 font-sans select-none overflow-hidden text-slate-900 selection:bg-emerald-500 selection:text-white relative">
      {/* Absolute blurry spotlight background decorations for luxury atmospheric desktop presentation */}
      <div className="absolute top-[-10%] left-[-10%] w-[50%] h-[50%] bg-emerald-500/10 rounded-full blur-[120px] pointer-events-none" />
      <div className="absolute bottom-[-10%] right-[-10%] w-[50%] h-[50%] bg-teal-500/10 rounded-full blur-[120px] pointer-events-none" />

      {/* Elegant, premium smartphone device mockup wrapper for desktop; expands smoothly to full screen on true portables */}
      <div className={`w-full h-[100dvh] md:h-[92vh] md:max-h-[860px] md:max-w-[420px] md:rounded-[42px] md:shadow-[0_25px_60px_-15px_rgba(0,0,0,0.85)] md:border-[10px] md:border-slate-800 flex flex-col overflow-hidden relative md:ring-1 md:ring-white/10 shrink-0 transition-colors duration-300 ${
        darkMode ? 'dark bg-slate-900 border-slate-950 text-slate-100' : 'bg-slate-100 text-slate-900'
      }`}>
        
        {/* Dynamic decorative camera punch hole notch strictly on physical desktop mockups */}
        <div className="hidden md:block absolute top-0 inset-x-0 h-4 bg-slate-900 z-50">
          <div className="w-24 h-3.5 bg-slate-900 mx-auto rounded-b-xl flex items-center justify-center gap-2">
            <div className="w-2.5 h-2.5 rounded-full bg-slate-950 border border-slate-800/80" />
            <div className="w-6 h-1 bg-slate-850 rounded-full" />
          </div>
        </div>

        {/* Global Brand Navigation Bar with options in the green section */}
        {mobileView !== 'chat' && (
          <header className="bg-emerald-700 text-white px-3 sm:px-4 py-2.5 flex items-center justify-between shadow-md z-20 select-none shrink-0 border-b border-emerald-600/35">
            <div className="flex items-center gap-2 min-w-0">
              <div className="bg-white/10 p-1.5 rounded-xl border border-white/10 shrink-0 flex items-center justify-center">
                <FamiChatLogo className="w-4.5 h-4.5 text-teal-350" />
              </div>
              <div className="min-w-0">
                <span className="font-extrabold text-[13px] sm:text-sm tracking-wide flex items-center gap-1 uppercase truncate font-sans">
                  FamiChat <span className="text-emerald-300 font-light text-[10px] italic font-serif normal-case">by Martinez Alejandro</span>
                </span>
                <p className="text-[8.5px] text-emerald-100/90 truncate">Mensajería Familiar Privada</p>
              </div>
            </div>

            {/* Connection Ticker and More actions */}
            <div className="flex items-center gap-1.5 shrink-0 relative">
              {activeTypingLabel && (
                <div className="flex items-center gap-1 bg-emerald-600/60 text-emerald-100 py-0.5 px-2 rounded-full text-[9px] font-medium border border-emerald-550 max-w-[80px] xs:max-w-none truncate animate-pulse">
                  <span className="flex h-1 w-1 rounded-full bg-emerald-300 shrink-0" />
                  <span className="truncate">Escribiendo</span>
                </div>
              )}

              <MoreMenu 
                currentUser={activeUser}
                contacts={contacts}
                soundOn={soundOn}
                setSoundOn={setSoundOn}
                darkMode={darkMode}
                setDarkMode={setDarkMode}
                pushEnabled={pushEnabled}
                pushSupported={pushSupported}
                subscribingPush={subscribingPush}
                onTogglePush={() => {
                  if (pushEnabled) {
                    unsubscribeUserFromPush(activeUser.id);
                  } else {
                    subscribeUserToPush(activeUser.id);
                  }
                }}
                onTriggerPwa={() => {
                  window.history.pushState({ view: 'pwa_modal' }, '');
                  setShowPwaModal(true);
                }}
                isInstallable={isInstallable}
                isOpen={showMoreMenu}
                onOpenChange={(open) => {
                  if (open) {
                    window.history.pushState({ view: 'menu' }, '');
                    setShowMoreMenu(true);
                  } else {
                    if (window.history.state?.view === 'menu' || window.history.state?.view === 'faq' || window.history.state?.view === 'credits' || window.history.state?.view === 'pwa_modal' || window.history.state?.view === 'pin_modal') {
                      window.history.back();
                    } else {
                      setShowMoreMenu(false);
                    }
                  }
                }}
                showFaqGuide={showFaqGuide}
                onFaqGuideChange={(open) => {
                  if (open) {
                    window.history.pushState({ view: 'faq' }, '');
                    setShowFaqGuide(true);
                  } else {
                    if (window.history.state?.view === 'faq') {
                      window.history.back();
                    } else {
                      setShowFaqGuide(false);
                    }
                  }
                }}
                onOpenCredits={() => {
                  window.history.pushState({ view: 'credits' }, '');
                  setShowCreditsModal(true);
                }}
                onBackToSelection={() => {
                  setPendingUserToSwitch(null);
                  setPinAction('back_to_selection');
                  window.history.pushState({ view: 'pin_modal' }, '');
                  setShowIdentityPinModal(true);
                }}
              />
            </div>
          </header>
        )}

        {/* Main Interface Content block */}
        {loading ? (
          <div id="loader-fallback" className="flex-1 bg-white flex flex-col items-center justify-center p-8 select-none gap-3">
            <div className="w-8 h-8 border-3 border-emerald-500 border-t-transparent rounded-full animate-spin" />
            <span className="font-bold text-slate-800 text-xs text-center">Conectando a FamiChat...</span>
          </div>
        ) : (
          <main className="flex-1 flex overflow-hidden relative bg-slate-50">
            
            {/* SIDEBAR LIST PANE */}
            <div id="sideboard-pane" className={`absolute inset-0 z-10 flex flex-col h-full bg-white transition-all duration-200 ${
              mobileView === 'list' ? 'translate-x-0 opacity-100 pointer-events-auto' : '-translate-x-full opacity-0 pointer-events-none hidden'
            }`}>
              <Sidebar 
                contacts={contacts}
                currentUser={activeUser}
                activeId={currentChatId}
                onSelectChat={(id) => {
                  setActiveChannelId(id);
                  setShowChatInfo(false);
                  handleSetMobileView('chat');
                }}
                onAddContact={handleAddNewContact}
                onClearChat={handleClearChat}
                messages={messages}
                isInstallable={isInstallable}
                onShowInstallGuide={() => setShowPwaModal(true)}
                onStarMessage={handleToggleStarMessage}
                typingRegistry={typingRegistry}
              />
            </div>

            {/* ACTIVE CHAT DETAIL PANE */}
            <div id="chatbox-pane" className={`absolute inset-0 z-15 flex flex-col h-full bg-slate-55 transition-all duration-200 ${
              mobileView === 'chat' ? 'translate-x-0 opacity-100 pointer-events-auto' : 'translate-x-full opacity-0 pointer-events-none hidden'
            }`}>
               {currentChatId ? (
                <ChatArea 
                  currentUser={activeUser}
                  activeChannelId={currentChatId}
                  contacts={contacts}
                  messages={messages}
                  activeTypingLabel={activeTypingLabel}
                  onSendMessage={handleSendMessage}
                  onClearChat={handleClearChat}
                  onDeleteMessage={handleDeleteMessage}
                  onReactToMessage={handleReactToMessage}
                  onStarMessage={handleToggleStarMessage}
                  onBackMobile={() => handleSetMobileView('list')}
                  showMemberInfo={showChatInfo}
                  onToggleMemberInfo={handleToggleChatInfo}
                  darkMode={darkMode}
                />
              ) : (
                <div className="flex-1 bg-slate-100 flex flex-col items-center justify-center p-8 text-center select-none">
                  <div className="w-14 h-14 rounded-full bg-slate-200 flex items-center justify-center text-3xl mb-3 text-slate-400">
                    🏡
                  </div>
                  <h3 className="font-bold text-slate-700 text-xs">Selecciona un chat familiar</h3>
                  <button 
                    onClick={() => handleSetMobileView('list')} 
                    className="mt-4 px-4 py-2 bg-emerald-600 hover:bg-emerald-700 text-white rounded-lg text-xs font-semibold shadow-md cursor-pointer"
                  >
                    Ver Lista de Familiares
                  </button>
                </div>
              )}
            </div>

          </main>
        )}

        {/* Persistent floating banner notifications log */}
        <NotificationsContainer 
          notifications={notifications}
          onDismiss={handleDismissNotification}
        />

        {/* PWA Install helper guide dialog */}
        <PwaInstallModal
          isOpen={showPwaModal}
          onClose={() => {
            if (window.history.state?.view === 'pwa_modal') {
              window.history.back();
            } else {
              setShowPwaModal(false);
            }
          }}
          isInstallable={isInstallable}
          onTriggerInstall={handleTriggerInstall}
        />
        
        {/* Identity shift PIN check dialog */}
        <PinModal
          isOpen={showIdentityPinModal}
          onClose={() => {
            if (window.history.state?.view === 'pin_modal') {
              window.history.back();
            } else {
              setShowIdentityPinModal(false);
              setPendingUserToSwitch(null);
              setPinAction(null);
            }
          }}
          onSuccess={() => {
            if (pendingUserToSwitch) {
              executeUserChange(pendingUserToSwitch);
            } else if (pinAction === 'back_to_selection') {
              // Clear session and return cleanly to selection gateway
              localStorage.removeItem('famichat_active_user_id');
              setActiveUser(null);
            } else {
              setIsSwitcherUnlocked(true);
            }
            setPinAction(null);
          }}
        />

        {/* Dynamic Credits and Network Maintenance status Overlay modal */}
        <CreditsModal 
          isOpen={showCreditsModal}
          onClose={() => {
            if (window.history.state?.view === 'credits') {
              window.history.back();
            } else {
              setShowCreditsModal(false);
            }
          }}
        />
        
        {/* Soft simulated physical home pill bar at the bottom center of the screen mockup */}
        <div className="hidden md:block w-32 h-1 bg-slate-800 rounded-full mx-auto my-2 shrink-0 z-40" />

      </div>
    </div>
  );
}
