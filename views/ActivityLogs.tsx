import React, { useMemo, useState, useEffect } from 'react';
import { UserActivityLog, UserRole, Client } from '../types';
import Pagination from '../components/Pagination';
import { apiService } from '../services/apiService';
import { 
  History, 
  Shield, 
  User, 
  Clock, 
  Search, 
  Filter, 
  X, 
  PlusCircle, 
  RefreshCcw, 
  Trash2, 
  LogIn, 
  Users, 
  Calendar, 
  Award, 
  FileText, 
  ShieldCheck, 
  Building2,
  Download,
  TrendingUp,
  Activity,
  AlertTriangle,
  CalendarRange,
  ChevronDown,
  ChevronUp,
  Loader2
} from 'lucide-react';

interface ActivityLogsProps {
  logs: UserActivityLog[];
  clients: Client[];
  activeRole: UserRole;
  currentUserId: string;
}

const ActivityLogs: React.FC<ActivityLogsProps> = ({ logs, clients, activeRole, currentUserId }) => {
  const isAdmin = activeRole === UserRole.ADMIN;

  const [filterUser, setFilterUser] = useState<string>('ALL');
  const [filterAction, setFilterAction] = useState<string>('ALL');
  const [filterEntity, setFilterEntity] = useState<string>('ALL');
  const [searchTerm, setSearchTerm] = useState('');
  const [dateFrom, setDateFrom] = useState('');
  const [dateTo, setDateTo] = useState('');
  const [currentPage, setCurrentPage] = useState(1);
  const itemsPerPage = 20;

  // Extraction des valeurs de filtres uniques depuis les props
  const uniqueUsers = useMemo(() => {
    const users = new Map();
    logs.forEach(log => {
      if (log.userId) users.set(log.userId, log.userName);
    });
    return Array.from(users.entries()).map(([id, name]) => ({ id, name }));
  }, [logs]);

  const uniqueEntities = useMemo(() => {
    return Array.from(new Set(logs.map(log => log.entityType))).filter(Boolean).sort();
  }, [logs]);

  // Recherche de client dans les détails du log
  const getClientFromLog = (log: UserActivityLog): Client | null => {
    const detailsLower = log.details?.toLowerCase() || '';
    if (!detailsLower) return null;

    for (const client of clients) {
      const fullName = `${client.firstName} ${client.lastName}`.toLowerCase();
      if (fullName.length > 3 && detailsLower.includes(fullName)) {
        return client;
      }
    }
    return null;
  };

  const filteredLogs = useMemo(() => {
    return logs.filter(log => {
      // Sécurité : les conseillers ne voient que leurs propres activités
      if (!isAdmin && log.userId !== currentUserId) return false;

      if (filterUser !== 'ALL' && log.userId !== filterUser) return false;
      if (filterAction !== 'ALL' && log.actionType !== filterAction) return false;
      if (filterEntity !== 'ALL' && log.entityType !== filterEntity) return false;
      
      if (searchTerm) {
        const query = searchTerm.toLowerCase();
        if (!(
          log.userName?.toLowerCase().includes(query) ||
          log.details?.toLowerCase().includes(query) ||
          log.actionType?.toLowerCase().includes(query) ||
          log.entityType?.toLowerCase().includes(query)
        )) return false;
      }

      const logDate = log.timestamp.split('T')[0];
      if (dateFrom && logDate < dateFrom) return false;
      if (dateTo && logDate > dateTo) return false;

      return true;
    }).sort((a, b) => new Date(b.timestamp).getTime() - new Date(a.timestamp).getTime());
  }, [logs, filterUser, filterAction, filterEntity, searchTerm, dateFrom, dateTo]);

  const totalItems = filteredLogs.length;
  const totalPages = Math.ceil(totalItems / itemsPerPage);

  const paginatedLogs = useMemo(() => {
    const startIndex = (currentPage - 1) * itemsPerPage;
    return filteredLogs.slice(startIndex, startIndex + itemsPerPage);
  }, [filteredLogs, currentPage, itemsPerPage]);

  const [expandedId, setExpandedId] = useState<string | null>(null);

  const stats = useMemo(() => {
    const actionCounts: Record<string, number> = {};
    const userCounts: Record<string, { name: string; count: number }> = {};
    const entityCounts: Record<string, number> = {};
    const today = new Date().toDateString();
    let todayCount = 0;

    filteredLogs.slice(0, 100).forEach(log => {
      actionCounts[log.actionType] = (actionCounts[log.actionType] || 0) + 1;
      if (!userCounts[log.userId]) userCounts[log.userId] = { name: log.userName, count: 0 };
      userCounts[log.userId].count++;
      entityCounts[log.entityType] = (entityCounts[log.entityType] || 0) + 1;
      if (new Date(log.timestamp).toDateString() === today) todayCount++;
    });

    const topUser = Object.values(userCounts).sort((a, b) => b.count - a.count)[0];
    const topEntity = Object.entries(entityCounts).sort(([,a], [,b]) => b - a)[0];

    return { actionCounts, todayCount, topUser, topEntity };
  }, [filteredLogs]);

  const handleExportCSV = () => {
    const headers = ['Date', 'Heure', 'Utilisateur', 'Action', 'Module', 'Client', 'Détails'];
    const rows = filteredLogs.map(log => {
      const client = getClientFromLog(log);
      return [
        new Date(log.timestamp).toLocaleDateString('fr-FR'),
        new Date(log.timestamp).toLocaleTimeString('fr-FR'),
        log.userName,
        log.actionType,
        log.entityType,
        client ? `${client.firstName} ${client.lastName}` : '',
        `"${(log.details || '').replace(/"/g, '""')}"`
      ];
    });

    const csvContent = [headers, ...rows].map(r => r.join(';')).join('\n');
    const blob = new Blob(['\uFEFF' + csvContent], { type: 'text/csv;charset=utf-8;' });
    const url = URL.createObjectURL(blob);
    const link = document.createElement('a');
    link.href = url;
    link.download = `audit_arrivio_${new Date().toISOString().slice(0, 10)}.csv`;
    link.click();
    URL.revokeObjectURL(url);
  };

  const getActionUI = (type: string) => {
    switch (type) {
      case 'CREATE': return { color: 'bg-emerald-50 text-emerald-600 border-emerald-100', bar: 'bg-emerald-500', icon: <PlusCircle size={12} />, label: 'Création' };
      case 'UPDATE': return { color: 'bg-blue-50 text-blue-600 border-blue-100', bar: 'bg-blue-500', icon: <RefreshCcw size={12} />, label: 'Modification' };
      case 'DELETE': return { color: 'bg-red-50 text-red-600 border-red-100', bar: 'bg-red-500', icon: <Trash2 size={12} />, label: 'Suppression' };
      case 'LOGIN': return { color: 'bg-purple-50 text-purple-600 border-purple-100', bar: 'bg-purple-500', icon: <LogIn size={12} />, label: 'Connexion' };
      case 'SECURITY_ALERT': return { color: 'bg-red-600 text-white border-red-700', bar: 'bg-red-600', icon: <AlertTriangle size={12} />, label: 'ALERTE SÉCURITÉ' };
      default: return { color: 'bg-slate-50 text-slate-600 border-slate-100', bar: 'bg-slate-400', icon: <History size={12} />, label: type };
    }
  };

  const getEntityIcon = (type: string) => {
    switch (type) {
      case 'CLIENT': return <Users size={15} className="text-blue-500" />;
      case 'SESSION': return <Calendar size={15} className="text-emerald-500" />;
      case 'MENTOR': return <Award size={15} className="text-amber-500" />;
      case 'CONTRACT': return <FileText size={15} className="text-indigo-500" />;
      case 'PARTNER': return <Building2 size={15} className="text-purple-500" />;
      case 'PROFILE': return <Shield size={15} className="text-rose-500" />;
      default: return <Activity size={15} className="text-slate-500" />;
    }
  };

  const renderLogDetails = (details: any) => {
    if (!details) return <p className="text-slate-400 italic">Aucun détail disponible</p>;
    
    try {
      const detailsObj = typeof details === 'string' && details.startsWith('{') 
        ? JSON.parse(details) 
        : (typeof details === 'object' ? details : null);

      if (detailsObj) {
        const { message, changes } = detailsObj;
        
        if (changes && typeof changes === 'object') {
          return (
            <div className="space-y-4">
              <p className="text-sm font-semibold text-slds-text-primary leading-relaxed bg-white p-3 rounded border border-slds-border">
                {message || "Modifications apportées :"}
              </p>
              
              <div className="overflow-hidden rounded-lg border border-slds-border bg-white shadow-sm">
                <table className="min-w-full divide-y divide-slds-border text-[11px]">
                  <thead className="bg-slate-50">
                    <tr>
                      <th className="px-4 py-2 text-left font-black text-slate-400 uppercase tracking-widest">Propriété</th>
                      <th className="px-4 py-2 text-left font-black text-slate-400 uppercase tracking-widest">Ancienne Valeur</th>
                      <th className="px-4 py-2 text-left font-black text-slate-400 uppercase tracking-widest">Nouvelle Valeur</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-slds-border">
                    {Object.entries(changes).map(([key, value]: [string, any]) => {
                      const from = value && typeof value === 'object' && 'from' in value ? value.from : null;
                      const to = value && typeof value === 'object' && 'to' in value ? value.to : value;
                      
                      return (
                        <tr key={key} className="hover:bg-slate-50 transition-colors">
                          <td className="px-4 py-2 font-bold text-slate-600 bg-slate-50/30">{key}</td>
                          <td className="px-4 py-2 text-red-500 line-through opacity-70 break-all max-w-[200px]">
                            {from === null || from === undefined ? '—' : String(from)}
                          </td>
                          <td className="px-4 py-2 text-emerald-600 font-bold break-all max-w-[200px]">
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
        return <p className="text-sm font-semibold text-slds-text-primary bg-white p-3 rounded border border-slds-border">{message || details}</p>;
      }
    } catch (e) {
      // Fallback to simple string
    }
    
    return <p className="text-sm font-semibold text-slds-text-primary leading-relaxed bg-white p-3 rounded border border-slds-border">{details}</p>;
  };

  return (
    <div className="space-y-6">
      {/* Stats Cards */}
      <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
        <div className="slds-card p-4">
          <p className="text-[10px] font-bold text-slate-400 uppercase mb-1">Total Événements</p>
          <p className="text-2xl font-bold text-slate-700">{totalItems}</p>
        </div>
        <div className="slds-card p-4 border-l-4 border-l-emerald-500">
          <p className="text-[10px] font-bold text-emerald-600 uppercase mb-1">Aujourd'hui</p>
          <p className="text-2xl font-bold text-slate-700">{stats.todayCount}</p>
        </div>
        <div className="slds-card p-4 border-l-4 border-l-blue-500">
          <p className="text-[10px] font-bold text-blue-600 uppercase mb-1">Top Utilisateur</p>
          <p className="text-sm font-bold text-slate-700 truncate">{stats.topUser?.name || 'N/A'}</p>
        </div>
        <div className="slds-card p-4 border-l-4 border-l-purple-500">
          <p className="text-[10px] font-bold text-purple-600 uppercase mb-1">Ressource Critique</p>
          <p className="text-sm font-bold text-slate-700 uppercase">{stats.topEntity?.[0] || 'N/A'}</p>
        </div>
      </div>

      {/* Filters */}
      <div className="slds-card p-4 space-y-4">
        <div className="flex flex-wrap gap-4 items-center">
          <div className="relative flex-1 min-w-[200px]">
            <Search size={14} className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400" />
            <input 
              type="text" 
              placeholder="Rechercher dans les logs..."
              className="slds-input pl-10 h-9"
              value={searchTerm}
              onChange={e => setSearchTerm(e.target.value)}
            />
          </div>
          
          <select value={filterAction} onChange={e => setFilterAction(e.target.value)} className="slds-input w-auto h-9">
            <option value="ALL">Toutes les actions</option>
            <option value="CREATE">Créations</option>
            <option value="UPDATE">Modifications</option>
            <option value="DELETE">Suppressions</option>
            <option value="LOGIN">Connexions</option>
          </select>

          <select value={filterEntity} onChange={e => setFilterEntity(e.target.value)} className="slds-input w-auto h-9">
            <option value="ALL">Tous les types</option>
            {uniqueEntities.map(ent => (
              <option key={ent} value={ent}>{ent}</option>
            ))}
          </select>

          {isAdmin && (
            <select value={filterUser} onChange={e => setFilterUser(e.target.value)} className="slds-input w-auto h-9">
              <option value="ALL">Tous les utilisateurs</option>
              {uniqueUsers.map(u => (
                <option key={u.id} value={u.id}>{u.name}</option>
              ))}
            </select>
          )}

          <div className="flex items-center gap-2">
            <input type="date" value={dateFrom} onChange={e => setDateFrom(e.target.value)} className="slds-input w-36 h-9" />
            <span className="text-slate-400">→</span>
            <input type="date" value={dateTo} onChange={e => setDateTo(e.target.value)} className="slds-input w-36 h-9" />
          </div>

          {(searchTerm || filterAction !== 'ALL' || filterEntity !== 'ALL' || filterUser !== 'ALL' || dateFrom || dateTo) && (
            <button 
              onClick={() => { setSearchTerm(''); setFilterAction('ALL'); setFilterEntity('ALL'); setFilterUser('ALL'); setDateFrom(''); setDateTo(''); }}
              className="text-[10px] font-bold text-slds-brand uppercase hover:underline"
            >
              Réinitialiser
            </button>
          )}
        </div>
      </div>

      {/* Table */}
      <div className="slds-card overflow-hidden">
        <div className="overflow-x-auto">
          <table className="slds-table">
            <thead>
              <tr>
                <th>Utilisateur</th>
                <th>Action</th>
                <th>Module</th>
                <th>Date & Heure</th>
                <th>Client</th>
                <th>Détails</th>
                <th></th>
              </tr>
            </thead>
            <tbody>
              {paginatedLogs.length === 0 ? (
                <tr>
                  <td colSpan={7} className="py-20 text-center text-slate-400 italic">
                    Aucun événement trouvé pour ces critères.
                  </td>
                </tr>
              ) : paginatedLogs.map(log => {
                const actionUI = getActionUI(log.actionType);
                const client = getClientFromLog(log);
                const isExpanded = expandedId === log.id;
                
                return (
                  <React.Fragment key={log.id}>
                    <tr 
                      className={`hover:bg-slds-bg cursor-pointer transition-colors group ${isExpanded ? 'bg-slds-bg' : ''}`}
                      onClick={() => setExpandedId(isExpanded ? null : log.id)}
                    >
                      <td>
                        <div className="flex items-center gap-3">
                          <div className="w-8 h-8 rounded bg-white text-slds-text-secondary flex items-center justify-center font-bold text-[10px] border border-slds-border group-hover:bg-slds-brand group-hover:text-white transition-colors">
                            {log.userName?.[0] || '?'}{log.userName?.split(' ')[1]?.[0] || ''}
                          </div>
                          <span className="text-xs font-bold text-slds-text-primary">{log.userName}</span>
                        </div>
                      </td>
                      <td>
                        <div className={`inline-flex items-center gap-1.5 px-2 py-0.5 rounded text-[9px] font-bold uppercase border ${actionUI.color}`}>
                          {actionUI.icon}
                          {actionUI.label}
                        </div>
                      </td>
                      <td>
                        <div className="flex items-center gap-2">
                          {getEntityIcon(log.entityType)}
                          <span className="text-[10px] font-bold text-slds-text-secondary uppercase">{log.entityType}</span>
                        </div>
                      </td>
                      <td>
                        <div className="text-xs text-slds-text-primary font-medium">
                          {new Date(log.timestamp).toLocaleDateString('fr-FR', { day: '2-digit', month: '2-digit', year: 'numeric' })}
                          <span className="text-slds-text-secondary ml-1.5 text-[10px]">{new Date(log.timestamp).toLocaleTimeString('fr-FR', { hour: '2-digit', minute: '2-digit' })}</span>
                        </div>
                      </td>
                      <td>
                        {client ? (
                           <div className="flex items-center gap-2">
                             <div className="w-5 h-5 rounded bg-blue-50 text-blue-600 flex items-center justify-center text-[8px] font-black border border-blue-100">
                               {client.firstName?.[0] || '?'}{client.lastName?.[0] || '?'}
                             </div>
                             <span className="text-[11px] font-bold text-slds-text-primary truncate max-w-[120px]">{client.firstName} {client.lastName}</span>
                           </div>
                        ) : (
                          <span className="text-[10px] text-slds-text-secondary italic">—</span>
                        )}
                      </td>
                      <td className="max-w-xs">
                        <p className="text-xs text-slds-text-secondary truncate font-medium">
                          {log.details?.startsWith('{') ? (() => {
                            try { return JSON.parse(log.details).message; } catch(e) { return log.details; }
                          })() : log.details}
                        </p>
                      </td>
                      <td className="text-right">
                        <button className="p-1 text-slds-text-secondary hover:text-slds-brand transition-colors">
                          {isExpanded ? <ChevronUp size={16} /> : <ChevronDown size={16} />}
                        </button>
                      </td>
                    </tr>
                    {isExpanded && (
                      <tr className="bg-slds-bg shadow-inner">
                        <td colSpan={7} className="p-4 border-l-4 border-l-slds-brand">
                          <div className="space-y-4">
                            <div className="flex justify-between items-start">
                              <div className="space-y-1 flex-1 mr-8">
                                <p className="text-[10px] font-black text-slds-text-secondary uppercase tracking-widest">Description complète</p>
                                {renderLogDetails(log.details)}
                              </div>
                              <div className="text-right">
                                <p className="text-[10px] font-black text-slate-400 uppercase mb-1">ID Événement</p>
                                <p className="text-[10px] font-mono text-slate-300">{log.id}</p>
                              </div>
                            </div>
                            <div className="grid grid-cols-2 md:grid-cols-4 gap-6 pt-4 border-t border-slds-border/50">
                               <div>
                                  <p className="text-[10px] font-bold text-slds-text-secondary uppercase mb-1">Impact Système</p>
                                  <div className="flex items-center gap-2">
                                    <ShieldCheck size={14} className="text-slds-success" />
                                    <span className="text-[11px] font-bold text-slds-text-primary">Journal d'Audit Persistant</span>
                                  </div>
                               </div>
                               <div>
                                  <p className="text-[10px] font-bold text-slds-text-secondary uppercase mb-1">Utilisateur ID</p>
                                  <p className="text-[10px] font-mono text-slds-text-secondary">{log.userId}</p>
                               </div>
                               <div>
                                  <p className="text-[10px] font-bold text-slds-text-secondary uppercase mb-1">Module</p>
                                  <p className="text-[10px] font-bold text-slds-text-primary">{log.entityType}</p>
                               </div>
                               <div>
                                  <p className="text-[10px] font-bold text-slds-text-secondary uppercase mb-1">Exportation</p>
                                  <button onClick={handleExportCSV} className="text-[10px] font-bold text-slds-brand uppercase hover:underline">Exporter (.csv)</button>
                               </div>
                            </div>
                          </div>
                        </td>
                      </tr>
                    )}
                  </React.Fragment>
                );
              })}
            </tbody>
          </table>
        </div>

        {/* Pagination SLDS */}
        <div className="p-4 border-t border-slds-border flex justify-between items-center bg-slds-bg/50">
          <p className="text-[10px] text-slate-400 font-bold uppercase">{totalItems} événement{totalItems > 1 ? 's' : ''} au total</p>
          <Pagination 
            currentPage={currentPage}
            totalPages={totalPages}
            onPageChange={setCurrentPage}
            totalItems={totalItems}
            itemsPerPage={itemsPerPage}
            label="événements"
          />
        </div>
      </div>
    </div>
  );
};

export default ActivityLogs;
