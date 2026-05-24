import React, { useEffect } from 'react';
import { LocalNotification } from '../types';
import { X, ShieldAlert } from 'lucide-react';
import { FamiChatLogo } from './FamiChatLogo';

interface NotificationsContainerProps {
  notifications: LocalNotification[];
  onDismiss: (id: string) => void;
}

interface NotificationToastProps {
  notif: LocalNotification;
  onDismiss: (id: string) => void;
}

const NotificationToast: React.FC<NotificationToastProps> = ({ notif, onDismiss }) => {
  useEffect(() => {
    // Auto dismiss notification after 3.5 seconds
    const timer = setTimeout(() => {
      onDismiss(notif.id);
    }, 3500);

    return () => clearTimeout(timer);
  }, [notif.id, onDismiss]);

  // Determine icon depending on notification type
  const isSystemAlert = notif.title.toLowerCase().includes('sesión') || 
                        notif.title.toLowerCase().includes('familiar') ||
                        notif.title.toLowerCase().includes('removido') ||
                        notif.title.toLowerCase().includes('eliminado') ||
                        notif.title.toLowerCase().includes('historial');

  return (
    <div
      id={`toast-notification-${notif.id}`}
      className="bg-slate-900/95 backdrop-blur-md text-white border border-slate-700/40 rounded-xl shadow-2xl p-3.5 flex items-start gap-3 pointer-events-auto transform transition-all duration-300 animate-slide-in-down"
    >
      {/* Sender Avatar */}
      <div className={`w-10 h-10 rounded-full ${notif.avatarColor} text-white flex items-center justify-center text-xl shadow-md shrink-0 select-none`}>
        {notif.avatarEmoji}
      </div>

      <div className="flex-1 min-w-0">
        <div className="flex items-center justify-between pb-0.5">
          <span className="font-bold text-xs text-teal-400 flex items-center gap-1.5 truncate">
            {isSystemAlert ? (
              <ShieldAlert className="w-3.5 h-3.5 text-amber-400 shrink-0" />
            ) : (
              <FamiChatLogo className="w-3.5 h-3.5 text-emerald-450 shrink-0" />
            )}
            <span className="truncate">{notif.title}</span>
          </span>
          <span className="text-[9px] text-slate-400 font-mono shrink-0 ml-1.5">
            {notif.timestamp}
          </span>
        </div>
        
        <p className="text-xs text-slate-200 mt-1 leading-relaxed line-clamp-2 pr-2">
          {notif.body}
        </p>
        
        {!isSystemAlert && (
          <span className="text-[9px] text-[#2dd4bf] font-semibold bg-[#2dd4bf]/10 px-1.5 py-0.5 rounded-sm mt-1.5 inline-block select-none">
            En vivo • Haz clic para chatear
          </span>
        )}
      </div>

      {/* Close Action */}
      <button
        onClick={() => onDismiss(notif.id)}
        className="text-slate-400 hover:text-white hover:bg-white/10 p-1 rounded-lg transition-colors cursor-pointer shrink-0 ml-1"
        title="Cerrar notificación"
      >
        <X className="w-4 h-4" />
      </button>
    </div>
  );
};

export const NotificationsContainer: React.FC<NotificationsContainerProps> = ({
  notifications,
  onDismiss,
}) => {
  if (notifications.length === 0) return null;

  return (
    <div 
      id="in-app-notifications-cluster" 
      className="fixed top-18 right-4 z-50 flex flex-col gap-2.5 max-w-sm w-full px-4 sm:px-0 pointer-events-none"
    >
      {notifications.map((notif) => (
        <NotificationToast 
          key={notif.id} 
          notif={notif} 
          onDismiss={onDismiss} 
        />
      ))}
    </div>
  );
};

