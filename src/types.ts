export type UserRole = 'admin' | 'member';

export interface Contact {
  id: string;
  name: string;
  avatarEmoji: string;
  avatarColor: string; // Tailwind background color class like "bg-emerald-500"
  relationship: string;
  role: UserRole;
  isOnline: boolean;
  lastActive: string; // e.g., "En línea", "Últ. vez hoy a las 12:30", "Últ. vez hace 10 min"
  lastActiveTimestamp?: number;
  phone?: string;
}

export interface Message {
  id: string;
  senderId: string;
  senderName: string;
  receiverId: string; // Can be a contact ID or 'family-group'
  text: string;
  timestamp: Date | string;
  status: 'sent' | 'delivered' | 'read';
  reactions?: string[];
  messageType?: 'text' | 'image' | 'audio';
  mediaUrl?: string; // Contains Base64 data Uri for images/recorded voice audios
  isStarred?: boolean;
  replyToId?: string;
  replyToText?: string;
  replyToSenderName?: string;
}

export interface DirectChat {
  contactId: string;
  messages: Message[];
  unreadCount: number;
  isTyping?: boolean;
}

export interface GroupChat {
  id: 'family-group';
  name: string;
  unreadCount: number;
  messages: Message[];
  isTyping?: { [key: string]: boolean }; // contactId -> typing status
}

export interface LocalNotification {
  id: string;
  title: string;
  body: string;
  avatarEmoji: string;
  avatarColor: string;
  timestamp: string;
}
