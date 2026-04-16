
import React from 'react';
import { AlertTriangle, X } from 'lucide-react';

interface ConfirmModalProps {
  isOpen: boolean;
  title: string;
  message: string;
  confirmLabel: string;
  cancelLabel?: string;
  onConfirm: () => void;
  onCancel: () => void;
  variant?: 'danger' | 'warning' | 'info';
}

const ConfirmModal: React.FC<ConfirmModalProps> = ({
  isOpen,
  title,
  message,
  confirmLabel,
  cancelLabel = "Annuler",
  onConfirm,
  onCancel,
  variant = 'danger'
}) => {
  if (!isOpen) return null;

  const colors = {
    danger: 'bg-red-600 hover:bg-red-700 shadow-red-100 text-white',
    warning: 'bg-amber-500 hover:bg-amber-600 shadow-amber-100 text-white',
    info: 'bg-blue-600 hover:bg-blue-700 shadow-blue-100 text-white'
  };

  const iconColors = {
    danger: 'bg-red-50 text-red-600',
    warning: 'bg-amber-50 text-amber-500',
    info: 'bg-blue-50 text-blue-600'
  };

  return (
    <div className="fixed inset-0 bg-slate-900/60 backdrop-blur-sm z-[1000] flex items-center justify-center p-4 animate-in fade-in duration-200">
      <div className="bg-white rounded-[32px] w-full max-w-md shadow-2xl overflow-hidden animate-in zoom-in-95 duration-200">
        <div className="p-6 flex justify-between items-center border-b border-slate-50">
          <div className="flex items-center gap-3">
            <div className={`p-2 rounded-xl ${iconColors[variant]}`}>
              <AlertTriangle size={20} />
            </div>
            <h3 className="font-black text-slate-900 tracking-tight">{title}</h3>
          </div>
          <button onClick={onCancel} className="p-2 hover:bg-slate-100 rounded-full text-slate-400 transition-colors">
            <X size={18} />
          </button>
        </div>
        
        <div className="p-8">
          <p className="text-sm font-medium text-slate-600 leading-relaxed">
            {message}
          </p>
        </div>

        <div className="p-6 bg-slate-50 flex gap-3">
          <button 
            onClick={onCancel}
            className="flex-1 px-6 py-3 bg-white border border-slate-200 text-slate-400 text-[10px] font-black uppercase tracking-widest rounded-2xl hover:text-slate-700 hover:border-slate-300 transition-all"
          >
            {cancelLabel}
          </button>
          <button 
            onClick={() => {
              onConfirm();
              onCancel();
            }}
            className={`flex-1 px-6 py-3 rounded-2xl text-[10px] font-black uppercase tracking-widest shadow-xl transition-all active:scale-95 ${colors[variant]}`}
          >
            {confirmLabel}
          </button>
        </div>
      </div>
    </div>
  );
};

export default ConfirmModal;
