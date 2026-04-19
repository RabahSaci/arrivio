import React, { useState, useMemo } from 'react';
import { WorkflowTask, TaskStatus, TaskPriority, UserRole, Profile } from '../types';
import Pagination from '../components/Pagination';
import { 
  CheckCircle2, 
  Clock, 
  AlertCircle, 
  Search, 
  Filter, 
  ChevronRight, 
  MessageSquare, 
  Calendar as CalendarIcon, 
  User, 
  ExternalLink,
  ChevronDown,
  Inbox,
  LayoutDashboard,
  CheckCircle,
  X
} from 'lucide-react';

interface TaskDashboardProps {
  tasks: WorkflowTask[];
  activeRole: UserRole;
  currentUserId: string;
  advisors: Profile[];
  onUpdateTask: (updatedTask: WorkflowTask) => void;
  onNavigateToEntity: (type: 'SESSION' | 'CLIENT' | 'CONTRACT', id: string) => void;
}

const TaskDashboard: React.FC<TaskDashboardProps> = ({ 
  tasks, 
  activeRole, 
  currentUserId, 
  advisors,
  onUpdateTask,
  onNavigateToEntity 
}) => {
  const [searchQuery, setSearchQuery] = useState('');
  const [statusFilter, setStatusFilter] = useState<TaskStatus | 'ALL'>('ALL');
  const [advisorFilter, setAdvisorFilter] = useState<string>('ALL');
  const [showCommentModal, setShowCommentModal] = useState<WorkflowTask | null>(null);
  const [tempComment, setTempComment] = useState('');
  const [currentPage, setCurrentPage] = useState(1);
  const itemsPerPage = 15;

  const isAdmin = activeRole === UserRole.ADMIN;

  // Filtrage des tâches
  const filteredTasks = useMemo(() => {
    setCurrentPage(1); // Reset to first page on filter change
    return tasks.filter(task => {
      // Filtre de rôle
      if (!isAdmin && task.assignedToId !== currentUserId) return false;
      
      // Filtre de statut
      if (statusFilter !== 'ALL' && task.status !== statusFilter) return false;
      
      // Filtre d'intervenant (Admin seulement)
      if (isAdmin && advisorFilter !== 'ALL' && task.assignedToId !== advisorFilter) return false;
      
      // Filtre de recherche
      if (searchQuery) {
        const query = searchQuery.toLowerCase();
        return (
          task.title.toLowerCase().includes(query) || 
          task.description?.toLowerCase().includes(query) ||
          task.assignedToName.toLowerCase().includes(query)
        );
      }
      
      return true;
    }).sort((a, b) => {
      // Tri par priorité d'abord (CRITICAL > HIGH > MEDIUM > LOW)
      const priorityOrder = { [TaskPriority.CRITICAL]: 0, [TaskPriority.HIGH]: 1, [TaskPriority.MEDIUM]: 2, [TaskPriority.LOW]: 3 };
      if (priorityOrder[a.priority] !== priorityOrder[b.priority]) {
        return priorityOrder[a.priority] - priorityOrder[b.priority];
      }
      // Puis par date d'échéance
      return new Date(a.dueDate).getTime() - new Date(b.dueDate).getTime();
    });
  }, [tasks, activeRole, currentUserId, statusFilter, advisorFilter, searchQuery, isAdmin]);

  // Pagination des tâches
  const paginatedTasks = useMemo(() => {
    const startIndex = (currentPage - 1) * itemsPerPage;
    return filteredTasks.slice(startIndex, startIndex + itemsPerPage);
  }, [filteredTasks, currentPage]);

  const totalPages = Math.ceil(filteredTasks.length / itemsPerPage);

  // Statistiques
  const stats = useMemo(() => {
    const relevantTasks = isAdmin ? tasks : tasks.filter(t => t.assignedToId === currentUserId);
    return {
      total: relevantTasks.length,
      pending: relevantTasks.filter(t => t.status === TaskStatus.PENDING).length,
      urgent: relevantTasks.filter(t => t.status === TaskStatus.PENDING && (t.priority === TaskPriority.CRITICAL || t.priority === TaskPriority.HIGH)).length,
      completed: relevantTasks.filter(t => t.status === TaskStatus.COMPLETED).length
    };
  }, [tasks, isAdmin, currentUserId]);

  const handleToggleComplete = (task: WorkflowTask) => {
    const isCompleted = task.status === TaskStatus.COMPLETED;
    onUpdateTask({
      ...task,
      status: isCompleted ? TaskStatus.PENDING : TaskStatus.COMPLETED,
      completedAt: isCompleted ? undefined : new Date().toISOString()
    });
  };

  const handleSaveComment = () => {
    if (showCommentModal) {
      onUpdateTask({ ...showCommentModal, comment: tempComment });
      setShowCommentModal(null);
      setTempComment('');
    }
  };

  const getPriorityColor = (priority: TaskPriority) => {
    switch (priority) {
      case TaskPriority.CRITICAL: return 'bg-red-50 text-red-700 border-red-200';
      case TaskPriority.HIGH: return 'bg-amber-50 text-amber-700 border-amber-200';
      case TaskPriority.MEDIUM: return 'bg-blue-50 text-blue-700 border-blue-200';
      default: return 'bg-slate-50 text-slate-700 border-slate-200';
    }
  };

  return (
    <div className="flex flex-col h-full space-y-6">
      {/* Stats Cards */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4 px-8 pt-2">
          {[
            { label: 'Tâches Totales', value: stats.total, icon: Inbox, color: 'text-slate-600', bg: 'bg-slate-50' },
            { label: 'À Traiter', value: stats.pending, icon: Clock, color: 'text-blue-600', bg: 'bg-blue-50' },
            { label: 'Urgentes', value: stats.urgent, icon: AlertCircle, color: 'text-amber-600', bg: 'bg-amber-50' },
            { label: 'Livrées (7j)', value: stats.completed, icon: CheckCircle, color: 'text-emerald-600', bg: 'bg-emerald-50' },
          ].map((stat, i) => (
            <div key={i} className={`${stat.bg} p-6 rounded-[2rem] border border-white shadow-sm flex items-center gap-5 transition-transform hover:scale-[1.02] duration-300`}>
              <div className={`p-4 rounded-2xl bg-white shadow-sm ${stat.color}`}>
                <stat.icon size={24} />
              </div>
              <div>
                <p className="text-[10px] font-black text-slate-400 uppercase tracking-widest">{stat.label}</p>
                <p className={`text-2xl font-black ${stat.color}`}>{stat.value}</p>
              </div>
            </div>
          ))}
        </div>

      <div className="px-8 shrink-0">
        <div className="flex flex-wrap items-center gap-4 bg-white p-4 rounded-[32px] border border-slate-200 shadow-sm">
          <div className="relative flex-1 min-w-[200px]">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400" size={14} />
            <input 
              type="text" 
              placeholder="Rechercher une tâche..."
              className="slds-input slds-input-compact pl-10"
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
            />
          </div>

          <div className="flex items-center gap-2">
            <Filter size={12} className="text-slate-400" />
            <select 
              className="slds-input slds-input-compact w-auto min-w-[140px]"
              value={statusFilter}
              onChange={(e) => setStatusFilter(e.target.value as any)}
            >
              <option value="ALL">Tous les statuts</option>
              <option value={TaskStatus.PENDING}>À faire</option>
              <option value={TaskStatus.COMPLETED}>Terminées</option>
            </select>
          </div>

          {isAdmin && (
            <div className="flex items-center gap-2 border-l pl-4 border-slate-100">
              <User size={12} className="text-slate-400" />
              <select 
                className="slds-input slds-input-compact w-auto min-w-[140px]"
                value={advisorFilter}
                onChange={(e) => setAdvisorFilter(e.target.value)}
              >
                <option value="ALL">Toute l'équipe</option>
                {advisors.map(a => <option key={a.id} value={a.id}>{a.firstName} {a.lastName}</option>)}
              </select>
            </div>
          )}
        </div>
      </div>

      {/* Task List */}
      <div className="flex-1 overflow-y-auto px-8 pb-12 custom-scrollbar">
        {paginatedTasks.length > 0 ? (
          <div className="grid grid-cols-1 gap-4 mt-4">
            {paginatedTasks.map(task => (
              <div 
                key={task.id} 
                className={`bg-white border rounded-[2rem] p-6 flex items-center gap-6 transition-all hover:shadow-lg group ${task.status === TaskStatus.COMPLETED ? 'opacity-60 grayscale-[0.5]' : 'border-slate-100'}`}
              >
                <button 
                  onClick={() => handleToggleComplete(task)}
                  className={`shrink-0 w-8 h-8 rounded-full border-2 flex items-center justify-center transition-all ${task.status === TaskStatus.COMPLETED ? 'bg-emerald-500 border-emerald-500 text-white' : 'border-slate-200 hover:border-blue-500 hover:bg-blue-50 text-transparent'}`}
                >
                  <CheckCircle2 size={20} />
                </button>

                <div className="flex-1 min-w-0">
                  <div className="flex items-center gap-3 mb-1">
                    <span className={`px-2.5 py-1 rounded-lg text-[9px] font-black uppercase tracking-widest border ${getPriorityColor(task.priority)}`}>
                      {task.priority}
                    </span>
                    <h3 className={`text-sm font-black text-slate-800 truncate ${task.status === TaskStatus.COMPLETED ? 'line-through' : ''}`}>
                      {task.title}
                    </h3>
                  </div>
                  <p className="text-xs text-slate-500 font-medium line-clamp-1">{task.description}</p>
                </div>

                <div className="hidden md:flex flex-col items-end gap-1 px-6 border-x border-slate-100 shrink-0">
                  <div className="flex items-center gap-1.5 text-[10px] font-black text-slate-400 uppercase">
                    <CalendarIcon size={12} /> {new Date(task.dueDate).toLocaleDateString()}
                  </div>
                  {isAdmin && (
                    <div className="flex items-center gap-1.5 text-[10px] font-black text-blue-600 uppercase">
                      <User size={12} /> {task.assignedToName}
                    </div>
                  )}
                </div>

                <div className="flex items-center gap-3">
                  <button 
                    onClick={() => { setShowCommentModal(task); setTempComment(task.comment || ''); }}
                    className={`p-3 rounded-2xl transition-all ${task.comment ? 'bg-blue-50 text-blue-600' : 'bg-slate-50 text-slate-400 hover:bg-slate-100'}`}
                    title="Commentaires"
                  >
                    <MessageSquare size={18} />
                  </button>
                  
                  {task.relatedEntityId && task.relatedEntityType && (
                    <button 
                      onClick={() => onNavigateToEntity(task.relatedEntityType!, task.relatedEntityId!)}
                      className="p-3 bg-slate-900 text-white rounded-2xl hover:bg-blue-600 transition-all shadow-sm"
                      title="Aller à l'élément"
                    >
                      <ExternalLink size={18} />
                    </button>
                  )}
                </div>
              </div>
            ))}

            {/* Pagination */}
            {totalPages > 1 && (
              <div className="mt-8 flex justify-center pb-8">
                <Pagination 
                  currentPage={currentPage}
                  totalPages={totalPages}
                  onPageChange={setCurrentPage}
                />
              </div>
            )}
          </div>
        ) : (
          <div className="flex flex-col items-center justify-center py-24 text-center">
            <div className="w-24 h-24 bg-white rounded-full flex items-center justify-center text-slate-100 shadow-sm mb-6">
              <CheckCircle size={48} />
            </div>
            <h3 className="text-xl font-black text-slate-900">Tout est à jour !</h3>
            <p className="text-slate-400 font-medium mt-2">Aucune tâche ne correspond à vos filtres actuels.</p>
          </div>
        )}
      </div>

      {/* Comment Modal */}
      {showCommentModal && (
        <div className="fixed inset-0 bg-slate-900/60 backdrop-blur-sm z-[1000] flex items-center justify-center p-4">
          <div className="bg-white w-full max-w-lg rounded-[2.5rem] shadow-2xl overflow-hidden animate-in zoom-in-95 duration-200">
            <div className="p-8 border-b border-slate-100 flex justify-between items-center bg-slate-50/50">
              <div>
                <h3 className="text-xl font-black text-slate-900">Ajouter une note</h3>
                <p className="text-[10px] font-black text-slate-400 uppercase tracking-widest mt-1">Précisez le suivi pour cette tâche</p>
              </div>
              <button onClick={() => setShowCommentModal(null)} className="p-2 hover:bg-white rounded-xl text-slate-400"><X size={20} /></button>
            </div>
            <div className="p-8">
              <textarea 
                className="w-full h-40 bg-slate-50 border-transparent rounded-3xl p-6 text-sm font-medium focus:bg-white focus:ring-2 focus:ring-blue-100 transition-all outline-none resize-none"
                placeholder="Ex: Client rappelé, en attente de réponse..."
                value={tempComment}
                onChange={(e) => setTempComment(e.target.value)}
                autoFocus
              />
              <div className="flex gap-3 mt-8">
                <button 
                  onClick={() => setShowCommentModal(null)}
                  className="flex-1 py-4 bg-slate-100 text-slate-600 font-black uppercase text-[11px] tracking-widest rounded-2xl hover:bg-slate-200 transition-all"
                >
                  Annuler
                </button>
                <button 
                  onClick={handleSaveComment}
                  className="flex-1 py-4 bg-blue-600 text-white font-black uppercase text-[11px] tracking-widest rounded-2xl hover:bg-blue-700 shadow-lg shadow-blue-100 transition-all"
                >
                  Enregistrer la note
                </button>
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

export default TaskDashboard;
