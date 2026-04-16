
import React, { useMemo, useState } from 'react';
import { UserActivityLog, UserRole, Client } from '../types';
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
} from 'lucide-react';

interface ActivityLogsProps {
  logs: UserActivityLog[];
  clients: Client[];
  activeRole: UserRole;
  currentUserId: string;
}

const ActivityLogs: React.FC<ActivityLogsProps> = ({ logs, clients, activeRole, currentUserId }) => {
  const [filterUser, setFilterUser] = useState<string>('ALL');
  const [filterAction, setFilterAction] = useState<string>('ALL');
  const [filterEntity, setFilterEntity] = useState<string>('ALL');
  const [filterClient, setFilterClient] = useState<string>('');
  const [searchTerm, setSearchTerm] = useState('');
  const [dateFrom, setDateFrom] = useState('');
  const [dateTo, setDateTo] = useState('');
  const [expandedId, setExpandedId] = useState<string | null>(null);
  const [showStats, setShowStats] = useState(true);

  const isAdmin = activeRole === UserRole.ADMIN;

  // Extract client name from log details by cross-referencing client list
  const getClientFromLog = (log: UserActivityLog): Client | null => {
    const detailsLower = log.details.toLowerCase();
    // Check all clients to see if their name appears in the log details
    for (const client of clients) {
      const fullName = `${client.firstName} ${client.lastName}`.toLowerCase();
      if (fullName.length > 3 && detailsLower.includes(fullName)) {
        return client;
      }
    }
    return null;
  };

  const uniqueUsers = useMemo(() => {
    const users = new Map();
    logs.forEach(log => {
      if (isAdmin || log.userId === currentUserId) {
        users.set(log.userId, log.userName);
      }
    });
    return Array.from(users.entries()).map(([id, name]) => ({ id, name }));
  }, [logs, isAdmin, currentUserId]);

  const uniqueEntities = useMemo(() => {
    const entities = new Set<string>();
    logs.forEach(log => entities.add(log.entityType));
    return Array.from(entities).sort();
  }, [logs]);

  const filteredLogs = useMemo(() => {
    return logs
      .filter(log => {
        const hasAccess = isAdmin || log.userId === currentUserId;
        const matchUser = filterUser === 'ALL' || log.userId === filterUser;
        const matchAction = filterAction === 'ALL' || log.actionType === filterAction;
        const matchEntity = filterEntity === 'ALL' || log.entityType === filterEntity;
        const matchSearch = searchTerm === '' || 
          log.details.toLowerCase().includes(searchTerm.toLowerCase()) ||
          log.userName.toLowerCase().includes(searchTerm.toLowerCase()) ||
          log.entityType.toLowerCase().includes(searchTerm.toLowerCase());

        const logDate = new Date(log.timestamp);
        const matchFrom = !dateFrom || logDate >= new Date(dateFrom);
        const matchTo = !dateTo || logDate <= new Date(dateTo + 'T23:59:59');

        // Client name filter
        const matchClient = filterClient === '' || (() => {
          const client = getClientFromLog(log);
          return client ? `${client.firstName} ${client.lastName}`.toLowerCase().includes(filterClient.toLowerCase()) : false;
        })();

        return hasAccess && matchUser && matchAction && matchEntity && matchSearch && matchFrom && matchTo && matchClient;
      })
      .sort((a, b) => new Date(b.timestamp).getTime() - new Date(a.timestamp).getTime());
  }, [logs, isAdmin, currentUserId, filterUser, filterAction, filterEntity, searchTerm, dateFrom, dateTo]);

  // Statistics
  const stats = useMemo(() => {
    const actionCounts: Record<string, number> = {};
    const userCounts: Record<string, { name: string; count: number }> = {};
    const entityCounts: Record<string, number> = {};
    const today = new Date().toDateString();
    let todayCount = 0;

    filteredLogs.forEach(log => {
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
        `"${log.details.replace(/"/g, '""')}"`
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
      default: return { color: 'bg-slate-50 text-slate-600 border-slate-100', bar: 'bg-slate-400', icon: <History size={12} />, label: type };
    }
  };

  const getEntityIcon = (type: string) => {
    switch (type) {
      case 'CLIENT': return <Users size={15} className="text-blue-500" />;
      case 'SESSION': return <Calendar size={15} className="text-emerald-500" />;
      case 'MENTOR': return <Award size={15} className="text-amber-500" />;
      case 'CONTRACT': return <FileText size={15} className="text-indigo-500" />;
      case 'PROFILE': return <ShieldCheck size={15} className="text-red-500" />;
      case 'PARTNER': return <Building2 size={15} className="text-purple-500" />;
      default: return <History size={15} className="text-slate-400" />;
    }
  };

  const resetFilters = () => {
    setFilterUser('ALL');
    setFilterAction('ALL');
    setFilterEntity('ALL');
    setFilterClient('');
    setSearchTerm('');
    setDateFrom('');
    setDateTo('');
  };

  const hasActiveFilters = filterUser !== 'ALL' || filterAction !== 'ALL' || filterEntity !== 'ALL' || filterClient !== '' || searchTerm !== '' || dateFrom !== '' || dateTo !== '';

  return (
    <div className="space-y-6">

      {/* Header */}
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-4">
          <div className="p-3 bg-gradient-to-br from-slate-800 to-slate-900 text-white rounded-2xl shadow-lg shadow-slate-200">
            <Shield size={24} />
          </div>
          <div>
            <h2 className="text-2xl font-black text-slate-900 tracking-tight">
              {isAdmin ? 'Audit & Traçabilité' : 'Mon Historique d\'Activité'}
            </h2>
            <p className="text-[10px] text-slate-400 font-bold uppercase tracking-widest">
              {filteredLogs.length} événement{filteredLogs.length > 1 ? 's' : ''} — {isAdmin ? 'Historique complet' : 'Vos actions personnelles'}
            </p>
          </div>
        </div>
        <div className="flex items-center gap-3">
          {isAdmin && (
            <span className="flex items-center gap-2 px-3 py-1.5 bg-amber-50 text-amber-700 border border-amber-200 rounded-xl text-[10px] font-black uppercase tracking-wider">
              <ShieldCheck size={12} /> Super-Vision Admin
            </span>
          )}
          <button
            onClick={handleExportCSV}
            className="flex items-center gap-2 px-4 py-2.5 bg-slate-900 text-white rounded-xl text-[10px] font-black uppercase tracking-widest hover:bg-slate-700 transition-all shadow-lg"
          >
            <Download size={14} /> Exporter CSV
          </button>
        </div>
      </div>

      {/* Stats Cards */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
        <div className="slds-card p-5">
          <div className="flex items-start justify-between">
            <div>
              <p className="text-[10px] font-black text-slate-400 uppercase tracking-widest mb-1">Aujourd'hui</p>
              <p className="text-3xl font-black text-slate-900">{stats.todayCount}</p>
            </div>
            <div className="p-2 bg-blue-50 rounded-xl">
              <Activity size={20} className="text-blue-500" />
            </div>
          </div>
        </div>
        <div className="slds-card p-5">
          <div className="flex items-start justify-between">
            <div>
              <p className="text-[10px] font-black text-slate-400 uppercase tracking-widest mb-1">Créations</p>
              <p className="text-3xl font-black text-emerald-600">{stats.actionCounts['CREATE'] || 0}</p>
            </div>
            <div className="p-2 bg-emerald-50 rounded-xl">
              <PlusCircle size={20} className="text-emerald-500" />
            </div>
          </div>
        </div>
        <div className="slds-card p-5">
          <div className="flex items-start justify-between">
            <div>
              <p className="text-[10px] font-black text-slate-400 uppercase tracking-widest mb-1">Modifications</p>
              <p className="text-3xl font-black text-blue-600">{stats.actionCounts['UPDATE'] || 0}</p>
            </div>
            <div className="p-2 bg-blue-50 rounded-xl">
              <RefreshCcw size={20} className="text-blue-500" />
            </div>
          </div>
        </div>
        <div className="slds-card p-5">
          <div className="flex items-start justify-between">
            <div>
              <p className="text-[10px] font-black text-slate-400 uppercase tracking-widest mb-1">Suppressions</p>
              <p className="text-3xl font-black text-red-600">{stats.actionCounts['DELETE'] || 0}</p>
            </div>
            <div className="p-2 bg-red-50 rounded-xl">
              <AlertTriangle size={20} className="text-red-500" />
            </div>
          </div>
        </div>
      </div>

      {/* Filters */}
      <div className="slds-card p-4 space-y-4">
        {/* Search */}
        <div className="flex flex-col md:flex-row gap-3">
          <div className="relative flex-1">
            <Search size={15} className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400" />
            <input
              type="text"
              placeholder="Rechercher dans les détails, nom d'utilisateur..."
              className="slds-input pl-10 w-full"
              value={searchTerm}
              onChange={e => setSearchTerm(e.target.value)}
            />
          </div>
          {hasActiveFilters && (
            <button onClick={resetFilters} className="flex items-center gap-2 px-4 py-2 bg-red-50 text-red-600 border border-red-100 rounded-xl text-[10px] font-black uppercase hover:bg-red-100 transition-colors">
              <X size={14} /> Réinitialiser
            </button>
          )}
        </div>

        {/* Filter Row */}
        <div className="flex flex-wrap gap-3 items-center">
          <div className="flex items-center gap-2 text-[10px] text-slate-400 font-black uppercase">
            <Filter size={12} /> Filtres :
          </div>

          <select value={filterAction} onChange={e => setFilterAction(e.target.value)} className="slds-input slds-input-compact w-auto">
            <option value="ALL">Toutes les actions</option>
            <option value="CREATE">Création</option>
            <option value="UPDATE">Modification</option>
            <option value="DELETE">Suppression</option>
            <option value="LOGIN">Connexion</option>
          </select>

          <select value={filterEntity} onChange={e => setFilterEntity(e.target.value)} className="slds-input slds-input-compact w-auto">
            <option value="ALL">Tous les modules</option>
            {uniqueEntities.map(e => (
              <option key={e} value={e}>{e}</option>
            ))}
          </select>

          {isAdmin && (
            <select value={filterUser} onChange={e => setFilterUser(e.target.value)} className="slds-input slds-input-compact w-auto">
              <option value="ALL">Tous les utilisateurs</option>
              {uniqueUsers.map(u => (
                <option key={u.id} value={u.id}>{u.name}</option>
              ))}
            </select>
          )}

          {/* Client name search filter */}
          <div className="relative">
            <Users size={13} className="absolute left-2.5 top-1/2 -translate-y-1/2 text-slate-400" />
            <input
              type="text"
              placeholder="Filtrer par client..."
              value={filterClient}
              onChange={e => setFilterClient(e.target.value)}
              className="slds-input slds-input-compact pl-8 w-44"
            />
          </div>

          <div className="flex items-center gap-2 ml-auto">
            <CalendarRange size={14} className="text-slate-400" />
            <input
              type="date"
              value={dateFrom}
              onChange={e => setDateFrom(e.target.value)}
              className="slds-input slds-input-compact w-auto"
              title="Du"
            />
            <span className="text-slate-400 text-xs font-bold">→</span>
            <input
              type="date"
              value={dateTo}
              onChange={e => setDateTo(e.target.value)}
              className="slds-input slds-input-compact w-auto"
              title="Au"
            />
          </div>
        </div>
      </div>

      {/* Table */}
      <div className="slds-card overflow-hidden">
        <div className="overflow-x-auto">
          <table className="w-full text-sm">
            <thead>
              <tr className="bg-slate-50 border-b border-slate-100 text-[10px] font-black text-slate-400 uppercase tracking-widest">
                <th className="p-4 text-left">Horodatage</th>
                {isAdmin && <th className="p-4 text-left">Utilisateur</th>}
                <th className="p-4 text-left">Action</th>
                <th className="p-4 text-left">Module</th>
                <th className="p-4 text-left">Description</th>
                <th className="p-4 text-left">Client</th>
                <th className="p-4 text-center">Détails</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-50">
              {filteredLogs.map(log => {
                const actionUI = getActionUI(log.actionType);
                const isExpanded = expandedId === log.id;
                const matchedClient = getClientFromLog(log);
                return (
                  <React.Fragment key={log.id}>
                    <tr 
                      className="hover:bg-slate-50/70 transition-colors group cursor-pointer"
                      onClick={() => setExpandedId(isExpanded ? null : log.id)}
                    >
                      <td className="p-4">
                        <div className={`w-1 h-10 ${actionUI.bar} rounded-full absolute -ml-4 opacity-0 group-hover:opacity-100 transition-opacity`} />
                        <div className="flex items-center gap-2">
                          <Clock size={13} className="text-slate-300 group-hover:text-slds-brand transition-colors shrink-0" />
                          <div>
                            <p className="text-xs font-bold text-slate-700">{new Date(log.timestamp).toLocaleDateString('fr-FR')}</p>
                            <p className="text-[10px] text-slate-400 font-mono">{new Date(log.timestamp).toLocaleTimeString('fr-FR')}</p>
                          </div>
                        </div>
                      </td>
                      {isAdmin && (
                        <td className="p-4">
                          <div className="flex items-center gap-2.5">
                            <div className="w-8 h-8 rounded-xl bg-slate-100 flex items-center justify-center text-xs font-black text-slate-500 group-hover:bg-slds-brand group-hover:text-white transition-colors shrink-0">
                              {log.userName?.charAt(0)?.toUpperCase()}
                            </div>
                            <span className="text-xs font-bold text-slate-700 truncate max-w-[120px]">{log.userName}</span>
                          </div>
                        </td>
                      )}
                      <td className="p-4">
                        <span className={`inline-flex items-center gap-1.5 px-2.5 py-1 rounded-lg border text-[10px] font-black uppercase ${actionUI.color}`}>
                          {actionUI.icon}
                          {actionUI.label}
                        </span>
                      </td>
                      <td className="p-4">
                        <div className="flex items-center gap-2">
                          <div className="p-1.5 bg-white border border-slate-100 rounded-lg shadow-sm">
                            {getEntityIcon(log.entityType)}
                          </div>
                          <span className="text-[10px] font-black text-slate-500 uppercase">{log.entityType}</span>
                        </div>
                      </td>
                      <td className="p-4 max-w-xs">
                        <p className="text-xs text-slate-600 leading-relaxed line-clamp-2">{log.details}</p>
                      </td>
                      <td className="p-4">
                        {matchedClient ? (
                          <div className="flex items-center gap-2">
                            <div className="w-7 h-7 rounded-lg bg-blue-50 border border-blue-100 flex items-center justify-center text-[10px] font-black text-blue-500 shrink-0">
                              {matchedClient.firstName.charAt(0)}{matchedClient.lastName.charAt(0)}
                            </div>
                            <div>
                              <p className="text-xs font-bold text-slate-700 whitespace-nowrap">{matchedClient.firstName} {matchedClient.lastName}</p>
                              {matchedClient.clientCode && (
                                <p className="text-[10px] text-slate-400 font-mono">{matchedClient.clientCode}</p>
                              )}
                            </div>
                          </div>
                        ) : (
                          <span className="text-[10px] text-slate-300 italic">—</span>
                        )}
                      </td>
                      <td className="p-4 text-center">
                        <button className="p-1.5 rounded-lg hover:bg-slate-100 text-slate-400 transition-colors">
                          {isExpanded ? <ChevronUp size={14} /> : <ChevronDown size={14} />}
                        </button>
                      </td>
                    </tr>
                    {isExpanded && (
                      <tr className="bg-slate-50/50 border-b border-slate-100">
                        <td colSpan={isAdmin ? 7 : 6} className="px-8 py-4">
                          <div className="bg-white border border-slate-100 rounded-2xl p-5 space-y-3 shadow-sm">
                            <p className="text-[10px] font-black text-slate-400 uppercase tracking-widest">Détails complets de l'événement</p>
                            <div className="grid grid-cols-2 gap-4">
                              <div>
                                <p className="text-[10px] text-slate-400 font-bold uppercase mb-1">ID de l'événement</p>
                                <p className="text-xs font-mono text-slate-600 break-all">{log.id}</p>
                              </div>
                              <div>
                                <p className="text-[10px] text-slate-400 font-bold uppercase mb-1">ID de l'utilisateur</p>
                                <p className="text-xs font-mono text-slate-600 break-all">{log.userId}</p>
                              </div>
                              <div className="col-span-2">
                                <p className="text-[10px] text-slate-400 font-bold uppercase mb-1">Description complète</p>
                                <p className="text-sm text-slate-700 leading-relaxed">{log.details}</p>
                              </div>
                              <div>
                                <p className="text-[10px] text-slate-400 font-bold uppercase mb-1">Horodatage ISO</p>
                                <p className="text-xs font-mono text-slate-600">{log.timestamp}</p>
                              </div>
                            </div>
                          </div>
                        </td>
                      </tr>
                    )}
                  </React.Fragment>
                );
              })}
              {filteredLogs.length === 0 && (
                <tr>
                  <td colSpan={isAdmin ? 7 : 6} className="p-16 text-center">
                    <History size={48} className="mx-auto text-slate-200 mb-4" />
                    <p className="text-slate-400 font-black text-sm uppercase tracking-widest">Aucun événement trouvé</p>
                    <p className="text-slate-300 text-xs mt-2">Modifiez vos filtres pour afficher des résultats</p>
                  </td>
                </tr>
              )}
            </tbody>
          </table>
        </div>
        {filteredLogs.length > 0 && (
          <div className="p-4 border-t border-slate-50 flex justify-between items-center">
            <p className="text-[10px] text-slate-400 font-bold uppercase">{filteredLogs.length} événement{filteredLogs.length > 1 ? 's' : ''} affiché{filteredLogs.length > 1 ? 's' : ''}</p>
            <button onClick={handleExportCSV} className="flex items-center gap-2 text-[10px] font-black text-slds-brand uppercase hover:underline">
              <Download size={12} /> Exporter ce résultat
            </button>
          </div>
        )}
      </div>
    </div>
  );
};

export default ActivityLogs;
