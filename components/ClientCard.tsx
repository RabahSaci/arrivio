
import React from 'react';
import { Client } from '../types';
import { STATUS_COLORS } from '../constants';
import { MapPin, Briefcase, Calendar, ChevronRight, AlertCircle, CheckCircle2, Activity } from 'lucide-react';

interface ClientCardProps {
  client: Client;
  onClick: (client: Client) => void;
}

const ClientCard: React.FC<ClientCardProps> = ({ client, onClick }) => {
  const getReliabilityColor = (ratio: number) => {
    if (ratio === 0) return 'text-emerald-500 bg-emerald-50 border-emerald-100';
    if (ratio < 25) return 'text-amber-500 bg-amber-50 border-amber-100';
    return 'text-red-500 bg-red-50 border-red-100';
  };

  return (
    <div 
      onClick={() => onClick(client)}
      className="bg-white border border-slate-200 rounded-xl p-5 hover:shadow-md transition-shadow cursor-pointer group relative overflow-hidden"
    >
      <div className="flex justify-between items-start mb-4">
        <div>
          <h3 className="font-bold text-lg text-slate-900 group-hover:text-blue-600 transition-colors">
            {client.firstName} {client.lastName}
          </h3>
          <p className="text-sm text-slate-500">{client.email}</p>
        </div>
        <div className="flex flex-col items-end gap-1.5">
          <span className={`px-2.5 py-1 rounded-full text-[10px] font-black uppercase tracking-widest border ${STATUS_COLORS[client.status]}`}>
            {client.status.replace('_', ' ')}
          </span>
          {client.noShowRatio !== undefined && (
            <div className={`flex items-center gap-1.5 px-2.5 py-1 rounded-lg border text-[9px] font-black uppercase tracking-tighter shadow-sm ${getReliabilityColor(client.noShowRatio)}`}>
              <Activity size={12} className={client.noShowRatio > 25 ? 'animate-pulse' : ''} />
              {100 - client.noShowRatio}% Score Assiduité
            </div>
          )}
        </div>
      </div>

      <div className="space-y-2 mb-4">
        <div className="flex items-center gap-2 text-sm text-slate-600">
          <MapPin size={14} className="text-slate-400" />
          <span>{client.destinationCity} (de {client.originCountry})</span>
        </div>
        <div className="flex items-center gap-2 text-sm text-slate-600">
          <Briefcase size={14} className="text-slate-400" />
          <span>{client.profession}</span>
        </div>
      </div>

      <div className="flex flex-wrap gap-1.5 pt-4 border-t border-slate-100">
        {client.needs.slice(0, 3).map((need) => (
          <span key={need} className="bg-slate-50 text-slate-400 text-[9px] font-black uppercase tracking-widest px-2 py-0.5 rounded border border-slate-100">
            {need}
          </span>
        ))}
        <div className="ml-auto text-blue-600 opacity-0 group-hover:opacity-100 transition-all group-hover:translate-x-1">
          <ChevronRight size={18} />
        </div>
      </div>
    </div>
  );
};

export default ClientCard;
