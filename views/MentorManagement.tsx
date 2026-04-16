
import React, { useState } from 'react';
import { Mentor, UserRole, Partner } from '../types';
// Add Sparkles to the imported icons
import { UserPlus, Search, Building2, UserCheck, Globe, Briefcase, MapPin, X, Loader2, User, Sparkles } from 'lucide-react';

interface MentorManagementProps {
  mentors: Mentor[];
  partners: Partner[];
  activeRole: UserRole;
  currentPartnerId?: string;
  onAddMentor: (mentor: Mentor) => Promise<void>;
}

const MentorManagement: React.FC<MentorManagementProps> = ({ mentors, partners, activeRole, currentPartnerId, onAddMentor }) => {
  const [showModal, setShowModal] = useState(false);
  const [searchTerm, setSearchTerm] = useState('');
  const [isSubmitting, setIsSubmitting] = useState(false);

  const filteredMentors = mentors.filter(m => {
    const roleMatch = activeRole !== UserRole.PARTNER || m.organizationId === currentPartnerId;
    const searchMatch = (m.firstName + ' ' + m.lastName + ' ' + m.profession + ' ' + m.domain)
      .toLowerCase()
      .includes(searchTerm.toLowerCase());
    return roleMatch && searchMatch;
  });

  const handleAdd = async (e: React.FormEvent<HTMLFormElement>) => {
    e.preventDefault();
    setIsSubmitting(true);
    const formData = new FormData(e.currentTarget);
    
    const newMentor: Mentor = {
      id: Date.now().toString(),
      firstName: formData.get('firstName') as string,
      lastName: formData.get('lastName') as string,
      profession: formData.get('profession') as string,
      city: formData.get('city') as string,
      domain: formData.get('domain') as string,
      originCountry: formData.get('originCountry') as string,
      organizationId: activeRole === UserRole.PARTNER ? (currentPartnerId || '') : (formData.get('organizationId') as string)
    };

    try {
      await onAddMentor(newMentor);
      setShowModal(false);
    } catch (err) {
      console.error(err);
    } finally {
      setIsSubmitting(false);
    }
  };

  const isAdvisor = activeRole === UserRole.ADVISOR || activeRole === UserRole.ADMIN || activeRole === UserRole.MANAGER;

  return (
    <div className="space-y-4">
      <div className="flex flex-col md:flex-row justify-between items-center gap-4">
        <div className="relative w-full md:w-96">
          <Search size={16} className="absolute left-3 top-1/2 -translate-y-1/2 text-slds-text-secondary" />
          <input 
            type="text" 
            placeholder="Rechercher un mentor..." 
            className="slds-input pl-10" 
            value={searchTerm} 
            onChange={(e) => setSearchTerm(e.target.value)} 
          />
        </div>
        <button 
          onClick={() => setShowModal(true)} 
          className="slds-button slds-button-brand w-full md:w-auto"
        >
          <UserPlus size={16} className="mr-2" /> Nouveau Mentor
        </button>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-3 gap-4">
        {filteredMentors.map(mentor => (
          <div key={mentor.id} className="slds-card p-6 hover:bg-slds-bg transition-colors group">
            <div className="flex items-start justify-between mb-4">
              <div className="w-12 h-12 rounded bg-slds-bg flex items-center justify-center text-slds-text-secondary font-bold text-lg">
                {mentor.firstName[0]}{mentor.lastName[0]}
              </div>
              <span className="bg-blue-50 text-blue-600 px-2 py-0.5 rounded text-[10px] font-bold uppercase border border-blue-100">
                {mentor.domain}
              </span>
            </div>
            <h3 className="font-bold text-slds-text-primary text-base mb-1">{mentor.firstName} {mentor.lastName}</h3>
            <div className="space-y-1.5 mb-6">
               <div className="flex items-center gap-2 text-slds-text-secondary text-xs">
                 <Briefcase size={14} /> {mentor.profession}
               </div>
               <div className="flex items-center gap-2 text-slds-text-secondary text-xs">
                 <MapPin size={14} /> {mentor.city}
               </div>
               <div className="flex items-center gap-2 text-slds-text-secondary text-xs">
                 <Globe size={14} /> {mentor.originCountry}
               </div>
            </div>
            <div className="pt-4 border-t border-slds-border flex items-center justify-between">
              <div className="flex items-center gap-1.5">
                <Building2 size={12} className="text-slds-text-secondary" />
                <span className="text-[10px] font-bold text-slds-text-secondary uppercase">
                  {partners.find(p => p.id === mentor.organizationId)?.name || 'Organisme'}
                </span>
              </div>
              <button className="text-slds-brand text-[10px] font-bold uppercase hover:underline">
                Voir Profil
              </button>
            </div>
          </div>
        ))}

        {filteredMentors.length === 0 && (
          <div className="col-span-full py-12 text-center border-2 border-dashed border-slds-border rounded">
            <UserCheck size={48} className="mx-auto text-slds-border mb-2" />
            <p className="text-slds-text-secondary text-sm">Aucun mentor trouvé.</p>
          </div>
        )}
      </div>

      {/* Modale Nouveau Mentor SLDS */}
      {showModal && (
        <div className="fixed inset-0 bg-black/50 z-[200] flex items-center justify-center p-4">
          <div className="slds-card w-full max-w-2xl shadow-2xl overflow-hidden animate-in zoom-in-95 duration-200">
            <div className="p-4 border-b border-slds-border flex justify-between items-center bg-slds-bg">
              <div className="flex items-center gap-3">
                <div className="p-2 bg-slds-brand text-white rounded">
                  <UserCheck size={20} />
                </div>
                <h3 className="text-base font-bold text-slds-text-primary">Nouveau Mentor</h3>
              </div>
              <button 
                onClick={() => setShowModal(false)} 
                className="p-2 hover:bg-white rounded text-slds-text-secondary"
              >
                <X size={20} />
              </button>
            </div>

            <form onSubmit={handleAdd}>
              <div className="p-6 space-y-4 max-h-[70vh] overflow-y-auto">
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  <div className="space-y-1">
                    <label className="text-[10px] font-bold text-slds-text-secondary uppercase">Prénom</label>
                    <input name="firstName" required placeholder="Prénom" className="slds-input" />
                  </div>
                  <div className="space-y-1">
                    <label className="text-[10px] font-bold text-slds-text-secondary uppercase">Nom</label>
                    <input name="lastName" required placeholder="Nom" className="slds-input" />
                  </div>
                </div>

                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  <div className="space-y-1">
                    <label className="text-[10px] font-bold text-slds-text-secondary uppercase">Profession</label>
                    <input name="profession" required placeholder="Ex: Architecte" className="slds-input" />
                  </div>
                  <div className="space-y-1">
                    <label className="text-[10px] font-bold text-slds-text-secondary uppercase">Domaine d'expertise</label>
                    <input name="domain" required placeholder="Ex: Informatique" className="slds-input" />
                  </div>
                </div>

                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  <div className="space-y-1">
                    <label className="text-[10px] font-bold text-slds-text-secondary uppercase">Pays d'origine</label>
                    <input name="originCountry" required placeholder="Ex: France" className="slds-input" />
                  </div>
                  <div className="space-y-1">
                    <label className="text-[10px] font-bold text-slds-text-secondary uppercase">Ville de résidence</label>
                    <input name="city" required placeholder="Ex: Toronto" className="slds-input" />
                  </div>
                </div>

                <div className="space-y-1">
                  <label className="text-[10px] font-bold text-slds-text-secondary uppercase">Organisme</label>
                  {isAdvisor ? (
                    <select name="organizationId" required className="slds-input">
                      <option value="">Sélectionner un partenaire...</option>
                      {partners.map(p => (
                        <option key={p.id} value={p.id}>{p.name} ({p.city})</option>
                      ))}
                    </select>
                  ) : (
                    <input 
                      disabled 
                      value={partners.find(p => p.id === currentPartnerId)?.name || 'Votre organisme'} 
                      className="slds-input bg-slds-bg" 
                    />
                  )}
                </div>
              </div>

              <div className="p-4 bg-slds-bg border-t border-slds-border flex justify-end gap-3">
                <button 
                  type="button" 
                  onClick={() => setShowModal(false)} 
                  className="slds-button slds-button-neutral"
                >
                  Annuler
                </button>
                <button 
                  type="submit" 
                  disabled={isSubmitting}
                  className="slds-button slds-button-brand"
                >
                  {isSubmitting ? <Loader2 size={14} className="animate-spin mr-2" /> : <UserCheck size={14} className="mr-2" />}
                  Enregistrer
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
};

export default MentorManagement;
