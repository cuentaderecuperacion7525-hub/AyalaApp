import express from "express";
import path from "path";
import fs from "fs";
import { createServer as createViteServer } from "vite";
import type { Contact, Message } from "./src/types.ts";
import webPush from "web-push";

// Setup storage and fallback in /tmp for persistence on Cloud Run bounds
const DB_FILE = path.join(process.cwd(), "famichat_db.json");

const INITIAL_CONTACTS: Contact[] = [
  {
    id: 'papa-jose',
    name: 'Papá José Manuel',
    avatarEmoji: '👨🏽‍💼',
    avatarColor: 'bg-teal-600',
    relationship: 'Papá (Admin)',
    role: 'admin',
    isOnline: true,
    lastActive: 'En línea',
    lastActiveTimestamp: Date.now(),
    phone: '+56 9 1234 5678'
  },
  {
    id: 'mama-tila',
    name: 'Mamá Tila del Carmen',
    avatarEmoji: '👩🏽‍🦱',
    avatarColor: 'bg-rose-500',
    relationship: 'Mamá',
    role: 'member',
    isOnline: true,
    lastActive: 'En línea',
    lastActiveTimestamp: Date.now(),
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
    lastActive: 'Últ. vez hoy a las 18:15',
    lastActiveTimestamp: Date.now() - 40 * 60 * 1000, // 40 minutes ago
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
    lastActive: 'Últ. vez hoy a las 17:40',
    lastActiveTimestamp: Date.now() - 150 * 60 * 1000, // 2.5 hours ago
    phone: '+56 9 7777 3434'
  }
];

const getBaselineMessages = (): Message[] => {
  const dateOffset = (minsAgo: number) => {
    const d = new Date();
    d.setMinutes(d.getMinutes() - minsAgo);
    return d.toISOString();
  };

  return [
    {
      id: 'g1',
      senderId: 'mama-tila',
      senderName: 'Mamá Tila del Carmen',
      receiverId: 'family-group',
      text: '¡Hola familia hermosa! ¿Cómo va su día? ❤️',
      timestamp: dateOffset(60),
      status: 'read'
    },
    {
      id: 'g2',
      senderId: 'hijo-christian',
      senderName: 'Christian Fernando',
      receiverId: 'family-group',
      text: 'Todo bien mamá, saliendo de una clase. ¡Qué tal ustedes!',
      timestamp: dateOffset(55),
      status: 'read'
    },
    {
      id: 'g3',
      senderId: 'hijo-cristopher',
      senderName: 'Cristopher',
      receiverId: 'family-group',
      text: 'Holaaa, yo acabo de terminar mis tareas, ¿ya van a almorzar? 😋',
      timestamp: dateOffset(50),
      status: 'read'
    },
    {
      id: 'g4',
      senderId: 'papa-jose',
      senderName: 'Papá José Manuel',
      receiverId: 'family-group',
      text: 'Hola a todos. Acabo de salir de una reunión. Tila, al rato te marco para ver lo de la comida. Abrazo a mis muchachos.',
      timestamp: dateOffset(45),
      status: 'read'
    },
    {
      id: 'g5',
      senderId: 'mama-tila',
      senderName: 'Mamá Tila del Carmen',
      receiverId: 'family-group',
      text: 'Sii José, preparé cazuelita rica. Los espero a los tres en casa. 🍲',
      timestamp: dateOffset(40),
      status: 'read'
    }
  ];
};

// Global Store State loaded from file or defaults
interface DBStore {
  contacts: Contact[];
  messages: Message[];
  vapidKeys?: {
    publicKey: string;
    privateKey: string;
  };
  pushSubscriptions?: Array<{
    userId: string;
    subscription: any;
  }>;
}

let db: DBStore = {
  contacts: INITIAL_CONTACTS,
  messages: getBaselineMessages(),
  pushSubscriptions: []
};

// IO Save / Load helpers with error bounds
function loadDB() {
  try {
    if (fs.existsSync(DB_FILE)) {
      const parsed = JSON.parse(fs.readFileSync(DB_FILE, "utf-8"));
      if (parsed.contacts && parsed.messages) {
        db = parsed;
      }
    }
  } catch (e) {
    console.error("Failed to read server local filesystem DB, using in-memory state:", e);
  }
}

function saveDB() {
  try {
    fs.writeFileSync(DB_FILE, JSON.stringify(db, null, 2), "utf-8");
  } catch (e) {
    console.error("Failed to write to file database:", e);
  }
}

loadDB();

// Ensure pushSubscriptions array exists
if (!db.pushSubscriptions) {
  db.pushSubscriptions = [];
}

// Generate stable VAPID keys and persist if missing
if (!db.vapidKeys) {
  db.vapidKeys = webPush.generateVAPIDKeys();
  saveDB();
}

// Configure web-push details
webPush.setVapidDetails(
  "mailto:josemanuel5121@gmail.com",
  db.vapidKeys.publicKey,
  db.vapidKeys.privateKey
);

function sendPushNotification(targetUserId: string, payload: { title: string; body: string; url?: string; tag?: string }) {
  if (!db.pushSubscriptions) return;

  const userSubs = db.pushSubscriptions.filter(sub => sub.userId === targetUserId);
  if (userSubs.length === 0) return;

  const payloadString = JSON.stringify(payload);

  userSubs.forEach(userSub => {
    webPush.sendNotification(userSub.subscription, payloadString)
      .catch((err: any) => {
        console.error(`Error sending push notification to user ${targetUserId}:`, err);
        // If subscription is expired or no longer active (410 Gone / 404), remove it
        if (err.statusCode === 410 || err.statusCode === 404) {
          db.pushSubscriptions = db.pushSubscriptions?.filter(sub => sub.subscription.endpoint !== userSub.subscription.endpoint);
          saveDB();
        }
      });
  });
}

// Active users ping system to track real-time connection status
const contactPings: Record<string, number> = {};
const typingStates: Record<string, { roomId: string; timestamp: number }> = {};

async function startServer() {
  const app = express();
  const PORT = 3000;

  // Serve critical PWA assets with explicit headers to bypass SPA handlers and ensure Chrome validation
  const setPwaHeaders = (req: any, res: any) => {
    const origin = req.headers.origin;
    if (origin) {
      res.setHeader("Access-Control-Allow-Origin", origin);
      res.setHeader("Access-Control-Allow-Credentials", "true");
    } else {
      res.setHeader("Access-Control-Allow-Origin", "*");
    }
  };

  app.get("/manifest.json", (req, res) => {
    res.setHeader("Content-Type", "application/json; charset=utf-8");
    setPwaHeaders(req, res);
    res.sendFile(path.join(process.cwd(), "public", "manifest.json"));
  });

  app.get("/sw.js", (req, res) => {
    res.setHeader("Content-Type", "application/javascript; charset=utf-8");
    setPwaHeaders(req, res);
    res.sendFile(path.join(process.cwd(), "public", "sw.js"));
  });

  app.get("/logo-famichat.png", (req, res) => {
    res.setHeader("Content-Type", "image/png");
    setPwaHeaders(req, res);
    res.sendFile(path.join(process.cwd(), "public", "logo-famichat.png"));
  });

  // Set higher payload size limits so families can share real audios and images safely in base64 format
  app.use(express.json({ limit: "40mb" }));
  app.use(express.urlencoded({ limit: "40mb", extended: true }));

  // Helper middleware to mark presence
  app.use((req, res, next) => {
    const activeUserId = req.query.activeUser || req.body.activeUser;
    if (activeUserId && typeof activeUserId === 'string') {
      contactPings[activeUserId] = Date.now();
    }
    next();
  });

  // 1. Get contacts with dynamic online presence state calculated relative to real API polling
  app.get("/api/contacts", (req, res) => {
    const activeUserId = req.query.activeUser as string;
    if (activeUserId) {
      contactPings[activeUserId] = Date.now();
    }

    const now = Date.now();
    const updatedContacts = db.contacts.map(contact => {
      // If the contact parsed is the active current caller, consider them online
      const lastSeen = contactPings[contact.id] || 0;
      const isOnline = (now - lastSeen) < 10000; // Connected in the last 10 seconds
      
      let lastActiveString = contact.lastActive;
      const lastActiveTimestamp = isOnline 
        ? now 
        : (lastSeen > 0 ? lastSeen : (contact.lastActiveTimestamp || (now - 120 * 60 * 1000)));

      if (isOnline) {
        lastActiveString = "En línea";
      } else if (lastSeen > 0) {
        const timeStr = new Date(lastSeen).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' });
        lastActiveString = `Últ. vez hoy a las ${timeStr}`;
      }

      return {
        ...contact,
        isOnline: isOnline || contact.id === activeUserId, // local user is always online for themselves
        lastActive: lastActiveString,
        lastActiveTimestamp
      };
    });

    res.json(updatedContacts);
  });

  // 2. Create new family member (restricted to Papá José admin in UI, also validated here)
  app.post("/api/contacts", (req, res) => {
    const { contact, activeUser } = req.body;
    if (!contact || !contact.name || !contact.relationship) {
      res.status(400).json({ error: "Datos del familiar incompletos" });
      return;
    }

    // Double-check if the sender is authorized
    if (activeUser !== 'papa-jose') {
      res.status(403).json({ error: "Solo el administrador (Papá) puede agregar nuevos familiares" });
      return;
    }

    db.contacts.push({
      id: contact.id || `member-${Date.now()}`,
      name: contact.name,
      avatarEmoji: contact.avatarEmoji || '🧑🏽',
      avatarColor: contact.avatarColor || 'bg-slate-500',
      relationship: contact.relationship,
      role: 'member',
      isOnline: false,
      lastActive: "Agregado recientemente",
      lastActiveTimestamp: Date.now()
    });

    saveDB();
    res.json({ success: true, contacts: db.contacts });
  });

  // 3. Get all messages
  app.get("/api/messages", (req, res) => {
    res.json(db.messages);
  });

  // Helper to dynamically simulate warm family replies with realistic typing state
  function simulateReply(senderId: string, receiverId: string) {
    // Determine who will reply
    let replierId: string = "";
    let targetRoomId: string = "";

    if (receiverId === 'family-group') {
      // 45% chance to trigger a reply in group chats to keep it realistic without spam
      if (Math.random() > 0.45) return;

      // Choose a random contact who is not the sender
      const eligible = db.contacts.filter(c => c.id !== senderId);
      if (eligible.length === 0) return;
      const randomContact = eligible[Math.floor(Math.random() * eligible.length)];
      replierId = randomContact.id;
      targetRoomId = 'family-group';
    } else {
      replierId = receiverId;
      targetRoomId = senderId; // Direct message back to sender
    }

    const replier = db.contacts.find(c => c.id === replierId);
    if (!replier) return;

    // Set of cute, warm, contextual family quotes
    let text = "";
    if (replierId === 'mama-tila') {
      const choices = [
        "¡Hola mi amor de mi vida! Qué lindo leerte por aquí. ¿Cómo va tu día? Ya estoy cocinando algo rico para cuando nos juntemos. Te mando un beso gigante y bendiciones hijo/a 😘❤️🍲",
        "Qué bueno saber de ti. Dios me lo bendiga y cuide de todo peligro. Cuéntame si vas a venir a almorzar más tarde 🙏💖",
        "¡Qué alegría este mensaje! ¿Cómo va todo? No olvides abrigarte si sales, que hay un poco de frío. ¡Te quiero de aquí al cielo! 🥰✨"
      ];
      text = choices[Math.floor(Math.random() * choices.length)];
    } else if (replierId === 'hijo-christian') {
      const choices = [
        "¡Epa! Qué tal todo? Súper bien por acá, saliendo de una clase y revisando unas cosas de la carrera. ¿Hablamos en un rato más? 🤙🏼💻",
        "Holaaa! Voy terminando un proyecto. Al rato los llamo para ponernos al día. ¡Que tengan un excelente día! ⚡",
        "¡Qué buena onda leerte! Acá ando descansando un ratito. Espero que todo marche de maravilla hoy."
      ];
      text = choices[Math.floor(Math.random() * choices.length)];
    } else if (replierId === 'hijo-cristopher') {
      const choices = [
        "¡Buenas buenas! Todo de diez por acá, jugando un ratito y haciendo mis tareas antes del almuerzo 🎮✌️",
        "Hola! Me alegra mucho saber de ti. ¿Qué cuentas de nuevo el día de hoy? jaja",
        "¡Hola! Ya estoy listo para comer la cazuela deliciosa de mamá jaja, ¡un gran abrazo para todos! 🍲🏡"
      ];
      text = choices[Math.floor(Math.random() * choices.length)];
    } else if (replierId === 'papa-jose') {
      const choices = [
        "Hola a todos. Por aquí todo bien en el trabajo, terminando unas gestiones. Cuídense mucho en el camino.",
        "Qué alegría ver que están comunicados. Que tengan una excelente jornada, nos vemos más tarde en casa. Abrazo grande.",
        "Hola, todo excelente de este lado. Al rato me conecto idealmente para ver qué plan tenemos hoy, bendiciones."
      ];
      text = choices[Math.floor(Math.random() * choices.length)];
    } else {
      text = `¡Hola! Qué gusto leerte. Te mando un gran saludo y un fuerte abrazo familiar. 😊🏡`;
    }

    // --- Step 1: Deliberately turn them online and typing after 1 second ---
    setTimeout(() => {
      contactPings[replierId] = Date.now() + 15000; // Force online state
      typingStates[replierId] = { roomId: targetRoomId, timestamp: Date.now() };
    }, 1000);

    // --- Step 2: Clear typing after 4.5 seconds and push the reply ---
    setTimeout(() => {
      delete typingStates[replierId];
      contactPings[replierId] = Date.now();

      const replyMsg: Message = {
        id: 'msg-' + Date.now(),
        senderId: replierId,
        senderName: replier.name,
        receiverId: targetRoomId,
        text: text,
        timestamp: new Date().toISOString(),
        status: 'read',
        messageType: 'text'
      };

      db.messages.push(replyMsg);
      saveDB();
      
      // Send standard service Web Push notification if they have subscriptions
      if (targetRoomId === 'family-group') {
        db.contacts.forEach(contact => {
          if (contact.id !== replierId) {
            sendPushNotification(contact.id, {
              title: `FamiChat 🏡 ${replier.name}`,
              body: text,
              url: `/?roomId=family-group`,
              tag: 'family-group'
            });
          }
        });
      } else {
        sendPushNotification(targetRoomId, {
          title: `FamiChat ✉️ de ${replier.name}`,
          body: text,
          url: `/?roomId=${replierId}`,
          tag: `dm-${replierId}`
        });
      }
    }, 4500);
  }

  // 4. Send a new message
  app.post("/api/messages", (req, res) => {
    const { id, senderId, senderName, receiverId, text, messageType, mediaUrl, replyToId, replyToText, replyToSenderName } = req.body;
    if (!senderId || !receiverId) {
      res.status(400).json({ error: "Remitente o destinatario ausentes" });
      return;
    }

    const newMessage: Message = {
      id: id || `msg-${Date.now()}`,
      senderId,
      senderName,
      receiverId,
      text: text || "",
      timestamp: new Date().toISOString(),
      status: 'sent',
      messageType: messageType || 'text',
      mediaUrl: mediaUrl || undefined,
      replyToId: replyToId || undefined,
      replyToText: replyToText || undefined,
      replyToSenderName: replyToSenderName || undefined
    };

    db.messages.push(newMessage);
    saveDB();

    simulateReply(senderId, receiverId);

    // Dispatch Web Push Notifications to relevant family members
    if (receiverId === 'family-group') {
      // Notify all other family members
      db.contacts.forEach(contact => {
        if (contact.id !== senderId) {
          sendPushNotification(contact.id, {
            title: `FamiChat 🏡 ${senderName}`,
            body: messageType === 'image' 
              ? '📷 Foto de familia' 
              : messageType === 'audio' 
                ? '🎤 Nota de voz familiar' 
                : text || '',
            url: `/?roomId=family-group`,
            tag: 'family-group'
          });
        }
      });
    } else {
      // Direct message - notify only the recipient
      sendPushNotification(receiverId, {
        title: `FamiChat ✉️ de ${senderName}`,
        body: messageType === 'image' 
          ? '📷 Foto familiar privada' 
          : messageType === 'audio' 
            ? '🎤 Nota de voz privada' 
            : text || '',
        url: `/?roomId=${senderId}`,
        tag: `dm-${senderId}`
      });
    }

    // Async simulated progression for real-time visual receipts
    setTimeout(() => {
      const idx = db.messages.findIndex(m => m.id === newMessage.id);
      if (idx !== -1 && db.messages[idx].status === 'sent') {
        db.messages[idx].status = 'delivered';
        saveDB();
      }
    }, 1200);

    setTimeout(() => {
      const idx = db.messages.findIndex(m => m.id === newMessage.id);
      if (idx !== -1 && db.messages[idx].status === 'delivered') {
        db.messages[idx].status = 'read';
        saveDB();
      }
    }, 3200);

    res.json(newMessage);
  });

  // 5. Clear entire chat conversation room (Borrar conversaciones)
  app.delete("/api/messages", (req, res) => {
    const { channelId, userId } = req.body;
    if (!channelId || !userId) {
       res.status(400).json({ error: "Faltan parámetros para borrar conversación" });
       return;
    }

    if (channelId === 'family-group') {
      db.messages = db.messages.filter(m => m.receiverId !== 'family-group');
    } else {
      // Exclude mutual PM exchange
      db.messages = db.messages.filter(m => {
        const isBetweenThem = (m.senderId === userId && m.receiverId === channelId) ||
                              (m.senderId === channelId && m.receiverId === userId);
        return !isBetweenThem;
      });
    }

    saveDB();
    res.json({ success: true });
  });

  // 6. Delete singular message
  app.delete("/api/messages/:id", (req, res) => {
    const messageId = req.params.id;
    db.messages = db.messages.filter(m => m.id !== messageId);
    saveDB();
    res.json({ success: true });
  });

  // 6.5. React to a message with an emoji
  app.post("/api/messages/:id/react", (req, res) => {
    const messageId = req.params.id;
    const { reaction } = req.body;
    if (!reaction) {
      res.status(400).json({ error: "Falta el emoji de reacción" });
      return;
    }

    const msg = db.messages.find(m => m.id === messageId);
    if (msg) {
      if (!msg.reactions) {
        msg.reactions = [];
      }
      
      // Toggle reaction: if exists, remove it. Otherwise add it.
      const index = msg.reactions.indexOf(reaction);
      if (index !== -1) {
        msg.reactions.splice(index, 1);
      } else {
        msg.reactions.push(reaction);
      }
      
      saveDB();
      res.json({ success: true, reactions: msg.reactions });
    } else {
      res.status(404).json({ error: "Mensaje no encontrado" });
    }
  });

  // 6.7. Toggle star on a message
  app.post("/api/messages/:id/star", (req, res) => {
    const messageId = req.params.id;
    const msg = db.messages.find(m => m.id === messageId);
    if (msg) {
      msg.isStarred = !msg.isStarred;
      saveDB();
      res.json({ success: true, isStarred: msg.isStarred });
    } else {
      res.status(404).json({ error: "Mensaje no encontrado" });
    }
  });

  // 7. Get typing states
  app.get("/api/typing", (req, res) => {
    const now = Date.now();
    const activeTyping: Record<string, string> = {}; // userId -> roomId
    
    Object.entries(typingStates).forEach(([userId, payload]) => {
      if ((now - payload.timestamp) < 4000) { // Active if updated in last 4 seconds
        activeTyping[userId] = payload.roomId;
      }
    });

    res.json(activeTyping);
  });

  // 8. Register writing/typing state
  app.post("/api/typing", (req, res) => {
    const { userId, roomId, isTyping } = req.body;
    if (userId) {
      if (isTyping) {
        typingStates[userId] = { roomId, timestamp: Date.now() };
      } else {
        delete typingStates[userId];
      }
    }
    res.json({ success: true });
  });

  // 8.5. Interactive presence simulator endpoint
  app.post("/api/presence-simulation", (req, res) => {
    const { contactId, state, activeUserId, text } = req.body;
    if (!contactId || !state) {
      res.status(400).json({ error: "Parámetros incompletos" });
      return;
    }

    const now = Date.now();
    const contact = db.contacts.find(c => c.id === contactId);
    if (!contact) {
      res.status(404).json({ error: "Contacto no encontrado" });
      return;
    }

    if (state === 'online') {
      // Set future ping so it stays online indefinitely
      contactPings[contactId] = now + 1000 * 60 * 60 * 24;
      delete typingStates[contactId];
    } else if (state === 'offline') {
      // Set to 1 hour ago so it displays correctly as offline
      contactPings[contactId] = now - 60 * 60 * 1000;
      delete typingStates[contactId];
    } else if (state === 'typing_group') {
      // Set online and typing in group chat
      contactPings[contactId] = now + 1000 * 60 * 60 * 24;
      typingStates[contactId] = { roomId: 'family-group', timestamp: now + 1000 * 60 * 60 * 24 };
    } else if (state === 'typing_private') {
      // Set online and typing in direct message to current user
      const targetRoom = activeUserId || 'papa-jose';
      contactPings[contactId] = now + 1000 * 60 * 60 * 24;
      typingStates[contactId] = { roomId: targetRoom, timestamp: now + 1000 * 60 * 60 * 24 };
    } else if (state === 'trigger_message') {
      // Simulate real incoming message instantly
      const msgText = text || "¡Hola familia! 👋😊";
      
      // Stop typing
      delete typingStates[contactId];
      contactPings[contactId] = now;

      const randomMsgId = 'msg-' + now;
      const targetRoomId = activeUserId || 'family-group';

      const simulatedMsg: Message = {
        id: randomMsgId,
        senderId: contactId,
        senderName: contact.name,
        receiverId: targetRoomId,
        text: msgText,
        timestamp: new Date().toISOString(),
        status: 'read',
        messageType: 'text'
      };

      db.messages.push(simulatedMsg);
      saveDB();

      // Trigger standard browser push
      if (targetRoomId === 'family-group') {
        db.contacts.forEach(c => {
          if (c.id !== contactId) {
            sendPushNotification(c.id, {
              title: `FamiChat 🏡 ${contact.name}`,
              body: msgText,
              url: `/?roomId=family-group`,
              tag: 'family-group'
            });
          }
        });
      } else {
        sendPushNotification(targetRoomId, {
          title: `FamiChat ✉️ de ${contact.name}`,
          body: msgText,
          url: `/?roomId=${contactId}`,
          tag: `dm-${contactId}`
        });
      }
    }

    res.json({ success: true });
  });

  // 9. Web Push Subscription routes
  app.get("/api/push-public-key", (req, res) => {
    if (db.vapidKeys) {
      res.json({ publicKey: db.vapidKeys.publicKey });
    } else {
      res.status(500).json({ error: "No se han generado llaves VAPID" });
    }
  });

  app.post("/api/push-subscribe", (req, res) => {
    const { userId, subscription } = req.body;
    if (!userId || !subscription) {
      res.status(400).json({ error: "Faltan parámetros de suscripción" });
      return;
    }

    if (!db.pushSubscriptions) {
      db.pushSubscriptions = [];
    }

    // Guard against duplicates
    const idx = db.pushSubscriptions.findIndex(s => s.subscription.endpoint === subscription.endpoint);
    if (idx !== -1) {
      db.pushSubscriptions[idx].userId = userId;
    } else {
      db.pushSubscriptions.push({ userId, subscription });
    }

    saveDB();
    res.json({ success: true });
  });

  app.post("/api/push-unsubscribe", (req, res) => {
    const { userId, endpoint } = req.body;
    if (db.pushSubscriptions) {
      db.pushSubscriptions = db.pushSubscriptions.filter(
        s => !(s.userId === userId && s.subscription.endpoint === endpoint)
      );
      saveDB();
    }
    res.json({ success: true });
  });

  // Mount Vite development middleware or serve bundle assets for Cloud Run ingress stability
  const distExists = fs.existsSync(path.join(process.cwd(), 'dist', 'index.html'));
  const isDevMode = process.env.NODE_ENV !== "production" || !distExists;

  if (isDevMode) {
    const vite = await createViteServer({
      server: { middlewareMode: true },
      appType: "spa",
    });
    app.use(vite.middlewares);

    app.get('*', async (req, res, next) => {
      const url = req.originalUrl;
      try {
        const indexPath = path.resolve(process.cwd(), 'index.html');
        if (fs.existsSync(indexPath)) {
          let template = fs.readFileSync(indexPath, 'utf-8');
          template = await vite.transformIndexHtml(url, template);
          res.status(200).set({ 'Content-Type': 'text/html' }).end(template);
        } else {
          res.status(404).send("index.html not found");
        }
      } catch (e) {
        vite.ssrFixStacktrace(e as Error);
        next(e);
      }
    });
  } else {
    const distPath = path.join(process.cwd(), 'dist');
    app.use(express.static(distPath));
    app.get('*', (req, res) => {
      res.sendFile(path.join(distPath, 'index.html'));
    });
  }

  app.listen(PORT, "0.0.0.0", () => {
    console.log(`Server executing live on http://localhost:${PORT}`);
  });
}

startServer();
