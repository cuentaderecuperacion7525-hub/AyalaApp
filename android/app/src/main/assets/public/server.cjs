var __create = Object.create;
var __defProp = Object.defineProperty;
var __getOwnPropDesc = Object.getOwnPropertyDescriptor;
var __getOwnPropNames = Object.getOwnPropertyNames;
var __getProtoOf = Object.getPrototypeOf;
var __hasOwnProp = Object.prototype.hasOwnProperty;
var __copyProps = (to, from, except, desc) => {
  if (from && typeof from === "object" || typeof from === "function") {
    for (let key of __getOwnPropNames(from))
      if (!__hasOwnProp.call(to, key) && key !== except)
        __defProp(to, key, { get: () => from[key], enumerable: !(desc = __getOwnPropDesc(from, key)) || desc.enumerable });
  }
  return to;
};
var __toESM = (mod, isNodeMode, target) => (target = mod != null ? __create(__getProtoOf(mod)) : {}, __copyProps(
  // If the importer is in node compatibility mode or this is not an ESM
  // file that has been converted to a CommonJS file using a Babel-
  // compatible transform (i.e. "__esModule" has not been set), then set
  // "default" to the CommonJS "module.exports" for node compatibility.
  isNodeMode || !mod || !mod.__esModule ? __defProp(target, "default", { value: mod, enumerable: true }) : target,
  mod
));

// server.ts
var import_express = __toESM(require("express"), 1);
var import_path = __toESM(require("path"), 1);
var import_fs = __toESM(require("fs"), 1);
var import_vite = require("vite");
var import_web_push = __toESM(require("web-push"), 1);
var DB_FILE = import_path.default.join(process.cwd(), "famichat_db.json");
var INITIAL_CONTACTS = [
  {
    id: "papa-jose",
    name: "Pap\xE1 Jos\xE9 Manuel",
    avatarEmoji: "\u{1F468}\u{1F3FD}\u200D\u{1F4BC}",
    avatarColor: "bg-teal-600",
    relationship: "Pap\xE1 (Admin)",
    role: "admin",
    isOnline: true,
    lastActive: "En l\xEDnea",
    lastActiveTimestamp: Date.now(),
    phone: "+56 9 1234 5678"
  },
  {
    id: "mama-tila",
    name: "Mam\xE1 Tila del Carmen",
    avatarEmoji: "\u{1F469}\u{1F3FD}\u200D\u{1F9B1}",
    avatarColor: "bg-rose-500",
    relationship: "Mam\xE1",
    role: "member",
    isOnline: true,
    lastActive: "En l\xEDnea",
    lastActiveTimestamp: Date.now(),
    phone: "+56 9 8765 4321"
  },
  {
    id: "hijo-christian",
    name: "Christian Fernando",
    avatarEmoji: "\u{1F9D1}\u{1F3FD}\u200D\u{1F4BB}",
    avatarColor: "bg-sky-500",
    relationship: "Hijo",
    role: "member",
    isOnline: false,
    lastActive: "\xDAlt. vez hoy a las 18:15",
    lastActiveTimestamp: Date.now() - 40 * 60 * 1e3,
    // 40 minutes ago
    phone: "+56 9 5555 1212"
  },
  {
    id: "hijo-cristopher",
    name: "Cristopher",
    avatarEmoji: "\u{1F3AE}",
    avatarColor: "bg-amber-500",
    relationship: "Hijo",
    role: "member",
    isOnline: false,
    lastActive: "\xDAlt. vez hoy a las 17:40",
    lastActiveTimestamp: Date.now() - 150 * 60 * 1e3,
    // 2.5 hours ago
    phone: "+56 9 7777 3434"
  }
];
var getBaselineMessages = () => {
  const dateOffset = (minsAgo) => {
    const d = /* @__PURE__ */ new Date();
    d.setMinutes(d.getMinutes() - minsAgo);
    return d.toISOString();
  };
  return [
    {
      id: "g1",
      senderId: "mama-tila",
      senderName: "Mam\xE1 Tila del Carmen",
      receiverId: "family-group",
      text: "\xA1Hola familia hermosa! \xBFC\xF3mo va su d\xEDa? \u2764\uFE0F",
      timestamp: dateOffset(60),
      status: "read"
    },
    {
      id: "g2",
      senderId: "hijo-christian",
      senderName: "Christian Fernando",
      receiverId: "family-group",
      text: "Todo bien mam\xE1, saliendo de una clase. \xA1Qu\xE9 tal ustedes!",
      timestamp: dateOffset(55),
      status: "read"
    },
    {
      id: "g3",
      senderId: "hijo-cristopher",
      senderName: "Cristopher",
      receiverId: "family-group",
      text: "Holaaa, yo acabo de terminar mis tareas, \xBFya van a almorzar? \u{1F60B}",
      timestamp: dateOffset(50),
      status: "read"
    },
    {
      id: "g4",
      senderId: "papa-jose",
      senderName: "Pap\xE1 Jos\xE9 Manuel",
      receiverId: "family-group",
      text: "Hola a todos. Acabo de salir de una reuni\xF3n. Tila, al rato te marco para ver lo de la comida. Abrazo a mis muchachos.",
      timestamp: dateOffset(45),
      status: "read"
    },
    {
      id: "g5",
      senderId: "mama-tila",
      senderName: "Mam\xE1 Tila del Carmen",
      receiverId: "family-group",
      text: "Sii Jos\xE9, prepar\xE9 cazuelita rica. Los espero a los tres en casa. \u{1F372}",
      timestamp: dateOffset(40),
      status: "read"
    }
  ];
};
var db = {
  contacts: INITIAL_CONTACTS,
  messages: getBaselineMessages(),
  pushSubscriptions: []
};
function loadDB() {
  try {
    if (import_fs.default.existsSync(DB_FILE)) {
      const parsed = JSON.parse(import_fs.default.readFileSync(DB_FILE, "utf-8"));
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
    import_fs.default.writeFileSync(DB_FILE, JSON.stringify(db, null, 2), "utf-8");
  } catch (e) {
    console.error("Failed to write to file database:", e);
  }
}
loadDB();
if (!db.pushSubscriptions) {
  db.pushSubscriptions = [];
}
if (!db.vapidKeys) {
  db.vapidKeys = import_web_push.default.generateVAPIDKeys();
  saveDB();
}
import_web_push.default.setVapidDetails(
  "mailto:josemanuel5121@gmail.com",
  db.vapidKeys.publicKey,
  db.vapidKeys.privateKey
);
function sendPushNotification(targetUserId, payload) {
  if (!db.pushSubscriptions) return;
  const userSubs = db.pushSubscriptions.filter((sub) => sub.userId === targetUserId);
  if (userSubs.length === 0) return;
  const payloadString = JSON.stringify(payload);
  userSubs.forEach((userSub) => {
    import_web_push.default.sendNotification(userSub.subscription, payloadString).catch((err) => {
      console.error(`Error sending push notification to user ${targetUserId}:`, err);
      if (err.statusCode === 410 || err.statusCode === 404) {
        db.pushSubscriptions = db.pushSubscriptions?.filter((sub) => sub.subscription.endpoint !== userSub.subscription.endpoint);
        saveDB();
      }
    });
  });
}
var contactPings = {};
var typingStates = {};
async function startServer() {
  const app = (0, import_express.default)();
  const PORT = 3e3;
  const setPwaHeaders = (req, res) => {
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
    res.sendFile(import_path.default.join(process.cwd(), "public", "manifest.json"));
  });
  app.get("/sw.js", (req, res) => {
    res.setHeader("Content-Type", "application/javascript; charset=utf-8");
    setPwaHeaders(req, res);
    res.sendFile(import_path.default.join(process.cwd(), "public", "sw.js"));
  });
  app.get("/logo-famichat.png", (req, res) => {
    res.setHeader("Content-Type", "image/png");
    setPwaHeaders(req, res);
    res.sendFile(import_path.default.join(process.cwd(), "public", "logo-famichat.png"));
  });
  app.use(import_express.default.json({ limit: "40mb" }));
  app.use(import_express.default.urlencoded({ limit: "40mb", extended: true }));
  app.use((req, res, next) => {
    const activeUserId = req.query.activeUser || req.body.activeUser;
    if (activeUserId && typeof activeUserId === "string") {
      contactPings[activeUserId] = Date.now();
    }
    next();
  });
  app.get("/api/contacts", (req, res) => {
    const activeUserId = req.query.activeUser;
    if (activeUserId) {
      contactPings[activeUserId] = Date.now();
    }
    const now = Date.now();
    const updatedContacts = db.contacts.map((contact) => {
      const lastSeen = contactPings[contact.id] || 0;
      const isOnline = now - lastSeen < 1e4;
      let lastActiveString = contact.lastActive;
      const lastActiveTimestamp = isOnline ? now : lastSeen > 0 ? lastSeen : contact.lastActiveTimestamp || now - 120 * 60 * 1e3;
      if (isOnline) {
        lastActiveString = "En l\xEDnea";
      } else if (lastSeen > 0) {
        const timeStr = new Date(lastSeen).toLocaleTimeString([], { hour: "2-digit", minute: "2-digit" });
        lastActiveString = `\xDAlt. vez hoy a las ${timeStr}`;
      }
      return {
        ...contact,
        isOnline: isOnline || contact.id === activeUserId,
        // local user is always online for themselves
        lastActive: lastActiveString,
        lastActiveTimestamp
      };
    });
    res.json(updatedContacts);
  });
  app.post("/api/contacts", (req, res) => {
    const { contact, activeUser } = req.body;
    if (!contact || !contact.name || !contact.relationship) {
      res.status(400).json({ error: "Datos del familiar incompletos" });
      return;
    }
    if (activeUser !== "papa-jose") {
      res.status(403).json({ error: "Solo el administrador (Pap\xE1) puede agregar nuevos familiares" });
      return;
    }
    db.contacts.push({
      id: contact.id || `member-${Date.now()}`,
      name: contact.name,
      avatarEmoji: contact.avatarEmoji || "\u{1F9D1}\u{1F3FD}",
      avatarColor: contact.avatarColor || "bg-slate-500",
      relationship: contact.relationship,
      role: "member",
      isOnline: false,
      lastActive: "Agregado recientemente",
      lastActiveTimestamp: Date.now()
    });
    saveDB();
    res.json({ success: true, contacts: db.contacts });
  });
  app.get("/api/messages", (req, res) => {
    res.json(db.messages);
  });
  function simulateReply(senderId, receiverId) {
    let replierId = "";
    let targetRoomId = "";
    if (receiverId === "family-group") {
      if (Math.random() > 0.45) return;
      const eligible = db.contacts.filter((c) => c.id !== senderId);
      if (eligible.length === 0) return;
      const randomContact = eligible[Math.floor(Math.random() * eligible.length)];
      replierId = randomContact.id;
      targetRoomId = "family-group";
    } else {
      replierId = receiverId;
      targetRoomId = senderId;
    }
    const replier = db.contacts.find((c) => c.id === replierId);
    if (!replier) return;
    let text = "";
    if (replierId === "mama-tila") {
      const choices = [
        "\xA1Hola mi amor de mi vida! Qu\xE9 lindo leerte por aqu\xED. \xBFC\xF3mo va tu d\xEDa? Ya estoy cocinando algo rico para cuando nos juntemos. Te mando un beso gigante y bendiciones hijo/a \u{1F618}\u2764\uFE0F\u{1F372}",
        "Qu\xE9 bueno saber de ti. Dios me lo bendiga y cuide de todo peligro. Cu\xE9ntame si vas a venir a almorzar m\xE1s tarde \u{1F64F}\u{1F496}",
        "\xA1Qu\xE9 alegr\xEDa este mensaje! \xBFC\xF3mo va todo? No olvides abrigarte si sales, que hay un poco de fr\xEDo. \xA1Te quiero de aqu\xED al cielo! \u{1F970}\u2728"
      ];
      text = choices[Math.floor(Math.random() * choices.length)];
    } else if (replierId === "hijo-christian") {
      const choices = [
        "\xA1Epa! Qu\xE9 tal todo? S\xFAper bien por ac\xE1, saliendo de una clase y revisando unas cosas de la carrera. \xBFHablamos en un rato m\xE1s? \u{1F919}\u{1F3FC}\u{1F4BB}",
        "Holaaa! Voy terminando un proyecto. Al rato los llamo para ponernos al d\xEDa. \xA1Que tengan un excelente d\xEDa! \u26A1",
        "\xA1Qu\xE9 buena onda leerte! Ac\xE1 ando descansando un ratito. Espero que todo marche de maravilla hoy."
      ];
      text = choices[Math.floor(Math.random() * choices.length)];
    } else if (replierId === "hijo-cristopher") {
      const choices = [
        "\xA1Buenas buenas! Todo de diez por ac\xE1, jugando un ratito y haciendo mis tareas antes del almuerzo \u{1F3AE}\u270C\uFE0F",
        "Hola! Me alegra mucho saber de ti. \xBFQu\xE9 cuentas de nuevo el d\xEDa de hoy? jaja",
        "\xA1Hola! Ya estoy listo para comer la cazuela deliciosa de mam\xE1 jaja, \xA1un gran abrazo para todos! \u{1F372}\u{1F3E1}"
      ];
      text = choices[Math.floor(Math.random() * choices.length)];
    } else if (replierId === "papa-jose") {
      const choices = [
        "Hola a todos. Por aqu\xED todo bien en el trabajo, terminando unas gestiones. Cu\xEDdense mucho en el camino.",
        "Qu\xE9 alegr\xEDa ver que est\xE1n comunicados. Que tengan una excelente jornada, nos vemos m\xE1s tarde en casa. Abrazo grande.",
        "Hola, todo excelente de este lado. Al rato me conecto idealmente para ver qu\xE9 plan tenemos hoy, bendiciones."
      ];
      text = choices[Math.floor(Math.random() * choices.length)];
    } else {
      text = `\xA1Hola! Qu\xE9 gusto leerte. Te mando un gran saludo y un fuerte abrazo familiar. \u{1F60A}\u{1F3E1}`;
    }
    setTimeout(() => {
      contactPings[replierId] = Date.now() + 15e3;
      typingStates[replierId] = { roomId: targetRoomId, timestamp: Date.now() };
    }, 1e3);
    setTimeout(() => {
      delete typingStates[replierId];
      contactPings[replierId] = Date.now();
      const replyMsg = {
        id: "msg-" + Date.now(),
        senderId: replierId,
        senderName: replier.name,
        receiverId: targetRoomId,
        text,
        timestamp: (/* @__PURE__ */ new Date()).toISOString(),
        status: "read",
        messageType: "text"
      };
      db.messages.push(replyMsg);
      saveDB();
      if (targetRoomId === "family-group") {
        db.contacts.forEach((contact) => {
          if (contact.id !== replierId) {
            sendPushNotification(contact.id, {
              title: `FamiChat \u{1F3E1} ${replier.name}`,
              body: text,
              url: `/?roomId=family-group`,
              tag: "family-group"
            });
          }
        });
      } else {
        sendPushNotification(targetRoomId, {
          title: `FamiChat \u2709\uFE0F de ${replier.name}`,
          body: text,
          url: `/?roomId=${replierId}`,
          tag: `dm-${replierId}`
        });
      }
    }, 4500);
  }
  app.post("/api/messages", (req, res) => {
    const { id, senderId, senderName, receiverId, text, messageType, mediaUrl, replyToId, replyToText, replyToSenderName } = req.body;
    if (!senderId || !receiverId) {
      res.status(400).json({ error: "Remitente o destinatario ausentes" });
      return;
    }
    const newMessage = {
      id: id || `msg-${Date.now()}`,
      senderId,
      senderName,
      receiverId,
      text: text || "",
      timestamp: (/* @__PURE__ */ new Date()).toISOString(),
      status: "sent",
      messageType: messageType || "text",
      mediaUrl: mediaUrl || void 0,
      replyToId: replyToId || void 0,
      replyToText: replyToText || void 0,
      replyToSenderName: replyToSenderName || void 0
    };
    db.messages.push(newMessage);
    saveDB();
    simulateReply(senderId, receiverId);
    if (receiverId === "family-group") {
      db.contacts.forEach((contact) => {
        if (contact.id !== senderId) {
          sendPushNotification(contact.id, {
            title: `FamiChat \u{1F3E1} ${senderName}`,
            body: messageType === "image" ? "\u{1F4F7} Foto de familia" : messageType === "audio" ? "\u{1F3A4} Nota de voz familiar" : text || "",
            url: `/?roomId=family-group`,
            tag: "family-group"
          });
        }
      });
    } else {
      sendPushNotification(receiverId, {
        title: `FamiChat \u2709\uFE0F de ${senderName}`,
        body: messageType === "image" ? "\u{1F4F7} Foto familiar privada" : messageType === "audio" ? "\u{1F3A4} Nota de voz privada" : text || "",
        url: `/?roomId=${senderId}`,
        tag: `dm-${senderId}`
      });
    }
    setTimeout(() => {
      const idx = db.messages.findIndex((m) => m.id === newMessage.id);
      if (idx !== -1 && db.messages[idx].status === "sent") {
        db.messages[idx].status = "delivered";
        saveDB();
      }
    }, 1200);
    setTimeout(() => {
      const idx = db.messages.findIndex((m) => m.id === newMessage.id);
      if (idx !== -1 && db.messages[idx].status === "delivered") {
        db.messages[idx].status = "read";
        saveDB();
      }
    }, 3200);
    res.json(newMessage);
  });
  app.delete("/api/messages", (req, res) => {
    const { channelId, userId } = req.body;
    if (!channelId || !userId) {
      res.status(400).json({ error: "Faltan par\xE1metros para borrar conversaci\xF3n" });
      return;
    }
    if (channelId === "family-group") {
      db.messages = db.messages.filter((m) => m.receiverId !== "family-group");
    } else {
      db.messages = db.messages.filter((m) => {
        const isBetweenThem = m.senderId === userId && m.receiverId === channelId || m.senderId === channelId && m.receiverId === userId;
        return !isBetweenThem;
      });
    }
    saveDB();
    res.json({ success: true });
  });
  app.delete("/api/messages/:id", (req, res) => {
    const messageId = req.params.id;
    db.messages = db.messages.filter((m) => m.id !== messageId);
    saveDB();
    res.json({ success: true });
  });
  app.post("/api/messages/:id/react", (req, res) => {
    const messageId = req.params.id;
    const { reaction } = req.body;
    if (!reaction) {
      res.status(400).json({ error: "Falta el emoji de reacci\xF3n" });
      return;
    }
    const msg = db.messages.find((m) => m.id === messageId);
    if (msg) {
      if (!msg.reactions) {
        msg.reactions = [];
      }
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
  app.post("/api/messages/:id/star", (req, res) => {
    const messageId = req.params.id;
    const msg = db.messages.find((m) => m.id === messageId);
    if (msg) {
      msg.isStarred = !msg.isStarred;
      saveDB();
      res.json({ success: true, isStarred: msg.isStarred });
    } else {
      res.status(404).json({ error: "Mensaje no encontrado" });
    }
  });
  app.get("/api/typing", (req, res) => {
    const now = Date.now();
    const activeTyping = {};
    Object.entries(typingStates).forEach(([userId, payload]) => {
      if (now - payload.timestamp < 4e3) {
        activeTyping[userId] = payload.roomId;
      }
    });
    res.json(activeTyping);
  });
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
  app.post("/api/presence-simulation", (req, res) => {
    const { contactId, state, activeUserId, text } = req.body;
    if (!contactId || !state) {
      res.status(400).json({ error: "Par\xE1metros incompletos" });
      return;
    }
    const now = Date.now();
    const contact = db.contacts.find((c) => c.id === contactId);
    if (!contact) {
      res.status(404).json({ error: "Contacto no encontrado" });
      return;
    }
    if (state === "online") {
      contactPings[contactId] = now + 1e3 * 60 * 60 * 24;
      delete typingStates[contactId];
    } else if (state === "offline") {
      contactPings[contactId] = now - 60 * 60 * 1e3;
      delete typingStates[contactId];
    } else if (state === "typing_group") {
      contactPings[contactId] = now + 1e3 * 60 * 60 * 24;
      typingStates[contactId] = { roomId: "family-group", timestamp: now + 1e3 * 60 * 60 * 24 };
    } else if (state === "typing_private") {
      const targetRoom = activeUserId || "papa-jose";
      contactPings[contactId] = now + 1e3 * 60 * 60 * 24;
      typingStates[contactId] = { roomId: targetRoom, timestamp: now + 1e3 * 60 * 60 * 24 };
    } else if (state === "trigger_message") {
      const msgText = text || "\xA1Hola familia! \u{1F44B}\u{1F60A}";
      delete typingStates[contactId];
      contactPings[contactId] = now;
      const randomMsgId = "msg-" + now;
      const targetRoomId = activeUserId || "family-group";
      const simulatedMsg = {
        id: randomMsgId,
        senderId: contactId,
        senderName: contact.name,
        receiverId: targetRoomId,
        text: msgText,
        timestamp: (/* @__PURE__ */ new Date()).toISOString(),
        status: "read",
        messageType: "text"
      };
      db.messages.push(simulatedMsg);
      saveDB();
      if (targetRoomId === "family-group") {
        db.contacts.forEach((c) => {
          if (c.id !== contactId) {
            sendPushNotification(c.id, {
              title: `FamiChat \u{1F3E1} ${contact.name}`,
              body: msgText,
              url: `/?roomId=family-group`,
              tag: "family-group"
            });
          }
        });
      } else {
        sendPushNotification(targetRoomId, {
          title: `FamiChat \u2709\uFE0F de ${contact.name}`,
          body: msgText,
          url: `/?roomId=${contactId}`,
          tag: `dm-${contactId}`
        });
      }
    }
    res.json({ success: true });
  });
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
      res.status(400).json({ error: "Faltan par\xE1metros de suscripci\xF3n" });
      return;
    }
    if (!db.pushSubscriptions) {
      db.pushSubscriptions = [];
    }
    const idx = db.pushSubscriptions.findIndex((s) => s.subscription.endpoint === subscription.endpoint);
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
        (s) => !(s.userId === userId && s.subscription.endpoint === endpoint)
      );
      saveDB();
    }
    res.json({ success: true });
  });
  const distExists = import_fs.default.existsSync(import_path.default.join(process.cwd(), "dist", "index.html"));
  const isDevMode = process.env.NODE_ENV !== "production" || !distExists;
  if (isDevMode) {
    const vite = await (0, import_vite.createServer)({
      server: { middlewareMode: true },
      appType: "spa"
    });
    app.use(vite.middlewares);
    app.get("*", async (req, res, next) => {
      const url = req.originalUrl;
      try {
        const indexPath = import_path.default.resolve(process.cwd(), "index.html");
        if (import_fs.default.existsSync(indexPath)) {
          let template = import_fs.default.readFileSync(indexPath, "utf-8");
          template = await vite.transformIndexHtml(url, template);
          res.status(200).set({ "Content-Type": "text/html" }).end(template);
        } else {
          res.status(404).send("index.html not found");
        }
      } catch (e) {
        vite.ssrFixStacktrace(e);
        next(e);
      }
    });
  } else {
    const distPath = import_path.default.join(process.cwd(), "dist");
    app.use(import_express.default.static(distPath));
    app.get("*", (req, res) => {
      res.sendFile(import_path.default.join(distPath, "index.html"));
    });
  }
  app.listen(PORT, "0.0.0.0", () => {
    console.log(`Server executing live on http://localhost:${PORT}`);
  });
}
startServer();
//# sourceMappingURL=server.cjs.map
