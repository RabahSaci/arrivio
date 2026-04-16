
import React, { useState, useEffect, useMemo } from 'react';
import { Client, ReferralStatus, Mentor, Partner, Session, UserRole, Note, Profile, UserActivityLog, AttendanceStatus, SessionType, SessionCategory } from '../types';
import { STATUS_COLORS, MOCK_CLIENTS, MOCK_SESSIONS, SESSION_TYPE_LABELS } from '../constants';
import { getPeerMatches, generateClientSynthesis } from '../services/geminiService';
import ConfirmModal from '../components/ConfirmModal';
import { 
  ArrowLeft, 
  Send, 
  FileText, 
  Info, 
  Zap, 
  CheckCircle2,
  RefreshCw,
  Share2,
  Calendar,
  History,
  Clock,
  Globe,
  Archive,
  MessageSquare,
  HeartHandshake,
  MapPin,
  Briefcase,
  ChevronRight,
  Sparkles,
  Loader2,
  Phone,
  Mail,
  Tag,
  X,
  UserX,
  AlertCircle,
  Building2,
  User,
  Fingerprint,
  FileCheck,
  ShieldCheck,
  Database,
  Cpu,
  Star,
  Activity,
  UserCheck,
  ChevronDown,
  ArrowRight,
  Check,
  Filter
} from 'lucide-react';

interface ClientDetailsProps {
  client: Client;
  activeRole: UserRole;
  currentUserName: string;
  onBack: () => void;
  onUpdate: (updatedClient: Client) => void;
  onAddNote: (clientId: string, content: string) => Promise<void>;
  onUpdateSession?: (session: Session) => Promise<void>;
  allClients?: Client[];
  allMentors?: Mentor[];
  allSessions?: Session[];
  allPartners?: Partner[];
  allProfiles?: Profile[];
  allLogs?: UserActivityLog[];
}

const ClientDetails: React.FC<ClientDetailsProps> = ({ 
  client, 
  activeRole, 
  currentUserName,
  onBack, 
  onUpdate,
  onAddNote,
  onUpdateSession,
  allClients = MOCK_CLIENTS, 
  allSessions = MOCK_SESSIONS,
  allPartners = [],
  allProfiles = [],
  allLogs = []
}) => {
  const DataField = ({ label, value }: { label: string, value?: string | null }) => (
    <div className="flex flex-col gap-1">
      <p className="text-[9px] font-black text-slate-400 uppercase tracking-tighter">{label}</p>
      <p className="text-[11px] font-bold text-slate-800 break-words">{value || '---'}</p>
    </div>
  );

  const [peerMatches, setPeerMatches] = useState<{ clientId: string; score: number; reason: string }[]>([]);
  const [synthesis, setSynthesis] = useState<string | null>(null);
  const [peersLoading, setPeersLoading] = useState(false);
  const [synthesisLoading, setSynthesisLoading] = useState(false);
  const [activeSubTab, setActiveSubTab] = useState<'info' | 'dossier' | 'workflow' | 'peers' | 'sessions' | 'audit'>('info');
  const [newNote, setNewNote] = useState('');
  
  const [selectedPartnerId, setSelectedPartnerId] = useState(client.assignedPartnerId || '');
  const [selectedSecondaryIds, setSelectedSecondaryIds] = useState<string[]>(client.secondaryPartnerIds || []);
  const [secondaryCityFilter, setSecondaryCityFilter] = useState<string>('ALL');
  
  const [showCloseConfirm, setShowCloseConfirm] = useState(false);
  const [isUpdatingAttendance, setIsUpdatingAttendance] = useState<string | null>(null);

  // Historique unifié (Timeline)
  const fullTimeline = useMemo(() => {
    const items: { id: string; type: 'NOTE' | 'SYSTEM' | 'SESSION' | 'REFERRAL'; title?: string; content: string; author: string; timestamp: string }[] = [];
    
    // Notes
    client.notes.forEach(note => {
      items.push({ id: note.id, type: 'NOTE', content: note.content, author: note.authorName, timestamp: note.timestamp });
    });

    // Logs système (Modifications profil)
    allLogs.forEach(log => {
      // On vérifie si le log concerne ce client (via nom ou ID dans les détails)
      if (log.entityType === 'CLIENT' && (log.details.includes(client.firstName) || log.details.includes(client.id) || log.details.includes(client.lastName))) {
        items.push({ id: log.id, type: 'SYSTEM', title: log.actionType, content: log.details, author: log.userName, timestamp: log.timestamp });
      }
    });

    // Séances
    const clientSessions = allSessions.filter(s => s.participantIds.includes(client.id));
    clientSessions.forEach(s => {
      const isAbsent = s.noShowIds.includes(client.id);
      items.push({ 
        id: s.id, 
        type: 'SESSION', 
        title: `SÉANCE : ${s.title}`, 
        content: `${isAbsent ? 'Absent' : 'Présent'} - ${s.type}${s.notes ? ` : ${s.notes}` : ''}`, 
        author: s.facilitatorName, 
        timestamp: `${s.date}T${s.startTime}:00Z` 
      });
    });

    // Référencements
    if (client.referralDate) {
      items.push({ 
        id: 'ref-1', 
        type: 'REFERRAL', 
        title: 'TRANSFERT VERS PARTENAIRE', 
        content: `Dossier transféré vers ${allPartners.find(p => p.id === client.assignedPartnerId)?.name || 'organisme partenaire'}`, 
        author: 'Conseiller CFGT', 
        timestamp: client.referralDate 
      });
    }

    return items.sort((a, b) => new Date(b.timestamp).getTime() - new Date(a.timestamp).getTime());
  }, [client.notes, allLogs, client.firstName, client.lastName, client.id, allSessions, client.referralDate, allPartners, client.assignedPartnerId]);

  const availableTabs = useMemo(() => {
    const tabs = [
      { id: 'info', label: 'Analyse IA', icon: Sparkles },
      { id: 'dossier', label: 'Dossier Complet', icon: Database },
      { id: 'workflow', label: 'Suivi Transfert', icon: Share2 },
      { id: 'peers', label: 'Entraide Pairs', icon: HeartHandshake },
      { id: 'sessions', label: 'Activités CFGT', icon: Calendar },
      { id: 'audit', label: 'Historique Complet', icon: History }
    ];
    if (activeRole === UserRole.PARTNER) return tabs.filter(t => t.id === 'dossier' || t.id === 'workflow' || t.id === 'audit');
    return tabs;
  }, [activeRole]);

  const uniqueCities = useMemo(() => {
    return Array.from(new Set(allPartners.map(p => p.city))).sort();
  }, [allPartners]);

  useEffect(() => {
    setSelectedPartnerId(client.assignedPartnerId || '');
    setSelectedSecondaryIds(client.secondaryPartnerIds || []);
  }, [client.id, client.assignedPartnerId, client.secondaryPartnerIds]);

  const handleAddNoteInternal = async () => {
    if (!newNote.trim()) return;
    await onAddNote(client.id, newNote);
    setNewNote('');
  };

  const handleRunSynthesis = async () => {
    setSynthesisLoading(true);
    try {
      const clientSessions = allSessions.filter(s => s.participantIds.includes(client.id));
      const result = await generateClientSynthesis(client, clientSessions);
      setSynthesis(result || "Impossible de générer la synthèse.");
    } catch (err) {
      console.error(err);
    } finally {
      setSynthesisLoading(false);
    }
  };

  const handleRunPeerMatching = async () => {
    setPeersLoading(true);
    try {
      const results = await getPeerMatches(client, allClients);
      setPeerMatches(results);
    } catch (err) {
      console.error(err);
    } finally {
      setPeersLoading(false);
    }
  };

  const handleToggleAttendance = async (session: Session) => {
    if (!onUpdateSession) return;
    setIsUpdatingAttendance(session.id);
    
    const isCurrentlyNoShow = session.noShowIds.includes(client.id);
    let newNoShowIds = [...session.noShowIds];
    let newStatus = session.individualStatus;

    if (isCurrentlyNoShow) {
      newNoShowIds = newNoShowIds.filter(id => id !== client.id);
      newStatus = AttendanceStatus.PRESENT;
    } else {
      newNoShowIds.push(client.id);
      newStatus = AttendanceStatus.ABSENT;
    }

    try {
      await onUpdateSession({
        ...session,
        noShowIds: newNoShowIds,
        individualStatus: session.category === 'INDIVIDUELLE' ? newStatus : session.individualStatus
      });
    } catch (err) {
      console.error("Erreur mise à jour assiduité:", err);
    } finally {
      setIsUpdatingAttendance(null);
    }
  };

  const handleReferralSubmission = () => {
    if (!selectedPartnerId) return;
    onUpdate({ 
      ...client, 
      status: ReferralStatus.REFERRED, 
      assignedPartnerId: selectedPartnerId, 
      secondaryPartnerIds: selectedSecondaryIds,
      referralDate: new Date().toISOString() 
    });
  };

  const handleSecondaryUpdate = () => {
    onUpdate({
      ...client,
      secondaryPartnerIds: selectedSecondaryIds
    });
  };

  const toggleSecondaryPartner = (partnerId: string) => {
    if (selectedSecondaryIds.includes(partnerId)) {
      setSelectedSecondaryIds(selectedSecondaryIds.filter(id => id !== partnerId));
    } else {
      setSelectedSecondaryIds([...selectedSecondaryIds, partnerId]);
    }
  };

  const handleConfirmClose = () => {
    onUpdate({ ...client, status: ReferralStatus.CLOSED, closedAt: new Date().toISOString() });
    onBack();
  };

  const handleToggleConsent = () => {
    onUpdate({ ...client, consentExternalReferral: !client.consentExternalReferral });
  };

  const handleToggleSubscription = () => {
    onUpdate({ ...client, isUnsubscribed: !client.isUnsubscribed });
  };

  const workflowSteps = [
    { st: ReferralStatus.PENDING, lab: 'Pré-Arrivée' },
    { st: ReferralStatus.REFERRED, lab: 'Soumis' },
    { st: ReferralStatus.ACKNOWLEDGED, lab: 'Reçu' },
    { st: ReferralStatus.CONTACTED, lab: 'Contacté' },
    { st: ReferralStatus.CLOSED, lab: 'Clôturé' }
  ];

  const currentStepIndex = workflowSteps.findIndex(x => x.st === client.status);

  const clientSessions = useMemo(() => {
    return allSessions.filter(s => s.participantIds.includes(client.id))
      .sort((a, b) => new Date(b.date).getTime() - new Date(a.date).getTime());
  }, [allSessions, client.id]);

  const stats = useMemo(() => {
    let validCount = 0;
    clientSessions.forEach(s => {
      if (s.category === SessionCategory.INDIVIDUAL) {
        if (s.individualStatus === AttendanceStatus.PRESENT || s.individualStatus === AttendanceStatus.ABSENT) {
          validCount++;
        }
      } else {
        // Group sessions are usually valid if participant was expected
        validCount++;
      }
    });
    return { validCount };
  }, [clientSessions]);

  const getReliabilityUI = (ratio: number) => {
    if (ratio === 0) return { color: 'text-emerald-500', bg: 'bg-emerald-50', label: 'Excellente assiduité' };
    if (ratio < 25) return { color: 'text-amber-500', bg: 'bg-amber-50', label: 'Assiduité correcte' };
    return { color: 'text-red-500', bg: 'bg-red-50', label: 'Défaut d\'assiduité' };
  };

  const rel = getReliabilityUI(client.noShowRatio || 0);

  const timelineIcons = {
    NOTE: <MessageSquare size={14} className="text-blue-500" />,
    SYSTEM: <ShieldCheck size={14} className="text-red-500" />,
    SESSION: <Calendar size={14} className="text-emerald-500" />,
    REFERRAL: <Share2 size={14} className="text-purple-500" />
  };

  return (
    <div className="space-y-6">
      <div className="flex justify-between items-center">
        <button onClick={onBack} className="flex items-center gap-3 px-4 py-2 text-slate-600 hover:text-blue-600 hover:bg-white rounded-2xl transition-all group text-base font-black uppercase tracking-tight">
          <ArrowLeft size={20} className="group-hover:-translate-x-1.5 transition-transform" /> Retour à la liste
        </button>
        <div className="flex items-center gap-3">
          <button 
            onClick={handleToggleConsent} 
            className={`flex items-center gap-2 px-4 py-2 rounded-xl text-xs font-black uppercase tracking-widest border transition-all shadow-sm ${
              client.consentExternalReferral 
                ? 'bg-emerald-50 text-emerald-600 border-emerald-100 hover:bg-emerald-100' 
                : 'bg-white text-slate-500 border-slate-200 hover:bg-slate-50'
            }`}
          >
            <Share2 size={14} /> {client.consentExternalReferral ? 'Consentement Externe Obtenu' : 'Demander Consentement Externe'}
          </button>

          <button 
            onClick={handleToggleSubscription} 
            className={`flex items-center gap-2 px-4 py-2 rounded-xl text-xs font-black uppercase tracking-widest border transition-all shadow-sm ${
              client.isUnsubscribed 
                ? 'bg-amber-50 text-amber-600 border-amber-100 hover:bg-amber-100' 
                : 'bg-white text-slate-500 border-slate-200 hover:bg-slate-50'
            }`}
          >
            {client.isUnsubscribed ? <RefreshCw size={14} /> : <UserX size={14} />}
            {client.isUnsubscribed ? 'Se réabonner' : 'Se désabonner'}
          </button>

          {activeRole !== UserRole.MENTOR && client.status !== ReferralStatus.CLOSED && (
             <button onClick={() => setShowCloseConfirm(true)} className="flex items-center gap-2 px-4 py-2 text-red-600 hover:bg-red-50 rounded-xl text-xs font-black uppercase tracking-widest border border-red-100 transition-all shadow-sm">
               <Archive size={14} /> Clôturer définitivement
             </button>
          )}
        </div>
      </div>

      <ConfirmModal 
        isOpen={showCloseConfirm}
        title="Archiver le dossier"
        message="IMPORTANT: Cette action archivera définitivement le dossier (Statut FERME). Les partenaires ne pourront plus modifier ce dossier. Voulez-vous continuer ?"
        confirmLabel="Confirmer la clôture"
        onConfirm={handleConfirmClose}
        onCancel={() => setShowCloseConfirm(false)}
      />

      <div className="flex flex-col lg:flex-row gap-6">
        <div className="lg:w-1/3 space-y-6">
          <div className="bg-white rounded-3xl border border-slate-200 shadow-sm p-8 text-center relative overflow-hidden">
            <div className={`absolute top-0 left-0 w-full h-2 ${client.status === ReferralStatus.CLOSED ? 'bg-slate-400' : 'bg-blue-600'}`} />
            <div className="w-24 h-24 rounded-full bg-slate-50 border-4 border-white flex items-center justify-center text-slate-600 text-3xl font-black mx-auto mb-4 shadow-sm">
              {client.firstName[0]}{client.lastName[0]}
            </div>
            <h2 className="text-2xl font-bold text-slate-900 tracking-tight">{client.firstName} {client.lastName}</h2>
            <div className={`mt-3 inline-block px-4 py-1.5 rounded-full text-[10px] font-black tracking-widest uppercase border ${STATUS_COLORS[client.status]}`}>
              {client.status.replace(/_/g, ' ')}
            </div>
          </div>

          <div className={`p-6 rounded-3xl border ${rel.bg} border-current/10 flex flex-col items-center text-center shadow-sm`}>
             <div className={`w-14 h-14 rounded-2xl ${rel.bg} flex items-center justify-center mb-3 shadow-inner`}>
                <Activity size={28} className={rel.color} />
             </div>
             <p className="text-[10px] font-black text-slate-400 uppercase tracking-widest">Score d'assiduité</p>
             <p className={`text-3xl font-black ${rel.color} mt-1`}>{100 - (client.noShowRatio || 0)}%</p>
             <p className={`text-[9px] font-bold uppercase mt-2 ${rel.color} opacity-80`}>{rel.label}</p>
             <div className="w-full h-1.5 bg-slate-200/50 rounded-full mt-4 overflow-hidden">
               <div className={`h-full transition-all duration-1000 ${client.noShowRatio && client.noShowRatio > 25 ? 'bg-red-500' : 'bg-emerald-500'}`} style={{ width: `${100 - (client.noShowRatio || 0)}%` }} />
             </div>
             <p className="text-[8px] text-slate-400 font-bold mt-2 uppercase tracking-tighter italic">Calculé sur {stats.validCount} séance(s)</p>
          </div>

          <div className="bg-white rounded-3xl border border-slate-200 shadow-sm p-6 space-y-4">
             <h3 className="text-[10px] font-black text-slate-400 uppercase tracking-widest border-b pb-2 flex justify-between items-center">
               Données Administratives
               <ShieldCheck size={14} className="text-slate-300" />
             </h3>
             <div className="space-y-4">
                <div className="flex items-center gap-3">
                   <div className="p-2 bg-blue-50 text-blue-500 rounded-xl"><Mail size={16}/></div>
                   <div className="min-w-0 flex-1">
                      <p className="text-[9px] font-black text-slate-400 uppercase tracking-tighter">Email</p>
                      <p className="text-[11px] font-bold text-slate-800 truncate">{client.email}</p>
                   </div>
                </div>
                <div className="flex items-center gap-3">
                   <div className="p-2 bg-emerald-50 text-emerald-600 rounded-xl"><Globe size={16}/></div>
                   <div className="min-w-0 flex-1">
                      <p className="text-[9px] font-black text-slate-400 uppercase tracking-tighter">Pays d'Origine</p>
                      <p className="text-[11px] font-bold text-slate-800">{client.originCountry}</p>
                   </div>
                </div>
                <div className="flex items-center gap-3">
                   <div className="p-2 bg-purple-50 text-purple-600 rounded-xl"><Briefcase size={16}/></div>
                   <div className="min-w-0 flex-1">
                      <p className="text-[9px] font-black text-slate-400 uppercase tracking-tighter">Profession</p>
                      <p className="text-[11px] font-bold text-slate-800 truncate">{client.profession}</p>
                   </div>
                </div>
                <div className="flex items-center gap-3">
                   <div className="p-2 bg-amber-50 text-amber-600 rounded-xl"><MapPin size={16}/></div>
                   <div className="min-w-0 flex-1">
                      <p className="text-[9px] font-black text-slate-400 uppercase tracking-tighter">Ville de destination</p>
                      <p className="text-[11px] font-bold text-slate-800">{client.destinationCity}</p>
                   </div>
                </div>
                <div className="flex items-center gap-3">
                   <div className="p-2 bg-slate-100 text-slate-600 rounded-xl"><Calendar size={16}/></div>
                   <div className="min-w-0 flex-1">
                      <p className="text-[9px] font-black text-slate-400 uppercase tracking-tighter">Arrivée prévue</p>
                      <p className="text-[11px] font-bold text-slate-800">{new Date(client.arrivalDate).toLocaleDateString()}</p>
                   </div>
                </div>
             </div>
          </div>

          <div className="bg-white rounded-3xl border border-slate-200 shadow-sm p-6">
            <h3 className="font-bold text-slate-800 mb-4 flex items-center gap-2 text-sm uppercase tracking-tight"><FileText size={18} className="text-blue-500" /> Ajouter une note</h3>
            {client.status !== ReferralStatus.CLOSED && (
              <div className="flex flex-col gap-3">
                <textarea 
                  value={newNote} 
                  onChange={e => setNewNote(e.target.value)} 
                  placeholder="Compte-rendu d'entretien ou observation..." 
                  className="w-full text-xs border border-slate-200 rounded-xl bg-slate-50 p-4 outline-none focus:ring-2 focus:ring-blue-500 transition-all font-bold h-24 resize-none" 
                />
                <button onClick={handleAddNoteInternal} className="w-full py-3 bg-blue-600 text-white rounded-xl font-black uppercase text-[10px] tracking-widest hover:bg-blue-700 shadow-lg shadow-blue-100 transition-all flex items-center justify-center gap-2">
                  <Send size={14} /> Enregistrer la note
                </button>
              </div>
            )}
          </div>
        </div>

        <div className="flex-1">
          <div className="bg-white rounded-3xl border border-slate-200 shadow-sm overflow-hidden min-h-[700px]">
            <div className="flex border-b border-slate-100 bg-slate-50/50 overflow-x-auto">
              {availableTabs.map((tab) => (
                <button 
                  key={tab.id} 
                  onClick={() => setActiveSubTab(tab.id as any)} 
                  className={`flex items-center gap-2 px-8 py-4 text-[10px] font-black uppercase tracking-widest transition-all border-b-2 whitespace-nowrap ${activeSubTab === tab.id ? 'border-blue-600 text-blue-600 bg-white' : 'border-transparent text-slate-400 hover:text-slate-600 hover:bg-slate-100/50'}`}
                >
                  <tab.icon size={14} /> {tab.label}
                </button>
              ))}
            </div>

            <div className="p-8">
              {activeSubTab === 'info' && (
                <div className="space-y-8 animate-in fade-in duration-300">
                  <div className="bg-blue-50/30 border border-blue-100 rounded-3xl p-6 relative overflow-hidden">
                    <Sparkles size={60} className="absolute -right-4 -bottom-4 text-blue-100/30" />
                    <div className="flex justify-between items-center mb-6 relative z-10">
                      <div className="flex items-center gap-3">
                        <div className="w-10 h-10 rounded-2xl bg-blue-600 flex items-center justify-center text-white shadow-lg shadow-blue-100"><Sparkles size={20} /></div>
                        <h4 className="text-sm font-black text-slate-800 uppercase tracking-tight">Analyse Intelligente Gemini</h4>
                      </div>
                      <button onClick={handleRunSynthesis} disabled={synthesisLoading} className="flex items-center gap-2 px-6 py-2.5 bg-white border border-blue-100 text-blue-600 rounded-xl text-[10px] font-black uppercase tracking-widest hover:bg-blue-50 transition-all shadow-sm">
                        {synthesisLoading ? <Loader2 size={14} className="animate-spin" /> : <RefreshCw size={14} />} {synthesis ? 'Réanalyser' : 'Générer Synthèse'}
                      </button>
                    </div>
                    {synthesis ? <div className="bg-white/60 p-6 rounded-2xl border border-white text-sm text-slate-700 leading-relaxed font-medium shadow-inner whitespace-pre-wrap">{synthesis}</div> : <div className="py-12 text-center bg-slate-50/50 rounded-2xl border border-dashed border-slate-200"><p className="text-[10px] text-slate-400 font-bold uppercase tracking-widest italic">Fusion des données pour rapport d'impact...</p></div>}
                  </div>
                </div>
              )}

              {activeSubTab === 'dossier' && (
                <div className="space-y-8 animate-in fade-in duration-300">
                  <div className="flex justify-between items-center">
                    <div>
                      <h3 className="text-lg font-black text-slate-900 tracking-tight">Dossier de Téléversement Massif</h3>
                      <p className="text-xs text-slate-400 font-bold uppercase tracking-widest mt-1">Données complètes importées du fichier de gestion</p>
                    </div>
                    <div className="flex items-center gap-2 px-4 py-2 bg-slate-100 rounded-xl border border-slate-200 text-[10px] font-black uppercase text-slate-500">
                       CODE : {client.clientCode || 'N/A'}
                    </div>
                  </div>

                  <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                    {/* Section Identité */}
                    <div className="bg-white border border-slate-200 rounded-3xl p-6 shadow-sm">
                      <h4 className="text-xs font-black text-slate-900 uppercase tracking-widest mb-6 flex items-center gap-2">
                        <User className="text-blue-500" size={16} /> Identité & Contact
                      </h4>
                      <div className="grid grid-cols-2 gap-6">
                        <DataField label="Prénom" value={client.firstName} />
                        <DataField label="Nom" value={client.lastName} />
                        <DataField label="Genre" value={client.gender} />
                        <DataField label="Date de Naissance" value={client.birthDate} />
                        <DataField label="Email" value={client.email} />
                        <DataField label="Téléphone" value={client.phoneNumber} />
                        <DataField label="Pays de Résidence" value={client.residenceCountry} />
                        <DataField label="Pays de Naissance" value={client.birthCountry} />
                        <DataField label="#IUC ou #CRP" value={client.iucCrpNumber} />
                      </div>
                    </div>

                    {/* Section Famille */}
                    <div className="bg-white border border-slate-200 rounded-3xl p-6 shadow-sm">
                      <h4 className="text-xs font-black text-slate-900 uppercase tracking-widest mb-6 flex items-center gap-2">
                        <HeartHandshake className="text-pink-500" size={16} /> Famille & Entourage
                      </h4>
                      <div className="grid grid-cols-2 gap-6">
                        <DataField label="Type d'Immigration" value={client.immigrationType} />
                        <DataField label="Requérant Principal" value={client.mainApplicant} />
                        <DataField label="Compte Lié" value={client.linkedAccount} />
                        <div className="col-span-2 h-px bg-slate-100 my-2" />
                        <DataField label="Conjoint(e) - Nom" value={client.spouseFullName} />
                        <DataField label="Conjoint(e) - Naissance" value={client.spouseBirthDate} />
                        <DataField label="Conjoint(e) - Email" value={client.spouseEmail} />
                        <DataField label="Conjoint(e) - IUC/CRP" value={client.spouseIucCrpNumber} />
                        <div className="col-span-2 h-px bg-slate-100 my-2" />
                        <DataField label="Nombre d'enfants" value={client.childrenCount?.toString()} />
                        <DataField label="Noms des enfants" value={client.childrenFullNames} />
                        <DataField label="Naissances enfants" value={client.childrenBirthDates} />
                      </div>
                    </div>

                    {/* Section Immigration */}
                    <div className="bg-white border border-slate-200 rounded-3xl p-6 shadow-sm">
                      <h4 className="text-xs font-black text-slate-900 uppercase tracking-widest mb-6 flex items-center gap-2">
                        <MapPin className="text-amber-500" size={16} /> Projet Ontario
                      </h4>
                      <div className="grid grid-cols-2 gap-6">
                        <DataField label="Prog. Immigration" value={client.participatedImmigrationProgram} />
                        <DataField label="Province Choisie" value={client.chosenProvince} />
                        <DataField label="Ville Choisie" value={client.chosenCity} />
                        <DataField label="Changement Destination" value={client.destinationChange} />
                        <DataField label="Arrivée - Approx" value={client.arrivalDateApprox} />
                        <DataField label="Arrivée - Confirmée" value={client.arrivalDateConfirmed} />
                        <div className="col-span-2">
                          <DataField label="Raison du choix de lieu" value={client.establishmentReason} />
                        </div>
                      </div>
                    </div>

                    {/* Section Professionnelle */}
                    <div className="bg-white border border-slate-200 rounded-3xl p-6 shadow-sm">
                      <h4 className="text-xs font-black text-slate-900 uppercase tracking-widest mb-6 flex items-center gap-2">
                        <Briefcase className="text-purple-500" size={16} /> Situation Professionnelle
                      </h4>
                      <div className="grid grid-cols-2 gap-6">
                         <DataField label="Emploi Actuel" value={client.currentJob} />
                         <DataField label="Situation Actuelle" value={client.currentEmploymentStatus} />
                         <DataField label="Groupe NOC" value={client.currentNocGroup} />
                         <DataField label="Profession Actuelle" value={client.currentProfessionGroup} />
                         <div className="col-span-2 h-px bg-slate-100 my-2" />
                         <DataField label="Situation Visée (CA)" value={client.intendedEmploymentStatusCanada} />
                         <DataField label="Profession Visée (CA)" value={client.intendedProfessionGroupCanada} />
                         <div className="col-span-2">
                            <DataField label="Reconnaissance Compétences" value={client.intentionCredentialsRecognition} />
                            <DataField label="Accréditation avant arrivée" value={client.intentionAccreditationBeforeArrival} />
                            <DataField label="EDE Réalisé" value={client.doneEca} />
                         </div>
                      </div>
                    </div>

                    {/* Section Formation & Langues */}
                    <div className="bg-white border border-slate-200 rounded-3xl p-6 shadow-sm col-span-1 md:col-span-2">
                       <h4 className="text-xs font-black text-slate-900 uppercase tracking-widest mb-6 flex items-center gap-2">
                        <Globe className="text-emerald-500" size={16} /> Formation & Langues
                      </h4>
                      <div className="grid grid-cols-1 md:grid-cols-4 gap-8">
                        <div className="space-y-6">
                          <DataField label="Niveau Éducation" value={client.educationLevel} />
                          <DataField label="Spécialisation" value={client.specialization} />
                          <DataField label="Date Fin Formation" value={client.trainingCompletionDate} />
                        </div>
                        <div className="space-y-6">
                          <DataField label="Niveau Anglais" value={client.englishLevel} />
                          <DataField label="Infos Anglais Souhaitées" value={client.wantEnglishInfo} />
                        </div>
                        <div className="space-y-6">
                          <DataField label="Niveau Français" value={client.frenchLevel} />
                          <DataField label="Infos Français Souhaitées" value={client.wantFrenchInfo} />
                        </div>
                        <div className="space-y-6 p-4 bg-slate-50 rounded-2xl border border-slate-100">
                          <DataField label="Source Référencement" value={client.referralSource} />
                          <DataField label="Consentement Marketing" value={client.marketingConsent} />
                          <DataField label="Approuvé" value={client.isApproved} />
                          <DataField label="Profil Complété" value={client.isProfileCompleted} />
                        </div>
                      </div>
                    </div>
                  </div>
                </div>
              )}

              {activeSubTab === 'workflow' && (
                <div className="space-y-8 animate-in fade-in duration-300">
                  <div className="flex justify-between items-center">
                    <div>
                      <h3 className="text-lg font-black text-slate-900 tracking-tight">Suivi du Transfert IRCC</h3>
                      <p className="text-xs text-slate-400 font-bold uppercase tracking-widest mt-1">État d'avancement de la continuité des services</p>
                    </div>
                    {client.referralDate && (
                      <div className="px-4 py-2 bg-purple-50 text-purple-600 rounded-2xl border border-purple-100 text-[10px] font-black uppercase tracking-widest">
                        Référé le {new Date(client.referralDate).toLocaleDateString()}
                      </div>
                    )}
                  </div>

                  <div className="relative pt-4 pb-12">
                    <div className="absolute top-[50px] left-0 w-full h-1 bg-slate-100">
                      <div className="h-full bg-blue-600 transition-all duration-1000 ease-out shadow-[0_0_8px_rgba(37,99,235,0.5)]" style={{ width: `${(currentStepIndex / (workflowSteps.length - 1)) * 100}%` }} />
                    </div>
                    <div className="relative flex justify-between">
                      {workflowSteps.map((step, idx) => (
                        <div key={step.st} className="flex flex-col items-center gap-3">
                          <div className={`w-10 h-10 rounded-full flex items-center justify-center z-10 transition-all duration-500 border-4 ${idx <= currentStepIndex ? 'bg-blue-600 border-blue-100 text-white scale-110 shadow-lg' : 'bg-white border-slate-100 text-slate-300'}`}>
                            {idx < currentStepIndex ? <CheckCircle2 size={18} /> : <span className="text-xs font-black">{idx + 1}</span>}
                          </div>
                          <span className={`text-[10px] font-black uppercase tracking-tight text-center max-w-[80px] ${idx <= currentStepIndex ? 'text-slate-900' : 'text-slate-300'}`}>{step.lab}</span>
                        </div>
                      ))}
                    </div>
                  </div>

                  <div className="bg-slate-50 rounded-[32px] p-8 border border-slate-100">
                    <div className="flex items-center gap-3 mb-6">
                      <div className="p-3 bg-white rounded-2xl text-blue-600 shadow-sm"><Share2 size={20} /></div>
                      <h4 className="font-black text-slate-900 uppercase text-xs tracking-widest">Action requise : Transfert de Dossier</h4>
                    </div>

                    <div className="grid grid-cols-1 md:grid-cols-2 gap-8">
                       <div className="space-y-4">
                         <label className="text-[10px] font-black text-slate-400 uppercase tracking-widest ml-1">Sélectionner l'organisme Principal (Responsable)</label>
                         <div className="relative">
                            <Building2 className="absolute left-4 top-1/2 -translate-y-1/2 text-slate-400" size={18} />
                            <select 
                              value={selectedPartnerId}
                              onChange={(e) => setSelectedPartnerId(e.target.value)}
                              disabled={client.status !== ReferralStatus.PENDING && client.status !== ReferralStatus.REFERRED}
                              className="w-full pl-12 pr-4 py-4 bg-white border border-slate-200 rounded-2xl outline-none font-bold text-slate-700 focus:ring-4 focus:ring-blue-500/10 focus:border-blue-600 transition-all appearance-none"
                            >
                              <option value="">-- Choisir un partenaire principal --</option>
                              {allPartners.map(p => <option key={p.id} value={p.id}>{p.name} ({p.city})</option>)}
                            </select>
                            <ChevronDown className="absolute right-4 top-1/2 -translate-y-1/2 text-slate-400 pointer-events-none" size={18} />
                         </div>
                       </div>
                       
                       <div className="flex items-end">
                         <button 
                           onClick={handleReferralSubmission}
                           disabled={!selectedPartnerId}
                           className="w-full py-4 bg-slate-900 text-white rounded-2xl font-black uppercase text-[11px] tracking-widest shadow-xl hover:bg-slate-800 transition-all disabled:opacity-30 flex items-center justify-center gap-2 group"
                         >
                           {client.status === ReferralStatus.PENDING ? 'Initier le transfert' : 'Mettre à jour les référencements'}
                           <ArrowRight size={16} className="group-hover:translate-x-1 transition-transform" />
                         </button>
                       </div>
                    </div>

                    {/* Section Référencements Secondaires */}
                    <div className="mt-8 pt-8 border-t border-slate-200">
                      <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4 mb-4">
                        <label className="text-[10px] font-black text-slate-400 uppercase tracking-widest block">Référencements Complémentaires (Multi-services)</label>
                        
                        {/* Filtre Ville pour Secondaires */}
                        <div className="flex items-center gap-2 bg-white px-3 py-1.5 rounded-xl border border-slate-200 shadow-sm">
                          <Filter size={12} className="text-slate-400" />
                          <select 
                            value={secondaryCityFilter}
                            onChange={(e) => setSecondaryCityFilter(e.target.value)}
                            className="text-[10px] font-bold text-slate-600 outline-none bg-transparent"
                          >
                            <option value="ALL">Toutes les villes</option>
                            {uniqueCities.map(city => <option key={city} value={city}>{city}</option>)}
                          </select>
                        </div>
                      </div>

                      <div className="bg-white rounded-2xl border border-slate-200 p-4 max-h-60 overflow-y-auto grid grid-cols-1 md:grid-cols-2 gap-3">
                        {allPartners
                          .filter(p => {
                            if (p.id === selectedPartnerId) return false; // Exclure le principal
                            if (secondaryCityFilter !== 'ALL' && p.city !== secondaryCityFilter) return false; // Filtre ville
                            return true;
                          }) 
                          .map(partner => {
                            const isSelected = selectedSecondaryIds.includes(partner.id);
                            return (
                              <div 
                                key={partner.id}
                                onClick={() => toggleSecondaryPartner(partner.id)}
                                className={`flex items-start justify-between p-3 rounded-xl border cursor-pointer transition-all ${isSelected ? 'bg-purple-50 border-purple-200' : 'bg-slate-50 border-slate-100 hover:bg-white hover:border-blue-200'}`}
                              >
                                <div className="flex items-start gap-3">
                                  <div className={`w-8 h-8 rounded-lg flex items-center justify-center text-xs font-bold shrink-0 ${isSelected ? 'bg-purple-600 text-white' : 'bg-white text-slate-400'}`}>
                                    {partner.name.charAt(0)}
                                  </div>
                                  <div className="flex flex-col">
                                    <span className={`text-xs font-bold leading-tight ${isSelected ? 'text-purple-900' : 'text-slate-600'}`}>{partner.name}</span>
                                    <span className="text-[9px] text-slate-400 uppercase font-medium mt-0.5">{partner.city}</span>
                                    {/* Affichage des spécialités */}
                                    {partner.specialties && partner.specialties.length > 0 && (
                                      <div className="flex flex-wrap gap-1 mt-1.5">
                                        {partner.specialties.slice(0, 3).map(s => (
                                          <span key={s} className={`text-[8px] font-black uppercase px-1.5 py-0.5 rounded ${isSelected ? 'bg-purple-100 text-purple-700' : 'bg-slate-200 text-slate-500'}`}>
                                            {s}
                                          </span>
                                        ))}
                                      </div>
                                    )}
                                  </div>
                                </div>
                                {isSelected && <CheckCircle2 size={16} className="text-purple-600 shrink-0 mt-1" />}
                              </div>
                            );
                          })
                        }
                        {allPartners.length <= 1 && (
                          <p className="text-xs text-slate-400 italic p-2">Aucun autre partenaire disponible.</p>
                        )}
                      </div>
                      <div className="flex justify-between items-center mt-3">
                        <p className="text-[9px] text-slate-400 italic">* Accès en lecture seule pour services ponctuels.</p>
                        <button 
                          onClick={handleSecondaryUpdate}
                          className="flex items-center gap-2 px-4 py-2 bg-purple-600 text-white rounded-xl text-[10px] font-black uppercase tracking-widest hover:bg-purple-700 transition-all shadow-lg shadow-purple-100"
                        >
                          <Share2 size={12} /> Confirmer les mandats complémentaires
                        </button>
                      </div>
                    </div>

                    {client.assignedPartnerId && (
                      <div className="mt-8 p-6 bg-white border border-slate-100 rounded-2xl flex items-start gap-4">
                        <div className="p-3 bg-blue-50 text-blue-600 rounded-xl"><Info size={20}/></div>
                        <div>
                          <p className="text-xs font-bold text-slate-900">Le partenaire a été notifié de ce référencement.</p>
                          <p className="text-[10px] text-slate-400 font-medium mt-1 leading-relaxed">Dès que l'organisme accepte le dossier, le statut passera automatiquement à "RECU". Vous conservez un accès en lecture à ce dossier pour la reddition de compte.</p>
                        </div>
                      </div>
                    )}
                  </div>
                </div>
              )}

              {activeSubTab === 'peers' && (
                <div className="space-y-8 animate-in fade-in duration-300">
                  <div className="flex justify-between items-center">
                    <div>
                      <h3 className="text-lg font-black text-slate-900 tracking-tight">Entraide Pairs & Mentorat</h3>
                      <p className="text-xs text-slate-400 font-bold uppercase tracking-widest mt-1">Jumelage intelligent basé sur les profils similaires</p>
                    </div>
                    <button 
                      onClick={handleRunPeerMatching}
                      disabled={peersLoading}
                      className="flex items-center gap-2 px-6 py-2.5 bg-slate-900 text-white rounded-xl text-[10px] font-black uppercase tracking-widest hover:bg-slate-800 transition-all shadow-lg"
                    >
                      {peersLoading ? <Loader2 size={14} className="animate-spin" /> : <Zap size={14} />} Lancer Matching
                    </button>
                  </div>

                  <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                    {peerMatches.length > 0 ? (
                      peerMatches.map(match => {
                        const peer = allClients.find(c => c.id === match.clientId);
                        if (!peer) return null;
                        return (
                          <div key={peer.id} className="bg-white border border-slate-200 rounded-[32px] p-6 shadow-sm hover:border-blue-200 transition-all group relative overflow-hidden">
                            <div className="absolute top-0 right-0 p-6 opacity-5 group-hover:scale-110 transition-transform"><HeartHandshake size={80} /></div>
                            <div className="flex justify-between items-start mb-4 relative z-10">
                              <div className="w-12 h-12 rounded-2xl bg-slate-100 flex items-center justify-center font-black text-slate-400">{peer.firstName[0]}{peer.lastName[0]}</div>
                              <div className="px-3 py-1 bg-blue-50 text-blue-600 rounded-xl text-[10px] font-black border border-blue-100">{match.score}% MATCH</div>
                            </div>
                            <h4 className="font-bold text-slate-900 text-base mb-1">{peer.firstName} {peer.lastName}</h4>
                            <p className="text-[10px] text-slate-400 font-black uppercase mb-4">{peer.profession} • {peer.originCountry}</p>
                            <div className="p-4 bg-slate-50 border border-slate-100 rounded-2xl mb-6">
                              <p className="text-[11px] text-slate-600 font-medium leading-relaxed italic">"{match.reason}"</p>
                            </div>
                            <button className="w-full py-3 border border-slate-200 rounded-xl text-[10px] font-black uppercase tracking-widest text-slate-600 hover:bg-blue-600 hover:text-white hover:border-blue-600 transition-all">Connecter les pairs</button>
                          </div>
                        );
                      })
                    ) : (
                      <div className="col-span-2 py-20 text-center bg-slate-50/50 rounded-[40px] border-2 border-dashed border-slate-200">
                        <Sparkles size={48} className="mx-auto text-slate-200 mb-4" />
                        <p className="text-slate-400 font-bold uppercase text-xs tracking-widest max-w-xs mx-auto">Lancez l'analyse Gemini pour trouver des correspondances dans la base clients.</p>
                      </div>
                    )}
                  </div>
                </div>
              )}

              {activeSubTab === 'sessions' && (
                <div className="space-y-6 animate-in fade-in duration-300">
                  <div className="flex justify-between items-center mb-6">
                    <div>
                      <h3 className="text-lg font-black text-slate-900">Suivi d'assiduité & Séances</h3>
                      <p className="text-xs text-slate-400 font-bold uppercase tracking-widest">Contrôle de la participation réelle aux services</p>
                    </div>
                  </div>

                  {clientSessions.length > 0 ? (
                    <div className="grid grid-cols-1 gap-4">
                      {clientSessions.map(session => {
                        const isAbsent = session.noShowIds.includes(client.id);
                        return (
                          <div key={session.id} className="p-6 bg-slate-50 border border-slate-100 rounded-3xl flex flex-col md:flex-row justify-between items-start md:items-center gap-4 hover:bg-white hover:shadow-md transition-all group">
                            <div className="flex items-center gap-4">
                              <div className={`w-12 h-12 bg-white rounded-2xl border border-slate-100 flex items-center justify-center ${isAbsent ? 'text-red-500' : 'text-emerald-500'} group-hover:bg-slate-900 group-hover:text-white transition-colors shadow-sm`}>
                                {isAbsent ? <UserX size={24} /> : <UserCheck size={24} />}
                              </div>
                              <div>
                                <h4 className="text-sm font-black text-slate-800">{session.title}</h4>
                                <div className="flex flex-wrap gap-2 mt-1">
                                  <span className="text-[9px] font-black text-slate-400 uppercase tracking-widest flex items-center gap-1">
                                    <Clock size={10} /> {new Date(session.date).toLocaleDateString()} @ {session.startTime}
                                  </span>
                                  <span className={`text-[9px] font-black uppercase px-2 py-0.5 rounded border ${isAbsent ? 'bg-red-50 text-red-600 border-red-100' : 'bg-emerald-50 text-emerald-600 border-emerald-100'}`}>
                                    {isAbsent ? 'Marqué Absent' : 'Marqué Présent'}
                                  </span>
                                </div>
                              </div>
                            </div>
                            
                            <div className="flex items-center gap-3 ml-auto md:ml-0">
                               {onUpdateSession && (
                                 <button 
                                  onClick={() => handleToggleAttendance(session)}
                                  disabled={isUpdatingAttendance === session.id}
                                  className={`flex items-center gap-2 px-5 py-2.5 rounded-xl text-[10px] font-black uppercase tracking-widest transition-all ${isAbsent ? 'bg-blue-600 text-white shadow-blue-100' : 'bg-white border border-slate-200 text-red-600 hover:bg-red-50'} disabled:opacity-50`}
                                 >
                                   {isUpdatingAttendance === session.id ? <Loader2 size={12} className="animate-spin" /> : isAbsent ? <CheckCircle2 size={14}/> : <UserX size={14}/>}
                                   {isAbsent ? 'Restaurer Présence' : 'Signaler No-Show'}
                                 </button>
                               )}
                            </div>
                          </div>
                        );
                      })}
                    </div>
                  ) : (
                    <div className="py-20 text-center bg-slate-50/50 rounded-[40px] border-2 border-dashed border-slate-200">
                      <Calendar size={48} className="mx-auto text-slate-200 mb-4" />
                      <p className="text-slate-400 font-bold uppercase text-xs tracking-widest">Aucun historique de présence disponible.</p>
                    </div>
                  )}
                </div>
              )}

              {activeSubTab === 'audit' && (
                <div className="space-y-8 animate-in fade-in duration-300">
                  <div>
                    <h3 className="text-lg font-black text-slate-900 tracking-tight">Journal d'Audit & Historique Complet</h3>
                    <p className="text-xs text-slate-400 font-bold uppercase tracking-widest mt-1">Traçabilité de toutes les interactions et modifications</p>
                  </div>

                  <div className="relative space-y-8 before:absolute before:left-[19px] before:top-0 before:h-full before:w-px before:bg-slate-100">
                    {fullTimeline.map((item, idx) => (
                      <div key={idx} className="relative pl-12">
                        <div className="absolute left-0 top-1 w-10 h-10 rounded-2xl bg-white border border-slate-100 flex items-center justify-center shadow-sm z-10">
                          {timelineIcons[item.type]}
                        </div>
                        <div className="bg-slate-50 border border-slate-100 rounded-2xl p-5 hover:bg-white hover:shadow-md transition-all">
                          <div className="flex justify-between items-start mb-3">
                            <div>
                               <span className={`text-[8px] font-black uppercase px-2 py-0.5 rounded border mb-1.5 inline-block ${item.type === 'NOTE' ? 'bg-blue-50 text-blue-600' : item.type === 'SYSTEM' ? 'bg-red-50 text-red-600' : item.type === 'SESSION' ? 'bg-emerald-50 text-emerald-600' : 'bg-purple-50 text-purple-600'}`}>
                                 {item.title || item.type}
                               </span>
                               <p className="text-[11px] text-slate-700 font-medium leading-relaxed">{item.content}</p>
                            </div>
                            <div className="text-right shrink-0">
                               <p className="text-[10px] font-bold text-slate-900">{new Date(item.timestamp).toLocaleDateString('fr-FR')}</p>
                               <p className="text-[9px] text-slate-400 font-medium">{new Date(item.timestamp).toLocaleTimeString('fr-FR', { hour: '2-digit', minute: '2-digit' })}</p>
                            </div>
                          </div>
                          <div className="flex items-center gap-2 pt-3 border-t border-slate-100">
                            <User size={10} className="text-slate-300" />
                            <span className="text-[9px] font-black text-slate-400 uppercase tracking-widest">Auteur : {item.author}</span>
                          </div>
                        </div>
                      </div>
                    ))}

                    {fullTimeline.length === 0 && (
                      <div className="py-20 text-center">
                        <History size={48} className="mx-auto text-slate-100 mb-4" />
                        <p className="text-slate-400 font-bold uppercase text-xs">Aucun événement enregistré.</p>
                      </div>
                    )}
                  </div>
                </div>
              )}
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};

export default ClientDetails;
