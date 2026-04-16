
import React, { useState, useMemo } from 'react';
import { Client, ReferralStatus, Partner, UserRole, Session, SessionType } from '../types';
import { STATUS_COLORS } from '../constants';
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
  Share2
} from 'lucide-react';

interface ReferralManagementProps {
  clients: Client[];
  partners: Partner[];
  sessions: Session[];
  activeRole: UserRole;
  currentPartnerId?: string;
  currentUserId?: string;
}

const ReferralManagement: React.FC<ReferralManagementProps> = ({ clients, partners, sessions, activeRole, currentPartnerId, currentUserId }) => {
  const [searchTerm, setSearchTerm] = useState('');
  const [filterPartner, setFilterPartner] = useState('ALL');
  const [filterAdvisor, setFilterAdvisor] = useState('ALL');
  const [filterPriority, setFilterPriority] = useState('ALL');
  const [filterStatus, setFilterStatus] = useState('ALL');

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

  // Extract unique advisors from sessions
  const advisors = useMemo(() => {
    const unique = new Set<string>();
    sessions.forEach(s => { if (s.advisorName) unique.add(s.advisorName); });
    return Array.from(unique).sort();
  }, [sessions]);

  const referredClients = useMemo(() => {
    return clients
      .filter(client => {
        // Filtrage spécifique pour les mentors
        if (activeRole === UserRole.MENTOR) {
          return client.assignedMentorId === currentUserId;
        }

        const isAssignedPrimary = !!client.assignedPartnerId;
        const isAssignedSecondary = client.secondaryPartnerIds && client.secondaryPartnerIds.length > 0;
        
        const hasRelevantSession = sessions.some(s => 
          s.participantIds?.includes(client.id) && 
          (s.type === SessionType.ESTABLISHMENT || s.type === SessionType.EMPLOYMENT)
        );

        if (activeRole === UserRole.PARTNER) {
          // Visible si partenaire principal OU partenaire secondaire
          return client.assignedPartnerId === currentPartnerId || client.secondaryPartnerIds?.includes(currentPartnerId || '');
        }
        
        return isAssignedPrimary || isAssignedSecondary || hasRelevantSession;
      })
      .map(client => {
        const partner = partners.find(p => p.id === client.assignedPartnerId);
        // Find the advisor from the latest session for this client
        const clientSessions = sessions.filter(s => s.participantIds?.includes(client.id));
        const lastAdvisor = clientSessions.length > 0 ? clientSessions[0].advisorName : "N/A";
        
        let priority = getPriorityCategory(client.arrivalDate);
        // Si le client est déjà référé (a un partenaire assigné), on change la priorité
        if (client.assignedPartnerId) {
          priority = "REFERRED";
        }
        
        // Déterminer le type de mandat pour le partenaire connecté
        const isSecondaryMandate = activeRole === UserRole.PARTNER && 
                                   client.secondaryPartnerIds?.includes(currentPartnerId || '') && 
                                   client.assignedPartnerId !== currentPartnerId;

        return {
          ...client,
          partnerName: partner?.name || (client.assignedPartnerId ? 'Organisme inconnu' : 'En attente de référencement'),
          partnerCity: partner?.city || '',
          advisorName: lastAdvisor,
          priority: priority,
          isSecondaryMandate
        };
      });
  }, [clients, partners, activeRole, currentPartnerId, currentUserId, sessions]);

  const filteredData = useMemo(() => {
    return referredClients.filter(item => {
      const fullName = (item.firstName + ' ' + item.lastName).toLowerCase();
      const matchSearch = fullName.includes(searchTerm.toLowerCase()) || 
                          item.email.toLowerCase().includes(searchTerm.toLowerCase());
      
      const matchPartner = filterPartner === 'ALL' || 
                           (filterPartner === 'NONE' && !item.assignedPartnerId) ||
                           item.assignedPartnerId === filterPartner;

      const matchAdvisor = filterAdvisor === 'ALL' || item.advisorName === filterAdvisor;
      const matchPriority = filterPriority === 'ALL' || item.priority === filterPriority;
      const matchStatus = filterStatus === 'ALL' || item.status === filterStatus;
                           
      return matchSearch && matchPartner && matchAdvisor && matchPriority && matchStatus;
    });
  }, [referredClients, searchTerm, filterPartner, filterAdvisor, filterPriority, filterStatus]);

  const stats = useMemo(() => ({
    total: referredClients.length,
    unassigned: referredClients.filter(r => !r.assignedPartnerId).length,
    submitted: referredClients.filter(r => r.status === ReferralStatus.REFERRED).length,
    accepted: referredClients.filter(r => r.status === ReferralStatus.ACKNOWLEDGED).length,
  }), [referredClients]);

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
              {filteredData.map((item) => {
                const priorityUI = getPriorityUI(item.priority);
                const isWaiting = !item.assignedPartnerId;
                
                return (
                  <tr key={item.id} className="hover:bg-slds-bg transition-colors group cursor-pointer">
                    <td>
                      <div className="flex items-center gap-3">
                        <div className="w-8 h-8 rounded bg-slds-bg text-slds-text-secondary flex items-center justify-center text-[10px] font-bold border border-slds-border">
                          {item.firstName[0]}{item.lastName[0]}
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
              {filteredData.length === 0 && (
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
      </div>
    </div>
  );
};

export default ReferralManagement;
