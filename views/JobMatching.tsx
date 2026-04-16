
import React, { useState } from 'react';
import { Client } from '../types';
import { getJobMatches } from '../services/geminiService';
import { 
  Briefcase, 
  Search, 
  Sparkles, 
  Loader2, 
  ChevronRight, 
  Target, 
  Send,
  AlertCircle,
  CheckCircle2,
  FileText
} from 'lucide-react';

interface JobMatchingProps {
  clients: Client[];
  onSelectClient: (client: Client) => void;
}

const JobMatching: React.FC<JobMatchingProps> = ({ clients, onSelectClient }) => {
  const [jobText, setJobText] = useState('');
  const [results, setResults] = useState<{ clientId: string; score: number; reason: string }[]>([]);
  const [loading, setLoading] = useState(false);

  const handleAnalyze = async () => {
    if (!jobText.trim()) return;
    setLoading(true);
    try {
      const matches = await getJobMatches(jobText, clients);
      setResults(matches.sort((a, b) => b.score - a.score));
    } catch (err) {
      console.error(err);
    } finally {
      setLoading(false);
    }
  };

  const getScoreColor = (score: number) => {
    if (score >= 85) return 'text-emerald-600 bg-emerald-50 border-emerald-100';
    if (score >= 65) return 'text-blue-600 bg-blue-50 border-blue-100';
    return 'text-slate-500 bg-slate-50 border-slate-100';
  };

  return (
    <div className="space-y-8 animate-in fade-in duration-500">
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
        {/* Input Section SLDS */}
        <div className="space-y-4">
          <div className="flex items-center gap-3 mb-2">
            <div className="p-2 bg-slds-brand rounded text-white shadow-sm">
              <Briefcase size={18} />
            </div>
            <div>
              <h3 className="text-sm font-bold text-slds-text-primary uppercase tracking-tight">Analyse de l'offre</h3>
              <p className="text-[10px] text-slds-text-secondary font-bold uppercase tracking-widest">Collez le texte de l'offre ici</p>
            </div>
          </div>
          
          <div className="slds-card overflow-hidden">
            <textarea 
              value={jobText}
              onChange={(e) => setJobText(e.target.value)}
              placeholder="Ex: Nous recherchons un ingénieur logiciel avec 3 ans d'expérience en React..."
              className="w-full h-80 p-4 text-sm outline-none resize-none font-medium text-slds-text-primary bg-white"
            />
            <div className="p-4 bg-slds-bg border-t border-slds-border flex justify-between items-center">
              <span className="text-[10px] text-slds-text-secondary font-bold uppercase">{jobText.length} caractères</span>
              <button 
                onClick={handleAnalyze}
                disabled={loading || !jobText.trim()}
                className="slds-button slds-button-brand flex items-center gap-2"
              >
                {loading ? <Loader2 size={14} className="animate-spin" /> : <Sparkles size={14} />}
                {loading ? 'Analyse...' : 'Trouver des candidats'}
              </button>
            </div>
          </div>
        </div>

        {/* Results Section SLDS */}
        <div className="space-y-4">
          <div className="flex items-center gap-3 mb-2">
            <div className="p-2 bg-slds-success rounded text-white shadow-sm">
              <Target size={18} />
            </div>
            <div>
              <h3 className="text-sm font-bold text-slds-text-primary uppercase tracking-tight">Candidats potentiels</h3>
              <p className="text-[10px] text-slds-text-secondary font-bold uppercase tracking-widest">IA Matching Score</p>
            </div>
          </div>

          <div className="space-y-4 max-h-[500px] overflow-y-auto pr-2">
            {loading ? (
              <div className="h-64 flex flex-col items-center justify-center gap-4 bg-white rounded border border-slds-border border-dashed">
                <Loader2 size={24} className="animate-spin text-slds-brand" />
                <p className="text-xs font-bold text-slds-text-secondary uppercase tracking-widest">Analyse Gemini en cours...</p>
              </div>
            ) : results.length > 0 ? (
              results.map(match => {
                const client = clients.find(c => c.id === match.clientId);
                if (!client) return null;
                return (
                  <div key={client.id} className="slds-card p-4 hover:border-slds-brand transition-all group">
                    <div className="flex justify-between items-start mb-3">
                      <div className="flex items-center gap-3">
                        <div className="w-10 h-10 rounded bg-slds-bg text-slds-text-secondary flex items-center justify-center font-bold border border-slds-border">
                          {client.firstName[0]}{client.lastName[0]}
                        </div>
                        <div>
                          <h4 className="text-sm font-bold text-slds-text-primary">{client.firstName} {client.lastName}</h4>
                          <p className="text-[10px] text-slds-text-secondary font-bold uppercase tracking-tighter">{client.profession}</p>
                        </div>
                      </div>
                      <div className={`px-2 py-0.5 rounded text-[10px] font-bold border tracking-widest ${getScoreColor(match.score)}`}>
                        {match.score}% MATCH
                      </div>
                    </div>
                    
                    <div className="bg-slds-bg p-3 rounded border border-slds-border mb-3">
                      <p className="text-[11px] text-slds-text-primary leading-relaxed font-medium italic">
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
                        <Send size={12} className="mr-1" /> Contacter
                      </button>
                    </div>
                  </div>
                );
              })
            ) : (
              <div className="h-64 flex flex-col items-center justify-center text-center p-8 bg-slds-bg rounded border-2 border-dashed border-slds-border">
                <Search size={40} className="text-slds-border mb-4" />
                <p className="text-xs font-bold text-slds-text-secondary uppercase tracking-widest">Aucune analyse en cours</p>
                <p className="text-[10px] text-slds-text-secondary mt-2 italic max-w-xs">Collez une offre d'emploi à gauche pour identifier les meilleurs candidats.</p>
              </div>
            )}
          </div>
        </div>
      </div>

      {/* Info Panel SLDS */}
      <div className="slds-card p-8 bg-slds-text-primary text-white relative overflow-hidden">
        <Sparkles size={120} className="absolute -right-8 -bottom-8 text-white/5 rotate-12" />
        <div className="max-w-2xl relative z-10">
          <h3 className="text-xl font-bold tracking-tight mb-2">Aide au placement CFGT</h3>
          <p className="text-slds-border text-sm leading-relaxed mb-6">
            Cet outil utilise l'intelligence artificielle pour croiser les descriptions de postes avec les profils de vos clients. Il ne remplace pas votre jugement, mais vous permet de gagner un temps précieux dans le sourcing initial pour les partenaires employeurs.
          </p>
          <div className="flex flex-wrap gap-4">
            <div className="flex items-center gap-2 text-[10px] font-bold uppercase tracking-widest bg-white/10 px-4 py-2 rounded">
              <CheckCircle2 size={14} className="text-slds-success" /> Analyse de texte libre
            </div>
            <div className="flex items-center gap-2 text-[10px] font-bold uppercase tracking-widest bg-white/10 px-4 py-2 rounded">
              <CheckCircle2 size={14} className="text-slds-success" /> Scoring instantané
            </div>
            <div className="flex items-center gap-2 text-[10px] font-bold uppercase tracking-widest bg-white/10 px-4 py-2 rounded">
              <AlertCircle size={14} className="text-amber-400" /> Respect de la confidentialité
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};

export default JobMatching;
