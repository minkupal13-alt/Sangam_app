import { useEffect } from 'react';
import { X, Heart, MessageCircle, UserPlus, AtSign, Send, Repeat2 } from 'lucide-react';
import type { Notification } from '@/lib/types';
import { timeAgoHindi } from '@/lib/notificationApi';

interface NotificationToastProps {
  notification: Notification;
  onClose: () => void;
  onClick: () => void;
}

export default function NotificationToast({ notification, onClose, onClick }: NotificationToastProps) {
  useEffect(() => {
    const timer = setTimeout(onClose, 4000);
    return () => clearTimeout(timer);
  }, [onClose]);

  const icon = getIcon(notification.type);
  const text = getText(notification);

  return (
    <div
      onClick={onClick}
      className="fixed bottom-20 md:bottom-4 right-4 z-50 w-80 max-w-[calc(100vw-2rem)] bg-white dark:bg-navy-200 rounded-2xl border border-gray-200 dark:border-navy-300 shadow-xl p-3 flex items-center gap-3 cursor-pointer animate-slideUp"
    >
      <div className="relative flex-shrink-0">
        <img
          src={notification.actor?.avatar_url || `https://ui-avatars.com/api/?name=${notification.actor?.full_name || 'U'}`}
          alt=""
          className="h-10 w-10 rounded-full object-cover"
        />
        <div className="absolute -bottom-1 -right-1 h-5 w-5 rounded-full bg-white dark:bg-navy-200 flex items-center justify-center">
          {icon}
        </div>
      </div>
      <div className="flex-1 min-w-0">
        <p className="text-sm text-gray-900 dark:text-white">
          <span className="font-bold">{notification.actor?.full_name}</span>{' '}
          <span className="text-gray-600 dark:text-gray-300">{text}</span>
        </p>
        <p className="text-xs text-gray-400 mt-0.5">{timeAgoHindi(notification.created_at)}</p>
      </div>
      <button
        onClick={(e) => {
          e.stopPropagation();
          onClose();
        }}
        className="text-gray-400 hover:text-gray-600 flex-shrink-0"
      >
        <X className="h-4 w-4" />
      </button>
    </div>
  );
}

function getIcon(type: string) {
  switch (type) {
    case 'like':
      return <Heart className="h-3 w-3 fill-coral-500 text-coral-500" />;
    case 'comment':
      return <MessageCircle className="h-3 w-3 text-brand-500" />;
    case 'follow':
      return <UserPlus className="h-3 w-3 text-brand-500" />;
    case 'mention':
      return <AtSign className="h-3 w-3 text-green-500" />;
    case 'message':
      return <Send className="h-3 w-3 text-brand-500" />;
    case 'echo':
      return <Repeat2 className="h-3 w-3 text-coral-500" />;
    default:
      return <MessageCircle className="h-3 w-3 text-gray-400" />;
  }
}

function getText(n: Notification): string {
  switch (n.type) {
    case 'like':
      return 'ने आपकी post like की';
    case 'comment':
      return `ने comment किया: "${n.preview_text || ''}"`;
    case 'follow':
      return 'ने आपको follow करना शुरू किया';
    case 'mention':
      return 'ने आपको mention किया';
    case 'message':
      return 'ने आपको message भेजा';
    case 'echo':
      return 'ने आपकी post echo की';
    default:
      return '';
  }
}
