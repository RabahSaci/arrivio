import React, { useState, useMemo, useRef, useEffect } from 'react';
import * as XLSX from 'xlsx';
import { Session, SessionType, SessionCategory, Client, FacilitatorType, AttendanceStatus, Partner, PartnerType, Contract, UserRole, Profile } from '../types';
import { SESSION_TYPE_LABELS, SESSION_CATEGORY_LABELS, ATTENDANCE_STATUS_LABELS } from '../constants';
import { apiService } from '../services/apiService';
import { exportSEBAAReport } from '../services/exportSEBAA';
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

  // Helper pour formater la date sans décalage de fuseau horaire (inclut le jour de la semaine complet)
  const formatDate = (dateString: string) => {
    if (!dateString) return '';
    const [year, month, day] = dateString.split('-').map(Number);
    const date = new Date(year, month - 1, day);
    const dayName = date.toLocaleDateString('fr-FR', { weekday: 'long' });
    const capitalizedDay = dayName.charAt(0).toUpperCase() + dayName.slice(1);
    return `${capitalizedDay} ${date.toLocaleDateString('fr-FR')}`;
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
  
  // List of unique facilitators from profiles for the filter
  const facilitatorOptions = useMemo(() => {
    return allProfiles
      .filter(p => [UserRole.ADVISOR, UserRole.MANAGER, UserRole.ADMIN, UserRole.PARTNER].includes(p.role))
      .map(p => ({
        id: p.id,
        name: `${p.firstName} ${p.lastName}`.trim()
      }))
      .sort((a, b) => a.name.localeCompare(b.name));
  }, [allProfiles]);

  const [isImporting, setIsImporting] = useState(false);
  const fileInputRef = useRef<HTMLInputElement>(null);

  const [showModal, setShowModal] = useState<'individual' | 'group' | null>(null);
  const [viewingSession, setViewingSession] = useState<Session | null>(null);
  
  // Synchronisation des données consultées lors des mises à jour globales
  useEffect(() => {
    if (viewingSession) {
      const updated = sessions.find(s => s.id === viewingSession.id);
      if (updated) {
        setViewingSession(updated);
      }
    }
  }, [sessions, viewingSession?.id]);
  const [editingSession, setEditingSession] = useState<Session | null>(null);
  const [sessionToDelete, setSessionToDelete] = useState<string | null>(null);

  // OPTIMIZATION: Index clients by ID for lightning-fast lookup during search/render
  const clientsById = useMemo(() => {
    const map = new Map<string, Client>();
    clients.forEach(c => map.set(c.id, c));
    return map;
  }, [clients]);

  const filteredSessions = useMemo(() => {
    return sessions.filter(session => {
      // Filtrage par catégorie
      if (activeCategory === SessionCategory.GROUP && session.category !== SessionCategory.GROUP) return false;
      if (activeCategory === SessionCategory.INDIVIDUAL && session.category !== SessionCategory.INDIVIDUAL) return false;
      
      // Filtrage par recherche (titre de séance ou participant)
      if (searchTerm) {
        const query = searchTerm.toLowerCase();
        
        // 1. Match sur le titre de la séance
        const titleMatch = session.title?.toLowerCase().includes(query);
        if (titleMatch) return true;

        // 2. Match sur les participants (Nom, Prénom, Email) via l'index optimisé
        const participantMatch = session.participantIds?.some(id => {
          const client = clientsById.get(id);
          if (!client) return false;
          
          const firstName = client.firstName?.toLowerCase() || '';
          const lastName = client.lastName?.toLowerCase() || '';
          const email = client.email?.toLowerCase() || '';
          
          // On vérifie les critères sans recalculer inutilement
          return (
            firstName.includes(query) ||
            lastName.includes(query) ||
            (firstName + " " + lastName).includes(query) ||
            (lastName + " " + firstName).includes(query) ||
            email.includes(query)
          );
        });

        if (!participantMatch) return false;
      }
      
      // Filtrage par type
      if (filterType !== 'ALL' && session.type !== filterType) return false;
      
      // Filtrage par facilitateur (ID ou Nom)
      if (filterFacilitator !== 'ALL') {
        const selectedOption = facilitatorOptions.find(o => o.id === filterFacilitator);
        if (selectedOption) {
          const matchId = session.advisorId === selectedOption.id;
          const matchName = session.facilitatorName?.trim().toLowerCase() === selectedOption.name.toLowerCase();
          if (!matchId && !matchName) return false;
        } else {
          // Fallback just in case "ALL" logic is different or manually set
          if (session.facilitatorName !== filterFacilitator) return false;
        }
      }
      
      // Filtrage par statut de présence (uniquement pour les individuelles)
      if (activeCategory === SessionCategory.INDIVIDUAL && filterAttendance !== 'ALL') {
        if (!session.individualStatus || session.individualStatus !== filterAttendance) return false;
      }
      
      // Filtrage par plage de dates
      if (filterStartDate && session.date < filterStartDate) return false;
      if (filterEndDate && session.date > filterEndDate) return false;

      // Filtrage métier par rôle
      if (activeRole === UserRole.PARTNER && session.category === SessionCategory.GROUP) {
        return session.facilitatorName?.trim().toLowerCase() === currentUserName?.trim().toLowerCase();
      }

      return true;
    }).sort((a, b) => new Date(b.date).getTime() - new Date(a.date).getTime());
  }, [sessions, activeCategory, searchTerm, filterType, filterFacilitator, filterAttendance, filterStartDate, filterEndDate, activeRole, currentUserName, clientsById]);

  const totalItems = filteredSessions.length;
  const totalPages = Math.ceil(totalItems / itemsPerPage);

  const paginatedSessions = useMemo(() => {
    const startIndex = (currentPage - 1) * itemsPerPage;
    return filteredSessions.slice(startIndex, startIndex + itemsPerPage);
  }, [filteredSessions, currentPage]);


  const resetFilters = () => {
    setSearchTerm('');
    setFilterType('ALL');
    setFilterFacilitator('ALL');
    setFilterAttendance('ALL');
  };

  const getTypeTextColor = () => {
    return 'text-slate-700 font-black'; // Noir profond et gras pour un contraste maximal
  };

  const getAttendanceStats = (clientId: string) => {
    const todayStr = new Date().toISOString().split('T')[0];
    const clientSessions = sessions.filter(s => s.participantIds?.includes(clientId) && s.date <= todayStr);
    
    if (clientSessions.length === 0) return null;
    
    let attendedCount = 0;
    let relevantTotalCount = 0;

    clientSessions.forEach(s => {
      if (s.category === SessionCategory.INDIVIDUAL) {
        if (s.individualStatus === AttendanceStatus.CANCELLED || s.individualStatus === AttendanceStatus.DECALEE) {
          return;
        }
        relevantTotalCount++;
        const isPresent = s.individualStatus === AttendanceStatus.PRESENT
          || (s.individualStatus == null && !s.noShowIds?.includes(clientId));
        if (isPresent) attendedCount++;
      } else {
        relevantTotalCount++;
        if (!s.noShowIds?.includes(clientId)) {
          attendedCount++;
        }
      }
    });

    if (relevantTotalCount === 0) return null;
    
    return {
      rate: Math.round((attendedCount / relevantTotalCount) * 100),
      total: relevantTotalCount
    };
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

  const downloadWebinarTemplate = () => {
    try {
      const templateData = [
        {
          "Zoom ID": "85212345678",
          "Titre de la séance": "Titre du Webinaire",
          "Type de service": "Établissement",
          "Date": "2025-04-20",
          "Heure": "14:00",
          "Durée (min)": 60,
          "Courriel Participant": "client@email.com",
          "IUC Participant": "Optionnel",
          "Intervenant": "Nom ou Email",
          "Type d'intervenant": "Organisme ou Consultant",
          "Courriel du conseiller": "votre@email.com",
          "Notes": "Notes optionnelles"
        }
      ];

      const ws = XLSX.utils.json_to_sheet(templateData);
      const wb = XLSX.utils.book_new();
      XLSX.utils.book_append_sheet(wb, ws, "Gabarit Webinaire");
      
      // Génération binaire et téléchargement manuel via Blob
      const wbout = XLSX.write(wb, { bookType: 'xlsx', type: 'binary' });
      const s2ab = (s: string) => {
        const buf = new ArrayBuffer(s.length);
        const view = new Uint8Array(buf);
        for (let i = 0; i < s.length; i++) view[i] = s.charCodeAt(i) & 0xFF;
        return buf;
      };
      
      const blob = new Blob([s2ab(wbout)], { type: "application/octet-stream" });
      const url = window.URL.createObjectURL(blob);
      const a = document.createElement("a");
      a.href = url;
      a.download = "Arrivio_Gabarit_Webinaire.xlsx";
      document.body.appendChild(a);
      a.click();
      window.URL.revokeObjectURL(url);
      document.body.removeChild(a);
    } catch (error) {
      console.error("Erreur lors du téléchargement du gabarit:", error);
      alert("Une erreur est survenue lors de la génération du fichier. Veuillez réessayer.");
    }
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
            iuc: findIdx(['iuc', 'crp', '#iuc', '#crp', 'iuc participant']),
            email: findIdx(['courriel participant', 'email participant', 'courriel', 'email']),
            zoomId: findIdx(['zoom id', 'meeting id', 'réunion id']),
            type: findIdx(['type de service', 'type', 'service']),
            date: findIdx(['date']),
            startTime: findIdx(['heure', 'start time']),
            duration: findIdx(['durée', 'duration', 'duree', 'durée (min)']),
            status: findIdx(['état de présence', 'etat de presence', 'statut', 'status', 'présence']),
            needs: findIdx(['besoins discutés', 'besoins']),
            actions: findIdx(['actions planifiées', 'actions']),
            notes: findIdx(['notes générales', 'notes']),
            facilitatorName: findIdx(['intervenant', 'facilitateur', 'facilitator_name']),
            advisorEmail: findIdx(['courriel du conseiller', 'email conseiller', 'advisor email']),
            facilitatorType: findIdx(['type d\'intervenant', 'type intervenant', 'facilitator type']),
            createdAt: findIdx(['heure de saisie', 'saisie']),
            title: findIdx(['titre de la séance', 'nom du webinaire', 'objet'])
          };

          const isGroupMode = activeCategory === SessionCategory.GROUP;

          // Valider les colonnes vitales selon le mode
          if (isGroupMode) {
            if (idx.zoomId === -1 || idx.date === -1) {
              throw new Error("Colonnes obligatoires manquantes pour Webinaire : Zoom ID et Date sont requis.");
            }
          } else {
            if (idx.iuc === -1 || idx.date === -1) {
              throw new Error("Colonnes obligatoires manquantes : #IUC ou #CRP et Date sont requis.");
            }
          }

          const formatDate = (val: any) => {
            if (!val) return null;
            if (val instanceof Date) {
              const y = val.getFullYear();
              const m = String(val.getMonth() + 1).padStart(2, '0');
              const d = String(val.getDate()).padStart(2, '0');
              return `${y}-${m}-${d}`;
            }
            if (!isNaN(Number(val)) && Number(val) > 30000) {
              // Excel date serial number
              const d = new Date((Number(val) - 25569) * 86400 * 1000);
              const y = d.getFullYear();
              const m = String(d.getMonth() + 1).padStart(2, '0');
              const day = String(d.getDate()).padStart(2, '0');
              return `${y}-${m}-${day}`;
            }
            const strVal = val.toString().trim();
            const match = strVal.match(/^(\d{1,2})[\/\-](\d{1,2})[\/\-](\d{4})$/);
            if (match) {
              return `${match[3]}-${match[2].padStart(2, '0')}-${match[1].padStart(2, '0')}`;
            }
            return strVal;
          };

          const formatTimestamp = (val: any) => {
            if (!val) return undefined;
            if (val instanceof Date) {
              const d = new Date(val.getTime() - (val.getTimezoneOffset() * 60000));
              return d.toISOString();
            }
            const strVal = val.toString().trim();
            const matchDateTime = strVal.match(/^(\d{1,2})[\/\-](\d{1,2})[\/\-](\d{4})(?:\s+(\d{1,2}):(\d{2})(?::(\d{2}))?)?$/);
            if (matchDateTime) {
              const [_, d, m, y, hh, mm, ss] = matchDateTime;
              const hour = hh ? hh.padStart(2, '0') : '00';
              const minute = mm ? mm.padStart(2, '0') : '00';
              const second = ss ? ss.padStart(2, '0') : '00';
              return `${y}-${m.padStart(2, '0')}-${d.padStart(2, '0')}T${hour}:${minute}:${second}.000Z`;
            }
            return strVal;
          };

          const formatTime = (val: any) => {
            if (!val) return '09:00';
            if (val instanceof Date) {
              const h = val.getHours().toString().padStart(2, '0');
              const m = val.getMinutes().toString().padStart(2, '0');
              return `${h}:${m}`;
            }
            let strVal = val.toString().trim().replace('h', ':');
            
            // Handle Excel numeric time if leaked as string
            if (!isNaN(Number(strVal)) && Number(strVal) < 1) {
              const totalMinutes = Math.round(Number(strVal) * 24 * 60);
              const h = Math.floor(totalMinutes / 60).toString().padStart(2, '0');
              const m = (totalMinutes % 60).toString().padStart(2, '0');
              return `${h}:${m}`;
            }

            const match = strVal.match(/^(\d{1,2}):(\d{2})/);
            if (match) {
              return `${match[1].padStart(2, '0')}:${match[2]}`;
            }
            return '09:00';
          };

          const getValue = (row: any[], index: number) => {
            if (index === -1 || row[index] === undefined || row[index] === null) return '';
            return row[index].toString().trim();
          };

          const normalize = (s: string) => {
            if (!s) return '';
            let res = s.toLowerCase().replace(/[^a-z0-9]/g, '');
            if (/^\d+$/.test(res)) {
              res = res.replace(/^0+/, '') || '0';
            }
            return res;
          };

          const findClient = (iucStr: string, emailStr: string) => {
            const normalizedIuc = normalize(iucStr);
            const normalizedEmail = emailStr.toLowerCase().trim();
            
            return clients.find(c => {
              // Priority 1: Email matching
              if (normalizedEmail && c.email && c.email.toLowerCase().trim() === normalizedEmail) return true;
              // Priority 2: IUC matching
              if (normalizedIuc && c.iucCrpNumber && normalize(c.iucCrpNumber) === normalizedIuc) return true;
              return false;
            });
          };

          const newSessions: any[] = [];
          const failedIdentifiers: string[] = [];
          let skippedFutureDates = 0;
          const today = getTodayString();

          if (isGroupMode) {
            // Logique de regroupement par Zoom ID
            const groupMap = new Map<string, any>();

            for (const row of rows) {
              const zoomId = getValue(row, idx.zoomId);
              if (!zoomId) continue;

              const sessionDate = formatDate(row[idx.date]);
              const iuc = getValue(row, idx.iuc);
              const email = getValue(row, idx.email);

              const client = findClient(iuc, email);
              if (!client) {
                failedIdentifiers.push(email || iuc || "Inconnu");
                continue;
              }

                if (!groupMap.has(zoomId)) {
                  const advisorEmailFromExcel = getValue(row, idx.advisorEmail);
                  const facilitatorNameFromExcel = getValue(row, idx.facilitatorName);
                  const facilitatorTypeFromExcel = getValue(row, idx.facilitatorType).toLowerCase().includes('consultant') 
                    ? FacilitatorType.CONSULTANT 
                    : FacilitatorType.ORGANIZATION;

                  const matchedAdvisor = advisorEmailFromExcel 
                    ? allProfiles.find(p => p.email && p.email.toLowerCase() === advisorEmailFromExcel.toLowerCase())
                    : null;

                  const facilitatorName = facilitatorNameFromExcel || (matchedAdvisor ? `${matchedAdvisor.firstName} ${matchedAdvisor.lastName}` : currentUserName);

                  // Auto-link to active contract if it's a consultant - USE ROBUST NORMALIZATION
                  let contractId = undefined;
                  if (facilitatorTypeFromExcel === FacilitatorType.CONSULTANT) {
                    const normalizedFacilitator = normalize(facilitatorName);
                    const activeContract = contracts.find(c => 
                      normalize(c.consultantName) === normalizedFacilitator && 
                      c.status === 'ACTIVE' &&
                      sessionDate >= c.startDate &&
                      sessionDate <= c.endDate
                    );
                    if (activeContract) {
                      contractId = activeContract.id;
                    }
                  }

                  const typeLabel = getValue(row, idx.type).toLowerCase();
                  let type = SessionType.ESTABLISHMENT;
                  if (typeLabel.includes('emploi')) type = SessionType.EMPLOYMENT;
                  else if (typeLabel.includes('rtce')) type = SessionType.RTCE;

                  groupMap.set(zoomId, {
                    title: getValue(row, idx.title) || `Webinaire ${zoomId}`,
                    type,
                    category: SessionCategory.GROUP,
                    date: sessionDate,
                    startTime: formatTime(row[idx.startTime]),
                    duration: parseInt(getValue(row, idx.duration)) || 60,
                    participantIds: [],
                    noShowIds: [],
                    location: 'Zoom',
                    zoomId: zoomId,
                    facilitatorName,
                    facilitatorType: facilitatorTypeFromExcel,
                    advisorName: matchedAdvisor ? `${matchedAdvisor.firstName} ${matchedAdvisor.lastName}` : currentUserName,
                    notes: getValue(row, idx.notes),
                    advisorId: matchedAdvisor?.id || currentUserId,
                    contractId,
                    needsInterpretation: false
                  });
                }

              const group = groupMap.get(zoomId);
              if (!group.participantIds.includes(client.id)) {
                group.participantIds.push(client.id);
              }
            }

            // Convert map to array
            newSessions.push(...Array.from(groupMap.values()));

          } else {
            // Logique Individuelle classique
            for (const row of rows) {
              const iuc = getValue(row, idx.iuc);
              const email = getValue(row, idx.email);
              if (!iuc && !email) continue;

              const sessionDate = formatDate(row[idx.date]);
              if (activeRole === UserRole.ADVISOR && sessionDate && sessionDate > today) {
                skippedFutureDates++;
                continue;
              }

              const client = findClient(iuc, email);
              if (!client) {
                failedIdentifiers.push(email || iuc);
                continue;
              }

              const typeLabel = getValue(row, idx.type).toLowerCase();
              let type = SessionType.ESTABLISHMENT;
              if (typeLabel.includes('emploi')) type = SessionType.EMPLOYMENT;
              else if (typeLabel.includes('rtce')) type = SessionType.RTCE;

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
                date: sessionDate,
                startTime: formatTime(row[idx.startTime]),
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
          }

          if (newSessions.length > 0) {
            await apiService.bulkCreateSessions(newSessions);
            let successMsg = isGroupMode 
              ? `${newSessions.length} webinaire(s) importé(s) avec succès.`
              : `${newSessions.length} séance(s) importée(s) avec succès.`;
            
            if (skippedFutureDates > 0) {
              successMsg += `\n\n⚠️ ${skippedFutureDates} séance(s) individuelle(s) ont été ignorées (date dans le futur).`;
            }
            if (failedIdentifiers.length > 0) {
              successMsg += `\n\nAttention: ${failedIdentifiers.length} participant(s) n'ont pas été trouvés :\n- ` + [...new Set(failedIdentifiers)].slice(0, 10).join("\n- ") + (failedIdentifiers.length > 10 ? "\n..." : "");
            }
            alert(successMsg);
            window.location.reload(); 
          } else {
            alert("Aucune séance n'a été importée. Vérifiez vos identifiants (Email ou IUC) et le Zoom ID.");
          }

        } catch (err: any) {
           alert("Erreur lors de l'import : " + err.message);
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
            
            {activeCategory === SessionCategory.GROUP && (
              <button 
                onClick={downloadWebinarTemplate}
                className="slds-button slds-button-neutral !px-4 !py-2 flex items-center gap-2 text-slds-brand"
                title="Télécharger le modèle Excel pour les webinaires"
              >
                <FileText size={14} /> Modèle Webinaire
              </button>
            )}

            {activeCategory === SessionCategory.INDIVIDUAL && (
              <button
                onClick={async () => {
                  const btn = document.getElementById('btn-export-sebaa');
                  if (btn) { btn.setAttribute('disabled', 'true'); btn.textContent = 'Export en cours...'; }
                  try {
                    await exportSEBAAReport(sessions, clients);
                  } finally {
                    if (btn) { btn.removeAttribute('disabled'); btn.innerHTML = '<svg xmlns="http://www.w3.org/2000/svg" width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M16 4h2a2 2 0 0 1 2 2v14a2 2 0 0 1-2 2H6a2 2 0 0 1-2-2V6a2 2 0 0 1 2-2h2"></path><rect x="8" y="2" width="8" height="4" rx="1" ry="1"></rect></svg> Export SÉBAA'; }
                  }
                }}
                id="btn-export-sebaa"
                className="slds-button slds-button-neutral !px-4 !py-2 flex items-center gap-2 text-sky-600 border-sky-200 hover:bg-sky-50"
                title="Exporter les évaluations SÉBAA au format Excel IRCC VER 1335"
              >
                <ClipboardList size={14} /> Export SÉBAA
              </button>
            )}
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
              placeholder="Rechercher par séance, client ou email..."
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
            {facilitatorOptions.map(f => (
              <option key={f.id} value={f.id}>{f.name}</option>
            ))}
          </select>

          {activeCategory === SessionCategory.INDIVIDUAL && (
            <select 
              className="slds-input slds-input-compact w-auto shrink-0 max-w-[100px] text-[11px]"
              value={filterAttendance}
              onChange={(e) => setFilterAttendance(e.target.value as any)}
            >
              <option value="ALL">Statuts</option>
              {Object.values(AttendanceStatus).map(s => <option key={s} value={s}>{ATTENDANCE_STATUS_LABELS[s]}</option>)}
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
                              <p className="text-sm font-bold text-slds-brand leading-tight truncate flex items-center gap-2">
                                {client.firstName} {client.lastName}
                                {(() => {
                                  const stats = getAttendanceStats(client.id);
                                  if (!stats) return null;
                                  return (
                                    <span className={`px-1.5 py-0.5 rounded-full text-[9px] font-bold ${
                                      stats.rate >= 80 ? 'bg-emerald-50 text-emerald-600 border border-emerald-100' :
                                      stats.rate >= 50 ? 'bg-amber-50 text-amber-600 border border-amber-100' :
                                      'bg-red-50 text-red-600 border border-red-100'
                                    }`}>
                                      {stats.rate}% • {stats.total} {stats.total > 1 ? 'séances' : 'séance'}
                                    </span>
                                  );
                                })()}
                              </p>
                              <p className={`text-[10px] font-bold uppercase mt-0.5 truncate ${getTypeTextColor()}`}>
                                {SESSION_TYPE_LABELS[session.type]}
                              </p>
                              <p className="text-[10px] text-slds-text-secondary font-normal uppercase truncate">
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
                              <p className={`text-[10px] font-bold uppercase mt-0.5 truncate ${getTypeTextColor()}`}>
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
          <div className="slds-card w-full max-w-xl max-h-[90vh] shadow-2xl overflow-hidden animate-in zoom-in-95 duration-200 flex flex-col">
            <div className="p-4 border-b border-slds-border flex justify-between items-center bg-slds-bg shrink-0">
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
            
            <div className="p-6 space-y-6 overflow-y-auto flex-1 min-h-0">
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
                  <div className="flex items-end pb-1">
                    {viewingSession.category === SessionCategory.INDIVIDUAL && (
                      <button 
                        onClick={() => {
                          const client = clients.find(c => viewingSession.participantIds?.includes(c.id));
                          if (client) {
                            onSelectClient(client);
                            setViewingSession(null);
                          }
                        }}
                        className="slds-button slds-button-neutral !px-4 !py-2 text-[10px] flex items-center gap-2 border-slds-brand/30 text-slds-brand hover:bg-blue-50 w-full justify-center shadow-sm"
                      >
                        <User size={14} /> Voir le dossier du client
                      </button>
                    )}
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
                    <div className="p-3 bg-slds-bg border border-slds-border rounded">
                      <p className="text-[10px] font-bold text-slds-text-secondary uppercase flex items-center gap-2 mb-2">
                        <Target size={12} /> Besoins discutés
                      </p>
                      {viewingSession.discussedNeeds?.trim() ? (
                        <p className="text-xs text-slds-text-primary leading-relaxed font-medium">{viewingSession.discussedNeeds}</p>
                      ) : (
                        <p className="text-xs text-slds-text-secondary italic">Non renseigné</p>
                      )}
                    </div>
                    <div className="p-3 bg-blue-50 border border-blue-100 rounded">
                      <p className="text-[10px] font-bold text-slds-brand uppercase flex items-center gap-2 mb-2">
                        <Activity size={12} /> Actions planifiées
                      </p>
                      {viewingSession.actions?.trim() ? (
                        <p className="text-xs text-slds-text-primary leading-relaxed font-medium">{viewingSession.actions}</p>
                      ) : (
                        <p className="text-xs text-slds-text-secondary italic">Non renseigné</p>
                      )}
                    </div>
                 </div>
               )}

               <div className="p-4 bg-slds-bg rounded border border-slds-border">
                  <p className="text-[10px] font-bold text-slds-text-secondary uppercase mb-3">Informations Complémentaires</p>
                  <div className="space-y-3">
                    {(() => {
                      const link = viewingSession.zoomLink || (viewingSession as any).zoom_link;
                      const id = viewingSession.zoomId || (viewingSession as any).zoom_id;
                      
                      if (link) {
                        return (
                          <>
                            <div className="flex items-center gap-3">
                              <Video size={16} className="text-slds-brand shrink-0" />
                              <a href={link} target="_blank" className="text-xs font-bold text-slds-brand underline truncate">Lien de la rencontre</a>
                            </div>
                            {viewingSession.location && viewingSession.location.toLowerCase() !== 'virtuel' && (
                              <div className="flex items-center gap-3">
                                <MapPin size={16} className="text-slds-text-secondary shrink-0" />
                                <span className="text-[10px] font-bold text-slds-text-secondary">{viewingSession.location}</span>
                              </div>
                            )}
                          </>
                        );
                      }
                      
                      return (
                        <div className="flex items-center gap-3">
                          <MapPin size={16} className="text-slds-text-secondary shrink-0" />
                          <span className="text-xs font-bold text-slds-text-primary">{viewingSession.location || 'Lieu non spécifié'}</span>
                        </div>
                      );
                    })()}

                    {(viewingSession.zoomId || (viewingSession as any).zoom_id) && (
                      <div className="flex items-center gap-3">
                        <div className="w-4 h-4 rounded-sm bg-slds-brand flex items-center justify-center shrink-0">
                           <span className="text-[7px] font-black text-white px-0.5">ID</span>
                        </div>
                        <span className="text-xs font-bold text-slds-text-primary font-mono tracking-wider">{viewingSession.zoomId || (viewingSession as any).zoom_id}</span>
                      </div>
                    )}

                    <div className="flex items-center gap-3">
                      <Languages size={16} className="text-slds-success shrink-0" />
                      <span className="text-xs font-bold text-slds-text-primary">{viewingSession.needsInterpretation ? 'Interprétation requise' : 'Français uniquement'}</span>
                    </div>
                  </div>
               </div>

               <div className="space-y-1 pt-2 border-t border-slds-border">
                 <p className="text-[10px] font-bold text-slds-text-secondary uppercase">Notes générales</p>
                 {viewingSession.notes?.trim() ? (
                   <p className="text-xs font-medium text-slds-text-secondary leading-relaxed italic">"{viewingSession.notes}"</p>
                 ) : (
                   <p className="text-xs text-slds-text-secondary italic">Aucune note</p>
                 )}
               </div>
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
        sessions={sessions}
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

export default SessionList;
