
import React, { useState, useMemo } from 'react';
import { Session, SessionType, SessionCategory, FacilitatorType, Client, Partner, PartnerType, Contract, UserRole } from '../types';
import { SESSION_TYPE_LABELS } from '../constants';
import ConfirmModal from '../components/ConfirmModal';
import { 
  CalendarDays, 
  ChevronLeft, 
  ChevronRight, 
  Filter, 
  UserCog, 
  UserCheck, 
  Plus, 
  X,
  Video,
  Languages,
  Trash2,
  Edit2,
  User,
  FileText,
  Clock,
  MapPin,
  Info,
  CheckCircle2
} from 'lucide-react';

interface CalendarViewProps {
  clients: Client[];
  sessions: Session[];
  partners: Partner[];
  contracts: Contract[];
  activeRole: UserRole;
  currentUserName: string;
  onAddSession: (session: Session) => void;
  onUpdateSession?: (session: Session) => void;
  onDeleteSession?: (sessionId: string) => void;
}

const CalendarView: React.FC<CalendarViewProps> = ({ clients, sessions, partners, contracts, activeRole, currentUserName, onAddSession, onUpdateSession, onDeleteSession }) => {
  const [currentMonth, setCurrentMonth] = useState(new Date());
  const [showAddModal, setShowAddModal] = useState(false);
  const [viewingSession, setViewingSession] = useState<Session | null>(null);
  const [isEditing, setIsEditing] = useState(false);
  const [sessionToDelete, setSessionToDelete] = useState<string | null>(null);
  const [selectedDate, setSelectedDate] = useState('');
  
  const [formFacilitatorType, setFormFacilitatorType] = useState<FacilitatorType>(FacilitatorType.CONSULTANT);
  const [selectedConsultantName, setSelectedConsultantName] = useState<string>('');
  const [selectedContractId, setSelectedContractId] = useState<string>('');
  const [formDate, setFormDate] = useState<string>('');

  const [filterService, setFilterService] = useState<SessionType | 'ALL'>('ALL');
  const [filterAdvisor, setFilterAdvisor] = useState<string>('ALL');

  const isAdminOrManager = activeRole === UserRole.ADMIN || activeRole === UserRole.MANAGER;

  const advisors = useMemo(() => Array.from(new Set(sessions.map(s => s.advisorName))), [sessions]);

  const availableFacilitators = useMemo(() => {
    console.info(`[CalendarView] Total partners received: ${partners.length}`);
    console.info(`[CalendarView] Partner types:`, partners.map(p => `${p.name}=${p.type}`).join(', '));
    if (formFacilitatorType === FacilitatorType.CONSULTANT) {
      const result = partners.filter(p => p.type === PartnerType.CONSULTANT);
      console.info(`[CalendarView] CONSULTANT facilitators found: ${result.length}`);
      return result;
    } else {
      return partners.filter(p => p.type === PartnerType.INTERNAL || p.type === PartnerType.EXTERNAL);
    }
  }, [partners, formFacilitatorType]);

  const activeContractsForConsultant = useMemo(() => {
    if (!selectedConsultantName || formFacilitatorType !== FacilitatorType.CONSULTANT) return [];
    
    // Filtrer les contrats actifs
    const relevantContracts = contracts.filter(c => c.consultantName === selectedConsultantName && c.status === 'ACTIVE');
    
    // Recalculer dynamiquement l'utilisation pour correspondre au module Contrats & Paiements
    return relevantContracts.map(c => {
      const actualUsed = sessions.filter(s => s.contractId === c.id).length;
      return { ...c, usedSessions: actualUsed };
    });
  }, [contracts, sessions, selectedConsultantName, formFacilitatorType]);

  const validationError = useMemo(() => {
    if (formFacilitatorType !== FacilitatorType.CONSULTANT || !selectedContractId) return null;
    
    const contract = activeContractsForConsultant.find(c => c.id === selectedContractId);
    if (!contract) return null;

    // Quota check
    if (contract.usedSessions >= contract.totalSessions) {
      return `Attention : Le quota de ce contrat est atteint (${contract.usedSessions}/${contract.totalSessions}).`;
    }

    // Date check
    if (formDate) {
      if (formDate < contract.startDate || formDate > contract.endDate) {
        return `Date invalide : La séance doit avoir lieu entre le ${new Date(contract.startDate + 'T12:00:00').toLocaleDateString('fr-FR')} et le ${new Date(contract.endDate + 'T12:00:00').toLocaleDateString('fr-FR')}.`;
      }
    }

    return null;
  }, [selectedContractId, formDate, activeContractsForConsultant]);

  const filteredSessions = useMemo(() => {
    return sessions.filter(s => {
      const isGroup = s.category === SessionCategory.GROUP;
      if (!isGroup) return false;
      const matchService = filterService === 'ALL' || s.type === filterService;
      const matchAdvisor = filterAdvisor === 'ALL' || s.advisorName === filterAdvisor;
      return matchService && matchAdvisor;
    });
  }, [sessions, filterService, filterAdvisor]);

  const stats = useMemo(() => {
    const todayStr = new Date().toLocaleDateString('en-CA'); // YYYY-MM-DD Local
    const delivered = filteredSessions.filter(s => s.date < todayStr).length;
    const planned = filteredSessions.filter(s => s.date >= todayStr).length;
    return { total: filteredSessions.length, delivered, planned };
  }, [filteredSessions]);

  const calendarDays = useMemo(() => {
    const year = currentMonth.getFullYear();
    const month = currentMonth.getMonth();
    const firstDayOfMonth = new Date(year, month, 1).getDay();
    const daysInMonth = new Date(year, month + 1, 0).getDate();
    const startOffset = firstDayOfMonth === 0 ? 6 : firstDayOfMonth - 1;
    const days = [];
    for (let i = 0; i < startOffset; i++) days.push(null);
    for (let i = 1; i <= daysInMonth; i++) days.push(new Date(year, month, i));
    return days;
  }, [currentMonth]);

  // Helper pour obtenir la date locale au format YYYY-MM-DD
  const getLocalDateString = (date: Date) => {
    const year = date.getFullYear();
    const month = String(date.getMonth() + 1).padStart(2, '0');
    const day = String(date.getDate()).padStart(2, '0');
    return `${year}-${month}-${day}`;
  };

  const getSessionsForDay = (date: Date) => {
    const dateStr = getLocalDateString(date);
    return filteredSessions.filter(s => s.date === dateStr);
  };

  const getSessionStyle = (type: SessionType) => {
    switch(type) {
      case SessionType.RTCE: return 'bg-purple-500';
      case SessionType.EMPLOYMENT: return 'bg-blue-600';
      case SessionType.ESTABLISHMENT: return 'bg-emerald-500';
      case SessionType.COMMUNITY_CONNECTION: return 'bg-indigo-600';
      default: return 'bg-slate-500';
    }
  };

  const handleCreateSession = (e: React.FormEvent<HTMLFormElement>) => {
    e.preventDefault();
    const formData = new FormData(e.currentTarget);
    const facilitatorName = formData.get('facilitatorName') as string;
    const facilitatorType = formData.get('facilitatorType') as FacilitatorType;
    const contractId = formData.get('contractId') as string;

    if (facilitatorType === FacilitatorType.CONSULTANT && !contractId) {
      alert("Veuillez sélectionner un contrat.");
      return;
    }
    
    const newSession: Session = {
      id: Date.now().toString(),
      title: formData.get('title') as string,
      type: formData.get('type') as SessionType,
      category: SessionCategory.GROUP,
      date: formData.get('date') as string,
      startTime: formData.get('startTime') as string,
      duration: parseInt(formData.get('duration') as string),
      participantIds: [], 
      noShowIds: [], 
      location: formData.get('location') as string,
      notes: '', 
      facilitatorName: facilitatorName,
      facilitatorType: facilitatorType,
      contractId: contractId || undefined,
      advisorName: currentUserName,
      zoomLink: formData.get('zoomLink') as string,
      needsInterpretation: formData.get('needsInterpretation') === 'true',
      invoiceReceived: false,
      invoiceSubmitted: false,
      invoicePaid: false,
    };

    onAddSession(newSession);
    setShowAddModal(false);
  };

  const handleUpdateSessionInternal = (e: React.FormEvent<HTMLFormElement>) => {
    e.preventDefault();
    if (!viewingSession || !onUpdateSession) return;
    const formData = new FormData(e.currentTarget);
    onUpdateSession({
      ...viewingSession,
      title: formData.get('title') as string,
      date: formData.get('date') as string,
      startTime: formData.get('startTime') as string,
      location: formData.get('location') as string,
      zoomLink: formData.get('zoomLink') as string,
    });
    setViewingSession(null);
    setIsEditing(false);
  };

  // Comparaison robuste pour les droits d'auteur
  const checkCanModify = (session: Session) => {
    if (isAdminOrManager) return true;
    if (!currentUserName || !session.advisorName) return false;
    return session.advisorName.trim().toLowerCase() === currentUserName.trim().toLowerCase();
  };

  return (
    <div className="space-y-4">
      {/* Stats KPI SLDS */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
        <div className="slds-card p-4">
          <p className="text-[10px] font-bold text-slds-text-secondary uppercase tracking-widest mb-1">Total Séances Groupe</p>
          <p className="text-2xl font-bold text-slds-text-primary">{stats.total}</p>
        </div>
        <div className="slds-card p-4">
          <p className="text-[10px] font-bold text-slds-success uppercase tracking-widest mb-1">Livrées</p>
          <p className="text-2xl font-bold text-slds-text-primary">{stats.delivered}</p>
        </div>
        <div className="slds-card p-4">
          <p className="text-[10px] font-bold text-slds-brand uppercase tracking-widest mb-1">Prévues</p>
          <p className="text-2xl font-bold text-slds-text-primary">{stats.planned}</p>
        </div>
      </div>

      {/* Filtres SLDS */}
      <div className="slds-card p-4 flex flex-wrap gap-4 items-center">
        <div className="flex items-center gap-2">
          <Filter size={16} className="text-slds-text-secondary" />
          <span className="text-xs font-bold text-slds-text-secondary uppercase">Filtres :</span>
        </div>
        <select 
          className="slds-input py-1 px-2 text-xs w-auto"
          value={filterService}
          onChange={(e) => setFilterService(e.target.value as any)}
        >
          <option value="ALL">Tous les Services</option>
          {Object.values(SessionType).map(t => <option key={t} value={t}>{SESSION_TYPE_LABELS[t]}</option>)}
        </select>
        <select 
          className="slds-input py-1 px-2 text-xs w-auto"
          value={filterAdvisor}
          onChange={(e) => setFilterAdvisor(e.target.value)}
        >
          <option value="ALL">Tous les Conseillers</option>
          {advisors.map(a => <option key={a} value={a}>{a}</option>)}
        </select>
        <div className="ml-auto flex items-center gap-2">
           <button 
             onClick={() => { const d = getLocalDateString(new Date()); setSelectedDate(d); setFormDate(d); setShowAddModal(true); }}
             className="slds-button slds-button-brand"
           >
             <Plus size={14} className="mr-2" /> Planifier
           </button>
        </div>
      </div>

      {/* Calendrier Grid SLDS */}
      <div className="slds-card overflow-hidden">
        <div className="p-4 border-b border-slds-border flex items-center justify-between bg-slds-bg">
          <h2 className="text-lg font-bold text-slds-text-primary capitalize">
            {currentMonth.toLocaleString('fr-FR', { month: 'long', year: 'numeric' })}
          </h2>
          <div className="flex gap-2">
            <button onClick={() => setCurrentMonth(new Date(currentMonth.getFullYear(), currentMonth.getMonth() - 1, 1))} className="p-1.5 hover:bg-white rounded text-slds-text-secondary"><ChevronLeft size={20} /></button>
            <button onClick={() => setCurrentMonth(new Date())} className="px-3 py-1 text-xs font-bold text-slds-text-secondary hover:text-slds-brand">Aujourd'hui</button>
            <button onClick={() => setCurrentMonth(new Date(currentMonth.getFullYear(), currentMonth.getMonth() + 1, 1))} className="p-1.5 hover:bg-white rounded text-slds-text-secondary"><ChevronRight size={20} /></button>
          </div>
        </div>

        <div className="grid grid-cols-7 border-b border-slds-border bg-slds-bg">
          {['Lun', 'Mar', 'Mer', 'Jeu', 'Ven', 'Sam', 'Dim'].map(day => (
            <div key={day} className="py-2 text-center text-[10px] font-bold text-slds-text-secondary uppercase tracking-widest border-r border-slds-border last:border-0">{day}</div>
          ))}
        </div>

        <div className="grid grid-cols-7 auto-rows-[120px]">
          {calendarDays.map((date, idx) => {
            const daySessions = date ? getSessionsForDay(date) : [];
            const isToday = date && date.toDateString() === new Date().toDateString();
            return (
              <div 
                key={idx} 
                onDoubleClick={() => { if(date) { const d = getLocalDateString(date); setSelectedDate(d); setFormDate(d); setShowAddModal(true); } }}
                className={`border-r border-b border-slds-border p-1 relative transition-colors cursor-pointer select-none ${date ? 'bg-white hover:bg-slds-bg' : 'bg-slds-bg'} ${isToday ? 'bg-blue-50' : ''}`}
              >
                {date && (
                  <>
                    <span className={`text-[10px] font-bold mb-1 inline-block w-5 h-5 rounded-full flex items-center justify-center ${isToday ? 'bg-slds-brand text-white' : 'text-slds-text-secondary'}`}>
                      {date.getDate()}
                    </span>
                    <div className="space-y-0.5">
                      {daySessions.map(s => (
                        <div 
                          key={s.id}
                          onClick={(e) => { e.stopPropagation(); setViewingSession(s); setIsEditing(false); }}
                          className={`px-1 py-0.5 rounded text-white text-[8px] font-bold truncate relative ${getSessionStyle(s.type)} shadow-sm transition-transform hover:scale-[1.02] z-10`}
                        >
                          <span className="opacity-80 mr-1">{s.startTime}</span>
                          {s.title}
                        </div>
                      ))}
                    </div>
                  </>
                )}
              </div>
            );
          })}
        </div>
      </div>

      {/* Modale de Détails / Édition SLDS */}
      {viewingSession && (
        <div className="fixed inset-0 bg-black/50 z-[300] flex items-center justify-center p-4 animate-in fade-in duration-200">
          <div className="slds-card w-full max-w-xl shadow-2xl overflow-hidden animate-in zoom-in-95 duration-200">
             <div className="p-4 border-b border-slds-border flex justify-between items-center bg-slds-bg">
               <div className="flex items-center gap-3">
                 <div className={`p-2 rounded ${getSessionStyle(viewingSession.type)} text-white`}>
                   <CalendarDays size={20} />
                 </div>
                 <div>
                   <h3 className="text-base font-bold text-slds-text-primary">
                     {isEditing ? 'Modifier la séance' : viewingSession.title}
                   </h3>
                 </div>
               </div>
               <button onClick={() => setViewingSession(null)} className="p-2 hover:bg-white rounded text-slds-text-secondary"><X size={20} /></button>
             </div>

             <div className="p-6">
               {isEditing ? (
                 <form onSubmit={handleUpdateSessionInternal} className="space-y-4">
                    <div className="space-y-1">
                      <label className="text-[10px] font-bold text-slds-text-secondary uppercase">Titre</label>
                      <input name="title" defaultValue={viewingSession.title} required className="slds-input" />
                    </div>
                    <div className="grid grid-cols-2 gap-4">
                      <div className="space-y-1">
                        <label className="text-[10px] font-bold text-slds-text-secondary uppercase">Date</label>
                        <input type="date" name="date" defaultValue={viewingSession.date} required className="slds-input" />
                      </div>
                      <div className="space-y-1">
                        <label className="text-[10px] font-bold text-slds-text-secondary uppercase">Heure</label>
                        <input type="time" name="startTime" defaultValue={viewingSession.startTime} required className="slds-input" />
                      </div>
                    </div>
                    <div className="space-y-1">
                      <label className="text-[10px] font-bold text-slds-text-secondary uppercase">Lieu</label>
                      <input name="location" defaultValue={viewingSession.location} className="slds-input" />
                    </div>
                    <div className="space-y-1">
                      <label className="text-[10px] font-bold text-slds-text-secondary uppercase">Lien Zoom</label>
                      <input name="zoomLink" defaultValue={viewingSession.zoomLink} className="slds-input text-slds-brand" />
                    </div>
                    <div className="flex gap-3 pt-4 border-t border-slds-border">
                      <button type="button" onClick={() => setIsEditing(false)} className="slds-button slds-button-neutral flex-1">Annuler</button>
                      <button type="submit" className="slds-button slds-button-brand flex-1">Enregistrer</button>
                    </div>
                 </form>
               ) : (
                 <div className="space-y-6">
                   <div className="grid grid-cols-2 gap-6">
                     <div className="space-y-1">
                        <p className="text-[10px] font-bold text-slds-text-secondary uppercase">Planification</p>
                        <div className="flex items-center gap-2 text-sm font-bold text-slds-text-primary">
                          <Clock size={14} className="text-slds-brand" /> 
                          {(() => {
                            const [y, m, d] = viewingSession.date.split('-').map(Number);
                            return new Date(y, m - 1, d).toLocaleDateString('fr-FR');
                          })()} à {viewingSession.startTime}
                        </div>
                     </div>
                     <div className="space-y-1">
                        <p className="text-[10px] font-bold text-slds-text-secondary uppercase">Lieu / Accès</p>
                        <div className="flex items-center gap-2 text-sm font-bold text-slds-text-primary">
                          {viewingSession.zoomLink ? (
                            <a href={viewingSession.zoomLink} target="_blank" className="text-slds-brand underline flex items-center gap-1"><Video size={14}/> Lien Virtuel</a>
                          ) : (
                            <span className="flex items-center gap-1"><MapPin size={14} className="text-slds-text-secondary"/> {viewingSession.location}</span>
                          )}
                        </div>
                     </div>
                   </div>

                   <div className="space-y-3">
                      <p className="text-[10px] font-bold text-slds-text-secondary uppercase">Responsables</p>
                      <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
                        <div className="bg-slds-bg p-3 rounded border border-slds-border flex items-center gap-3">
                           <div className="w-8 h-8 rounded bg-white text-slds-brand flex items-center justify-center font-bold border border-slds-border">
                             <User size={16} />
                           </div>
                           <div>
                             <p className="text-[9px] font-bold text-slds-text-secondary uppercase">Conseiller</p>
                             <p className="text-xs font-bold text-slds-text-primary">{viewingSession.advisorName}</p>
                           </div>
                        </div>
                        <div className="bg-slds-bg p-3 rounded border border-slds-border flex items-center gap-3">
                           <div className="w-8 h-8 rounded bg-white text-slds-brand flex items-center justify-center font-bold border border-slds-border">
                             <UserCog size={16} />
                           </div>
                           <div>
                             <p className="text-[9px] font-bold text-slds-text-secondary uppercase">Intervenant</p>
                             <p className="text-xs font-bold text-slds-text-primary">{viewingSession.facilitatorName}</p>
                           </div>
                        </div>
                      </div>
                   </div>

                   {checkCanModify(viewingSession) && (
                     <div className="pt-6 border-t border-slds-border flex gap-3">
                        <button 
                          onClick={() => setSessionToDelete(viewingSession.id)}
                          className="slds-button slds-button-neutral text-slds-error border-slds-error hover:bg-red-50 flex-1"
                        >
                          <Trash2 size={14} className="mr-2" /> Supprimer
                        </button>
                        <button 
                          onClick={() => setIsEditing(true)}
                          className="slds-button slds-button-brand flex-1"
                        >
                          <Edit2 size={14} className="mr-2" /> Modifier
                        </button>
                     </div>
                   )}
                 </div>
               )}
             </div>
          </div>
        </div>
      )}

      {/* Confirmation Suppression SLDS */}
      <ConfirmModal 
        isOpen={!!sessionToDelete}
        title="Confirmer la suppression"
        message="Voulez-vous vraiment supprimer définitivement cette séance du calendrier ?"
        confirmLabel="Supprimer"
        onConfirm={() => { if(sessionToDelete) { onDeleteSession?.(sessionToDelete); setViewingSession(null); setSessionToDelete(null); } }}
        onCancel={() => setSessionToDelete(null)}
      />

      {/* Modale d'Ajout SLDS */}
      {showAddModal && (
        <div className="fixed inset-0 bg-black/50 z-[300] flex items-center justify-center p-4 animate-in fade-in duration-200">
          <div className="slds-card w-full max-w-2xl shadow-2xl overflow-hidden animate-in zoom-in-95 duration-200">
            <div className="p-4 border-b border-slds-border flex justify-between items-center bg-slds-bg">
              <div className="flex items-center gap-3">
                <div className="p-2 rounded bg-slds-brand text-white shadow-sm"><Plus size={20} /></div>
                <h3 className="text-base font-bold text-slds-text-primary">Nouvelle Séance de Groupe</h3>
              </div>
              <button onClick={() => { setShowAddModal(false); setSelectedContractId(''); setFormDate(''); }} className="p-2 hover:bg-white rounded text-slds-text-secondary"><X size={20} /></button>
            </div>

            <form onSubmit={handleCreateSession} className="p-6 space-y-4 max-h-[70vh] overflow-y-auto">
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  <div className="space-y-1 md:col-span-2">
                    <label className="text-[10px] font-bold text-slds-text-secondary uppercase">Titre</label>
                    <input name="title" required placeholder="Ex: Revue de CV" className="slds-input" />
                  </div>
                  <div className="space-y-1">
                    <label className="text-[10px] font-bold text-slds-text-secondary uppercase">Type de Service</label>
                    <select name="type" required className="slds-input">
                      {Object.values(SessionType).map(t => <option key={t} value={t}>{SESSION_TYPE_LABELS[t]}</option>)}
                    </select>
                  </div>
                  <div className="space-y-1">
                    <label className="text-[10px] font-bold text-slds-text-secondary uppercase">Date</label>
                    <input type="date" name="date" value={formDate} onChange={(e) => setFormDate(e.target.value)} required className="slds-input" />
                  </div>
                  <div className="grid grid-cols-2 gap-4">
                    <div className="space-y-1">
                      <label className="text-[10px] font-bold text-slds-text-secondary uppercase">Heure</label>
                      <input type="time" name="startTime" defaultValue="09:00" required className="slds-input" />
                    </div>
                    <div className="space-y-1">
                      <label className="text-[10px] font-bold text-slds-text-secondary uppercase">Durée (min)</label>
                      <input type="number" name="duration" defaultValue="60" required className="slds-input" />
                    </div>
                  </div>
                  <div className="space-y-1">
                    <label className="text-[10px] font-bold text-slds-text-secondary uppercase">Lieu</label>
                    <input name="location" defaultValue="Bureaux CFGT" className="slds-input" />
                  </div>
                  <div className="space-y-1">
                    <label className="text-[10px] font-bold text-slds-text-secondary uppercase flex items-center gap-1"><Video size={12} /> Lien Zoom</label>
                    <input name="zoomLink" placeholder="https://zoom.us/j/..." className="slds-input" />
                  </div>
                </div>

                <div className="pt-4 border-t border-slds-border space-y-4">
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                    <div className="space-y-1">
                      <label className="text-[10px] font-bold text-slds-text-secondary uppercase">Type d'Intervenant</label>
                      <select 
                        name="facilitatorType" 
                        required 
                        className="slds-input text-slds-brand"
                        value={formFacilitatorType}
                        onChange={(e) => { 
                          setFormFacilitatorType(e.target.value as FacilitatorType); 
                          setSelectedConsultantName(''); 
                          setSelectedContractId('');
                        }}
                      >
                        <option value={FacilitatorType.CONSULTANT}>Consultant Externe</option>
                        <option value={FacilitatorType.ORGANIZATION}>Organisme Partenaire</option>
                      </select>
                    </div>
                    <div className="space-y-1">
                      <label className="text-[10px] font-bold text-slds-text-secondary uppercase">Nom de l'Intervenant</label>
                      <select 
                        name="facilitatorName" 
                        required 
                        value={selectedConsultantName}
                        onChange={(e) => { setSelectedConsultantName(e.target.value); setSelectedContractId(''); }}
                        className="slds-input"
                      >
                        <option value="">Sélectionner...</option>
                        {availableFacilitators.map(p => <option key={p.id} value={p.name}>{p.name}</option>)}
                      </select>
                    </div>
                  </div>

                  {formFacilitatorType === FacilitatorType.CONSULTANT && selectedConsultantName && (
                    <div className="p-3 bg-blue-50 border border-blue-100 rounded">
                       <div className="flex items-center gap-2 mb-2">
                          <FileText size={14} className="text-blue-600" />
                          <p className="text-[10px] font-bold text-blue-600 uppercase">Contrat d'imputation</p>
                       </div>
                       <select 
                        name="contractId" 
                        required 
                        value={selectedContractId}
                        onChange={(e) => setSelectedContractId(e.target.value)}
                        className={`slds-input bg-white ${validationError ? 'border-amber-400 ring-2 ring-amber-50' : ''}`}
                       >
                         <option value="">Choisir un contrat actif...</option>
                         {activeContractsForConsultant.map(c => (
                           <option key={c.id} value={c.id}>
                             Contrat {c.id.split('-')[1]} - {c.serviceType} ({c.usedSessions}/{c.totalSessions})
                           </option>
                         ))}
                       </select>
                       {validationError && (
                         <div className="mt-2 flex items-start gap-2 p-2 bg-amber-50 border border-amber-200 rounded text-[10px] font-bold text-amber-700 animate-in fade-in slide-in-from-top-1">
                           <AlertCircle size={14} className="flex-shrink-0" />
                           {validationError}
                         </div>
                       )}
                    </div>
                  )}
                </div>

                <div className="flex justify-end gap-3 pt-4 border-t border-slds-border">
                  <button type="button" onClick={() => { setShowAddModal(false); setSelectedContractId(''); }} className="slds-button slds-button-neutral">Annuler</button>
                  <button 
                    type="submit" 
                    disabled={!!validationError}
                    className="slds-button slds-button-brand disabled:opacity-50 disabled:cursor-not-allowed"
                  >
                    Confirmer
                  </button>
                </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
};

export default CalendarView;
