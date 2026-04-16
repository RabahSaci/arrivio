
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
  AttendanceStatus 
} from './types';
import { apiService } from './services/apiService';
import { Database, AlertTriangle, RefreshCcw } from 'lucide-react';
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
  
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [selectedClientId, setSelectedClientId] = useState<string | null>(null);

  // Ref pour suivre la dernière activité
  const lastActivityRef = useRef<number>(Date.now());

  const handleLogout = useCallback(async () => {
    apiService.logout();
    localStorage.removeItem('arrivio_user');
    setIsLoggedIn(false);
    setCurrentUserId("");
  }, []);

  // Surveillance de l'inactivité
  useEffect(() => {
    if (!isLoggedIn) return;

    // Réinitialiser le compteur au montage (connexion)
    lastActivityRef.current = Date.now();

    const updateActivity = () => {
      lastActivityRef.current = Date.now();
    };

    const events = ['mousemove', 'keydown', 'click', 'scroll', 'touchstart'];
    events.forEach(event => window.addEventListener(event, updateActivity));

    const checkInactivity = setInterval(() => {
      if (Date.now() - lastActivityRef.current > INACTIVITY_LIMIT) {
        handleLogout();
      }
    }, 10000); // Vérification toutes les 10 secondes

    return () => {
      events.forEach(event => window.removeEventListener(event, updateActivity));
      clearInterval(checkInactivity);
    };
  }, [isLoggedIn, handleLogout]);

  useEffect(() => {
    const checkSession = async () => {
      const isAuthenticated = await apiService.getSessionStatus();
      if (isAuthenticated) {
        // We don't have the user ID easily if it's not in localStorage.
        // Let's assume the status check might return user data or we store user_id too.
        const token = localStorage.getItem('arrivio_token');
        if (token) {
          // Decode JWT to get user id or just rely on the fact that we can fetch profiles/me
          // For now, let's just use the profile fetch logic if we had the ID.
          // Better: Let's store user info in localStorage alongside token for BFF.
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

  const loadUserProfile = async (userId: string) => {
    try {
      const data = await apiService.fetchTable('profiles');
      // fetchTable returns all, but RLS on profiles will only return the current user's profile
      // if we set it up that way.
      const profile = Array.isArray(data) ? data.find(p => p.id === userId) : data;
      
      if (profile) {
        handleLogin(
          profile.role as UserRole, 
          userId, 
          `${profile.first_name} ${profile.last_name}`, 
          profile.partner_id
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
    
    // Sécurité : Réinitialiser l'onglet si l'utilisateur n'y a pas accès
    // (ex: un admin se déconnecte depuis les paramètres, un conseiller se connecte)
    if (role !== UserRole.ADMIN && (activeTab === 'settings' || activeTab === 'accounts' || activeTab === 'payments')) {
      setActiveTab('sessions');
    } else if (role === UserRole.PARTNER && activeTab === 'sessions') {
      setActiveTab('clients');
    }

    // Initialiser l'activité à la connexion
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
      if (data) {
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
      // Use allSettled so one failing table never blocks the others
      const [
        resClients,
        resSessions,
        resMentors,
        resContracts,
        resProfiles,
        resPartners,
        resNotes,
      ] = await Promise.allSettled([
        apiService.fetchTable('clients'),
        apiService.fetchTable('sessions'),
        apiService.fetchTable('mentors'),
        apiService.fetchTable('contracts'),
        apiService.fetchTable('profiles'),
        apiService.fetchTable('partners'),
        apiService.fetchTable('notes'),
      ]);

      // Helper to extract value or log warning on failure
      const safeGet = (result: PromiseSettledResult<any>, name: string) => {
        if (result.status === 'fulfilled') return result.value;
        console.warn(`[fetchData] Failed to fetch '${name}':`, result.reason?.message);
        return null;
      };

      const clientsData   = safeGet(resClients,   'clients');
      const sessionsData  = safeGet(resSessions,  'sessions');
      const mentorsData   = safeGet(resMentors,   'mentors');
      const contractsData = safeGet(resContracts, 'contracts');
      const profilesData  = safeGet(resProfiles,  'profiles');
      const partnersData  = safeGet(resPartners,  'partners');
      const notesData     = safeGet(resNotes,     'notes');

      const allSessions = sessionsData || [];
      const allNotes    = notesData    || [];

      if (clientsData) {
        setClients(clientsData.map((c: any) => {
          const clientSessions = allSessions.filter((s: any) => s.participant_ids?.includes(c.id));
          let validSessionsCount = 0;
          let noShowsCount = 0;
          clientSessions.forEach((s: any) => {
            if (s.category === 'INDIVIDUELLE') {
              if (s.individual_status === 'PRESENT' || s.individual_status === 'ABSENT') {
                validSessionsCount++;
                if (s.individual_status === 'ABSENT') noShowsCount++;
              }
            } else {
              validSessionsCount++;
              if (s.no_show_ids?.includes(c.id)) noShowsCount++;
            }
          });
          const ratio = validSessionsCount > 0 ? Math.round((noShowsCount / validSessionsCount) * 100) : 0;
          return {
            id: c.id,
            clientCode: c.client_code,
            registrationDate: c.registration_date,
            firstName: c.first_name || '',
            lastName: c.last_name || '',
            birthDate: c.birth_date,
            gender: c.gender,
            residenceCountry: c.residence_country,
            birthCountry: c.birth_country,
            iucCrpNumber: c.iuc_crp_number,
            email: c.email || '',
            phoneNumber: c.phone_number,
            participatedImmigrationProgram: c.participated_immigration_program,
            immigrationType: c.immigration_type,
            linkedAccount: c.linked_account,
            mainApplicant: c.main_applicant,
            spouseFullName: c.spouse_full_name,
            spouseBirthDate: c.spouse_birth_date,
            spouseEmail: c.spouse_email,
            spouseIucCrpNumber: c.spouse_iuc_crp_number,
            childrenCount: c.children_count,
            childrenBirthDates: c.children_birth_dates,
            childrenFullNames: c.children_full_names,
            chosenProvince: c.chosen_province,
            destinationChange: c.destination_change,
            chosenCity: c.chosen_city,
            arrivalDateApprox: c.arrival_date_approx,
            arrivalDateConfirmed: c.arrival_date_confirmed,
            establishmentReason: c.establishment_reason,
            currentJob: c.current_job,
            currentEmploymentStatus: c.current_employment_status,
            currentNocGroup: c.current_noc_group,
            currentProfessionGroup: c.current_profession_group,
            intendedEmploymentStatusCanada: c.intended_employment_status_canada,
            intendedProfessionGroupCanada: c.intended_profession_group_canada,
            intentionCredentialsRecognition: c.intention_credentials_recognition,
            intentionAccreditationBeforeArrival: c.intention_accreditation_before_arrival,
            doneEca: c.done_eca,
            educationLevel: c.education_level,
            specialization: c.specialization,
            trainingCompletionDate: c.training_completion_date,
            englishLevel: c.english_level,
            wantEnglishInfo: c.want_english_info,
            frenchLevel: c.french_level,
            wantFrenchInfo: c.want_french_info,
            referralSource: c.referral_source,
            marketingConsent: c.marketing_consent,
            isApproved: c.is_approved,
            isProfileCompleted: c.is_profile_completed,
            referralDate: c.referral_date,
            questions: c.questions,
            originCountry: c.origin_country || '',
            profession: c.profession || '',
            destinationCity: c.destination_city || '',
            arrivalDate: c.arrival_date || new Date().toISOString(),
            needs: c.needs || [],
            status: (c.status as ReferralStatus) || ReferralStatus.PENDING,
            consentShared: !!c.consent_shared,
            consentExternalReferral: !!c.consent_external_referral,
            isUnsubscribed: !!c.is_unsubscribed,
            assignedPartnerId: c.assigned_partner_id,
            secondaryPartnerIds: c.secondary_partner_ids || [],
            assignedMentorId: c.assigned_mentor_id,
            acknowledgedAt: c.acknowledged_at,
            contactedAt: c.contacted_at,
            closedAt: c.closed_at,
            noShowRatio: ratio,
            notes: allNotes
              .filter((n: any) => n.client_id === c.id)
              .map((n: any) => ({ id: n.id, authorName: n.author_name, content: n.content, timestamp: n.timestamp }))
          };
        }));
      }

      if (sessionsData) {
        setSessions(sessionsData.map((s: any) => ({
          id: s.id,
          title: s.title,
          type: s.type,
          category: s.category,
          date: s.date,
          startTime: s.start_time,
          duration: s.duration,
          participantIds: s.participant_ids || [],
          noShowIds: s.no_show_ids || [],
          location: s.location,
          notes: s.notes || '',
          facilitatorName: s.facilitator_name,
          facilitatorType: s.facilitator_type,
          advisorName: s.advisor_name,
          contractId: s.contract_id,
          individualStatus: s.individual_status,
          discussedNeeds: s.discussed_needs,
          actions: s.actions,
          zoomLink: s.zoom_link,
          needsInterpretation: !!s.needs_interpretation,
          invoiceReceived: !!s.invoice_received,
          invoiceSubmitted: !!s.invoice_submitted,
          invoicePaid: !!s.invoice_paid,
          invoiceAmount: s.invoice_amount || 0
        })));
      }

      if (partnersData) {
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
      }

      if (mentorsData) {
        setMentors(mentorsData.map((m: any) => ({
          id: m.id,
          firstName: m.first_name,
          lastName: m.last_name,
          profession: m.profession,
          city: m.city,
          domain: m.domain,
          originCountry: m.origin_country,
          organizationId: m.organization_id
        })));
      }

      if (contractsData) {
        setContracts(contractsData.map((con: any) => ({
          id: con.id,
          consultantName: con.consultant_name,
          totalSessions: con.total_sessions || 0,
          usedSessions: con.used_sessions || 0,
          startDate: con.start_date,
          endDate: con.end_date,
          status: con.status as any,
          amount: con.amount || 0,
          serviceType: con.service_type
        })));
      }

      if (profilesData) {
        setProfiles(profilesData.map((p: any) => ({
          id: p.id,
          firstName: p.first_name,
          lastName: p.last_name,
          email: p.email,
          role: p.role as UserRole,
          partnerId: p.partner_id,
          position: p.position
        })));
      }

      fetchLogs();

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
        questions: newClient.questions,
        
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
        date: session.date,
        start_time: session.startTime,
        location: session.location,
        zoom_link: session.zoomLink,
        participant_ids: session.participantIds,
        no_show_ids: session.noShowIds,
        invoice_received: session.invoiceReceived,
        invoice_submitted: session.invoiceSubmitted,
        invoice_paid: session.invoicePaid,
        invoice_amount: session.invoiceAmount,
        discussed_needs: session.discussedNeeds,
        actions: session.actions,
        notes: session.notes,
        individual_status: session.individualStatus
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
      if (error) throw error;
      await logActivity('DELETE', 'SESSION', `Suppression de la séance : ${sessionToDelete?.title || sessionId}`);
      addNotification(NotificationType.SUCCESS, "Suppression effectuée", "La séance a été retirée du système.");
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

    if (selectedClientId) {
      const clientToShow = clients.find(c => c.id === selectedClientId);
      if (clientToShow) {
        return (
          <ClientDetails 
            client={clientToShow} activeRole={activeRole} currentUserName={currentUserName}
            allClients={clients} allSessions={sessions} allPartners={partners} allProfiles={profiles}
            allLogs={activityLogs} 
            onBack={() => setSelectedClientId(null)} 
            onUpdate={async (u) => { 
              const oldClient = clients.find(c => c.id === u.id);
              await apiService.update('clients', u.id, { 
                status: u.status, 
                assigned_partner_id: u.assignedPartnerId,
                secondary_partner_ids: u.secondaryPartnerIds, // Update Supabase avec le tableau
                assigned_mentor_id: u.assignedMentorId,
                referral_date: u.referralDate,
                acknowledged_at: u.acknowledgedAt,
                contacted_at: u.contactedAt,
                closed_at: u.closedAt,
                consent_external_referral: u.consentExternalReferral,
                is_unsubscribed: u.isUnsubscribed
              }); 
              
              let logMsg = `Mise à jour du dossier ${u.firstName} ${u.lastName}.`;
              if (oldClient?.status !== u.status) logMsg += ` Statut : ${oldClient?.status} -> ${u.status}.`;
              if (oldClient?.assignedPartnerId !== u.assignedPartnerId) {
                const pName = partners.find(p => p.id === u.assignedPartnerId)?.name || 'Inconnu';
                logMsg += ` Assigné principal à : ${pName}.`;
              }
              if (JSON.stringify(oldClient?.secondaryPartnerIds) !== JSON.stringify(u.secondaryPartnerIds)) {
                logMsg += ` Mise à jour des référencements secondaires.`;
              }
              
              await logActivity('UPDATE', 'CLIENT', logMsg);
              fetchData(); 
            }} 
            onAddNote={async (id, content) => { 
              await apiService.create('notes', { client_id: id, author_name: currentUserName, content, timestamp: new Date().toISOString() }); 
              await logActivity('UPDATE', 'CLIENT', `Ajout d'une note sur le dossier de ${clientToShow.firstName} ${clientToShow.lastName}`);
              fetchData(); 
            }}
            onUpdateSession={handleUpdateSession}
          />
        );
      }
    }

    switch (activeTab) {
      case 'dashboard': return <Dashboard clients={clients} partners={partners} sessions={sessions} activeRole={activeRole} currentUserId={currentUserId} />;
      case 'clients': return <ClientList clients={clients} activeRole={activeRole} currentPartnerId={currentPartnerId} currentUserId={currentUserId} onSelectClient={(c) => setSelectedClientId(c.id)} onAddClient={handleAddClient} onBulkAddClients={handleBulkAddClients} />;
      case 'jobmatching': return <JobMatching clients={clients} onSelectClient={(c) => setSelectedClientId(c.id)} />;
      case 'activitymatching': return <ActivityMatching clients={clients} onSelectClient={(c) => setSelectedClientId(c.id)} />;
      case 'sessions': return <SessionList clients={clients} sessions={sessions} partners={partners} contracts={contracts} activeRole={activeRole} currentUserName={currentUserName} onAddSession={handleAddSession} onUpdateSession={handleUpdateSession} onDeleteSession={handleDeleteSession} />;
      case 'calendar': return <CalendarView clients={clients} sessions={sessions} partners={partners} contracts={contracts} activeRole={activeRole} currentUserName={currentUserName} onAddSession={handleAddSession} onUpdateSession={handleUpdateSession} onDeleteSession={handleDeleteSession} />;
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
      case 'referrals': return <ReferralManagement clients={clients} partners={partners} sessions={sessions} activeRole={activeRole} currentPartnerId={currentPartnerId} currentUserId={currentUserId} />;
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

            // Guard: ensure email is present before inserting
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
      activeTab={activeTab} setActiveTab={setActiveTab}
      onLogout={handleLogout}
      currentUserId={currentUserId}
      notifications={notifications}
      onClearNotification={(id) => setNotifications(prev => prev.map(n => n.id === id ? { ...n, isRead: true } : n))}
      onClearAllNotifications={() => setNotifications(prev => prev.map(n => ({ ...n, isRead: true })))}
      onNotificationSelect={(n) => { if (n.targetId) { setSelectedClientId(n.targetId); setActiveTab('clients'); } }}
    >
      {renderContent()}
    </Layout>
  );
};

export default App;
