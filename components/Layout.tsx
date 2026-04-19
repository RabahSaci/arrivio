
import React, { useState, useEffect } from 'react';
import { UserRole, Notification as AppNotification, NotificationType, WorkflowTask, TaskStatus } from '../types';
import { ROLE_LABELS } from '../constants';
import { apiService } from '../services/apiService';
import NotificationCenter from './NotificationCenter';
import { 
  Users, 
  LayoutDashboard, 
  Share2, 
  LogOut,
  CalendarDays,
  Bell,
  BellRing,
  BellOff,
  CalendarRange,
  UserCheck,
  History,
  Receipt,
  Target,
  Sparkles,
  ShieldCheck,
  Building2,
  Key,
  X,
  Loader2,
  CheckCircle2,
  AlertCircle,
  Eye,
  EyeOff,
  FileDown,
  Settings,
  MessageSquare,
  Zap,
  ZapOff,
  ClipboardList
} from 'lucide-react';

interface LayoutProps {
  children: React.ReactNode;
  activeRole: UserRole;
  onRoleChange: (role: UserRole) => void;
  activeTab: string;
  setActiveTab: (tab: string) => void;
  onLogout: () => void;
  notifications: AppNotification[];
  onClearNotification: (id: string) => void;
  onClearAllNotifications: () => void;
  onNotificationSelect: (notif: AppNotification) => void;
  currentUserId: string;
  tasks?: WorkflowTask[];
}

const Layout: React.FC<LayoutProps> = ({ 
  children, 
  activeRole, 
  activeTab, 
  setActiveTab, 
  onLogout,
  notifications,
  onClearNotification,
  onClearAllNotifications,
  onNotificationSelect,
  currentUserId,
  tasks = []
}) => {
  const [isNotifOpen, setIsNotifOpen] = useState(false);
  const [isPasswordModalOpen, setIsPasswordModalOpen] = useState(false);
  const [currentPassword, setCurrentPassword] = useState('');
  const [newPassword, setNewPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const [isChanging, setIsChanging] = useState(false);
  const [changeStatus, setChangeStatus] = useState<'idle' | 'success' | 'error'>('idle');
  const [errorMessage, setErrorMessage] = useState('');
  const [showCurrent, setShowCurrent] = useState(false);
  const [logoError, setLogoError] = useState(false);
  const [customLogoUrl, setCustomLogoUrl] = useState<string | null>(null);
  const [unreadMessages, setUnreadMessages] = useState(0);
  const [pushEnabled, setPushEnabled] = useState(true);
  
  // Push Notifications State
  const [pushPermission, setPushPermission] = useState<NotificationPermission>('default');

  useEffect(() => {
    const handleFocus = () => {
      if ("Notification" in window) {
        setPushPermission(Notification.permission);
      }
    };

    if ("Notification" in window) {
      setPushPermission(Notification.permission);
      window.addEventListener('focus', handleFocus);
    }
    
    // Fetch custom logo
    const fetchLogo = async () => {
      try {
        const data = await apiService.fetchTable('app_settings');
        const settings = Array.isArray(data) ? data[0] : data;
        if (settings?.logoUrl) setCustomLogoUrl(settings.logoUrl);
      } catch (e) {
        // Ignore if table doesn't exist yet
      }
    };
    fetchLogo();

    return () => {
      window.removeEventListener('focus', handleFocus);
    };
  }, []);

  useEffect(() => {
    if (!currentUserId) return;
    
    const fetchUnread = async () => {
      try {
        const msgs = await apiService.fetchTable('messages');
        const unreadCount = (msgs || []).filter((m: any) => m.receiverId === currentUserId && !m.isRead).length;
        setUnreadMessages(unreadCount);
      } catch (e) {
        console.warn("Erreur messages unread", e);
      }
    };

    fetchUnread();

    // To comply with "no direct communication", we use polling (10s) instead of Supabase Realtime
    const interval = setInterval(fetchUnread, 10000);

    // Listen for local updates from Messaging component
    const handleMessageRead = () => fetchUnread();
    window.addEventListener('message_read', handleMessageRead);

    return () => {
      clearInterval(interval);
      window.removeEventListener('message_read', handleMessageRead);
    };
  }, [currentUserId]);

  // Déclencher une notification native quand une nouvelle notification arrive
  useEffect(() => {
    if (notifications.length > 0 && pushPermission === 'granted' && pushEnabled) {
      const lastNotif = notifications[0];
      if (!lastNotif.isRead) {
        new Notification(`Arrivio : ${lastNotif.title}`, {
          body: lastNotif.message,
          icon: '/favicon.ico' // Optionnel
        });
      }
    }
  }, [notifications, pushPermission, pushEnabled]);

  const requestNotificationPermission = async () => {
    if (!("Notification" in window)) {
      alert("Ce navigateur ne supporte pas les notifications de bureau.");
      return;
    }
    
    // Si déjà refusé, on ne peut pas redemander via JS, il faut guider l'utilisateur
    if (pushPermission === 'denied') {
      alert("Les notifications sont bloquées par votre navigateur. Veuillez les activer dans les paramètres de votre navigateur pour ce site.");
      return;
    }
    
    if (pushPermission === 'granted') {
      // Toggle simple si déjà autorisé
      setPushEnabled(!pushEnabled);
      return;
    }

    // Demander la permission si c'est la première fois (default)
    try {
      const permission = await Notification.requestPermission();
      setPushPermission(permission);
      
      if (permission === 'granted') {
        setPushEnabled(true);
        new Notification("Notifications activées", {
          body: "Vous recevrez désormais les alertes de suivi de dossiers en temps réel.",
          silent: false
        });
      } else if (permission === 'denied') {
        alert("Vous avez refusé les notifications. Vous pouvez changer cela dans les paramètres de votre navigateur.");
      }
    } catch (err) {
      console.error("Erreur lors de la demande de permission de notification:", err);
    }
  };

  const unreadCount = notifications.filter(n => !n.isRead).length;

  const menuItems = [
    { id: 'dashboard', label: 'Tableau de bord', icon: LayoutDashboard, roles: [UserRole.ADVISOR, UserRole.MANAGER, UserRole.ADMIN] },
    { id: 'tasks', label: 'Mes tâches', icon: ClipboardList, roles: [UserRole.ADVISOR, UserRole.ADMIN] },
    { id: 'clients', label: 'Gestion Clients', icon: Users, roles: [UserRole.ADVISOR, UserRole.ADMIN, UserRole.PARTNER] },
    { id: 'jobmatching', label: 'Matching Emploi', icon: Target, roles: [UserRole.ADVISOR, UserRole.MANAGER, UserRole.ADMIN] },
    { id: 'activitymatching', label: 'Matching Activités', icon: Sparkles, roles: [UserRole.ADVISOR, UserRole.MANAGER, UserRole.ADMIN] },
    { id: 'sessions', label: 'Séances', icon: CalendarDays, roles: [UserRole.ADVISOR, UserRole.ADMIN] },
    { id: 'calendar', label: 'Calendrier', icon: CalendarRange, roles: [UserRole.ADVISOR, UserRole.MANAGER, UserRole.ADMIN] },
    { id: 'payments', label: 'Contrats & Paiements', icon: Receipt, roles: [UserRole.ADMIN] },
    { id: 'referrals', label: 'Référencements', icon: Share2, roles: [UserRole.ADVISOR, UserRole.PARTNER, UserRole.ADMIN] },
    { id: 'reports', label: 'Rapports & Exports', icon: FileDown, roles: [UserRole.ADVISOR, UserRole.PARTNER, UserRole.ADMIN] },
    { id: 'partners', label: 'Partenaires', icon: Building2, roles: [UserRole.ADMIN, UserRole.MANAGER, UserRole.ADVISOR] },
    { id: 'mentors', label: 'Base Mentors', icon: UserCheck, roles: [UserRole.ADVISOR, UserRole.PARTNER, UserRole.ADMIN] },
    { id: 'accounts', label: 'Comptes Utilisateurs', icon: ShieldCheck, roles: [UserRole.ADMIN] },
    { id: 'logs', label: 'Audit & Traçabilité', icon: History, roles: [UserRole.ADMIN, UserRole.MANAGER, UserRole.ADVISOR, UserRole.PARTNER, UserRole.MENTOR] },
    { id: 'settings', label: 'Paramètres', icon: Settings, roles: [UserRole.ADMIN] },
  ];

  const filteredMenuItems = menuItems.filter(item => item.roles.includes(activeRole));

  const handleChangePassword = async (e: React.FormEvent) => {
    e.preventDefault();
    setErrorMessage('');
    setChangeStatus('idle');

    if (newPassword !== confirmPassword) {
      setChangeStatus('error');
      setErrorMessage('Les nouveaux mots de passe ne correspondent pas.');
      return;
    }
    if (newPassword.length < 6) {
      setChangeStatus('error');
      setErrorMessage('Le nouveau mot de passe doit contenir au moins 6 caractères.');
      return;
    }

    setIsChanging(true);
    
    try {
      await apiService.updatePassword(currentPassword, newPassword);

      setChangeStatus('success');
      setCurrentPassword('');
      setNewPassword('');
      setConfirmPassword('');
      setTimeout(() => {
        setIsPasswordModalOpen(false);
        setChangeStatus('idle');
      }, 2000);
    } catch (err: any) {
      setChangeStatus('error');
      setErrorMessage(err.message || "Une erreur est survenue lors de l'envoi de l'email.");
    } finally {
      setIsChanging(false);
    }
  };

  return (
    <div className="flex min-h-screen bg-slate-50">
      {/* Sidebar - SLDS Theme */}
      <aside className="w-64 flex flex-col fixed h-full z-20">
        {/* Logo Container */}
        <div className="pt-6 px-8 pb-4 flex flex-col items-center justify-center">
          {customLogoUrl ? (
            <img 
              src={customLogoUrl} 
              alt="Arrivio Logo" 
              className="h-24 w-auto max-w-full object-contain drop-shadow-sm" 
              onError={() => setCustomLogoUrl(null)}
            />
          ) : !logoError ? (
            <img 
              src="logo.png" 
              alt="Arrivio Logo" 
              className="h-24 w-auto max-w-full object-contain drop-shadow-sm" 
              onError={() => setLogoError(true)}
            />
          ) : (
            <div className="flex flex-col items-center gap-2">
              <div className="w-10 h-10 bg-slds-brand rounded-xl flex items-center justify-center font-black text-white text-lg shadow-lg shadow-slds-brand/20">A</div>
              <span className="text-xl font-black tracking-tighter uppercase text-slate-900">Arrivio</span>
            </div>
          )}
        </div>

        <div className="px-4 flex-1 overflow-y-auto scrollbar-hide py-4">
          <nav className="space-y-1">
            {filteredMenuItems.map((item) => (
              <button
                key={item.id}
                onClick={() => setActiveTab(item.id)}
                className={`w-full flex items-center justify-between px-4 py-3 rounded-xl text-sm font-bold transition-all ${
                  activeTab === item.id 
                    ? 'bg-slds-brand text-white shadow-lg shadow-slds-brand/20' 
                    : 'text-slate-500 hover:bg-slate-50 hover:text-slds-brand'
                }`}
              >
                <div className="flex items-center gap-3">
                  <div className="relative">
                    <item.icon size={18} />
                    {item.id === 'tasks' && tasks.filter(t => t.status === TaskStatus.PENDING && (activeRole === UserRole.ADMIN || t.assignedToId === currentUserId)).length > 0 && (
                      <span className="absolute -top-1.5 -right-1.5 w-4 h-4 bg-red-500 text-white text-[8px] flex items-center justify-center rounded-full border-2 border-white">
                        {tasks.filter(t => t.status === TaskStatus.PENDING && (activeRole === UserRole.ADMIN || t.assignedToId === currentUserId)).length}
                      </span>
                    )}
                  </div>
                  {item.label}
                </div>
              </button>
            ))}
          </nav>
        </div>
      </aside>

      {/* Modale de changement de mot de passe */}
      {isPasswordModalOpen && (
        <div className="fixed inset-0 bg-slate-900/60 backdrop-blur-sm z-[300] flex items-center justify-center p-4 animate-in fade-in duration-200">
          <div className="bg-white rounded-[40px] w-full max-w-md shadow-2xl overflow-hidden animate-in zoom-in-95 duration-200">
            <div className="p-8 border-b border-slate-100 flex justify-between items-center bg-slate-50/50">
              <div className="flex items-center gap-4">
                <div className="p-3 rounded-2xl bg-slds-brand text-white shadow-lg shadow-slds-brand/20">
                  <Key size={24} />
                </div>
                <div>
                  <h3 className="text-xl font-black text-slate-900 tracking-tight">Sécurité du compte</h3>
                  <p className="text-[10px] text-slate-400 font-bold uppercase tracking-widest">Mettre à jour vos accès</p>
                </div>
              </div>
              <button 
                onClick={() => setIsPasswordModalOpen(false)}
                className="p-3 hover:bg-slate-100 rounded-full text-slate-400 transition-colors"
              >
                <X size={20} />
              </button>
            </div>

            <form onSubmit={handleChangePassword} className="p-8 space-y-6">
              {changeStatus === 'success' && (
                <div className="p-4 bg-emerald-50 border border-emerald-100 rounded-2xl flex items-center gap-3 text-emerald-600 animate-in slide-in-from-top-2">
                  <CheckCircle2 size={20} />
                  <p className="text-xs font-bold uppercase tracking-widest">Mot de passe mis à jour !</p>
                </div>
              )}

              {changeStatus === 'error' && (
                <div className="p-4 bg-red-50 border border-red-100 rounded-2xl flex items-start gap-3 text-red-600 animate-in slide-in-from-top-1">
                  <AlertCircle size={20} className="shrink-0 mt-0.5" />
                  <p className="text-xs font-bold leading-relaxed">{errorMessage}</p>
                </div>
              )}

              <div className="space-y-4">
                <div className="space-y-1.5">
                  <label className="text-[10px] font-black text-slate-400 uppercase tracking-widest ml-1">Mot de passe actuel</label>
                  <div className="relative">
                    <input 
                      type={showCurrent ? "text" : "password"} 
                      required 
                      value={currentPassword}
                      onChange={(e) => setCurrentPassword(e.target.value)}
                      className="w-full px-4 py-3 bg-slate-50 border border-slate-200 rounded-2xl outline-none focus:ring-4 focus:ring-blue-500/10 focus:border-blue-600 transition-all font-bold text-slate-700" 
                      placeholder="Votre mot de passe actuel"
                    />
                    <button 
                      type="button" 
                      onClick={() => setShowCurrent(!showCurrent)}
                      className="absolute right-4 top-1/2 -translate-y-1/2 text-slate-400 hover:text-slate-600"
                    >
                      {showCurrent ? <EyeOff size={16} /> : <Eye size={16} />}
                    </button>
                  </div>
                </div>

                <div className="h-px bg-slate-100 my-2" />

                <div className="space-y-1.5">
                  <label className="text-[10px] font-black text-slate-400 uppercase tracking-widest ml-1">Nouveau mot de passe</label>
                  <input 
                    type="password" 
                    required 
                    value={newPassword}
                    onChange={(e) => setNewPassword(e.target.value)}
                    className="w-full px-4 py-3 bg-slate-50 border border-slate-200 rounded-2xl outline-none focus:ring-4 focus:ring-blue-500/10 focus:border-blue-600 transition-all font-bold text-slate-700" 
                    placeholder="Minimum 6 caractères"
                  />
                </div>
                <div className="space-y-1.5">
                  <label className="text-[10px] font-black text-slate-400 uppercase tracking-widest ml-1">Confirmer le nouveau mot de passe</label>
                  <input 
                    type="password" 
                    required 
                    value={confirmPassword}
                    onChange={(e) => setConfirmPassword(e.target.value)}
                    className="w-full px-4 py-3 bg-slate-50 border border-slate-200 rounded-2xl outline-none focus:ring-4 focus:ring-blue-500/10 focus:border-blue-600 transition-all font-bold text-slate-700" 
                    placeholder="Répétez le nouveau mot de passe"
                  />
                </div>
              </div>

              <div className="flex flex-col gap-3 pt-4">
                <button 
                  type="submit" 
                  disabled={isChanging || changeStatus === 'success'}
                  className="w-full py-4 bg-slds-brand text-white rounded-2xl text-[11px] font-black uppercase tracking-widest shadow-xl shadow-slds-brand/20 hover:bg-slds-brand-dark transition-all flex items-center justify-center gap-2 disabled:opacity-50"
                >
                  {isChanging ? <Loader2 size={16} className="animate-spin" /> : <ShieldCheck size={16} />}
                  Confirmer le changement
                </button>
                <button 
                  type="button"
                  onClick={() => setIsPasswordModalOpen(false)}
                  className="w-full py-4 text-[10px] font-black text-slate-400 uppercase tracking-widest hover:text-slate-800 transition-colors"
                >
                  Annuler
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      <main className="flex-1 ml-64 p-8">
        <header className="sticky top-8 mb-8 flex justify-between items-center bg-white/80 backdrop-blur-md p-4 px-6 rounded-[32px] border border-slate-200 shadow-sm z-50">
          <div className="flex items-center gap-4">
             <div className="relative">
                <button onClick={() => setIsNotifOpen(!isNotifOpen)} className={`p-2.5 rounded-xl transition-all ${isNotifOpen ? 'bg-slds-brand text-white shadow-lg' : 'bg-slate-100 text-slate-500 hover:bg-slate-200'}`}>
                  <Bell size={20} />
                  {unreadCount > 0 && <span className="absolute -top-1 -right-1 w-5 h-5 bg-slds-error text-white text-[10px] font-black border-2 border-white rounded-full flex items-center justify-center animate-bounce">{unreadCount}</span>}
                </button>
                <NotificationCenter 
                  notifications={notifications}
                  isOpen={isNotifOpen}
                  onClose={() => setIsNotifOpen(false)}
                  onMarkRead={onClearNotification}
                  onMarkAllRead={onClearAllNotifications}
                  onSelect={onNotificationSelect}
                />
             </div>
             
             <div className="relative">
                <button 
                  onClick={() => setActiveTab('messaging')} 
                  className={`p-2.5 rounded-xl transition-all ${activeTab === 'messaging' ? 'bg-slds-brand text-white shadow-lg' : 'bg-slate-100 text-slate-500 hover:bg-slate-200'}`}
                >
                  <MessageSquare size={20} />
                  {unreadMessages > 0 && <span className="absolute -top-1 -right-1 w-5 h-5 bg-slds-brand text-white text-[10px] font-black border-2 border-white rounded-full flex items-center justify-center animate-bounce">{unreadMessages}</span>}
                </button>
             </div>

             <div className="h-8 w-px bg-slate-100 mx-2" />

             <button 
               onClick={requestNotificationPermission}
               className={`p-2.5 rounded-xl transition-all ${pushPermission === 'granted' && pushEnabled ? 'text-amber-500 bg-amber-50 shadow-sm' : 'bg-slate-100 text-slate-500 hover:bg-slate-200'}`}
               title={pushPermission === 'granted' && pushEnabled ? 'Désactiver les alertes' : 'Activer les alertes'}
             >
               {pushPermission === 'granted' && pushEnabled ? <Zap size={20} /> : <ZapOff size={20} />}
             </button>

             <button 
               onClick={() => setIsPasswordModalOpen(true)}
               className="p-2.5 bg-slate-100 text-slate-500 hover:bg-slate-200 rounded-xl transition-all"
               title="Sécurité"
             >
               <Key size={20} />
             </button>

             {[UserRole.ADVISOR, UserRole.ADMIN].includes(activeRole) && (
               <button 
                 onClick={() => setActiveTab('logs')}
                 className={`p-2.5 rounded-xl transition-all ${activeTab === 'logs' ? 'bg-slds-brand text-white shadow-lg' : 'bg-slate-100 text-slate-500 hover:bg-slate-200'}`}
                 title="Journal d'activité"
               >
                 <History size={20} />
               </button>
             )}

             <div className="h-8 w-px bg-slate-100 mx-2" />

             <button 
               onClick={onLogout}
               className="p-2.5 bg-red-50 text-red-500 hover:bg-red-100 rounded-xl transition-all"
               title="Déconnexion"
             >
               <LogOut size={20} />
             </button>

             <div className="h-8 w-px bg-slate-100 mx-2" />

             <div>
                <h1 className="text-lg font-black text-slate-900 leading-none">
                  {activeTab === 'messaging' ? 'Messagerie' : 
                   activeTab === 'logs' ? 'Audit & Traçabilité' : 
                   menuItems.find(i => i.id === activeTab)?.label}
                </h1>
                <p className="text-slate-400 text-[10px] font-bold uppercase tracking-wider mt-1.5">Espace {ROLE_LABELS[activeRole]}</p>
             </div>
          </div>
        </header>
        <div className="animate-in fade-in slide-in-from-bottom-4 duration-700">{children}</div>
      </main>
    </div>
  );
};

export default Layout;
