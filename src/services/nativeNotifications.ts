import { Capacitor } from '@capacitor/core';
import { LocalNotifications } from '@capacitor/local-notifications';
import { PushNotifications } from '@capacitor/push-notifications';
import { Message, Contact } from '../types';

export const FAMICHAT_NOTIFICATION_CHANNEL_ID = 'famichat_urgent_messages_v2';

let isChannelInitialized = false;
let notificationIdCounter = Math.floor(Date.now() / 1000) % 100000;

/**
 * Inicializa los canales nativos de alta prioridad en Android (con sonido y vibración)
 * y solicita los permisos de notificación en dispositivos móviles Capacitor.
 */
export async function initNativeNotifications(
  onNavigateToRoom?: (roomId: string) => void
): Promise<boolean> {
  if (typeof window === 'undefined') return false;

  if (!Capacitor.isNativePlatform()) {
    // En navegador web estándar, solicitar permiso de Notification API si existe
    if ('Notification' in window && Notification.permission === 'default') {
      try {
        await Notification.requestPermission();
      } catch {
        // ignore
      }
    }
    return 'Notification' in window && Notification.permission === 'granted';
  }

  try {
    // 1. Verificar y solicitar permisos en Android 13+ (POST_NOTIFICATIONS)
    let permStatus = await LocalNotifications.checkPermissions();
    if (permStatus.display !== 'granted') {
      permStatus = await LocalNotifications.requestPermissions();
    }

    // 2. Crear canal de alta prioridad en Android para que SUENE siempre incluso en segundo plano
    if (!isChannelInitialized) {
      await LocalNotifications.createChannel({
        id: FAMICHAT_NOTIFICATION_CHANNEL_ID,
        name: 'Mensajes Familiares Urgentes',
        description: 'Alertas sonoras en tiempo real de FamiChat para la familia',
        importance: 5, // IMPORTANCE_HIGH (suena y muestra banner emergente heads-up)
        visibility: 1, // VISIBILITY_PUBLIC en pantalla de bloqueo
        vibration: true,
        lights: true,
        lightColor: '#10B981',
      });
      isChannelInitialized = true;
    }

    // 3. Escuchar toques en la notificación nativa para abrir directamente el chat del familiar
    await LocalNotifications.removeAllListeners();
    await LocalNotifications.addListener('localNotificationActionPerformed', (action) => {
      const targetRoomId = action.notification?.extra?.roomId;
      if (targetRoomId && onNavigateToRoom) {
        onNavigateToRoom(targetRoomId);
      }
    });

    // 4. Registrar también PushNotifications si el dispositivo cuenta con Google Play Services / FCM
    try {
      const pushPerm = await PushNotifications.checkPermissions();
      if (pushPerm.receive === 'prompt') {
        await PushNotifications.requestPermissions();
      }
      if (pushPerm.receive === 'granted') {
        await PushNotifications.register();
      }
    } catch {
      // Si el APK compila sin google-services.json, LocalNotifications + Firestore onSnapshot cubren el 100%
    }

    return permStatus.display === 'granted';
  } catch (err) {
    console.warn('Error configuring Capacitor native notifications:', err);
    return false;
  }
}

/**
 * Dispara una notificación nativa con sonido real en Android (Capacitor) o Web Notification
 * cuando entra un mensaje dirigido al familiar activo o al grupo familiar.
 */
export async function triggerIncomingMessageNotification(
  message: Message,
  senderContact: Contact | undefined,
  soundEnabled: boolean = true
): Promise<void> {
  const isGroup = message.receiverId === 'family-group';
  const emoji = senderContact?.avatarEmoji || '💬';
  const title = isGroup
    ? `🏡 Familia Unida (${message.senderName.split(' ')[0]})`
    : `${emoji} ${message.senderName}`;

  let body = message.text;
  if (message.messageType === 'image') {
    body = '📷 Envió una foto compartida';
  } else if (message.messageType === 'audio') {
    body = '🎤 Envió una nota de voz familiar';
  }

  const targetRoomId = isGroup ? 'family-group' : message.senderId;

  // 1. Si estamos en el APK nativo de Android (Capacitor)
  if (Capacitor.isNativePlatform()) {
    try {
      if (!isChannelInitialized) {
        await initNativeNotifications();
      }

      notificationIdCounter = (notificationIdCounter + 1) % 2147483000;

      await LocalNotifications.schedule({
        notifications: [
          {
            id: notificationIdCounter,
            title,
            body,
            channelId: FAMICHAT_NOTIFICATION_CHANNEL_ID,
            schedule: { at: new Date(Date.now() + 100), allowWhileIdle: true },
            smallIcon: 'ic_launcher',
            extra: {
              roomId: targetRoomId,
              messageId: message.id,
              senderId: message.senderId,
            },
          },
        ],
      });
      return;
    } catch (err) {
      console.warn('Fallback from Capacitor LocalNotifications:', err);
    }
  }

  // 2. Respaldo en navegador web si la pestaña está en segundo plano
  if (
    typeof window !== 'undefined' &&
    'Notification' in window &&
    Notification.permission === 'granted' &&
    document.visibilityState === 'hidden' &&
    soundEnabled
  ) {
    try {
      const webNotif = new Notification(title, {
        body,
        tag: `famichat-${targetRoomId}`,
      });
      webNotif.onclick = () => {
        window.focus();
        webNotif.close();
      };
    } catch {
      // ignore
    }
  }
}
