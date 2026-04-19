
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

  useEffect(() => {
    if (isLoggedIn) {
      setTasks(prevTasks => {
        const purged = purgeOldTasks(prevTasks);
        return refreshAutomatedTasks(
          sessions,
          clients,
          contracts,
          profiles,
          purged,
          currentUserName,
          currentUserId
        );
      });
    }
  }, [sessions, clients, contracts, profiles, isLoggedIn, currentUserName, currentUserId]);

  const handleUpdateTask = (updatedTask: WorkflowTask) => {
    setTasks(prev => prev.map(t => t.id === updatedTask.id ? updatedTask : t));
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

  const addNotification = useCallback((type: NotificationType, title: string, message: string, targetId?: string) => {
    const newNotif: Notification = {
      id: Math.random().toString(36).substr(2, 9),
      type, title, message, timestamp: new Date().toISOString(),
      isRead: false, targetId
    };
    setNotifications(prev => [newNotif, ...prev].slice(0, 50));
  }, []);

  const logActivity = async (action: 'CREATE' | 'UPDATE' | 'DELETE' | 'LOGIN', entity: 'SESSION' | 'CLIENT' | 'MENTOR' | 'CONTRACT' | 'PROFILE' | 'PARTNER', details: string) => {
    try {
      await apiService.create('activity_logs', {
        user_id: currentUserId,
        user_name: currentUserName,
        action_type: action,
        entity_type: entity,
        details: details,
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
          userId: l.user_id,
          userName: l.user_name,
          actionType: l.action_type,
          entityType: l.entity_type,
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
    try {
      const [
        resMentors,
        resContracts,
        resProfiles,
        resPartners,
        resClients,
        resSessions,
        resLogs
      ] = await Promise.allSettled([
        apiService.fetchTable('mentors'),
        apiService.fetchTable('contracts'),
        apiService.fetchTable('profiles'),
        apiService.fetchTable('partners'),
        apiService.fetchTable('clients'),
        apiService.fetchTable('sessions'),
        apiService.fetchTable('activity_logs'),
      ]);

      const safeGet = (result: PromiseSettledResult<any>, name: string) => {
        if (result.status === 'fulfilled') return result.value;
        console.warn(`[fetchData] Failed to fetch '${name}':`, result.reason?.message);
        return null;
      };

      const mentorsData   = safeGet(resMentors,   'mentors');
      const contractsData = safeGet(resContracts, 'contracts');
      const profilesData  = safeGet(resProfiles,  'profiles');
      const partnersData  = safeGet(resPartners,  'partners');
      const clientsData   = safeGet(resClients,   'clients');
      const sessionsData  = safeGet(resSessions,  'sessions');
      const logsData      = safeGet(resLogs,      'activity_logs');

      const normalizePartnerType = (raw: string): PartnerType => {
        const val = (raw || '').toUpperCase().trim();
        if (val === 'CONSULTANT') return PartnerType.CONSULTANT;
        if (val === 'INTERNE' || val === 'INTERNAL') return PartnerType.INTERNAL;
        if (val === 'COLLABORATION_EXTERNE' || val === 'EXTERNAL') return PartnerType.EXTERNAL;
        return PartnerType.EXTERNAL;
      };

      const mappedPartners = partnersData.map((p: any) => ({
        id: p.id,
        name: p.name,
        city: p.city,
        province: p.province,
        specialties: p.specialties || [],
        type: normalizePartnerType(p.type)
      }));
      setPartners(mappedPartners);

      setMentors(mentorsData.map((m: any) => ({
        id: m.id,
        firstName: m.firstName,
        lastName: m.lastName,
        profession: m.profession,
        city: m.city,
        domain: m.domain,
        originCountry: m.originCountry,
        organizationId: m.organizationId
      })));

      setContracts(contractsData.map((con: any) => ({
        id: con.id,
        consultantName: con.consultantName,
        totalSessions: con.totalSessions || 0,
        usedSessions: con.usedSessions || 0,
        startDate: con.startDate,
        endDate: con.endDate,
        status: con.status as any,
        amount: con.amount || 0
      })));

      if (Array.isArray(clientsData)) {
        setClients(clientsData.map((c: any) => ({
          ...c,
          chosenCity: c.chosenCity || c.chosenProvince,
          residenceCountry: c.residenceCountry || c.birthCountry,
          currentJob: c.currentJob || c.currentProfessionGroup
        })));
      }
      if (Array.isArray(sessionsData)) setSessions(sessionsData);
      if (Array.isArray(logsData)) setActivityLogs(logsData);
      if (Array.isArray(profilesData)) setProfiles(profilesData);

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
      await apiService.create('sessions', {
        title: newSession.title,
        type: newSession.type,
        category: newSession.category,
        date: newSession.date,
        start_time: newSession.startTime,
        duration: newSession.duration,
        participant_ids: newSession.participantIds,
        no_show_ids: newSession.noShowIds,
        location: newSession.location,
        facilitator_name: newSession.facilitatorName,
        facilitator_type: newSession.facilitatorType,
        advisor_name: newSession.advisorName,
        discussed_needs: newSession.discussedNeeds,
        actions: newSession.actions,
        individual_status: newSession.individualStatus,
        contract_id: newSession.contractId,
        zoom_link: newSession.zoomLink,
        zoom_id: newSession.zoomId,
        needs_interpretation: newSession.needsInterpretation,
        notes: newSession.notes
      });
      await logActivity('CREATE', 'SESSION', `Nouvelle séance programmée : ${newSession.title}`);
      addNotification(NotificationType.SUCCESS, "Séance enregistrée", `La séance "${newSession.title}" est ajoutée au calendrier.`);
      fetchData();
    } catch (err: any) {
      addNotification(NotificationType.SYSTEM, "Erreur", err.message);
    }
  };

  const handleUpdateSession = async (session: Session) => {
    try {
      await apiService.update('sessions', session.id, {
        title: session.title,
        type: session.type,
        date: session.date,
        start_time: session.startTime,
        duration: session.duration,
        location: session.location,
        zoom_link: session.zoomLink,
        zoom_id: session.zoomId,
        participant_ids: session.participantIds,
        no_show_ids: session.noShowIds,
        invoice_received: session.invoiceReceived,
        invoice_submitted: session.invoiceSubmitted,
        invoice_paid: session.invoicePaid,
        invoice_amount: session.invoiceAmount,
        discussed_needs: session.discussedNeeds,
        actions: session.actions,
        notes: session.notes,
        individual_status: session.individualStatus,
        advisor_id: session.advisorId
      });
      if (error) throw error;
      await logActivity('UPDATE', 'SESSION', `Modification de la séance : ${session.title}`);
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
      await logActivity('DELETE', 'SESSION', `Suppression de la séance : ${sessionToDelete?.title || sessionId}`);
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
      await logActivity('DELETE', 'CLIENT', `Suppression du dossier client : ${clientToDelete?.firstName || ''} ${clientToDelete?.lastName || ''}`);
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
        <div className="h-full flex flex-col items-center justify-center py-40">
          <Database size={48} className="text-blue-600 mb-4 animate-bounce" />
          <p className="text-xs font-black text-slate-400 uppercase tracking-widest">Récupération Supabase...</p>
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
              await apiService.update('clients', u.id, { 
                status: u.status, 
                assigned_partner_id: u.assignedPartnerId,
                secondary_partner_ids: u.secondaryPartnerIds,
                assigned_mentor_id: u.assignedMentorId,
                referral_date: u.referralDate,
                referred_by_id: u.referredById,
                acknowledged_at: u.acknowledgedAt,
                contacted_at: u.contactedAt,
                closed_at: u.closedAt,
                consent_external_referral: u.consentExternalReferral,
                is_unsubscribed: u.isUnsubscribed
              }); 
              
              setSelectedClient(u);
              await logActivity('UPDATE', 'CLIENT', `Mise à jour du dossier ${u.firstName} ${u.lastName}.`);
              addNotification(NotificationType.SUCCESS, "Mise à jour réussie", `Le dossier de ${u.firstName} ${u.lastName} a été mis à jour.`);
            } catch (err: any) {
              console.error("Erreur mise à jour client:", err);
              addNotification(NotificationType.SYSTEM, "Erreur de mise à jour", err.message || "Une erreur est survenue lors de l'enregistrement.");
            }
          }} 
          onAddNote={async (id, content) => { 
            await apiService.create('notes', { client_id: id, author_name: currentUserName, content, timestamp: new Date().toISOString() }); 
            await logActivity('UPDATE', 'CLIENT', `Ajout d'une note sur le dossier de ${selectedClient.firstName} ${selectedClient.lastName}`);
          }}
          onUpdateSession={handleUpdateSession}
        />
      );
    }

    switch (activeTab) {
      case 'dashboard': return <Dashboard clients={clients} partners={partners} sessions={sessions} activeRole={activeRole} currentUserId={currentUserId} />;
      case 'tasks': 
        return (
          <TaskDashboard 
            tasks={tasks}
            activeRole={activeRole}
            currentUserId={currentUserId}
            advisors={profiles.filter(u => u.role === UserRole.ADVISOR)}
            onUpdateTask={handleUpdateTask}
            onNavigateToEntity={(type, id) => {
              if (type === 'SESSION') {
                setActiveTab('sessions');
              } else if (type === 'CLIENT') {
                setActiveTab('clients');
              }
            }}
          />
        );
      case 'clients': return (
        <ClientList 
          clients={clients}
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
            await apiService.update('contracts', c.id, {
              consultant_name: c.consultantName,
              total_sessions: c.totalSessions,
              status: c.status,
              amount: c.amount,
              service_type: c.serviceType
            }); 
            await logActivity('UPDATE', 'CONTRACT', `Modification du contrat de ${c.consultantName}`);
            fetchData(); 
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
            await apiService.update('partners', p.id, { name: p.name, city: p.city, specialties: p.specialties }); 
            await logActivity('UPDATE', 'PARTNER', `Mise à jour du partenaire : ${p.name}`);
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
            await apiService.update('profiles', p.id, { 
              first_name: p.firstName, 
              last_name: p.lastName, 
              role: p.role, 
              partner_id: p.partnerId || null,
              position: p.position || null
            }); 
            await logActivity('UPDATE', 'PROFILE', `Modification du compte de ${p.firstName} ${p.lastName}`);
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
