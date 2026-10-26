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
var __toCommonJS = (mod) => __copyProps(__defProp({}, "__esModule", { value: true }), mod);

// server.ts
var server_exports = {};
module.exports = __toCommonJS(server_exports);
var import_express = __toESM(require("express"), 1);
var import_vite = require("vite");
var import_path = __toESM(require("path"), 1);
var import_fs = __toESM(require("fs"), 1);
var import_web_push = __toESM(require("web-push"), 1);
var DB_FILE = import_path.default.resolve(process.cwd(), "famichat_db.json");
var INITIAL_CONTACTS = [
  {
    id: "papa-jose",
    name: "Pap\xE1 Jos\xE9 Manuel",
    avatarEmoji: "\u{1F468}\u{1F3FD}\u200D\u{1F4BC}",
    avatarColor: "bg-teal-600",
    relationship: "Pap\xE1 (Admin)",
    role: "admin",
    isOnline: false,
    lastActive: "Sin conexi\xF3n registrada",
    lastActiveTimestamp: void 0,
    phone: "+56 9 1234 5678"
  },
  {
    id: "mama-tila",
    name: "Mam\xE1 Tila del Carmen",
    avatarEmoji: "\u{1F469}\u{1F3FD}\u200D\u{1F9B1}",
    avatarColor: "bg-rose-500",
    relationship: "Mam\xE1",
    role: "member",
    isOnline: false,
    lastActive: "Sin conexi\xF3n registrada",
    lastActiveTimestamp: void 0,
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
    lastActive: "Sin conexi\xF3n registrada",
    lastActiveTimestamp: void 0,
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
    lastActive: "Sin conexi\xF3n registrada",
    lastActiveTimestamp: void 0,
    phone: "+56 9 7777 3434"
  }
];
function loadDB() {
  try {
    if (import_fs.default.existsSync(DB_FILE)) {
      const raw = import_fs.default.readFileSync(DB_FILE, "utf-8");
      const parsed = JSON.parse(raw);
      if (!parsed.contacts || !Array.isArray(parsed.contacts) || parsed.contacts.length === 0) {
        parsed.contacts = INITIAL_CONTACTS.map((c) => ({ ...c }));
      } else {
        const now = Date.now();
        parsed.contacts = parsed.contacts.map((c) => {
          const hasValidPastTimestamp = typeof c.lastActiveTimestamp === "number" && c.lastActiveTimestamp > 0 && c.lastActiveTimestamp <= now + 6e4;
          return {
            ...c,
            isOnline: false,
            lastActiveTimestamp: hasValidPastTimestamp ? c.lastActiveTimestamp : void 0,
            lastActive: hasValidPastTimestamp ? c.lastActive : "Sin conexi\xF3n registrada"
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
    console.error("Error loading DB file:", e);
  }
  const initial = {
    contacts: INITIAL_CONTACTS.map((c) => ({ ...c })),
    messages: [],
    pushSubscriptions: []
  };
  try {
    import_fs.default.writeFileSync(DB_FILE, JSON.stringify(initial, null, 2), "utf-8");
  } catch (e) {
    console.error("Failed to write initial DB:", e);
  }
  return initial;
}
var db = loadDB();
function saveDB() {
  try {
    import_fs.default.writeFileSync(DB_FILE, JSON.stringify(db, null, 2), "utf-8");
  } catch (e) {
    console.error("Error saving DB file:", e);
  }
}
if (!db.vapidKeys || !db.vapidKeys.publicKey || !db.vapidKeys.privateKey) {
  const generatedKeys = import_web_push.default.generateVAPIDKeys();
  db.vapidKeys = {
    publicKey: generatedKeys.publicKey,
    privateKey: generatedKeys.privateKey
  };
  saveDB();
} else {
  saveDB();
}
import_web_push.default.setVapidDetails(
  "mailto:familia@famichat.app",
  db.vapidKeys.publicKey,
  db.vapidKeys.privateKey
);
async function sendPushNotificationsForMessage(msg) {
  if (!db.pushSubscriptions || db.pushSubscriptions.length === 0) return;
  const isGroup = msg.receiverId === "family-group";
  const senderContact = db.contacts.find((c) => c.id === msg.senderId);
  const emoji = senderContact?.avatarEmoji || "\u{1F4AC}";
  const notificationTitle = isGroup ? `\u{1F3E1} Familia Unida (${msg.senderName.split(" ")[0]})` : `${emoji} ${msg.senderName}`;
  let notificationBody = msg.text;
  if (msg.messageType === "image") {
    notificationBody = "\u{1F4F7} Envi\xF3 una foto compartida";
  } else if (msg.messageType === "audio") {
    notificationBody = "\u{1F399}\uFE0F Envi\xF3 una nota de voz familiar";
  }
  const targetRoomId = isGroup ? "family-group" : msg.senderId;
  const payload = JSON.stringify({
    title: notificationTitle,
    body: notificationBody,
    icon: "/favicon.svg",
    badge: "/favicon.svg",
    tag: `famichat-${targetRoomId}`,
    url: `/?roomId=${targetRoomId}`,
    timestamp: Date.now()
  });
  const expiredEndpoints = [];
  const sendPromises = db.pushSubscriptions.map(async (item) => {
    if (item.userId === msg.senderId) return;
    if (!isGroup && item.userId !== msg.receiverId) return;
    try {
      await import_web_push.default.sendNotification(item.subscription, payload);
    } catch (err) {
      if (err.statusCode === 410 || err.statusCode === 404) {
        expiredEndpoints.push(item.subscription.endpoint);
      }
    }
  });
  await Promise.allSettled(sendPromises);
  if (expiredEndpoints.length > 0 && db.pushSubscriptions) {
    db.pushSubscriptions = db.pushSubscriptions.filter(
      (s) => !expiredEndpoints.includes(s.subscription.endpoint)
    );
    saveDB();
  }
}
var contactPings = {};
var lastSavedPingPersist = 0;
function recordUserActivity(userId, forceSave = false) {
  if (!userId || typeof userId !== "string") return;
  const now = Date.now();
  contactPings[userId] = now;
  const contact = db.contacts.find((c) => c.id === userId);
  if (contact) {
    contact.lastActiveTimestamp = now;
    contact.isOnline = true;
    contact.lastActive = "En l\xEDnea";
    if (forceSave || now - lastSavedPingPersist > 5e3) {
      lastSavedPingPersist = now;
      saveDB();
    }
  }
}
var typingStates = {};
async function startServer() {
  const app = (0, import_express.default)();
  const PORT = 3e3;
  app.use((req, res, next) => {
    res.header("Access-Control-Allow-Origin", "*");
    res.header("Access-Control-Allow-Methods", "GET, POST, PUT, DELETE, OPTIONS");
    res.header("Access-Control-Allow-Headers", "Origin, X-Requested-With, Content-Type, Accept, Authorization");
    if (req.method === "OPTIONS") {
      return res.sendStatus(200);
    }
    next();
  });
  app.use(import_express.default.json({ limit: "50mb" }));
  app.use(import_express.default.urlencoded({ limit: "50mb", extended: true }));
  app.get("/api/contacts", (req, res) => {
    const activeUser = req.query.activeUser;
    const now = Date.now();
    if (activeUser) {
      recordUserActivity(activeUser);
    }
    const updatedContacts = db.contacts.map((contact) => {
      const lastSeen = contactPings[contact.id] || 0;
      const isNowOnline = lastSeen > 0 && now - lastSeen < 15e3;
      const persistedTs = typeof contact.lastActiveTimestamp === "number" && contact.lastActiveTimestamp > 0 && contact.lastActiveTimestamp <= now + 6e4 ? contact.lastActiveTimestamp : void 0;
      const exactTimestamp = lastSeen > 0 ? lastSeen : persistedTs;
      if (contact.isOnline !== isNowOnline || contact.lastActiveTimestamp !== exactTimestamp) {
        contact.isOnline = isNowOnline;
        contact.lastActiveTimestamp = exactTimestamp;
        contact.lastActive = isNowOnline ? "En l\xEDnea" : exactTimestamp ? contact.lastActive : "Sin conexi\xF3n registrada";
      }
      return {
        ...contact,
        isOnline: isNowOnline,
        lastActiveTimestamp: exactTimestamp,
        lastActive: isNowOnline ? "En l\xEDnea" : exactTimestamp ? "Desconectado" : "Sin conexi\xF3n registrada"
      };
    });
    res.json(updatedContacts);
  });
  app.post("/api/presence-offline", (req, res) => {
    const { userId } = req.body;
    if (userId && typeof userId === "string") {
      const now = Date.now();
      delete contactPings[userId];
      delete typingStates[userId];
      const contact = db.contacts.find((c) => c.id === userId);
      if (contact) {
        contact.isOnline = false;
        contact.lastActiveTimestamp = now;
        contact.lastActive = "Desconectado";
        saveDB();
      }
    }
    res.json({ success: true });
  });
  app.get("/api/typing", (req, res) => {
    const now = Date.now();
    const activeTypers = {};
    Object.keys(typingStates).forEach((uid) => {
      if (now - typingStates[uid].timestamp < 4e3) {
        activeTypers[uid] = typingStates[uid].roomId;
      } else {
        delete typingStates[uid];
      }
    });
    res.json(activeTypers);
  });
  app.post("/api/typing", (req, res) => {
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
  app.get("/api/messages", (req, res) => {
    const activeUser = req.query.activeUser;
    const activeRoom = req.query.activeRoom;
    if (activeUser) {
      recordUserActivity(activeUser);
      let statusChanged = false;
      db.messages.forEach((msg) => {
        if (msg.senderId === activeUser) return;
        const isForActiveUser = msg.receiverId === activeUser || msg.receiverId === "family-group";
        if (!isForActiveUser) return;
        const isViewingThisRoom = msg.receiverId === "family-group" && activeRoom === "family-group" || msg.receiverId === activeUser && activeRoom === msg.senderId;
        if (isViewingThisRoom && msg.status !== "read") {
          msg.status = "read";
          statusChanged = true;
        } else if (!isViewingThisRoom && msg.status === "sent") {
          msg.status = "delivered";
          statusChanged = true;
        }
      });
      if (statusChanged) {
        saveDB();
      }
    }
    res.json(db.messages);
  });
  app.post("/api/messages/read", (req, res) => {
    const { userId, roomId } = req.body;
    if (!userId || !roomId) {
      return res.status(400).json({ error: "Missing userId or roomId" });
    }
    recordUserActivity(userId);
    let changed = false;
    db.messages.forEach((msg) => {
      if (msg.senderId === userId) return;
      const inRoom = roomId === "family-group" ? msg.receiverId === "family-group" : msg.senderId === roomId && msg.receiverId === userId;
      if (inRoom && msg.status !== "read") {
        msg.status = "read";
        changed = true;
      }
    });
    if (changed) {
      saveDB();
    }
    res.json({ success: true, updated: changed });
  });
  app.post("/api/messages", (req, res) => {
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
    if (!senderId || !receiverId || !text && !mediaUrl) {
      return res.status(400).json({ error: "Missing message fields" });
    }
    recordUserActivity(activeUser || senderId, true);
    delete typingStates[senderId];
    if (id) {
      const existing = db.messages.find((m) => m.id === id);
      if (existing) {
        return res.status(200).json(existing);
      }
    }
    const now = Date.now();
    let initialStatus = "sent";
    if (receiverId === "family-group") {
      const anyOtherMemberOnline = db.contacts.some(
        (c) => c.id !== senderId && contactPings[c.id] && now - contactPings[c.id] < 15e3
      );
      if (anyOtherMemberOnline) {
        initialStatus = "delivered";
      }
    } else {
      const recipientLastSeen = contactPings[receiverId] || 0;
      if (recipientLastSeen > 0 && now - recipientLastSeen < 15e3) {
        initialStatus = "delivered";
      }
    }
    const newMessage = {
      id: id || "msg-" + Date.now() + "-" + Math.random().toString(36).substring(2, 7),
      senderId,
      senderName,
      receiverId,
      text: text || "",
      timestamp: (/* @__PURE__ */ new Date()).toISOString(),
      status: initialStatus,
      messageType: messageType || "text",
      mediaUrl: mediaUrl || void 0,
      replyToId: replyToId || void 0,
      replyToText: replyToText || void 0,
      replyToSenderName: replyToSenderName || void 0
    };
    db.messages.push(newMessage);
    saveDB();
    sendPushNotificationsForMessage(newMessage).catch((err) => {
      console.error("Error dispatching push notifications:", err);
    });
    res.status(201).json(newMessage);
  });
  app.post("/api/contacts", (req, res) => {
    const { contact, activeUser } = req.body;
    if (!contact || !contact.id || !contact.name) {
      return res.status(400).json({ error: "Invalid contact data" });
    }
    if (activeUser) {
      recordUserActivity(activeUser, true);
    }
    const newContact = {
      ...contact,
      role: "member",
      isOnline: false,
      lastActiveTimestamp: void 0,
      lastActive: "Sin conexi\xF3n registrada"
    };
    db.contacts.push(newContact);
    saveDB();
    res.status(201).json({ contact: newContact, contacts: db.contacts });
  });
  app.delete("/api/messages", (req, res) => {
    const { channelId, userId } = req.body;
    if (!channelId) {
      return res.status(400).json({ error: "Missing channelId to clear" });
    }
    if (channelId === "family-group") {
      db.messages = db.messages.filter((m) => m.receiverId !== "family-group");
    } else {
      db.messages = db.messages.filter((m) => {
        const isBetweenUsers = m.senderId === userId && m.receiverId === channelId || m.senderId === channelId && m.receiverId === userId;
        return !isBetweenUsers;
      });
    }
    saveDB();
    res.json({ success: true, remainingCount: db.messages.length });
  });
  app.delete("/api/messages/:id", (req, res) => {
    const { id } = req.params;
    if (!id) {
      return res.status(400).json({ error: "Missing message ID" });
    }
    const initialLength = db.messages.length;
    db.messages = db.messages.filter((m) => m.id !== id);
    if (db.messages.length < initialLength) {
      saveDB();
    }
    res.json({ success: true, removedId: id });
  });
  app.post("/api/messages/:id/react", (req, res) => {
    const { id } = req.params;
    const { reaction } = req.body;
    if (!id || !reaction) {
      return res.status(400).json({ error: "Missing message ID or reaction emoji" });
    }
    const msg = db.messages.find((m) => m.id === id);
    if (!msg) {
      return res.status(404).json({ error: "Message not found" });
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
  app.post("/api/messages/:id/star", (req, res) => {
    const { id } = req.params;
    if (!id) {
      return res.status(400).json({ error: "Missing message ID" });
    }
    const msg = db.messages.find((m) => m.id === id);
    if (!msg) {
      return res.status(404).json({ error: "Message not found" });
    }
    msg.isStarred = !msg.isStarred;
    saveDB();
    res.json({ success: true, message: msg });
  });
  app.get("/api/push-public-key", (req, res) => {
    res.json({ publicKey: db.vapidKeys?.publicKey || "" });
  });
  app.post("/api/push-subscribe", (req, res) => {
    const { userId, subscription } = req.body;
    if (!userId || !subscription || !subscription.endpoint) {
      return res.status(400).json({ error: "Invalid push subscription payload" });
    }
    if (!db.pushSubscriptions) {
      db.pushSubscriptions = [];
    }
    const existingIdx = db.pushSubscriptions.findIndex(
      (s) => s.subscription.endpoint === subscription.endpoint
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
  app.get(["/FamiChat_Codigo_Completo.txt", "/codigo.txt", "/api/codigo.txt"], (req, res) => {
    const filePath = import_path.default.join(process.cwd(), "public", "FamiChat_Codigo_Completo.txt");
    if (import_fs.default.existsSync(filePath)) {
      res.setHeader("Content-Type", "text/plain; charset=utf-8");
      if (req.query.download === "true" || req.query.download === "1") {
        res.setHeader("Content-Disposition", 'attachment; filename="FamiChat_Codigo_Completo.txt"');
      }
      return res.sendFile(filePath);
    }
    res.status(404).send("Archivo de c\xF3digo no encontrado");
  });
  app.post("/api/push-unsubscribe", (req, res) => {
    const { endpoint } = req.body;
    if (endpoint && db.pushSubscriptions) {
      db.pushSubscriptions = db.pushSubscriptions.filter(
        (s) => s.subscription.endpoint !== endpoint
      );
      saveDB();
    }
    res.json({ success: true });
  });
  if (process.env.NODE_ENV !== "production") {
    const vite = await (0, import_vite.createServer)({
      server: { middlewareMode: true },
      appType: "spa"
    });
    app.use(vite.middlewares);
  } else {
    const distPath = import_path.default.join(process.cwd(), "dist");
    app.use(import_express.default.static(distPath));
    app.get("*", (req, res) => {
      res.sendFile(import_path.default.join(distPath, "index.html"));
    });
  }
  app.listen(PORT, "0.0.0.0", () => {
    console.log(`FamiChat Real-Time Server running on http://localhost:${PORT}`);
  });
}
startServer();
//# sourceMappingURL=server.cjs.map
