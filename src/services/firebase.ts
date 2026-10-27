import { initializeApp } from 'firebase/app';
import {
  getFirestore,
  collection,
  doc,
  setDoc,
  updateDoc,
  deleteDoc,
  onSnapshot,
  getDocs,
  writeBatch,
} from 'firebase/firestore';
import { getAuth } from 'firebase/auth';
import appletConfig from '../../firebase-applet-config.json';
import { Contact, Message } from '../types';
import { INITIAL_CONTACTS } from '../data/initialData';
import { encryptMessageText, decryptMessageText } from '../utils/crypto';

export const firebaseApp = initializeApp(appletConfig);
export const firestoreDb = getFirestore(
  firebaseApp,
  appletConfig.firestoreDatabaseId || '(default)'
);
export const firebaseAuth = getAuth(firebaseApp);

export enum OperationType {
  CREATE = 'create',
  UPDATE = 'update',
  DELETE = 'delete',
  LIST = 'list',
  GET = 'get',
  WRITE = 'write',
}

export function logFirestoreError(error: unknown, operationType: OperationType, path: string | null) {
  const errInfo = {
    error: error instanceof Error ? error.message : String(error),
    operationType,
    path,
    authUid: firebaseAuth.currentUser?.uid || null,
  };
  console.warn('Firestore notice:', JSON.stringify(errInfo));
}

/**
 * Elimina propiedades undefined antes de guardar en Firestore
 */
function stripUndefined<T extends Record<string, any>>(obj: T): Record<string, any> {
  const clean: Record<string, any> = {};
  for (const [k, v] of Object.entries(obj)) {
    if (v !== undefined) {
      clean[k] = v;
    }
  }
  return clean;
}

/**
 * Garantiza que los 4 perfiles familiares base (Papá, Mamá y los 2 Hijos) existan siempre en Firestore
 */
export async function ensureInitialContactsInCloud(): Promise<void> {
  try {
    const snap = await getDocs(collection(firestoreDb, 'contacts'));
    const existingIds = new Set(snap.docs.map((d) => d.id));
    const missingContacts = INITIAL_CONTACTS.filter((c) => !existingIds.has(c.id));

    if (missingContacts.length > 0) {
      const batch = writeBatch(firestoreDb);
      for (const contact of missingContacts) {
        const ref = doc(firestoreDb, 'contacts', contact.id);
        batch.set(ref, stripUndefined(contact), { merge: true });
      }
      await batch.commit();
    }
  } catch (err) {
    logFirestoreError(err, OperationType.WRITE, 'contacts');
  }
}

/**
 * Suscripción en TIEMPO REAL (WebSockets de Firestore) a la lista de familiares y su estado Online
 */
export function subscribeToCloudContacts(
  onUpdate: (contacts: Contact[]) => void,
  onError?: (err: unknown) => void
): () => void {
  const colRef = collection(firestoreDb, 'contacts');
  return onSnapshot(
    colRef,
    (snapshot) => {
      const now = Date.now();
      const cloudMap = new Map<string, Contact>();

      snapshot.docs.forEach((docSnap) => {
        const data = docSnap.data() as Contact;
        const id = data.id || docSnap.id;
        const ts = typeof data.lastActiveTimestamp === 'number' ? data.lastActiveTimestamp : undefined;
        // Considerar en línea si tuvo pulso activo en los últimos 45 segundos
        const isCurrentlyOnline = Boolean(data.isOnline && ts && now - ts < 45000);
        cloudMap.set(id, {
          ...data,
          id,
          isOnline: isCurrentlyOnline,
          lastActive: isCurrentlyOnline
            ? data.customStatus || 'En línea'
            : ts
            ? 'Desconectado'
            : 'Sin conexión registrada',
        });
      });

      // Garantizar que los 4 integrantes principales (Papá, Mamá, Christian y Cristopher) estén siempre presentes
      let missingAnyInitial = false;
      for (const baseContact of INITIAL_CONTACTS) {
        if (!cloudMap.has(baseContact.id)) {
          missingAnyInitial = true;
          cloudMap.set(baseContact.id, { ...baseContact });
        }
      }

      if (missingAnyInitial) {
        ensureInitialContactsInCloud().catch(() => {});
      }

      const loaded: Contact[] = Array.from(cloudMap.values());

      // Ordenar manteniendo a los 4 integrantes principales primero
      const orderIds = INITIAL_CONTACTS.map((c) => c.id);
      loaded.sort((a, b) => {
        const idxA = orderIds.indexOf(a.id);
        const idxB = orderIds.indexOf(b.id);
        if (idxA !== -1 && idxB !== -1) return idxA - idxB;
        if (idxA !== -1) return -1;
        if (idxB !== -1) return 1;
        return a.name.localeCompare(b.name);
      });

      onUpdate(loaded);
    },
    (err) => {
      logFirestoreError(err, OperationType.LIST, 'contacts');
      if (onError) onError(err);
    }
  );
}

/**
 * Suscripción en TIEMPO REAL (onSnapshot) a los mensajes de la nube con descifrado Web Crypto API automático
 * Filtra y entrega al instante tanto mensajes grupales ('family-group') como mensajes dirigidos
 * específicamente al ID único del familiar.
 */
export function subscribeToCloudMessages(
  onUpdate: (messages: Message[]) => void,
  onError?: (err: unknown) => void
): () => void {
  const colRef = collection(firestoreDb, 'messages');
  return onSnapshot(
    colRef,
    async (snapshot) => {
      const decryptedMessages: Message[] = await Promise.all(
        snapshot.docs.map(async (docSnap) => {
          const raw = docSnap.data() as Message;
          let resolvedText = raw.text || '';

          if (raw.isEncrypted && raw.encryptedPayload && raw.iv) {
            resolvedText = await decryptMessageText(
              raw.encryptedPayload,
              raw.iv,
              raw.text || ''
            );
          }

          return {
            ...raw,
            id: raw.id || docSnap.id,
            text: resolvedText,
          };
        })
      );

      decryptedMessages.sort((a, b) => {
        const tA = a.createdAtMs || new Date(a.timestamp).getTime() || 0;
        const tB = b.createdAtMs || new Date(b.timestamp).getTime() || 0;
        return tA - tB;
      });

      onUpdate(decryptedMessages);
    },
    (err) => {
      logFirestoreError(err, OperationType.LIST, 'messages');
      if (onError) onError(err);
    }
  );
}

/**
 * Suscripción en TIEMPO REAL a los indicadores de escritura ("Escribiendo...")
 */
export function subscribeToCloudTyping(
  onUpdate: (registry: Record<string, string>) => void
): () => void {
  const colRef = collection(firestoreDb, 'typing');
  return onSnapshot(
    colRef,
    (snapshot) => {
      const now = Date.now();
      const dict: Record<string, string> = {};
      snapshot.docs.forEach((d) => {
        const data = d.data();
        if (data.userId && data.roomId && typeof data.updatedAtMs === 'number') {
          if (now - data.updatedAtMs < 6500) {
            dict[data.userId] = data.roomId;
          }
        }
      });
      onUpdate(dict);
    },
    (err) => {
      logFirestoreError(err, OperationType.LIST, 'typing');
    }
  );
}

/**
 * Guarda y cifra un mensaje en tiempo real en Firestore dirigido a un familiar específico (por ID) o al grupo
 */
export async function sendCloudMessage(msg: Message): Promise<Message> {
  const createdAtMs = Date.now();
  const timestampStr =
    typeof msg.timestamp === 'string' ? msg.timestamp : msg.timestamp.toISOString();

  // Cifrar el texto con Web Crypto API (AES-GCM 256 bits)
  const encrypted = await encryptMessageText(msg.text || '');

  const cloudDoc: Message = {
    ...msg,
    timestamp: timestampStr,
    createdAtMs,
    status: 'delivered',
    encryptedPayload: encrypted.encryptedPayload,
    iv: encrypted.iv,
    isEncrypted: encrypted.isEncrypted,
  };

  await setDoc(doc(firestoreDb, 'messages', msg.id), stripUndefined(cloudDoc));
  return {
    ...cloudDoc,
    text: msg.text,
  };
}

/**
 * Marca como leídos ('read') los mensajes recibidos en una conversación activa
 */
export async function markCloudMessagesAsRead(
  activeUserId: string,
  roomId: string | 'family-group',
  allMessages: Message[]
): Promise<void> {
  try {
    const unreadToUpdate = allMessages.filter((m) => {
      if (m.senderId === activeUserId || m.status === 'read') return false;
      if (roomId === 'family-group') {
        return m.receiverId === 'family-group';
      }
      return m.senderId === roomId && m.receiverId === activeUserId;
    });

    if (unreadToUpdate.length === 0) return;

    const batch = writeBatch(firestoreDb);
    unreadToUpdate.forEach((m) => {
      batch.update(doc(firestoreDb, 'messages', m.id), { status: 'read' });
    });
    await batch.commit();
  } catch (err) {
    logFirestoreError(err, OperationType.UPDATE, 'messages/read');
  }
}

/**
 * Elimina un mensaje específico de Firestore
 */
export async function deleteCloudMessage(messageId: string): Promise<void> {
  await deleteDoc(doc(firestoreDb, 'messages', messageId));
}

/**
 * Vacía los mensajes de una conversación en Firestore
 */
export async function clearCloudChatMessages(
  channelId: string | 'family-group',
  currentUserId: string,
  allMessages: Message[]
): Promise<void> {
  const toDelete = allMessages.filter((m) => {
    if (channelId === 'family-group') {
      return m.receiverId === 'family-group';
    }
    return (
      (m.senderId === currentUserId && m.receiverId === channelId) ||
      (m.senderId === channelId && m.receiverId === currentUserId)
    );
  });

  if (toDelete.length === 0) return;
  const batch = writeBatch(firestoreDb);
  toDelete.forEach((m) => {
    batch.delete(doc(firestoreDb, 'messages', m.id));
  });
  await batch.commit();
}

/**
 * Alterna una reacción con emoji en un mensaje en Firestore
 */
export async function toggleCloudMessageReaction(
  messageId: string,
  reaction: string,
  currentReactions: string[] = []
): Promise<void> {
  const next = [...currentReactions];
  const idx = next.indexOf(reaction);
  if (idx !== -1) {
    next.splice(idx, 1);
  } else {
    next.push(reaction);
  }
  await updateDoc(doc(firestoreDb, 'messages', messageId), { reactions: next });
}

/**
 * Alterna el estado destacado (estrella) de un mensaje en Firestore
 */
export async function toggleCloudMessageStar(
  messageId: string,
  currentStarred: boolean
): Promise<void> {
  await updateDoc(doc(firestoreDb, 'messages', messageId), {
    isStarred: !currentStarred,
  });
}

/**
 * Registra o actualiza un integrante familiar en Firestore
 */
export async function saveCloudContact(contact: Contact): Promise<void> {
  await setDoc(doc(firestoreDb, 'contacts', contact.id), stripUndefined(contact), {
    merge: true,
  });
}

/**
 * Actualiza el pulso de presencia en línea del familiar activo en Firestore
 */
export async function updateCloudPresence(
  contact: Contact,
  isOnline: boolean,
  customStatus?: string
): Promise<void> {
  try {
    const now = Date.now();
    await setDoc(
      doc(firestoreDb, 'contacts', contact.id),
      stripUndefined({
        ...contact,
        isOnline,
        lastActiveTimestamp: now,
        lastActive: isOnline ? customStatus || 'En línea' : 'Desconectado',
        customStatus: customStatus || contact.customStatus || 'En línea',
      }),
      { merge: true }
    );
  } catch (err) {
    logFirestoreError(err, OperationType.UPDATE, `contacts/${contact.id}`);
  }
}

/**
 * Publica en tiempo real si un familiar está escribiendo en una sala
 */
export async function updateCloudTyping(
  userId: string,
  roomId: string,
  isTyping: boolean
): Promise<void> {
  try {
    await setDoc(doc(firestoreDb, 'typing', userId), {
      userId,
      roomId: isTyping ? roomId : '',
      updatedAtMs: isTyping ? Date.now() : 0,
    });
  } catch (err) {
    logFirestoreError(err, OperationType.WRITE, `typing/${userId}`);
  }
}
