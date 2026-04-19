
import React, { useState, useMemo, useEffect } from 'react';
import { 
  Session, 
  SessionType, 
  SessionCategory, 
  Client, 
  FacilitatorType, 
  AttendanceStatus, 
  Partner, 
  PartnerType, 
  Contract, 
  UserRole,
  Profile
} from '../types';
import { SESSION_TYPE_LABELS } from '../constants';
import ParticipantManager from './ParticipantManager';
import { 
  X, 
  User, 
  Users, 
  Calendar, 
  Clock, 
  MapPin, 
  Video, 
  FileText, 
  AlertCircle, 
  ClipboardList, 
  Target, 
  Activity, 
  MessageSquare,
  CheckCircle2,
  ChevronRight,
  Search,
  UserCheck,
  UserX
} from 'lucide-react';

interface SessionModalProps {
  isOpen: boolean;
  onClose: () => void;
  session: Session | null; // null si création
  initialCategory?: SessionCategory;
  clients: Client[];
  partners: Partner[];
  contracts: Contract[];
  allProfiles: Profile[];
  activeRole: UserRole;
  currentUserName: string;
  currentUserId?: string;
  onSave: (session: Session) => void;
}

const SessionModal: React.FC<SessionModalProps> = ({ 
  isOpen, 
  onClose, 
  session, 
  initialCategory = SessionCategory.INDIVIDUAL,
  clients,
  partners,
  contracts,
  allProfiles,
  activeRole,
  currentUserName,
  currentUserId,
  onSave
}) => {
  const isEditing = !!session;
  const [category, setCategory] = useState<SessionCategory>(session?.category || initialCategory);
  const [formDate, setFormDate] = useState<string>('');
  const [formFacilitatorType, setFormFacilitatorType] = useState<FacilitatorType>(FacilitatorType.CONSULTANT);
  const [selectedConsultantName, setSelectedConsultantName] = useState<string>('');
  const [selectedContractId, setSelectedContractId] = useState<string>('');
  const [modalParticipantIds, setModalParticipantIds] = useState<string[]>([]);
  const [selectedClient, setSelectedClient] = useState<Client | null>(null);
  const [clientSearchQuery, setClientSearchQuery] = useState('');
  const [attendance, setAttendance] = useState<AttendanceStatus>(AttendanceStatus.PRESENT);

  // Initialisation à l'ouverture
  useEffect(() => {
    if (isOpen) {
      if (session) {
        setCategory(session.category);
        setFormDate(session.date);
        setFormFacilitatorType(session.facilitatorType);
        setSelectedConsultantName(session.facilitatorName);
        setSelectedContractId(session.contractId || '');
        setModalParticipantIds(session.participantIds || []);
        if (session.category === SessionCategory.INDIVIDUAL) {
          const client = (clients || []).find(c => session.participantIds?.includes(c.id));
          setSelectedClient(client || null);
          setAttendance(session.individualStatus || AttendanceStatus.PRESENT);
        }
      } else {
        setCategory(initialCategory);
        setFormDate(new Date().toISOString().split('T')[0]);
        setFormFacilitatorType(FacilitatorType.CONSULTANT);
        setSelectedConsultantName('');
        setSelectedContractId('');
        setModalParticipantIds([]);
        setSelectedClient(null);
        setAttendance(AttendanceStatus.PRESENT);
      }
    }
  }, [isOpen, session, initialCategory, clients]);

  const isGroup = category === SessionCategory.GROUP;

  const availableFacilitators = useMemo(() => {
    if (formFacilitatorType === FacilitatorType.CONSULTANT) {
      return partners.filter(p => p.type === PartnerType.CONSULTANT);
    } else {
      return partners.filter(p => p.type === PartnerType.INTERNAL || p.type === PartnerType.EXTERNAL);
    }
  }, [partners, formFacilitatorType]);

  const activeContractsForConsultant = useMemo(() => {
    if (!selectedConsultantName || formFacilitatorType !== FacilitatorType.CONSULTANT) return [];
    return contracts.filter(c => c.consultantName === selectedConsultantName && c.status === 'ACTIVE');
  }, [contracts, selectedConsultantName, formFacilitatorType]);

  const validationError = useMemo(() => {
    if (!isGroup || formFacilitatorType !== FacilitatorType.CONSULTANT || !selectedContractId) return null;
    const contract = activeContractsForConsultant.find(c => c.id === selectedContractId);
    if (!contract) return null;

    if (contract.usedSessions >= contract.totalSessions) {
      return `Attention : Le quota de ce contrat est atteint (${contract.usedSessions}/${contract.totalSessions}).`;
    }

    if (formDate && (formDate < contract.startDate || formDate > contract.endDate)) {
      return `Date invalide : La séance doit avoir lieu entre le ${new Date(contract.startDate + 'T12:00:00').toLocaleDateString('fr-FR')} et le ${new Date(contract.endDate + 'T12:00:00').toLocaleDateString('fr-FR')}.`;
    }
    return null;
  }, [isGroup, formFacilitatorType, selectedContractId, formDate, activeContractsForConsultant]);

  const filteredClientsForSearch = useMemo(() => {
    if (!clientSearchQuery || clientSearchQuery.length < 2) return [];
    const query = clientSearchQuery.toLowerCase();
    return (clients || []).filter(c => 
      c.firstName?.toLowerCase().includes(query) ||
      c.lastName?.toLowerCase().includes(query) ||
      c.email?.toLowerCase().includes(query)
    ).slice(0, 10);
  }, [clients, clientSearchQuery]);

  const handleSubmit = (e: React.FormEvent<HTMLFormElement>) => {
    e.preventDefault();
    const formData = new FormData(e.currentTarget);
    
    if (!isGroup && !selectedClient && !isEditing) {
      alert("Veuillez sélectionner un client.");
      return;
    }

    const facilitatorName = isGroup ? (formData.get('facilitatorName') as string) : (session?.facilitatorName || currentUserName);
    const contractId = isGroup ? (formData.get('contractId') as string) : undefined;
    
    const title = isGroup 
      ? (formData.get('title') as string) 
      : (selectedClient ? `${selectedClient.firstName} ${selectedClient.lastName}` : (session?.title || 'Client Inconnu'));

    const sessionData: Session = {
      id: session?.id || Date.now().toString(),
      title,
      type: formData.get('type') as SessionType,
      category,
      date: formData.get('date') as string,
      startTime: formData.get('startTime') as string,
      duration: parseInt(formData.get('duration') as string),
      participantIds: isGroup ? modalParticipantIds : (selectedClient ? [selectedClient.id] : (session?.participantIds || [])),
      noShowIds: !isGroup && selectedClient && attendance === AttendanceStatus.ABSENT ? [selectedClient.id] : (session?.noShowIds || []),
      location: formData.get('location') as string || 'CFGT',
      notes: formData.get('notes') as string || '',
      discussedNeeds: formData.get('discussedNeeds') as string || '',
      actions: formData.get('actions') as string || '',
      facilitatorName,
      facilitatorType: isGroup ? (formData.get('facilitatorType') as FacilitatorType) : FacilitatorType.ORGANIZATION,
      advisorName: session?.advisorName || currentUserName,
      advisorId: session?.advisorId || currentUserId,
      contractId: contractId || undefined,
      individualStatus: isGroup ? undefined : attendance,
      needsInterpretation: formData.get('needsInterpretation') === 'true',
      zoomLink: formData.get('zoomLink') as string || '',
      zoomId: formData.get('zoomId') as string || '',
      invoiceReceived: session?.invoiceReceived || false, 
      invoiceSubmitted: session?.invoiceSubmitted || false, 
      invoicePaid: session?.invoicePaid || false,
    };

    onSave(sessionData);
  };

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 bg-black/50 z-[300] flex items-center justify-center p-4">
      <div className="slds-card w-full max-w-2xl shadow-2xl overflow-hidden animate-in zoom-in-95 duration-200 flex flex-col h-[650px] max-h-[90vh]">
        {/* Header */}
        <div className="p-4 border-b border-slds-border flex justify-between items-center bg-slds-bg shrink-0">
          <div className="flex items-center gap-3">
            <div className={`p-2 rounded ${isGroup ? 'bg-indigo-500' : 'bg-slds-brand'} text-white shadow-sm`}>
              {isGroup ? <Users size={20} /> : <User size={20} />}
            </div>
            <div>
              <h3 className="text-base font-bold text-slds-text-primary">
                {isEditing ? 'Modifier' : 'Nouvelle'} Séance {isGroup ? 'Collective' : 'Individuelle'}
              </h3>
            </div>
          </div>
          <button onClick={onClose} className="p-2 text-slds-text-secondary hover:bg-white rounded transition-colors"><X size={20} /></button>
        </div>

        {/* Body */}
        <form id="session-modal-form" onSubmit={handleSubmit} className="flex flex-col flex-1 min-h-0 overflow-hidden">
          <div className="p-6 space-y-6 overflow-y-auto flex-1 min-h-0">
            {/* Informations Générales */}
            <div className="space-y-4">
              <p className="text-[10px] font-bold text-slds-text-secondary uppercase border-b pb-2 tracking-widest">Informations Générales</p>
              
              {isGroup && (
                <div className="space-y-1">
                  <label className="text-[10px] font-bold text-slds-text-secondary uppercase">Titre de la séance collective</label>
                  <input name="title" required defaultValue={session?.title} placeholder="Ex: Webinaire Emploi IT..." className="slds-input" />
                </div>
              )}

              {!isGroup && (
                <div className="space-y-2">
                  <label className="text-[10px] font-bold text-slds-text-secondary uppercase">Client</label>
                  {!selectedClient ? (
                    <div className="relative">
                      <Search size={14} className="absolute left-3 top-1/2 -translate-y-1/2 text-slds-text-secondary" />
                      <input 
                        type="text"
                        placeholder="Rechercher par nom ou email..."
                        className="slds-input pl-9"
                        value={clientSearchQuery}
                        onChange={(e) => setClientSearchQuery(e.target.value)}
                      />
                      {filteredClientsForSearch.length > 0 && (
                        <div className="absolute top-full left-0 w-full bg-white border border-slds-border rounded shadow-xl mt-1 z-[400] overflow-hidden divide-y divide-slds-border max-h-60 overflow-y-auto">
                          {filteredClientsForSearch.map(c => (
                            <button 
                              key={c.id}
                              type="button"
                              onClick={() => { setSelectedClient(c as any); setClientSearchQuery(''); }}
                              className="w-full flex items-center gap-3 p-3 hover:bg-slds-bg transition-all text-left group"
                            >
                              <div className="w-8 h-8 rounded bg-slds-bg text-slds-text-secondary flex items-center justify-center font-bold text-[10px] group-hover:bg-slds-brand group-hover:text-white transition-colors">
                                {c.firstName?.[0] || '?'}{c.lastName?.[0] || '?'}
                              </div>
                              <div className="flex-1 min-w-0">
                                <p className="text-xs font-bold text-slds-text-primary truncate">{c.firstName} {c.lastName}</p>
                                <p className="text-[9px] text-slds-text-secondary font-bold uppercase truncate">{ (c as any).profession || 'Client'}</p>
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
                          {selectedClient.firstName?.[0] || '?'}{selectedClient.lastName?.[0] || '?'}
                        </div>
                        <div>
                          <p className="text-xs font-bold text-slds-text-primary">{selectedClient.firstName} {selectedClient.lastName}</p>
                          <p className="text-[9px] text-slds-brand font-bold uppercase">{selectedClient.profession || 'Inscrit'}</p>
                        </div>
                      </div>
                      {!isEditing && (
                        <button 
                          type="button"
                          onClick={() => setSelectedClient(null)}
                          className="p-1 text-slds-text-secondary hover:text-slds-error hover:bg-white rounded transition-all"
                        >
                          <X size={16} />
                        </button>
                      )}
                    </div>
                  )}
                </div>
              )}

              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div className="space-y-1">
                  <label className="text-[10px] font-bold text-slds-text-secondary uppercase">Type de service</label>
                  <select name="type" required defaultValue={session?.type} className="slds-input">
                    {Object.values(SessionType).map(t => <option key={t} value={t}>{SESSION_TYPE_LABELS[t]}</option>)}
                  </select>
                </div>
                <div className="space-y-1">
                  <label className="text-[10px] font-bold text-slds-text-secondary uppercase text-slds-brand">Date de la séance</label>
                  <input type="date" name="date" value={formDate} onChange={(e) => setFormDate(e.target.value)} required className="slds-input border-slds-brand/30" />
                </div>
                <div className="space-y-1">
                  <label className="text-[10px] font-bold text-slds-text-secondary uppercase">Heure de début</label>
                  <input type="time" name="startTime" defaultValue={session?.startTime || "09:00"} required className="slds-input" />
                </div>
                <div className="space-y-1">
                  <label className="text-[10px] font-bold text-slds-text-secondary uppercase">Durée (minutes)</label>
                  <input type="number" name="duration" defaultValue={session?.duration || "60"} required className="slds-input" />
                </div>
              </div>

              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div className="space-y-1">
                  <label className="text-[10px] font-bold text-slds-text-secondary uppercase flex items-center gap-1">
                    <MapPin size={12} className="text-slate-400" /> Lieu
                  </label>
                  <input type="text" name="location" defaultValue={session?.location} placeholder="CFGT ou Virtuel..." className="slds-input" />
                </div>
                <div className="space-y-1">
                  <label className="text-[10px] font-bold text-slds-text-secondary uppercase flex items-center gap-1">
                    <Video size={12} className="text-slds-brand" /> Lien Visioconférence
                  </label>
                  <input type="text" name="zoomLink" defaultValue={session?.zoomLink} placeholder="Lien Zoom/Teams..." className="slds-input text-slds-brand" />
                </div>
              </div>
            </div>

            {/* Intervenant et Contrat (Collectif) */}
            {isGroup && (
              <div className="space-y-4 pt-4 border-t border-slds-border">
                <p className="text-[10px] font-bold text-slds-text-secondary uppercase tracking-widest">Responsables & Contrats</p>
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
                      <option value={FacilitatorType.ORGANIZATION}>Organisme ou Interne</option>
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

            {/* Participant Manager (Collectif) */}
            {isGroup && (
              <div className="pt-4 border-t border-slds-border">
                <ParticipantManager 
                  clients={clients} 
                  selectedParticipantIds={modalParticipantIds} 
                  onChange={setModalParticipantIds} 
                />
              </div>
            )}

            {/* Suivi Individuel (Individuelle) */}
            {!isGroup && (
              <div className="pt-4 border-t border-slds-border space-y-4">
                <p className="text-[10px] font-bold text-slds-text-secondary uppercase flex items-center gap-2">
                   <ClipboardList size={14} className="text-slds-success" /> Suivi & Présence
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
                    defaultValue={session?.discussedNeeds}
                    placeholder="Synthèse des besoins exprimés par le client..."
                    className="slds-input h-20 resize-none text-xs"
                  />
                </div>

                <div className="space-y-1">
                  <label className="text-[10px] font-bold text-slds-text-secondary uppercase flex items-center gap-1">
                    <Activity size={12} className="text-slds-success" /> Actions planifiées
                  </label>
                  <textarea 
                    name="actions" 
                    defaultValue={session?.actions}
                    placeholder="Prochaines étapes, rendez-vous, orientatons..."
                    className="slds-input h-20 resize-none text-xs"
                  />
                </div>
              </div>
            )}

            {/* Notes Générales */}
            <div className="space-y-1">
              <label className="text-[10px] font-bold text-slds-text-secondary uppercase flex items-center gap-1">
                <MessageSquare size={12} className="text-slate-400" /> Notes Internes
              </label>
              <textarea 
                name="notes" 
                defaultValue={session?.notes}
                placeholder="Commentaires additionnels..."
                className="slds-input h-20 resize-none text-xs"
              />
            </div>
          </div>

          {/* Footer */}
          <div className="p-4 bg-slds-bg border-t border-slds-border flex justify-end gap-3 shrink-0">
            <button type="button" onClick={onClose} className="slds-button slds-button-neutral">Annuler</button>
            <button 
              type="submit" 
              disabled={(!isGroup && !selectedClient) || !!validationError}
              className="slds-button slds-button-brand disabled:opacity-50 disabled:cursor-not-allowed"
            >
              {isEditing ? 'Enregistrer les modifications' : 'Confirmer'}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
};

export default SessionModal;
