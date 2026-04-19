import React, { useState, useMemo, useRef, useEffect } from 'react';
import * as XLSX from 'xlsx';
import { Session, SessionType, SessionCategory, Client, FacilitatorType, AttendanceStatus, Partner, PartnerType, Contract, UserRole, Profile } from '../types';
import { SESSION_TYPE_LABELS } from '../constants';
import { apiService } from '../services/apiService';
import ConfirmModal from '../components/ConfirmModal';
import Pagination from '../components/Pagination';
import SessionModal from '../components/SessionModal';
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
  Upload,
  Loader2,
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
  onSelectClient: (client: Client) => void;
  allProfiles: Profile[];
  currentUserId?: string;
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
  onDeleteSession,
  onSelectClient,
  allProfiles,
  currentUserId
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
  const [filterStartDate, setFilterStartDate] = useState('');
  const [filterEndDate, setFilterEndDate] = useState('');
  const [currentPage, setCurrentPage] = useState(1);
  const itemsPerPage = 10;


  const [isLoading, setIsLoading] = useState(false);
  const [uniqueFacilitators, setUniqueFacilitators] = useState<string[]>([]);

  const [isImporting, setIsImporting] = useState(false);
  const fileInputRef = useRef<HTMLInputElement>(null);

  const [showModal, setShowModal] = useState<'individual' | 'group' | null>(null);
  const [viewingSession, setViewingSession] = useState<Session | null>(null);
  const [editingSession, setEditingSession] = useState<Session | null>(null);
  const [sessionToDelete, setSessionToDelete] = useState<string | null>(null);

  const filteredSessions = useMemo(() => {
    return sessions.filter(session => {
      // Filtrage par catégorie
      if (activeCategory === SessionCategory.GROUP && session.category !== SessionCategory.GROUP) return false;
      if (activeCategory === SessionCategory.INDIVIDUAL && session.category !== SessionCategory.INDIVIDUAL) return false;
      
      // Filtrage par recherche (titre de séance)
      if (searchTerm && !session.title?.toLowerCase().includes(searchTerm.toLowerCase())) return false;
      
      // Filtrage par type
      if (filterType !== 'ALL' && session.type !== filterType) return false;
      
      // Filtrage par facilitateur
      if (filterFacilitator !== 'ALL' && session.facilitatorName !== filterFacilitator) return false;
      
      // Filtrage par statut de présence (uniquement pour les individuelles)
      if (activeCategory === SessionCategory.INDIVIDUAL && filterAttendance !== 'ALL') {
        if (!session.individualStatus || session.individualStatus !== filterAttendance) return false;
      }
      
      // Filtrage par plage de dates
      if (filterStartDate && session.date < filterStartDate) return false;
      if (filterEndDate && session.date > filterEndDate) return false;

      // Filtrage métier par rôle
      if (activeRole === UserRole.ADVISOR) {
        return session.advisorName?.trim().toLowerCase() === currentUserName?.trim().toLowerCase();
      }
      if (activeRole === UserRole.PARTNER && session.category === SessionCategory.GROUP) {
        return session.facilitatorName?.trim().toLowerCase() === currentUserName?.trim().toLowerCase();
      }

      return true;
    }).sort((a, b) => new Date(b.date).getTime() - new Date(a.date).getTime());
  }, [sessions, activeCategory, searchTerm, filterType, filterFacilitator, filterAttendance, filterStartDate, filterEndDate, activeRole, currentUserName]);

  const totalItems = filteredSessions.length;
  const totalPages = Math.ceil(totalItems / itemsPerPage);

  const paginatedSessions = useMemo(() => {
    const startIndex = (currentPage - 1) * itemsPerPage;
    return filteredSessions.slice(startIndex, startIndex + itemsPerPage);
  }, [filteredSessions, currentPage]);

  useEffect(() => {
    const names = new Set(sessions.map(s => s.facilitatorName).filter(Boolean));
    setUniqueFacilitators(Array.from(names).sort() as string[]);
  }, [sessions]);

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
    setEditingSession(null);
  };

  const handleEditSession = (session: Session) => {
    setEditingSession(session);
    setViewingSession(null);
    setShowModal(session.category === SessionCategory.INDIVIDUAL ? 'individual' : 'group');
  };

  const handleSaveSession = (sessionData: Session) => {
    if (editingSession) {
      onUpdateSession?.(sessionData);
    } else {
      onAddSession(sessionData);
    }
    handleCloseModal();
  };

  const handleImportExcel = () => {
    fileInputRef.current?.click();
  };

  const onFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    if (e.target.files && e.target.files.length > 0) {
      setIsImporting(true);
      const file = e.target.files[0];
      const reader = new FileReader();

      reader.onload = async (evt) => {
        try {
          const bstr = evt.target?.result;
          const wb = XLSX.read(bstr, { type: 'binary', cellDates: true });
          const wsname = wb.SheetNames[0];
          const ws = wb.Sheets[wsname];
          
          const data = XLSX.utils.sheet_to_json(ws, { header: 1 }) as any[][];
          if (data.length < 2) {
            setIsImporting(false);
            return;
          }

          const headers = data[0].map(h => h?.toString().toLowerCase().trim());
          const rows = data.slice(1);

          const findIdx = (keywords: string[]) => {
            return headers.findIndex(h => keywords.some(k => h?.includes(k.toLowerCase())));
          };

          const idx = {
            iuc: findIdx(['iuc', 'crp', '#iuc', '#crp']),
            type: findIdx(['type de service', 'type', 'service']),
            date: findIdx(['date']),
            startTime: findIdx(['heure', 'start time']),
            duration: findIdx(['durée', 'duration', 'duree']),
            status: findIdx(['état de présence', 'etat de presence', 'statut', 'status', 'présence']),
            needs: findIdx(['besoins discutés', 'besoins']),
            actions: findIdx(['actions planifiées', 'actions']),
            notes: findIdx(['notes générales', 'notes']),
            advisor: findIdx(['courriel', 'email', 'conseiller', 'advisor_name']),
            createdAt: findIdx(['heure de saisie', 'saisie'])
          };

          if (idx.iuc === -1 || idx.date === -1) {
            throw new Error("Colonnes obligatoires manquantes : #IUC ou #CRP et Date sont requis.");
          }

          const formatDate = (val: any) => {
            if (!val) return null;
            // Native Excel dates
            if (val instanceof Date) {
              const d = new Date(val.getTime() - (val.getTimezoneOffset() * 60000));
              return d.toISOString().split('T')[0];
            }
            const strVal = val.toString().trim();
            
            // Handle DD-MM-YYYY or DD/MM/YYYY string formats
            const match = strVal.match(/^(\d{1,2})[\/\-](\d{1,2})[\/\-](\d{4})$/);
            if (match) {
              const [_, d, m, y] = match;
              return `${y}-${m.padStart(2, '0')}-${d.padStart(2, '0')}`;
            }
            
            return strVal;
          };

          const formatTimestamp = (val: any) => {
            if (!val) return undefined;
            // Native Excel dates
            if (val instanceof Date) {
              const d = new Date(val.getTime() - (val.getTimezoneOffset() * 60000));
              return d.toISOString();
            }
            const strVal = val.toString().trim();
            // Handle DD-MM-YYYY HH:mm or DD/MM/YYYY HH:mm string formats
            const matchDateTime = strVal.match(/^(\d{1,2})[\/\-](\d{1,2})[\/\-](\d{4})(?:\s+(\d{1,2}):(\d{2})(?::(\d{2}))?)?$/);
            if (matchDateTime) {
              const [_, d, m, y, hh, mm, ss] = matchDateTime;
              const hour = hh ? hh.padStart(2, '0') : '00';
              const minute = mm ? mm.padStart(2, '0') : '00';
              const second = ss ? ss.padStart(2, '0') : '00';
              return `${y}-${m.padStart(2, '0')}-${d.padStart(2, '0')}T${hour}:${minute}:${second}.000Z`;
            }
            // Fallback for native format or unhandled formats (Supabase Postgres will try to cast it)
            return strVal;
          };

          const getValue = (row: any[], index: number) => {
            if (index === -1 || row[index] === undefined || row[index] === null) return '';
            return row[index].toString().trim();
          };

          const newSessions: any[] = [];
          const failedIucs: string[] = [];
          for (const row of rows) {
            const iuc = getValue(row, idx.iuc);
            if (!iuc) continue;

            const normalize = (s: string) => {
              if (!s) return '';
              // 1. Alphanumérique de base
              let res = s.toLowerCase().replace(/[^a-z0-9]/g, '');
              // 2. Si c'est purement numérique, on retire les zéros en tête (cas Excel)
              if (/^\d+$/.test(res)) {
                res = res.replace(/^0+/, '') || '0';
              }
              return res;
            };

            const normalizedIuc = normalize(iuc);
            const client = clients.find(c => {
              if (!c.iucCrpNumber) return false;
              return normalize(c.iucCrpNumber) === normalizedIuc;
            });
            
            if (!client) {
              console.warn(`[IMPORT] Aucun client trouvé pour l'IUC/CRP: "${iuc}"`);
              failedIucs.push(iuc);
              continue;
            }

            const typeLabel = getValue(row, idx.type).toLowerCase();
            let type = SessionType.ESTABLISHMENT;
            if (typeLabel.includes('emploi')) type = SessionType.EMPLOYMENT;
            else if (typeLabel.includes('rtce')) type = SessionType.RTCE;
            else if (typeLabel.includes('jumelage')) type = SessionType.MATCHING;
            else if (typeLabel.includes('connexion')) type = SessionType.COMMUNITY_CONNECTION;

            const statusLabel = getValue(row, idx.status).toLowerCase();
            let status = AttendanceStatus.PRESENT;
            if (statusLabel.includes('absent')) status = AttendanceStatus.ABSENT;
            else if (statusLabel.includes('annule')) status = AttendanceStatus.CANCELLED;
            else if (statusLabel.includes('décalée')) status = AttendanceStatus.DECALEE;

            const advisorIdentifierFromExcel = getValue(row, idx.advisor);
            const matchedProfile = advisorIdentifierFromExcel 
              ? allProfiles.find(p => p.email && p.email.toLowerCase() === advisorIdentifierFromExcel.toLowerCase()) || 
                allProfiles.find(p => `${p.firstName} ${p.lastName}`.toLowerCase() === advisorIdentifierFromExcel.toLowerCase())
              : null;

            newSessions.push({
              title: `${client.firstName} ${client.lastName}`,
              type,
              category: SessionCategory.INDIVIDUAL,
              date: formatDate(row[idx.date]),
              startTime: getValue(row, idx.startTime) || '09:00',
              duration: parseInt(getValue(row, idx.duration)) || 60,
              participantIds: [client.id],
              noShowIds: status === AttendanceStatus.ABSENT ? [client.id] : [],
              location: 'CFGT',
              notes: getValue(row, idx.notes),
              facilitatorName: matchedProfile ? `${matchedProfile.firstName} ${matchedProfile.lastName}` : (advisorIdentifierFromExcel || currentUserName),
              facilitatorType: FacilitatorType.ORGANIZATION,
              advisorName: matchedProfile ? `${matchedProfile.firstName} ${matchedProfile.lastName}` : (advisorIdentifierFromExcel || currentUserName),
              discussedNeeds: getValue(row, idx.needs),
              actions: getValue(row, idx.actions),
              individualStatus: status,
              needsInterpretation: false,
              advisor_id: matchedProfile?.id || currentUserId,
              ...(getValue(row, idx.createdAt) && { created_at: formatTimestamp(row[idx.createdAt]) })
            });
          }

          if (newSessions.length > 0) {
            await apiService.bulkCreateSessions(newSessions);
            let successMsg = `${newSessions.length} séance(s) importée(s) avec succès.`;
            if (failedIucs.length > 0) {
              successMsg += `\n\nAttention: ${failedIucs.length} ligne(s) ont été ignorées car l'IUC n'a pas été trouvé :\n- ` + [...new Set(failedIucs)].join("\n- ");
            }
            alert(successMsg);
            window.location.reload(); 
          } else {
            let msg = "Aucune séance n'a été importée.";
            if (failedIucs.length > 0) {
              msg += "\n\nLes identifiants suivants n'ont pas été trouvés dans la base de données :\n- " + [...new Set(failedIucs)].join("\n- ");
              msg += "\n\nVérifiez que ces numéros correspondent exactement à ce qui est affiché dans votre liste de clients.";
            } else {
              msg += " Vérifiez que votre fichier contient bien des données sous les en-têtes corrects.";
            }
            alert(msg);
          }

        } catch (err: any) {
          const fieldMap: Record<string, string> = {
            'title': 'Nom du Client',
            'date': 'Date',
            'start_time': 'Heure (Start Time)',
            'duration': 'Durée',
            'facilitator_name': 'Facilitateur',
            'advisor_name': 'Conseiller/Email',
            'contract_id': 'Contrat'
          };

          if (err.details && err.details.rowIndex !== undefined) {
             const { rowIndex, field, clientName, error } = err.details;
             const mappedField = fieldMap[field] || field;
             const excelLine = rowIndex + 2; // +1 for header, +1 for 1-based indexing
             alert(`Erreur d'importation (Ligne ${excelLine})\n-----------------------------------\nClient : ${clientName || 'Inconnu'}\nChamp : ${mappedField}\n\nRaison : ${error}`);
          } else {
             alert("Erreur lors de l'import : " + err.message);
          }
        } finally {
          setIsImporting(false);
          if (fileInputRef.current) fileInputRef.current.value = '';
        }
      };

      reader.readAsBinaryString(file);
    }
  };

  return (
    <div className="space-y-4">
      {/* Barre d'outils et Navigation Segmentée SLDS */}
      <div className="slds-card p-3 space-y-3">
        <div className="flex flex-col lg:flex-row justify-between items-center gap-3">
          <div className="flex bg-slate-100/80 p-1.5 rounded-[1.5rem] w-full lg:w-auto border border-slate-200/50">
            <button 
              onClick={() => setActiveCategory(SessionCategory.INDIVIDUAL)}
              className={`flex-1 lg:flex-none flex items-center justify-center gap-2 px-6 py-2 rounded-[1.25rem] text-[10px] font-black uppercase tracking-widest transition-all ${activeCategory === SessionCategory.INDIVIDUAL ? 'bg-white text-slds-brand shadow-md shadow-slate-200/50' : 'text-slate-400 hover:text-slate-600'}`}
            >
              <User size={14} /> Individuelles
            </button>
            <button 
              onClick={() => setActiveCategory(SessionCategory.GROUP)}
              className={`flex-1 lg:flex-none flex items-center justify-center gap-2 px-6 py-2 rounded-[1.25rem] text-[10px] font-black uppercase tracking-widest transition-all ${activeCategory === SessionCategory.GROUP ? 'bg-white text-slds-brand shadow-md shadow-slate-200/50' : 'text-slate-400 hover:text-slate-600'}`}
            >
              <Users size={14} /> Collectives
            </button>
          </div>

          <div className="flex gap-2 w-full lg:w-auto">
            <input 
              type="file" 
              ref={fileInputRef} 
              onChange={onFileChange} 
              accept=".xlsx, .xls, .csv" 
              className="hidden" 
            />
            <button 
              onClick={handleImportExcel}
              disabled={isImporting}
              className="slds-button slds-button-neutral !px-4 !py-2 flex items-center gap-2"
            >
              {isImporting ? (
                <>
                  <Loader2 size={14} className="animate-spin" /> Chargement...
                </>
              ) : (
                <>
                  <Upload size={14} /> Téléversement par lots
                </>
              )}
            </button>
            <button 
              onClick={() => setShowModal(activeCategory === SessionCategory.INDIVIDUAL ? 'individual' : 'group')}
              className="slds-button slds-button-brand !px-4 !py-2 w-full lg:w-auto"
            >
              <Plus size={14} className="mr-2" /> Nouvelle Séance
            </button>
          </div>
        </div>

        <div className="flex flex-nowrap items-center gap-2 pt-3 border-t border-slds-border overflow-x-hidden">
          <div className="relative flex-1 min-w-[140px] max-w-[280px]">
            <Search className="absolute left-2.5 top-1/2 -translate-y-1/2 text-slds-text-secondary" size={12} />
            <input 
              type="text" 
              placeholder="Rechercher..."
              className="slds-input slds-input-compact pl-8 py-1.5"
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
            />
          </div>

          <div className="h-4 w-px bg-slate-100 shrink-0 mx-1" />

          <select 
            className="slds-input slds-input-compact w-auto shrink-0 max-w-[130px] text-[11px]"
            value={filterType}
            onChange={(e) => setFilterType(e.target.value as any)}
          >
            <option value="ALL">Tous Services</option>
            {Object.values(SessionType).map(t => <option key={t} value={t}>{SESSION_TYPE_LABELS[t]}</option>)}
          </select>

          <select 
            className="slds-input slds-input-compact w-auto shrink-0 max-w-[150px] text-[11px]"
            value={filterFacilitator}
            onChange={(e) => setFilterFacilitator(e.target.value)}
          >
            <option value="ALL">Intervenants</option>
            {uniqueFacilitators.map(f => <option key={f} value={f}>{f}</option>)}
          </select>

          {activeCategory === SessionCategory.INDIVIDUAL && (
            <select 
              className="slds-input slds-input-compact w-auto shrink-0 max-w-[100px] text-[11px]"
              value={filterAttendance}
              onChange={(e) => setFilterAttendance(e.target.value as any)}
            >
              <option value="ALL">Statuts</option>
              {Object.values(AttendanceStatus).map(s => <option key={s} value={s}>{s}</option>)}
            </select>
          )}

          <div className="flex items-center gap-1 shrink-0">
            <input 
              type="date" 
              className="slds-input slds-input-compact w-auto text-[10px] h-7 px-1"
              value={filterStartDate}
              onChange={(e) => setFilterStartDate(e.target.value)}
            />
            <span className="text-[9px] font-bold text-slate-400 uppercase">au</span>
            <input 
              type="date" 
              className="slds-input slds-input-compact w-auto text-[10px] h-7 px-1"
              value={filterEndDate}
              onChange={(e) => setFilterEndDate(e.target.value)}
            />
          </div>

          {(searchTerm || filterType !== 'ALL' || filterFacilitator !== 'ALL' || filterAttendance !== 'ALL' || filterStartDate || filterEndDate) && (
            <button 
              onClick={() => {
                setSearchTerm('');
                setFilterType('ALL');
                setFilterFacilitator('ALL');
                setFilterAttendance('ALL');
                setFilterStartDate('');
                setFilterEndDate('');
              }}
              className="text-[10px] font-black text-slds-brand uppercase hover:underline whitespace-nowrap shrink-0 ml-1"
            >
              Réinitialiser
            </button>
          )}
        </div>
      </div>

      {/* Liste en Lignes (Tableau) Style Gestion Clients */}
      <div className="slds-card overflow-hidden">
        <div className="overflow-x-auto">
          <table className="slds-table">
            <thead>
              <tr>
                <th>Séance / Client</th>
                <th>Intervenant</th>
                <th>Date & Heure</th>
                <th>Ville (Client)</th>
                <th className="text-center">{activeCategory === SessionCategory.INDIVIDUAL ? 'Statut' : 'Participants'}</th>
                <th></th>
              </tr>
            </thead>
            <tbody>
              {isLoading ? (
                <tr>
                  <td colSpan={6}>
                    <div className="flex flex-col items-center justify-center py-20 text-slate-400">
                      <Loader2 className="w-10 h-10 animate-spin mb-4 text-slds-brand" />
                      <p className="text-sm font-medium">Chargement des séances...</p>
                    </div>
                  </td>
                </tr>
              ) : paginatedSessions.length > 0 ? (
                paginatedSessions.map(session => {
                  const client = clients.find(c => session.participantIds.includes(c.id));
                
                return (
                   <tr 
                    key={session.id}
                    onClick={() => setViewingSession(session)}
                    className="hover:bg-slds-bg cursor-pointer group"
                  >
                    <td>
                      <div className="flex items-center gap-3">
                        {session.category === SessionCategory.INDIVIDUAL && client ? (
                          <>
                            <div className="w-8 h-8 rounded bg-slds-bg text-slds-text-secondary flex items-center justify-center font-bold text-xs border border-slds-border shrink-0">
                              {client ? `${client.firstName?.[0] || '?'}${client.lastName?.[0] || '?'}` : '??'}
                            </div>
                            <div className="min-w-0">
                              <p className="text-sm font-bold text-slds-brand leading-tight truncate">
                                {client.firstName} {client.lastName}
                              </p>
                              <p className="text-[10px] text-slds-text-secondary font-normal uppercase mt-0.5 truncate">
                                {client.profession}
                              </p>
                            </div>
                          </>
                        ) : (
                          <>
                            <div className="w-8 h-8 rounded bg-indigo-500 text-white flex items-center justify-center shadow-sm shrink-0">
                              <Users size={16} />
                            </div>
                            <div className="min-w-0">
                              <p className="text-sm font-bold text-slds-brand leading-tight truncate">
                                {session.title}
                              </p>
                              <p className="text-[10px] text-indigo-600 font-bold uppercase mt-0.5 truncate">
                                {SESSION_TYPE_LABELS[session.type]}
                              </p>
                            </div>
                          </>
                        )}
                      </div>
                    </td>
                    <td>
                      <div>
                        <p className="text-xs font-semibold text-slds-text-primary">{session.facilitatorName}</p>
                        <p className="text-[10px] text-slds-text-secondary uppercase">
                          {session.facilitatorType === FacilitatorType.CONSULTANT ? 'Consultant' : 'Interne'}
                        </p>
                      </div>
                    </td>
                    <td className="text-xs text-slds-text-primary font-medium">
                      <div className="flex items-center gap-2">
                        <span>{formatDate(session.date)}</span>
                        <span className="text-slds-text-secondary text-[10px]">{session.startTime}</span>
                      </div>
                    </td>
                    <td>
                      <div className="text-xs font-semibold text-slds-text-primary">
                        {client ? client.destinationCity : (session.location || '—')}
                      </div>
                      <div className="text-[10px] text-slds-text-secondary uppercase">
                        {client ? client.originCountry : (session.category === SessionCategory.GROUP ? 'Séance Collective' : 'Séance Individuelle')}
                      </div>
                    </td>
                    <td className="text-center">
                      {activeCategory === SessionCategory.INDIVIDUAL ? (
                        <span className={`inline-block px-2 py-0.5 rounded text-[10px] font-bold uppercase tracking-tight border ${getAttendanceBadge(session.individualStatus)}`}>
                          {session.individualStatus || 'À VENIR'}
                        </span>
                      ) : (
                        <div className="flex flex-col items-center">
                          <p className="text-xs font-bold text-slds-text-primary">{session.participantIds.length}</p>
                          <p className="text-[9px] text-slds-text-secondary font-bold uppercase">Inscrits</p>
                        </div>
                      )}
                    </td>
                    <td className="text-right">
                      <ChevronRight size={16} className="text-slds-text-secondary opacity-0 group-hover:opacity-100 transition-all group-hover:text-slds-brand" />
                    </td>
                  </tr>
                );
              })
              ) : (
                <tr>
                  <td colSpan={6} className="py-20 text-center text-slate-400 font-medium">
                    Aucune séance trouvée pour ces critères.
                  </td>
                </tr>
              )}
            </tbody>
          </table>
        </div>

        {/* Pagination UI */}
        <Pagination 
          currentPage={currentPage}
          totalPages={totalPages}
          onPageChange={setCurrentPage}
          totalItems={totalItems}
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
            
            <div className="p-6 space-y-6 overflow-y-auto flex-1">
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

            <div className="p-4 bg-slds-bg border-t border-slds-border flex justify-end gap-3 shrink-0">
               {(activeRole === UserRole.ADMIN || activeRole === UserRole.MANAGER || 
                 (currentUserId && viewingSession.advisorId === currentUserId) ||
                 (!viewingSession.advisorId && currentUserName && viewingSession.advisorName && 
                  viewingSession.advisorName?.trim().toLowerCase() === currentUserName?.trim().toLowerCase())) && (
                 <button 
                  onClick={() => handleEditSession(viewingSession)}
                  className="slds-button slds-button-neutral flex items-center gap-2"
                 >
                   <Edit2 size={14} /> Modifier
                 </button>
               )}
               {onDeleteSession && (activeRole === UserRole.ADMIN || activeRole === UserRole.MANAGER || 
                 (currentUserId && viewingSession.advisorId === currentUserId) ||
                 (!viewingSession.advisorId && currentUserName && viewingSession.advisorName && 
                  viewingSession.advisorName?.trim().toLowerCase() === currentUserName?.trim().toLowerCase())) && (
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
        title="⚠️ Action Critique : Supprimer la séance"
        message={
          (activeCategory === SessionCategory.GROUP || viewingSession?.category === SessionCategory.GROUP)
            ? "ATTENTION : Vous êtes sur le point de supprimer une séance COLLECTIVE. Cette action l'effacera définitivement de l'historique de TOUS les participants inscrits. Les données de présence et de suivi seront perdues pour tout le groupe. Voulez-vous confirmer cette suppression ?"
            : "Voulez-vous vraiment supprimer définitivement cette séance individuelle ? Cette action est irréversible."
        }
        confirmLabel="Confirmer la suppression"
        onConfirm={() => { if(sessionToDelete) { onDeleteSession?.(sessionToDelete); setViewingSession(null); setSessionToDelete(null); } }}
        onCancel={() => setSessionToDelete(null)}
        variant="danger"
      />

      <SessionModal 
        isOpen={!!showModal}
        onClose={handleCloseModal}
        session={editingSession}
        initialCategory={showModal === 'group' ? SessionCategory.GROUP : SessionCategory.INDIVIDUAL}
        clients={clients}
        partners={partners}
        contracts={contracts}
        allProfiles={allProfiles}
        activeRole={activeRole}
        currentUserName={currentUserName}
        currentUserId={currentUserId}
        onSave={handleSaveSession}
      />
    </div>
  );
};

export default SessionList;
