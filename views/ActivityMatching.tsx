
import React, { useState } from 'react';
import { Client } from '../types';
import { getActivityMatches } from '../services/geminiService';
import { 
  CalendarDays, 
  Search, 
  Sparkles, 
  Loader2, 
  Target, 
  Send,
  CheckCircle2,
  FileText,
  Users,
  MapPin,
  PartyPopper
} from 'lucide-react';

interface ActivityMatchingProps {
  clients: Client[];
  onSelectClient: (client: Client) => void;
}

const ActivityMatching: React.FC<ActivityMatchingProps> = ({ clients, onSelectClient }) => {
  const [activityText, setActivityText] = useState('');
  const [results, setResults] = useState<{ clientId: string; score: number; reason: string }[]>([]);
  const [loading, setLoading] = useState(false);

  const handleAnalyze = async () => {
    if (!activityText.trim()) return;
    setLoading(true);
    try {
      const matches = await getActivityMatches(activityText, clients);
      setResults(matches.sort((a, b) => b.score - a.score));
    } catch (err) {
      console.error(err);
    } finally {
      setLoading(false);
    }
  };

  const getScoreColor = (score: number) => {
    if (score >= 80) return 'text-purple-600 bg-purple-50 border-purple-100';
    if (score >= 50) return 'text-indigo-600 bg-indigo-50 border-indigo-100';
    return 'text-slate-500 bg-slate-50 border-slate-100';
  };

  return (
    <div className="space-y-8 animate-in fade-in duration-500">
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
        {/* Activity Input SLDS */}
        <div className="space-y-4">
          <div className="flex items-center gap-3 mb-2">
            <div className="p-2 bg-purple-600 rounded text-white shadow-sm">
              <CalendarDays size={18} />
            </div>
            <div>
              <h3 className="text-sm font-bold text-slds-text-primary uppercase tracking-tight">Détails de l'Atelier / Activité</h3>
              <p className="text-[10px] text-slds-text-secondary font-bold uppercase tracking-widest">IA Ciblage Participant</p>
            </div>
          </div>
          
          <div className="slds-card overflow-hidden">
            <textarea 
              value={activityText}
              onChange={(e) => setActivityText(e.target.value)}
              placeholder="Décrivez l'activité (ex: Atelier sur l'achat d'une première maison à Toronto, destiné aux familles francophones...)"
              className="w-full h-80 p-4 text-sm outline-none resize-none font-medium text-slds-text-primary bg-white"
            />
            <div className="p-4 bg-slds-bg border-t border-slds-border flex justify-between items-center">
              <span className="text-[10px] text-slds-text-secondary font-bold uppercase">{activityText.length} caractères</span>
              <button 
                onClick={handleAnalyze}
                disabled={loading || !activityText.trim()}
                className="slds-button slds-button-brand flex items-center gap-2"
              >
                {loading ? <Loader2 size={14} className="animate-spin" /> : <Sparkles size={14} />}
                {loading ? 'Calcul...' : 'Cibler les participants'}
              </button>
            </div>
          </div>
        </div>

        {/* Suggested Participants SLDS */}
        <div className="space-y-4">
          <div className="flex items-center gap-3 mb-2">
            <div className="p-2 bg-indigo-500 rounded text-white shadow-sm">
              <Target size={18} />
            </div>
            <div>
              <h3 className="text-sm font-bold text-slds-text-primary uppercase tracking-tight">Audience Prioritaire</h3>
              <p className="text-[10px] text-slds-text-secondary font-bold uppercase tracking-widest">Score d'Appétence</p>
            </div>
          </div>

          <div className="space-y-4 max-h-[500px] overflow-y-auto pr-2">
            {loading ? (
              <div className="h-64 flex flex-col items-center justify-center gap-4 bg-white rounded border border-slds-border border-dashed">
                <Loader2 size={24} className="text-purple-500 animate-spin" />
                <p className="text-xs font-bold text-slds-text-secondary uppercase tracking-widest">Analyse Gemini en cours...</p>
              </div>
            ) : results.length > 0 ? (
              results.map(match => {
                const client = clients.find(c => c.id === match.clientId);
                if (!client) return null;
                return (
                  <div key={client.id} className="slds-card p-4 hover:border-purple-600 transition-all group">
                    <div className="flex justify-between items-start mb-3">
                      <div className="flex items-center gap-3">
                        <div className="w-8 h-8 rounded bg-slds-bg text-slds-text-primary flex items-center justify-center font-bold text-xs ring-1 ring-inset ring-slds-border shrink-0">
                          {client.firstName?.[0] || '?'}{client.lastName?.[0] || '?'}
                        </div>
                        <div>
                          <h4 className="text-sm font-bold text-slds-text-primary">{client.firstName} {client.lastName}</h4>
                          <div className="flex items-center gap-2 text-[9px] text-slds-text-secondary font-bold uppercase tracking-tighter">
                            <MapPin size={10} /> {client.destinationCity}
                          </div>
                        </div>
                      </div>
                      <div className={`px-2 py-0.5 rounded text-[10px] font-bold border tracking-widest ${getScoreColor(match.score)}`}>
                        {match.score}% INTÉRÊT
                      </div>
                    </div>
                    
                    <div className="bg-indigo-50 p-3 rounded border border-indigo-100 mb-3">
                      <p className="text-[11px] text-indigo-900 leading-relaxed font-medium">
                        <span className="font-bold uppercase text-[9px] block mb-1">Argumentaire :</span>
                        "{match.reason}"
                      </p>
                    </div>

                    <div className="flex gap-2">
                      <button 
                        onClick={() => onSelectClient(client)}
                        className="slds-button slds-button-neutral flex-1 text-[10px]"
                      >
                        <FileText size={12} className="mr-1" /> Dossier
                      </button>
                      <button 
                        className="slds-button slds-button-brand flex-1 text-[10px]"
                      >
                        <Send size={12} className="mr-1" /> Inviter
                      </button>
                    </div>
                  </div>
                );
              })
            ) : (
              <div className="h-64 flex flex-col items-center justify-center text-center p-8 bg-slds-bg rounded border-2 border-dashed border-slds-border">
                <Users size={40} className="text-slds-border mb-4" />
                <p className="text-xs font-bold text-slds-text-secondary uppercase tracking-widest">Aucune invitation suggérée</p>
                <p className="text-[10px] text-slds-text-secondary mt-2 italic max-w-xs">Décrivez une activité à gauche pour cibler les clients les plus concernés.</p>
              </div>
            )}
          </div>
        </div>
      </div>

      {/* Benefits Card SLDS */}
      <div className="slds-card p-8 bg-indigo-900 text-white relative overflow-hidden">
        <PartyPopper size={120} className="absolute -right-8 -bottom-8 text-white/5 rotate-12" />
        <div className="max-w-2xl relative z-10">
          <h3 className="text-xl font-bold tracking-tight mb-2">Maximisez l'impact de vos activités</h3>
          <p className="text-indigo-100/70 text-sm leading-relaxed mb-6">
            Ce module permet de personnaliser vos invitations en fonction du projet de vie de chaque client. Une invitation ciblée a 4x plus de chances d'aboutir à une participation effective.
          </p>
          <div className="flex flex-wrap gap-4">
            <div className="flex items-center gap-2 text-[10px] font-bold uppercase tracking-widest bg-white/10 px-4 py-2 rounded">
              <CheckCircle2 size={14} className="text-emerald-400" /> Ciblage par profession
            </div>
            <div className="flex items-center gap-2 text-[10px] font-bold uppercase tracking-widest bg-white/10 px-4 py-2 rounded">
              <CheckCircle2 size={14} className="text-emerald-400" /> Filtre par ville de destination
            </div>
            <div className="flex items-center gap-2 text-[10px] font-bold uppercase tracking-widest bg-white/10 px-4 py-2 rounded">
              <CheckCircle2 size={14} className="text-emerald-400" /> IA Sémantique
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};

export default ActivityMatching;
