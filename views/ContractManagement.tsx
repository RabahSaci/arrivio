
import React, { useState, useMemo } from 'react';
import { Contract, Session, SessionCategory, FacilitatorType, SessionType, Partner, PartnerType, UserRole, ContractSignatureStatus, CONTRACT_SIGNATURE_STATUS_LABELS } from '../types';
import { SESSION_TYPE_LABELS } from '../constants';
import ConfirmModal from '../components/ConfirmModal';
import { 
  FileText, 
  Wallet, 
  FileCheck, 
  CheckCircle2, 
  Clock, 
  Filter, 
  TrendingUp,
  Receipt,
  Send,
  CreditCard,
  UserCheck,
  Plus,
  X,
  DollarSign,
  Tag,
  FilePlus2,
  Calendar,
  Info,
  Trash2,
  PieChart,
  Edit2,
  AlertTriangle
} from 'lucide-react';

interface ContractManagementProps {
  contracts: Contract[];
  sessions: Session[];
  partners: Partner[];
  activeRole: UserRole;
  onUpdateSession: (session: Session) => void;
  onAddContract: (contract: Partial<Contract>) => void;
  onUpdateContract: (contract: Contract) => void;
  onDeleteContract: (id: string) => void;
  onAddSession: (session: Session) => void;
  onDeleteSession: (sessionId: string) => void;
}

const ContractManagement: React.FC<ContractManagementProps> = ({ 
  contracts, 
  sessions, 
  partners, 
  activeRole,
  onUpdateSession, 
  onAddContract, 
  onUpdateContract,
  onDeleteContract,
  onAddSession,
  onDeleteSession 
}) => {
  const [filterConsultant, setFilterConsultant] = useState('ALL');
  const [filterInvoiceStatus, setFilterInvoiceStatus] = useState<'ALL' | 'RECEIVED' | 'SUBMITTED' | 'PAID'>('ALL');
  const [showAddContractModal, setShowAddContractModal] = useState(false);
  const [editingContract, setEditingContract] = useState<Contract | null>(null);
  const [showAddInvoiceModal, setShowAddInvoiceModal] = useState<Contract | null>(null);
  const [selectedContractId, setSelectedContractId] = useState<string | null>(null);
  const [filterSignatureStatus, setFilterSignatureStatus] = useState<'ALL' | ContractSignatureStatus>('ALL');
  const [contractToDelete, setContractToDelete] = useState<string | null>(null);
  const [sessionToDelete, setSessionToDelete] = useState<string | null>(null);
  // État local pour les montants en cours de saisie (pour éviter les lags réseau à chaque caractère)
  const [localAmounts, setLocalAmounts] = useState<Record<string, string>>({});

  // Synchroniser les montants locaux avec les props quand les données arrivent du serveur
  React.useEffect(() => {
    setLocalAmounts(prev => {
      const next = { ...prev };
      let hasChanged = false;
      Object.keys(next).forEach(id => {
        const session = sessions.find(s => s.id === id);
        if (session) {
          const propVal = (session.invoiceAmount || 0).toString();
          const localVal = next[id];
          // Si la valeur du serveur est identique à ce qu'on a saisi (numériquement), on peut libérer l'état local
          if (parseFloat(propVal) === parseFloat(localVal)) {
            delete next[id];
            hasChanged = true;
          }
        }
      });
      return hasChanged ? next : prev;
    });
  }, [sessions]);

  const isAdminOrManager = activeRole === UserRole.ADMIN || activeRole === UserRole.MANAGER;

  const consultantPartners = useMemo(() => {
    return partners.filter(p => p.type === PartnerType.CONSULTANT);
  }, [partners]);

  const consultantSessions = useMemo(() => {
    return sessions.filter(s => 
      s.category === SessionCategory.GROUP && 
      s.facilitatorType === FacilitatorType.CONSULTANT
    );
  }, [sessions]);

  const filteredSessions = useMemo(() => {
    return consultantSessions.filter(s => {
      // Prioritize filtering by contractId if a specific contract is selected
      if (selectedContractId) {
        return s.contractId === selectedContractId;
      }
      if (showAddInvoiceModal) {
        return s.contractId === showAddInvoiceModal.id;
      }
      
      const matchConsultant = filterConsultant === 'ALL' || s.facilitatorName === filterConsultant;
      const matchStatus = 
        filterInvoiceStatus === 'ALL' ||
        (filterInvoiceStatus === 'RECEIVED' && s.invoiceReceived && !s.invoiceSubmitted) ||
        (filterInvoiceStatus === 'SUBMITTED' && s.invoiceSubmitted && !s.invoicePaid) ||
        (filterInvoiceStatus === 'PAID' && s.invoicePaid);
      return matchConsultant && matchStatus;
    });
  }, [consultantSessions, filterConsultant, filterInvoiceStatus, showAddInvoiceModal, selectedContractId]);

  const filteredContracts = useMemo(() => {
    return contracts.filter(c => {
      const matchSignature = filterSignatureStatus === 'ALL' || c.signatureStatus === filterSignatureStatus;
      return matchSignature;
    });
  }, [contracts, filterSignatureStatus]);

  const financials = useMemo(() => {
    const totalGlobalBudget = contracts.reduce((acc, c) => acc + (c.amount || 0), 0);
    const totalInvoiced = consultantSessions.reduce((acc, s) => acc + (s.invoiceAmount || 0), 0);
    const totalPaid = consultantSessions.filter(s => s.invoicePaid).reduce((acc, s) => acc + (s.invoiceAmount || 0), 0);
    const forecastBalance = totalGlobalBudget - totalPaid;
    return { totalGlobalBudget, totalInvoiced, totalPaid, forecastBalance };
  }, [contracts, consultantSessions]);

  const togglePaymentFlag = (session: Session, field: 'invoiceReceived' | 'invoiceSubmitted' | 'invoicePaid') => {
    onUpdateSession({ ...session, [field]: !session[field] });
  };

  const handleUpdateSessionAmount = (session: Session, amountString: string) => {
    const amount = amountString === '' ? 0 : parseFloat(amountString);
    if (isNaN(amount) && amountString !== '') return; 
    onUpdateSession({ ...session, invoiceAmount: amount });
  };

  const handleContractSubmit = (e: React.FormEvent<HTMLFormElement>) => {
    e.preventDefault();
    const formData = new FormData(e.currentTarget);
    const contractData: Partial<Contract> = {
      consultantName: formData.get('consultantName') as string,
      totalSessions: parseInt(formData.get('totalSessions') as string),
      startDate: formData.get('startDate') as string,
      endDate: formData.get('endDate') as string,
      status: formData.get('status') as any || 'ACTIVE',
      amount: parseFloat(formData.get('amount') as string) || 0,
      serviceType: formData.get('serviceType') as string,
      signatureStatus: formData.get('signatureStatus') as ContractSignatureStatus
    };
    if (editingContract) onUpdateContract({ ...editingContract, ...contractData as Contract });
    else onAddContract(contractData);
    setShowAddContractModal(false);
    setEditingContract(null);
  };

  const handleCreateInvoice = (e: React.FormEvent<HTMLFormElement>) => {
    e.preventDefault();
    if (!showAddInvoiceModal) return;
    const formData = new FormData(e.currentTarget);
    const invoiceSession: Session = {
      id: `inv-${Date.now()}`,
      title: formData.get('title') as string,
      type: SessionType.RTCE,
      category: SessionCategory.GROUP,
      date: formData.get('date') as string,
      startTime: "09:00",
      duration: 0,
      participantIds: [],
      noShowIds: [],
      location: "Facturation Directe",
      notes: `Prestation facturée sur contrat : ${showAddInvoiceModal.id}`,
      facilitatorName: showAddInvoiceModal.consultantName,
      facilitatorType: FacilitatorType.CONSULTANT,
      advisorName: "Système",
      contractId: showAddInvoiceModal.id,
      needsInterpretation: false,
      invoiceReceived: true,
      invoiceSubmitted: false,
      invoicePaid: false,
      invoiceAmount: parseFloat(formData.get('amount') as string) || 0
    };
    onAddSession(invoiceSession);
    setShowAddInvoiceModal(null);
  };

  return (
    <div className="space-y-8 animate-in fade-in duration-500">
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        <div className="lg:col-span-2 space-y-4">
          <div className="flex justify-between items-center">
            <h3 className="text-sm font-black text-slate-400 uppercase tracking-widest flex items-center gap-2">
              <TrendingUp size={16} /> Analyse des Engagements
            </h3>
            <div className="flex items-center gap-3">
              <div className="flex items-center gap-2 bg-slate-50 px-3 py-1.5 rounded-xl border border-slate-100">
                <Filter size={12} className="text-slate-400" />
                <select 
                  value={filterSignatureStatus}
                  onChange={(e) => setFilterSignatureStatus(e.target.value as any)}
                  className="bg-transparent border-none text-[10px] font-black uppercase text-slate-500 focus:ring-0 cursor-pointer p-0 pr-6"
                >
                  <option value="ALL">Toutes signatures</option>
                  {Object.entries(CONTRACT_SIGNATURE_STATUS_LABELS).map(([value, label]) => (
                    <option key={value} value={value}>{label}</option>
                  ))}
                </select>
              </div>
              {isAdminOrManager && (
                <button onClick={() => { setEditingContract(null); setShowAddContractModal(true); }} className="slds-button slds-button-brand !bg-indigo-600 !shadow-indigo-100">
                  <Plus size={14} className="mr-2" /> Nouveau Contrat
                </button>
              )}
            </div>
          </div>
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            {filteredContracts.map(contract => {
              // Calcul dynamique du solde basé sur les séances réelles liées
              const actualUsedSessions = sessions.filter(s => s.contractId === contract.id).length;
              const percentage = Math.round((actualUsedSessions / contract.totalSessions) * 100);
              const isAlert = percentage >= 90;
              const isSelected = selectedContractId === contract.id;
              
              return (
                <div 
                  key={contract.id} 
                  onClick={() => setSelectedContractId(isSelected ? null : contract.id)}
                  className={`group slds-card p-6 cursor-pointer transition-all ${isSelected ? 'ring-2 ring-indigo-500 bg-indigo-50/30' : 'hover:shadow-md'}`}
                >
                  <div className="flex justify-between items-start mb-6">
                    <div className="flex-1 min-w-0">
                      <p className="text-xs font-black text-slds-brand uppercase tracking-tighter truncate">{contract.consultantName}</p>
                      <div className="flex items-center gap-3 mt-1">
                        <h4 className="font-bold text-slate-900 truncate">Contrat #{contract.id.substring(0, 8)}</h4>
                        <div className="flex items-center gap-1 text-[10px] font-bold text-slate-500">
                          <Calendar size={12} className="text-slate-400" />
                          <span>Finit le {new Date(contract.endDate).toLocaleDateString('fr-FR')}</span>
                        </div>
                      </div>
                      {contract.signatureStatus && (
                        <div className={`inline-flex items-center gap-1.5 mt-2 px-2.5 py-1 rounded-full text-[9px] font-black uppercase tracking-widest border shadow-sm ${
                          contract.signatureStatus === 'SIGNE' ? 'bg-emerald-50 text-emerald-600 border-emerald-200' : 
                          contract.signatureStatus === 'PAS_ENCORE_SIGNE' ? 'bg-slate-50 text-slate-400 border-slate-200' : 
                          'bg-amber-50 text-amber-600 border-amber-200'
                        }`}>
                          {contract.signatureStatus === 'SIGNE' ? <CheckCircle2 size={10} /> : <Clock size={10} />}
                          {CONTRACT_SIGNATURE_STATUS_LABELS[contract.signatureStatus]}
                        </div>
                      )}
                    </div>
                    <div className="text-right">
                       <p className="text-lg font-black text-slate-900 leading-none">{contract.amount.toLocaleString()} $</p>
                       <p className="text-[8px] font-black text-slate-400 uppercase tracking-widest mt-1">Budget</p>
                    </div>
                  </div>
                  
                  <div className="space-y-4">
                    <div className="space-y-2">
                      <div className="flex justify-between text-[10px] font-black uppercase tracking-widest text-slate-400">
                        <span className={isAlert ? 'text-red-500' : ''}>Utilisation : {percentage}%</span>
                        <span className="font-bold text-slate-700">{actualUsedSessions} / {contract.totalSessions}</span>
                      </div>
                      <div className="w-full h-1.5 bg-slate-100 rounded-full overflow-hidden">
                        <div className={`h-full transition-all duration-1000 ${isAlert ? 'bg-red-500' : 'bg-emerald-500'}`} style={{ width: `${Math.min(100, percentage)}%` }} />
                      </div>
                    </div>

                    <div className="flex gap-2">
                      <button onClick={() => setShowAddInvoiceModal(contract)} className="flex-1 py-2 bg-slate-50 border border-slate-200 rounded-xl text-[9px] font-black uppercase tracking-widest text-slate-600 hover:bg-indigo-50 hover:text-indigo-600 transition-all">
                        Imputer Prestation
                      </button>
                      {isAdminOrManager && (
                        <div className="flex gap-1 opacity-0 group-hover:opacity-100 transition-opacity">
                          <button onClick={() => { setEditingContract(contract); setShowAddContractModal(true); }} className="p-2 text-slate-300 hover:text-blue-500 hover:bg-blue-50 rounded-xl"><Edit2 size={16} /></button>
                          <button onClick={() => setContractToDelete(contract.id)} className="p-2 text-slate-300 hover:text-red-500 hover:bg-red-50 rounded-xl"><Trash2 size={16} /></button>
                        </div>
                      )}
                    </div>
                  </div>
                </div>
              );
            })}
          </div>
        </div>

        <div className="bg-slate-900 rounded-[32px] p-8 text-white shadow-xl flex flex-col justify-between">
          <div className="space-y-6">
            <div className="flex justify-between items-start">
              <div className="w-12 h-12 bg-slds-brand rounded-2xl flex items-center justify-center">
                <Wallet size={24} />
              </div>
              <div className="text-right">
                <p className="text-[9px] font-black text-blue-400 uppercase tracking-widest">Budget Total</p>
                <p className="text-2xl font-black">{financials.totalGlobalBudget.toLocaleString()} $</p>
              </div>
            </div>
            <div className="grid grid-cols-2 gap-3">
              <div className="bg-white/5 p-4 rounded-2xl border border-white/10">
                <p className="text-[9px] font-black text-slate-400 uppercase tracking-widest">Facturé</p>
                <p className="text-lg font-bold">{financials.totalInvoiced.toLocaleString()} $</p>
              </div>
              <div className="bg-white/5 p-4 rounded-2xl border border-white/10">
                <p className="text-[9px] font-black text-emerald-400 uppercase tracking-widest">Payé</p>
                <p className="text-lg font-bold">{financials.totalPaid.toLocaleString()} $</p>
              </div>
            </div>
          </div>
        </div>
      </div>
      
      {/* Table de suivi facturation */}
      <div className="slds-card">
        <div className="overflow-x-auto">
          <table className="slds-table">
            <thead>
              <tr>
                <th className="p-4">Prestation / Séance</th>
                <th className="p-4">Prestataire</th>
                <th className="p-4">Montant ($)</th>
                <th className="p-4 text-center">Reçue</th>
                <th className="p-4 text-center">Soumise</th>
                <th className="p-4 text-center">Payée</th>
                <th className="p-4 text-right">Actions</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-50">
              {filteredSessions.map(session => (
                <tr key={session.id} className="hover:bg-slate-50/50 transition-colors">
                  <td className="p-4">
                    <div className="flex flex-col">
                      <span className="text-xs font-bold text-slate-900">{session.title}</span>
                      <span className="text-[9px] text-slate-400 font-bold">
                        {session.date.split('-').reverse().join('/')}
                      </span>
                    </div>
                  </td>
                  <td className="p-4"><span className="text-xs font-bold text-slate-700">{session.facilitatorName}</span></td>
                  <td className="p-4">
                    <div className="relative group/input">
                      <input 
                        type="number" 
                        step="0.01"
                        value={localAmounts[session.id] !== undefined ? localAmounts[session.id] : (session.invoiceAmount || '').toString()} 
                        onChange={(e) => setLocalAmounts(prev => ({ ...prev, [session.id]: e.target.value }))}
                        onBlur={() => {
                          if (localAmounts[session.id] !== undefined) {
                            handleUpdateSessionAmount(session, localAmounts[session.id]);
                            // On ne supprime plus immédiatement, l'useEffect s'en chargera quand les props seront à jour
                          }
                        }}
                        onKeyDown={(e) => {
                          if (e.key === 'Enter') {
                            (e.target as HTMLInputElement).blur();
                          }
                        }}
                        className={`w-28 px-3 py-1.5 bg-slate-50 border ${localAmounts[session.id] !== undefined ? 'border-indigo-400 ring-2 ring-indigo-50 bg-white' : 'border-slate-200'} rounded-lg text-xs font-bold transition-all focus:border-indigo-500 focus:ring-4 focus:ring-indigo-50 outline-none`} 
                        placeholder="0.00"
                      />
                      {localAmounts[session.id] !== undefined && (
                        <div className="absolute -top-6 left-0 bg-indigo-600 text-white text-[8px] font-black uppercase px-2 py-1 rounded shadow-lg animate-bounce">
                          Modifié
                        </div>
                      )}
                    </div>
                  </td>
                  <td className="p-4 text-center">
                    <button onClick={() => togglePaymentFlag(session, 'invoiceReceived')} className={`p-2 rounded-xl ${session.invoiceReceived ? 'bg-blue-100 text-slds-brand' : 'bg-slate-100 text-slate-300'}`}><FileCheck size={18} /></button>
                  </td>
                  <td className="p-4 text-center">
                    <div className="relative group/tooltip">
                      <button 
                        onClick={() => togglePaymentFlag(session, 'invoiceSubmitted')} 
                        disabled={!session.invoiceReceived} 
                        className={`p-2 rounded-xl transition-all ${session.invoiceSubmitted ? 'bg-indigo-100 text-indigo-600' : 'bg-slate-100 text-slate-300'} disabled:opacity-50 disabled:cursor-not-allowed`}
                      >
                        <Send size={18} />
                      </button>
                      {!session.invoiceReceived && (
                        <div className="absolute bottom-full left-1/2 -translate-x-1/2 mb-2 px-2 py-1 bg-slate-800 text-white text-[8px] font-bold rounded opacity-0 group-hover/tooltip:opacity-100 transition-opacity whitespace-nowrap pointer-events-none z-10">
                          Marquez comme reçu d'abord
                        </div>
                      )}
                    </div>
                  </td>
                  <td className="p-4 text-center">
                    <button onClick={() => togglePaymentFlag(session, 'invoicePaid')} disabled={!session.invoiceSubmitted} className={`p-2 rounded-xl ${session.invoicePaid ? 'bg-emerald-100 text-slds-success' : 'bg-slate-100 text-slate-300'}`}><CreditCard size={18} /></button>
                  </td>
                  <td className="p-4 text-right">
                    <button onClick={() => setSessionToDelete(session.id)} className="p-2 text-slate-300 hover:text-slds-error"><Trash2 size={16} /></button>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>

      <ConfirmModal isOpen={!!sessionToDelete} title="Supprimer la facture" message="Voulez-vous supprimer cette imputation ? Le quota du contrat sera libéré." confirmLabel="Supprimer" onConfirm={() => { if(sessionToDelete) onDeleteSession(sessionToDelete); setSessionToDelete(null); }} onCancel={() => setSessionToDelete(null)} />
      <ConfirmModal isOpen={!!contractToDelete} title="Supprimer le contrat" message="Action irréversible. Les séances rattachées perdront leur lien contractuel." confirmLabel="Supprimer" onConfirm={() => { if(contractToDelete) onDeleteContract(contractToDelete); setContractToDelete(null); }} onCancel={() => setContractToDelete(null)} />

      {/* Modale Nouveau Contrat */}
      {showAddContractModal && (
        <div className="fixed inset-0 bg-slate-900/60 backdrop-blur-sm z-[200] flex items-center justify-center p-4">
          <div className="bg-white rounded-[40px] w-full max-w-lg shadow-2xl overflow-hidden">
            <div className="p-6 border-b border-slate-100 flex justify-between items-center bg-slate-50/50">
              <h3 className="text-xl font-bold">{editingContract ? 'Modifier' : 'Nouveau'} Contrat</h3>
              <button onClick={() => { setShowAddContractModal(false); setEditingContract(null); }} className="p-2"><X size={20} /></button>
            </div>
            <form onSubmit={handleContractSubmit} className="p-8 space-y-4">
              <div className="grid grid-cols-2 gap-4">
                <div className="col-span-2">
                  <label className="text-[10px] font-black text-slate-400 uppercase tracking-widest">Prestataire</label>
                  <input name="consultantName" required list="consultants-list" defaultValue={editingContract?.consultantName} placeholder="Nom du consultant ou organisme" className="slds-input" />
                  <datalist id="consultants-list">
                    {consultantPartners.map(p => <option key={p.id} value={p.name} />)}
                  </datalist>
                </div>
                <div>
                  <label className="text-[10px] font-black text-slate-400 uppercase tracking-widest">Budget ($)</label>
                  <input type="number" step="0.01" name="amount" required defaultValue={editingContract?.amount} className="slds-input" />
                </div>
                <div>
                  <label className="text-[10px] font-black text-slate-400 uppercase tracking-widest">Quota séances</label>
                  <input type="number" name="totalSessions" required defaultValue={editingContract?.totalSessions || 10} className="slds-input" />
                </div>
                <div className="col-span-2">
                  <label className="text-[10px] font-black text-slate-400 uppercase tracking-widest">Type Prestation</label>
                  <input name="serviceType" required defaultValue={editingContract?.serviceType || 'Webinaire'} className="slds-input" />
                </div>
                <div className="col-span-2">
                  <label className="text-[10px] font-black text-slate-400 uppercase tracking-widest">État de signature</label>
                  <select name="signatureStatus" defaultValue={editingContract?.signatureStatus || 'PAS_ENCORE_SIGNE'} className="slds-input">
                    {Object.entries(CONTRACT_SIGNATURE_STATUS_LABELS).map(([value, label]) => (
                      <option key={value} value={value}>{label}</option>
                    ))}
                  </select>
                </div>
                <div>
                  <label className="text-[10px] font-black text-slate-400 uppercase tracking-widest">Début</label>
                  <input type="date" name="startDate" required defaultValue={editingContract?.startDate} className="slds-input" />
                </div>
                <div>
                  <label className="text-[10px] font-black text-slate-400 uppercase tracking-widest">Fin</label>
                  <input type="date" name="endDate" required defaultValue={editingContract?.endDate} className="slds-input" />
                </div>
              </div>
              <div className="flex justify-end gap-3 pt-4">
                <button type="submit" className="slds-button slds-button-brand !px-12">Valider</button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* Modale Facture Manuelle */}
      {showAddInvoiceModal && (
        <div className="fixed inset-0 bg-slate-900/60 backdrop-blur-sm z-[200] flex items-center justify-center p-4">
          <div className="bg-white rounded-[40px] w-full max-w-lg shadow-2xl overflow-hidden">
            <div className="p-6 border-b border-slate-100 flex justify-between items-center bg-slate-50/50">
              <h3 className="text-xl font-bold">Nouvelle Imputation Facture</h3>
              <button onClick={() => setShowAddInvoiceModal(null)} className="p-2"><X size={20} /></button>
            </div>
            <form onSubmit={handleCreateInvoice} className="p-8 space-y-4">
              <div className="space-y-4">
                <div>
                  <label className="text-[10px] font-black text-slate-400 uppercase tracking-widest">Libellé</label>
                  <input name="title" required placeholder="Ex: Support Interprétation Janvier" className="slds-input" />
                </div>
                <div className="grid grid-cols-2 gap-4">
                  <div>
                    <label className="text-[10px] font-black text-slate-400 uppercase tracking-widest">Montant ($)</label>
                    <input type="number" name="amount" required step="0.01" className="slds-input" />
                  </div>
                  <div>
                    <label className="text-[10px] font-black text-slate-400 uppercase tracking-widest">Date</label>
                    <input type="date" name="date" required defaultValue={new Date().toISOString().split('T')[0]} className="slds-input" />
                  </div>
                </div>
              </div>
              <div className="flex justify-end gap-3 pt-4">
                <button type="submit" className="slds-button slds-button-brand !px-12">Enregistrer la facture</button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
};

export default ContractManagement;
