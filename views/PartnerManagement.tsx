
import React, { useState, useMemo } from 'react';
import { Partner, UserRole, PartnerType, Profile } from '../types';
import { PARTNER_TYPE_LABELS, ROLE_LABELS } from '../constants';
import { 
  Building2, 
  Plus, 
  Search, 
  MapPin, 
  X, 
  Loader2, 
  Trash2, 
  UserCog, 
  Briefcase, 
  Edit3, 
  Users,
  Mail,
  Shield,
  CheckCircle2,
  Filter,
  Tag
} from 'lucide-react';
import ConfirmModal from '../components/ConfirmModal';

interface PartnerManagementProps {
  partners: Partner[];
  profiles: Profile[];
  activeRole: UserRole;
  onAddPartner: (partner: Omit<Partner, 'id'>) => Promise<void>;
  onUpdatePartner: (partner: Partner) => Promise<void>;
  onDeletePartner: (id: string) => Promise<void>;
}

const SPECIALTY_OPTIONS = [
  'Emploi', 
  'Etablissement', 
  'Logement', 
  'Formation', 
  'Santé', 
  'Aide Juridique'
];

const PartnerManagement: React.FC<PartnerManagementProps> = ({ partners, profiles, activeRole, onAddPartner, onUpdatePartner, onDeletePartner }) => {
  const [searchTerm, setSearchTerm] = useState('');
  const [filterType, setFilterType] = useState<PartnerType | 'ALL'>('ALL');
  const [filterCity, setFilterCity] = useState<string>('ALL');
  const [filterSpecialty, setFilterSpecialty] = useState<string>('ALL');
  
  const [showModal, setShowModal] = useState(false);
  const [showTeamModal, setShowTeamModal] = useState<Partner | null>(null);
  const [editingPartner, setEditingPartner] = useState<Partner | null>(null);
  const [showDeleteConfirm, setShowDeleteConfirm] = useState(false);
  const [partnerToDelete, setPartnerToDelete] = useState<Partner | null>(null);
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [specialties, setSpecialties] = useState<string[]>([]);

  const isEditable = activeRole === UserRole.ADMIN || activeRole === UserRole.MANAGER;

  // Extraction unique des villes pour le filtre
  const uniqueCities = useMemo(() => {
    return Array.from(new Set(partners.map(p => p.city))).sort();
  }, [partners]);

  const filteredPartners = useMemo(() => {
    return partners.filter(p => {
      const matchSearch = p.name.toLowerCase().includes(searchTerm.toLowerCase()) ||
                          p.city.toLowerCase().includes(searchTerm.toLowerCase());
      const matchType = filterType === 'ALL' || p.type === filterType;
      const matchCity = filterCity === 'ALL' || p.city === filterCity;
      const matchSpecialty = filterSpecialty === 'ALL' || (p.specialties && p.specialties.includes(filterSpecialty));
      
      return matchSearch && matchType && matchCity && matchSpecialty;
    });
  }, [partners, searchTerm, filterType, filterCity, filterSpecialty]);

  const toggleSpecialty = (option: string) => {
    if (specialties.includes(option)) {
      setSpecialties(specialties.filter(s => s !== option));
    } else {
      setSpecialties([...specialties, option]);
    }
  };

  const handleOpenEdit = (partner: Partner) => {
    setEditingPartner(partner);
    setSpecialties(partner.specialties || []);
    setError(null);
    setShowModal(true);
  };

  const handleSubmit = async (e: React.FormEvent<HTMLFormElement>) => {
    e.preventDefault();
    if (!isEditable) return;
    
    setIsLoading(true);
    setError(null);
    const formData = new FormData(e.currentTarget);
    
    const partnerData = {
      name: formData.get('name') as string,
      city: formData.get('city') as string,
      province: formData.get('province') as string,
      type: formData.get('type') as PartnerType,
      specialties: specialties
    };

    try {
      if (editingPartner) {
        await onUpdatePartner({ ...editingPartner, ...partnerData });
      } else {
        await onAddPartner(partnerData);
      }
      setShowModal(false);
      setEditingPartner(null);
      setSpecialties([]);
    } catch (err: any) {
      console.error(err);
      setError(err.message || "Erreur lors de la sauvegarde du partenaire.");
    } finally {
      setIsLoading(false);
    }
  };

  const getPartnerTypeIcon = (type: PartnerType) => {
    switch (type) {
      case PartnerType.INTERNAL: return <Building2 size={24} />;
      case PartnerType.CONSULTANT: return <UserCog size={24} />;
      default: return <Briefcase size={24} />;
    }
  };

  const getPartnerTypeColor = (type: PartnerType) => {
    switch (type) {
      case PartnerType.INTERNAL: return 'bg-blue-50 text-blue-600 border-blue-200';
      case PartnerType.CONSULTANT: return 'bg-amber-50 text-amber-600 border-amber-200';
      default: return 'bg-purple-50 text-purple-600 border-purple-200';
    }
  };

  const getRoleBadgeColor = (role: UserRole) => {
    switch (role) {
      case UserRole.ADMIN: return 'bg-red-50 text-red-600 border-red-100';
      case UserRole.MANAGER: return 'bg-purple-50 text-purple-600 border-purple-100';
      case UserRole.ADVISOR: return 'bg-blue-50 text-blue-600 border-blue-100';
      default: return 'bg-slate-50 text-slate-600 border-slate-100';
    }
  };

  return (
    <div className="space-y-6">
      {/* Barre de Recherche et Filtres */}
      <div className="slds-card p-3 space-y-3">
        <div className="flex flex-col md:flex-row justify-between items-center gap-3">
          <div className="relative w-full md:w-80">
            <Search size={14} className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400" />
            <input 
              type="text" 
              placeholder="Rechercher par nom..."
              className="slds-input slds-input-compact pl-10"
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
            />
          </div>
          {isEditable && (
            <button 
              onClick={() => { setEditingPartner(null); setSpecialties([]); setShowModal(true); }}
              className="slds-button slds-button-brand !px-4 !py-2 w-full md:w-auto"
            >
              <Plus size={14} className="mr-2" /> Ajouter un partenaire
            </button>
          )}
        </div>

        <div className="flex flex-wrap gap-3 items-center pt-2 border-t border-slate-50">
          <div className="flex items-center gap-2">
            <Filter size={12} className="text-slate-300" />
            <span className="text-[10px] font-black text-slate-400 uppercase tracking-widest">Filtres :</span>
          </div>
          
          <select 
            value={filterType}
            onChange={(e) => setFilterType(e.target.value as any)}
            className="slds-input slds-input-compact w-auto"
          >
            <option value="ALL">Types</option>
            {Object.values(PartnerType).map(t => (
              <option key={t} value={t}>{PARTNER_TYPE_LABELS[t]}</option>
            ))}
          </select>

          <select 
            value={filterCity}
            onChange={(e) => setFilterCity(e.target.value)}
            className="slds-input slds-input-compact w-auto"
          >
            <option value="ALL">Villes</option>
            {uniqueCities.map(city => (
              <option key={city} value={city}>{city}</option>
            ))}
          </select>

          <select 
            value={filterSpecialty}
            onChange={(e) => setFilterSpecialty(e.target.value)}
            className="slds-input slds-input-compact w-auto"
          >
            <option value="ALL">Spécialités</option>
            {SPECIALTY_OPTIONS.map(spec => (
              <option key={spec} value={spec}>{spec}</option>
            ))}
          </select>
          
          {(filterType !== 'ALL' || filterCity !== 'ALL' || filterSpecialty !== 'ALL' || searchTerm !== '') && (
            <button 
              onClick={() => { setFilterType('ALL'); setFilterCity('ALL'); setFilterSpecialty('ALL'); setSearchTerm(''); }}
              className="text-[10px] font-black text-slds-brand uppercase hover:underline"
            >
              Reset
            </button>
          )}
        </div>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
        {filteredPartners.map(partner => (
          <div key={partner.id} className="slds-card p-6 hover:shadow-xl transition-all relative group">
            <div className={`absolute top-0 left-0 w-full h-1.5 ${partner.type === PartnerType.INTERNAL ? 'bg-slds-brand' : partner.type === PartnerType.CONSULTANT ? 'bg-amber-500' : 'bg-purple-500'}`} />
            
            <div className="flex items-start justify-between mb-4">
              <div className={`p-4 rounded-2xl transition-colors duration-300 shadow-sm ${getPartnerTypeColor(partner.type)}`}>
                {getPartnerTypeIcon(partner.type)}
              </div>
              <div className="flex flex-col items-end gap-2">
                <span className={`px-2 py-0.5 rounded-lg text-[9px] font-black uppercase tracking-widest border ${getPartnerTypeColor(partner.type)}`}>
                  {PARTNER_TYPE_LABELS[partner.type]}
                </span>
                {isEditable && (
                  <div className="flex gap-1">
                    <button 
                      onClick={(e) => { e.stopPropagation(); setEditingPartner(partner); setShowModal(true); }}
                      className="p-2 text-slate-300 hover:text-blue-500 hover:bg-blue-50 rounded-lg transition-all"
                      title="Modifier"
                    >
                      <Edit3 size={16} />
                    </button>
                    {activeRole === UserRole.ADMIN && (
                      <button 
                        onClick={(e) => { e.stopPropagation(); setPartnerToDelete(partner); setShowDeleteConfirm(true); }}
                        className="p-2 text-slate-300 hover:text-red-500 hover:bg-red-50 rounded-lg transition-all"
                        title="Supprimer"
                      >
                        <Trash2 size={16} />
                      </button>
                    )}
                  </div>
                )}
              </div>
            </div>
            
            <h3 className="font-bold text-slate-900 text-lg mb-1">{partner.name}</h3>
            <div className="flex items-center gap-2 text-slate-500 text-xs font-bold uppercase tracking-tighter mb-4">
              <MapPin size={14} className="text-blue-500" /> {partner.city}, {partner.province}
            </div>

            <div className="space-y-3">
               <p className="text-[9px] font-black text-slate-400 uppercase tracking-widest">Spécialités IRCC</p>
               <div className="flex flex-wrap gap-1.5 min-h-[40px]">
                  {partner.specialties && partner.specialties.length > 0 ? partner.specialties.map(s => (
                    <span key={s} className="px-2.5 py-1 bg-slate-50 border border-slate-100 rounded-lg text-[9px] font-black text-slate-600 uppercase tracking-tight">
                      {s}
                    </span>
                  )) : <span className="text-[9px] text-slate-400 italic">Aucune spécialité définie</span>}
               </div>
            </div>

            <div className="pt-6 mt-6 border-t border-slate-50 flex items-center justify-between">
              <span className="text-[9px] font-black text-slate-300 uppercase tracking-widest">Organisme Partenaire</span>
              <button 
                onClick={() => setShowTeamModal(partner)}
                className="flex items-center gap-1.5 text-blue-600 text-[10px] font-black uppercase tracking-widest hover:underline group-hover:translate-x-1 transition-transform"
              >
                <Users size={12} /> Voir l'équipe
              </button>
            </div>
          </div>
        ))}
        {filteredPartners.length === 0 && (
          <div className="col-span-full py-20 text-center bg-white border border-slate-200 rounded-[40px] border-dashed">
            <Search size={48} className="mx-auto text-slate-100 mb-4" />
            <p className="text-slate-400 font-bold">Aucun partenaire ne correspond aux filtres.</p>
          </div>
        )}
      </div>

      {/* MODALE D'ÉQUIPE */}
      {showTeamModal && (
        <div className="fixed inset-0 bg-slate-900/60 backdrop-blur-sm z-[250] flex items-center justify-center p-4">
          <div className="bg-white rounded-[40px] w-full max-w-2xl shadow-2xl overflow-hidden animate-in zoom-in-95 duration-200">
            <div className="p-8 border-b border-slate-100 flex justify-between items-center bg-slate-50/50">
              <div className="flex items-center gap-4">
                <div className="p-4 bg-blue-600 text-white rounded-2xl shadow-lg shadow-blue-100">
                  <Users size={28} />
                </div>
                <div>
                  <h3 className="text-xl font-black text-slate-900 tracking-tight">Équipe de {showTeamModal.name}</h3>
                  <p className="text-[10px] text-slate-400 font-bold uppercase tracking-widest">{profiles.filter(p => p.partnerId === showTeamModal.id).length} collaborateurs actifs</p>
                </div>
              </div>
              <button onClick={() => setShowTeamModal(null)} className="p-3 hover:bg-slate-200 rounded-full text-slate-400 transition-colors"><X size={20} /></button>
            </div>

            <div className="p-8 space-y-4 max-h-[60vh] overflow-y-auto">
              {profiles.filter(p => p.partnerId === showTeamModal.id).length > 0 ? (
                profiles.filter(p => p.partnerId === showTeamModal.id).map(user => (
                  <div key={user.id} className="flex items-center justify-between p-4 bg-slate-50 border border-slate-100 rounded-2xl">
                    <div className="flex items-center gap-4">
                      <div className="w-10 h-10 rounded-full bg-white border border-slate-200 flex items-center justify-center font-black text-slate-400 text-xs">
                        {user.firstName[0]}{user.lastName[0]}
                      </div>
                      <div>
                        <p className="text-sm font-bold text-slate-900">{user.firstName} {user.lastName}</p>
                        <div className="flex items-center gap-1.5 text-[10px] text-slate-400 font-bold uppercase">
                          <Mail size={10} /> {user.email}
                        </div>
                      </div>
                    </div>
                    <span className={`px-2.5 py-1 rounded-xl text-[9px] font-black border uppercase tracking-widest ${getRoleBadgeColor(user.role as UserRole)}`}>
                      {ROLE_LABELS[user.role as UserRole]}
                    </span>
                  </div>
                ))
              ) : (
                <div className="py-12 text-center bg-slate-50/50 rounded-3xl border border-dashed border-slate-200">
                  <Shield size={48} className="mx-auto text-slate-200 mb-4" />
                  <p className="text-xs font-black text-slate-400 uppercase tracking-widest">Aucun utilisateur rattaché</p>
                  <p className="text-[10px] text-slate-400 mt-2 font-medium">Les administrateurs peuvent rattacher des comptes dans l'onglet Gestion des Comptes.</p>
                </div>
              )}
            </div>

            <div className="p-8 bg-slate-50 border-t border-slate-100 flex justify-end">
               <button onClick={() => setShowTeamModal(null)} className="slds-button slds-button-brand !bg-slate-900 !shadow-slate-200">Fermer la vue</button>
            </div>
          </div>
        </div>
      )}

      {showDeleteConfirm && partnerToDelete && (
        <ConfirmModal
          isOpen={showDeleteConfirm}
          title="Supprimer le Partenaire"
          message={`Êtes-vous sûr de vouloir supprimer le partenaire "${partnerToDelete.name}" ? Cette action est irréversible et supprimera également toutes les affiliations.`}
          confirmLabel="Confirmer la suppression"
          onConfirm={async () => {
            if (partnerToDelete) {
              await onDeletePartner(partnerToDelete.id);
              setShowDeleteConfirm(false);
              setPartnerToDelete(null);
            }
          }}
          onCancel={() => {
            setShowDeleteConfirm(false);
            setPartnerToDelete(null);
          }}
        />
      )}

      {/* MODALE CRÉATION / ÉDITION */}
      {showModal && isEditable && (
        <div className="fixed inset-0 bg-slate-900/60 backdrop-blur-sm z-[200] flex items-center justify-center p-4">
          <div className="bg-white rounded-[40px] w-full max-w-xl shadow-2xl overflow-hidden animate-in zoom-in-95 duration-200">
            <div className="p-6 border-b border-slate-100 flex justify-between items-center bg-slate-50/50">
              <div className="flex items-center gap-3">
                <div className="p-3 bg-blue-600 text-white rounded-2xl shadow-lg shadow-blue-100">
                  <Building2 size={24} />
                </div>
                <div>
                  <h3 className="text-xl font-black text-slate-900 tracking-tight">
                    {editingPartner ? 'Modifier l\'organisme' : 'Nouvel Organisme'}
                  </h3>
                  <p className="text-[10px] text-slate-400 font-bold uppercase tracking-widest">Réseau des partenaires Horizon</p>
                </div>
              </div>
              <button onClick={() => { setShowModal(false); setEditingPartner(null); }} className="p-3 hover:bg-slate-200 rounded-full text-slate-400 transition-colors"><X size={20} /></button>
            </div>

            <form onSubmit={handleSubmit} className="p-8 space-y-6">
              {error && (
                <div className="p-4 bg-red-50 border border-red-200 rounded-2xl flex items-center gap-3 text-red-600 animate-in fade-in slide-in-from-top-2 duration-200">
                  <X size={18} className="shrink-0" />
                  <p className="text-xs font-bold">{error}</p>
                </div>
              )}

              <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                <div className="space-y-1 md:col-span-2">
                  <label className="text-[10px] font-black text-slate-400 uppercase tracking-widest ml-1">Nom de l'organisme</label>
                  <input name="name" required defaultValue={editingPartner?.name} placeholder="Ex: Centre d’accueil et d’intégration..." className="slds-input" />
                </div>
                
                <div className="space-y-1">
                  <label className="text-[10px] font-black text-slate-400 uppercase tracking-widest ml-1">Type de partenaire</label>
                  <select name="type" required defaultValue={editingPartner?.type} className="slds-input">
                    {Object.values(PartnerType).map(t => (
                      <option key={t} value={t}>{PARTNER_TYPE_LABELS[t]}</option>
                    ))}
                  </select>
                </div>

                <div className="space-y-1">
                  <label className="text-[10px] font-black text-slate-400 uppercase tracking-widest ml-1">Ville</label>
                  <input name="city" required defaultValue={editingPartner?.city} placeholder="Ex: Toronto" className="slds-input" />
                </div>

                <div className="space-y-1">
                  <label className="text-[10px] font-black text-slate-400 uppercase tracking-widest ml-1">Province</label>
                  <input name="province" defaultValue={editingPartner?.province || 'Ontario'} required className="slds-input" />
                </div>
              </div>

              <div className="space-y-3">
                <label className="text-[10px] font-black text-slate-400 uppercase tracking-widest ml-1">Domaines d'expertise / Spécialités</label>
                <div className="grid grid-cols-2 gap-3 pt-2">
                   {SPECIALTY_OPTIONS.map((option) => (
                     <button
                       key={option}
                       type="button"
                       onClick={() => toggleSpecialty(option)}
                       className={`flex items-center justify-center gap-2 px-4 py-3 rounded-2xl text-[10px] font-black uppercase tracking-widest border transition-all duration-200 ${
                         specialties.includes(option)
                           ? 'bg-blue-600 text-white border-blue-600 shadow-lg shadow-blue-100'
                           : 'bg-slate-50 text-slate-500 border-slate-100 hover:border-slate-300'
                       }`}
                     >
                       {specialties.includes(option) && <CheckCircle2 size={14} />}
                       {option}
                     </button>
                   ))}
                </div>
                {specialties.length === 0 && <p className="text-[10px] text-slate-400 font-bold italic text-center mt-2">Veuillez sélectionner au moins une spécialité.</p>}
              </div>

              <div className="flex justify-end gap-3 pt-6 border-t border-slate-100">
                <button type="button" onClick={() => { setShowModal(false); setEditingPartner(null); }} className="px-8 py-3 text-[10px] font-black text-slate-400 uppercase tracking-widest hover:text-slate-800 transition-colors">Annuler</button>
                <button type="submit" disabled={isLoading || specialties.length === 0} className="slds-button slds-button-brand !px-12">
                  {isLoading ? <Loader2 size={16} className="animate-spin mr-2" /> : editingPartner ? 'Mettre à jour' : 'Créer l\'organisme'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
};

export default PartnerManagement;
