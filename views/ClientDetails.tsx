
import React, { useState, useEffect, useMemo } from 'react';
import { Client, ReferralStatus, Mentor, Partner, Session, UserRole, Note, Profile, UserActivityLog, AttendanceStatus, SessionType, SessionCategory, Contract } from '../types';
import { STATUS_COLORS, MOCK_CLIENTS, MOCK_SESSIONS, SESSION_TYPE_LABELS } from '../constants';
import { getPeerMatches, generateClientSynthesis } from '../services/geminiService';
import ConfirmModal from '../components/ConfirmModal';
import SessionModal from '../components/SessionModal';
import { Edit2, Save, Plane, ArrowLeft, Send, FileText, Info, Zap, CheckCircle2, RefreshCw, Share2, Calendar, History, Clock, Globe, Archive, MessageSquare, HeartHandshake, MapPin, Briefcase, ChevronRight, Sparkles, Loader2, Phone, Mail, Tag, X, UserX, AlertCircle, Building2, User, Fingerprint, FileCheck, ShieldCheck, Database, Cpu, Star, Activity, UserCheck, ChevronDown, ArrowRight, Check, Filter, Target, Users, Trash2, Plus } from 'lucide-react';

interface ClientDetailsProps {
  client: Client;
  activeRole: UserRole;
  currentUserName: string;
  currentUserId: string;
  onBack: () => void;
  onUpdate: (updatedClient: Client) => void;
  onAddNote: (clientId: string, content: string) => Promise<void>;
  onUpdateSession?: (session: Session) => Promise<void>;
  onAddSession: (session: Session) => void;
  allClients?: Client[];
  allMentors?: Mentor[];
  allSessions?: Session[];
  allPartners?: Partner[];
  allContracts?: Contract[];
  allProfiles?: Profile[];
  allLogs?: UserActivityLog[];
  onDeleteClient?: (clientId: string) => void;
}

const ClientDetails: React.FC<ClientDetailsProps> = ({ 
  client, 
  activeRole, 
  currentUserName,
  currentUserId,
  onBack, 
  onUpdate,
  onAddNote,
  onUpdateSession,
  onAddSession,
  allClients = MOCK_CLIENTS, 
  allSessions = MOCK_SESSIONS,
  allPartners = [],
  allContracts = [],
  allProfiles = [],
  allLogs = [],
  onDeleteClient
}) => {
  const DataField = ({ label, value, field, type = "text" }: { label: string, value?: any, field?: keyof Client, type?: string }) => {
    const isRestricted = activeRole === UserRole.ADVISOR && field && !isArrivalField(field);

    if (isEditing && field) {
      return (
        <div className="flex flex-col gap-0.5">
          <label className="text-[11px] font-black text-slate-400 uppercase tracking-tight">{label}</label>
          {type === 'textarea' ? (
            <textarea 
              value={tempClient[field] || ''}
              disabled={isRestricted}
              onChange={(e) => handleEditChange(field, e.target.value)}
              rows={2}
              className={`text-sm font-bold border rounded px-2 py-1 outline-none transition-all resize-none ${
                isRestricted 
                  ? 'bg-slate-50 text-slate-400 border-slate-100 cursor-not-allowed' 
                  : 'bg-white text-slate-800 border-slate-200 focus:border-blue-500 ring-2 ring-transparent focus:ring-blue-50'
              }`}
            />
          ) : (
            <input 
              type={type}
              value={tempClient[field] || ''}
              disabled={isRestricted}
              onChange={(e) => handleEditChange(field, e.target.value)}
              className={`text-sm font-bold border rounded px-2 py-1 h-8 outline-none transition-all ${
                isRestricted 
                  ? 'bg-slate-50 text-slate-400 border-slate-100 cursor-not-allowed' 
                  : 'bg-white text-slate-800 border-slate-200 focus:border-blue-500 ring-2 ring-transparent focus:ring-blue-50'
              }`}
            />
          )}
        </div>
      );
    }

    return (
      <div className="flex flex-col gap-0.5 group relative">
        <div className="flex items-center gap-2">
          <p className="text-[11px] font-black text-slate-400 uppercase tracking-tight">{label}</p>
          {field && !isRestricted && (
            <button 
              onClick={() => setIsEditing(true)}
              className="opacity-0 group-hover:opacity-100 p-1 -m-1 text-slate-300 hover:text-blue-600 transition-all"
              title="Modifier"
            >
              <Edit2 size={10} />
            </button>
          )}
        </div>
        <p className="text-sm font-bold text-slate-800 break-words leading-tight">{value || '---'}</p>
      </div>
    );
  };

  const [peerMatches, setPeerMatches] = useState<{ clientId: string; score: number; reason: string }[]>([]);
  const [synthesis, setSynthesis] = useState<string | null>(null);
  const [peersLoading, setPeersLoading] = useState(false);
  const [synthesisLoading, setSynthesisLoading] = useState(false);
  const [activeSubTab, setActiveSubTab] = useState<'info' | 'dossier' | 'workflow' | 'peers' | 'sessions' | 'audit'>('dossier');
  const [newNote, setNewNote] = useState('');
  
  const [selectedPartnerId, setSelectedPartnerId] = useState(client.assignedPartnerId || '');
  const [selectedSecondaryIds, setSelectedSecondaryIds] = useState<string[]>(client.secondaryPartnerIds || []);
  const [secondaryCityFilter, setSecondaryCityFilter] = useState<string>('ALL');
  
  const [showCloseConfirm, setShowCloseConfirm] = useState(false);
  const [showDeleteConfirm, setShowDeleteConfirm] = useState(false);
  const [isUpdatingAttendance, setIsUpdatingAttendance] = useState<string | null>(null);
  const [expandedSessionId, setExpandedSessionId] = useState<string | null>(null);
  const [isEditing, setIsEditing] = useState(false);
  const [showSessionModal, setShowSessionModal] = useState(false);
  const [tempClient, setTempClient] = useState<Client>({ ...client });

  const isArrivalField = (field: keyof Client) => {
    return [
      'arrivalDate', 
      'destinationCity', 
      'chosenCity', 
      'arrivalDateApprox', 
      'arrivalDateConfirmed',
      'destinationChange'
    ].includes(field as string);
  };

  const handleEditChange = (field: keyof Client, value: any) => {
    // Basic number conversion for fields that expect it
    let finalValue = value;
    if (field === 'childrenCount' && value !== '') {
      finalValue = parseInt(value, 10);
    }
    setTempClient(prev => ({ ...prev, [field]: finalValue }));
  };


  // Historique unifié (Timeline)
  const fullTimeline = useMemo(() => {
    const items: { id: string; type: 'NOTE' | 'SYSTEM' | 'SESSION' | 'REFERRAL'; title?: string; content: string; author: string; timestamp: string }[] = [];
    
    // Notes
    (client.notes || []).forEach(note => {
      items.push({ id: note.id, type: 'NOTE', content: note.content, author: note.authorName || 'Anonyme', timestamp: note.timestamp });
    });

    // Logs système (Modifications profil)
    (allLogs || []).forEach(log => {
      // Robust check: matches by ID in metadata OR matches by name in generic message
      const isClientLog = log.entityType === 'CLIENT';
      if (!isClientLog) return;

      let matches = false;
      try {
        // Handle both string and object formats for details
        const detailsObj = typeof log.details === 'string' && log.details.startsWith('{') 
          ? JSON.parse(log.details) 
          : (typeof log.details === 'object' ? log.details : null);

        if (detailsObj) {
          // Check entity_id (snake) or entityId (camel) or inside changes
          matches = (detailsObj.entity_id === client.id) || 
                    (detailsObj.entityId === client.id) || 
                    (detailsObj.changes?.id?.to === client.id) ||
                    (detailsObj.message?.includes(`${client.firstName} ${client.lastName}`));
        } else {
          // Legacy string match
          const detailStr = String(log.details || '');
          matches = detailStr.includes(client.id) || 
                    detailStr.includes(`${client.firstName} ${client.lastName}`);
        }
      } catch (e) {
        matches = String(log.details || '').includes(client.id);
      }

      if (matches) {
        items.push({ 
          id: log.id, 
          type: 'SYSTEM', 
          title: log.actionType, 
          content: log.details, 
          author: log.userName || 'Système', 
          timestamp: log.timestamp 
        });
      }
    });

    // Séances
    const clientSessions = (allSessions || []).filter(s => s.participantIds?.includes(client.id));
    clientSessions.forEach(s => {
      const isAbsent = s.noShowIds?.includes(client.id);
      items.push({ 
        id: s.id, 
        type: 'SESSION', 
        title: `SÉANCE : ${s.title}`, 
        content: `${isAbsent ? 'Absent' : 'Présent'} - ${s.type}${s.notes ? ` : ${s.notes}` : ''}`, 
        author: s.facilitatorName || 'Inconnu', 
        timestamp: `${s.date}T${s.startTime || '00:00'}:00` 
      });
    });

    // Référencements
    if (client.referralDate) {
      // Robust advisor lookup
      const advisorId = client.referredById || (client as any).referred_by_id;
      const advisor = allProfiles.find(p => p.id === advisorId);
      const advisorName = advisor ? `${advisor.firstName} ${advisor.lastName}` : 'Conseiller CFGT';
      
      items.push({ 
        id: 'ref-1', 
        type: 'REFERRAL', 
        title: 'TRANSFERT VERS PARTENAIRE', 
        content: `Dossier transféré vers ${(allPartners || []).find(p => p.id === client.assignedPartnerId)?.name || 'organisme partenaire'}`, 
        author: advisorName, 
        timestamp: client.referralDate 
      });
    }

    return items.sort((a, b) => new Date(b.timestamp).getTime() - new Date(a.timestamp).getTime());
  }, [client.notes, allLogs, client.firstName, client.lastName, client.id, allSessions, client.referralDate, allPartners, client.assignedPartnerId, client.referredById, allProfiles]);

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
    return Array.from(new Set((allPartners || []).map(p => p.city))).sort();
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
      const clientSessions = (allSessions || []).filter(s => s.participantIds?.includes(client.id));
      const result = await generateClientSynthesis(client, clientSessions);
      setSynthesis(result || "Impossible de générer la synthèse.");
    } catch (err) {
      console.error(err);
    } finally {
      setSynthesisLoading(false);
    }
  };

  const renderLogDetails = (details: string) => {
    if (!details) return <p className="text-slate-400 italic">Aucun détail disponible</p>;
    
    try {
      if (details.startsWith('{')) {
        const parsed = JSON.parse(details);
        const { message, changes } = parsed;
        
        if (changes && typeof changes === 'object') {
          const entries = Object.entries(changes).filter(([k]) => k !== 'id');
          
          if (entries.length > 0) {
            return (
              <div className="space-y-4">
                <p className="text-[11px] font-semibold text-slate-600 leading-relaxed">
                  {message || "Modifications apportées :"}
                </p>
                
                <div className="overflow-hidden rounded-xl border border-slate-100 bg-white shadow-sm">
                  <table className="min-w-full divide-y divide-slate-100 text-[10px]">
                    <thead className="bg-slate-50">
                      <tr>
                        <th className="px-3 py-1.5 text-left font-black text-slate-400 uppercase tracking-widest">Champ</th>
                        <th className="px-3 py-1.5 text-left font-black text-slate-400 uppercase tracking-widest">Avant</th>
                        <th className="px-3 py-1.5 text-left font-black text-slate-400 uppercase tracking-widest">Après</th>
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-slate-100">
                      {entries.map(([key, value]: [string, any]) => {
                        const from = value && typeof value === 'object' && 'from' in value ? value.from : null;
                        const to = value && typeof value === 'object' && 'to' in value ? value.to : value;
                        
                        return (
                          <tr key={key} className="hover:bg-slate-50 transition-colors">
                            <td className="px-3 py-1.5 font-bold text-slate-500 bg-slate-50/30">{key}</td>
                            <td className="px-3 py-1.5 text-red-400 line-through opacity-70 truncate max-w-[120px]">
                              {from === null || from === undefined ? '—' : String(from)}
                            </td>
                            <td className="px-3 py-1.5 text-emerald-600 font-bold truncate max-w-[120px]">
                              {to === null || to === undefined ? '—' : String(to)}
                            </td>
                          </tr>
                        );
                      })}
                    </tbody>
                  </table>
                </div>
              </div>
            );
          }
        }
        return <p className="text-[11px] font-semibold text-slate-700">{message || details}</p>;
      }
    } catch (e) {
      // Fallback
    }
    
    return <p className="text-[11px] text-slate-700 font-medium leading-relaxed">{details}</p>;
  };

  const handleRunPeerMatching = async () => {
    setPeersLoading(true);
    try {
      const results = await getPeerMatches(client, allClients || []);
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
    
    const isCurrentlyNoShow = session.noShowIds?.includes(client.id);
    let newNoShowIds = [...(session.noShowIds || [])];
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
      referralDate: new Date().toISOString().split('T')[0],
      referredById: currentUserId 
    });
  };

  const handleCancelReferral = () => {
    onUpdate({
      ...client,
      status: ReferralStatus.PENDING,
      assignedPartnerId: undefined,
      secondaryPartnerIds: [],
      referralDate: undefined,
      referredById: undefined
    });
  };

  const handleSecondaryUpdate = () => {
    onUpdate({
      ...client,
      secondaryPartnerIds: selectedSecondaryIds,
      referredById: currentUserId // Record who updated the distribution
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
    onUpdate({ ...client, status: ReferralStatus.CLOSED, closedAt: new Date().toISOString().split('T')[0] });
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
    return (allSessions || []).filter(s => s.participantIds?.includes(client.id))
      .sort((a, b) => {
        const timeA = a.date ? new Date(a.date).getTime() : 0;
        const timeB = b.date ? new Date(b.date).getTime() : 0;
        return timeB - timeA;
      });
  }, [allSessions, client.id]);

  const stats = useMemo(() => {
    const todayStr = new Date().toISOString().split('T')[0];
    const pastSessions = clientSessions.filter(s => s.date <= todayStr);
    
    if (pastSessions.length === 0) return { rate: 100, total: 0 };
    
    let attendedCount = 0;
    let relevantTotalCount = 0;

    pastSessions.forEach(s => {
      if (s.category === SessionCategory.INDIVIDUAL) {
        if (s.individualStatus === AttendanceStatus.CANCELLED || s.individualStatus === AttendanceStatus.DECALEE) {
          return;
        }
        relevantTotalCount++;
        const isPresent = s.individualStatus === AttendanceStatus.PRESENT
          || (s.individualStatus == null && !s.noShowIds?.includes(client.id));
        if (isPresent) attendedCount++;
      } else {
        relevantTotalCount++;
        if (!s.noShowIds?.includes(client.id)) {
          attendedCount++;
        }
      }
    });

    if (relevantTotalCount === 0) return { rate: 100, total: 0 };
    
    const rate = Math.round((attendedCount / relevantTotalCount) * 100);
    return { rate, total: relevantTotalCount };
  }, [clientSessions, client.id]);

  const getReliabilityUI = (rate: number) => {
    if (rate >= 90) return { color: 'text-emerald-500', bg: 'bg-emerald-50', label: 'Excellente assiduité' };
    if (rate >= 75) return { color: 'text-amber-500', bg: 'bg-amber-50', label: 'Assiduité correcte' };
    return { color: 'text-red-500', bg: 'bg-red-50', label: 'Défaut d\'assiduité' };
  };

  const rel = getReliabilityUI(stats.rate);

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

          <div className="flex items-center gap-2">
            {!isEditing ? (
              <>
                {activeRole === UserRole.ADMIN && onDeleteClient && (
                  <button 
                    onClick={() => setShowDeleteConfirm(true)}
                    className="p-2 text-red-400 hover:text-red-500 hover:bg-red-50 rounded-lg transition-all"
                    title="Supprimer le client"
                  >
                    <Trash2 size={18} />
                  </button>
                )}
              </>
            ) : (
              <>
                <button 
                  onClick={() => {
                    setIsEditing(false);
                    setTempClient({ ...client });
                  }}
                  className="px-3 py-1.5 text-slate-500 font-black uppercase text-[10px] tracking-widest hover:text-slate-700 transition-all"
                >
                  Annuler
                </button>
                <button 
                  onClick={() => {
                    onUpdate(tempClient);
                    setIsEditing(false);
                  }}
                  className="flex items-center gap-2 px-4 py-1.5 bg-blue-600 text-white rounded-lg font-black uppercase text-[10px] tracking-widest hover:bg-blue-700 transition-all shadow-lg shadow-blue-100"
                >
                  <Save size={12} /> Enregistrer
                </button>
              </>
            )}
          </div>

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

      <ConfirmModal 
        isOpen={showDeleteConfirm}
        title="Supprimer définitivement le client"
        message="ATTENTION: Cette action est irréversible. Toutes les données, l'historique de présence et les notes associées à ce client seront définitivement supprimés. Voulez-vous continuer ?"
        confirmLabel="Oui, supprimer définitivement"
        cancelLabel="Annuler"
        isDestructive={true}
        onConfirm={() => {
          if (onDeleteClient) {
            onDeleteClient(client.id);
            onBack();
          }
        }}
        onCancel={() => setShowDeleteConfirm(false)}
      />

      <div className="flex flex-col gap-6">
        {/* Grille Supérieure en 3 colonnes */}
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-6 items-stretch">
          
          {/* Colonne 1 : Identité & Assiduité Fusionnées */}
          <div className="bg-white rounded-3xl border border-slate-200 shadow-sm p-6 relative overflow-hidden flex flex-col justify-between">
            <div className={`absolute top-0 left-0 w-full h-1.5 ${client.status === ReferralStatus.CLOSED ? 'bg-slate-400' : 'bg-blue-600'}`} />
            
            <div className="flex items-center gap-4 mb-4">
              <div className="w-16 h-16 rounded-2xl bg-slate-50 border-2 border-slate-100 flex items-center justify-center text-slate-600 text-xl font-black shadow-sm flex-shrink-0">
                {client.firstName[0]}{client.lastName[0]}
              </div>
              <div className="min-w-0">
                <h2 className="text-xl font-bold text-slate-900 tracking-tight truncate">{client.firstName} {client.lastName}</h2>
                {client.status === ReferralStatus.PENDING ? (
                  <div
                    className="mt-1 inline-flex items-center gap-1.5 px-2.5 py-0.5 rounded-full text-[9px] font-bold tracking-tight uppercase border whitespace-nowrap"
                    style={{ backgroundColor: '#f1f5f9', color: '#475569', borderColor: '#cbd5e1' }}
                  >
                    <Clock size={8} className="shrink-0" />
                    En attente
                  </div>
                ) : (
                  <div className={`mt-1 inline-flex items-center px-2.5 py-0.5 rounded-full text-[9px] font-bold tracking-tight uppercase border whitespace-nowrap ${STATUS_COLORS[client.status]}`}>
                    {client.status.replace(/_/g, ' ')}
                  </div>
                )}
              </div>
            </div>

            {/* Date d'arrivée & Compte à rebours */}
            <div className="mb-6 flex items-center gap-3 p-3 bg-slate-50/80 rounded-2xl border border-slate-100/50 group relative">
              <div className="w-8 h-8 rounded-xl bg-white flex items-center justify-center text-blue-600 shadow-sm border border-slate-100">
                <Plane size={14} />
              </div>
              <div className="flex-1">
                <div className="flex items-center gap-2 mb-1">
                  <p className="text-[9px] font-black text-slate-400 uppercase tracking-widest leading-none">Date d'arrivée prévue</p>
                  {!isEditing && (
                    <button 
                      onClick={() => setIsEditing(true)}
                      className="opacity-0 group-hover:opacity-100 p-1 -m-1 text-slate-300 hover:text-blue-600 transition-all"
                      title="Modifier"
                    >
                      <Edit2 size={10} />
                    </button>
                  )}
                </div>
                <div className="flex items-center gap-2">
                  {isEditing ? (
                    <input 
                      type="date"
                      value={tempClient.arrivalDateConfirmed || tempClient.arrivalDate || ''}
                      onChange={(e) => handleEditChange('arrivalDateConfirmed', e.target.value)}
                      className="text-sm font-bold bg-white text-slate-800 border border-slate-200 rounded px-2 py-0.5 outline-none focus:border-blue-500 ring-2 ring-transparent focus:ring-blue-50 h-7"
                    />
                  ) : (
                    <p className="text-sm font-black text-slate-700">
                      {tempClient.arrivalDateConfirmed || tempClient.arrivalDate || tempClient.arrivalDateApprox || 'Non renseignée'}
                    </p>
                  )}
                  {(() => {
                    const dateStr = tempClient.arrivalDateConfirmed || tempClient.arrivalDate;
                    if (!dateStr) return null;
                    // Utilisation de midi pour éviter le décalage de fuseau horaire lors du calcul relatif
                    const arrival = new Date(dateStr + 'T12:00:00');
                    if (isNaN(arrival.getTime())) return null;
                    
                    const today = new Date();
                    today.setHours(0, 0, 0, 0);
                    const diffTime = arrival.getTime() - today.getTime();
                    const diffDays = Math.ceil(diffTime / (1000 * 60 * 60 * 24));
                    
                    if (diffDays <= 0) return (
                      <span className="px-1.5 py-0.5 rounded-lg bg-emerald-100 text-emerald-700 text-[9px] font-black uppercase tracking-tighter border border-emerald-200 shadow-sm">
                        Déjà arrivé
                      </span>
                    );
                    
                    const label = diffDays < 30 ? `Dans ${diffDays} j.` : `Dans ${Math.floor(diffDays/30)} mois`;
                    return (
                      <span className="px-1.5 py-0.5 rounded-lg bg-blue-100 text-blue-700 text-[9px] font-black uppercase tracking-tighter border border-blue-200 shadow-sm">
                        {label}
                      </span>
                    );
                  })()}
                </div>
              </div>
            </div>

            <div className={`p-4 rounded-2xl border ${stats.total > 0 ? rel.bg : 'bg-slate-50'} ${stats.total > 0 ? 'border-current/10' : 'border-slate-200'} flex items-center justify-between shadow-sm`}>
              <div className="flex items-center gap-3">
                <div className={`w-10 h-10 rounded-xl ${stats.total > 0 ? rel.bg : 'bg-white'} flex items-center justify-center shadow-inner ${stats.total === 0 ? 'border border-slate-100' : ''}`}>
                  <Activity size={20} className={stats.total > 0 ? rel.color : 'text-slate-300'} />
                </div>
                <div>
                  <p className="text-[9px] font-black text-slate-400 uppercase tracking-widest">Assiduité</p>
                  <p className={`text-[9px] font-bold uppercase ${stats.total > 0 ? rel.color : 'text-slate-400'} opacity-80`}>
                    {stats.total > 0 ? rel.label : 'En attente de service'}
                  </p>
                  {stats.total > 0 && (
                    <p className="text-[8px] text-slate-400 font-bold mt-0.5 italic">
                      Sur {stats.total} séance{stats.total > 1 ? 's' : ''}
                    </p>
                  )}
                </div>
              </div>
              {stats.total > 0 ? (
                <div className={`px-4 py-2 rounded-xl border-2 font-black text-lg ${rel.color} ${rel.bg} border-current/20`}>
                  {(stats.rate || 0)}%
                </div>
              ) : (
                <div className="text-[9px] font-black text-slate-400 uppercase bg-white px-3 py-2 rounded-xl border border-slate-100 italic">
                  Aucune séance effectuée
                </div>
              )}
            </div>
            <div className="mt-4 pt-4 border-t border-slate-50 flex justify-center">
              <button 
                onClick={() => setShowSessionModal(true)}
                className="slds-button slds-button-brand !px-8 !py-1.5 flex items-center gap-2 !text-[10px] !rounded-full shadow-md hover:shadow-lg transition-all"
              >
                <Plus size={12} /> Nouvelle Séance
              </button>
            </div>
          </div>

          {/* Colonne 2 : Données Administratives */}
          <div className="bg-white rounded-3xl border border-slate-200 shadow-sm p-6 flex flex-col">
             <h3 className="text-[10px] font-black text-slate-400 uppercase tracking-widest border-b pb-2 mb-4 flex justify-between items-center">
               Données Administratives
               <ShieldCheck size={14} className="text-slate-300" />
             </h3>
             <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-1 gap-2 overflow-y-auto max-h-[300px] pr-2 custom-scrollbar">
                <div className="flex items-center gap-3 p-1.5 hover:bg-slate-50 rounded-xl transition-colors">
                   <div className="p-2 bg-blue-50 text-blue-500 rounded-lg"><Mail size={14}/></div>
                   <div className="min-w-0 flex-1">
                      <DataField label="Email" value={client.email} field="email" type="email" />
                   </div>
                </div>
                <div className="flex items-center gap-3 p-2 hover:bg-slate-50 rounded-xl transition-colors">
                   <div className="p-2 bg-emerald-50 text-emerald-600 rounded-lg"><Globe size={14}/></div>
                   <div className="min-w-0 flex-1">
                      <DataField label="Pays d'Origine" value={client.originCountry} field="originCountry" />
                   </div>
                </div>
                <div className="flex items-center gap-3 p-2 hover:bg-slate-50 rounded-xl transition-colors">
                   <div className="p-2 bg-purple-50 text-purple-600 rounded-lg"><Briefcase size={14}/></div>
                   <div className="min-w-0 flex-1">
                      <DataField label="Profession" value={client.profession} field="profession" />
                   </div>
                </div>
                <div className="flex items-center gap-3 p-2 hover:bg-slate-50 rounded-xl transition-colors">
                   <div className="p-2 bg-amber-50 text-amber-600 rounded-lg"><MapPin size={14}/></div>
                   <div className="min-w-0 flex-1">
                      <DataField label="Ville" value={client.destinationCity} field="destinationCity" />
                   </div>
                </div>
             </div>
          </div>

          {/* Colonne 3 : Ajout de Note */}
          <div className="bg-white rounded-3xl border border-slate-200 shadow-sm p-6 flex flex-col">
            <h3 className="font-bold text-slate-800 mb-4 flex items-center gap-2 text-[10px] uppercase tracking-widest text-slate-400 border-b pb-2">
              <FileText size={14} className="text-blue-500" /> Saisie Rapide Note
            </h3>
            {client.status !== ReferralStatus.CLOSED ? (
              <div className="flex flex-col gap-3 flex-1">
                <textarea 
                  value={newNote} 
                  onChange={e => setNewNote(e.target.value)} 
                  placeholder="Observation ou compte-rendu..." 
                  className="w-full text-xs border border-slate-200 rounded-xl bg-slate-50 p-3 outline-none focus:ring-2 focus:ring-blue-500 transition-all font-bold flex-1 resize-none" 
                />
                <button onClick={handleAddNoteInternal} className="w-full py-2.5 bg-blue-600 text-white rounded-xl font-black uppercase text-[9px] tracking-widest hover:bg-blue-700 shadow-lg shadow-blue-100 transition-all flex items-center justify-center gap-2">
                  <Send size={12} /> Enregistrer
                </button>
              </div>
            ) : (
              <div className="flex-1 flex items-center justify-center bg-slate-50 rounded-2xl border border-dashed border-slate-200">
                <p className="text-[9px] text-slate-400 font-bold uppercase tracking-widest">Dossier clôturé</p>
              </div>
            )}
          </div>
        </div>

        {/* Zone Inférieure : Onglets Pleine Largeur */}
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
                       #IUC ou #CRP : {client.iucCrpNumber || 'Non renseigné'}
                    </div>
                  </div>

                  <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                    {/* Section Chronologie */}
                    <div className="bg-slate-50/50 border border-slate-200 rounded-3xl p-5 shadow-sm col-span-1 md:col-span-2">
                      <h4 className="text-[10px] font-black text-slate-400 uppercase tracking-widest mb-4 flex items-center gap-2">
                        <Clock className="text-blue-500" size={14} /> Chronologie du Dossier
                      </h4>
                      <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
                        <DataField label="Inscription CF" value={client.registrationDate} field="registrationDate" type="date" />
                        <DataField label="Réf. vers Arrivio" value={client.inboundReferralDate} field="inboundReferralDate" type="date" />
                        <DataField label="Transfert Partenaire" value={client.referralDate} field="referralDate" type="date" />
                        <DataField label="Source" value={client.referralSource} field="referralSource" />
                      </div>
                    </div>
                    {/* Section Identité */}
                    <div className="bg-white border border-slate-200 rounded-3xl p-5 shadow-sm">
                      <h4 className="text-xs font-black text-slate-900 uppercase tracking-widest mb-4 flex items-center gap-2">
                        <User className="text-blue-500" size={16} /> Identité & Contact
                      </h4>
                      <div className="grid grid-cols-2 gap-x-4 gap-y-3">
                        <DataField label="Prénom" value={client.firstName} field="firstName" />
                        <DataField label="Nom" value={client.lastName} field="lastName" />
                        <DataField label="Genre" value={client.gender} field="gender" />
                        <DataField label="Date de Naissance" value={client.birthDate} field="birthDate" type="date" />
                        <DataField label="Email" value={client.email} field="email" type="email" />
                        <DataField label="Téléphone" value={client.phoneNumber} field="phoneNumber" type="tel" />
                        <DataField label="Pays de Résidence" value={client.residenceCountry} field="residenceCountry" />
                        <DataField label="#IUC ou #CRP" value={client.iucCrpNumber} field="iucCrpNumber" />
                      </div>
                    </div>

                    {/* Section Famille */}
                    <div className="bg-white border border-slate-200 rounded-3xl p-5 shadow-sm">
                      <h4 className="text-xs font-black text-slate-900 uppercase tracking-widest mb-4 flex items-center gap-2">
                        <HeartHandshake className="text-pink-500" size={16} /> Famille & Entourage
                      </h4>
                      <div className="grid grid-cols-2 gap-x-4 gap-y-3">
                        <DataField label="Type d'Immigration" value={client.immigrationType} field="immigrationType" />
                        <DataField label="Requérant Principal" value={client.mainApplicant} field="mainApplicant" />
                        <div className="col-span-2 h-px bg-slate-100 my-2" />
                        <DataField label="Conjoint(e) - Nom" value={client.spouseFullName} field="spouseFullName" />
                        <DataField label="Conjoint(e) - Email" value={client.spouseEmail} field="spouseEmail" type="email" />
                        <div className="col-span-2 h-px bg-slate-100 my-2" />
                        <DataField label="Nombre d'enfants" value={client.childrenCount?.toString()} field="childrenCount" type="number" />
                      </div>
                    </div>

                    {/* Section Immigration */}
                    <div className="bg-white border border-slate-200 rounded-3xl p-5 shadow-sm">
                      <h4 className="text-xs font-black text-slate-900 uppercase tracking-widest mb-4 flex items-center gap-2">
                        <MapPin className="text-amber-500" size={16} /> Projet Ontario
                      </h4>
                      <div className="grid grid-cols-2 gap-x-4 gap-y-3">
                        <DataField label="Prog. Immigration" value={client.participatedImmigrationProgram} field="participatedImmigrationProgram" />
                        <DataField label="Province Choisie" value={client.chosenProvince} field="chosenProvince" />
                        <DataField label="Ville Choisie" value={client.chosenCity} field="chosenCity" />
                        <DataField label="Changement Destination" value={client.destinationChange} field="destinationChange" />
                        <DataField label="Arrivée - Approx" value={client.arrivalDateApprox} field="arrivalDateApprox" type="date" />
                        <DataField label="Arrivée - Confirmée" value={client.arrivalDateConfirmed} field="arrivalDateConfirmed" type="date" />
                        <div className="col-span-2">
                          <DataField label="Raison du choix de lieu" value={client.establishmentReason} field="establishmentReason" type="textarea" />
                        </div>
                      </div>
                    </div>

                    {/* Section Professionnelle */}
                    <div className="bg-white border border-slate-200 rounded-3xl p-5 shadow-sm">
                      <h4 className="text-xs font-black text-slate-900 uppercase tracking-widest mb-4 flex items-center gap-2">
                        <Briefcase className="text-purple-500" size={16} /> Situation Professionnelle
                      </h4>
                      <div className="grid grid-cols-2 gap-x-4 gap-y-3">
                         <DataField label="Emploi Actuel" value={client.currentJob} field="currentJob" />
                         <DataField label="Situation Actuelle" value={client.currentEmploymentStatus} field="currentEmploymentStatus" />
                         <DataField label="Groupe NOC" value={client.currentNocGroup} field="currentNocGroup" />
                         <DataField label="Profession Actuelle" value={client.currentProfessionGroup} field="currentProfessionGroup" />
                         <div className="col-span-2 h-px bg-slate-100 my-2" />
                         <DataField label="Situation Visée (CA)" value={client.intendedEmploymentStatusCanada} field="intendedEmploymentStatusCanada" />
                         <DataField label="Profession Visée (CA)" value={client.intendedProfessionGroupCanada} field="intendedProfessionGroupCanada" />
                         <div className="col-span-2">
                            <DataField label="Reconnaissance Compétences" value={client.intentionCredentialsRecognition} field="intentionCredentialsRecognition" type="textarea" />
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
                          <DataField label="Niveau Éducation" value={client.educationLevel} field="educationLevel" />
                          <DataField label="Spécialisation" value={client.specialization} field="specialization" />
                        </div>
                        <div className="space-y-6">
                          <DataField label="Niveau Anglais" value={client.englishLevel} field="englishLevel" />
                          <DataField label="Infos Anglais Souhaitées" value={client.wantEnglishInfo} field="wantEnglishInfo" />
                        </div>
                        <div className="space-y-6">
                          <DataField label="Niveau Français" value={client.frenchLevel} field="frenchLevel" />
                          <DataField label="Infos Français Souhaitées" value={client.wantFrenchInfo} field="wantFrenchInfo" />
                        </div>
                        <div className="space-y-6 p-4 bg-slate-50 rounded-2xl border border-slate-100">
                          <DataField label="Source Référencement" value={client.referralSource} field="referralSource" />
                          <DataField label="Consentement Marketing" value={client.marketingConsent} field="marketingConsent" />
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
                      <div className="flex flex-col items-end gap-1">
                        <div className="px-4 py-2 bg-purple-50 text-purple-600 rounded-2xl border border-purple-100 text-[10px] font-black uppercase tracking-widest">
                          Référé le {new Date(client.referralDate).toLocaleDateString()}
                        </div>
                        {(() => {
                          const advisorId = client.referredById || (client as any).referred_by_id;
                          if (!advisorId) return null;
                          const advisor = allProfiles.find(p => p.id === advisorId);
                          if (!advisor) return null;
                          return (
                            <span className="text-[10px] font-bold text-slate-400 uppercase tracking-tight">
                              Par : {advisor.firstName} {advisor.lastName}
                            </span>
                          );
                        })()}
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
                       
                        <div className="flex items-end gap-3">
                          <button 
                            onClick={handleReferralSubmission}
                            disabled={!selectedPartnerId}
                            className="flex-1 py-4 bg-slate-900 text-white rounded-2xl font-black uppercase text-[11px] tracking-widest shadow-xl hover:bg-slate-800 transition-all disabled:opacity-30 flex items-center justify-center gap-2 group"
                          >
                            {client.status === ReferralStatus.PENDING ? 'Initier le transfert' : 'Mettre à jour les référencements'}
                            <ArrowRight size={16} className="group-hover:translate-x-1 transition-transform" />
                          </button>

                          {(activeRole === UserRole.ADMIN || (activeRole === UserRole.ADVISOR && client.referredById === currentUserId)) && client.status !== ReferralStatus.PENDING && client.status !== ReferralStatus.CLOSED && (
                            <button 
                              onClick={handleCancelReferral}
                              className="px-6 py-4 bg-white border border-red-200 text-red-600 rounded-2xl font-black uppercase text-[11px] tracking-widest shadow-sm hover:bg-red-50 transition-all flex items-center justify-center gap-2"
                              title="Annuler le transfert et remettre en attente"
                            >
                              <X size={16} /> Annuler
                            </button>
                          )}
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
                          <Share2 size={12} /> Confirmer {client.referredById ? `par ${allProfiles.find(p => p.id === client.referredById)?.firstName || ''}` : 'le mandat'}
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
                        const getStatusUI = () => {
                          if (session.category === SessionCategory.INDIVIDUAL) {
                            switch(session.individualStatus) {
                              case AttendanceStatus.PRESENT: return { label: 'Présent', colorStyle: 'bg-emerald-50 text-emerald-600 border-emerald-100', icon: <UserCheck size={24} />, iconColor: 'text-emerald-500' };
                              case AttendanceStatus.ABSENT: return { label: 'Absent', colorStyle: 'bg-red-50 text-red-600 border-red-100', icon: <UserX size={24} />, iconColor: 'text-red-500' };
                              case AttendanceStatus.CANCELLED: return { label: 'Annulé', colorStyle: 'bg-slate-50 text-slate-400 border-slate-100', icon: <UserCheck size={24} />, iconColor: 'text-slate-400' };
                              case AttendanceStatus.DECALEE: return { label: 'Décalé', colorStyle: 'bg-amber-50 text-amber-600 border-amber-100', icon: <UserCheck size={24} />, iconColor: 'text-amber-600' };
                              default: {
                                // Fallback: individualStatus is null, use noShowIds
                                const isNoShow = session.noShowIds?.includes(client.id);
                                return isNoShow
                                  ? { label: 'Absent', colorStyle: 'bg-red-50 text-red-600 border-red-100', icon: <UserX size={24} />, iconColor: 'text-red-500' }
                                  : { label: 'Présent', colorStyle: 'bg-emerald-50 text-emerald-600 border-emerald-100', icon: <UserCheck size={24} />, iconColor: 'text-emerald-500' };
                              }
                            }
                          }
                          const isNoShow = session.noShowIds?.includes(client.id);
                          return isNoShow 
                            ? { label: 'Absent', colorStyle: 'bg-red-50 text-red-600 border-red-100', icon: <UserX size={24} />, iconColor: 'text-red-500' }
                            : { label: 'Présent', colorStyle: 'bg-emerald-50 text-emerald-600 border-emerald-100', icon: <UserCheck size={24} />, iconColor: 'text-emerald-500' };
                        };

                        const statusUI = getStatusUI();
                        const isAbsent = session.category === SessionCategory.INDIVIDUAL 
                          ? (session.individualStatus === AttendanceStatus.ABSENT || (session.individualStatus == null && session.noShowIds?.includes(client.id)))
                          : session.noShowIds?.includes(client.id);

                        return (
                          <div key={session.id} className="overflow-hidden bg-slate-50 border border-slate-100 rounded-3xl hover:bg-white hover:shadow-md transition-all group">
                            <div 
                              onClick={() => { if(session.category !== SessionCategory.GROUP) setExpandedSessionId(expandedSessionId === session.id ? null : session.id); }}
                              className={`p-6 flex flex-col md:flex-row justify-between items-start md:items-center gap-4 ${session.category !== SessionCategory.GROUP ? 'cursor-pointer' : 'cursor-default'}`}
                            >
                              <div className="flex items-center gap-4">
                                <div className={`w-12 h-12 bg-white rounded-2xl border border-slate-100 flex items-center justify-center ${session.category === SessionCategory.GROUP ? 'text-purple-500' : statusUI.iconColor} group-hover:bg-slate-900 group-hover:text-white transition-colors shadow-sm`}>
                                  {session.category === SessionCategory.GROUP ? <Users size={24} /> : statusUI.icon}
                                </div>
                                <div>
                                  <h4 className="text-sm font-black text-slate-800">{session.title}</h4>
                                  <div className="flex flex-wrap gap-3 mt-1.5">
                                    <span className="text-[9px] font-black text-slate-400 uppercase tracking-widest flex items-center gap-1.5">
                                      <Clock size={11} /> {(() => {
                                        if (!session.date) return '---';
                                        const [y, m, d] = session.date.split('-').map(Number);
                                        return new Date(y, m - 1, d).toLocaleDateString('fr-FR');
                                      })()} @ {session.startTime}
                                    </span>
                                    <span className={`text-[9px] font-black uppercase px-2 py-0.5 rounded border flex items-center gap-1.5 ${session.category === SessionCategory.GROUP ? 'bg-purple-50 text-purple-700 border-purple-100' : 'bg-blue-50 text-blue-700 border-blue-100'}`}>
                                      {session.category === SessionCategory.GROUP ? <Users size={11} /> : <User size={11} />}
                                      {session.category === SessionCategory.GROUP ? 'Session de Groupe' : 'Suivi Individuel'}
                                    </span>
                                    <span className="text-[9px] font-black text-slate-400 uppercase tracking-widest flex items-center gap-1.5">
                                      <Tag size={11} /> {SESSION_TYPE_LABELS[session.type] || session.type}
                                    </span>
                                    {(session.facilitatorName || session.advisorName) && (
                                      <span className="text-[9px] font-black text-slate-400 uppercase tracking-widest flex items-center gap-1.5">
                                        <Briefcase size={11} /> 
                                        {session.facilitatorName || session.advisorName}
                                        {session.facilitatorName && session.advisorName && session.facilitatorName !== session.advisorName && (
                                          <span className="opacity-60 ml-1">(Conseiller: {session.advisorName})</span>
                                        )}
                                      </span>
                                    )}
                                    <span className={`text-[9px] font-black uppercase px-2 py-0.5 rounded border ${statusUI.colorStyle}`}>
                                      {statusUI.label}
                                    </span>
                                  </div>
                                </div>
                              </div>
                              
                              <div className="flex items-center gap-3 ml-auto md:ml-0" onClick={e => e.stopPropagation()}>
                                 {onUpdateSession && session.category !== SessionCategory.GROUP && (
                                   <button 
                                    onClick={() => handleToggleAttendance(session)}
                                    disabled={isUpdatingAttendance === session.id}
                                    className={`flex items-center gap-2 px-5 py-2.5 rounded-xl text-[10px] font-black uppercase tracking-widest transition-all ${isAbsent ? 'bg-blue-600 text-white shadow-blue-100' : 'bg-white border border-slate-200 text-red-600 hover:bg-red-50'} disabled:opacity-50`}
                                   >
                                     {isUpdatingAttendance === session.id ? <Loader2 size={12} className="animate-spin" /> : isAbsent ? <CheckCircle2 size={14}/> : <UserX size={14}/>}
                                     {isAbsent ? 'Restaurer Présence' : 'Signaler No-Show'}
                                   </button>
                                 )}
                                 {session.category !== SessionCategory.GROUP && (
                                   <div className={`p-2 rounded-lg transition-transform ${expandedSessionId === session.id ? 'rotate-180 bg-slate-100' : 'bg-white'}`}>
                                     <ChevronDown size={16} className="text-slate-400" />
                                   </div>
                                 )}
                              </div>
                            </div>

                            {expandedSessionId === session.id && session.category !== SessionCategory.GROUP && (
                              <div className="px-6 pb-6 pt-2 border-t border-slate-100 bg-white/50 animate-in slide-in-from-top-2 duration-300">
                                <div className="grid grid-cols-1 md:grid-cols-3 gap-6 mt-4">
                                  <div className="space-y-2">
                                    <p className="text-[10px] font-black text-slate-400 uppercase tracking-widest flex items-center gap-2">
                                      <Target size={14} className="text-blue-500" /> Besoins discutés
                                    </p>
                                    <div className="p-4 bg-blue-50/50 rounded-2xl border border-blue-100/50 min-h-[80px]">
                                      <p className="text-xs text-slate-700 font-medium leading-relaxed">
                                        {session.discussedNeeds || "Aucun besoin renseigné"}
                                      </p>
                                    </div>
                                  </div>
                                  <div className="space-y-2">
                                    <p className="text-[10px] font-black text-slate-400 uppercase tracking-widest flex items-center gap-2">
                                      <Zap size={14} className="text-amber-500" /> Actions planifiées
                                    </p>
                                    <div className="p-4 bg-amber-50/50 rounded-2xl border border-amber-100/50 min-h-[80px]">
                                      <p className="text-xs text-slate-700 font-medium leading-relaxed">
                                        {session.actions || "Aucune action planifiée"}
                                      </p>
                                    </div>
                                  </div>
                                  <div className="space-y-2">
                                    <p className="text-[10px] font-black text-slate-400 uppercase tracking-widest flex items-center gap-2">
                                      <FileText size={14} className="text-slate-400" /> Notes générales
                                    </p>
                                    <div className="p-4 bg-slate-100/50 rounded-2xl border border-slate-200/50 min-h-[80px]">
                                      <p className="text-xs text-slate-700 font-medium leading-relaxed italic">
                                        {session.notes || "Aucune note générale"}
                                      </p>
                                    </div>
                                  </div>
                                </div>
                              </div>
                            )}
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
                               {item.type === 'SYSTEM' ? renderLogDetails(item.content) : (
                                 <p className="text-[11px] text-slate-700 font-medium leading-relaxed">{item.content}</p>
                               )}
                            </div>
                            <div className="text-right shrink-0">
                               <p className="text-[10px] font-bold text-slate-900">
                                 {(() => {
                                   if (!item.timestamp) return '---';
                                   const d = new Date(item.timestamp);
                                   // Si c'est une date seule YYYY-MM-DD, on s'assure qu'elle reste locale pour éviter le décalage
                                   if (typeof item.timestamp === 'string' && item.timestamp.length === 10) {
                                      const [y, m, day] = item.timestamp.split('-').map(Number);
                                      return new Date(y, m - 1, day).toLocaleDateString('fr-FR');
                                   }
                                   return d.toLocaleDateString('fr-FR');
                                 })()}
                               </p>
                               <p className="text-[9px] text-slate-400 font-medium">
                                 {item.timestamp?.includes('T') 
                                   ? new Date(item.timestamp).toLocaleTimeString('fr-FR', { hour: '2-digit', minute: '2-digit' })
                                   : '...'
                                 }
                               </p>
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

      <SessionModal 
        isOpen={showSessionModal}
        onClose={() => setShowSessionModal(false)}
        session={null}
        initialCategory={SessionCategory.INDIVIDUAL}
        initialParticipantIds={[client.id]}
        clients={allClients || []}
        partners={allPartners || []}
        contracts={allContracts || []}
        sessions={allSessions || []}
        allProfiles={allProfiles || []}
        activeRole={activeRole}
        currentUserName={currentUserName}
        currentUserId={currentUserId}
        onSave={(newSession) => {
          onAddSession(newSession);
          setShowSessionModal(false);
        }}
      />
    </div>
  );
};

export default ClientDetails;
