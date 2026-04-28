
import React, { useMemo, useState } from 'react';
import { 
  BarChart, 
  Bar, 
  XAxis, 
  YAxis, 
  CartesianGrid, 
  Tooltip, 
  ResponsiveContainer, 
  Cell,
  PieChart,
  Pie,
  Legend,
  LabelList
} from 'recharts';
import { Users, UserCheck, Clock, TrendingUp, CalendarCheck, CheckCircle2, User, Globe, MapPin, AlertCircle, Target } from 'lucide-react';
import { Client, Partner, Session, ReferralStatus, UserRole, SessionCategory, SessionType, AttendanceStatus } from '../types';
import { SESSION_TYPE_LABELS } from '../constants';

interface DashboardProps {
  clients: Client[];
  partners: Partner[];
  sessions: Session[];
  activeRole: UserRole;
  currentUserId: string;
}

const COLORS = ['#0176d3', '#2e844a', '#fe9339', '#706e6b', '#ea001e'];
const PIE_COLORS = ['#0176d3', '#2e844a', '#fe9339', '#ea001e', '#8b5cf6', '#6366f1'];

const Dashboard: React.FC<DashboardProps> = ({ clients, partners, sessions, activeRole, currentUserId }) => {
  const [startDate, setStartDate] = useState<string>('');
  const [endDate, setEndDate] = useState<string>('');

  // Helper to check if a date is within the range
  const isWithinRange = (dateStr?: string) => {
    if (!dateStr) return false;
    const date = new Date(dateStr).getTime();
    if (startDate && date < new Date(startDate).getTime()) return false;
    if (endDate && date > new Date(endDate).getTime()) return false;
    return true;
  };

  // Filtrage préliminaire si le rôle est Mentor + Filtre de date
  const filteredClients = useMemo(() => {
    let result = clients;
    if (activeRole === UserRole.MENTOR) {
      result = result.filter(c => c.assignedMentorId === currentUserId);
    }
    
    // Apply date filter (based on referralDate)
    if (startDate || endDate) {
      result = result.filter(c => isWithinRange(c.referralDate));
    }
    
    return result;
  }, [clients, activeRole, currentUserId, startDate, endDate]);

  const filteredSessions = useMemo(() => {
    let result = sessions;
    
    // Filter by date
    if (startDate || endDate) {
      result = result.filter(s => isWithinRange(s.date));
    }
    
    return result;
  }, [sessions, startDate, endDate]);

  // Calcul des statistiques globales
  const stats = useMemo(() => {
    const total = filteredClients.length;
    const referredCount = filteredClients.filter(c => !!c.assignedPartnerId).length;
    const referralRate = total > 0 ? Math.round((referredCount / total) * 100) : 0;
    const inProgressCount = filteredClients.filter(c => 
      c.status === ReferralStatus.IN_PROGRESS || 
      c.status === ReferralStatus.CONTACTED || 
      c.status === ReferralStatus.ACKNOWLEDGED
    ).length;

    // Calcul du délai moyen (en jours) entre referralDate et acknowledgedAt
    const processedClients = filteredClients.filter(c => c.referralDate && c.acknowledgedAt);
    let avgDelay = 0;
    if (processedClients.length > 0) {
      const totalDelay = processedClients.reduce((acc, c) => {
        const start = new Date(c.referralDate!).getTime();
        const end = new Date(c.acknowledgedAt!).getTime();
        return acc + (end - start);
      }, 0);
      avgDelay = Number(((totalDelay / processedClients.length) / (1000 * 60 * 60 * 24)).toFixed(1));
    }

    // Calcul du taux de conversion (Clients servis vs total)
    // Un client est considéré "servi" s'il a au moins une séance individuelle dans l'historique global
    const servedClientIds = new Set(
      sessions
        .filter(s => s.category === SessionCategory.INDIVIDUAL)
        .flatMap(s => s.participantIds)
    );
    const servedCount = filteredClients.filter(c => servedClientIds.has(c.id)).length;
    const conversionRate = total > 0 ? Math.round((servedCount / total) * 100) : 0;

    return [
      { label: activeRole === UserRole.MENTOR ? 'Mes Clients' : 'Total Clients', value: total.toLocaleString(), icon: Users, color: 'text-blue-600', bg: 'bg-blue-50', trend: '+5%' },
      { label: 'Taux Référencement', value: `${referralRate}%`, icon: TrendingUp, color: 'text-green-600', bg: 'bg-green-50', trend: 'Objectif 90%' },
      { label: 'Taux Conversion', value: `${conversionRate}%`, icon: Target, color: 'text-emerald-600', bg: 'bg-emerald-50', trend: 'Clients servis' },
      { label: 'Pris en charge', value: inProgressCount.toLocaleString(), icon: UserCheck, color: 'text-purple-600', bg: 'bg-purple-50', trend: 'En cours' },
      { label: 'Délai moyen', value: avgDelay > 0 ? `${avgDelay} j` : '--', icon: Clock, color: 'text-orange-600', bg: 'bg-orange-50', trend: 'Traitement' },
    ];
  }, [filteredClients, activeRole, sessions]);

  // Statistiques des séances
  const sessionStats = useMemo(() => {
    // Filtrer les sessions pertinentes (si Mentor, seulement celles de ses clients, sinon toutes)
    const relevantSessions = activeRole === UserRole.MENTOR 
      ? filteredSessions.filter(s => s.participantIds.some(pid => filteredClients.find(c => c.id === pid))) 
      : filteredSessions;

    const individualSessions = relevantSessions.filter(s => s.category === SessionCategory.INDIVIDUAL);
    const groupSessions = relevantSessions.filter(s => s.category === SessionCategory.GROUP);

    // Calcul par service pour individuelles
    const individualByService = individualSessions.reduce((acc, s) => {
      acc[s.type] = (acc[s.type] || 0) + 1;
      return acc;
    }, {} as Record<string, number>);

    // Calcul par service pour groupes
    const groupByService = groupSessions.reduce((acc, s) => {
      acc[s.type] = (acc[s.type] || 0) + 1;
      return acc;
    }, {} as Record<string, number>);

    // Taux de No-Show Global
    // Exclut les sessions annulées, reportées, ou non éligibles (Pour l'individuel)
    let totalParticipantsExpected = 0;
    let totalNoShows = 0;
    
    relevantSessions.forEach(s => {
      if (s.category === SessionCategory.INDIVIDUAL) {
        if (s.individualStatus === AttendanceStatus.PRESENT || s.individualStatus === AttendanceStatus.ABSENT) {
          totalParticipantsExpected++;
          if (s.individualStatus === AttendanceStatus.ABSENT) {
            totalNoShows++;
          }
        }
      } else {
        // Group: On suppose que les inscrits sont attendus (pas de statut par participant pour l'instant)
        totalParticipantsExpected += s.participantIds.length;
        totalNoShows += s.noShowIds.length;
      }
    });
    
    const noShowRate = totalParticipantsExpected > 0 
      ? Math.round((totalNoShows / totalParticipantsExpected) * 100) 
      : 0;

    return {
      individual: { total: individualSessions.length, byService: individualByService },
      group: { total: groupSessions.length, byService: groupByService },
      noShowRate
    };
  }, [filteredSessions, filteredClients, activeRole]);

  // Données Démographiques (Pays & Villes)
  const demographics = useMemo(() => {
    const countries: Record<string, number> = {};
    const cities: Record<string, number> = {};
    const total = filteredClients.length || 1; // Avoid division by zero

    filteredClients.forEach(c => {
      if (c.originCountry) countries[c.originCountry] = (countries[c.originCountry] || 0) + 1;
      if (c.destinationCity) cities[c.destinationCity] = (cities[c.destinationCity] || 0) + 1;
    });

      const formatData = (source: Record<string, number>, limit = 5) => {
      const sorted = Object.entries(source)
        .map(([name, value]) => ({ name, value, percentage: Math.round((value / total) * 100) }))
        .sort((a, b) => b.value - a.value);
      
      const top = sorted.slice(0, limit);
      const othersVal = sorted.slice(limit).reduce((acc, curr) => acc + curr.value, 0);
      
      if (othersVal > 0) {
        top.push({ name: 'Autres', value: othersVal, percentage: Math.round((othersVal / total) * 100) });
      }
      
      // Ajout d'un label pré-formaté pour éviter les erreurs d'accès dans les formatters
      return top.map(item => ({
        ...item,
        fullLabel: `${item.value} (${item.percentage}%)`
      }));
    };

    return {
      countries: formatData(countries),
      cities: formatData(cities)
    };
  }, [filteredClients]);

  // Agrégation des besoins pour le graphique en barres
  const needsData = useMemo(() => {
    const counts: Record<string, number> = {};
    filteredClients.forEach(c => {
      if (c.needs && Array.isArray(c.needs)) {
        c.needs.forEach(need => {
          counts[need] = (counts[need] || 0) + 1;
        });
      }
    });

    return Object.entries(counts)
      .map(([name, value]) => ({ name, value }))
      .sort((a, b) => b.value - a.value)
      .slice(0, 5); // Top 5 des besoins
  }, [filteredClients]);

  // Render Breakdown amélioré
  const renderServiceBreakdown = (data: Record<string, number>) => (
    <div className="flex flex-col gap-1 mt-2">
      {Object.entries(data).map(([type, count]) => (
        <div key={type} className="flex items-center justify-between p-2 hover:bg-slds-bg transition-colors rounded">
          <div className="flex items-center gap-2">
            <span className="w-2 h-2 rounded-full bg-slds-brand"></span>
            <span className="text-[11px] font-semibold text-slds-text-secondary uppercase tracking-tight">{SESSION_TYPE_LABELS[type as SessionType] || type}</span>
          </div>
          <span className="text-sm font-bold text-slds-text-primary">{count}</span>
        </div>
      ))}
    </div>
  );

  return (
    <div className="space-y-6">
      {/* Filtres de Date */}
      <div className="bg-white p-4 rounded-2xl border border-slate-100 shadow-sm flex flex-col md:flex-row items-center justify-between gap-4">
        <div className="flex items-center gap-3">
          <div className="p-2 bg-blue-50 text-blue-600 rounded-xl">
            <CalendarCheck size={20} />
          </div>
          <div>
            <h2 className="text-sm font-black text-slate-900 uppercase tracking-tight">Période d'analyse</h2>
            <p className="text-[10px] text-slate-400 font-bold uppercase tracking-widest">Filtrer les statistiques par date</p>
          </div>
        </div>
        
        <div className="flex items-center gap-3">
          <div className="flex items-center gap-2">
            <span className="text-[10px] font-black text-slate-400 uppercase tracking-widest">Du</span>
            <input 
              type="date" 
              value={startDate}
              onChange={(e) => setStartDate(e.target.value)}
              className="px-3 py-1.5 bg-slate-50 border border-slate-200 rounded-xl text-xs font-bold text-slate-700 focus:ring-2 focus:ring-blue-500/20 outline-none transition-all"
            />
          </div>
          <div className="flex items-center gap-2">
            <span className="text-[10px] font-black text-slate-400 uppercase tracking-widest">Au</span>
            <input 
              type="date" 
              value={endDate}
              onChange={(e) => setEndDate(e.target.value)}
              className="px-3 py-1.5 bg-slate-50 border border-slate-200 rounded-xl text-xs font-bold text-slate-700 focus:ring-2 focus:ring-blue-500/20 outline-none transition-all"
            />
          </div>
          {(startDate || endDate) && (
            <button 
              onClick={() => { setStartDate(''); setEndDate(''); }}
              className="p-1.5 text-slate-400 hover:text-red-500 transition-colors"
              title="Réinitialiser"
            >
              <AlertCircle size={18} />
            </button>
          )}
        </div>
      </div>
      {/* Grille de KPI Clients */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-5 gap-4">
        {stats.map((stat) => (
          <div key={stat.label} className="slds-card p-4">
            <div className="flex items-center justify-between mb-2">
              <div className={`p-2 rounded bg-white border border-slds-border shadow-sm`}>
                <stat.icon className={stat.color.replace('text-', 'text-slds-')} size={18} />
              </div>
              <span className="text-[10px] font-bold text-slds-text-secondary uppercase tracking-widest">
                {stat.trend}
              </span>
            </div>
            <h3 className="text-slds-text-secondary text-[10px] font-bold uppercase tracking-widest">{stat.label}</h3>
            <p className="text-2xl font-bold text-slds-text-primary mt-1">{stat.value}</p>
          </div>
        ))}
      </div>

      {/* Grille de Stats Séances */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-4">
        <div className="slds-card p-4 flex flex-col">
          <div className="flex justify-between items-start mb-4">
            <div className="flex items-center gap-3">
              <div className="p-2 bg-[#00a1e0] text-white rounded">
                <User size={20} />
              </div>
              <div>
                <p className="text-[10px] font-bold text-slds-text-secondary uppercase tracking-widest">Séances Individuelles</p>
                <p className="text-2xl font-bold text-slds-text-primary">{sessionStats.individual.total}</p>
              </div>
            </div>
          </div>
          <div className="flex-1 border-t border-slds-border pt-2">
            {renderServiceBreakdown(sessionStats.individual.byService)}
          </div>
        </div>

        <div className="slds-card p-4 flex flex-col">
          <div className="flex justify-between items-start mb-4">
            <div className="flex items-center gap-3">
              <div className="p-2 bg-[#3ba755] text-white rounded">
                <Users size={20} />
              </div>
              <div>
                <p className="text-[10px] font-bold text-slds-text-secondary uppercase tracking-widest">Séances de Groupe</p>
                <p className="text-2xl font-bold text-slds-text-primary">{sessionStats.group.total}</p>
              </div>
            </div>
          </div>
          <div className="flex-1 border-t border-slds-border pt-2">
            {renderServiceBreakdown(sessionStats.group.byService)}
          </div>
        </div>

        <div className="slds-card p-4 flex flex-col justify-center">
          <div className="flex justify-between items-center mb-4">
            <div className="flex items-center gap-3">
              <div className={`p-2 rounded text-white ${sessionStats.noShowRate > 20 ? 'bg-slds-error' : 'bg-slds-success'}`}>
                <AlertCircle size={20} />
              </div>
              <div>
                <p className="text-[10px] font-bold text-slds-text-secondary uppercase tracking-widest">Taux de No-Show Global</p>
                <p className={`text-3xl font-bold ${sessionStats.noShowRate > 20 ? 'text-slds-error' : 'text-slds-success'}`}>
                  {sessionStats.noShowRate}%
                </p>
              </div>
            </div>
          </div>
          <div className="w-full h-2 bg-slds-bg rounded-full overflow-hidden">
            <div 
              className={`h-full transition-all duration-1000 ${sessionStats.noShowRate > 20 ? 'bg-slds-error' : 'bg-slds-success'}`} 
              style={{ width: `${sessionStats.noShowRate}%` }} 
            />
          </div>
          <p className="text-[10px] text-slds-text-secondary font-bold mt-3 text-center uppercase tracking-widest">
            {sessionStats.noShowRate > 20 ? 'Action requise : Rappels clients' : 'Assiduité satisfaisante'}
          </p>
        </div>
      </div>

      {/* Démographie */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
        {/* Pays d'origine */}
        <div className="slds-card p-6">
          <div className="flex justify-between items-center mb-6">
            <div className="flex items-center gap-3">
              <div className="p-2 bg-[#54698d] text-white rounded">
                <Globe size={20} />
              </div>
              <div>
                <h3 className="font-semibold text-slds-text-primary text-base">Pays d'Origine</h3>
                <p className="text-[10px] text-slds-text-secondary font-bold uppercase tracking-widest">Diversité de la clientèle</p>
              </div>
            </div>
          </div>
          <div className="h-[300px] w-full">
            <ResponsiveContainer width="100%" height="100%">
              <PieChart>
                <Pie
                  data={demographics.countries}
                  cx="50%"
                  cy="50%"
                  innerRadius={60}
                  outerRadius={100}
                  paddingAngle={2}
                  dataKey="value"
                  label={({ name, percent }) => `${name} (${(percent * 100).toFixed(0)}%)`}
                  labelLine={{ stroke: '#dddbda', strokeWidth: 1 }}
                >
                  {demographics.countries.map((entry, index) => (
                    <Cell key={`cell-${index}`} fill={PIE_COLORS[index % PIE_COLORS.length]} strokeWidth={1} stroke="#fff" />
                  ))}
                </Pie>
                <Tooltip 
                  formatter={(value: number, name: string, props: any) => [`${value} (${props?.payload?.percentage ?? 0}%)`, name]}
                  contentStyle={{ borderRadius: '4px', border: '1px solid #dddbda', boxShadow: '0 2px 2px 0 rgba(0,0,0,0.1)', fontSize: '12px' }}
                />
              </PieChart>
            </ResponsiveContainer>
          </div>
        </div>

        {/* Villes de Destination */}
        <div className="slds-card p-6">
          <div className="flex justify-between items-center mb-6">
            <div className="flex items-center gap-3">
              <div className="p-2 bg-[#0176d3] text-white rounded">
                <MapPin size={20} />
              </div>
              <div>
                <h3 className="font-semibold text-slds-text-primary text-base">Villes de Destination</h3>
                <p className="text-[10px] text-slds-text-secondary font-bold uppercase tracking-widest">Répartition géographique</p>
              </div>
            </div>
          </div>
          <div className="h-[300px] w-full">
            <ResponsiveContainer width="100%" height="100%">
              <BarChart
                layout="vertical"
                data={demographics.cities}
                margin={{ top: 5, right: 50, left: 20, bottom: 5 }}
              >
                <CartesianGrid strokeDasharray="3 3" horizontal={true} vertical={false} stroke="#dddbda" />
                <XAxis type="number" hide />
                <YAxis 
                  dataKey="name" 
                  type="category" 
                  width={100} 
                  tick={{ fontSize: 10, fill: '#444444', fontWeight: 600 }} 
                  axisLine={false}
                  tickLine={false}
                />
                <Tooltip 
                  formatter={(value: number, name: string, props: any) => [`${value} (${props?.payload?.percentage ?? 0}%)`, name]}
                  cursor={{fill: '#f3f3f2'}}
                  contentStyle={{ borderRadius: '4px', border: '1px solid #dddbda', boxShadow: '0 2px 2px 0 rgba(0,0,0,0.1)', fontSize: '12px' }}
                />
                <Bar dataKey="value" barSize={20} radius={[0, 2, 2, 0]}>
                  {demographics.cities.map((entry, index) => (
                    <Cell key={`cell-${index}`} fill={PIE_COLORS[index % PIE_COLORS.length]} />
                  ))}
                  <LabelList 
                    dataKey="fullLabel" 
                    position="right" 
                    style={{ fontSize: '10px', fontWeight: 'bold', fill: '#444444' }} 
                  />
                </Bar>
              </BarChart>
            </ResponsiveContainer>
          </div>
        </div>
      </div>

      {/* Analyse des Besoins */}
      <div className="slds-card p-6">
        <div className="flex justify-between items-center mb-6">
          <div className="flex items-center gap-3">
            <div className="p-2 bg-[#f39e58] text-white rounded">
              <CalendarCheck size={20} />
            </div>
            <div>
              <h3 className="font-semibold text-slds-text-primary text-base">Analyse des Besoins Clients</h3>
              <p className="text-[10px] text-slds-text-secondary font-bold uppercase tracking-widest">Top 5 des demandes exprimées</p>
            </div>
          </div>
        </div>
        <div className="h-[250px]">
          {needsData.length > 0 ? (
            <ResponsiveContainer width="100%" height="100%">
              <BarChart data={needsData} margin={{ top: 0, right: 0, left: -20, bottom: 0 }}>
                <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="#dddbda" />
                <XAxis 
                  dataKey="name" 
                  stroke="#444444" 
                  fontSize={10} 
                  tickLine={false} 
                  axisLine={false} 
                  fontWeight={600}
                />
                <YAxis 
                  stroke="#444444" 
                  fontSize={10} 
                  tickLine={false} 
                  axisLine={false} 
                  fontWeight={600}
                />
                <Tooltip 
                  cursor={{fill: '#f3f3f2'}}
                  contentStyle={{ borderRadius: '4px', border: '1px solid #dddbda', boxShadow: '0 2px 2px 0 rgba(0,0,0,0.1)', fontSize: '12px' }}
                />
                <Bar dataKey="value" radius={[4, 4, 0, 0]} barSize={40}>
                  {needsData.map((entry, index) => (
                    <Cell key={`cell-${index}`} fill={COLORS[index % COLORS.length]} />
                  ))}
                </Bar>
              </BarChart>
            </ResponsiveContainer>
          ) : (
            <div className="h-full flex flex-col items-center justify-center text-slate-300 gap-2">
              <Users size={48} className="opacity-20" />
              <p className="text-xs font-bold uppercase tracking-widest">Données insuffisantes</p>
            </div>
          )}
        </div>
      </div>
    </div>
  );
};

export default Dashboard;
