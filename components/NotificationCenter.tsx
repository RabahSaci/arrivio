
import React from 'react';
import { Notification, NotificationType } from '../types';
import { Bell, X, Check, Share2, Calendar, ShieldCheck, Info, CheckCircle2, AlertTriangle } from 'lucide-react';

interface NotificationCenterProps {
  notifications: Notification[];
  isOpen: boolean;
  onClose: () => void;
  onMarkRead: (id: string) => void;
  onMarkAllRead: () => void;
  onSelect: (notif: Notification) => void;
}

const NotificationCenter: React.FC<NotificationCenterProps> = ({ 
  notifications, 
  isOpen, 
  onClose, 
  onMarkRead, 
  onMarkAllRead,
  onSelect
}) => {
  if (!isOpen) return null;

  const getIcon = (type: NotificationType, title: string) => {
    const isUrgent = title.toLowerCase().includes('urgent');
    
    switch (type) {
      case NotificationType.REFERRAL: 
        return isUrgent ? <AlertTriangle className="text-red-500" size={16} /> : <Share2 className="text-blue-500" size={16} />;
      case NotificationType.SESSION: return <Calendar className="text-amber-500" size={16} />;
      case NotificationType.SUCCESS: return <CheckCircle2 className="text-emerald-500" size={16} />;
      default: return <Info className="text-slate-400" size={16} />;
    }
  };

  const unreadCount = notifications.filter(n => !n.isRead).length;

  return (
    <div className="absolute left-0 mt-4 w-80 md:w-[400px] bg-white rounded-[32px] shadow-2xl border border-slate-200 z-[100] animate-in slide-in-from-top-2 duration-300 overflow-hidden ring-1 ring-slate-900/5">
      <div className="p-6 border-b border-slate-100 bg-slate-50/50 flex justify-between items-center">
        <div>
          <h3 className="text-sm font-black text-slate-900 uppercase tracking-tight">Centre d'Alertes</h3>
          <p className="text-[10px] text-slate-400 font-bold uppercase tracking-widest mt-0.5">
            {unreadCount} message{unreadCount > 1 ? 's' : ''} non lu{unreadCount > 1 ? 's' : ''}
          </p>
        </div>
        <div className="flex gap-2">
          {unreadCount > 0 && (
            <button 
              onClick={onMarkAllRead}
              className="p-2.5 text-slate-400 hover:text-blue-600 hover:bg-white rounded-xl transition-all"
              title="Tout marquer comme lu"
            >
              <Check size={18} />
            </button>
          )}
          <button onClick={onClose} className="p-2.5 text-slate-400 hover:text-slate-900 hover:bg-white rounded-xl transition-all">
            <X size={18} />
          </button>
        </div>
      </div>

      <div className="max-h-[450px] overflow-y-auto scrollbar-hide">
        {notifications.length > 0 ? (
          notifications.map((notif) => (
            <div 
              key={notif.id}
              onClick={() => {
                onSelect(notif);
                onMarkRead(notif.id);
              }}
              className={`p-5 border-b border-slate-50 last:border-0 hover:bg-slate-50 transition-all cursor-pointer relative group ${!notif.isRead ? 'bg-blue-50/20' : ''}`}
            >
              {!notif.isRead && (
                <div className="absolute left-1.5 top-1/2 -translate-y-1/2 w-1 h-10 bg-blue-600 rounded-full shadow-[0_0_8px_rgba(37,99,235,0.4)]" />
              )}
              <div className="flex gap-4">
                <div className={`w-10 h-10 rounded-2xl flex items-center justify-center shrink-0 transition-all ${!notif.isRead ? 'bg-white shadow-md scale-105 border border-slate-100' : 'bg-slate-100 opacity-60'}`}>
                  {getIcon(notif.type, notif.title)}
                </div>
                <div className="flex-1 min-w-0">
                  <div className="flex justify-between items-start gap-2 mb-1">
                    <p className={`text-xs font-black truncate leading-tight uppercase tracking-tight ${!notif.isRead ? 'text-slate-900' : 'text-slate-400'}`}>
                      {notif.title}
                    </p>
                    <span className="text-[9px] text-slate-400 font-bold whitespace-nowrap bg-slate-50 px-1.5 py-0.5 rounded uppercase">
                      {new Date(notif.timestamp).toLocaleTimeString('fr-FR', { hour: '2-digit', minute: '2-digit' })}
                    </span>
                  </div>
                  <p className={`text-[11px] leading-relaxed line-clamp-3 ${!notif.isRead ? 'text-slate-600 font-medium' : 'text-slate-400 italic'}`}>
                    {notif.message}
                  </p>
                  {!notif.isRead && notif.type === NotificationType.REFERRAL && (
                    <div className="mt-3 flex items-center gap-1.5 text-[9px] font-black text-blue-600 uppercase tracking-widest">
                      <Share2 size={10} /> Cliquer pour agir
                    </div>
                  )}
                </div>
              </div>
            </div>
          ))
        ) : (
          <div className="py-20 text-center flex flex-col items-center gap-3">
            <div className="p-5 bg-slate-50 rounded-full text-slate-200">
              <Bell size={40} strokeWidth={1.5} />
            </div>
            <div>
              <p className="text-xs font-black text-slate-400 uppercase tracking-widest">Tout est à jour</p>
              <p className="text-[10px] text-slate-300 font-medium mt-1">Aucune nouvelle alerte pour le moment.</p>
            </div>
          </div>
        )}
      </div>
      
      <div className="p-4 bg-slate-50/50 border-t border-slate-100 text-center">
        <button className="text-[10px] font-black text-slate-400 hover:text-blue-600 uppercase tracking-widest transition-all">
          Accéder à l'historique complet
        </button>
      </div>
    </div>
  );
};

export default NotificationCenter;
