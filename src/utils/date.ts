import { Contact } from '../types';

/**
 * Formats a timestamp value into a friendly connection string (e.g. "hoy a las 11:30")
 * inside the client's local browser timezone.
 */
export function formatLastActive(contact: Contact): string {
  if (contact.isOnline) {
    return 'En línea 🟢';
  }

  const timestamp = contact.lastActiveTimestamp;
  if (!timestamp) {
    return contact.lastActive || 'Desconectado';
  }

  const date = new Date(timestamp);
  if (isNaN(date.getTime())) {
    return contact.lastActive || 'Desconectado';
  }

  const now = new Date();
  
  // Set time of comparisons to midnight
  const today = new Date(now.getFullYear(), now.getMonth(), now.getDate());
  const yesterday = new Date(today);
  yesterday.setDate(yesterday.getDate() - 1);
  
  const targetDate = new Date(date.getFullYear(), date.getMonth(), date.getDate());
  
  const timeStr = date.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' });
  
  if (targetDate.getTime() === today.getTime()) {
    return `Últ. vez hoy a las ${timeStr}`;
  } else if (targetDate.getTime() === yesterday.getTime()) {
    return `Últ. vez ayer a las ${timeStr}`;
  } else {
    const dateStr = date.toLocaleDateString([], { day: '2-digit', month: '2-digit', year: 'numeric' });
    return `Últ. vez el ${dateStr} a las ${timeStr}`;
  }
}

/**
 * Formats the timestamp for the chat list in the sidebar.
 * Outputs hour/minute if today, "Ayer" if yesterday, or the date (DD/MM) if older.
 */
export function formatLastMessageTime(timestamp: Date | string | number | undefined): string {
  if (!timestamp) return '';
  const date = new Date(timestamp);
  if (isNaN(date.getTime())) return '';
  
  const now = new Date();
  const today = new Date(now.getFullYear(), now.getMonth(), now.getDate());
  const yesterday = new Date(today);
  yesterday.setDate(yesterday.getDate() - 1);
  
  const targetDate = new Date(date.getFullYear(), date.getMonth(), date.getDate());
  
  if (targetDate.getTime() === today.getTime()) {
    return date.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' });
  } else if (targetDate.getTime() === yesterday.getTime()) {
    return 'Ayer';
  } else {
    return date.toLocaleDateString([], { day: '2-digit', month: '2-digit' });
  }
}

/**
 * Helper to display clean text banners for days in active chats.
 */
export function getFormattedDateDivider(timestamp: Date | string): string {
  const date = new Date(timestamp);
  if (isNaN(date.getTime())) return '';
  
  const now = new Date();
  const today = new Date(now.getFullYear(), now.getMonth(), now.getDate());
  const yesterday = new Date(today);
  yesterday.setDate(yesterday.getDate() - 1);
  
  const targetDate = new Date(date.getFullYear(), date.getMonth(), date.getDate());
  
  if (targetDate.getTime() === today.getTime()) {
    return 'Hoy';
  } else if (targetDate.getTime() === yesterday.getTime()) {
    return 'Ayer';
  } else {
    return date.toLocaleDateString('es-ES', { day: 'numeric', month: 'long', year: 'numeric' });
  }
}
