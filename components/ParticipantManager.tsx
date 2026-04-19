
import React, { useState, useMemo, useRef, useEffect } from 'react';
import { Client } from '../types';
import * as XLSX from 'xlsx';
import { 
  Search, 
  Mail, 
  X, 
  Upload, 
  UserPlus, 
  Users, 
  AlertCircle,
  ChevronRight,
  ClipboardList,
  CheckCircle2
} from 'lucide-react';

import { apiService } from '../services/apiService';

interface ParticipantManagerProps {
  clients?: Client[];
  selectedParticipantIds: string[];
  onChange: (newIds: string[]) => void;
}

const ParticipantManager: React.FC<ParticipantManagerProps> = ({ 
  clients = [], 
  selectedParticipantIds, 
  onChange 
}) => {
  const [searchQuery, setSearchQuery] = useState('');
  const [serverResults, setServerResults] = useState<Client[]>([]);
  const [isSearching, setIsSearching] = useState(false);
  const [showBulkPaste, setShowBulkPaste] = useState(false);
  const [bulkText, setBulkText] = useState('');
  const [importSummary, setImportSummary] = useState<{ success: number; failed: string[] } | null>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);

  // Server-side search for new participants
  useEffect(() => {
    const searchClients = async () => {
      if (!searchQuery.trim() || searchQuery.length < 2) {
        setServerResults([]);
        return;
      }
      
      setIsSearching(true);
      try {
        const results = await apiService.fetchTable('clients', { 
          search: searchQuery,
          limit: 5 
        });
        if (Array.isArray(results)) {
          setServerResults(results);
        } else if (results.data) {
          setServerResults(results.data);
        }
      } catch (err) {
        console.error("Error searching clients:", err);
      } finally {
        setIsSearching(false);
      }
    };

    const timer = setTimeout(searchClients, 300);
    return () => clearTimeout(timer);
  }, [searchQuery]);

  // Combined search results (local cache + server results)
  const searchResults = useMemo(() => {
    if (!searchQuery.trim() || searchQuery.length < 1) return [];
    
    const combined = [...serverResults];
    // Also include people from local cache if they match
    clients.forEach(c => {
      if (!combined.find(sc => sc.id === c.id)) {
        const query = searchQuery.toLowerCase();
        if ((c.firstName + ' ' + c.lastName).toLowerCase().includes(query) || 
            c.email.toLowerCase().includes(query)) {
          combined.push(c);
        }
      }
    });

    return combined.filter(c => !(selectedParticipantIds || []).includes(c.id)).slice(0, 5);
  }, [clients, serverResults, searchQuery, selectedParticipantIds]);

  // Selected clients display
  const selectedClients = useMemo(() => {
    return (clients || []).filter(c => (selectedParticipantIds || []).includes(c.id));
  }, [clients, selectedParticipantIds]);

  const handleAddParticipant = (clientId: string) => {
    if (!selectedParticipantIds.includes(clientId)) {
      onChange([...selectedParticipantIds, clientId]);
    }
    setSearchQuery('');
  };

  const handleRemoveParticipant = (clientId: string) => {
    onChange(selectedParticipantIds.filter(id => id !== clientId));
  };

  // Bulk process logic
  const processEmails = (emails: string[]) => {
    const foundIds: string[] = [];
    const failed: string[] = [];
    
    emails.forEach(email => {
      const cleanEmail = email.trim().toLowerCase();
      if (!cleanEmail) return;
      
      const client = clients.find(c => c.email.toLowerCase() === cleanEmail);
      if (client) {
        if (!selectedParticipantIds.includes(client.id) && !foundIds.includes(client.id)) {
          foundIds.push(client.id);
        }
      } else {
        failed.push(email);
      }
    });

    if (foundIds.length > 0) {
      onChange([...selectedParticipantIds, ...foundIds]);
    }

    return { success: foundIds.length, failed };
  };

  const handleBulkPaste = () => {
    // Regex simple pour extraire les emails d'un texte
    const emails = bulkText.match(/([a-zA-Z0-9._-]+@[a-zA-Z0-9._-]+\.[a-zA-Z0-9._-]+)/gi) || [];
    const summary = processEmails(emails);
    setImportSummary(summary);
    setBulkText('');
    setShowBulkPaste(false);
  };

  const handleFileUpload = (e: React.ChangeEvent<HTMLInputElement>) => {
    if (e.target.files && e.target.files.length > 0) {
      const file = e.target.files[0];
      const reader = new FileReader();

      reader.onload = (evt) => {
        try {
          const bstr = evt.target?.result;
          const wb = XLSX.read(bstr, { type: 'binary' });
          const wsname = wb.SheetNames[0];
          const ws = wb.Sheets[wsname];
          const data = XLSX.utils.sheet_to_json(ws, { header: 1 }) as any[][];
          
          if (data.length < 1) return;

          const headers = data[0].map(h => h?.toString().toLowerCase().trim());
          const emailIdx = headers.findIndex(h => h.includes('email') || h.includes('courriel'));
          
          if (emailIdx === -1) {
            alert("Aucune colonne 'Email' ou 'Courriel' trouvée dans le fichier.");
            return;
          }

          const emails = data.slice(1).map(row => row[emailIdx]?.toString().trim()).filter(Boolean);
          const summary = processEmails(emails);
          setImportSummary(summary);
        } catch (err) {
          console.error("Error reading file:", err);
          alert("Erreur lors de la lecture du fichier Excel.");
        }
      };
      reader.readAsBinaryString(file);
    }
  };

  return (
    <div className="space-y-4">
      {/* Section 1: Selected List - NOW AT THE TOP for better visibility */}
      <div className="space-y-2">
        <div className="flex items-center justify-between">
           <p className="text-[10px] font-bold text-slds-text-secondary uppercase flex items-center gap-2">
            <Users size={16} className="text-slds-brand" /> 
            Participants Inscrits ({selectedParticipantIds.length})
          </p>
          {selectedParticipantIds.length > 0 && (
            <button 
              type="button"
              onClick={() => onChange([])}
              className="text-[9px] font-bold text-slds-error uppercase hover:underline"
            >
              Tout retirer
            </button>
          )}
        </div>
        <div className="bg-slate-50 rounded-xl border border-dashed border-slds-border p-2">
          <div className="max-h-48 overflow-y-auto pr-2 custom-scrollbar">
            <div className="space-y-1.5 pt-1">
              {selectedClients.map(c => (
                <div key={c.id} className="flex items-center justify-between gap-3 p-2 bg-white border border-slds-border rounded-lg group animate-in slide-in-from-left-2 duration-150">
                  <div className="flex items-center gap-3">
                    <div className="w-6 h-6 rounded bg-blue-50 text-blue-600 flex items-center justify-center text-[8px] font-black border border-blue-100">
                      {c.firstName?.[0] || '?'}{c.lastName?.[0] || '?'}
                    </div>
                    <div className="min-w-0">
                      <p className="text-[10px] font-bold text-slds-text-primary leading-tight truncate">{c.firstName} {c.lastName}</p>
                      <p className="text-[8px] text-slds-text-secondary font-bold uppercase truncate">{c.email}</p>
                    </div>
                  </div>
                  <button 
                    type="button"
                    onClick={() => handleRemoveParticipant(c.id)}
                    className="p-1 text-slate-300 hover:text-slds-error hover:bg-red-50 rounded transition-all shrink-0"
                  >
                    <X size={14} />
                  </button>
                </div>
              ))}
              {selectedParticipantIds.length === 0 && (
                 <div className="py-4 text-center bg-white/50 rounded-lg">
                   <p className="text-[10px] text-slate-400 font-bold uppercase tracking-widest">Aucun participant sélectionné</p>
                 </div>
              )}
            </div>
          </div>
        </div>
      </div>

      {/* Section 2: Quick Links & Import */}
      <div className="flex items-center justify-between pt-2 border-t border-slds-border">
        <p className="text-[10px] font-bold text-slds-text-secondary uppercase">Actions rapides</p>
        <div className="flex gap-2">
           <button 
            type="button"
            onClick={() => setShowBulkPaste(!showBulkPaste)}
            className="text-[9px] font-bold text-slds-brand uppercase hover:underline flex items-center gap-1"
          >
            <ClipboardList size={12}/> Coller une liste
          </button>
          <button 
            type="button"
            onClick={() => fileInputRef.current?.click()}
            className="text-[9px] font-bold text-slds-brand uppercase hover:underline flex items-center gap-1"
          >
            <Upload size={12}/> Importer Excel
          </button>
        </div>
      </div>

      <input 
        type="file" 
        ref={fileInputRef} 
        className="hidden" 
        accept=".xlsx, .xls, .csv" 
        onChange={handleFileUpload}
      />

      {/* Summary Alert */}
      {importSummary && (importSummary.success > 0 || importSummary.failed.length > 0) && (
        <div className={`p-3 rounded-lg border text-[10px] animate-in fade-in slide-in-from-top-1 ${importSummary.failed.length > 0 ? 'bg-amber-50 border-amber-200' : 'bg-emerald-50 border-emerald-200'}`}>
          <div className="flex justify-between items-start mb-1">
             <p className="font-bold flex items-center gap-2">
               {importSummary.failed.length > 0 ? <AlertCircle size={14} className="text-amber-600"/> : <CheckCircle2 size={14} className="text-emerald-600"/>}
               Résumé de l'ajout
             </p>
             <button onClick={() => setImportSummary(null)} className="text-slate-400 hover:text-slate-600"><X size={12}/></button>
          </div>
          <p className="font-medium text-slate-700">
            {importSummary.success} participant(s) ajouté(s).
          </p>
          {importSummary.failed.length > 0 && (
            <div className="mt-2 text-amber-800">
              <p className="font-bold">Emails non trouvés :</p>
              <div className="max-h-24 overflow-y-auto mt-1 break-words opacity-80 custom-scrollbar bg-white/50 p-2 rounded">
                {importSummary.failed.join(', ')}
              </div>
            </div>
          )}
        </div>
      )}

      {/* Bulk Paste Area */}
      {showBulkPaste && (
        <div className="p-3 bg-slds-bg border border-slds-border rounded-lg space-y-3 animate-in fade-in duration-200">
          <p className="text-[10px] font-bold text-slds-text-secondary uppercase">Coller des emails</p>
          <textarea 
            className="slds-input h-24 text-xs font-mono"
            placeholder="client1@email.com, client2@email.com..."
            value={bulkText}
            onChange={(e) => setBulkText(e.target.value)}
          />
          <div className="flex justify-end gap-2">
            <button type="button" onClick={() => setShowBulkPaste(false)} className="text-[10px] font-bold text-slate-400 uppercase">Annuler</button>
            <button 
              type="button" 
              onClick={handleBulkPaste}
              className="px-3 py-1 bg-slds-brand text-white rounded text-[10px] font-bold uppercase"
            >
              Ajouter
            </button>
          </div>
        </div>
      )}

      {/* Individual Search Area */}
      <div className="space-y-2">
        <p className="text-[10px] font-bold text-slds-text-secondary uppercase flex items-center gap-2">
          <Search size={14} className="text-slate-400" /> Recherche individuelle
        </p>
        <div className="relative">
          <input 
            type="text"
            placeholder="Ajouter par nom ou email..."
            className="slds-input pl-3 text-xs h-9"
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
          />
          {isSearching && (
             <div className="absolute right-3 top-1/2 -translate-y-1/2">
                <div className="w-3 h-3 border-2 border-slate-200 border-t-slds-brand rounded-full animate-spin" />
             </div>
          )}
          {searchResults.length > 0 && (
            <div className="absolute top-full left-0 w-full bg-white border border-slds-border rounded shadow-xl mt-1 z-[400] overflow-hidden divide-y divide-slds-border animate-in slide-in-from-top-1">
              {searchResults.map(c => (
                <button 
                  key={c.id}
                  type="button"
                  onClick={() => handleAddParticipant(c.id)}
                  className="w-full flex items-center gap-3 p-2.5 hover:bg-slds-bg transition-all text-left group"
                >
                  <div className="w-7 h-7 rounded bg-slds-bg text-slds-text-secondary flex items-center justify-center font-bold text-[9px] group-hover:bg-slds-brand group-hover:text-white transition-colors">
                    {c.firstName?.[0] || '?'}{c.lastName?.[0] || '?'}
                  </div>
                  <div className="flex-1 min-w-0">
                    <p className="text-xs font-bold text-slds-text-primary truncate">{c.firstName} {c.lastName}</p>
                    <p className="text-[9px] text-slate-400 truncate">{c.email}</p>
                  </div>
                  <UserPlus size={14} className="text-slds-brand opacity-0 group-hover:opacity-100" />
                </button>
              ))}
            </div>
          )}
        </div>
      </div>
    </div>
  );
};

export default ParticipantManager;
