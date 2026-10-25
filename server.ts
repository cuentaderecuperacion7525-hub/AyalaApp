import express from 'express';
import { createServer as createViteServer } from 'vite';
import path from 'path';
import fs from 'fs';
import webpush from 'web-push';

export type UserRole = 'admin' | 'member';

export interface Contact {
  id: string;
  name: string;
  avatarEmoji: string;
  avatarColor: string;
  relationship: string;
  role: UserRole;
  isOnline: boolean;
  lastActive: string;
  lastActiveTimestamp?: number;
  phone?: string;
}

export interface Message {
  id: string;
  senderId: string;
  senderName: string;
  receiverId: string;
  text: string;
  timestamp: Date | string;
  status: 'sent' | 'delivered' | 'read';
  reactions?: string[];
  messageType?: 'text' | 'image' | 'audio';
  mediaUrl?: string;
  isStarred?: boolean;
  replyToId?: string;
  replyToText?: string;
  replyToSenderName?: string;
}

const DB_FILE = path.resolve(process.cwd(), 'famichat_db.json');

const INITIAL_CONTACTS: Contact[] = [
  {
    id: 'papa-jose',
    name: 'Papá José Manuel',
    avatarEmoji: '👨🏽‍💼',
    avatarColor: 'bg-teal-600',
    relationship: 'Papá (Admin)',
    role: 'admin',
    isOnline: false,
    lastActive: 'Sin conexión registrada',
    lastActiveTimestamp: undefined,
    phone: '+56 9 1234 5678'
  },
  {
    id: 'mama-tila',
    name: 'Mamá Tila del Carmen',
    avatarEmoji: '👩🏽‍🦱',
    avatarColor: 'bg-rose-500',
    relationship: 'Mamá',
    role: 'member',
    isOnline: false,
    lastActive: 'Sin conexión registrada',
    lastActiveTimestamp: undefined,
    phone: '+56 9 8765 4321'
  },
  {
    id: 'hijo-christian',
    name: 'Christian Fernando',
    avatarEmoji: '🧑🏽‍💻',
    avatarColor: 'bg-sky-500',
    relationship: 'Hijo',
    role: 'member',
    isOnline: false,
    lastActive: 'Sin conexión registrada',
    lastActiveTimestamp: undefined,
    phone: '+56 9 5555 1212'
  },
  {
    id: 'hijo-cristopher',
    name: 'Cristopher',
    avatarEmoji: '🎮',
    avatarColor: 'bg-amber-500',
    relationship: 'Hijo',
    role: 'member',
    isOnline: false,
    lastActive: 'Sin conexión registrada',
    lastActiveTimestamp: undefined,
    phone: '+56 9 7777 3434'
  }
];

interface PushSubscriptionItem {
  userId: string;
  subscription: webpush.PushSubscription;
}

interface DBStructure {
  contacts: Contact[];
  messages: Message[];
  pushSubscriptions?: PushSubscriptionItem[];
  vapidKeys?: {
    publicKey: string;
    privateKey: string;
  };
}

function loadDB(): DBStructure {
  try {
    if (fs.existsSync(DB_FILE)) {
      const raw = fs.readFileSync(DB_FILE, 'utf-8');
      const parsed = JSON.parse(raw);

      if (!parsed.contacts || !Array.isArray(parsed.contacts) || parsed.contacts.length === 0) {
        parsed.contacts = INITIAL_CONTACTS.map(c => ({ ...c }));
      } else {
        const now = Date.now();
        parsed.contacts = parsed.contacts.map((c: Contact) => {
          // Clean up any corrupted future timestamps or hardcoded fake online states on boot
          const hasValidPastTimestamp =
            typeof c.lastActiveTimestamp === 'number' &&
            c.lastActiveTimestamp > 0 &&
            c.lastActiveTimestamp <= now + 60000;

          return {
            ...c,
            isOnline: false,
            lastActiveTimestamp: hasValidPastTimestamp ? c.lastActiveTimestamp : undefined,
            lastActive: hasValidPastTimestamp ? c.lastActive : 'Sin conexión registrada'
          };
        });
      }

      if (!Array.isArray(parsed.messages)) {
        parsed.messages = [];
      }
      if (!Array.isArray(parsed.pushSubscriptions)) {
        parsed.pushSubscriptions = [];
      }
      return parsed;
    }
  } catch (e) {
    console.error('Error loading DB file:', e);
  }

  const initial: DBStructure = {
    contacts: INITIAL_CONTACTS.map(c => ({ ...c })),
    messages: [],
    pushSubscriptions: []
  };
  try {
    fs.writeFileSync(DB_FILE, JSON.stringify(initial, null, 2), 'utf-8');
  } catch (e) {
    console.error('Failed to write initial DB:', e);
  }
  return initial;
}

const db: DBStructure = loadDB();

function saveDB() {
  try {
    fs.writeFileSync(DB_FILE, JSON.stringify(db, null, 2), 'utf-8');
  } catch (e) {
    console.error('Error saving DB file:', e);
  }
}

// Configure Web Push with automatic persistent VAPID keys
if (!db.vapidKeys || !db.vapidKeys.publicKey || !db.vapidKeys.privateKey) {
  const generatedKeys = webpush.generateVAPIDKeys();
  db.vapidKeys = {
    publicKey: generatedKeys.publicKey,
    privateKey: generatedKeys.privateKey
  };
  saveDB();
} else {
  saveDB();
}

webpush.setVapidDetails(
  'mailto:familia@famichat.app',
  db.vapidKeys.publicKey,
  db.vapidKeys.privateKey
);

// Helper to dispatch background Push notifications to family members
async function sendPushNotificationsForMessage(msg: Message) {
  if (!db.pushSubscriptions || db.pushSubscriptions.length === 0) return;

  const isGroup = msg.receiverId === 'family-group';
  const senderContact = db.contacts.find(c => c.id === msg.senderId);
  const emoji = senderContact?.avatarEmoji || '💬';

  const notificationTitle = isGroup
    ? `🏡 Familia Unida (${msg.senderName.split(' ')[0]})`
    : `${emoji} ${msg.senderName}`;

  let notificationBody = msg.text;
  if (msg.messageType === 'image') {
    notificationBody = '📷 Envió una foto compartida';
  } else if (msg.messageType === 'audio') {
    notificationBody = '🎙️ Envió una nota de voz familiar';
  }

  const targetRoomId = isGroup ? 'family-group' : msg.senderId;

  const payload = JSON.stringify({
    title: notificationTitle,
    body: notificationBody,
    icon: '/favicon.svg',
    badge: '/favicon.svg',
    tag: `famichat-${targetRoomId}`,
    url: `/?roomId=${targetRoomId}`,
    timestamp: Date.now()
  });

  const expiredEndpoints: string[] = [];

  const sendPromises = db.pushSubscriptions.map(async (item) => {
    if (item.userId === msg.senderId) return;
    if (!isGroup && item.userId !== msg.receiverId) return;

    try {
      await webpush.sendNotification(item.subscription, payload);
    } catch (err: any) {
      if (err.statusCode === 410 || err.statusCode === 404) {
        expiredEndpoints.push(item.subscription.endpoint);
      }
    }
  });

  await Promise.allSettled(sendPromises);

  if (expiredEndpoints.length > 0 && db.pushSubscriptions) {
    db.pushSubscriptions = db.pushSubscriptions.filter(
      s => !expiredEndpoints.includes(s.subscription.endpoint)
    );
    saveDB();
  }
}

// Track real active heartbeats per user ID (timestamp in ms)
const contactPings: Record<string, number> = {};
let lastSavedPingPersist = 0;

function recordUserActivity(userId?: string, forceSave = false) {
  if (!userId || typeof userId !== 'string') return;
  const now = Date.now();
  contactPings[userId] = now;

  const contact = db.contacts.find(c => c.id === userId);
  if (contact) {
    contact.lastActiveTimestamp = now;
    contact.isOnline = true;
    contact.lastActive = 'En línea';
    // Persist to disk immediately on important events or at least every 5 seconds during polling
    if (forceSave || now - lastSavedPingPersist > 5000) {
      lastSavedPingPersist = now;
      saveDB();
    }
  }
}

// Track active typing states: { [userId]: { roomId, timestamp } }
const typingStates: Record<string, { roomId: string; timestamp: number }> = {};

async function startServer() {
  const app = express();
  const PORT = 3000;

  // Enable CORS so the Native Android APK can communicate directly with the backend server
  app.use((req, res, next) => {
    res.header('Access-Control-Allow-Origin', '*');
    res.header('Access-Control-Allow-Methods', 'GET, POST, PUT, DELETE, OPTIONS');
    res.header('Access-Control-Allow-Headers', 'Origin, X-Requested-With, Content-Type, Accept, Authorization');
    if (req.method === 'OPTIONS') {
      return res.sendStatus(200);
    }
    next();
  });

  app.use(express.json({ limit: '50mb' }));
  app.use(express.urlencoded({ limit: '50mb', extended: true }));

  // 1. GET /api/contacts - Real presence & exact last connection timestamp
  app.get('/api/contacts', (req, res) => {
    const activeUser = req.query.activeUser as string | undefined;
    const now = Date.now();

    if (activeUser) {
      recordUserActivity(activeUser);
    }

    const updatedContacts = db.contacts.map(contact => {
      const lastSeen = contactPings[contact.id] || 0;
      // A user is online ONLY if their device sent a real heartbeat within the last 15 seconds
      const isNowOnline = lastSeen > 0 && (now - lastSeen) < 15000;

      const persistedTs =
        typeof contact.lastActiveTimestamp === 'number' &&
        contact.lastActiveTimestamp > 0 &&
        contact.lastActiveTimestamp <= now + 60000
          ? contact.lastActiveTimestamp
          : undefined;

      const exactTimestamp = lastSeen > 0 ? lastSeen : persistedTs;

      if (contact.isOnline !== isNowOnline || contact.lastActiveTimestamp !== exactTimestamp) {
        contact.isOnline = isNowOnline;
        contact.lastActiveTimestamp = exactTimestamp;
        contact.lastActive = isNowOnline
          ? 'En línea'
          : exactTimestamp
            ? contact.lastActive
            : 'Sin conexión registrada';
      }

      return {
        ...contact,
        isOnline: isNowOnline,
        lastActiveTimestamp: exactTimestamp,
        lastActive: isNowOnline
          ? 'En línea'
          : exactTimestamp
            ? 'Desconectado'
            : 'Sin conexión registrada'
      };
    });

    res.json(updatedContacts);
  });

  // 1b. POST /api/presence-offline - Immediately marks a user offline with exact disconnection timestamp
  app.post('/api/presence-offline', (req, res) => {
    const { userId } = req.body;
    if (userId && typeof userId === 'string') {
      const now = Date.now();
      delete contactPings[userId];
      delete typingStates[userId];

      const contact = db.contacts.find(c => c.id === userId);
      if (contact) {
        contact.isOnline = false;
        contact.lastActiveTimestamp = now;
        contact.lastActive = 'Desconectado';
        saveDB();
      }
    }
    res.json({ success: true });
  });

  // 2. GET /api/typing - Returns active typing users within last 4 seconds
  app.get('/api/typing', (req, res) => {
    const now = Date.now();
    const activeTypers: Record<string, string> = {};
    Object.keys(typingStates).forEach(uid => {
      if (now - typingStates[uid].timestamp < 4000) {
        activeTypers[uid] = typingStates[uid].roomId;
      } else {
        delete typingStates[uid];
      }
    });
    res.json(activeTypers);
  });

  // 3. POST /api/typing - Sets typing status for a user in a specific room
  app.post('/api/typing', (req, res) => {
    const { userId, roomId, isTyping } = req.body;
    if (userId) {
      recordUserActivity(userId);
      if (isTyping && roomId) {
        typingStates[userId] = { roomId, timestamp: Date.now() };
      } else {
        delete typingStates[userId];
      }
    }
    res.json({ success: true });
  });

  // 4. GET /api/messages - Returns all persisted messages and updates real delivery/read statuses
  app.get('/api/messages', (req, res) => {
    const activeUser = req.query.activeUser as string | undefined;
    const activeRoom = req.query.activeRoom as string | undefined;

    if (activeUser) {
      recordUserActivity(activeUser);

      let statusChanged = false;
      db.messages.forEach(msg => {
        // Only update status for messages sent by OTHER users to activeUser (or to family-group)
        if (msg.senderId === activeUser) return;

        const isForActiveUser =
          msg.receiverId === activeUser || msg.receiverId === 'family-group';

        if (!isForActiveUser) return;

        // Determine if activeUser currently has this conversation open on screen
        const isViewingThisRoom =
          (msg.receiverId === 'family-group' && activeRoom === 'family-group') ||
          (msg.receiverId === activeUser && activeRoom === msg.senderId);

        if (isViewingThisRoom && msg.status !== 'read') {
          msg.status = 'read';
          statusChanged = true;
        } else if (!isViewingThisRoom && msg.status === 'sent') {
          msg.status = 'delivered';
          statusChanged = true;
        }
      });

      if (statusChanged) {
        saveDB();
      }
    }

    res.json(db.messages);
  });

  // 4b. POST /api/messages/read - Marks messages in a room as read when recipient opens the chat
  app.post('/api/messages/read', (req, res) => {
    const { userId, roomId } = req.body;
    if (!userId || !roomId) {
      return res.status(400).json({ error: 'Missing userId or roomId' });
    }

    recordUserActivity(userId);
    let changed = false;

    db.messages.forEach(msg => {
      if (msg.senderId === userId) return;
      const inRoom =
        roomId === 'family-group'
          ? msg.receiverId === 'family-group'
          : msg.senderId === roomId && msg.receiverId === userId;

      if (inRoom && msg.status !== 'read') {
        msg.status = 'read';
        changed = true;
      }
    });

    if (changed) {
      saveDB();
    }

    res.json({ success: true, updated: changed });
  });

  // 5. POST /api/messages - Appends a real message to persistent DB (with idempotency deduplication)
  app.post('/api/messages', (req, res) => {
    const {
      id,
      senderId,
      senderName,
      receiverId,
      text,
      activeUser,
      messageType,
      mediaUrl,
      replyToId,
      replyToText,
      replyToSenderName
    } = req.body;

    if (!senderId || !receiverId || (!text && !mediaUrl)) {
      return res.status(400).json({ error: 'Missing message fields' });
    }

    recordUserActivity(activeUser || senderId, true);
    delete typingStates[senderId];

    // Idempotency check: if message with this ID was already saved, return it without duplicating
    if (id) {
      const existing = db.messages.find(m => m.id === id);
      if (existing) {
        return res.status(200).json(existing);
      }
    }

    // Check if recipient is currently online right now to set initial status ('sent' vs 'delivered')
    const now = Date.now();
    let initialStatus: 'sent' | 'delivered' = 'sent';
    if (receiverId === 'family-group') {
      const anyOtherMemberOnline = db.contacts.some(
        c => c.id !== senderId && contactPings[c.id] && (now - contactPings[c.id]) < 15000
      );
      if (anyOtherMemberOnline) {
        initialStatus = 'delivered';
      }
    } else {
      const recipientLastSeen = contactPings[receiverId] || 0;
      if (recipientLastSeen > 0 && (now - recipientLastSeen) < 15000) {
        initialStatus = 'delivered';
      }
    }

    const newMessage: Message = {
      id: id || 'msg-' + Date.now() + '-' + Math.random().toString(36).substring(2, 7),
      senderId,
      senderName,
      receiverId,
      text: text || '',
      timestamp: new Date().toISOString(),
      status: initialStatus,
      messageType: messageType || 'text',
      mediaUrl: mediaUrl || undefined,
      replyToId: replyToId || undefined,
      replyToText: replyToText || undefined,
      replyToSenderName: replyToSenderName || undefined
    };

    db.messages.push(newMessage);
    saveDB();

    sendPushNotificationsForMessage(newMessage).catch(err => {
      console.error('Error dispatching push notifications:', err);
    });

    res.status(201).json(newMessage);
  });

  // 6. POST /api/contacts - Admin only: Adds a new family member
  app.post('/api/contacts', (req, res) => {
    const { contact, activeUser } = req.body;
    if (!contact || !contact.id || !contact.name) {
      return res.status(400).json({ error: 'Invalid contact data' });
    }

    if (activeUser) {
      recordUserActivity(activeUser, true);
    }

    const newContact: Contact = {
      ...contact,
      role: 'member',
      isOnline: false,
      lastActiveTimestamp: undefined,
      lastActive: 'Sin conexión registrada'
    };

    db.contacts.push(newContact);
    saveDB();

    res.status(201).json({ contact: newContact, contacts: db.contacts });
  });

  // 7. DELETE /api/messages - Clears message history for a specific chat channel
  app.delete('/api/messages', (req, res) => {
    const { channelId, userId } = req.body;

    if (!channelId) {
      return res.status(400).json({ error: 'Missing channelId to clear' });
    }

    if (channelId === 'family-group') {
      db.messages = db.messages.filter(m => m.receiverId !== 'family-group');
    } else {
      db.messages = db.messages.filter(m => {
        const isBetweenUsers =
          (m.senderId === userId && m.receiverId === channelId) ||
          (m.senderId === channelId && m.receiverId === userId);
        return !isBetweenUsers;
      });
    }

    saveDB();
    res.json({ success: true, remainingCount: db.messages.length });
  });

  // 8. DELETE /api/messages/:id - Deletes a single specific message by ID
  app.delete('/api/messages/:id', (req, res) => {
    const { id } = req.params;
    if (!id) {
      return res.status(400).json({ error: 'Missing message ID' });
    }

    const initialLength = db.messages.length;
    db.messages = db.messages.filter(m => m.id !== id);

    if (db.messages.length < initialLength) {
      saveDB();
    }

    res.json({ success: true, removedId: id });
  });

  // 9. POST /api/messages/:id/react - Adds or toggles an emoji reaction on a message
  app.post('/api/messages/:id/react', (req, res) => {
    const { id } = req.params;
    const { reaction } = req.body;

    if (!id || !reaction) {
      return res.status(400).json({ error: 'Missing message ID or reaction emoji' });
    }

    const msg = db.messages.find(m => m.id === id);
    if (!msg) {
      return res.status(404).json({ error: 'Message not found' });
    }

    if (!msg.reactions) {
      msg.reactions = [];
    }

    const existingIndex = msg.reactions.indexOf(reaction);
    if (existingIndex !== -1) {
      msg.reactions.splice(existingIndex, 1);
    } else {
      msg.reactions.push(reaction);
    }

    saveDB();
    res.json({ success: true, message: msg });
  });

  // 10. POST /api/messages/:id/star - Toggles starred state on a message
  app.post('/api/messages/:id/star', (req, res) => {
    const { id } = req.params;
    if (!id) {
      return res.status(400).json({ error: 'Missing message ID' });
    }

    const msg = db.messages.find(m => m.id === id);
    if (!msg) {
      return res.status(404).json({ error: 'Message not found' });
    }

    msg.isStarred = !msg.isStarred;
    saveDB();
    res.json({ success: true, message: msg });
  });

  // 11. Web Push Notification Endpoints
  app.get('/api/push-public-key', (req, res) => {
    res.json({ publicKey: db.vapidKeys?.publicKey || '' });
  });

  app.post('/api/push-subscribe', (req, res) => {
    const { userId, subscription } = req.body;
    if (!userId || !subscription || !subscription.endpoint) {
      return res.status(400).json({ error: 'Invalid push subscription payload' });
    }

    if (!db.pushSubscriptions) {
      db.pushSubscriptions = [];
    }

    const existingIdx = db.pushSubscriptions.findIndex(
      s => s.subscription.endpoint === subscription.endpoint
    );

    if (existingIdx !== -1) {
      db.pushSubscriptions[existingIdx].userId = userId;
      db.pushSubscriptions[existingIdx].subscription = subscription;
    } else {
      db.pushSubscriptions.push({ userId, subscription });
    }

    saveDB();
    res.status(201).json({ success: true });
  });

  app.post('/api/push-unsubscribe', (req, res) => {
    const { endpoint } = req.body;
    if (endpoint && db.pushSubscriptions) {
      db.pushSubscriptions = db.pushSubscriptions.filter(
        s => s.subscription.endpoint !== endpoint
      );
      saveDB();
    }
    res.json({ success: true });
  });

  // Vite middleware for development
  if (process.env.NODE_ENV !== 'production') {
    const vite = await createViteServer({
      server: { middlewareMode: true },
      appType: 'spa',
    });
    app.use(vite.middlewares);
  } else {
    const distPath = path.join(process.cwd(), 'dist');
    app.use(express.static(distPath));
    app.get('*', (req, res) => {
      res.sendFile(path.join(distPath, 'index.html'));
    });
  }

  app.listen(PORT, '0.0.0.0', () => {
    console.log(`FamiChat Real-Time Server running on http://localhost:${PORT}`);
  });
}

startServer();
