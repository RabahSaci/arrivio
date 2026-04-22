import React, { useState, useRef, useMemo, useEffect } from 'react';
import * as XLSX from 'xlsx';
import { Client, Mentor, Session, UserRole, Partner, ReferralStatus, ReferralStatus as StatusType, SessionCategory, AttendanceStatus } from '../types';
import Pagination from '../components/Pagination';
import { STATUS_COLORS } from '../constants';
import ConfirmModal from '../components/ConfirmModal';
import { apiService } from '../services/apiService';
import { 
  Search, 
  Plus, 
  Upload, 
  Loader2, 
  X, 
  User, 
  Globe, 
  Mail, 
  Briefcase, 
  MapPin, 
  Calendar,
  Filter,
  ChevronRight,
  Database,
  ArrowUpDown,
  Activity,
  Share2,
  Trash2,
  Clock
} from 'lucide-react';

interface ClientListProps {
  clients: Client[];
  sessions: Session[];
  activeRole: UserRole;
  currentPartnerId?: string;
  currentUserId?: string;
  onSelectClient: (client: Client) => void;
  onAddClient: (client: Client) => void;
  onBulkAddClients: (clients: Client[]) => Promise<void>;
  onDeleteClient?: (clientId: string) => void;
}

const ClientList: React.FC<ClientListProps> = ({ clients, sessions, activeRole, currentPartnerId, currentUserId, onSelectClient, onAddClient, onBulkAddClients, onDeleteClient }) => {
  const [searchTerm, setSearchTerm] = useState('');
  const [filterStatus, setFilterStatus] = useState<ReferralStatus | 'ALL'>('ALL');
  const [filterCity, setFilterCity] = useState('ALL');
  const [filterCountry, setFilterCountry] = useState('ALL');
  const [filterSessionsRange, setFilterSessionsRange] = useState<'ALL' | '0' | '1-5' | '5+'>('ALL');
  const [filterStartDate, setFilterStartDate] = useState('');
  const [filterEndDate, setFilterEndDate] = useState('');

  // OPTIMIZATION: Index sessions per client for lightning-fast attendance calculation
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

  const getAttendanceStats = (clientId: string) => {
    const clientSessions = sessionsByClient.get(clientId) || [];
    if (clientSessions.length === 0) return null;
    
    const attendedSessions = clientSessions.filter(s => {
      if (s.category === SessionCategory.INDIVIDUAL) {
        return s.individualStatus === AttendanceStatus.PRESENT;
      }
      return !s.noShowIds?.includes(clientId);
    });
    
    return {
      rate: Math.round((attendedSessions.length / clientSessions.length) * 100),
      total: clientSessions.length
    };
  };
  const [currentPage, setCurrentPage] = useState(1);
  const itemsPerPage = 10;

  const [isLoading, setIsLoading] = useState(false);
  const [uniqueCities, setUniqueCities] = useState<string[]>([]);
  const [uniqueCountries, setUniqueCountries] = useState<string[]>([]);
  
  const [showAddModal, setShowAddModal] = useState(false);
  const [isImporting, setIsImporting] = useState(false);
  const [clientToDelete, setClientToDelete] = useState<string | null>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);

  const filteredClients = useMemo(() => {
    return clients.filter(client => {
      // Filtrage par texte (sur tous les champs texte)
      if (searchTerm) {
        const query = searchTerm.toLowerCase();
        const firstName = client.firstName?.toLowerCase() || '';
        const lastName = client.lastName?.toLowerCase() || '';
        const fullName = `${firstName} ${lastName}`;
        const reversedFullName = `${lastName} ${firstName}`;
        const email = client.email?.toLowerCase() || '';
        const code = client.clientCode?.toLowerCase() || '';

        if (!(
          firstName.includes(query) ||
          lastName.includes(query) ||
          fullName.includes(query) ||
          reversedFullName.includes(query) ||
          email.includes(query) ||
          code.includes(query)
        )) return false;
      }
      
      if (filterStatus !== 'ALL' && client.status !== filterStatus) return false;
      if (filterCity !== 'ALL' && client.destinationCity !== filterCity) return false;
      if (filterCountry !== 'ALL' && client.originCountry !== filterCountry) return false;
      if (filterStartDate && (!client.registrationDate || client.registrationDate < filterStartDate)) return false;
      if (filterEndDate && (!client.registrationDate || client.registrationDate > filterEndDate)) return false;
      
      // Filter by session count
      if (filterSessionsRange !== 'ALL') {
        const count = sessionsByClient.get(client.id)?.length || 0;
        if (filterSessionsRange === '0' && count !== 0) return false;
        if (filterSessionsRange === '1-5' && (count < 1 || count > 5)) return false;
        if (filterSessionsRange === '5+' && count <= 5) return false;
      }

      if (activeRole === UserRole.PARTNER && client.assignedPartnerId !== currentPartnerId) return false;
      
      return true;
    }).sort((a, b) => {
      return new Date(b.registrationDate || 0).getTime() - new Date(a.registrationDate || 0).getTime();
    });
  }, [clients, searchTerm, filterStatus, filterCity, filterCountry, filterStartDate, filterEndDate, filterSessionsRange, activeRole, currentPartnerId, sessionsByClient]);

  const totalItems = filteredClients.length;

  const paginatedClients = useMemo(() => {
    const startIndex = (currentPage - 1) * itemsPerPage;
    return filteredClients.slice(startIndex, startIndex + itemsPerPage);
  }, [filteredClients, currentPage]);

  useEffect(() => {
    const cities = new Set(clients.map(c => c.destinationCity).filter(Boolean));
    const countries = new Set(clients.map(c => c.originCountry).filter(Boolean));
    setUniqueCities(Array.from(cities).sort() as string[]);
    setUniqueCountries(Array.from(countries).sort() as string[]);
  }, [clients]);

  const totalPages = Math.ceil(totalItems / itemsPerPage);

  const resetFilters = () => {
    setSearchTerm('');
    setFilterStatus('ALL');
    setFilterCity('ALL');
    setFilterCountry('ALL');
    setFilterSessionsRange('ALL');
    setFilterStartDate('');
    setFilterEndDate('');
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

          // Mapping des index par colonnes
          const idx = {
            code: findIdx(['code client', 'id client', 'client code']),
            reg: findIdx(['inscription', 'registration']),
            fn: findIdx(['prénom', 'prenom', 'first name']),
            ln: findIdx(['nom', 'last name', 'surname']),
            // ... autres index restants inchangés
            dob: findIdx(['naissance', 'birth', 'né(e)']),
            gender: findIdx(['genre', 'sexe', 'gender']),
            res: findIdx(['résidence', 'residence']),
            birthCountry: findIdx(['pays de naissance', 'birth country']),
            iuc: findIdx(['iuc', 'crp']),
            email: findIdx(['email', 'courriel']),
            tel: findIdx(['téléphone', 'phone']),
            prog: findIdx(['programme d\'immigration', 'participated', 'immigration program']),
            immType: findIdx(['immigration en', 'immigration type']),
            account: findIdx(['compte lié', 'linked account']),
            main: findIdx(['requérant principal', 'main applicant']),
            spouseFn: findIdx(['nom et prénom - conjoint', 'spouse name']),
            spouseDob: findIdx(['naissance - conjoint', 'spouse birth']),
            spouseEmail: findIdx(['courriel - conjoint', 'spouse email']),
            spouseIuc: findIdx(['iuc ou crp - conjoint', 'spouse iuc']),
            childCount: findIdx(['nombre d\'enfant', 'children count']),
            childDob: findIdx(['naissance des enfants', 'children birth']),
            childNames: findIdx(['nom complet des enfants', 'children names']),
            prov: findIdx(['province choisie', 'chosen province']),
            destChange: findIdx(['changement de destination', 'destination change']),
            city: findIdx(['ville choisie', 'chosen city']),
            arrApp: findIdx(['arrivée – approximative', 'arrival approx']),
            arrConf: findIdx(['arrivée – confirmée', 'arrival confirmed']),
            reason: findIdx(['raison du choix', 'establishment reason', 'reason for choice']),
            job: findIdx(['emploi actuel', 'current job']),
            sit: findIdx(['situation d\'emploi actuelle', 'employment status']),
            noc: findIdx(['groupe de profession noc', 'noc group', 'noc actuelle']),
            profAct: findIdx(['groupe de profession actuelle', 'profession group']),
            sitCa: findIdx(['situation d\'emploi envisagée', 'envisagée au canada']),
            profCa: findIdx(['profession envisagée au canada', 'profession group canada']),
            rec: findIdx(['reconnaissance des titres', 'credentials recognition']),
            accred: findIdx(['accréditation avant d\'arriver', 'accreditation before arrival']),
            ede: findIdx(['ede', 'eca']),
            edu: findIdx(['éducation', 'education']),
            spec: findIdx(['spécialisation', 'specialization']),
            fin: findIdx(['date de finalisation', 'training completion']),
            eng: findIdx(['niveau d\'anglais', 'english level']),
            infoEng: findIdx(['informations supplémentaires pour améliorer mon niveau en anglais', 'english info']),
            fr: findIdx(['niveau de français', 'french level']),
            infoFr: findIdx(['informations supplémentaires pour améliorer mon niveau en français', 'french info']),
            src: findIdx(['canal', 'referral source', 'source']),
            marketing: findIdx(['consentement à recevoir des courriels', 'marketing consent', 'consentement marketing']),
            approved: findIdx(['est approuvé', 'is approved', 'compte approuvé']),
            profile: findIdx(['profil complété', 'profile completed', 'statut du profil']),
            inboundRefDate: findIdx(['date de référencement', 'referral date', 'référé le'])
          };

          // Validation immédiate des colonnes vitales
          if (idx.fn === -1 || idx.ln === -1) {
            const missing = [];
            if (idx.fn === -1) missing.push("Prénom");
            if (idx.ln === -1) missing.push("Nom");
            throw new Error(`Colonnes obligatoires manquantes dans le fichier Excel : ${missing.join(', ')}. Vérifiez l'en-tête de votre fichier.`);
          }

          const formatDate = (val: any) => {
            if (!val) return null;
            if (val instanceof Date && !isNaN(val.getTime())) return val.toISOString().split('T')[0];
            if (typeof val === 'string') {
              const clean = val.trim();
              if (clean.match(/^\d{4}-\d{2}-\d{2}$/)) return clean;
              const d = new Date(clean);
              if (!isNaN(d.getTime())) return d.toISOString().split('T')[0];
            }
            return null;
          };

          const getValue = (row: any[], index: number) => {
            if (index === -1 || row[index] === undefined || row[index] === null) return null;
            return row[index].toString().trim();
          };

          const BATCH_SIZE = 100;
          let currentBatch: Client[] = [];
          let totalImported = 0;

          for (let i = 0; i < rows.length; i++) {
            const row = rows[i];
            
            // On utilise les index dynamiques
            const firstName = getValue(row, idx.fn);
            const lastName = getValue(row, idx.ln);

            if (!firstName || !lastName) continue; 

            const newClient: Partial<Client> = {
              clientCode: getValue(row, idx.code),
              registrationDate: formatDate(row[idx.reg]),
              firstName,
              lastName,
              birthDate: formatDate(row[idx.dob]),
              gender: getValue(row, idx.gender),
              residenceCountry: getValue(row, idx.res),
              birthCountry: getValue(row, idx.birthCountry),
              iucCrpNumber: getValue(row, idx.iuc),
              email: getValue(row, idx.email) || '',
              phoneNumber: getValue(row, idx.tel),
              participatedImmigrationProgram: getValue(row, idx.prog),
              immigrationType: getValue(row, idx.immType),
              linkedAccount: getValue(row, idx.account),
              mainApplicant: getValue(row, idx.main),
              spouseFullName: getValue(row, idx.spouseFn),
              spouseBirthDate: formatDate(row[idx.spouseDob]),
              spouseEmail: getValue(row, idx.spouseEmail),
              spouseIucCrpNumber: getValue(row, idx.spouseIuc),
              childrenCount: parseInt(getValue(row, idx.childCount) || '0') || 0,
              childrenBirthDates: getValue(row, idx.childDob),
              childrenFullNames: getValue(row, idx.childNames),
              chosenProvince: getValue(row, idx.prov),
              destinationChange: getValue(row, idx.destChange),
              chosenCity: getValue(row, idx.city),
              arrivalDateApprox: formatDate(row[idx.arrApp]),
              arrivalDateConfirmed: formatDate(row[idx.arrConf]),
              establishmentReason: getValue(row, idx.reason),
              currentJob: getValue(row, idx.job),
              currentEmploymentStatus: getValue(row, idx.sit),
              currentNocGroup: getValue(row, idx.noc),
              currentProfessionGroup: getValue(row, idx.profAct),
              intendedEmploymentStatusCanada: getValue(row, idx.sitCa),
              intendedProfessionGroupCanada: getValue(row, idx.profCa),
              intentionCredentialsRecognition: getValue(row, idx.rec),
              intentionAccreditationBeforeArrival: getValue(row, idx.accred),
              doneEca: getValue(row, idx.ede),
              educationLevel: getValue(row, idx.edu),
              specialization: getValue(row, idx.spec),
              trainingCompletionDate: formatDate(row[idx.fin]),
              englishLevel: getValue(row, idx.eng),
              wantEnglishInfo: getValue(row, idx.infoEng),
              frenchLevel: getValue(row, idx.fr),
              wantFrenchInfo: getValue(row, idx.infoFr),
              referralSource: getValue(row, idx.src),
              marketingConsent: getValue(row, idx.marketing),
              isApproved: getValue(row, idx.approved),
              isProfileCompleted: getValue(row, idx.profile),
              inboundReferralDate: formatDate(row[idx.inboundRefDate]),
              referralDate: null, // Initialement vide pour un nouveau client
              
              // Fallbacks compatibilité
              originCountry: getValue(row, idx.birthCountry) || getValue(row, idx.res) || 'Inconnu',
              profession: getValue(row, idx.profAct) || getValue(row, idx.job) || 'Non spécifié',
              destinationCity: getValue(row, idx.city) || 'À déterminer',
              arrivalDate: formatDate(row[idx.arrConf]) || formatDate(row[idx.arrApp]) || new Date().toISOString().split('T')[0],
              status: ReferralStatus.PENDING,
              needs: [],
              consentShared: false,
              consentExternalReferral: false,
              isUnsubscribed: false
            };

            if (i === 0) console.log("Diagnostic Premier Client Mappé:", newClient);

            currentBatch.push(newClient as Client);

            if (currentBatch.length === BATCH_SIZE || i === rows.length - 1) {
              await onBulkAddClients(currentBatch);
              totalImported += currentBatch.length;
              currentBatch = [];
            }
          }

          alert(`${totalImported} dossiers importés avec succès par lots.`);
        } catch (err: any) {
          console.error("Erreur d'importation détaillée:", err);
          alert("ERREUR D'IMPORTATION : " + (err.message || "Erreur de format inconnue."));
        } finally {
          setIsImporting(false);
          if (fileInputRef.current) fileInputRef.current.value = '';
        }
      };

      reader.readAsBinaryString(file);
    }
  };

  const handleManualAdd = (e: React.FormEvent<HTMLFormElement>) => {
    e.preventDefault();
    const formData = new FormData(e.currentTarget);
    const newClient: Client = {
      id: Date.now().toString(),
      firstName: formData.get('firstName') as string,
      lastName: formData.get('lastName') as string,
      email: formData.get('email') as string,
      originCountry: formData.get('originCountry') as string,
      profession: formData.get('profession') as string,
      destinationCity: formData.get('destinationCity') as string,
      arrivalDate: formData.get('arrivalDate') as string,
      needs: [],
      status: ReferralStatus.PENDING,
      consentShared: true,
      notes: []
    };
    onAddClient(newClient);
    setShowAddModal(false);
  };

  const getReliabilityColor = (ratio: number) => {
    if (ratio === 0) return 'text-emerald-500';
    if (ratio < 25) return 'text-amber-500';
    return 'text-red-500';
  };

  return (
    <div className="space-y-4">
      <input type="file" ref={fileInputRef} onChange={onFileChange} className="hidden" accept=".xlsx,.xls,.csv" />
      
      {/* Barre d'outils hiérarchisée (2 lignes) */}
      <div className="slds-card pl-10 pr-6 py-5 space-y-5">
        {/* Ligne 1 : Identification & Actions Primaires */}
        <div className="flex items-center justify-between gap-6">
          <div className="flex items-center gap-3">
            <div className="relative w-48 sm:w-64">
              <Search className="absolute left-3 top-1/2 -translate-y-1/2 text-slds-text-secondary" size={12} />
              <input 
                type="text" 
                placeholder="Rechercher par nom, prénom ou email..." 
                className="slds-input slds-input-compact pl-10 text-[11px]" 
                value={searchTerm} 
                onChange={(e) => setSearchTerm(e.target.value)} 
              />
            </div>
          </div>

          <div className="flex items-center gap-4">
            <div className="flex flex-col items-end">
              <div className="text-[10px] font-black text-slate-400 uppercase tracking-widest leading-none">
                {totalItems} dossiers
              </div>
              {paginatedClients.length > 0 && (() => {
                const latestDate = paginatedClients
                  .map(c => c.registrationDate)
                  .filter((d): d is string => !!d && !isNaN(new Date(d).getTime()))
                  .sort((a, b) => new Date(b!).getTime() - new Date(a!).getTime())[0];
                
                if (latestDate) {
                  const [y, m, d] = latestDate.split('-');
                  return (
                    <div className="text-[8px] font-bold text-slate-400 uppercase tracking-tight mt-1">
                      Dernier import : {`${d}/${m}/${y}`}
                    </div>
                  );
                }
                return null;
              })()}
            </div>

            {activeRole !== UserRole.MENTOR && (
              <div className="flex items-center gap-1.5 border-l border-slds-border pl-4 h-8">
                <button 
                  onClick={handleImportExcel} 
                  disabled={isImporting} 
                  className="slds-button slds-button-neutral !px-3 !py-1 flex items-center gap-1.5 text-[10px] h-full"
                >
                  {isImporting ? <Loader2 size={12} className="animate-spin" /> : <Upload size={12} />}
                  <span>Import</span>
                </button>
                <button 
                  onClick={() => setShowAddModal(true)} 
                  className="slds-button slds-button-brand !px-3 !py-1 flex items-center gap-1.5 text-[10px] h-full"
                >
                  <Plus size={12} /> <span>Nouveau</span>
                </button>
              </div>
            )}
          </div>
        </div>

        {/* Ligne 2 : Les filtres sur une seule ligne dédiée */}
        <div className="flex items-center gap-4 pt-2 border-t border-slds-border/50">
          <div className="flex items-center gap-1 text-slds-text-secondary mr-2">
            <Filter size={10} />
            <span className="text-[9px] font-black uppercase tracking-tighter">Filtres</span>
          </div>

          <select 
            className="slds-input slds-input-compact w-auto text-[10px] h-7 min-w-[100px]"
            value={filterStatus}
            onChange={(e) => setFilterStatus(e.target.value as any)}
          >
            <option value="ALL">Tous Statuts</option>
            <option value={ReferralStatus.PENDING}>En attente</option>
            <option value={ReferralStatus.REFERRED}>Référé</option>
            <option value={ReferralStatus.ACKNOWLEDGED}>Pris en charge</option>
            <option value={ReferralStatus.CONTACTED}>Contacté</option>
            <option value={ReferralStatus.IN_PROGRESS}>En cours</option>
            <option value={ReferralStatus.CLOSED}>Terminé</option>
          </select>

          <select 
            className="slds-input slds-input-compact w-auto text-[10px] h-7"
            value={filterCity}
            onChange={(e) => setFilterCity(e.target.value)}
          >
            <option value="ALL">Toutes Villes</option>
            {uniqueCities.map(city => <option key={city} value={city}>{city}</option>)}
          </select>

          <select 
            className="slds-input slds-input-compact w-auto text-[10px] h-7"
            value={filterCountry}
            onChange={(e) => setFilterCountry(e.target.value)}
          >
            <option value="ALL">Tous Pays</option>
            {uniqueCountries.map(c => <option key={c} value={c}>{c}</option>)}
          </select>

          <select 
            className="slds-input slds-input-compact w-auto text-[10px] h-7"
            value={filterSessionsRange}
            onChange={(e) => setFilterSessionsRange(e.target.value as any)}
          >
            <option value="ALL">Nb. Séances (Tous)</option>
            <option value="0">Aucune séance</option>
            <option value="1-5">1 à 5 séances</option>
            <option value="5+">Plus de 5 séances</option>
          </select>

          {(searchTerm || filterStatus !== 'ALL' || filterCity !== 'ALL' || filterCountry !== 'ALL' || filterSessionsRange !== 'ALL' || filterStartDate || filterEndDate) && (
            <button 
              onClick={resetFilters}
              className="text-[9px] font-black text-slds-brand px-1 hover:underline uppercase"
            >
              Réinitialiser
            </button>
          )}
        </div>

        {/* Ligne 3 : Filtre par date d'arrivée */}
        <div className="flex items-center gap-3 pt-3 border-t border-slds-border/50">
          <div className="flex items-center gap-1 text-slds-text-secondary mr-2">
            <Calendar size={10} />
            <span className="text-[9px] font-black uppercase tracking-tighter">Arrivée pévue entre :</span>
          </div>

          <div className="flex items-center gap-2">
            <input 
              type="date" 
              className="slds-input slds-input-compact w-auto text-[10px] h-7"
              value={filterStartDate}
              onChange={(e) => setFilterStartDate(e.target.value)}
            />
            <span className="text-[9px] font-black uppercase text-slate-400">et</span>
            <input 
              type="date" 
              className="slds-input slds-input-compact w-auto text-[10px] h-7"
              value={filterEndDate}
              onChange={(e) => setFilterEndDate(e.target.value)}
            />
          </div>
        </div>
      </div>

      {/* Table SLDS */}
      <div className="slds-card overflow-hidden">
        <div className="overflow-x-auto">
          <table className="slds-table">
            <thead>
              <tr>
                <th>Client</th>
                <th>Contact</th>
                <th className="text-center">Statut</th>
                <th>Localisation</th>
                <th>Référé le</th>
                <th></th>
              </tr>
            </thead>
            <tbody>
              {paginatedClients.map(client => {
                const isSecondary = activeRole === UserRole.PARTNER && client.secondaryPartnerIds?.includes(currentPartnerId || '');
                
                return (
                  <tr 
                    key={client.id} 
                    onClick={() => onSelectClient(client)}
                    className="hover:bg-slds-bg cursor-pointer group"
                  >
                    <td className="font-semibold text-slds-brand">
                      <div className="flex items-center gap-3">
                        <div className="w-8 h-8 rounded bg-slds-bg text-slds-text-secondary flex items-center justify-center font-bold text-xs border border-slds-border">
                          {client.firstName[0]}{client.lastName[0]}
                        </div>
                        <div>
                          <div className="flex items-center gap-2">
                            <span>{client.firstName} {client.lastName}</span>
                            {(() => {
                              const stats = getAttendanceStats(client.id);
                              if (!stats) return (
                                <span className="px-1.5 py-0.5 rounded-full text-[9px] font-bold bg-slate-50 text-slate-400 border border-slate-100">
                                  0 séance
                                </span>
                              );
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
                            {isSecondary && (
                              <span className="px-1.5 py-0.5 rounded bg-purple-100 text-purple-700 text-[9px] font-bold uppercase border border-purple-200">
                                Secondaire
                              </span>
                            )}
                          </div>
                          <p className="text-[10px] text-slds-text-secondary font-normal uppercase mt-0.5">{client.profession}</p>
                        </div>
                      </div>
                    </td>
                    <td className="text-xs text-slds-text-primary">
                      {client.email}
                    </td>
                    <td className="text-center">
                      {client.status === ReferralStatus.PENDING ? (
                        <span
                          className="inline-flex items-center gap-1.5 px-2.5 py-0.5 rounded-full text-[10px] font-bold uppercase tracking-tight border whitespace-nowrap"
                          style={{
                            backgroundColor: '#f1f5f9',
                            color: '#475569',
                            borderColor: '#cbd5e1',
                          }}
                        >
                          <Clock size={9} className="shrink-0" />
                          En attente
                        </span>
                      ) : (
                        <span className={`inline-flex items-center gap-1.5 px-2.5 py-0.5 rounded-full text-[10px] font-bold uppercase tracking-tight border ${STATUS_COLORS[client.status]}`}>
                          {client.status.replace(/_/g, ' ')}
                        </span>
                      )}
                    </td>
                    <td>
                      <div className="text-xs font-semibold text-slds-text-primary">
                        {client.destinationCity}
                      </div>
                      <div className="text-[10px] text-slds-text-secondary uppercase">
                        {client.originCountry}
                      </div>
                    </td>
                    <td className="text-xs text-slds-text-primary">
                      {client.referralDate ? new Date(client.referralDate).toLocaleDateString('fr-FR') : '—'}
                    </td>
                    <td className="text-right">
                      <div className="flex items-center justify-end gap-2">
                        {activeRole === UserRole.ADMIN && onDeleteClient && (
                          <button 
                            onClick={(e) => {
                              e.stopPropagation();
                              setClientToDelete(client.id);
                            }}
                            className="p-1 px-2 text-slds-text-secondary hover:text-red-600 hover:bg-red-50 rounded transition-colors"
                            title="Supprimer le client"
                          >
                            <Trash2 size={14} />
                          </button>
                        )}
                        <ChevronRight size={16} className="text-slds-text-secondary opacity-0 group-hover:opacity-100 transition-opacity" />
                      </div>
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>
          
          {paginatedClients.length === 0 && (
            <div className="py-12 text-center">
              <Database size={48} className="mx-auto text-slds-border mb-3" />
              <h3 className="text-slds-text-primary font-bold text-sm">Aucun résultat trouvé</h3>
              <p className="text-slds-text-secondary text-xs mt-1">Ajustez vos filtres ou effectuez une nouvelle recherche.</p>
            </div>
          )}
        </div>

        {/* Pagination UI */}
        <Pagination 
          currentPage={currentPage}
          totalPages={totalPages}
          onPageChange={setCurrentPage}
          totalItems={totalItems}
          itemsPerPage={itemsPerPage}
          label="dossiers"
        />
      </div>

      {/* Modal SLDS */}
      {showAddModal && (
        <div className="fixed inset-0 bg-black/50 z-[200] flex items-center justify-center p-4">
          <div className="bg-white rounded shadow-2xl w-full max-w-2xl overflow-hidden">
            <div className="p-4 border-b border-slds-border flex justify-between items-center bg-slds-bg">
              <h3 className="text-base font-bold text-slds-text-primary">Nouveau Dossier</h3>
              <button 
                onClick={() => setShowAddModal(false)} 
                className="p-1 hover:bg-white rounded text-slds-text-secondary"
              >
                <X size={18} />
              </button>
            </div>

            <form onSubmit={handleManualAdd}>
              <div className="p-6 space-y-4 max-h-[70vh] overflow-y-auto">
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  <div className="space-y-1">
                    <label className="text-xs font-semibold text-slds-text-secondary">Prénom</label>
                    <input name="firstName" required className="slds-input" />
                  </div>
                  <div className="space-y-1">
                    <label className="text-xs font-semibold text-slds-text-secondary">Nom</label>
                    <input name="lastName" required className="slds-input" />
                  </div>
                </div>

                <div className="space-y-1">
                  <label className="text-xs font-semibold text-slds-text-secondary">Adresse Courriel</label>
                  <input name="email" type="email" required className="slds-input" />
                </div>

                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  <div className="space-y-1">
                    <label className="text-xs font-semibold text-slds-text-secondary">Pays d'origine</label>
                    <input name="originCountry" required className="slds-input" />
                  </div>
                  <div className="space-y-1">
                    <label className="text-xs font-semibold text-slds-text-secondary">Profession</label>
                    <input name="profession" required className="slds-input" />
                  </div>
                </div>

                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  <div className="space-y-1">
                    <label className="text-xs font-semibold text-slds-text-secondary">Ville de destination</label>
                    <input name="destinationCity" required className="slds-input" />
                  </div>
                  <div className="space-y-1">
                    <label className="text-xs font-semibold text-slds-text-secondary">Date d'arrivée prévue</label>
                    <input name="arrivalDate" type="date" required className="slds-input" />
                  </div>
                </div>
              </div>

              <div className="p-4 bg-slds-bg border-t border-slds-border flex justify-end gap-3">
                <button 
                  type="button" 
                  onClick={() => setShowAddModal(false)} 
                  className="slds-button slds-button-neutral"
                >
                  Annuler
                </button>
                <button 
                  type="submit" 
                  className="slds-button slds-button-brand"
                >
                  Enregistrer
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* Confirmation de suppression */}
      <ConfirmModal 
        isOpen={!!clientToDelete}
        title="Supprimer le dossier client"
        message="Êtes-vous certain de vouloir supprimer définitivement ce dossier client ? Cette action est irréversible et supprimera également l'historique associé."
        confirmLabel="Supprimer"
        cancelLabel="Annuler"
        onConfirm={() => {
          if (clientToDelete && onDeleteClient) {
            onDeleteClient(clientToDelete);
            setClientToDelete(null);
          }
        }}
        onCancel={() => setClientToDelete(null)}
        isDestructive={true}
      />
    </div>
  );
};

export default ClientList;
