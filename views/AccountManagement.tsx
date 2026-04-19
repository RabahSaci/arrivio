import React, { useState, useMemo } from 'react';
import { Profile, UserRole, Partner, PartnerType } from '../types';
import { ROLE_LABELS } from '../constants';
import { ShieldCheck, UserPlus, Search, Edit2, Building2, Mail, X, Loader2, Key, Info, Fingerprint, Lock, Filter, ChevronRight, User, Hash } from 'lucide-react';

interface AccountManagementProps {
  profiles: Profile[];
  partners: Partner[];
  onUpdateProfile: (profile: Profile) => Promise<void>;
  onAddProfile: (profile: Omit<Profile, 'id'> & { password?: string, manualId?: string }) => Promise<void>;
}

const AccountManagement: React.FC<AccountManagementProps> = ({ profiles, partners, onUpdateProfile, onAddProfile }) => {
  const [searchTerm, setSearchTerm] = useState('');
  const [filterRole, setFilterRole] = useState<UserRole | 'ALL'>('ALL');
  const [filterPartner, setFilterPartner] = useState<string>('ALL');
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [editingProfile, setEditingProfile] = useState<Profile | null>(null);
  const [isLoading, setIsLoading] = useState(false);

  // Filtrer les partenaires pour exclure les consultants dès le départ
  const organizationPartners = useMemo(() => {
    return partners.filter(p => p.type !== PartnerType.CONSULTANT);
  }, [partners]);

  const filteredProfiles = useMemo(() => {
    return profiles.filter(p => {
      const matchSearch = 
        p.firstName.toLowerCase().includes(searchTerm.toLowerCase()) ||
        p.lastName.toLowerCase().includes(searchTerm.toLowerCase()) ||
        p.email.toLowerCase().includes(searchTerm.toLowerCase());
      
      const matchRole = filterRole === 'ALL' || p.role === filterRole;
      
      const matchPartner = filterPartner === 'ALL' || 
                           (filterPartner === 'NONE' && !p.partnerId) ||
                           p.partnerId === filterPartner;

      return matchSearch && matchRole && matchPartner;
    });
  }, [profiles, searchTerm, filterRole, filterPartner]);

  const handleSubmit = async (e: React.FormEvent<HTMLFormElement>) => {
    e.preventDefault();
    setIsLoading(true);
    const formData = new FormData(e.currentTarget);
    
    // NOTE: disabled fields are NOT included in FormData, so we use editingProfile as fallback
    const profileData = {
      firstName: formData.get('firstName') as string,
      lastName: formData.get('lastName') as string,
      email: (formData.get('email') as string) || editingProfile?.email || '',
      role: formData.get('role') as UserRole,
      partnerId: formData.get('partnerId') as string || undefined,
      position: formData.get('position') as string || undefined,
      password: formData.get('password') as string || undefined,
      manualId: formData.get('manualId') as string || undefined
    };

    try {
      if (editingProfile) {
        await onUpdateProfile({ ...editingProfile, ...profileData });
      } else {
        await onAddProfile(profileData);
      }
      setIsModalOpen(false);
      setEditingProfile(null);
    } catch (err: any) {
      console.error(err);
    } finally {
      setIsLoading(false);
    }
  };

  const getRoleBadgeColor = (role: UserRole) => {
    switch (role) {
      case UserRole.ADMIN: return 'bg-red-50 text-red-600 border-red-100';
      case UserRole.MANAGER: return 'bg-purple-50 text-purple-600 border-purple-100';
      case UserRole.ADVISOR: return 'bg-blue-50 text-blue-600 border-blue-100';
      case UserRole.PARTNER: return 'bg-indigo-50 text-indigo-600 border-indigo-100';
      case UserRole.MENTOR: return 'bg-emerald-50 text-emerald-600 border-emerald-100';
      default: return 'bg-slate-50 text-slate-600 border-slate-100';
    }
  };

  return (
    <div className="space-y-4">
      {/* Barre d'outils et Filtres SLDS */}
      <div className="slds-card p-6 space-y-4">
        <div className="flex flex-col md:flex-row justify-between items-center gap-4">
          <div className="relative w-full md:w-96">
            <Search size={16} className="absolute left-3 top-1/2 -translate-y-1/2 text-slds-text-secondary" />
            <input 
              type="text" 
              placeholder="Rechercher un compte..."
              className="slds-input pl-10"
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
            />
          </div>
          <button 
            onClick={() => { setEditingProfile(null); setIsModalOpen(true); }}
            className="slds-button slds-button-brand w-full md:w-auto"
          >
            <UserPlus size={16} className="mr-2" /> Nouveau Compte
          </button>
        </div>

        <div className="flex flex-wrap items-center gap-4 pt-4 border-t border-slds-border">
          <div className="flex items-center gap-2 text-slds-text-secondary">
            <Filter size={14} />
            <span className="text-[10px] font-bold uppercase">Filtres :</span>
          </div>

          <select 
            className="slds-input py-1 px-2 text-xs w-auto"
            value={filterRole}
            onChange={(e) => setFilterRole(e.target.value as any)}
          >
            <option value="ALL">Tous les rôles</option>
            {Object.values(UserRole).map(role => (
              <option key={role} value={role}>{ROLE_LABELS[role]}</option>
            ))}
          </select>

          <select 
            className="slds-input py-1 px-2 text-xs w-auto"
            value={filterPartner}
            onChange={(e) => setFilterPartner(e.target.value)}
          >
            <option value="ALL">Tous les organismes</option>
            <option value="NONE">Interne CFGT</option>
            {organizationPartners.map(p => (
              <option key={p.id} value={p.id}>{p.name}</option>
            ))}
          </select>

          {(searchTerm || filterRole !== 'ALL' || filterPartner !== 'ALL') && (
            <button 
              onClick={() => { setSearchTerm(''); setFilterRole('ALL'); setFilterPartner('ALL'); }}
              className="text-[10px] font-bold text-slds-brand uppercase hover:underline"
            >
              Réinitialiser
            </button>
          )}

          <div className="ml-auto text-[10px] font-bold text-slds-text-secondary uppercase bg-slds-bg px-2 py-1 rounded border border-slds-border">
            {filteredProfiles.length} comptes
          </div>
        </div>
      </div>

      {/* Liste en Lignes SLDS */}
      <div className="space-y-2">
        {filteredProfiles.length > 0 ? filteredProfiles.map(profile => (
          <div key={profile.id} className="slds-card p-4 hover:bg-slds-bg transition-colors group flex flex-col md:flex-row items-center justify-between gap-4">
            <div className="flex items-center gap-3 flex-1 min-w-0">
              <div className="w-10 h-10 rounded bg-slds-bg text-slds-text-secondary flex items-center justify-center font-bold text-sm group-hover:bg-slds-brand group-hover:text-white transition-colors">
                {profile.firstName?.[0] || '?'}{profile.lastName?.[0] || '?'}
              </div>
              <div className="min-w-0">
                <p className="text-sm font-bold text-slds-text-primary truncate">{profile.firstName} {profile.lastName}</p>
                <div className="flex items-center gap-2 mt-1">
                  <Mail size={12} className="text-slds-text-secondary" />
                  <p className="text-[11px] text-slds-text-secondary truncate">{profile.email}</p>
                  {profile.position && (
                    <>
                      <span className="text-slds-border">•</span>
                      <p className="text-[11px] text-slds-text-secondary truncate italic">{profile.position}</p>
                    </>
                  )}
                </div>
              </div>
            </div>

            <div className="flex flex-wrap items-center gap-4 shrink-0">
              <div className="w-32 text-center">
                <span className={`inline-block px-2 py-0.5 rounded text-[10px] font-bold border uppercase ${getRoleBadgeColor(profile.role)}`}>
                  {ROLE_LABELS[profile.role]}
                </span>
              </div>

              <div className="w-48">
                <div className="flex items-center gap-2 text-xs font-bold text-slds-text-primary">
                  <Building2 size={14} className="text-slds-brand shrink-0" />
                  <span className="truncate">
                    {partners.find(p => p.id === profile.partnerId)?.name || <span className="text-slds-text-secondary font-normal">Interne CFGT</span>}
                  </span>
                </div>
              </div>
            </div>

            <div className="flex items-center gap-2 shrink-0">
              <button 
                onClick={() => { setEditingProfile(profile); setIsModalOpen(true); }}
                className="p-1.5 text-slds-text-secondary hover:text-slds-brand hover:bg-white rounded transition-colors"
                title="Modifier"
              >
                <Edit2 size={16} />
              </button>
              <ChevronRight size={16} className="text-slds-text-secondary opacity-0 group-hover:opacity-100 transition-opacity" />
            </div>
          </div>
        )) : (
          <div className="py-12 text-center slds-card border-2 border-dashed border-slds-border">
            <User size={48} className="mx-auto text-slds-border mb-2" />
            <h3 className="text-slds-text-secondary font-bold uppercase text-xs">Aucun compte trouvé</h3>
          </div>
        )}
      </div>

      {/* MODALE CRÉATION / ÉDITION SLDS */}
      {isModalOpen && (
        <div className="fixed inset-0 bg-black/50 z-[100] flex items-center justify-center p-4">
          <div className="slds-card w-full max-w-xl shadow-2xl overflow-hidden animate-in zoom-in-95 duration-200">
            <div className="p-4 border-b border-slds-border flex justify-between items-center bg-slds-bg">
              <div className="flex items-center gap-3">
                <div className="p-2 bg-slds-brand text-white rounded">
                  <ShieldCheck size={20} />
                </div>
                <h3 className="text-base font-bold text-slds-text-primary">
                  {editingProfile ? 'Modifier le compte' : 'Nouvel utilisateur'}
                </h3>
              </div>
              <button onClick={() => setIsModalOpen(false)} className="p-2 hover:bg-white rounded text-slds-text-secondary">
                <X size={20} />
              </button>
            </div>

            <form onSubmit={handleSubmit} className="p-6 space-y-4">
              {!editingProfile && (
                <div className="p-3 bg-blue-50 rounded border border-blue-100 flex gap-3 mb-2">
                  <Info size={16} className="text-blue-600 shrink-0" />
                  <p className="text-[11px] text-blue-700">
                    Le compte sera créé <b>automatiquement</b> dans Supabase Auth.
                  </p>
                </div>
              )}

              <div className="grid grid-cols-2 gap-4">
                <div className="space-y-1">
                  <label className="text-[10px] font-bold text-slds-text-secondary uppercase">Prénom</label>
                  <input name="firstName" required defaultValue={editingProfile?.firstName} className="slds-input" />
                </div>
                <div className="space-y-1">
                  <label className="text-[10px] font-bold text-slds-text-secondary uppercase">Nom</label>
                  <input name="lastName" required defaultValue={editingProfile?.lastName} className="slds-input" />
                </div>
              </div>

              <div className="grid grid-cols-2 gap-4">
                <div className="space-y-1">
                  <label className="text-[10px] font-bold text-slds-text-secondary uppercase">Email</label>
                  <input name="email" type="email" required disabled={!!editingProfile} defaultValue={editingProfile?.email} className="slds-input disabled:opacity-50" />
                </div>
                {!editingProfile && (
                  <div className="space-y-1">
                    <label className="text-[10px] font-bold text-slds-text-secondary uppercase">Mot de passe</label>
                    <input name="password" type="password" required={!editingProfile} placeholder="Min. 6 carac." className="slds-input" />
                  </div>
                )}
              </div>

              <div className="grid grid-cols-2 gap-4">
                <div className="space-y-1">
                  <label className="text-[10px] font-bold text-slds-text-secondary uppercase">Rôle</label>
                  <select name="role" required defaultValue={editingProfile?.role} className="slds-input">
                    {Object.values(UserRole).map(role => (
                      <option key={role} value={role}>{ROLE_LABELS[role]}</option>
                    ))}
                  </select>
                </div>
                <div className="space-y-1">
                  <label className="text-[10px] font-bold text-slds-text-secondary uppercase">Poste / Fonction</label>
                  <input name="position" defaultValue={editingProfile?.position} placeholder="ex: Conseiller, Directeur..." className="slds-input" />
                </div>
              </div>

              <div className="grid grid-cols-2 gap-4">
                <div className="space-y-1">
                  <label className="text-[10px] font-bold text-slds-text-secondary uppercase">Organisme</label>
                  <select name="partnerId" defaultValue={editingProfile?.partnerId} className="slds-input">
                    <option value="">Aucun (Interne)</option>
                    {organizationPartners.map(p => (
                      <option key={p.id} value={p.id}>{p.name}</option>
                    ))}
                  </select>
                </div>
              </div>

              <div className="flex justify-end gap-3 pt-4 border-t border-slds-border">
                <button type="button" onClick={() => setIsModalOpen(false)} className="slds-button slds-button-neutral">Annuler</button>
                <button type="submit" disabled={isLoading} className="slds-button slds-button-brand">
                  {isLoading ? <Loader2 size={16} className="animate-spin mr-2" /> : null}
                  {editingProfile ? 'Mettre à jour' : 'Créer'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
};

export default AccountManagement;