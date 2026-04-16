
import React, { useState, useMemo } from 'react';
import { Client, Session, Partner, UserRole, ReferralStatus, SessionType } from '../types';
import { SESSION_TYPE_LABELS, STATUS_COLORS } from '../constants';
import { 
  FileDown, 
  Filter, 
  Calendar, 
  Users, 
  Activity, 
  Download, 
  CheckCircle2, 
  AlertCircle,
  Building2,
  Table as TableIcon,
  Search,
  Clock
} from 'lucide-react';

interface ReportsProps {
  clients: Client[];
  sessions: Session[];
  partners: Partner[];
  activeRole: UserRole;
  currentPartnerId?: string;
}

const Reports: React.FC<ReportsProps> = ({ clients, sessions, partners, activeRole, currentPartnerId }) => {
  const [startDate, setStartDate] = useState('');
  const [endDate, setEndDate] = useState('');
  const [selectedPartner, setSelectedPartner] = useState('ALL');
  const [selectedStatus, setSelectedStatus] = useState<ReferralStatus | 'ALL'>('ALL');
  const [selectedType, setSelectedType] = useState<SessionType | 'ALL'>('ALL');

  const isAdmin = activeRole === UserRole.ADMIN || activeRole === UserRole.MANAGER;

  // Logique de filtrage des clients pour l'export
  const filteredClients = useMemo(() => {
    return clients.filter(c => {
      const matchPartner = isAdmin 
        ? (selectedPartner === 'ALL' || c.assignedPartnerId === selectedPartner)
        : (c.assignedPartnerId === currentPartnerId);
      
      const matchStatus = selectedStatus === 'ALL' || c.status === selectedStatus;
      
      const clientDate = new Date(c.arrivalDate);
      const matchStart = !startDate || clientDate >= new Date(startDate);
      const matchEnd = !endDate || clientDate <= new Date(endDate);

      return matchPartner && matchStatus && matchStart && matchEnd;
    });
  }, [clients, selectedPartner, selectedStatus, startDate, endDate, isAdmin, currentPartnerId]);

  // Logique de filtrage des séances pour l'export
  const filteredSessions = useMemo(() => {
    return sessions.filter(s => {
      const matchType = selectedType === 'ALL' || s.type === selectedType;
      
      const sessionDate = new Date(s.date);
      const matchStart = !startDate || sessionDate >= new Date(startDate);
      const matchEnd = !endDate || sessionDate <= new Date(endDate);

      // Pour les séances, on filtre aussi par rapport à l'advisor/facilitator si nécessaire, 
      // ici on garde une approche globale pour les rapports admin
      return matchType && matchStart && matchEnd;
    });
  }, [sessions, selectedType, startDate, endDate]);

  const downloadCSV = (data: any[], filename: string) => {
    if (data.length === 0) {
      alert("Aucune donnée à exporter avec les filtres actuels.");
      return;
    }

    const headers = Object.keys(data[0]);
    const csvRows = [
      headers.join(','), // header row
      ...data.map(row => 
        headers.map(fieldName => {
          const value = row[fieldName];
          const escaped = ('' + value).replace(/"/g, '""'); // escape double quotes
          return `"${escaped}"`; // wrap in quotes
        }).join(',')
      )
    ];

    const csvContent = "\uFEFF" + csvRows.join('\r\n'); // Add BOM for Excel UTF-8
    const blob = new Blob([csvContent], { type: 'text/csv;charset=utf-8;' });
    const url = URL.createObjectURL(blob);
    const link = document.createElement("a");
    link.setAttribute("href", url);
    link.setAttribute("download", `${filename}_${new Date().toISOString().split('T')[0]}.csv`);
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
  };

  const handleExportClients = () => {
    const exportData = filteredClients.map(c => ({
      ID: c.id,
      Prenom: c.firstName,
      Nom: c.lastName,
      Email: c.email,
      PaysOrigine: c.originCountry,
      Profession: c.profession,
      VilleDestination: c.destinationCity,
      DateArrivee: c.arrivalDate,
      Statut: c.status,
      Consentement: c.consentShared ? 'OUI' : 'NON',
      OrganismeID: c.assignedPartnerId || 'Non assigné',
      OrganismeNom: partners.find(p => p.id === c.assignedPartnerId)?.name || 'N/A'
    }));
    downloadCSV(exportData, 'Arrivio_Export_Clients');
  };

  const handleExportSessions = () => {
    const exportData = filteredSessions.map(s => ({
      ID: s.id,
      Titre: s.title,
      Type: s.type,
      Categorie: s.category,
      Date: s.date,
      Heure: s.startTime,
      DureeMinutes: s.duration,
      Localisation: s.location,
      Facilitateur: s.facilitatorName,
      Conseiller: s.advisorName,
      NbParticipants: s.participantIds?.length || 0,
      NbAbsents: s.noShowIds?.length || 0
    }));
    downloadCSV(exportData, 'Arrivio_Export_Seances');
  };

  return (
    <div className="space-y-8 animate-in fade-in duration-500">
      {/* Header et Filtres Globaux SLDS */}
      <div className="slds-card p-6 space-y-6">
        <div className="flex items-center gap-4">
          <div className="p-2 bg-slds-brand text-white rounded shadow-sm">
            <FileDown size={24} />
          </div>
          <div>
            <h2 className="text-lg font-bold text-slds-text-primary">Centre d'Extraction de Données</h2>
            <p className="text-[10px] text-slds-text-secondary font-bold uppercase tracking-widest mt-1">Générez vos rapports IRCC et exports personnalisés</p>
          </div>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4 pt-4 border-t border-slds-border">
          <div className="space-y-1">
            <label className="text-[10px] font-bold text-slds-text-secondary uppercase tracking-widest flex items-center gap-1">
              <Calendar size={12} /> Date de début
            </label>
            <input 
              type="date" 
              value={startDate}
              onChange={(e) => setStartDate(e.target.value)}
              className="slds-input" 
            />
          </div>
          <div className="space-y-1">
            <label className="text-[10px] font-bold text-slds-text-secondary uppercase tracking-widest flex items-center gap-1">
              <Calendar size={12} /> Date de fin
            </label>
            <input 
              type="date" 
              value={endDate}
              onChange={(e) => setEndDate(e.target.value)}
              className="slds-input" 
            />
          </div>
          {isAdmin && (
            <div className="space-y-1">
              <label className="text-[10px] font-bold text-slds-text-secondary uppercase tracking-widest flex items-center gap-1">
                <Building2 size={12} /> Organisme
              </label>
              <select 
                value={selectedPartner}
                onChange={(e) => setSelectedPartner(e.target.value)}
                className="slds-input"
              >
                <option value="ALL">Tous les organismes</option>
                {partners.map(p => <option key={p.id} value={p.id}>{p.name}</option>)}
              </select>
            </div>
          )}
          <div className="space-y-1">
             <label className="text-[10px] font-bold text-slds-text-secondary uppercase tracking-widest flex items-center gap-1">
               <Clock size={12} /> Rapidité
             </label>
             <div className="slds-input bg-slds-bg text-[10px] font-bold text-slds-brand flex items-center justify-center text-center h-[32px]">
               Génération instantanée via Cloud
             </div>
          </div>
        </div>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
        {/* Colonne Export Clients SLDS */}
        <div className="slds-card overflow-hidden flex flex-col group hover:border-slds-brand transition-all">
          <div className="p-6 border-b border-slds-border bg-slds-bg">
             <div className="flex justify-between items-start mb-4">
                <div className="p-3 bg-white text-slds-brand rounded border border-slds-border shadow-sm group-hover:scale-105 transition-transform">
                  <Users size={24} />
                </div>
                <div className="text-right">
                   <p className="text-2xl font-bold text-slds-text-primary leading-none">{filteredClients.length}</p>
                   <p className="text-[9px] font-bold text-slds-text-secondary uppercase tracking-widest mt-1">Dossiers correspondants</p>
                </div>
             </div>
             <h3 className="text-base font-bold text-slds-text-primary">Rapport des Données Clients</h3>
             <p className="text-slds-text-secondary text-xs mt-2 font-medium leading-relaxed">
               Export complet des profils incluant les informations démographiques, les besoins et le statut de référencement.
             </p>
          </div>
          
          <div className="p-6 space-y-4 flex-1">
             <div className="space-y-2">
                <label className="text-[10px] font-bold text-slds-text-secondary uppercase tracking-widest">Affiner par statut</label>
                <div className="flex flex-wrap gap-2">
                   <button 
                    onClick={() => setSelectedStatus('ALL')}
                    className={`px-3 py-1 rounded text-[9px] font-bold uppercase tracking-widest border transition-all ${selectedStatus === 'ALL' ? 'bg-slds-brand text-white border-slds-brand' : 'bg-white text-slds-text-secondary border-slds-border hover:border-slds-brand'}`}
                   >
                     Tous
                   </button>
                   {Object.values(ReferralStatus).map(st => (
                     <button 
                      key={st}
                      onClick={() => setSelectedStatus(st)}
                      className={`px-3 py-1 rounded text-[9px] font-bold uppercase tracking-widest border transition-all ${selectedStatus === st ? 'bg-slds-brand text-white border-slds-brand' : 'bg-white text-slds-text-secondary border-slds-border hover:border-slds-brand'}`}
                     >
                       {st.replace(/_/g, ' ')}
                     </button>
                   ))}
                </div>
             </div>
          </div>

          <div className="p-4 bg-slds-bg border-t border-slds-border mt-auto">
             <button 
              onClick={handleExportClients}
              className="slds-button slds-button-brand w-full flex items-center justify-center gap-2"
             >
               <Download size={14} /> Exporter Clients (.csv)
             </button>
          </div>
        </div>

        {/* Colonne Export Séances SLDS */}
        <div className="slds-card overflow-hidden flex flex-col group hover:border-slds-brand transition-all">
          <div className="p-6 border-b border-slds-border bg-slds-bg">
             <div className="flex justify-between items-start mb-4">
                <div className="p-3 bg-white text-slds-brand rounded border border-slds-border shadow-sm group-hover:scale-105 transition-transform">
                  <Activity size={24} />
                </div>
                <div className="text-right">
                   <p className="text-2xl font-bold text-slds-text-primary leading-none">{filteredSessions.length}</p>
                   <p className="text-[9px] font-bold text-slds-text-secondary uppercase tracking-widest mt-1">Activités correspondantes</p>
                </div>
             </div>
             <h3 className="text-base font-bold text-slds-text-primary">Rapport d'Activité & Séances</h3>
             <p className="text-slds-text-secondary text-xs mt-2 font-medium leading-relaxed">
               Détail des prestations de services, fréquentation et imputation des contrats pour la période sélectionnée.
             </p>
          </div>
          
          <div className="p-6 space-y-4 flex-1">
             <div className="space-y-2">
                <label className="text-[10px] font-bold text-slds-text-secondary uppercase tracking-widest">Filtrer par type de service</label>
                <div className="flex flex-wrap gap-2">
                   <button 
                    onClick={() => setSelectedType('ALL')}
                    className={`px-3 py-1 rounded text-[9px] font-bold uppercase tracking-widest border transition-all ${selectedType === 'ALL' ? 'bg-slds-brand text-white border-slds-brand' : 'bg-white text-slds-text-secondary border-slds-border hover:border-slds-brand'}`}
                   >
                     Tous les services
                   </button>
                   {Object.values(SessionType).map(t => (
                     <button 
                      key={t}
                      onClick={() => setSelectedType(t)}
                      className={`px-3 py-1 rounded text-[9px] font-bold uppercase tracking-widest border transition-all ${selectedType === t ? 'bg-slds-brand text-white border-slds-brand' : 'bg-white text-slds-text-secondary border-slds-border hover:border-slds-brand'}`}
                     >
                       {SESSION_TYPE_LABELS[t]}
                     </button>
                   ))}
                </div>
             </div>
          </div>

          <div className="p-4 bg-slds-bg border-t border-slds-border mt-auto">
             <button 
              onClick={handleExportSessions}
              className="slds-button slds-button-brand w-full flex items-center justify-center gap-2"
             >
               <Download size={14} /> Exporter Séances (.csv)
             </button>
          </div>
        </div>
      </div>

      {/* Footer Info SLDS */}
      <div className="slds-card p-8 bg-slds-text-primary text-white flex flex-col md:flex-row items-center justify-between gap-6 relative overflow-hidden">
        <div className="absolute top-0 right-0 p-12 text-white/5 pointer-events-none">
          <TableIcon size={120} />
        </div>
        <div className="max-w-xl relative z-10 text-center md:text-left">
           <h4 className="text-lg font-bold tracking-tight mb-2">Conformité IRCC & Confidentialité</h4>
           <p className="text-slds-border text-xs font-medium leading-relaxed">
             Les exports générés via Arrivio respectent les normes de protection des données. Assurez-vous que le stockage des fichiers téléchargés sur vos postes de travail est conforme aux politiques de sécurité du Centre Francophone du Grand Toronto.
           </p>
        </div>
        <div className="flex gap-4 relative z-10 shrink-0">
          <div className="px-6 py-4 bg-white/5 border border-white/10 rounded flex flex-col items-center">
            <CheckCircle2 size={24} className="text-slds-success mb-2" />
            <p className="text-[9px] font-bold uppercase tracking-tighter text-slds-border">Format Standard</p>
          </div>
          <div className="px-6 py-4 bg-white/5 border border-white/10 rounded flex flex-col items-center">
            <AlertCircle size={24} className="text-slds-brand mb-2" />
            <p className="text-[9px] font-bold uppercase tracking-tighter text-slds-border">Audit activé</p>
          </div>
        </div>
      </div>
    </div>
  );
};

export default Reports;
