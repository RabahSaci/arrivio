
import React, { useState, useMemo } from 'react';
import { Session, SessionType, SessionCategory, Client, FacilitatorType, AttendanceStatus, Partner, PartnerType, Contract, UserRole } from '../types';
import { SESSION_TYPE_LABELS } from '../constants';
import ConfirmModal from '../components/ConfirmModal';
import Pagination from '../components/Pagination';
import { 
  Calendar, 
  Users, 
  User, 
  Search, 
  Clock, 
  MapPin, 
  X, 
  CheckCircle2, 
  ChevronRight, 
  UserCheck, 
  Video, 
  Trash2, 
  Edit2, 
  UserX, 
  RotateCcw, 
  Ban, 
  Activity, 
  AlertCircle, 
  Info, 
  Plus, 
  Languages, 
  MessageSquare, 
  FileText, 
  Filter, 
  FilePlus2, 
  LayoutList, 
  CalendarDays, 
  Target, 
  ClipboardList, 
  Stethoscope, 
  Briefcase 
} from 'lucide-react';

interface SessionListProps {
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

const SessionList: React.FC<SessionListProps> = ({ 
  clients, 
  sessions, 
  partners, 
  contracts, 
  activeRole, 
  currentUserName, 
  onAddSession, 
  onUpdateSession, 
  onDeleteSession 
}) => {
  const isAdminOrManager = activeRole === UserRole.ADMIN || activeRole === UserRole.MANAGER;

  // Helper pour obtenir la date locale au format YYYY-MM-DD
  const getTodayString = () => {
    const d = new Date();
    const year = d.getFullYear();
    const month = String(d.getMonth() + 1).padStart(2, '0');
    const day = String(d.getDate()).padStart(2, '0');
    return `${year}-${month}-${day}`;
  };

  // Helper pour formater la date sans décalage de fuseau horaire
  const formatDate = (dateString: string) => {
    if (!dateString) return '';
    const [year, month, day] = dateString.split('-').map(Number);
    return new Date(year, month - 1, day).toLocaleDateString('fr-FR');
  };

  const [activeCategory, setActiveCategory] = useState<SessionCategory>(SessionCategory.INDIVIDUAL);
  const [searchTerm, setSearchTerm] = useState('');
  const [filterType, setFilterType] = useState<SessionType | 'ALL'>('ALL');
  const [filterFacilitator, setFilterFacilitator] = useState('ALL');
  const [filterAttendance, setFilterAttendance] = useState<AttendanceStatus | 'ALL'>('ALL');
  const [currentPage, setCurrentPage] = useState(1);
  const itemsPerPage = 10;

  const [showModal, setShowModal] = useState<'individual' | 'group' | null>(null);
  const [viewingSession, setViewingSession] = useState<Session | null>(null);
  const [sessionToDelete, setSessionToDelete] = useState<string | null>(null);
  
  const [clientSearchQuery, setClientSearchQuery] = useState('');
  const [selectedClient, setSelectedClient] = useState<Client | null>(null);
  const [attendance, setAttendance] = useState<AttendanceStatus>(AttendanceStatus.PRESENT);

  const [formDate, setFormDate] = useState<string>(getTodayString());
  const [formFacilitatorType, setFormFacilitatorType] = useState<FacilitatorType>(FacilitatorType.CONSULTANT);
  const [selectedConsultantName, setSelectedConsultantName] = useState<string>('');
  const [selectedContractId, setSelectedContractId] = useState<string>('');

  const uniqueFacilitators = useMemo(() => {
    return Array.from(new Set(sessions.map(s => s.facilitatorName))).sort();
  }, [sessions]);

  const filteredClientsForSearch = useMemo(() => {
    if (!clientSearchQuery || selectedClient) return [];
    return clients.filter(c => 
      (c.firstName + ' ' + c.lastName).toLowerCase().includes(clientSearchQuery.toLowerCase()) ||
      c.email.toLowerCase().includes(clientSearchQuery.toLowerCase())
    ).slice(0, 5);
  }, [clients, clientSearchQuery, selectedClient]);

  const filteredSessions = useMemo(() => {
    setCurrentPage(1); // Reset to first page on filter change
    return sessions.filter(s => {
      const matchCategory = s.category === activeCategory;
      const matchSearch = s.title.toLowerCase().includes(searchTerm.toLowerCase()) || 
                          s.facilitatorName.toLowerCase().includes(searchTerm.toLowerCase());
      const matchType = filterType === 'ALL' || s.type === filterType;
      const matchFacilitator = filterFacilitator === 'ALL' || s.facilitatorName === filterFacilitator;
      
      let matchAttendance = true;
      if (activeCategory === SessionCategory.INDIVIDUAL && filterAttendance !== 'ALL') {
        matchAttendance = s.individualStatus === filterAttendance;
      }

      return matchCategory && matchSearch && matchType && matchFacilitator && matchAttendance;
    });
  }, [sessions, activeCategory, searchTerm, filterType, filterFacilitator, filterAttendance]);

  const activeContractsForConsultant = useMemo(() => {
    if (!selectedConsultantName || formFacilitatorType !== FacilitatorType.CONSULTANT) return [];
    const relevantContracts = contracts.filter(c => c.consultantName === selectedConsultantName && c.status === 'ACTIVE');
    return relevantContracts.map(c => {
      const actualUsed = sessions.filter(s => s.contractId === c.id).length;
      return { ...c, usedSessions: actualUsed };
    });
  }, [contracts, sessions, selectedConsultantName, formFacilitatorType]);

  const availableFacilitators = useMemo(() => {
    if (formFacilitatorType === FacilitatorType.CONSULTANT) {
      return partners.filter(p => p.type === PartnerType.CONSULTANT);
    } else {
      return partners.filter(p => p.type === PartnerType.INTERNAL || p.type === PartnerType.EXTERNAL);
    }
  }, [partners, formFacilitatorType]);

  const validationError = useMemo(() => {
    if (showModal !== 'group' || formFacilitatorType !== FacilitatorType.CONSULTANT || !selectedContractId) return null;
    const contract = activeContractsForConsultant.find(c => c.id === selectedContractId);
    if (!contract) return null;

    if (contract.usedSessions >= contract.totalSessions) {
      return `Attention : Le quota de ce contrat est atteint (${contract.usedSessions}/${contract.totalSessions}).`;
    }

    if (formDate) {
      if (formDate < contract.startDate || formDate > contract.endDate) {
        return `Date invalide : La séance doit avoir lieu entre le ${new Date(contract.startDate + 'T12:00:00').toLocaleDateString('fr-FR')} et le ${new Date(contract.endDate + 'T12:00:00').toLocaleDateString('fr-FR')}.`;
      }
    }
    return null;
  }, [showModal, selectedContractId, formDate, activeContractsForConsultant, formFacilitatorType]);

  const paginatedSessions = useMemo(() => {
    const startIndex = (currentPage - 1) * itemsPerPage;
    return filteredSessions.slice(startIndex, startIndex + itemsPerPage);
  }, [filteredSessions, currentPage]);

  const totalPages = Math.ceil(filteredSessions.length / itemsPerPage);

  const resetFilters = () => {
    setSearchTerm('');
    setFilterType('ALL');
    setFilterFacilitator('ALL');
    setFilterAttendance('ALL');
  };

  const getSessionColor = (type: SessionType) => {
    switch(type) {
      case SessionType.RTCE: return 'bg-purple-50 text-purple-600 border-purple-100';
      case SessionType.EMPLOYMENT: return 'bg-blue-50 text-blue-600 border-blue-100';
      case SessionType.ESTABLISHMENT: return 'bg-emerald-50 text-emerald-600 border-emerald-100';
      default: return 'bg-slate-50 text-slate-600 border-slate-100';
    }
  };

  const getAttendanceBadge = (status?: AttendanceStatus) => {
    switch(status) {
      case AttendanceStatus.PRESENT: return 'bg-emerald-50 text-emerald-600 border-emerald-100';
      case AttendanceStatus.ABSENT: return 'bg-red-50 text-red-600 border-red-100';
      case AttendanceStatus.DECALEE: return 'bg-amber-50 text-amber-600 border-amber-100';
      default: return 'bg-slate-50 text-slate-400 border-slate-100';
    }
  };

  const handleCloseModal = () => {
    setShowModal(null); 
    setClientSearchQuery(''); 
    setSelectedClient(null); 
    setAttendance(AttendanceStatus.PRESENT);
    setSelectedContractId('');
    setSelectedConsultantName('');
    setFormDate(getTodayString());
  };

  const handleCreateSession = (e: React.FormEvent<HTMLFormElement>, category: SessionCategory) => {
    e.preventDefault();
    const formData = new FormData(e.currentTarget);
    const isGroup = category === SessionCategory.GROUP;
    
    if (!isGroup && !selectedClient) {
      alert("Veuillez sélectionner un client existant.");
      return;
    }

    const facilitatorName = isGroup ? (formData.get('facilitatorName') as string) : currentUserName;
    const contractId = isGroup ? (formData.get('contractId') as string) : undefined;
    
    // Modification: Le titre pour les individuels est directement le nom du client
    const title = isGroup 
      ? (formData.get('title') as string) 
      : (selectedClient ? `${selectedClient.firstName} ${selectedClient.lastName}` : 'Client Inconnu');

    const newSession: Session = {
      id: Date.now().toString(),
      title,
      type: formData.get('type') as SessionType,
      category,
      date: formData.get('date') as string,
      startTime: formData.get('startTime') as string,
      duration: parseInt(formData.get('duration') as string),
      participantIds: !isGroup && selectedClient ? [selectedClient.id] : [],
      noShowIds: !isGroup && selectedClient && attendance === AttendanceStatus.ABSENT ? [selectedClient.id] : [],
      location: formData.get('location') as string || 'CFGT',
      notes: formData.get('notes') as string || '',
      discussedNeeds: formData.get('discussedNeeds') as string || '',
      actions: formData.get('actions') as string || '',
      facilitatorName,
      facilitatorType: isGroup ? (formData.get('facilitatorType') as FacilitatorType) : FacilitatorType.ORGANIZATION,
      advisorName: currentUserName,
      contractId: contractId || undefined,
      individualStatus: isGroup ? undefined : attendance,
      needsInterpretation: formData.get('needsInterpretation') === 'true',
      invoiceReceived: false, 
      invoiceSubmitted: false, 
      invoicePaid: false,
    };

    onAddSession(newSession);
    handleCloseModal();
  };

  return (
    <div className="space-y-4">
      {/* Barre d'outils et Navigation Segmentée SLDS */}
      <div className="slds-card p-3 space-y-3">
        <div className="flex flex-col lg:flex-row justify-between items-center gap-3">
          <div className="flex bg-slds-bg p-1 rounded w-full lg:w-auto">
            <button 
              onClick={() => setActiveCategory(SessionCategory.INDIVIDUAL)}
              className={`flex-1 lg:flex-none flex items-center justify-center gap-2 px-3 py-1 rounded text-[9px] font-black uppercase tracking-widest transition-all ${activeCategory === SessionCategory.INDIVIDUAL ? 'bg-white text-slds-brand shadow-sm' : 'text-slds-text-secondary hover:text-slds-text-primary'}`}
            >
              <User size={12} /> Individuelles
            </button>
            <button 
              onClick={() => setActiveCategory(SessionCategory.GROUP)}
              className={`flex-1 lg:flex-none flex items-center justify-center gap-2 px-3 py-1 rounded text-[9px] font-black uppercase tracking-widest transition-all ${activeCategory === SessionCategory.GROUP ? 'bg-white text-slds-brand shadow-sm' : 'text-slds-text-secondary hover:text-slds-text-primary'}`}
            >
              <Users size={12} /> Groupes
            </button>
          </div>

          <div className="flex gap-2 w-full lg:w-auto">
            <button 
              onClick={() => setShowModal(activeCategory === SessionCategory.INDIVIDUAL ? 'individual' : 'group')}
              className="slds-button slds-button-brand !px-4 !py-2 w-full lg:w-auto"
            >
              <Plus size={14} className="mr-2" /> Nouvelle Séance
            </button>
          </div>
        </div>

        <div className="flex flex-wrap items-center gap-3 pt-3 border-t border-slds-border">
          <div className="relative flex-1 min-w-[180px]">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 text-slds-text-secondary" size={12} />
            <input 
              type="text" 
              placeholder="Rechercher..."
              className="slds-input slds-input-compact pl-9"
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
            />
          </div>

          <div className="flex items-center gap-2 text-slds-text-secondary">
            <Filter size={12} />
            <span className="text-[10px] font-black uppercase">Filtres :</span>
          </div>

          <select 
            className="slds-input slds-input-compact w-auto"
            value={filterType}
            onChange={(e) => setFilterType(e.target.value as any)}
          >
            <option value="ALL">Services</option>
            {Object.values(SessionType).map(t => <option key={t} value={t}>{SESSION_TYPE_LABELS[t]}</option>)}
          </select>

          <select 
            className="slds-input slds-input-compact w-auto"
            value={filterFacilitator}
            onChange={(e) => setFilterFacilitator(e.target.value)}
          >
            <option value="ALL">Intervenants</option>
            {uniqueFacilitators.map(f => <option key={f} value={f}>{f}</option>)}
          </select>

          {activeCategory === SessionCategory.INDIVIDUAL && (
            <select 
              className="slds-input slds-input-compact w-auto"
              value={filterAttendance}
              onChange={(e) => setFilterAttendance(e.target.value as any)}
            >
              <option value="ALL">Statuts</option>
              {Object.values(AttendanceStatus).map(s => <option key={s} value={s}>{s}</option>)}
            </select>
          )}

          {(searchTerm || filterType !== 'ALL' || filterFacilitator !== 'ALL' || filterAttendance !== 'ALL') && (
            <button 
              onClick={resetFilters}
              className="text-[10px] font-black text-slds-brand uppercase hover:underline"
            >
              Reset
            </button>
          )}
        </div>
      </div>

      {/* Liste en Lignes (Tableau) SLDS */}
      <div className="slds-card overflow-hidden">
        <div className="overflow-x-auto">
          <table className="slds-table">
            <thead>
              <tr>
                <th className="p-4">Séance / Client</th>
                <th className="p-4">Intervenant</th>
                <th className="p-4">Date & Heure</th>
                <th className="p-4">Ville (Client)</th>
                <th className="p-4 text-center">{activeCategory === SessionCategory.INDIVIDUAL ? 'Statut' : 'Participants'}</th>
                <th className="p-4"></th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slds-border">
              {paginatedSessions.map(session => {
                const client = clients.find(c => session.participantIds.includes(c.id));
                
                return (
                  <tr 
                    key={session.id}
                    onClick={() => setViewingSession(session)}
                    className="hover:bg-slds-bg transition-all cursor-pointer group"
                  >
                    <td className="p-4">
                      <div className="flex items-center gap-3">
                        <div className={`p-2 rounded ${session.category === SessionCategory.GROUP ? 'bg-indigo-500 text-white' : 'bg-slds-brand text-white'} shadow-sm`}>
                          {session.category === SessionCategory.GROUP ? <Users size={16} /> : <User size={16} />}
                        </div>
                        <div>
                          <p className="text-xs font-bold text-slds-text-primary leading-tight">
                            {session.category === SessionCategory.INDIVIDUAL 
                              ? session.title.replace('Suivi Individuel - ', '') 
                              : session.title}
                          </p>
                          <p className="text-[9px] text-slds-text-secondary font-bold uppercase">
                            {SESSION_TYPE_LABELS[session.type]}
                          </p>
                        </div>
                      </div>
                    </td>
                    <td className="p-4">
                      <div>
                        <p className="text-xs font-bold text-slds-text-primary">{session.facilitatorName}</p>
                        <p className="text-[9px] text-slds-text-secondary font-bold uppercase">
                          {session.facilitatorType === FacilitatorType.CONSULTANT ? 'Consultant' : 'Interne'}
                        </p>
                      </div>
                    </td>
                    <td className="p-4">
                      <div className="flex items-center gap-2 text-xs font-bold text-slds-text-primary">
                        <CalendarDays size={14} className="text-slds-brand" />
                        {formatDate(session.date)}
                        <span className="text-slds-text-secondary ml-1 font-medium">{session.startTime}</span>
                      </div>
                    </td>
                    <td className="p-4">
                      <div className="flex items-center gap-2 text-xs font-bold text-slds-text-secondary">
                        <MapPin size={14} className="text-slds-text-secondary" />
                        {client ? client.destinationCity : (session.location || '—')}
                      </div>
                    </td>
                    <td className="p-4 text-center">
                      {activeCategory === SessionCategory.INDIVIDUAL ? (
                        <span className={`inline-block px-2 py-0.5 rounded text-[9px] font-bold border uppercase tracking-widest ${getAttendanceBadge(session.individualStatus)}`}>
                          {session.individualStatus || 'À VENIR'}
                        </span>
                      ) : (
                        <div className="flex flex-col items-center">
                          <p className="text-xs font-bold text-slds-text-primary">{session.participantIds.length}</p>
                          <p className="text-[8px] text-slds-text-secondary font-bold uppercase">Inscrits</p>
                        </div>
                      )}
                    </td>
                    <td className="p-4 text-right">
                      <ChevronRight size={16} className="text-slds-text-secondary group-hover:text-slds-brand" />
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>

        {/* Pagination UI */}
        <Pagination 
          currentPage={currentPage}
          totalPages={totalPages}
          onPageChange={setCurrentPage}
          totalItems={filteredSessions.length}
          itemsPerPage={itemsPerPage}
          label="séances"
        />

      </div>

      {/* Modale de Détails SLDS */}
      {viewingSession && (
        <div className="fixed inset-0 bg-black/50 z-[250] flex items-center justify-center p-4">
          <div className="slds-card w-full max-w-xl shadow-2xl overflow-hidden animate-in zoom-in-95 duration-200">
            <div className="p-4 border-b border-slds-border flex justify-between items-center bg-slds-bg">
               <div className="flex items-center gap-3">
                 <div className={`p-2 rounded ${viewingSession.category === SessionCategory.GROUP ? 'bg-indigo-500 text-white' : 'bg-slds-brand text-white'} shadow-sm`}>
                   <CalendarDays size={20} />
                 </div>
                 <div>
                   <h3 className="text-base font-bold text-slds-text-primary">{viewingSession.title}</h3>
                 </div>
               </div>
               <button onClick={() => setViewingSession(null)} className="p-2 hover:bg-white rounded text-slds-text-secondary"><X size={20} /></button>
            </div>
            
            <div className="p-6 space-y-6 max-h-[70vh] overflow-y-auto">
               <div className="grid grid-cols-2 gap-6">
                  <div className="space-y-1">
                    <p className="text-[10px] font-bold text-slds-text-secondary uppercase">Service</p>
                    <p className="text-xs font-bold text-slds-text-primary">{SESSION_TYPE_LABELS[viewingSession.type]}</p>
                  </div>
                  <div className="space-y-1">
                    <p className="text-[10px] font-bold text-slds-text-secondary uppercase">Intervenant</p>
                    <p className="text-xs font-bold text-slds-text-primary">{viewingSession.facilitatorName}</p>
                    <p className="text-[9px] text-slds-text-secondary font-bold uppercase">{viewingSession.facilitatorType}</p>
                  </div>
                  <div className="space-y-1">
                    <p className="text-[10px] font-bold text-slds-text-secondary uppercase">Date & Heure</p>
                    <p className="text-xs font-bold text-slds-text-primary">{formatDate(viewingSession.date)} à {viewingSession.startTime}</p>
                    <p className="text-[9px] text-slds-text-secondary font-bold uppercase">{viewingSession.duration} minutes</p>
                  </div>
               </div>

               {viewingSession.category === SessionCategory.INDIVIDUAL && (
                 <div className="grid grid-cols-1 gap-4">
                    <div className="p-3 bg-slds-bg border border-slds-border rounded">
                       <p className="text-[10px] font-bold text-slds-text-secondary uppercase flex items-center gap-2 mb-2">
                          <CheckCircle2 size={12} /> État de Présence
                       </p>
                       <p className="text-[10px] font-bold text-slds-text-primary uppercase tracking-widest">{viewingSession.individualStatus || 'NON RENSEIGNÉ'}</p>
                    </div>
                    {viewingSession.discussedNeeds && (
                      <div className="p-3 bg-slds-bg border border-slds-border rounded">
                         <p className="text-[10px] font-bold text-slds-text-secondary uppercase flex items-center gap-2 mb-2">
                            <Target size={12} /> Besoins discutés
                         </p>
                         <p className="text-xs text-slds-text-primary leading-relaxed font-medium">{viewingSession.discussedNeeds}</p>
                      </div>
                    )}
                    {viewingSession.actions && (
                      <div className="p-3 bg-blue-50 border border-blue-100 rounded">
                         <p className="text-[10px] font-bold text-slds-brand uppercase flex items-center gap-2 mb-2">
                            <Activity size={12} /> Actions planifiées
                         </p>
                         <p className="text-xs text-slds-text-primary leading-relaxed font-medium">{viewingSession.actions}</p>
                      </div>
                    )}
                 </div>
               )}

               <div className="p-4 bg-slds-bg rounded border border-slds-border">
                  <p className="text-[10px] font-bold text-slds-text-secondary uppercase mb-3">Informations Complémentaires</p>
                  <div className="space-y-3">
                    <div className="flex items-center gap-3">
                      <MapPin size={16} className="text-slds-text-secondary" />
                      <span className="text-xs font-bold text-slds-text-primary">{viewingSession.location || 'Lieu non spécifié'}</span>
                    </div>
                    {viewingSession.zoomLink && (
                      <div className="flex items-center gap-3">
                        <Video size={16} className="text-slds-brand" />
                        <a href={viewingSession.zoomLink} target="_blank" className="text-xs font-bold text-slds-brand underline">Lien de la visioconférence</a>
                      </div>
                    )}
                    <div className="flex items-center gap-3">
                      <Languages size={16} className="text-slds-success" />
                      <span className="text-xs font-bold text-slds-text-primary">{viewingSession.needsInterpretation ? 'Interprétation requise' : 'Français uniquement'}</span>
                    </div>
                  </div>
               </div>

               {viewingSession.notes && (
                 <div className="space-y-1">
                   <p className="text-[10px] font-bold text-slds-text-secondary uppercase">Notes générales</p>
                   <p className="text-xs font-medium text-slds-text-secondary leading-relaxed italic">"{viewingSession.notes}"</p>
                 </div>
               )}
            </div>

            <div className="p-4 bg-slds-bg border-t border-slds-border flex justify-end gap-3">
               {onDeleteSession && (
                 <button 
                  onClick={() => setSessionToDelete(viewingSession.id)}
                  className="slds-button slds-button-neutral text-slds-error border-slds-error hover:bg-red-50"
                 >
                   Supprimer
                 </button>
               )}
               <button onClick={() => setViewingSession(null)} className="slds-button slds-button-brand">Fermer</button>
            </div>
          </div>
        </div>
      )}

      {/* Confirmation de Suppression */}
      <ConfirmModal 
        isOpen={!!sessionToDelete}
        title="Supprimer la séance"
        message="Voulez-vous vraiment supprimer définitivement cette séance ? Cette action est irréversible."
        confirmLabel="Supprimer"
        onConfirm={() => { if(sessionToDelete) { onDeleteSession?.(sessionToDelete); setViewingSession(null); setSessionToDelete(null); } }}
        onCancel={() => setSessionToDelete(null)}
      />

      {/* Modale de Création SLDS */}
      {showModal && (
        <div className="fixed inset-0 bg-black/50 z-[300] flex items-center justify-center p-4">
          <div className="slds-card w-full max-w-2xl shadow-2xl overflow-hidden animate-in zoom-in-95 duration-200">
            <div className="p-4 border-b border-slds-border flex justify-between items-center bg-slds-bg">
              <div className="flex items-center gap-3">
                <div className="p-2 rounded bg-slds-brand text-white shadow-sm">
                  {showModal === 'individual' ? <User size={20} /> : <Users size={20} />}
                </div>
                <div>
                  <h3 className="text-base font-bold text-slds-text-primary">Nouvelle Séance {showModal === 'individual' ? 'Individuelle' : 'Collective'}</h3>
                </div>
              </div>
              <button onClick={handleCloseModal} className="p-2 text-slds-text-secondary hover:bg-white rounded transition-colors"><X size={20} /></button>
            </div>

            <form onSubmit={(e) => handleCreateSession(e, showModal === 'individual' ? SessionCategory.INDIVIDUAL : SessionCategory.GROUP)}>
              <div className="p-6 space-y-6 max-h-[65vh] overflow-y-auto">
                
                <div className="space-y-4">
                  <p className="text-[10px] font-bold text-slds-text-secondary uppercase border-b pb-2">Informations Générales</p>
                  
                  {showModal === 'group' ? (
                    <div className="space-y-1">
                      <label className="text-[10px] font-bold text-slds-text-secondary uppercase">Titre de la séance collective</label>
                      <input name="title" required placeholder="Ex: Webinaire Emploi IT..." className="slds-input" />
                    </div>
                  ) : (
                    <div className="space-y-2">
                      <label className="text-[10px] font-bold text-slds-text-secondary uppercase">Rechercher un client</label>
                      
                      {!selectedClient ? (
                        <div className="relative">
                          <Search size={14} className="absolute left-3 top-1/2 -translate-y-1/2 text-slds-text-secondary" />
                          <input 
                            type="text"
                            placeholder="Nom ou email..."
                            className="slds-input pl-9"
                            value={clientSearchQuery}
                            onChange={(e) => setClientSearchQuery(e.target.value)}
                          />
                          {filteredClientsForSearch.length > 0 && (
                            <div className="absolute top-full left-0 w-full bg-white border border-slds-border rounded shadow-xl mt-1 z-[400] overflow-hidden divide-y divide-slds-border">
                              {filteredClientsForSearch.map(c => (
                                <button 
                                  key={c.id}
                                  type="button"
                                  onClick={() => { setSelectedClient(c); setClientSearchQuery(''); }}
                                  className="w-full flex items-center gap-3 p-3 hover:bg-slds-bg transition-all text-left group"
                                >
                                  <div className="w-8 h-8 rounded bg-slds-bg text-slds-text-secondary flex items-center justify-center font-bold text-[10px] group-hover:bg-slds-brand group-hover:text-white transition-colors">
                                    {c.firstName[0]}{c.lastName[0]}
                                  </div>
                                  <div className="flex-1 min-w-0">
                                    <p className="text-xs font-bold text-slds-text-primary truncate">{c.firstName} {c.lastName}</p>
                                    <p className="text-[9px] text-slds-text-secondary font-bold uppercase truncate">{c.profession}</p>
                                  </div>
                                  <ChevronRight size={14} className="text-slds-text-secondary" />
                                </button>
                              ))}
                            </div>
                          )}
                        </div>
                      ) : (
                        <div className="flex items-center justify-between p-3 bg-blue-50 border border-blue-100 rounded animate-in fade-in slide-in-from-left-2">
                          <div className="flex items-center gap-3">
                            <div className="w-8 h-8 rounded bg-slds-brand text-white flex items-center justify-center font-bold text-xs shadow-sm">
                              {selectedClient.firstName[0]}{selectedClient.lastName[0]}
                            </div>
                            <div>
                              <p className="text-xs font-bold text-slds-text-primary">{selectedClient.firstName} {selectedClient.lastName}</p>
                              <p className="text-[9px] text-slds-brand font-bold uppercase">{selectedClient.profession}</p>
                            </div>
                          </div>
                          <button 
                            type="button"
                            onClick={() => setSelectedClient(null)}
                            className="p-1 text-slds-text-secondary hover:text-slds-error hover:bg-white rounded transition-all"
                          >
                            <X size={16} />
                          </button>
                        </div>
                      )}
                    </div>
                  )}
                </div>

                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  <div className="space-y-1">
                    <label className="text-[10px] font-bold text-slds-text-secondary uppercase">Type de service</label>
                    <select name="type" required className="slds-input">
                      {Object.values(SessionType).map(t => <option key={t} value={t}>{SESSION_TYPE_LABELS[t]}</option>)}
                    </select>
                  </div>
                  <div className="space-y-1">
                    <label className="text-[10px] font-bold text-slds-text-secondary uppercase">Date</label>
                    <input type="date" name="date" value={formDate} onChange={(e) => setFormDate(e.target.value)} required className="slds-input" />
                  </div>
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
                  <input type="text" name="location" placeholder="CFGT ou Virtuel..." className="slds-input" />
                </div>

                {showModal === 'group' && (
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
                      <div className="p-3 bg-blue-50 border border-blue-100 rounded animate-in fade-in slide-in-from-top-1">
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
                           <div className="mt-2 flex items-start gap-2 p-2 bg-amber-50 border border-amber-200 rounded text-[10px] font-bold text-amber-700">
                             <AlertCircle size={14} className="flex-shrink-0" />
                             {validationError}
                           </div>
                         )}
                      </div>
                    )}
                  </div>
                )}

                {showModal === 'individual' && (
                  <div className="pt-4 border-t border-slds-border space-y-4">
                    <p className="text-[10px] font-bold text-slds-text-secondary uppercase flex items-center gap-2">
                       <ClipboardList size={14} className="text-slds-success" /> Suivi individuel
                    </p>
                    
                    <div className="space-y-2">
                       <label className="text-[10px] font-bold text-slds-text-secondary uppercase">État de présence</label>
                       <div className="flex flex-wrap gap-2">
                          {Object.values(AttendanceStatus).map(status => (
                            <button
                              key={status}
                              type="button"
                              onClick={() => setAttendance(status)}
                              className={`flex items-center gap-2 px-3 py-1.5 rounded text-[9px] font-bold uppercase border transition-all ${attendance === status ? 'bg-slds-brand text-white border-slds-brand shadow-sm' : 'bg-slds-bg text-slds-text-secondary border-slds-border hover:border-slds-brand'}`}
                            >
                              {status === AttendanceStatus.PRESENT ? <UserCheck size={14}/> : <UserX size={14}/>}
                              {status}
                            </button>
                          ))}
                       </div>
                    </div>

                    <div className="space-y-1">
                      <label className="text-[10px] font-bold text-slds-text-secondary uppercase flex items-center gap-1">
                        <Target size={12} className="text-slds-brand" /> Besoins discutés
                      </label>
                      <textarea 
                        name="discussedNeeds" 
                        className="slds-input h-20 resize-none text-xs"
                      />
                    </div>

                    <div className="space-y-1">
                      <label className="text-[10px] font-bold text-slds-text-secondary uppercase flex items-center gap-1">
                        <Activity size={12} className="text-slds-success" /> Actions planifiées
                      </label>
                      <textarea 
                        name="actions" 
                        className="slds-input h-20 resize-none text-xs"
                      />
                    </div>
                  </div>
                )}

                <div className="space-y-1">
                  <label className="text-[10px] font-bold text-slds-text-secondary uppercase flex items-center gap-1">
                    <MessageSquare size={12} className="text-slds-text-secondary" /> Notes générales
                  </label>
                  <textarea 
                    name="notes" 
                    className="slds-input h-20 resize-none text-xs"
                  />
                </div>
              </div>

              <div className="p-4 bg-slds-bg border-t border-slds-border flex justify-end gap-3">
                <button type="button" onClick={handleCloseModal} className="slds-button slds-button-neutral">Annuler</button>
                <button 
                  type="submit" 
                  disabled={(showModal === 'individual' && !selectedClient) || !!validationError}
                  className="slds-button slds-button-brand disabled:opacity-50 disabled:cursor-not-allowed"
                >
                  Enregistrer
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
};

export default SessionList;
