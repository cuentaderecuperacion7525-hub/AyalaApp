import React, { useState, useEffect, useCallback, useRef } from 'react';
import { Contact, Message, LocalNotification } from './types';
import { INITIAL_CONTACTS } from './data/initialData';
import { Sidebar } from './components/Sidebar';
import { ChatArea } from './components/ChatArea';
import { NotificationsContainer } from './components/NotificationsContainer';
import { FamiChatLogo } from './components/FamiChatLogo';
import { PinModal } from './components/PinModal';
import { MoreMenu } from './components/MoreMenu';
import { WelcomeGateway } from './components/WelcomeGateway';
import { CreditsModal } from './components/CreditsModal';
import { SplashScreen } from './components/SplashScreen';
import { UpdateModal } from './components/UpdateModal';
import { getInstalledAppVersion, fetchLatestRelease, ReleaseInfo } from './config/version';
import { playSendSound, playNotificationSound } from './utils/audio';
import { apiFetch } from './utils/api';
import { App as CapApp } from '@capacitor/app';
import { Capacitor } from '@capacitor/core';

const MESSAGES_STORAGE_KEY = 'famichat_messages_v2';
const CONTACTS_STORAGE_KEY = 'famichat_contacts_v2';
const OUTBOX_STORAGE_KEY = 'famichat_outbox_v2';

function loadCachedContacts(): Contact[] {
  try {
    const raw = localStorage.getItem(CONTACTS_STORAGE_KEY);
    if (raw) {
      const parsed = JSON.parse(raw);
      if (Array.isArray(parsed) && parsed.length > 0) {
        const now = Date.now();
        return parsed.map((c: Contact) => {
          const validTs =
            typeof c.lastActiveTimestamp === 'number' &&
            c.lastActiveTimestamp > 0 &&
            c.lastActiveTimestamp <= now + 60000
              ? c.lastActiveTimestamp
              : undefined;
          return {
            ...c,
            isOnline: false,
            lastActiveTimestamp: validTs,
            lastActive: validTs ? 'Desconectado' : 'Sin conexión registrada',
          };
        });
      }
    }
  } catch (e) {
    console.warn('Error reading cached contacts:', e);
  }
  return INITIAL_CONTACTS;
}

function loadCachedMessages(): Message[] {
  try {
    const raw = localStorage.getItem(MESSAGES_STORAGE_KEY);
    if (raw) {
      const parsed = JSON.parse(raw);
      if (Array.isArray(parsed)) {
        return parsed;
      }
    }
  } catch (e) {
    console.warn('Error reading cached messages:', e);
  }
  return [];
}

function saveCachedMessages(list: Message[]) {
  try {
    localStorage.setItem(MESSAGES_STORAGE_KEY, JSON.stringify(list));
  } catch (e) {
    console.warn('Error saving cached messages:', e);
  }
}

function getOutboxQueue(): any[] {
  try {
    const raw = localStorage.getItem(OUTBOX_STORAGE_KEY);
    if (raw) {
      const parsed = JSON.parse(raw);
      if (Array.isArray(parsed)) return parsed;
    }
  } catch {
    // ignore
  }
  return [];
}

function saveOutboxQueue(queue: any[]) {
  try {
    localStorage.setItem(OUTBOX_STORAGE_KEY, JSON.stringify(queue));
  } catch {
    // ignore
  }
}

// Helper function to safely parse a public VAPID key into browser-supported Uint8Array format
function urlBase64ToUint8Array(base64String: string) {
  const padding = '='.repeat((4 - (base64String.length % 4)) % 4);
  const base64 = (base64String + padding).replace(/\-/g, '+').replace(/_/g, '/');

  const rawData = window.atob(base64);
  const outputArray = new Uint8Array(rawData.length);

  for (let i = 0; i < rawData.length; ++i) {
    outputArray[i] = rawData.charCodeAt(i);
  }
  return outputArray;
}

export default function App() {
  const [contacts, setContacts] = useState<Contact[]>(() => loadCachedContacts());
  const [messages, setMessages] = useState<Message[]>(() => loadCachedMessages());
  const [typingRegistry, setTypingRegistry] = useState<Record<string, string>>({});

  const [activeUser, setActiveUser] = useState<Contact | null>(() => {
    const savedUserId = localStorage.getItem('famichat_active_user_id');
    if (savedUserId) {
      const cached = loadCachedContacts();
      const found = cached.find(c => c.id === savedUserId) || INITIAL_CONTACTS.find(c => c.id === savedUserId);
      if (found) return found;
    }
    return null;
  });

  const [showCreditsModal, setShowCreditsModal] = useState<boolean>(false);
  const [showMoreMenu, setShowMoreMenu] = useState<boolean>(false);
  const [showFaqGuide, setShowFaqGuide] = useState<boolean>(false);

  const [activeChannelId, setActiveChannelId] = useState<string | 'family-group'>('family-group');
  const [mobileView, setMobileView] = useState<'list' | 'chat'>('list');
  const [showChatInfo, setShowChatInfo] = useState<boolean>(false);

  // Auto-detect native Capacitor environment or Android device to apply safe area offsets
  useEffect(() => {
    const isNative = Capacitor.isNativePlatform();
    const isAndroid = /Android/i.test(navigator.userAgent);
    if (isNative || isAndroid) {
      document.documentElement.classList.add('is-native-android');
    }
  }, []);

  // Auto-push baseline state when active user is logged in
  useEffect(() => {
    if (activeUser) {
      if (!window.history.state || typeof window.history.state.view === 'undefined') {
        window.history.replaceState({ view: 'list' }, '');
      }
    } else {
      setShowMoreMenu(false);
      setShowFaqGuide(false);
      setShowCreditsModal(false);
      setShowIdentityPinModal(false);
      setShowUpdateModal(false);
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
        setShowIdentityPinModal(false);
        setShowUpdateModal(false);
      } else {
        const view = state.view;
        setShowMoreMenu(view === 'menu');
        setShowFaqGuide(view === 'faq');
        setShowCreditsModal(view === 'credits');
        setShowIdentityPinModal(view === 'pin_modal');
        setShowUpdateModal(view === 'update_modal');

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

  const handleSetMobileView = useCallback((view: 'list' | 'chat') => {
    if (view === 'chat') {
      setShowMoreMenu(false);
      if (window.history.state?.view === 'menu') {
        window.history.replaceState({ view: 'chat' }, '');
      } else if (window.history.state?.view !== 'chat' && window.history.state?.view !== 'chat_info') {
        window.history.pushState({ view: 'chat' }, '');
      }
      setMobileView('chat');
    } else {
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
        if (window.history.state?.view !== 'chat_info') {
          window.history.pushState({ view: 'chat_info' }, '');
        }
      } else {
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
  const [, setServerState] = useState<'connected' | 'reconnecting'>('connected');

  const [pushSupported, setPushSupported] = useState<boolean>(false);
  const [pushEnabled, setPushEnabled] = useState<boolean>(false);
  const [subscribingPush, setSubscribingPush] = useState<boolean>(false);

  const [showIdentityPinModal, setShowIdentityPinModal] = useState<boolean>(false);
  const [pendingUserToSwitch, setPendingUserToSwitch] = useState<Contact | null>(null);
  const [isSwitcherUnlocked, setIsSwitcherUnlocked] = useState<boolean>(false);
  const [pinAction, setPinAction] = useState<'unlock_switcher' | 'back_to_selection' | null>(null);

  // App version and GitHub update states
  const [installedVersion, setInstalledVersion] = useState<string>('1.0.0');
  const [hasUpdate, setHasUpdate] = useState<boolean>(false);
  const [latestRelease, setLatestRelease] = useState<ReleaseInfo | null>(null);
  const [showUpdateModal, setShowUpdateModal] = useState<boolean>(false);
  const [checkingUpdate, setCheckingUpdate] = useState<boolean>(false);
  const [updateCheckFeedback, setUpdateCheckFeedback] = useState<string | null>(null);
  const [autoCheckUpdates, setAutoCheckUpdates] = useState<boolean>(() => {
    return localStorage.getItem('famichat_auto_check_updates') !== 'false';
  });

  const mobileViewRef = useRef(mobileView);
  useEffect(() => {
    mobileViewRef.current = mobileView;
  }, [mobileView]);

  const activeChannelIdRef = useRef(activeChannelId);
  useEffect(() => {
    activeChannelIdRef.current = activeChannelId;
  }, [activeChannelId]);

  const activeUserRef = useRef(activeUser);
  useEffect(() => {
    activeUserRef.current = activeUser;
  }, [activeUser]);

  // Read real installed app version on startup
  useEffect(() => {
    getInstalledAppVersion().then(ver => {
      setInstalledVersion(ver);
    });
  }, []);

  const handleToggleAutoCheckUpdates = (val: boolean) => {
    setAutoCheckUpdates(val);
    localStorage.setItem('famichat_auto_check_updates', val ? 'true' : 'false');
  };

  // Report offline status when app goes to background or closes
  useEffect(() => {
    const reportOffline = (uid?: string) => {
      const targetId = uid || activeUserRef.current?.id;
      if (!targetId) return;
      apiFetch('/api/presence-offline', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ userId: targetId }),
      }).catch(() => {});
    };

    const handleVisibilityChange = () => {
      if (document.visibilityState === 'hidden') {
        reportOffline();
      }
    };

    const handlePageHide = () => {
      reportOffline();
    };

    document.addEventListener('visibilitychange', handleVisibilityChange);
    window.addEventListener('pagehide', handlePageHide);

    let capStateListener: any = null;
    if (typeof window !== 'undefined' && Capacitor.isNativePlatform()) {
      capStateListener = CapApp.addListener('appStateChange', ({ isActive }) => {
        if (!isActive) {
          reportOffline();
        }
      });
    }

    return () => {
      document.removeEventListener('visibilitychange', handleVisibilityChange);
      window.removeEventListener('pagehide', handlePageHide);
      if (capStateListener) {
        capStateListener.then((l: any) => l.remove());
      }
    };
  }, []);

  // Hardware Android back button support via Capacitor
  useEffect(() => {
    if (typeof window !== 'undefined' && Capacitor.isNativePlatform()) {
      const backListener = CapApp.addListener('backButton', () => {
        const currentView = window.history.state?.view;
        const hasOverlayOpen =
          showMoreMenu ||
          showFaqGuide ||
          showCreditsModal ||
          showIdentityPinModal ||
          showUpdateModal ||
          showChatInfo ||
          mobileView === 'chat';

        if (hasOverlayOpen || (currentView && currentView !== 'list')) {
          window.history.back();
        } else {
          if (activeUserRef.current?.id) {
            apiFetch('/api/presence-offline', {
              method: 'POST',
              headers: { 'Content-Type': 'application/json' },
              body: JSON.stringify({ userId: activeUserRef.current.id }),
            }).catch(() => {});
          }
          CapApp.exitApp();
        }
      });

      return () => {
        backListener.then(l => l.remove());
      };
    }
  }, [showMoreMenu, showFaqGuide, showCreditsModal, showIdentityPinModal, showUpdateModal, showChatInfo, mobileView]);

  // Check for updates once on startup in background with a 3-second delay after app loads
  const hasStartedAutoUpdateCheckRef = useRef<boolean>(false);
  useEffect(() => {
    if (loading || hasStartedAutoUpdateCheckRef.current) return;

    let isCancelled = false;
    let retryTimer: ReturnType<typeof setTimeout> | null = null;

    const performCheck = async (isRetry: boolean) => {
      const isAutoEnabled = localStorage.getItem('famichat_auto_check_updates') !== 'false';
      if (!isAutoEnabled) return;

      if (typeof navigator !== 'undefined' && !navigator.onLine) {
        if (!isRetry) {
          retryTimer = setTimeout(() => {
            if (!isCancelled) performCheck(true);
          }, 10000);
        }
        return;
      }

      const result = await fetchLatestRelease();
      if (isCancelled) return;

      if (result.installedVersion) {
        setInstalledVersion(result.installedVersion);
      }

      if (!result.success) {
        if (!isRetry) {
          retryTimer = setTimeout(() => {
            if (!isCancelled) performCheck(true);
          }, 10000);
        }
        return;
      }

      if (result.hasUpdate && result.release) {
        setHasUpdate(true);
        setLatestRelease(result.release);

        const lastShownVersion = localStorage.getItem('famichat_dismissed_update_version');

        if (
          activeUserRef.current &&
          mobileViewRef.current === 'list' &&
          lastShownVersion !== result.release.version
        ) {
          localStorage.setItem('famichat_dismissed_update_version', result.release.version);
          if (window.history.state?.view !== 'update_modal') {
            window.history.pushState({ view: 'update_modal' }, '');
          }
          setShowUpdateModal(true);
        }
      }
    };

    const initialTimer = setTimeout(() => {
      if (!isCancelled && !hasStartedAutoUpdateCheckRef.current) {
        hasStartedAutoUpdateCheckRef.current = true;
        performCheck(false);
      }
    }, 3000);

    return () => {
      isCancelled = true;
      clearTimeout(initialTimer);
      if (retryTimer) clearTimeout(retryTimer);
    };
  }, [loading]);

  // If update was detected while on the Welcome screen, show the dialog once upon entering the chat list
  useEffect(() => {
    if (activeUser && mobileView === 'list' && hasUpdate && latestRelease) {
      const lastShownVersion = localStorage.getItem('famichat_dismissed_update_version');
      if (lastShownVersion !== latestRelease.version) {
        localStorage.setItem('famichat_dismissed_update_version', latestRelease.version);
        if (window.history.state?.view !== 'update_modal') {
          window.history.pushState({ view: 'update_modal' }, '');
        }
        setShowUpdateModal(true);
      }
    }
  }, [activeUser, mobileView, hasUpdate, latestRelease]);

  const handleManualCheckUpdates = async () => {
    setCheckingUpdate(true);
    setUpdateCheckFeedback(null);

    const result = await fetchLatestRelease();
    setCheckingUpdate(false);

    const currentVer = result.installedVersion || installedVersion;
    if (result.installedVersion) {
      setInstalledVersion(result.installedVersion);
    }

    if (result.success) {
      if (result.hasUpdate && result.release) {
        setHasUpdate(true);
        setLatestRelease(result.release);
        const verLabel = result.release.version.startsWith('v')
          ? result.release.version
          : `v${result.release.version}`;
        setUpdateCheckFeedback(`Hay una nueva: ${verLabel}`);
        window.history.pushState({ view: 'update_modal' }, '');
        setShowUpdateModal(true);
      } else {
        setHasUpdate(false);
        setUpdateCheckFeedback(`Estás al día (versión ${currentVer})`);
      }
    } else {
      setUpdateCheckFeedback(result.errorMessage || 'Sin internet');
    }
  };

  const handleUpdateNow = () => {
    if (latestRelease?.downloadUrl) {
      window.open(latestRelease.downloadUrl, '_blank');
    }
    if (window.history.state?.view === 'update_modal') {
      window.history.back();
    } else {
      setShowUpdateModal(false);
    }
  };

  const handleDismissUpdate = () => {
    if (latestRelease?.version) {
      localStorage.setItem('famichat_dismissed_update_version', latestRelease.version);
    }
    if (window.history.state?.view === 'update_modal') {
      window.history.back();
    } else {
      setShowUpdateModal(false);
    }
  };

  // Check if Web Push has browser support
  useEffect(() => {
    if (typeof window !== 'undefined' && 'serviceWorker' in navigator && 'PushManager' in window && 'Notification' in window) {
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
          console.error('Error parsing push navigate URL:', e);
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
    navigator.serviceWorker.ready.then(async reg => {
      if (!active) return;
      const sub = await reg.pushManager.getSubscription();
      if (sub) {
        setPushEnabled(true);
        try {
          await apiFetch('/api/push-subscribe', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({
              userId: activeUser.id,
              subscription: sub,
            }),
          });
        } catch (err) {
          console.warn('Failed to auto-sync existing push subscription on user transition:', err);
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
    if (!('serviceWorker' in navigator) || !('PushManager' in window) || !('Notification' in window)) {
      const toast: LocalNotification = {
        id: 'push-not-supported-' + Date.now(),
        title: 'Aviso del Sistema ℹ️',
        body: 'Tu navegador actual no admite notificaciones push en segundo plano.',
        avatarEmoji: 'ℹ️',
        avatarColor: 'bg-slate-600',
        timestamp: new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }),
      };
      setNotifications(prev => [toast, ...prev.slice(0, 2)]);
      return;
    }

    if (Notification.permission === 'denied') {
      const toast: LocalNotification = {
        id: 'push-denied-' + Date.now(),
        title: 'Permiso Denegado 🔕',
        body: 'El navegador tiene bloqueadas las notificaciones. Para activarlas, permite los avisos desde el candado o configuración del sitio.',
        avatarEmoji: '🔕',
        avatarColor: 'bg-amber-600',
        timestamp: new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }),
      };
      setNotifications(prev => [toast, ...prev.slice(0, 2)]);
      setPushEnabled(false);
      return;
    }

    try {
      setSubscribingPush(true);
      const registration = await navigator.serviceWorker.ready;

      const keyRes = await apiFetch('/api/push-public-key');
      if (!keyRes.ok) {
        throw new Error('No se pudo obtener la clave de notificaciones del servidor');
      }
      const { publicKey } = await keyRes.json();

      let permission: NotificationPermission = 'default';
      try {
        permission = await Notification.requestPermission();
      } catch (permErr) {
        console.warn('Notification.requestPermission failed:', permErr);
        permission = 'denied';
      }

      if (permission === 'denied') {
        const toast: LocalNotification = {
          id: 'push-denied-' + Date.now(),
          title: 'Permiso Denegado 🔕',
          body: 'El navegador rechazó el permiso de notificaciones push. Puedes habilitarlo en los ajustes del navegador.',
          avatarEmoji: '🔕',
          avatarColor: 'bg-amber-600',
          timestamp: new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }),
        };
        setNotifications(prev => [toast, ...prev.slice(0, 2)]);
        setPushEnabled(false);
        return;
      }

      if (permission !== 'granted') {
        setPushEnabled(false);
        return;
      }

      const convertedVapidKey = urlBase64ToUint8Array(publicKey);
      const subscription = await registration.pushManager.subscribe({
        userVisibleOnly: true,
        applicationServerKey: convertedVapidKey,
      });

      const subRes = await apiFetch('/api/push-subscribe', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          userId,
          subscription,
        }),
      });

      if (!subRes.ok) {
        throw new Error('Error al registrar la suscripción en el servidor');
      }

      setPushEnabled(true);

      const toast: LocalNotification = {
        id: 'push-registered-' + Date.now(),
        title: 'Notificaciones Push Activas 🔔',
        body: '¡Excelente! Ahora recibirás avisos del chat familiar incluso si cierras la app o el navegador.',
        avatarEmoji: '🔔',
        avatarColor: 'bg-emerald-650',
        timestamp: new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }),
      };
      setNotifications(prev => [toast, ...prev.slice(0, 2)]);
    } catch (error: any) {
      const toast: LocalNotification = {
        id: 'push-info-' + Date.now(),
        title: 'Aviso de Notificaciones ℹ️',
        body: error.message || 'No se pudieron activar las notificaciones push en este entorno.',
        avatarEmoji: 'ℹ️',
        avatarColor: 'bg-slate-600',
        timestamp: new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }),
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

        await apiFetch('/api/push-unsubscribe', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            userId,
            endpoint: subscription.endpoint,
          }),
        });
      }
      setPushEnabled(false);

      const toast: LocalNotification = {
        id: 'push-unsubscribed-' + Date.now(),
        title: 'Notificaciones Silenciadas 🔕',
        body: 'Has desactivado las notificaciones push para esta cuenta.',
        avatarEmoji: '🔕',
        avatarColor: 'bg-slate-600',
        timestamp: new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }),
      };
      setNotifications(prev => [toast, ...prev.slice(0, 2)]);
    } catch (e) {
      console.warn('Unsubscribe push notice:', e);
    } finally {
      setSubscribingPush(false);
    }
  };

  // Mark messages in current chat room as read when user opens a conversation
  useEffect(() => {
    if (!activeUser || mobileView !== 'chat' || !activeChannelId) return;

    apiFetch('/api/messages/read', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        userId: activeUser.id,
        roomId: activeChannelId,
      }),
    }).catch(() => {});
  }, [activeUser?.id, mobileView, activeChannelId]);

  const inFlightMessageIdsRef = useRef<Set<string>>(new Set());
  const deletedMessageIdsRef = useRef<Set<string>>(new Set());

  // --- Dynamic REAL-TIME syncing Poller ---
  useEffect(() => {
    let isMounted = true;

    const loadState = async () => {
      try {
        // 1. Flush any pending offline messages from the outbox that are not currently in-flight
        const outbox = getOutboxQueue().filter(
          item => item && item.id && !inFlightMessageIdsRef.current.has(item.id) && !deletedMessageIdsRef.current.has(item.id)
        );
        if (outbox.length > 0) {
          const flushedIds = new Set<string>();
          for (const pendingPayload of outbox) {
            try {
              const sendRes = await apiFetch('/api/messages', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify(pendingPayload),
              });
              if (sendRes.ok) {
                flushedIds.add(pendingPayload.id);
              }
            } catch {
              // keep in outbox for next retry
            }
          }
          if (flushedIds.size > 0) {
            const latestOutbox = getOutboxQueue().filter(
              item => item && item.id && !flushedIds.has(item.id) && !deletedMessageIdsRef.current.has(item.id)
            );
            saveOutboxQueue(latestOutbox);
          }
        }

        // 2. Fetch real contacts and presence state
        let currentContactsList = contacts;
        const contactsQuery = activeUser ? `?activeUser=${encodeURIComponent(activeUser.id)}` : '';
        const cRes = await apiFetch(`/api/contacts${contactsQuery}`);
        if (cRes.ok && isMounted) {
          const list: Contact[] = await cRes.json();
          currentContactsList = list;
          setContacts(list);
          try {
            localStorage.setItem(CONTACTS_STORAGE_KEY, JSON.stringify(list));
          } catch {
            // ignore storage errors
          }

          if (activeUser) {
            const currentInList = list.find((c: Contact) => c.id === activeUser.id);
            if (currentInList) {
              setActiveUser(prev => {
                if (!prev) return currentInList;
                if (
                  prev.isOnline !== currentInList.isOnline ||
                  prev.lastActive !== currentInList.lastActive ||
                  prev.lastActiveTimestamp !== currentInList.lastActiveTimestamp
                ) {
                  return currentInList;
                }
                return prev;
              });
            }
          }
        }

        if (!activeUser) {
          if (isMounted) setLoading(false);
          return;
        }

        // 3. Fetch real messages from server and merge with any still-pending outbox items
        const activeRoomParam =
          mobileViewRef.current === 'chat' ? `&activeRoom=${encodeURIComponent(activeChannelIdRef.current)}` : '';
        const mRes = await apiFetch(
          `/api/messages?activeUser=${encodeURIComponent(activeUser.id)}${activeRoomParam}`
        );

        if (mRes.ok && isMounted) {
          const rawServerList: Message[] = await mRes.json();
          const serverList = rawServerList.filter(m => !deletedMessageIdsRef.current.has(m.id));
          const currentOutbox = getOutboxQueue();
          const serverIds = new Set(serverList.map(m => m.id));

          // Preserve any local message that hasn't finished syncing yet so it NEVER disappears
          const unsyncedMessages: Message[] = currentOutbox
            .filter(item => item && item.id && !serverIds.has(item.id) && !deletedMessageIdsRef.current.has(item.id))
            .map(item => ({
              id: item.id,
              senderId: item.senderId,
              senderName: item.senderName,
              receiverId: item.receiverId,
              text: item.text,
              timestamp: item.timestamp || new Date().toISOString(),
              status: 'sent' as const,
              messageType: item.messageType || 'text',
              mediaUrl: item.mediaUrl,
              replyToId: item.replyToId,
              replyToText: item.replyToText,
              replyToSenderName: item.replyToSenderName,
            }));

          const mergedList = [...serverList, ...unsyncedMessages];
          saveCachedMessages(mergedList);

          setMessages(prev => {
            const prevIds = new Set(prev.map(m => m.id));
            const brandNewIncoming = serverList.filter(
              (m: Message) =>
                !prevIds.has(m.id) &&
                m.senderId !== activeUser.id &&
                (m.receiverId === 'family-group' || m.receiverId === activeUser.id)
            );

            if (prev.length > 0 && brandNewIncoming.length > 0) {
              const leadMsg = brandNewIncoming[brandNewIncoming.length - 1];
              const senderContact = currentContactsList.find(c => c.id === leadMsg.senderId);

              const isWatchingAndActive =
                mobileViewRef.current === 'chat' &&
                (activeChannelIdRef.current === leadMsg.receiverId ||
                  (activeChannelIdRef.current === leadMsg.senderId && leadMsg.receiverId === activeUser.id));

              if (!isWatchingAndActive) {
                const toast: LocalNotification = {
                  id: 'notif-' + Date.now(),
                  title: `Nuevo mensaje de ${leadMsg.senderName}`,
                  body:
                    leadMsg.messageType === 'text'
                      ? leadMsg.text
                      : `📥 Mandó un archivo multimedia (${
                          leadMsg.messageType === 'audio' ? 'Nota de Voz 🎤' : 'Imagen 📷'
                        })`,
                  avatarEmoji: senderContact?.avatarEmoji || '👤',
                  avatarColor: senderContact?.avatarColor || 'bg-slate-500',
                  timestamp: new Date(leadMsg.timestamp).toLocaleTimeString([], {
                    hour: '2-digit',
                    minute: '2-digit',
                  }),
                };
                setNotifications(prevNot => [toast, ...prevNot.slice(0, 3)]);
                if (soundOn) playNotificationSound();
              } else {
                if (soundOn) playSendSound();
              }
            }
            return mergedList;
          });
        }

        // 4. Fetch active typing indicators
        const tRes = await apiFetch('/api/typing');
        if (tRes.ok && isMounted) {
          const dict = await tRes.json();
          setTypingRegistry(dict);
        }

        if (isMounted) setServerState('connected');
      } catch (e) {
        console.warn('Connection reconnecting/polling...', e);
        if (isMounted) setServerState('reconnecting');
      } finally {
        if (isMounted) setLoading(false);
      }
    };

    loadState();
    const interval = setInterval(loadState, 2200);

    return () => {
      isMounted = false;
      clearInterval(interval);
    };
  }, [activeUser?.id, activeChannelId, soundOn]);

  // Handle active identity shift
  const handleUserChange = (newUser: Contact) => {
    if (activeUser && activeUser.role !== 'admin' && !isSwitcherUnlocked) {
      setPendingUserToSwitch(newUser);
      setShowIdentityPinModal(true);
      return;
    }

    executeUserChange(newUser);
  };

  const executeUserChange = (newUser: Contact) => {
    if (activeUser && activeUser.id !== newUser.id) {
      apiFetch('/api/presence-offline', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ userId: activeUser.id }),
      }).catch(() => {});
    }

    setActiveUser(newUser);
    localStorage.setItem('famichat_active_user_id', newUser.id);
    setIsSwitcherUnlocked(false);

    const toast: LocalNotification = {
      id: 'session-switch-' + Date.now(),
      title: 'Sesión Iniciada 👤',
      body: `Sesión activa para ${newUser.name}.`,
      avatarEmoji: newUser.avatarEmoji,
      avatarColor: newUser.avatarColor,
      timestamp: new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }),
    };
    setNotifications(prev => [toast, ...prev.slice(0, 2)]);
    if (soundOn) playNotificationSound();

    setActiveChannelId('family-group');
    handleSetMobileView('list');
  };

  // --- Send Message Action Engine (Persists locally + syncs with server API) ---
  const handleSendMessage = async (
    text: string,
    messageType?: 'text' | 'image' | 'audio',
    mediaUrl?: string,
    replyToId?: string,
    replyToText?: string,
    replyToSenderName?: string
  ) => {
    if (!activeUser) return;

    const msgId = 'msg-' + Date.now() + '-' + Math.random().toString(36).substring(2, 7);
    const nowIso = new Date().toISOString();

    const payload = {
      id: msgId,
      senderId: activeUser.id,
      senderName: activeUser.name,
      receiverId: activeChannelId,
      text: text,
      timestamp: nowIso,
      messageType: messageType || 'text',
      mediaUrl: mediaUrl || undefined,
      replyToId: replyToId || undefined,
      replyToText: replyToText || undefined,
      replyToSenderName: replyToSenderName || undefined,
      activeUser: activeUser.id,
    };

    const optimisticMsg: Message = {
      id: payload.id,
      senderId: payload.senderId,
      senderName: payload.senderName,
      receiverId: payload.receiverId,
      text: payload.text,
      timestamp: nowIso,
      status: 'sent',
      messageType: payload.messageType as any,
      mediaUrl: payload.mediaUrl,
      replyToId: payload.replyToId,
      replyToText: payload.replyToText,
      replyToSenderName: payload.replyToSenderName,
    };

    // 1. Save immediately in local state & localStorage so it NEVER disappears on app exit
    setMessages(prev => {
      const next = [...prev, optimisticMsg];
      saveCachedMessages(next);
      return next;
    });

    // 2. Add to persistent outbox until server confirms receipt
    inFlightMessageIdsRef.current.add(payload.id);
    const currentOutbox = getOutboxQueue();
    saveOutboxQueue([...currentOutbox, payload]);

    if (soundOn) playSendSound();

    try {
      // Clear typing indicator
      apiFetch('/api/typing', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ userId: activeUser.id, isTyping: false }),
      }).catch(() => {});

      const response = await apiFetch('/api/messages', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(payload),
      });

      if (response.ok) {
        const saved: Message = await response.json();
        // Remove from outbox since server persisted it
        const updatedOutbox = getOutboxQueue().filter(item => item.id !== payload.id);
        saveOutboxQueue(updatedOutbox);

        setMessages(prev => {
          const next = prev.map(m => (m.id === payload.id ? saved : m));
          saveCachedMessages(next);
          return next;
        });
      }
    } catch (e) {
      console.error('Message queued in local outbox for automatic retry:', e);
    } finally {
      inFlightMessageIdsRef.current.delete(payload.id);
    }
  };

  // --- Clear chat conversation option (Borrar conversaciones) ---
  const handleClearChat = async (channelId: string | 'family-group') => {
    if (!activeUser) return;

    // Update local state & cache immediately
    setMessages(prev => {
      const filtered = prev.filter(m => {
        if (channelId === 'family-group') {
          if (m.receiverId === 'family-group') {
            deletedMessageIdsRef.current.add(m.id);
            return false;
          }
          return true;
        } else {
          const isBetweenThem =
            (m.senderId === activeUser.id && m.receiverId === channelId) ||
            (m.senderId === channelId && m.receiverId === activeUser.id);
          if (isBetweenThem) {
            deletedMessageIdsRef.current.add(m.id);
            return false;
          }
          return true;
        }
      });
      saveCachedMessages(filtered);
      return filtered;
    });

    const filteredOutbox = getOutboxQueue().filter(item => {
      if (!item) return false;
      if (channelId === 'family-group') {
        return item.receiverId !== 'family-group';
      }
      const isBetweenThem =
        (item.senderId === activeUser.id && item.receiverId === channelId) ||
        (item.senderId === channelId && item.receiverId === activeUser.id);
      return !isBetweenThem;
    });
    saveOutboxQueue(filteredOutbox);

    try {
      const response = await apiFetch('/api/messages', {
        method: 'DELETE',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          channelId,
          userId: activeUser.id,
        }),
      });

      if (response.ok) {
        const toast: LocalNotification = {
          id: 'clear-' + Date.now(),
          title: 'Historial Removido',
          body: 'Se borraron los mensajes de esta conversación de forma segura.',
          avatarEmoji: '🗑️',
          avatarColor: 'bg-rose-600',
          timestamp: new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }),
        };
        setNotifications(prev => [toast, ...prev.slice(0, 1)]);
        if (soundOn) playNotificationSound();
      }
    } catch (e) {
      console.error('Failed to clear chat room on server:', e);
    }
  };

  // --- Delete individual message (Borrar mensaje específico) ---
  const handleDeleteMessage = async (messageId: string) => {
    deletedMessageIdsRef.current.add(messageId);
    setMessages(prev => {
      const next = prev.filter(m => m.id !== messageId);
      saveCachedMessages(next);
      return next;
    });

    const updatedOutbox = getOutboxQueue().filter(item => item.id !== messageId);
    saveOutboxQueue(updatedOutbox);

    try {
      const response = await apiFetch(`/api/messages/${messageId}`, {
        method: 'DELETE',
      });
      if (response.ok) {
        const toast: LocalNotification = {
          id: 'deleted-' + Date.now(),
          title: 'Mensaje Eliminado',
          body: 'Se eliminó el mensaje de la conversación de forma segura.',
          avatarEmoji: '🗑️',
          avatarColor: 'bg-rose-600',
          timestamp: new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }),
        };
        setNotifications(prev => [toast, ...prev.slice(0, 1)]);
        if (soundOn) playNotificationSound();
      }
    } catch (e) {
      console.error('Failed to delete message on backend server:', e);
    }
  };

  // --- React to message with emoji ---
  const handleReactToMessage = async (messageId: string, reaction: string) => {
    try {
      setMessages(prev => {
        const next = prev.map(m => {
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
        });
        saveCachedMessages(next);
        return next;
      });

      const response = await apiFetch(`/api/messages/${messageId}/react`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ reaction }),
      });

      if (!response.ok) {
        console.warn('Reactions out of sync');
      }
    } catch (e) {
      console.error('Failed to react to message:', e);
    }
  };

  // --- Toggle Star (Mensaje Destacado) ---
  const handleToggleStarMessage = async (messageId: string) => {
    try {
      setMessages(prev => {
        const next = prev.map(m => {
          if (m.id === messageId) {
            return { ...m, isStarred: !m.isStarred };
          }
          return m;
        });
        saveCachedMessages(next);
        return next;
      });

      const response = await apiFetch(`/api/messages/${messageId}/star`, {
        method: 'POST',
      });

      if (!response.ok) {
        console.warn('Starring state out of sync');
      }
    } catch (e) {
      console.error('Failed to toggle star on message:', e);
    }
  };

  // --- Add new contact option (Admin Only - Papá José Manuel) ---
  const handleAddNewContact = async (newContact: Omit<Contact, 'role'>) => {
    try {
      const response = await apiFetch('/api/contacts', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          contact: newContact,
          activeUser: activeUser?.id,
        }),
      });

      if (response.ok) {
        const result = await response.json();
        setContacts(result.contacts);
        try {
          localStorage.setItem(CONTACTS_STORAGE_KEY, JSON.stringify(result.contacts));
        } catch {
          // ignore
        }

        const alertToast: LocalNotification = {
          id: 'added-' + Date.now(),
          title: 'Familiar Registrado',
          body: `¡Excelente José! El integrante "${newContact.name}" ha sido agregado a la red familiar.`,
          avatarEmoji: '✨',
          avatarColor: 'bg-amber-500',
          timestamp: new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }),
        };
        setNotifications(prev => [alertToast, ...prev.slice(0, 1)]);
        if (soundOn) playNotificationSound();
      }
    } catch (e) {
      console.error('Failed to add new contact on server:', e);
    }
  };

  // --- Dismiss notifications banner ---
  const handleDismissNotification = useCallback((id: string) => {
    setNotifications(prev => prev.filter(n => n.id !== id));
  }, []);

  const activeRoomExists = activeChannelId === 'family-group' || contacts.some(c => c.id === activeChannelId);
  const currentChatId = activeRoomExists ? activeChannelId : 'family-group';

  // Format typing indicator text for group chat or direct chats
  const getTypingIndicatorText = () => {
    const list: string[] = [];
    Object.entries(typingRegistry).forEach(([writerId, roomId]) => {
      if (writerId === activeUser?.id) return;

      const targetContact = contacts.find(c => c.id === writerId);
      if (!targetContact) return;

      const isWritingHere =
        currentChatId === 'family-group'
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

  if (loading) {
    return <SplashScreen darkMode={darkMode} />;
  }

  if (!activeUser) {
    return <WelcomeGateway contacts={contacts} onSelectUser={executeUserChange} />;
  }

  return (
    <div className="min-h-[100dvh] w-full bg-slate-950 flex items-center justify-center p-0 md:p-4 bg-gradient-to-tr from-slate-900 via-emerald-950/20 to-slate-900 font-sans select-none overflow-hidden text-slate-900 selection:bg-emerald-500 selection:text-white relative">
      <div className="absolute top-[-10%] left-[-10%] w-[50%] h-[50%] bg-emerald-500/10 rounded-full blur-[120px] pointer-events-none" />
      <div className="absolute bottom-[-10%] right-[-10%] w-[50%] h-[50%] bg-teal-500/10 rounded-full blur-[120px] pointer-events-none" />

      <div
        className={`w-full h-[100dvh] md:h-[92vh] md:max-h-[860px] md:max-w-[420px] md:rounded-[42px] md:shadow-[0_25px_60px_-15px_rgba(0,0,0,0.85)] md:border-[10px] md:border-slate-800 flex flex-col overflow-hidden relative md:ring-1 md:ring-white/10 shrink-0 transition-colors duration-300 ${
          darkMode ? 'dark bg-slate-900 border-slate-950 text-slate-100' : 'bg-slate-100 text-slate-900'
        }`}
      >
        <div className="hidden md:block absolute top-0 inset-x-0 h-4 bg-slate-900 z-50">
          <div className="w-24 h-3.5 bg-slate-900 mx-auto rounded-b-xl flex items-center justify-center gap-2">
            <div className="w-2.5 h-2.5 rounded-full bg-slate-950 border border-slate-800/80" />
            <div className="w-6 h-1 bg-slate-850 rounded-full" />
          </div>
        </div>

        {mobileView !== 'chat' && (
          <header className="bg-gradient-to-r from-[#6552e8] to-[#513ed8] dark:from-[#1c1b2e] dark:to-[#171628] text-white px-3 sm:px-4 pt-[calc(var(--sat,0px)+0.625rem)] md:pt-2.5 pb-2.5 flex items-center justify-between shadow-md z-30 select-none shrink-0 border-b border-white/10 dark:border-[#2d2b45] transition-colors">
            <div className="flex items-center gap-2 min-w-0">
              <div className="bg-white/15 p-1.5 rounded-xl border border-white/10 shrink-0 flex items-center justify-center">
                <FamiChatLogo className="w-4.5 h-4.5 text-white" />
              </div>
              <div className="min-w-0">
                <span className="font-extrabold text-[13px] sm:text-sm tracking-wide flex items-center gap-1 uppercase truncate font-sans">
                  FamiChat{' '}
                  <span className="text-violet-200 dark:text-violet-300 font-light text-[10px] italic font-serif normal-case">
                    by Martinez Alejandro
                  </span>
                </span>
                <p className="text-[8.5px] text-violet-100/90 dark:text-slate-300 truncate">Mensajería Familiar Privada</p>
              </div>
            </div>

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
                hasUpdate={hasUpdate}
                onCheckUpdates={handleManualCheckUpdates}
                autoCheckUpdates={autoCheckUpdates}
                onToggleAutoCheckUpdates={handleToggleAutoCheckUpdates}
                checkingUpdate={checkingUpdate}
                installedVersion={installedVersion}
                updateCheckFeedback={updateCheckFeedback}
                isOpen={showMoreMenu}
                onOpenChange={open => {
                  if (open) {
                    window.history.pushState({ view: 'menu' }, '');
                    setShowMoreMenu(true);
                  } else {
                    if (
                      window.history.state?.view === 'menu' ||
                      window.history.state?.view === 'faq' ||
                      window.history.state?.view === 'credits' ||
                      window.history.state?.view === 'pin_modal' ||
                      window.history.state?.view === 'update_modal'
                    ) {
                      window.history.back();
                    } else {
                      setShowMoreMenu(false);
                    }
                  }
                }}
                showFaqGuide={showFaqGuide}
                onFaqGuideChange={open => {
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

        {loading ? (
          <SplashScreen darkMode={darkMode} />
        ) : (
          <main className="flex-1 flex overflow-hidden relative bg-slate-50">
            <div
              id="sideboard-pane"
              className={`absolute inset-0 z-10 flex flex-col h-full bg-white transition-all duration-200 ${
                mobileView === 'list'
                  ? 'translate-x-0 opacity-100 pointer-events-auto'
                  : '-translate-x-full opacity-0 pointer-events-none hidden'
              }`}
            >
              <Sidebar
                contacts={contacts}
                currentUser={activeUser}
                activeId={currentChatId}
                onSelectChat={id => {
                  setActiveChannelId(id);
                  setShowChatInfo(false);
                  handleSetMobileView('chat');
                }}
                onAddContact={handleAddNewContact}
                onClearChat={handleClearChat}
                messages={messages}
                onStarMessage={handleToggleStarMessage}
                typingRegistry={typingRegistry}
              />
            </div>

            <div
              id="chatbox-pane"
              className={`absolute inset-0 z-15 flex flex-col h-full bg-slate-55 transition-all duration-200 ${
                mobileView === 'chat'
                  ? 'translate-x-0 opacity-100 pointer-events-auto'
                  : 'translate-x-full opacity-0 pointer-events-none hidden'
              }`}
            >
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

        <NotificationsContainer notifications={notifications} onDismiss={handleDismissNotification} />

        <PinModal
          isOpen={showIdentityPinModal}
          description="Introduce la clave de seguridad familiar para cambiar de perfil o cerrar la sesión actual."
          successMessage="Redirigiendo a selección de perfil..."
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
            window.history.replaceState({ view: 'list' }, '');
            setShowIdentityPinModal(false);
            setShowMoreMenu(false);
            if (pendingUserToSwitch) {
              executeUserChange(pendingUserToSwitch);
              setPendingUserToSwitch(null);
            } else if (pinAction === 'back_to_selection') {
              if (activeUser?.id) {
                apiFetch('/api/presence-offline', {
                  method: 'POST',
                  headers: { 'Content-Type': 'application/json' },
                  body: JSON.stringify({ userId: activeUser.id }),
                }).catch(() => {});
              }
              localStorage.removeItem('famichat_active_user_id');
              setActiveUser(null);
            } else {
              setIsSwitcherUnlocked(true);
            }
            setPinAction(null);
          }}
        />

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

        <UpdateModal
          isOpen={showUpdateModal}
          release={latestRelease}
          onClose={handleDismissUpdate}
          onUpdateNow={handleUpdateNow}
        />

        <div className="hidden md:block w-32 h-1 bg-slate-800 rounded-full mx-auto my-2 shrink-0 z-40" />
      </div>
    </div>
  );
}
