
import React, { useState, useMemo, useRef, useEffect } from 'react';
import { Session, SessionType, SessionCategory, FacilitatorType, Client, Partner, PartnerType, Contract, UserRole, Profile } from '../types';
import { SESSION_TYPE_LABELS } from '../constants';
import ConfirmModal from '../components/ConfirmModal';
import SessionModal from '../components/SessionModal';
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
  CheckCircle2,
  ChevronDown,
  ChevronUp
} from 'lucide-react';

interface CalendarViewProps {
  clients: Client[];
  sessions: Session[];
  partners: Partner[];
  contracts: Contract[];
  activeRole: UserRole;
  currentUserName: string;
  currentUserId?: string;
  onAddSession: (session: Session) => void;
  onUpdateSession?: (session: Session) => void;
  onDeleteSession?: (sessionId: string) => void;
  allProfiles: Profile[];
  onSelectClient?: (client: Client) => void;
}

const CalendarView: React.FC<CalendarViewProps> = ({ clients, sessions, partners, contracts, activeRole, currentUserName, currentUserId, onAddSession, onUpdateSession, onDeleteSession, allProfiles, onSelectClient }) => {
  const [currentMonth, setCurrentMonth] = useState(new Date());
  const isAdminOrManager = activeRole === UserRole.ADMIN || activeRole === UserRole.MANAGER;
  const [showSessionModal, setShowSessionModal] = useState(false);
  const [editingSession, setEditingSession] = useState<Session | null>(null);
  const [viewingSession, setViewingSession] = useState<Session | null>(null);
  const [sessionToDelete, setSessionToDelete] = useState<string | null>(null);
  const [selectedDate, setSelectedDate] = useState('');

  // États pour les filtres intelligents
  const [showFilters, setShowFilters] = useState(false);
  const hideTimeoutRef = useRef<NodeJS.Timeout | null>(null);

  const [filterService, setFilterService] = useState<SessionType | 'ALL'>('ALL');
  const [filterAdvisor, setFilterAdvisor] = useState<string>('ALL');
  const [filterFacilitatorType, setFilterFacilitatorType] = useState<FacilitatorType | 'ALL'>('ALL');
  const [filterFacilitatorName, setFilterFacilitatorName] = useState<string>('ALL');
  const [filterStartDate, setFilterStartDate] = useState<string>('');
  const [filterEndDate, setFilterEndDate] = useState<string>('');

  // Gestion de l'auto-masquage
  const handleMouseEnter = () => {
    if (hideTimeoutRef.current) {
      clearTimeout(hideTimeoutRef.current);
      hideTimeoutRef.current = null;
    }
  };

  const handleMouseLeave = () => {
    if (showFilters) {
      hideTimeoutRef.current = setTimeout(() => {
        setShowFilters(false);
      }, 3000); // 3 secondes
    }
  };

  // Cleanup au démontage
  useEffect(() => {
    return () => {
      if (hideTimeoutRef.current) clearTimeout(hideTimeoutRef.current);
    };
  }, []);

  const advisorOptions = useMemo(() => {
    return allProfiles
      .filter(p => [UserRole.ADVISOR, UserRole.MANAGER, UserRole.ADMIN, UserRole.PARTNER].includes(p.role))
      .map(p => ({
        id: p.id,
        name: `${p.firstName} ${p.lastName}`.trim()
      }))
      .sort((a, b) => a.name.localeCompare(b.name));
  }, [allProfiles]);

  
  const uniqueFacilitators = useMemo(() => {
    // Get all unique facilitator names from GROUP sessions only
    const facMap = new Map<string, FacilitatorType>();
    sessions.forEach(s => {
      if (s.category === SessionCategory.GROUP && s.facilitatorName) {
        facMap.set(s.facilitatorName, s.facilitatorType);
      }
    });
    return Array.from(facMap.entries()).map(([name, type]) => ({ name, type }));
  }, [sessions]);

  const filteredFacilitatorNames = useMemo(() => {
    if (filterFacilitatorType === 'ALL') {
      return Array.from(new Set(uniqueFacilitators.map(f => f.name))).sort();
    }
    return uniqueFacilitators
      .filter(f => f.type === filterFacilitatorType)
      .map(f => f.name)
      .sort();
  }, [uniqueFacilitators, filterFacilitatorType]);



  const filteredSessions = useMemo(() => {
    return sessions.filter(s => {
      const isGroup = s.category === SessionCategory.GROUP;
      if (!isGroup) return false;
      
      const matchService = filterService === 'ALL' || s.type === filterService;
      
      let matchAdvisor = true;
      if (filterAdvisor !== 'ALL') {
        const selectedAdvisor = advisorOptions.find(o => o.id === filterAdvisor);
        if (selectedAdvisor) {
          matchAdvisor = s.advisorId === selectedAdvisor.id || s.advisorName?.trim().toLowerCase() === selectedAdvisor.name.toLowerCase();
        }
      }

      const matchFacType = filterFacilitatorType === 'ALL' || s.facilitatorType === filterFacilitatorType;
      const matchFacName = filterFacilitatorName === 'ALL' || s.facilitatorName === filterFacilitatorName;
      
      let matchDate = true;
      if (filterStartDate) matchDate = matchDate && s.date >= filterStartDate;
      if (filterEndDate) matchDate = matchDate && s.date <= filterEndDate;

      return matchService && matchAdvisor && matchFacType && matchFacName && matchDate;
    });
  }, [sessions, filterService, filterAdvisor, filterFacilitatorType, filterFacilitatorName, filterStartDate, filterEndDate]);

  const activeFiltersCount = useMemo(() => {
    let count = 0;
    if (filterService !== 'ALL') count++;
    if (filterAdvisor !== 'ALL') count++;
    if (filterFacilitatorType !== 'ALL') count++;
    if (filterFacilitatorName !== 'ALL') count++;
    if (filterStartDate !== '') count++;
    if (filterEndDate !== '') count++;
    return count;
  }, [filterService, filterAdvisor, filterFacilitatorType, filterFacilitatorName, filterStartDate, filterEndDate]);

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

  const handleSaveSession = (sessionData: Session) => {
    if (editingSession) {
      onUpdateSession?.(sessionData);
    } else {
      onAddSession(sessionData);
    }
    setShowSessionModal(false);
    setEditingSession(null);
  };

  // Comparaison robuste pour les droits d'auteur
  const checkCanModify = (session: Session) => {
    if (isAdminOrManager) return true;
    
    // Check by ID (most secure)
    if (currentUserId && session.advisorId && session.advisorId === currentUserId) return true;
    
    // Fallback to name matching (less precise but works for legacy data)
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

      {/* Barre d'actions SLDS */}
      <div className="flex gap-4 items-center mb-2">
        <button 
          onClick={() => setShowFilters(!showFilters)}
          className={`slds-button ${showFilters || activeFiltersCount > 0 ? 'slds-button-brand' : 'slds-button-neutral'} flex items-center gap-2 relative`}
        >
          <div className="relative flex items-center gap-2">
            <Filter size={14} />
            {activeFiltersCount > 0 && (
              <span className="absolute -top-2 -left-2 min-w-[18px] h-[18px] bg-red-500 text-white text-[10px] font-bold rounded-full flex items-center justify-center px-1 border-2 border-white animate-in zoom-in duration-300">
                {activeFiltersCount}
              </span>
            )}
          </div>
          {showFilters ? 'Masquer les filtres' : 'Afficher les filtres'}
          {showFilters ? <ChevronUp size={14} className="ml-1" /> : <ChevronDown size={14} className="ml-1" />}
        </button>

        <button 
          onClick={() => { 
            setEditingSession(null);
            setShowSessionModal(true); 
          }}
          className="slds-button slds-button-brand !px-6 ml-auto"
        >
          <Plus size={14} className="mr-2" /> Planifier
        </button>
      </div>

      {/* Filtres SLDS avec Auto-hide */}
      {showFilters && (
        <div 
          onMouseEnter={handleMouseEnter}
          onMouseLeave={handleMouseLeave}
          className="slds-card px-10 py-8 flex flex-col gap-6 animate-in fade-in slide-in-from-top-2 duration-200"
        >
        {/* Ligne 1 : Services et Conseillers */}
        <div className="flex flex-nowrap gap-4 items-center overflow-x-auto no-scrollbar">
          <div className="flex items-center gap-2">
            <Filter size={16} className="text-slds-text-secondary" />
            <span className="text-xs font-bold text-slds-text-secondary uppercase whitespace-nowrap">Filtres :</span>
          </div>
          
          <select 
            className="slds-input py-1 px-2 text-xs w-auto min-w-[140px]"
            value={filterService}
            onChange={(e) => setFilterService(e.target.value as any)}
          >
            <option value="ALL">Tous les Services</option>
            {Object.values(SessionType).map(t => <option key={t} value={t}>{SESSION_TYPE_LABELS[t]}</option>)}
          </select>

          <select 
            className="slds-input py-1 px-2 text-xs w-auto min-w-[140px]"
            value={filterAdvisor}
            onChange={(e) => setFilterAdvisor(e.target.value)}
          >
            <option value="ALL">Tous les Conseillers</option>
            {advisorOptions.map(opt => <option key={opt.id} value={opt.id}>{opt.name}</option>)}
          </select>

          <div className="flex items-center gap-2 shrink-0 h-8 border-l border-slate-100 pl-4">
            <UserCog size={14} className="text-slate-400" />
            <select 
              className="slds-input py-1 px-2 text-xs w-auto min-w-[130px]"
              value={filterFacilitatorType}
              onChange={(e) => {
                setFilterFacilitatorType(e.target.value as any);
                setFilterFacilitatorName('ALL');
              }}
            >
              <option value="ALL">Tous les Types</option>
              <option value={FacilitatorType.CONSULTANT}>Consultants Externes</option>
              <option value={FacilitatorType.ORGANIZATION}>Internes / Partenaires</option>
            </select>
          </div>

          </div>

        {/* Ligne 2 : Intervenants et Période (Linéaire) */}
        <div className="flex flex-nowrap items-center gap-6 pt-3 border-t border-slds-border/50 overflow-x-auto no-scrollbar">
          <div className="flex items-center gap-2 shrink-0">
            <User size={14} className="text-slds-text-secondary" />
            <select 
              className="slds-input py-1 px-2 text-xs w-auto min-w-[150px]"
              value={filterFacilitatorName}
              onChange={(e) => setFilterFacilitatorName(e.target.value)}
              disabled={filteredFacilitatorNames.length === 0}
            >
              <option value="ALL">Tous les Intervenants</option>
              {filteredFacilitatorNames.map(name => <option key={name} value={name}>{name}</option>)}
            </select>
          </div>

          <div className="h-6 w-px bg-slate-100 shrink-0" />

          <div className="flex items-center gap-2 shrink-0">
            <span className="text-[10px] font-bold text-slate-400 uppercase whitespace-nowrap">Période du</span>
            <input 
              type="date" 
              className="slds-input py-1 px-2 text-xs w-auto"
              value={filterStartDate}
              onChange={(e) => setFilterStartDate(e.target.value)}
            />
            <span className="text-[10px] font-bold text-slate-400 uppercase whitespace-nowrap">au</span>
            <input 
              type="date" 
              className="slds-input py-1 px-2 text-xs w-auto"
              value={filterEndDate}
              onChange={(e) => setFilterEndDate(e.target.value)}
            />
            {(filterStartDate || filterEndDate) && (
              <button 
                onClick={() => { setFilterStartDate(''); setFilterEndDate(''); }}
                className="p-1 hover:bg-slate-100 rounded text-slate-400"
                title="Effacer les dates"
              >
                <X size={14} />
              </button>
            )}
          </div>
        </div>
      </div>
      )}

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
                onDoubleClick={() => { 
                  if(date) { 
                    setSelectedDate(getLocalDateString(date));
                    setEditingSession(null); 
                    setShowSessionModal(true); 
                  } 
                }}
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
                          onClick={(e) => { e.stopPropagation(); setViewingSession(s); }}
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
                     {viewingSession.title}
                   </h3>
                 </div>
               </div>
               <button onClick={() => setViewingSession(null)} className="p-2 hover:bg-white rounded text-slds-text-secondary"><X size={20} /></button>
             </div>

             <div className="p-6">
                <div className="space-y-6">
                   <div className="mb-4">
                      <div className={`inline-flex items-center px-2 py-0.5 rounded text-[11px] font-bold uppercase text-white shadow-sm ${getSessionStyle(viewingSession.type)}`}>
                        {SESSION_TYPE_LABELS[viewingSession.type]}
                      </div>
                   </div>

                   <div className="grid grid-cols-2 gap-6">
                     <div className="space-y-1">
                        <p className="text-[10px] font-bold text-slds-text-secondary uppercase">Planification</p>
                        <div className="flex items-center gap-2 text-sm font-bold text-slds-text-primary">
                          <Clock size={14} className="text-slds-brand" /> 
                          {(() => {
                            if (!viewingSession.date || typeof viewingSession.date !== 'string' || !viewingSession.date.includes('-')) {
                              return "Date invalide";
                            }
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
                          onClick={() => { 
                            setEditingSession(viewingSession);
                            setViewingSession(null);
                            setShowSessionModal(true); 
                          }}
                          className="slds-button slds-button-brand flex-1"
                        >
                          <Edit2 size={14} className="mr-2" /> Modifier
                        </button>
                     </div>
                   )}
                </div>
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

      <SessionModal 
        isOpen={showSessionModal}
        onClose={() => { setShowSessionModal(false); setEditingSession(null); setSelectedDate(''); }}
        session={editingSession}
        initialDate={selectedDate}
        initialCategory={SessionCategory.GROUP}
        clients={clients}
        sessions={sessions}
        partners={partners}
        contracts={contracts}
        allProfiles={allProfiles} 
        activeRole={activeRole}
        currentUserName={currentUserName}
        currentUserId={currentUserId}
        onSave={handleSaveSession}
        onSelectClient={onSelectClient}
      />

    </div>
  );
};

export default CalendarView;
