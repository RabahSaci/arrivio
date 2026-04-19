import React, { useState, useMemo, useEffect } from 'react';
import { Client, ReferralStatus, Partner, UserRole, Session, SessionType, SessionCategory, AttendanceStatus } from '../types';
import { STATUS_COLORS } from '../constants';
import Pagination from '../components/Pagination';
import * as XLSX from 'xlsx';
import { apiService } from '../services/apiService';
import { 
  Search, 
  Building2, 
  ChevronRight,
  FileSearch,
  Clock,
  AlertTriangle,
  CalendarCheck,
  CheckCircle2,
  AlertCircle,
  Calendar,
  Filter,
  User,
  Share2,
  Loader2,
  Database
} from 'lucide-react';

interface ReferralManagementProps {
  partners: Partner[];
  activeRole: UserRole;
  currentPartnerId?: string;
  currentUserId?: string;
  clients: Client[];
  sessions: Session[];
  onSelectClient: (client: Client) => void;
}

const ReferralManagement: React.FC<ReferralManagementProps> = ({ 
  partners, 
  activeRole, 
  currentPartnerId, 
  currentUserId,
  clients,
  sessions,
  onSelectClient
}) => {
  const [searchTerm, setSearchTerm] = useState('');
  const [filterPartner, setFilterPartner] = useState('ALL');
  const [filterAdvisor, setFilterAdvisor] = useState('ALL');
  const [filterPriority, setFilterPriority] = useState('ALL');
  const [filterStatus, setFilterStatus] = useState('ALL');
  const [currentPage, setCurrentPage] = useState(1);
  const [isLoading, setIsLoading] = useState(false);
  const [profiles, setProfiles] = useState<any[]>([]);
  const fileInputRef = React.useRef<HTMLInputElement>(null);
  const itemsPerPage = 15;

  // Fetch profiles for advisor mapping
  useEffect(() => {
    if (activeRole === UserRole.ADMIN || activeRole === UserRole.MANAGER) {
      apiService.fetchTable('profiles').then(setProfiles).catch(console.error);
    }
  }, [activeRole]);

  const handleImportReferrals = async (e: React.ChangeEvent<HTMLInputElement>) => {
    if (!e.target.files || e.target.files.length === 0) return;
    
    setIsLoading(true);
    const file = e.target.files[0];
    const reader = new FileReader();

    reader.onload = async (evt) => {
      try {
        const bstr = evt.target?.result;
        const wb = XLSX.read(bstr, { type: 'binary' });
        const ws = wb.Sheets[wb.SheetNames[0]];
        const data = XLSX.utils.sheet_to_json(ws) as any[];

        const updatesMap = new Map<string, any>();
        let skipped = 0;
        let errors: string[] = [];

        data.forEach((row, index) => {
          try {
            // 1. Identify Client by Email
            const emailKey = Object.keys(row).find(k => k.toLowerCase().includes('email') || k.toLowerCase().includes('courriel'));
            const email = row[emailKey || '']?.toString().trim().toLowerCase();
            
            if (!email) {
              skipped++;
              return;
            }

            const client = clients.find(c => c.email?.toLowerCase() === email);
            if (!client) {
              skipped++;
              return;
            }

            // 2. Identify Partner by Name
            const partnerKey = Object.keys(row).find(k => k.toLowerCase().includes('organisme') || k.toLowerCase().includes('partenaire'));
            const partnerName = row[partnerKey || '']?.toString().trim().toLowerCase();
            const partner = partners.find(p => p.name.toLowerCase() === partnerName);
            
            if (!partner) {
              errors.push(`Ligne ${index + 2}: Organisme "${partnerName}" non trouvé.`);
              return;
            }

            // 3. Identify Advisor (referred_by_id)
            const advisorKey = Object.keys(row).find(k => k.toLowerCase().includes('conseiller') || k.toLowerCase().includes('référent') || k.toLowerCase().includes('referent'));
            const advisorEmail = row[advisorKey || '']?.toString().trim().toLowerCase();
            
            let referredById = null;
            if (advisorEmail) {
              const profile = profiles.find(p => p.email?.toLowerCase() === advisorEmail);
              referredById = profile?.id || null;
            }
            
            // Default to current user if not found/provided
            if (!referredById) {
              referredById = currentUserId;
            }

            // 4. Status and Date
            const statusKey = Object.keys(row).find(k => k.toLowerCase().includes('statut') || k.toLowerCase().includes('status'));
            const excelStatus = row[statusKey || '']?.toString().trim().toUpperCase();
            const finalStatus = excelStatus && Object.values(ReferralStatus).includes(excelStatus as any) 
              ? excelStatus 
              : ReferralStatus.REFERRED;

            const dateKey = Object.keys(row).find(k => k.toLowerCase().includes('date') || k.toLowerCase().includes('transfert'));
            let referralDate = new Date().toISOString();
            
            if (row[dateKey || '']) {
              const parsedDate = new Date(row[dateKey || '']);
              if (!isNaN(parsedDate.getTime())) {
                referralDate = parsedDate.toISOString();
              }
            }

            // DEDUPLICATION: Use Map to ensure one entry per client ID
            updatesMap.set(client.id, {
              id: client.id,
              first_name: client.firstName,
              last_name: client.lastName,
              email: client.email,
              assigned_partner_id: partner.id,
              referred_by_id: referredById,
              referral_date: referralDate,
              status: finalStatus
            });
          } catch (rowErr) {
            console.error(`Error at row ${index}:`, rowErr);
            errors.push(`Ligne ${index + 2}: Erreur de données.`);
          }
        });

        const updates = Array.from(updatesMap.values());

        if (updates.length > 0) {
          await apiService.bulkUpdateClients(updates);
          let msg = `${updates.length} référencements mis à jour.`;
          if (skipped > 0) msg += `\n${skipped} emails non trouvés (ignorés).`;
          if (errors.length > 0) msg += `\n\nAlertes :\n${errors.slice(0, 5).join('\n')}${errors.length > 5 ? '\n...' : ''}`;
          
          alert(msg);
          window.location.reload(); 
        } else {
          alert(`Aucune mise à jour effectuée.\n${skipped} emails ignorés.\n${errors.join('\n')}`);
        }
      } catch (err: any) {
        console.error("Import Global Error:", err);
        alert("Erreur lors de la lecture du fichier : " + (err.message || "Format invalide"));
      } finally {
        setIsLoading(false);
        if (fileInputRef.current) fileInputRef.current.value = '';
      }
    };
    reader.readAsBinaryString(file);
  };

  // Helper function for priority logic (shared for filtering and display)
  const getPriorityCategory = (arrivalDateStr: string) => {
    const now = new Date();
    const arrival = new Date(arrivalDateStr);
    const diffInMs = arrival.getTime() - now.getTime();
    const diffInDays = diffInMs / (1000 * 60 * 60 * 24);

    if (diffInDays > 15) return "NOT_YET";
    if (diffInDays >= 10 && diffInDays <= 15) return "TO_REFER";
    return "URGENT";
  };

  // Helper for priority sorting
  const getPriorityValue = (category: string) => {
    switch(category) {
      case "URGENT": return 0;
      case "TO_REFER": return 1;
      case "NOT_YET": return 2;
      case "REFERRED": return 3;
      default: return 4;
    }
  };

  // Extract unique advisors from sessions
  const advisors = useMemo(() => {
    const unique = new Set<string>();
    sessions.forEach(s => { if (s.advisorName) unique.add(s.advisorName); });
    return Array.from(unique).sort();
  }, [sessions]);

  // OPTIMIZATION: Index sessions by client ID once to avoid repeated full list scans
  const sessionsByClient = useMemo(() => {
    const map = new Map<string, Session[]>();
    sessions.forEach(s => {
      s.participantIds?.forEach(id => {
        if (!map.has(id)) map.set(id, []);
        map.get(id)!.push(s);
      });
    });
    return map;
  }, [sessions]);

  const filteredClients = useMemo(() => {
    return clients.filter(client => {
      // 1. Filtrage métier (uniquement les référencements)
      if (client.status === 'FERME' || !client.status) return false;
      
      // La règle originale: on affiche ceux qui ont arrivalDateApprox OU assignedPartnerId (ou arrivalDate)
      if (!client.arrivalDateApprox && !client.assignedPartnerId && !client.arrivalDate) return false;

      // NOUVELLE CONDITION STRICTE: Doit avoir eu une séance "Établissement"
      const clientSessions = sessionsByClient.get(client.id) || [];
      const hasEstablishmentSession = clientSessions.some(s => 
        s.type === SessionType.ESTABLISHMENT && 
        (s.category === SessionCategory.INDIVIDUAL 
          ? s.individualStatus === AttendanceStatus.PRESENT 
          : s.participantIds?.includes(client.id)) &&
        new Date(s.date) >= new Date('2025-04-01')
      );
      if (!hasEstablishmentSession) return false;

      // 2. Filtrage partenaire (si compte partenaire, on ne voit que ses affiliés)
      if (activeRole === UserRole.PARTNER) {
        if (client.assignedPartnerId !== currentPartnerId) return false;
      }

      // 3. Filtrage par recherche
      if (searchTerm) {
        const query = searchTerm.toLowerCase();
        const firstName = client.firstName?.toLowerCase() || '';
        const lastName = client.lastName?.toLowerCase() || '';
        const fullName = `${firstName} ${lastName}`;
        const reversedFullName = `${lastName} ${firstName}`;
        const email = client.email?.toLowerCase() || '';

        if (!(
          firstName.includes(query) ||
          lastName.includes(query) ||
          fullName.includes(query) ||
          reversedFullName.includes(query) ||
          email.includes(query) ||
          client.clientCode?.toLowerCase().includes(query)
        )) return false;
      }

      // 4. Filtrage précis par Partenaire Assigné
      if (filterPartner !== 'ALL') {
        if (filterPartner === 'UNASSIGNED') {
          if (client.assignedPartnerId) return false;
        } else {
          if (client.assignedPartnerId !== filterPartner) return false;
        }
      }

      // 5. Filtrage par Statut
      if (filterStatus !== 'ALL') {
        if (client.status !== filterStatus) return false;
      }

      return true;
    }).map(client => {
      const partner = partners.find(p => p.id === client.assignedPartnerId);
      const clientSessions = sessionsByClient.get(client.id) || [];
      
      // Filtrer uniquement par établissement et trier par date chronologique
      const establishmentSessions = clientSessions
        .filter(s => s.type === SessionType.ESTABLISHMENT)
        .sort((a, b) => new Date(a.date).getTime() - new Date(b.date).getTime());

      const firstEstablishmentAdvisor = establishmentSessions.length > 0 
        ? establishmentSessions[0].advisorName 
        : "N/A";
      
      // Recalcule la priorité
      let priority = getPriorityCategory(client.arrivalDateApprox || '');
      
      // Un client n'est considéré comme "RÉFÉRÉ" (vert) que s'il a un partenaire assigné ET un statut de dossier différent de EN_ATTENTE
      if (client.assignedPartnerId && client.status !== ReferralStatus.PENDING) {
        priority = "REFERRED";
      }

      return {
        ...client,
        partnerName: partner?.name || (client.assignedPartnerId ? 'Organisme inconnu' : 'En attente de référencement'),
        partnerCity: partner?.city || '',
        advisorName: firstEstablishmentAdvisor,
        priority: priority
      };
    }).filter(client => {
      // 6. Filtrage par Intervenant
      if (filterAdvisor !== 'ALL' && client.advisorName !== filterAdvisor) return false;

      // 7. Filtrage par Priorité
      if (filterPriority !== 'ALL' && client.priority !== filterPriority) return false;

      return true;
    }).sort((a, b) => {
      // Tri par urgence puis date d'arrivée
      const pA = getPriorityValue(a.priority);
      const pB = getPriorityValue(b.priority);
      if (pA !== pB) return pA - pB;
      
      const dateA = new Date(a.arrivalDateApprox || '').getTime();
      const dateB = new Date(b.arrivalDateApprox || '').getTime();
      return dateA - dateB;
    });
  }, [clients, activeRole, currentPartnerId, searchTerm, filterPartner, filterStatus, filterAdvisor, filterPriority, partners, sessionsByClient]);

  const totalItems = filteredClients.length;
  const totalPages = Math.ceil(totalItems / itemsPerPage);

  const paginatedItems = useMemo(() => {
    const startIndex = (currentPage - 1) * itemsPerPage;
    return filteredClients.slice(startIndex, startIndex + itemsPerPage);
  }, [filteredClients, currentPage]);

  const stats = useMemo(() => ({
    total: totalItems,
    unassigned: filteredClients.filter(r => !r.assignedPartnerId).length,
    submitted: filteredClients.filter(r => r.status === ReferralStatus.REFERRED).length,
    accepted: paginatedItems.filter(r => r.status === ReferralStatus.ACKNOWLEDGED).length,
  }), [paginatedItems, totalItems]);

  const getPriorityUI = (category: string) => {
    switch(category) {
      case "REFERRED":
        return { 
          text: "Déjà Référé", 
          color: "bg-emerald-50 text-emerald-600 border-emerald-200",
          icon: <CheckCircle2 size={12} />
        };
      case "NOT_YET":
        return { 
          text: "Pas encore", 
          color: "bg-slate-50 text-slate-400 border-slate-100",
          icon: <Clock size={12} />
        };
      case "TO_REFER":
        return { 
          text: "À référer", 
          color: "bg-amber-50 text-amber-600 border-amber-200 shadow-sm",
          icon: <CalendarCheck size={12} />
        };
      case "URGENT":
      default:
        return { 
          text: "Référencement urgent", 
          color: "bg-red-50 text-red-600 border-red-200 animate-pulse shadow-sm",
          icon: <AlertTriangle size={12} />
        };
    }
  };

  const isAdvisor = activeRole === UserRole.ADVISOR || activeRole === UserRole.ADMIN || activeRole === UserRole.MANAGER;

  return (
    <div className="space-y-6">
      {/* Metrics Section SLDS */}
      <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
        <div className="slds-card p-4">
          <p className="text-[10px] font-bold text-slds-text-secondary uppercase tracking-widest mb-1">Dossiers Cibles</p>
          <p className="text-2xl font-bold text-slds-text-primary">{stats.total}</p>
        </div>
        <div className="slds-card p-4 border-l-4 border-l-amber-400">
          <p className="text-[10px] font-bold text-amber-600 uppercase tracking-widest mb-1">À Référencer</p>
          <p className="text-2xl font-bold text-slds-text-primary">{stats.unassigned}</p>
        </div>
        <div className="slds-card p-4 border-l-4 border-l-slds-brand">
          <p className="text-[10px] font-bold text-slds-brand uppercase tracking-widest mb-1">Transférés</p>
          <p className="text-2xl font-bold text-slds-text-primary">{stats.submitted}</p>
        </div>
        <div className="slds-card p-4 border-l-4 border-l-slds-success">
          <p className="text-[10px] font-bold text-slds-success uppercase tracking-widest mb-1">Acceptés</p>
          <p className="text-2xl font-bold text-slds-text-primary">{stats.accepted}</p>
        </div>
      </div>

      {/* Filters Bar SLDS */}
      <div className="slds-card p-4 space-y-4">
        <div className="flex flex-wrap gap-4 items-center">
          <div className="relative flex-1 min-w-[200px]">
            <Search size={14} className="absolute left-3 top-1/2 -translate-y-1/2 text-slds-text-secondary" />
            <input 
              type="text" 
              placeholder="Rechercher un client ou email..." 
              className="slds-input pl-10"
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
            />
          </div>
          
          {isAdvisor && (
            <>
              <input 
                type="file" 
                ref={fileInputRef} 
                className="hidden" 
                accept=".xlsx, .xls, .csv"
                onChange={handleImportReferrals} 
              />
              <button 
                onClick={() => fileInputRef.current?.click()}
                disabled={isLoading}
                className="slds-button slds-button_neutral flex items-center gap-2"
              >
                <Share2 size={14} className="text-slds-brand" />
                Télécharger en lots
              </button>
            </>
          )}

          <div className="flex items-center gap-2">
            <Filter size={14} className="text-slds-text-secondary" />
            <span className="text-[10px] font-bold text-slds-text-secondary uppercase tracking-widest">Filtres :</span>
          </div>
          {isAdvisor && (
            <select 
              className="slds-input w-auto min-w-[150px]"
              value={filterPartner}
              onChange={(e) => setFilterPartner(e.target.value)}
            >
              <option value="ALL">Tous les organismes</option>
              <option value="NONE">⚠️ Non référés</option>
              {partners.map(p => <option key={p.id} value={p.id}>{p.name}</option>)}
            </select>
          )}

          {isAdvisor && (
            <select 
              className="slds-input w-auto min-w-[150px]"
              value={filterAdvisor}
              onChange={(e) => setFilterAdvisor(e.target.value)}
            >
              <option value="ALL">Tous les conseillers</option>
              {advisors.map(name => <option key={name} value={name}>{name}</option>)}
            </select>
          )}

          <select 
            className="slds-input w-auto"
            value={filterPriority}
            onChange={(e) => setFilterPriority(e.target.value)}
          >
            <option value="ALL">Toutes priorités</option>
            <option value="URGENT">Urgent 🔴</option>
            <option value="TO_REFER">À référer 🟠</option>
            <option value="NOT_YET">Pas encore ⚪</option>
            <option value="REFERRED">Déjà Référé 🟢</option>
          </select>

          <select 
            className="slds-input w-auto"
            value={filterStatus}
            onChange={(e) => setFilterStatus(e.target.value)}
          >
            <option value="ALL">Tous les statuts</option>
            {Object.values(ReferralStatus).map(st => (
              <option key={st} value={st}>{st.replace(/_/g, ' ')}</option>
            ))}
          </select>
        </div>
      </div>

      {/* Data Table SLDS */}
      <div className="slds-card overflow-hidden">
        {isLoading ? (
          <div className="flex flex-col items-center justify-center py-20 text-slate-400">
            <Loader2 className="w-10 h-10 animate-spin mb-4 text-slds-brand" />
            <p className="text-sm font-medium">Chargement des référencements...</p>
          </div>
        ) : paginatedItems.length > 0 ? (
          <div className="overflow-x-auto">
          <table className="slds-table">
            <thead>
              <tr>
                <th>Client</th>
                <th>Date d'Arrivée</th>
                <th>Organisme Partenaire</th>
                <th>Date Transfert</th>
                <th>Statut Dossier</th>
                <th className="text-center">Priorité Référencement</th>
                <th></th>
              </tr>
            </thead>
            <tbody>
              {paginatedItems.map((item) => {
                const priorityUI = getPriorityUI(item.priority);
                const isWaiting = !item.assignedPartnerId;
                
                return (
                  <tr 
                    key={item.id} 
                    className="hover:bg-slds-bg transition-colors group cursor-pointer"
                    onClick={() => onSelectClient(item)}
                  >
                    <td>
                      <div className="flex items-center gap-3">
                        <div className="w-8 h-8 rounded bg-slds-bg text-slds-text-secondary flex items-center justify-center font-bold text-[10px] group-hover:bg-slds-brand group-hover:text-white transition-colors">
                          {item.firstName?.[0] || '?'}{item.lastName?.[0] || '?'}
                        </div>
                        <div>
                          <p className="text-xs font-bold text-slds-brand">{item.firstName} {item.lastName}</p>
                          <div className="flex items-center gap-1.5 mt-0.5">
                            <span className="text-[10px] text-slds-text-secondary font-normal">{item.email}</span>
                            {isAdvisor && (
                              <span className="flex items-center gap-1 px-1.5 py-0.5 bg-slds-bg border border-slds-border rounded text-[8px] font-bold text-slds-text-secondary uppercase">
                                <User size={8}/> {item.advisorName}
                              </span>
                            )}
                          </div>
                        </div>
                      </div>
                    </td>
                    <td>
                      <div className="flex items-center gap-2 text-xs font-bold text-slds-text-primary">
                        <Calendar size={14} className="text-slds-brand" />
                        {new Date(item.arrivalDate).toLocaleDateString('fr-FR')}
                      </div>
                    </td>
                    <td>
                      <div className="flex flex-col">
                        <span className={`text-xs font-bold flex items-center gap-1 ${isWaiting ? 'text-amber-600' : 'text-slds-text-primary'}`}>
                           {isWaiting ? <AlertCircle size={12} /> : <Building2 size={12} className="text-slds-brand" />}
                           {item.partnerName}
                        </span>
                        <span className="text-[10px] text-slds-text-secondary uppercase">{item.partnerCity}</span>
                      </div>
                    </td>
                    <td>
                      <span className="text-xs font-bold text-slds-text-primary">
                        {item.referralDate ? new Date(item.referralDate).toLocaleDateString() : '—'}
                      </span>
                    </td>
                    <td>
                      <div className="flex flex-col gap-1">
                        <span className={`inline-flex items-center gap-1.5 px-2 py-0.5 rounded text-[10px] font-bold uppercase border w-fit ${STATUS_COLORS[item.status]}`}>
                          {item.status.replace(/_/g, ' ')}
                        </span>
                        {item.isSecondaryMandate && (
                          <span className="text-[9px] font-bold text-purple-600 uppercase tracking-widest flex items-center gap-1">
                            <Share2 size={10} /> Mandat Secondaire
                          </span>
                        )}
                      </div>
                    </td>
                    <td className="text-center">
                      <div className={`inline-flex items-center gap-2 px-2 py-1 rounded text-[9px] font-bold uppercase tracking-widest border transition-all ${priorityUI.color}`}>
                        {priorityUI.icon}
                        {priorityUI.text}
                      </div>
                    </td>
                    <td className="text-right">
                      <ChevronRight size={16} className="text-slds-text-secondary opacity-0 group-hover:opacity-100 transition-opacity" />
                    </td>
                  </tr>
                );
              })}
              {paginatedItems.length === 0 && (
                <tr>
                  <td colSpan={7} className="py-12 text-center">
                    <FileSearch size={48} className="mx-auto text-slds-border mb-3" />
                    <p className="text-slds-text-secondary text-xs font-bold">Aucun dossier ne correspond à vos filtres.</p>
                  </td>
                </tr>
              )}
            </tbody>
          </table>
        </div>
        ) : (
          <div className="py-20 text-center bg-white rounded border border-dashed border-slds-border">
            <Database size={48} className="mx-auto text-slds-border mb-3" />
            <p className="text-xs font-bold text-slds-text-secondary uppercase tracking-widest">Aucun référencement trouvé</p>
          </div>
        )}

        {/* Pagination UI */}
        <Pagination 
          currentPage={currentPage}
          totalPages={totalPages}
          onPageChange={setCurrentPage}
          totalItems={totalItems}
          itemsPerPage={itemsPerPage}
          label="référencements"
        />
      </div>
    </div>
  );
};

export default ReferralManagement;
