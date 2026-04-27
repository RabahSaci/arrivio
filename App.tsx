
import React, { useState, useEffect, useCallback, useRef } from 'react';
import Layout from './components/Layout';
import Dashboard from './views/Dashboard';
import Login from './views/Login';
import ClientList from './views/ClientList';
import ClientDetails from './views/ClientDetails';
import SessionList from './views/SessionList';
import CalendarView from './views/CalendarView';
import ReferralManagement from './views/ReferralManagement';
import MentorManagement from './views/MentorManagement';
import PartnerManagement from './views/PartnerManagement';
import ActivityLogs from './views/ActivityLogs';
import ContractManagement from './views/ContractManagement';
import JobMatching from './views/JobMatching';
import ActivityMatching from './views/ActivityMatching';
import AccountManagement from './views/AccountManagement';
import Reports from './views/Reports';
import Settings from './views/Settings';
import Messaging from './views/Messaging';
import TaskDashboard from './views/TaskDashboard';
import { refreshAutomatedTasks, purgeOldTasks } from './services/taskService';
import { 
  UserRole, 
  Client, 
  Mentor, 
  Notification, 
  NotificationType, 
  ReferralStatus, 
  Session, 
  UserActivityLog, 
  Contract, 
  Profile, 
  Partner, 
  PartnerType,
  AttendanceStatus,
  WorkflowTask,
  TaskStatus
} from './types';
import { apiService } from './services/apiService';
import { Database, AlertTriangle, RefreshCcw, LayoutDashboard, ClipboardList } from 'lucide-react';
import { INACTIVITY_LIMIT } from './constants';

const App: React.FC = () => {
  const [isLoggedIn, setIsLoggedIn] = useState<boolean>(false);
  const [activeRole, setActiveRole] = useState<UserRole>(UserRole.ADVISOR);
  const [activeTab, setActiveTab] = useState<string>('sessions'); 
  
  const [currentUserId, setCurrentUserId] = useState<string>("");
  const [currentUserName, setCurrentUserName] = useState<string>("");
  const [currentPartnerId, setCurrentPartnerId] = useState<string | undefined>(undefined);

  const [clients, setClients] = useState<Client[]>([]);
  const [sessions, setSessions] = useState<Session[]>([]);
  const [contracts, setContracts] = useState<Contract[]>([]);
  const [mentors, setMentors] = useState<Mentor[]>([]);
  const [activityLogs, setActivityLogs] = useState<UserActivityLog[]>([]);
  const [profiles, setProfiles] = useState<Profile[]>([]);
  const [partners, setPartners] = useState<Partner[]>([]);
  const [notifications, setNotifications] = useState<Notification[]>([]);
  const [tasks, setTasks] = useState<WorkflowTask[]>([]);
  
  const [isLoading, setIsLoading] = useState(false);
  const [loadingProgress, setLoadingProgress] = useState(0);
  const [error, setError] = useState<string | null>(null);
  const [selectedClientId, setSelectedClientId] = useState<string | null>(null);
  const [selectedClient, setSelectedClient] = useState<Client | null>(null);

  const lastActivityRef = useRef<number>(Date.now());

  const handleLogout = useCallback(async () => {
    apiService.logout();
    localStorage.removeItem('arrivio_user');
    setIsLoggedIn(false);
    setCurrentUserId("");
  }, []);

  useEffect(() => {
    if (!isLoggedIn) return;
    lastActivityRef.current = Date.now();
    const updateActivity = () => { lastActivityRef.current = Date.now(); };
    const events = ['mousemove', 'keydown', 'click', 'scroll', 'touchstart'];
    events.forEach(event => window.addEventListener(event, updateActivity));
    const checkInactivity = setInterval(() => {
      if (Date.now() - lastActivityRef.current > INACTIVITY_LIMIT) {
        handleLogout();
      }
    }, 10000);
    return () => {
      events.forEach(event => window.removeEventListener(event, updateActivity));
      clearInterval(checkInactivity);
    };
  }, [isLoggedIn, handleLogout]);
  
  // 3. AUTO-REFRESH (Silence Sync)
  useEffect(() => {
    if (!isLoggedIn) return;
    
    const autoRefresh = setInterval(() => {
      if (!isLoading) {
        fetchData();
      }
    }, 60000); // Sync every 1 minute
    
    return () => clearInterval(autoRefresh);
  }, [isLoggedIn, isLoading]);

  useEffect(() => {
    if (isLoggedIn && sessions.length > 0 && clients.length > 0) {
      const purged = purgeOldTasks(tasks);
      const updatedTasks = refreshAutomatedTasks(
        sessions,
        clients,
        contracts,
        profiles,
        purged,
        currentUserName,
        currentUserId
      );

      // Identifier les tâches qui ne sont pas encore en base de données (signature non présente)
      const newAutoTasks = updatedTasks.filter(t => 
        !tasks.some(dbTask => dbTask.processedSignature === t.processedSignature)
      );

      if (newAutoTasks.length > 0) {
        console.info(`[TASKS] Sending ${newAutoTasks.length} new automated tasks to DB...`);
        // Supprimer les IDs temporaires pour laisser la DB générer des UUIDs valides
        const tasksToSave = newAutoTasks.map(({ id, ...rest }) => rest);
        
        apiService.bulkCreate('workflow_tasks', tasksToSave).then(saved => {
          console.info(`[TASKS] Successfully saved ${saved.length} tasks matching current filters.`);
          setTasks(prev => {
            // Fusionner sans doublons de signature
            const merged = [...prev];
            saved.forEach((s: WorkflowTask) => {
              if (!merged.find(m => m.id === s.id || m.processedSignature === s.processedSignature)) {
                merged.push(s);
              }
            });
            return merged;
          });
        }).catch(err => {
          console.error("Erreur lors de la sauvegarde des tâches automatiques:", err);
        });
      }
    }
  }, [sessions, clients, contracts, profiles, isLoggedIn, currentUserName, currentUserId, tasks.length]);

  const handleUpdateTask = async (updatedTask: WorkflowTask) => {
    try {
      await apiService.update('workflow_tasks', updatedTask.id, updatedTask);
      setTasks(prev => prev.map(t => t.id === updatedTask.id ? updatedTask : t));
    } catch (err) {
      console.error("Erreur mise à jour tâche:", err);
      addNotification(NotificationType.SYSTEM, "Erreur", "Impossible de mettre à jour la tâche en base de données.");
    }
  };

  useEffect(() => {
    const checkSession = async () => {
      if (!localStorage.getItem('arrivio_token')) return;
      const isAuthenticated = await apiService.getSessionStatus();
      if (isAuthenticated) {
        const token = localStorage.getItem('arrivio_token');
        if (token) {
          const savedUser = localStorage.getItem('arrivio_user');
          if (savedUser) {
            const user = JSON.parse(savedUser);
            loadUserProfile(user.id);
          }
        }
      }
    };
    checkSession();
  }, []);

  React.useEffect(() => {
    window.scrollTo(0, 0);
  }, [selectedClientId, activeTab]);

  const loadUserProfile = async (userId: string) => {
    try {
      const data = await apiService.fetchTable('profiles');
      const profile = Array.isArray(data) ? data.find(p => p.id === userId) : data;
      if (profile) {
        handleLogin(
          profile.role as UserRole, 
          userId, 
          `${profile.firstName} ${profile.lastName}`, 
          profile.partnerId
        );
      } else {
        handleLogin(UserRole.ADVISOR, userId, "Utilisateur");
      }
    } catch (err) {
      setIsLoggedIn(false);
    }
  };

  const handleLogin = (role: UserRole, userId: string, userName: string, partnerId?: string) => {
    setActiveRole(role);
    setCurrentUserId(userId);
    setCurrentUserName(userName);
    setCurrentPartnerId(partnerId);
    setIsLoggedIn(true);
    if (role !== UserRole.ADMIN && (activeTab === 'settings' || activeTab === 'accounts' || activeTab === 'payments')) {
      setActiveTab('sessions');
    } else if (role === UserRole.PARTNER && activeTab === 'sessions') {
      setActiveTab('clients');
    }
    lastActivityRef.current = Date.now();
    logActivity('LOGIN', 'PROFILE', `Connexion de l'utilisateur ${userName}`);
  };

  const handleUpdateAccount = async (updatedProfile: Profile) => {
    try {
      const oldProfile = profiles.find(p => p.id === updatedProfile.id);
      const delta = getDelta(oldProfile, updatedProfile);
      
      await apiService.update('profiles', updatedProfile.id, {
        first_name: updatedProfile.firstName,
        last_name: updatedProfile.lastName,
        position: updatedProfile.position
      });

      setProfiles(prev => prev.map(p => p.id === updatedProfile.id ? updatedProfile : p));
      if (updatedProfile.id === currentUserId) {
        setCurrentUserName(`${updatedProfile.firstName} ${updatedProfile.lastName}`);
      }
      
      await logActivity('UPDATE', 'PROFILE', `Mise à jour du profil de ${updatedProfile.firstName} ${updatedProfile.lastName}`, delta, updatedProfile.id);
      addNotification(NotificationType.SUCCESS, "Profil mis à jour", "Vos informations ont été enregistrées.");
    } catch (err) {
      console.error("Error updating account:", err);
      addNotification(NotificationType.SYSTEM, "Erreur", "Impossible de mettre à jour votre profil.");
    }
  };

  const addNotification = useCallback((type: NotificationType, title: string, message: string, targetId?: string) => {
    const newNotif: Notification = {
      id: Math.random().toString(36).substr(2, 9),
      type, title, message, timestamp: new Date().toISOString(),
      isRead: false, targetId
    };
    setNotifications(prev => [newNotif, ...prev].slice(0, 50));
  }, []);

  // UTILITY: Calculate changes between two objects for audit logs
  const getDelta = (oldObj: any, newObj: any) => {
    if (!oldObj || !newObj) return null;
    const delta: Record<string, { from: any; to: any }> = {};
    const keys = new Set([...Object.keys(oldObj), ...Object.keys(newObj)]);
    
    // Technical fields common in our schema to ignore
    const ignoredKeys = ['id', 'created_at', 'updated_at', 'last_modified', 'is_approved', 'is_profile_completed', 'needs'];
    
    keys.forEach(key => {
      if (ignoredKeys.includes(key)) return;
      
      const oldVal = oldObj[key];
      const newVal = newObj[key];
      
      // Compare values, strings, numbers or arrays (via stringification)
      if (typeof oldVal === 'object' || typeof newVal === 'object') {
        if (JSON.stringify(oldVal) !== JSON.stringify(newVal)) {
          delta[key] = { from: oldVal, to: newVal };
        }
      } else if (oldVal !== newVal) {
        delta[key] = { from: oldVal, to: newVal };
      }
    });

    // MASK SENSITIVE FIELDS: Password or Roles logic
    const sensitiveKeys = ['password', 'role'];
    sensitiveKeys.forEach(key => {
      if (delta[key]) {
        delta[key] = { from: '[MASQUÉ]', to: '[MODIFIÉ]' };
      }
    });
    
    return Object.keys(delta).length > 0 ? delta : null;
  };

  const logActivity = async (
    action: 'CREATE' | 'UPDATE' | 'DELETE' | 'LOGIN' | 'SECURITY_ALERT', 
    entity: 'SESSION' | 'CLIENT' | 'MENTOR' | 'CONTRACT' | 'PROFILE' | 'PARTNER' | 'AUTHENTIFICATION', 
    details: string,
    metadata?: any,
    entityId?: string
  ) => {
    try {
      await apiService.create('activity_logs', {
        user_id: currentUserId,
        user_name: currentUserName,
        action_type: action,
        entity_type: entity,
        details: (metadata || entityId) ? JSON.stringify({ 
          message: details, 
          changes: metadata,
          entity_id: entityId // Use snake_case internally to avoid toCamel issues later
        }) : details,
        timestamp: new Date().toISOString()
      });
      fetchLogs();
    } catch (err) {
      console.error("Erreur logging:", err);
    }
  };

  const fetchLogs = async () => {
    try {
      const data = await apiService.fetchTable('activity_logs');
      if (Array.isArray(data)) {
        setActivityLogs(data.map((l: any) => ({
          id: l.id,
          userId: l.userId,
          userName: l.userName,
          actionType: l.actionType,
          entityType: l.entityType,
          details: l.details,
          timestamp: l.timestamp
        })));
      }
    } catch (e) {
      console.warn("Impossible de récupérer les logs", e);
    }
  };

  const fetchData = async () => {
    setIsLoading(true);
    setError(null);
    setLoadingProgress(0);
    try {
      const tables = [
        { name: 'mentors', setter: setMentors },
        { name: 'contracts', setter: setContracts },
        { name: 'profiles', setter: setProfiles },
        { name: 'partners', setter: setPartners },
        { name: 'clients', setter: setClients },
        { name: 'sessions', setter: setSessions },
        { name: 'activity_logs', setter: setActivityLogs },
        { name: 'workflow_tasks', setter: setTasks }
      ];

      let completed = 0;
      
      const normalizePartnerType = (raw: string): PartnerType => {
        const val = (raw || '').toUpperCase().trim();
        if (val === 'CONSULTANT') return PartnerType.CONSULTANT;
        if (val === 'INTERNE' || val === 'INTERNAL') return PartnerType.INTERNAL;
        if (val === 'COLLABORATION_EXTERNE' || val === 'EXTERNAL') return PartnerType.EXTERNAL;
        return PartnerType.EXTERNAL;
      };

      await Promise.allSettled(tables.map(async (table) => {
        try {
          const data = await apiService.fetchTable(table.name as any);
          if (Array.isArray(data)) {
            // Internal mapping based on table name
            if (table.name === 'partners') {
              table.setter(data.map((p: any) => ({
                id: p.id, name: p.name, city: p.city, province: p.province,
                specialties: p.specialties || [], type: normalizePartnerType(p.type)
              })));
            } else if (table.name === 'mentors') {
              table.setter(data.map((m: any) => ({
                id: m.id, firstName: m.firstName, lastName: m.lastName, profession: m.profession,
                city: m.city, domain: m.domain, originCountry: m.originCountry, organizationId: m.organizationId
              })));
            } else if (table.name === 'contracts') {
              table.setter(data.map((con: any) => ({
                id: con.id, consultantName: con.consultantName, totalSessions: con.totalSessions || 0,
                usedSessions: con.usedSessions || 0, startDate: con.startDate, endDate: con.endDate,
                status: con.status as any, amount: con.amount || 0
              })));
            } else if (table.name === 'clients') {
              table.setter(data.map((c: any) => ({
                ...c, chosenCity: c.chosenCity || c.chosenProvince,
                residenceCountry: c.residenceCountry || c.birthCountry,
                currentJob: c.currentJob || c.currentProfessionGroup
              })));
            } else {
              table.setter(data);
            }
          }
        } catch (e) {
          console.warn(`[fetchData] Failed to fetch '${table.name}'`, e);
        } finally {
          completed++;
          setLoadingProgress(Math.round((completed / tables.length) * 100));
        }
      }));

    } catch (err: any) {
      console.error("Erreur sync:", err);
      setError(err.message || "Erreur de connexion");
    } finally {
      setIsLoading(false);
    }
  };

  useEffect(() => {
    if (isLoggedIn) fetchData();
  }, [isLoggedIn]);

  const handleAddClient = async (newClient: Client) => {
    try {
      await apiService.create('clients', {
        client_code: newClient.clientCode,
        registration_date: newClient.registrationDate,
        inbound_referral_date: newClient.inboundReferralDate,
        first_name: newClient.firstName,
        last_name: newClient.lastName,
        birth_date: newClient.birthDate,
        gender: newClient.gender,
        residence_country: newClient.residenceCountry,
        birth_country: newClient.birthCountry,
        iuc_crp_number: newClient.iucCrpNumber,
        email: newClient.email,
        phone_number: newClient.phoneNumber,
        participated_immigration_program: newClient.participatedImmigrationProgram,
        immigration_type: newClient.immigrationType,
        linked_account: newClient.linkedAccount,
        main_applicant: newClient.mainApplicant,
        spouse_full_name: newClient.spouseFullName,
        spouse_birth_date: newClient.spouseBirthDate,
        spouse_email: newClient.spouseEmail,
        spouse_iuc_crp_number: newClient.spouseIucCrpNumber,
        children_count: newClient.childrenCount,
        children_birth_dates: newClient.childrenBirthDates,
        children_full_names: newClient.childrenFullNames,
        chosen_province: newClient.chosenProvince,
        destination_change: newClient.destinationChange,
        chosen_city: newClient.chosenCity,
        arrival_date_approx: newClient.arrivalDateApprox,
        arrival_date_confirmed: newClient.arrivalDateConfirmed,
        establishment_reason: newClient.establishmentReason,
        current_job: newClient.currentJob,
        current_employment_status: newClient.currentEmploymentStatus,
        current_noc_group: newClient.currentNocGroup,
        current_profession_group: newClient.currentProfessionGroup,
        intended_employment_status_canada: newClient.intendedEmploymentStatusCanada,
        intended_profession_group_canada: newClient.intendedProfessionGroupCanada,
        intention_credentials_recognition: newClient.intentionCredentialsRecognition,
        intention_accreditation_before_arrival: newClient.intentionAccreditationBeforeArrival,
        done_eca: newClient.doneEca,
        education_level: newClient.educationLevel,
        specialization: newClient.specialization,
        training_completion_date: newClient.trainingCompletionDate,
        english_level: newClient.englishLevel,
        want_english_info: newClient.wantEnglishInfo,
        french_level: newClient.frenchLevel,
        want_french_info: newClient.wantFrenchInfo,
        referral_source: newClient.referralSource,
        marketing_consent: newClient.marketingConsent,
        is_approved: newClient.isApproved,
        is_profile_completed: newClient.isProfileCompleted,
        referral_date: newClient.referralDate,
        
        origin_country: newClient.originCountry,
        profession: newClient.profession,
        destination_city: newClient.destinationCity,
        arrival_date: newClient.arrivalDate,
        status: newClient.status,
        consent_shared: newClient.consentShared
      });
      await logActivity('CREATE', 'CLIENT', `Création du dossier client ${newClient.firstName} ${newClient.lastName}`);
      addNotification(NotificationType.SUCCESS, "Nouveau Client", `Le dossier de ${newClient.firstName} ${newClient.lastName} a été créé.`);
      fetchData();
    } catch (err: any) {
      addNotification(NotificationType.SYSTEM, "Erreur", err.message);
    }
  };

  const handleBulkAddClients = async (newClients: Client[]) => {
    try {
      await apiService.bulkCreateClients(newClients);
      addNotification(NotificationType.SUCCESS, "Importation réussie", `${newClients.length} dossiers ont été importés.`);
      fetchData();
    } catch (err: any) {
      addNotification(NotificationType.SYSTEM, "Erreur d'importation", err.message);
      throw err;
    }
  };

  const handleAddSession = async (newSession: Session) => {
    try {
      // Destructure to omit the temporary client-side 'id' which is not a valid UUID.
      // Supabase will generate a proper UUID automatically on insertion.
      const { id, ...sessionData } = newSession;
      await apiService.create('sessions', sessionData);
      await logActivity('CREATE', 'SESSION', `Nouvelle séance programmée : ${newSession.title}`);
      addNotification(NotificationType.SUCCESS, "Séance enregistrée", `La séance "${newSession.title}" est ajoutée au calendrier.`);
      fetchData();
    } catch (err: any) {
      addNotification(NotificationType.SYSTEM, "Erreur", err.message);
    }
  };

  const handleUpdateSession = async (session: Session) => {
    try {
      const oldSession = sessions.find(s => s.id === session.id);
      const delta = getDelta(oldSession, session);
      
      // Pass the full session object directly — toSnake() in apiService converts all camelCase keys
      // to snake_case, and the backend sanitization filter keeps only known DB columns.
      // This avoids fragile manual field filtering and ensures ALL SÉBAA/NAARS fields are transmitted.
      await apiService.update('sessions', session.id, session);
      
      await logActivity('UPDATE', 'SESSION', `Modification de la séance : ${session.title}`, delta, session.id);
      addNotification(NotificationType.SUCCESS, "Mise à jour réussie", "Les informations de la séance ont été modifiées.");
      fetchData();
    } catch (err: any) {
      addNotification(NotificationType.SYSTEM, "Erreur Mise à jour", err.message);
    }
  };

  const handleDeleteSession = async (sessionId: string) => {
    try {
      const sessionToDelete = sessions.find(s => s.id === sessionId);
      await apiService.delete('sessions', sessionId);
      await logActivity('DELETE', 'SESSION', `Suppression de la séance : ${sessionToDelete?.title || sessionId}`, sessionToDelete, sessionId);
      addNotification(NotificationType.SUCCESS, "Suppression effectuée", "La séance a été retirée du système.");
      fetchData();
    } catch (err: any) {
      addNotification(NotificationType.SYSTEM, "Erreur Suppression", err.message);
    }
  };

  const handleDeleteClient = async (clientId: string) => {
    try {
      const clientToDelete = clients.find(c => c.id === clientId);
      await apiService.delete('clients', clientId);
      await logActivity('DELETE', 'CLIENT', `Suppression du dossier client : ${clientToDelete?.firstName || ''} ${clientToDelete?.lastName || ''}`, clientToDelete, clientId);
      addNotification(NotificationType.SUCCESS, "Client supprimé", "Le dossier a été définitivement supprimé.");
      setSelectedClientId(null);
      fetchData();
    } catch (err: any) {
      addNotification(NotificationType.SYSTEM, "Erreur Suppression", err.message);
    }
  };

  const handleAddContract = async (c: Partial<Contract>) => {
    try {
      await apiService.create('contracts', {
        consultant_name: c.consultantName,
        total_sessions: c.totalSessions,
        start_date: c.startDate,
        end_date: c.endDate,
        status: c.status,
        amount: c.amount,
        service_type: c.serviceType
      });
      if (error) throw error;
      await logActivity('CREATE', 'CONTRACT', `Nouveau contrat pour ${c.consultantName}`);
      addNotification(NotificationType.SUCCESS, "Contrat ajouté", `Le contrat pour ${c.consultantName} est activé.`);
      fetchData();
    } catch (err: any) {
      addNotification(NotificationType.SYSTEM, "Erreur Contrat", err.message);
    }
  };

  const renderContent = () => {
    if (isLoading && isLoggedIn && clients.length === 0) {
      return (
        <div className="loading-container">
          <div className="logo-progress-wrapper animate-glow">
            <div className="logo-base" />
            <div 
              className="logo-fill" 
              style={{ clipPath: `inset(0 ${100 - loadingProgress}% 0 0)` }} 
            />
          </div>
          <div className="progress-text-container">
            <div className="progress-percentage">{loadingProgress}%</div>
            <div className="progress-label">Synchronisation</div>
          </div>
        </div>
      );
    }

    if (error && isLoggedIn && clients.length === 0) {
       return (
        <div className="h-full flex flex-col items-center justify-center py-40">
          <div className="p-4 bg-red-50 text-red-500 rounded-full mb-4 shadow-sm">
            <AlertTriangle size={32} />
          </div>
          <h3 className="text-lg font-black text-slate-900 uppercase tracking-tight mb-2">Impossible de charger les données</h3>
          <p className="text-xs font-medium text-slate-500 mb-6 max-w-xs text-center">{error}</p>
          <button 
            onClick={fetchData}
            className="flex items-center gap-2 px-6 py-3 bg-blue-600 text-white rounded-xl font-black uppercase text-[10px] tracking-widest hover:bg-blue-700 transition-all shadow-lg shadow-blue-100"
          >
            <RefreshCcw size={14} /> Réessayer
          </button>
          <button 
            onClick={handleLogout}
            className="mt-4 text-[10px] font-black text-slate-400 uppercase tracking-widest hover:text-slate-600"
          >
            Se déconnecter
          </button>
        </div>
       );
    }

    if (selectedClient) {
      return (
        <ClientDetails 
          client={selectedClient} activeRole={activeRole} currentUserName={currentUserName} currentUserId={currentUserId}
          allClients={clients} allSessions={sessions} allPartners={partners} allProfiles={profiles}
          allLogs={activityLogs} 
          onBack={() => setSelectedClient(null)} 
          onUpdate={async (u) => { 
            try {
              const oldClient = clients.find(c => c.id === u.id);
              const delta = getDelta(oldClient, u);
              
              // Omit nested entities that are handled separately
              const { id, notes, referrals, ...updateData } = u;
              
              await apiService.update('clients', id, updateData); 
              
              setSelectedClient(u);
              setClients(prev => prev.map(c => c.id === u.id ? u : c));
              
              await logActivity('UPDATE', 'CLIENT', `Mise à jour du dossier client ${u.firstName} ${u.lastName}`, delta, u.id);
              addNotification(NotificationType.SUCCESS, "Mise à jour réussie", `Le dossier de ${u.firstName} ${u.lastName} a été mis à jour.`);
              fetchData();
            } catch (err: any) {
              console.error("Erreur mise à jour client:", err);
              addNotification(NotificationType.SYSTEM, "Erreur de mise à jour", err.message || "Une erreur est survenue lors de l'enregistrement.");
            }
          }} 
          onAddNote={async (id, content) => { 
            await apiService.create('notes', { client_id: id, author_name: currentUserName, content, timestamp: new Date().toISOString() }); 
            await logActivity('UPDATE', 'CLIENT', `Note ajoutée : "${content}"`, null, id);
            fetchData();
          }}
          onUpdateSession={handleUpdateSession}
        />
      );
    }

    switch (activeTab) {
      case 'dashboard': return <Dashboard clients={clients} partners={partners} sessions={sessions} activeRole={activeRole} currentUserId={currentUserId} />;
      case 'tasks': return (
        <TaskDashboard 
          tasks={tasks} 
          activeRole={activeRole} 
          currentUserId={currentUserId}
          advisors={profiles}
          onUpdateTask={handleUpdateTask}
          onNavigateToEntity={(type, id) => {
            if (type === 'SESSION') {
              setActiveTab('sessions');
            } else if (type === 'CLIENT') {
              const found = clients.find(c => c.id === id);
              if (found) setSelectedClient(found);
              setActiveTab('clients');
            } else if (type === 'CONTRACT') {
              setActiveTab('payments');
            }
          }}
        />
      );
      case 'clients': return (
        <ClientList 
          clients={clients}
          sessions={sessions}
          activeRole={activeRole} 
          currentPartnerId={currentPartnerId} 
          currentUserId={currentUserId} 
          onSelectClient={setSelectedClient} 
          onAddClient={handleAddClient} 
          onBulkAddClients={handleBulkAddClients} 
          onDeleteClient={handleDeleteClient} 
        />
      );
      case 'jobmatching': return <JobMatching clients={clients} onSelectClient={setSelectedClient} />;
      case 'activitymatching': return <ActivityMatching clients={clients} onSelectClient={setSelectedClient} />;
      case 'sessions': return (
        <SessionList 
          clients={clients}
          sessions={sessions}
          partners={partners} 
          contracts={contracts} 
          activeRole={activeRole} 
          currentUserName={currentUserName} 
          currentUserId={currentUserId} 
          onAddSession={handleAddSession} 
          onUpdateSession={handleUpdateSession} 
          onDeleteSession={handleDeleteSession} 
          onSelectClient={setSelectedClient}
          allProfiles={profiles} 
        />
      );
      case 'calendar': return <CalendarView clients={clients} sessions={sessions} partners={partners} contracts={contracts} activeRole={activeRole} currentUserName={currentUserName} currentUserId={currentUserId} onAddSession={handleAddSession} onUpdateSession={handleUpdateSession} onDeleteSession={handleDeleteSession} allProfiles={profiles} />;
      case 'payments': return (
        <ContractManagement 
          contracts={contracts} 
          sessions={sessions} 
          partners={partners} 
          activeRole={activeRole} 
          onUpdateSession={handleUpdateSession} 
          onAddContract={handleAddContract} 
          onUpdateContract={async (c) => { 
            try {
              const oldContract = contracts.find(con => con.id === c.id);
              const delta = getDelta(oldContract, c);
              
              await apiService.update('contracts', c.id, {
                consultant_name: c.consultantName,
                total_sessions: c.totalSessions,
                start_date: c.startDate,
                end_date: c.endDate,
                status: c.status,
                amount: c.amount,
                service_type: c.serviceType
              }); 
              
              await logActivity('UPDATE', 'CONTRACT', `Modification du contrat de ${c.consultantName}`, delta);
              fetchData(); 
            } catch (err: any) {
              console.error("Contract update log error", err);
              fetchData();
            }
          }} 
          onDeleteContract={async (id) => { 
            await apiService.delete('contracts', id); 
            await logActivity('DELETE', 'CONTRACT', `Suppression du contrat ID: ${id}`);
            fetchData(); 
          }} 
          onAddSession={handleAddSession} 
          onDeleteSession={handleDeleteSession} 
        />
      );
      case 'referrals': return (
        <ReferralManagement 
          clients={clients}
          sessions={sessions}
          partners={partners} 
          activeRole={activeRole} 
          currentPartnerId={currentPartnerId} 
          currentUserId={currentUserId}
          onSelectClient={setSelectedClient}
          allProfiles={profiles}
        />
      );
      case 'reports': return <Reports clients={clients} sessions={sessions} partners={partners} activeRole={activeRole} currentPartnerId={currentPartnerId} />;
      case 'settings': 
        if (activeRole !== UserRole.ADMIN) return <Dashboard clients={clients} partners={partners} sessions={sessions} activeRole={activeRole} currentUserId={currentUserId} />;
        return <Settings />;
      case 'mentors': return <MentorManagement mentors={mentors} partners={partners} activeRole={activeRole} currentPartnerId={currentPartnerId} onAddMentor={async (m) => { 
        await apiService.create('mentors', { first_name: m.firstName, last_name: m.lastName, profession: m.profession, city: m.city, domain: m.domain, origin_country: m.originCountry, organization_id: m.organizationId }); 
        await logActivity('CREATE', 'MENTOR', `Ajout du mentor ${m.firstName} ${m.lastName}`);
        fetchData(); 
      }} />;
      case 'partners': return (
        <PartnerManagement 
          partners={partners} 
          profiles={profiles} 
          activeRole={activeRole} 
          onAddPartner={async (p) => { 
            await apiService.create('partners', { name: p.name, city: p.city, province: p.province, specialties: p.specialties, type: p.type }); 
            await logActivity('CREATE', 'PARTNER', `Ajout du partenaire : ${p.name}`);
            fetchData(); 
          }} 
          onUpdatePartner={async (p) => { 
            const oldPartner = partners.find(part => part.id === p.id);
            const delta = getDelta(oldPartner, p);
            
            await apiService.update('partners', p.id, { name: p.name, city: p.city, specialties: p.specialties }); 
            await logActivity('UPDATE', 'PARTNER', `Mise à jour du partenaire : ${p.name}`, delta);
            fetchData(); 
          }} 
          onDeletePartner={async (id) => {
            await apiService.delete('partners', id);
            await logActivity('DELETE', 'PARTNER', `Suppression du partenaire ID: ${id}`);
            fetchData();
          }}
        />
      );
      case 'accounts': return (
        <AccountManagement 
          profiles={profiles} 
          partners={partners} 
          onUpdateProfile={async (p) => { 
            const oldProfile = profiles.find(prof => prof.id === p.id);
            const delta = getDelta(oldProfile, p);
            
            await apiService.update('profiles', p.id, { 
              first_name: p.firstName, 
              last_name: p.lastName, 
              role: p.role, 
              partner_id: p.partnerId || null,
              position: p.position || null
            }); 
            await logActivity('UPDATE', 'PROFILE', `Modification du compte de ${p.firstName} ${p.lastName}`, delta);
            fetchData(); 
          }} 
          onAddProfile={async (p) => { 
            let finalUserId = (p as any).manualId;
            
            if (!finalUserId && (p as any).password) {
              try {
                const signupResult = await apiService.signup(
                  p.email.toLowerCase().trim(),
                  (p as any).password,
                  {
                    first_name: p.firstName, 
                    last_name: p.lastName, 
                    role: p.role, 
                    partner_id: (p.partnerId && p.partnerId !== "") ? p.partnerId : null,
                    position: p.position || null
                  }
                );
                finalUserId = signupResult.user.id;
              } catch (authError: any) {
                addNotification(NotificationType.SYSTEM, "Erreur Création Compte", authError.message);
                throw authError;
              }
            }

            if (!finalUserId) {
              finalUserId = crypto.randomUUID();
            }

            const emailToSave = (p.email || '').toLowerCase().trim();
            if (!emailToSave) {
              addNotification(NotificationType.SYSTEM, "Erreur Création Compte", "L'adresse email est obligatoire pour créer un compte.");
              setIsLoading(false);
              return;
            }

            await apiService.create('profiles', { 
              id: finalUserId, 
              first_name: p.firstName, 
              last_name: p.lastName, 
              email: emailToSave, 
              role: p.role, 
              partner_id: (p.partnerId && p.partnerId !== "") ? p.partnerId : null,
              position: p.position || null
            }); 
            
            await logActivity('CREATE', 'PROFILE', `Création du compte utilisateur pour ${p.firstName} ${p.lastName} (Auth ID: ${finalUserId})`);
            addNotification(NotificationType.SUCCESS, "Succès", `Le compte et le profil de ${p.firstName} ont été créés.`);
            fetchData(); 
          }} 
        />
      );
      case 'logs': return <ActivityLogs logs={activityLogs} clients={clients} activeRole={activeRole} currentUserId={currentUserId} />;
      case 'messaging': return <Messaging currentUserId={currentUserId} partners={partners} />;
      default: return <Dashboard clients={clients} partners={partners} sessions={sessions} activeRole={activeRole} currentUserId={currentUserId} />;
    }
  };

  if (!isLoggedIn) return <Login onLogin={handleLogin} />;

  return (
    <Layout 
      activeRole={activeRole} onRoleChange={setActiveRole} 
      activeTab={activeTab} 
      setActiveTab={(tab) => {
        setActiveTab(tab);
        setSelectedClient(null);
      }}
      onLogout={handleLogout}
      currentUserId={currentUserId}
      currentUserName={currentUserName}
      userProfile={profiles.find(p => p.id === currentUserId)}
      onUpdateAccount={handleUpdateAccount}
      notifications={notifications}
      onClearNotification={(id) => setNotifications(prev => prev.map(n => n.id === id ? { ...n, isRead: true } : n))}
      onClearAllNotifications={() => setNotifications(prev => prev.map(n => ({ ...n, isRead: true })))}
      onNotificationSelect={(n) => { if (n.targetId) { setSelectedClientId(n.targetId); setActiveTab('clients'); } }}
      tasks={tasks}
    >
      {renderContent()}
    </Layout>
  );
};

export default App;
