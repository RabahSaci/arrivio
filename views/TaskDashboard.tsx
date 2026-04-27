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
  const [categoryFilter, setCategoryFilter] = useState<'ALL' | 'IEDEC' | 'REFERRAL' | 'UPLOAD' | 'HAS_NOTES'>('ALL');
  const [advisorFilter, setAdvisorFilter] = useState<string>('ALL');
  const [showCommentModal, setShowCommentModal] = useState<WorkflowTask | null>(null);
  const [tempComment, setTempComment] = useState('');
  const [currentPage, setCurrentPage] = useState(1);
  const itemsPerPage = 15;

  const canSeeAll = activeRole === UserRole.ADMIN || activeRole === UserRole.MANAGER;

  // Filtrage des tâches
  const filteredTasks = useMemo(() => {
    setCurrentPage(1); // Reset to first page on filter change
    return tasks.filter(task => {
      // Filtre de rôle : Un conseiller ne voit que ses tâches
      if (!canSeeAll && task.assignedToId !== currentUserId) return false;
      
      // Filtre de statut
      if (statusFilter !== 'ALL' && task.status !== statusFilter) return false;
      
      // Filtre d'intervenant (Privilèges seulement)
      if (canSeeAll && advisorFilter !== 'ALL' && task.assignedToId !== advisorFilter) return false;

      // Filtre de catégorie (iEDEC vs Référencements vs Téléversements)
      if (categoryFilter === 'IEDEC') {
        if (task.type !== 'FILL_SESSION_FOLLOWUP') return false;
      }
      if (categoryFilter === 'UPLOAD') {
        if (task.type !== 'UPLOAD_PARTICIPANTS') return false;
      }
      if (categoryFilter === 'REFERRAL') {
        if (task.type !== 'REFER_CLIENT') return false;
      }
      if (categoryFilter === 'HAS_NOTES') {
        if (!task.comment) return false;
      }
      
      // Filtre de recherche
      if (searchQuery) {
        const query = searchQuery.toLowerCase();
        return (
          (task.title || "").toLowerCase().includes(query) || 
          (task.description || "").toLowerCase().includes(query) ||
          (task.assignedToName || "").toLowerCase().includes(query)
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
  }, [tasks, activeRole, currentUserId, statusFilter, advisorFilter, categoryFilter, searchQuery, canSeeAll]);

  // Pagination des tâches
  const paginatedTasks = useMemo(() => {
    const startIndex = (currentPage - 1) * itemsPerPage;
    return filteredTasks.slice(startIndex, startIndex + itemsPerPage);
  }, [filteredTasks, currentPage]);

  const totalPages = Math.ceil(filteredTasks.length / itemsPerPage);

  // Statistiques
  const stats = useMemo(() => {
    const relevantTasks = canSeeAll ? tasks : tasks.filter(t => t.assignedToId === currentUserId);
    return {
      total: relevantTasks.length,
      pending: relevantTasks.filter(t => t.status === TaskStatus.PENDING).length,
      urgent: relevantTasks.filter(t => t.status === TaskStatus.PENDING && (t.priority === TaskPriority.CRITICAL || t.priority === TaskPriority.HIGH)).length,
      completed: relevantTasks.filter(t => t.status === TaskStatus.COMPLETED).length
    };
  }, [tasks, canSeeAll, currentUserId]);

  const handleToggleStatus = (task: WorkflowTask) => {
    const newStatus = task.status === TaskStatus.COMPLETED ? TaskStatus.PENDING : TaskStatus.COMPLETED;
    onUpdateTask({
      ...task,
      status: newStatus,
      completedAt: newStatus === TaskStatus.COMPLETED ? new Date().toISOString() : undefined
    });
  };

  const handleAddComment = () => {
    if (showCommentModal && tempComment.trim()) {
      onUpdateTask({
        ...showCommentModal,
        comment: tempComment.trim()
      });
      setShowCommentModal(null);
      setTempComment('');
    }
  };

  return (
    <div className="flex flex-col h-full bg-slate-50/50">
      {/* Header & Stats */}
      <div className="bg-white border-b border-slate-100 p-8">
        <div className="max-w-7xl mx-auto">
          <div className="flex flex-col md:flex-row md:items-center justify-between gap-6 mb-8">
            <div>
              <h1 className="text-3xl font-black text-slate-900 tracking-tight flex items-center gap-3">
                <LayoutDashboard className="text-blue-600" size={32} />
                TABLEAU DE BORD
              </h1>
              <p className="text-slate-500 font-medium mt-1">Gestion et suivi de vos tâches opérationnelles</p>
            </div>
            
            <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
              <div className="bg-slate-50 p-4 rounded-2xl border border-slate-100 min-w-[140px]">
                <p className="text-[10px] font-black text-slate-400 uppercase tracking-widest mb-1">Total</p>
                <p className="text-2xl font-black text-slate-900">{stats.total}</p>
              </div>
              <div className="bg-blue-50 p-4 rounded-2xl border border-blue-100 min-w-[140px]">
                <p className="text-[10px] font-black text-blue-400 uppercase tracking-widest mb-1">En cours</p>
                <p className="text-2xl font-black text-blue-600">{stats.pending}</p>
              </div>
              <div className="bg-red-50 p-4 rounded-2xl border border-red-100 min-w-[140px]">
                <p className="text-[10px] font-black text-red-400 uppercase tracking-widest mb-1">Urgent</p>
                <p className="text-2xl font-black text-red-600">{stats.urgent}</p>
              </div>
              <div className="bg-emerald-50 p-4 rounded-2xl border border-emerald-100 min-w-[140px]">
                <p className="text-[10px] font-black text-emerald-400 uppercase tracking-widest mb-1">Terminé</p>
                <p className="text-2xl font-black text-emerald-600">{stats.completed}</p>
              </div>
            </div>
          </div>

          {/* Filters */}
          <div className="flex flex-col lg:flex-row gap-4">
            <div className="relative flex-1 group">
              <Search className="absolute left-4 top-1/2 -translate-y-1/2 text-slate-400 transition-colors group-focus-within:text-blue-500" size={18} />
              <input 
                type="text" 
                placeholder="Rechercher une tâche, un client..."
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                className="w-full bg-slate-50 border-none rounded-2xl py-4 pl-12 pr-4 text-sm font-semibold text-slate-900 placeholder:text-slate-400 focus:ring-2 focus:ring-blue-500/20 transition-all"
              />
            </div>
            
            <div className="flex flex-wrap gap-4">
              <div className="flex items-center gap-2 bg-slate-50 px-4 py-2 rounded-2xl border border-slate-100">
                <Filter size={16} className="text-slate-400" />
                <select 
                  value={statusFilter}
                  onChange={(e) => setStatusFilter(e.target.value as any)}
                  className="bg-transparent border-none text-sm font-bold text-slate-700 focus:ring-0 cursor-pointer"
                >
                  <option value="ALL">Tous les statuts</option>
                  <option value={TaskStatus.PENDING}>À faire</option>
                  <option value={TaskStatus.COMPLETED}>Terminés</option>
                </select>
              </div>

              <div className="flex items-center gap-2 bg-slate-50 px-4 py-2 rounded-2xl border border-slate-100">
                <CheckCircle2 size={16} className="text-slate-400" />
                <select 
                  value={categoryFilter}
                  onChange={(e) => setCategoryFilter(e.target.value as any)}
                  className="bg-transparent border-none text-sm font-bold text-slate-700 focus:ring-0 cursor-pointer"
                >
                  <option value="ALL">Toutes catégories</option>
                  <option value="IEDEC">iEDEC (Saisie)</option>
                  <option value="UPLOAD">Téléversements</option>
                  <option value="REFERRAL">Référencements</option>
                  <option value="HAS_NOTES">Tâches avec notes</option>
                </select>
              </div>

              {canSeeAll && (
                <div className="flex items-center gap-2 bg-slate-50 px-4 py-2 rounded-2xl border border-slate-100">
                  <User size={16} className="text-slate-400" />
                  <select 
                    value={advisorFilter}
                    onChange={(e) => setAdvisorFilter(e.target.value)}
                    className="bg-transparent border-none text-sm font-bold text-slate-700 focus:ring-0 cursor-pointer"
                  >
                    <option value="ALL">Tout le personnel</option>
                    {advisors.map(adv => (
                      <option key={adv.id} value={adv.id}>{adv.firstName} {adv.lastName}</option>
                    ))}
                  </select>
                </div>
              )}
            </div>
          </div>
        </div>
      </div>

      {/* Task List */}
      <div className="flex-1 overflow-y-auto p-8">
        <div className="max-w-7xl mx-auto">
          {paginatedTasks.length === 0 ? (
            <div className="bg-white rounded-3xl p-20 border border-slate-100 flex flex-col items-center justify-center text-center shadow-sm">
              <div className="w-20 h-20 bg-slate-50 rounded-full flex items-center justify-center mb-6">
                <Inbox size={40} className="text-slate-300" />
              </div>
              <h3 className="text-xl font-black text-slate-900 mb-2">Aucune tâche trouvée</h3>
              <p className="text-slate-500 font-medium max-w-xs">Vous êtes à jour ! Aucune action n'est requise pour le moment.</p>
            </div>
          ) : (
            <div className="space-y-4">
              {paginatedTasks.map(task => (
                <div 
                  key={task.id}
                  className={`group bg-white rounded-2xl p-6 border-l-4 transition-all hover:translate-x-1 hover:shadow-xl hover:shadow-slate-200/50 ${
                    task.status === TaskStatus.COMPLETED 
                      ? 'border-emerald-500 opacity-75' 
                      : task.priority === TaskPriority.CRITICAL 
                        ? 'border-red-500' 
                        : 'border-blue-500'
                  } border-t border-r border-b border-slate-100`}
                >
                  <div className="flex items-start gap-6">
                    <button 
                      onClick={() => handleToggleStatus(task)}
                      className={`mt-1 h-6 w-6 rounded-lg border-2 flex items-center justify-center transition-all ${
                        task.status === TaskStatus.COMPLETED 
                          ? 'bg-emerald-500 border-emerald-500 text-white' 
                          : 'border-slate-200 group-hover:border-blue-400'
                      }`}
                    >
                      {task.status === TaskStatus.COMPLETED && <CheckCircle size={14} />}
                    </button>

                    <div className="flex-1">
                      <div className="flex items-center justify-between mb-2">
                        <div className="flex items-center gap-3">
                          <span className={`px-2 py-0.5 rounded-md text-[10px] font-black uppercase tracking-wider ${
                            task.priority === TaskPriority.CRITICAL ? 'bg-red-100 text-red-600' :
                            task.priority === TaskPriority.HIGH ? 'bg-orange-100 text-orange-600' :
                            'bg-blue-100 text-blue-600'
                          }`}>
                            {task.priority}
                          </span>
                          <span className="text-[10px] font-black text-slate-400 uppercase tracking-widest">
                            {task.type.replace(/_/g, ' ')}
                          </span>
                        </div>
                        <span className="text-xs font-bold text-slate-400 flex items-center gap-1.5">
                          <Clock size={12} />
                          {new Date(task.dueDate).toLocaleDateString('fr-FR', { day: 'numeric', month: 'short' })}
                        </span>
                      </div>

                      <h3 className={`text-base font-black mb-1 ${task.status === TaskStatus.COMPLETED ? 'text-slate-400 line-through' : 'text-slate-900'}`}>
                        {task.title}
                      </h3>
                      <p className="text-slate-500 text-sm font-medium mb-4 line-clamp-2">
                        {task.description}
                      </p>

                      {task.comment && (
                        <div className="mb-4 p-4 bg-blue-50/50 rounded-xl border border-blue-100 flex items-start gap-3">
                          <MessageSquare size={14} className="text-blue-500 mt-1 shrink-0" />
                          <div>
                            <p className="text-[10px] font-black text-blue-400 uppercase tracking-widest mb-1">Note de l'intervenant</p>
                            <p className="text-sm font-semibold text-slate-700 italic">"{task.comment}"</p>
                          </div>
                        </div>
                      )}

                      <div className="flex flex-wrap items-center justify-between gap-4 pt-4 border-t border-slate-50">
                        <div className="flex items-center gap-6">
                          <div className="flex items-center gap-2">
                            <div className="h-6 w-6 bg-slate-100 rounded-full flex items-center justify-center text-[10px] font-black text-slate-500">
                              {task.assignedToName?.charAt(0) || 'U'}
                            </div>
                            <span className="text-xs font-bold text-slate-600">{task.assignedToName}</span>
                          </div>
                          
                          {task.relatedEntityId && (
                            <button 
                              onClick={() => onNavigateToEntity(task.relatedEntityType as any, task.relatedEntityId!)}
                              className="text-xs font-black text-blue-600 uppercase tracking-widest hover:text-blue-700 flex items-center gap-1.5 group/link"
                            >
                              <ExternalLink size={12} className="transition-transform group-hover/link:-translate-y-0.5 group-hover/link:translate-x-0.5" />
                              Voir {task.relatedEntityType}
                            </button>
                          )}
                        </div>

                        <button 
                          onClick={() => setShowCommentModal(task)}
                          className="flex items-center gap-2 px-4 py-2 bg-slate-50 text-slate-600 rounded-xl text-xs font-black uppercase tracking-widest hover:bg-slate-100 transition-colors"
                        >
                          <MessageSquare size={14} />
                          Commenter
                        </button>
                      </div>
                    </div>
                  </div>
                </div>
              ))}
            </div>
          )}

          {/* Pagination */}
          {totalPages > 1 && (
            <div className="mt-12 bg-white rounded-2xl p-4 border border-slate-100 shadow-sm">
              <Pagination 
                currentPage={currentPage}
                totalPages={totalPages}
                onPageChange={setCurrentPage}
              />
            </div>
          )}
        </div>
      </div>

      {/* Comment Modal */}
      {showCommentModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-900/60 backdrop-blur-sm">
          <div className="bg-white rounded-3xl w-full max-w-lg shadow-2xl overflow-hidden animate-in fade-in zoom-in duration-200">
            <div className="p-8 border-b border-slate-100 flex items-center justify-between">
              <div>
                <h3 className="text-xl font-black text-slate-900 tracking-tight">AJOUTER UNE NOTE</h3>
                <p className="text-slate-500 text-xs font-bold uppercase tracking-widest mt-1">{showCommentModal.title}</p>
              </div>
              <button 
                onClick={() => setShowCommentModal(null)}
                className="p-2 hover:bg-slate-100 rounded-xl text-slate-400 transition-colors"
              >
                <X size={20} />
              </button>
            </div>
            
            <div className="p-8">
              <textarea 
                value={tempComment}
                onChange={(e) => setTempComment(e.target.value)}
                placeholder="Saisissez votre commentaire ici..."
                className="w-full h-40 bg-slate-50 border-none rounded-2xl p-4 text-sm font-semibold text-slate-900 placeholder:text-slate-400 focus:ring-2 focus:ring-blue-500/20 transition-all resize-none"
              />
              
              <div className="flex gap-4 mt-8">
                <button 
                  onClick={() => setShowCommentModal(null)}
                  className="flex-1 px-6 py-4 bg-slate-100 text-slate-600 rounded-2xl font-black uppercase text-xs tracking-widest hover:bg-slate-200 transition-colors"
                >
                  Annuler
                </button>
                <button 
                  onClick={handleAddComment}
                  disabled={!tempComment.trim()}
                  className="flex-1 px-6 py-4 bg-blue-600 text-white rounded-2xl font-black uppercase text-xs tracking-widest hover:bg-blue-700 transition-all shadow-lg shadow-blue-100 disabled:opacity-50 disabled:bg-slate-300 disabled:shadow-none"
                >
                  Enregistrer
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
