
import React, { useState, useMemo, useEffect, useRef } from 'react';
import { 
  Session, 
  SessionType, 
  SessionCategory, 
  Client, 
  FacilitatorType, 
  AttendanceStatus, 
  Partner, 
  PartnerType, 
  Contract, 
  UserRole,
  Profile
} from '../types';
import { 
  SESSION_TYPE_LABELS, 
  IRCC_COUNTRIES,
  EMPLOYMENT_STATUS_CANADA,
  EMPLOYMENT_STATUS_OUTSIDE,
  EMPLOYMENT_TARGET_TYPES,
  EMPLOYMENT_SECTORS,
  EMPLOYMENT_TOPICS,
  EMPLOYMENT_REFERRALS,
  getIRCCCountry
} from '../constants';
import ParticipantManager from './ParticipantManager';
import { apiService } from '../services/apiService';
import { 
  X, 
  User, 
  Users, 
  Calendar, 
  Clock, 
  MapPin, 
  Video, 
  FileText, 
  AlertCircle, 
  ClipboardList, 
  Target, 
  Activity, 
  MessageSquare,
  CheckCircle2,
  ChevronRight,
  Search,
  Hash,
  UserCheck,
  UserX,
  Plus,
  Loader2,
  Briefcase,
  Globe
} from 'lucide-react';
import { CNP_CODES } from '../constants/cnp_codes';

const SUBJECTS_OPTIONS = [
  "Informations avant le départ",
  "Informations nationales",
  "Informations provinciales / territoriales",
  "Informations communautaires / municipales",
  "Emploi, Éducation et Finances",
  "Santé et bien-être",
  "Communautés francophones et opportunités",
  "Équité",
  "Peuples autochtones"
];

const TARGET_CLIENT_TYPES_OPTIONS = [
  "Général - pas de groupe de clients spécifique",
  "Clients formés à l'étranger dans une profession ou métier réglementé",
  "Enfants (0-14 ans)",
  "Familles/parents/soignants",
  "Femmes",
  "Jeunes (15-30 ans)",
  "Minorités de langue officielle (Francophones)",
  "Nouveaux arrivants racisés",
  "Personnes handicapées",
  "Personnes âgées (65+)",
  "Réfugiés",
  "2ELGBTQI+ (Bispirituel; Lesbienne; Gai; Bisexuel; Transgenre; Queer; Intersexuel et autres)"
];

const FUNDED_REFERRAL_OPTIONS = [
  "Service financé par IRCC",
  "Service non financé par IRCC",
  "Les deux (Services financés et non financés par IRCC)"
];

const REFERRAL_FUNDED_PAIRS: Array<[keyof Session, keyof Session]> = [
  ['lifeNeedsBasicReferralInd', 'lifeNeedsBasicFundedReferralId'],
  ['lifeNeedsFamilyChildrenReferralInd', 'lifeNeedsFamilyChildrenFundedReferralId'],
  ['lifeNeedsHealthAndMentalReferralInd', 'lifeNeedsHealthAndMentalFundedReferralId'],
  ['lifeNeedsHousingReferralInd', 'lifeNeedsHousingFundedReferralId'],
  ['lifeNeedsGovernmentKnowledgeNoReferralInd', 'lifeNeedsGovernmentKnowledgeFundedReferralId'],
  ['lifeNeedsCanadaKnowledgeReferralInd', 'lifeNeedsCanadaKnowledgeFundedReferralId'],
  ['lifeNeedsLegalReferralInd', 'lifeNeedsLegalFundedReferralId'],
  ['lifeNeedsFinancialReferralInd', 'lifeNeedsFinancialFundedReferralId'],
  ['lifeNeedsCommunityKnowledgeReferralInd', 'lifeNeedsCommunityKnowledgeFundedReferralId'],
  ['lifeNeedsSocialNetworkingReferralInd', 'lifeNeedsSocialNetworkingFundedReferralId'],
  ['lifeNeedsRacismReferralInd', 'lifeNeedsRacismFundedReferralId'],
  ['languageNeedsOfficialReferralInd', 'languageNeedsOfficialFundedReferralId'],
  ['languageNeedsLiteracyReferralInd', 'languageNeedsLiteracyFundedReferralId'],
  ['languageNeedsEmploymentReferralInd', 'languageNeedsEmploymentFundedReferralId'],
  ['employmentLabourMarketReferralInd', 'employmentLabourMarketFundedReferralId'],
  ['employmentFindingEmploymentReferralInd', 'employmentFindingEmploymentFundedReferralId'],
  ['employmentCredentialsReferralInd', 'employmentCredentialsFundedReferralId'],
  ['employmentEducationReferralInd', 'employmentEducationFundedReferralId'],
];

const LIFE_NEEDS_IDS = [
  'lifeNeedsBasicIdentifiedInd',
  'lifeNeedsFamilyChildrenIdentifiedInd',
  'lifeNeedsHealthAndMentalIdentifiedInd',
  'lifeNeedsHousingIdentifiedInd',
  'lifeNeedsGovernmentKnowledgeIdentifiedInd',
  'lifeNeedsCanadaKnowledgeIdentifiedInd',
  'lifeNeedsLegalIdentifiedInd',
  'lifeNeedsFinancialIdentifiedInd',
  'lifeNeedsCommunityKnowledgeIdentifiedInd',
  'lifeNeedsSocialNetworkingIdentifiedInd',
  'lifeNeedsRacismIdentifiedInd'
];

const LANGUAGE_ASSET_CHILDREN = [
  'languageAssetEnglishInd',
  'languageAssetFrenchInd',
  'languageAssetOtherInd'
];

const LANGUAGE_NEED_CHILDREN = [
  'languageNeedsOfficialIdentifiedNeedInd',
  'languageNeedsLiteracyIdentifiedNeedInd',
  'languageNeedsEmploymentIdentifiedNeedInd'
];

const EMPLOYMENT_ASSET_CHILDREN = [
  'employmentAssetEmployedInd',
  'employmentAssetForeignCredentialInd',
  'employmentAssetLabourMarketInd',
  'employmentAssetDegreeInCanadaInd',
  'employmentAssetDegreeOutsideCanadaInd',
  'employmentAssetPreviousEmploymentInd',
  'employmentAssetJobRelatedTrainingInd',
  'employmentAssetWorkExperienceOutsideCanadaInd',
  'employmentAssetOtherSkillsInd'
];

const EMPLOYMENT_NEED_CHILDREN = [
  'employmentLabourMarketNeedInd',
  'employmentFindingEmploymentNeedInd',
  'employmentCredentialsNeedInd',
  'employmentEducationNeedInd'
];

const EMPLOYMENT_TOPIC_FIELDS = [
  'employmentTopicCareerPlanningInd',
  'employmentTopicLabourMarketInd',
  'employmentTopicRegulatedProfessionInd',
  'employmentTopicEntrepreneurshipInd',
  'employmentTopicUnregulatedProfessionInd',
  'employmentTopicSkillsInd',
  'employmentTopicWorkplaceOrientationInd'
];

interface SessionModalProps {
  isOpen: boolean;
  onClose: () => void;
  session: Session | null; // null si création
  initialCategory?: SessionCategory;
  initialDate?: string;
  clients: Client[];
  partners: Partner[];
  contracts: Contract[];
  sessions: Session[];
  allProfiles: Profile[];
  activeRole: UserRole;
  currentUserName: string;
  currentUserId?: string;
  onSave: (session: Session) => void;
  onSelectClient?: (client: Client) => void;
  initialParticipantIds?: string[];
}

const SessionModal: React.FC<SessionModalProps> = ({ 
  isOpen, 
  onClose, 
  session, 
  initialCategory = SessionCategory.INDIVIDUAL,
  initialDate,
  clients,
  partners,
  contracts,
  sessions,
  allProfiles,
  activeRole,
  currentUserName,
  currentUserId,
  onSave,
  onSelectClient,
  initialParticipantIds
}) => {
  const isEditing = !!session;
  const [category, setCategory] = useState<SessionCategory>(session?.category || initialCategory);
  const [formDate, setFormDate] = useState<string>('');
  const [formFacilitatorType, setFormFacilitatorType] = useState<FacilitatorType>(FacilitatorType.CONSULTANT);
  const [selectedConsultantName, setSelectedConsultantName] = useState<string>('');
  const [selectedContractId, setSelectedContractId] = useState<string>('');
  const [modalParticipantIds, setModalParticipantIds] = useState<string[]>([]);
  const [selectedClient, setSelectedClient] = useState<Client | null>(null);
  const [clientSearchQuery, setClientSearchQuery] = useState('');
  const [attendance, setAttendance] = useState<AttendanceStatus>(AttendanceStatus.PRESENT);
  const [selectedSubjects, setSelectedSubjects] = useState<string[]>([]);
  const [selectedTargetClientTypes, setSelectedTargetClientTypes] = useState<string[]>([]);
  const [sessionType, setSessionType] = useState<SessionType>(session?.type || SessionType.ESTABLISHMENT);
  const [programmingType, setProgrammingType] = useState<string>(session?.programmingType || 'Service standard');
  const [clientLocationCountry, setClientLocationCountry] = useState<string>(session?.clientLocationCountry || '');
  const [naarsData, setNaarsData] = useState<Partial<Session>>(() => session ? session : { formalFollowUpInd: false, lifeNeedsInd: true });
  const [activeSection, setActiveSection] = useState<string | null>(null);
  const [showNAARS, setShowNAARS] = useState<boolean>(false);
  const [showEmployment, setShowEmployment] = useState<boolean>(false);
  const [isHydrating, setIsHydrating] = useState<boolean>(false);
  const [formDiscussedNeeds, setFormDiscussedNeeds] = useState<string>('');
  const [formActions, setFormActions] = useState<string>('');
  const [formNotes, setFormNotes] = useState<string>('');
  
  const DRAFT_KEY = `arrivio_session_draft_${currentUserId || 'guest'}`;
  const STICKY_KEY = `arrivio_session_sticky_${currentUserId || 'guest'}`;

  const wasOpen = useRef(false);

  // Initialisation à l'ouverture
  useEffect(() => {
    if (isOpen && !wasOpen.current) {
      wasOpen.current = true;
      if (session) {
        // ... (existing edit logic)
        setCategory(session.category);
        setFormDate(session.date);
        setFormFacilitatorType(session.facilitatorType);
        setSelectedConsultantName(session.facilitatorName);
        setSelectedContractId(session.contractId || '');
        setModalParticipantIds(session.participantIds || []);
        if (session.category === SessionCategory.INDIVIDUAL) {
          const client = (clients || []).find(c => session.participantIds?.includes(c.id));
          setSelectedClient(client || null);
          setAttendance(session.individualStatus || AttendanceStatus.PRESENT);
          setSelectedSubjects(session.subjectsCovered || []);
          setSelectedTargetClientTypes(session.targetClientTypes || []);
          setClientLocationCountry(session.clientLocationCountry || '');
          setSessionType(session.type);
          setProgrammingType(session.programmingType || 'Service standard');
          if (session.type === SessionType.EMPLOYMENT || session.type === SessionType.RTCE) {
            setShowEmployment(true);
          }
          
          setIsHydrating(true);
          setFormDiscussedNeeds(session.discussedNeeds || '');
          setFormActions(session.actions || '');
          setFormNotes(session.notes || '');
          apiService.getById('sessions', session.id)
            .then(fullSession => {
              setNaarsData(fullSession);
              setFormDiscussedNeeds(fullSession.discussedNeeds || '');
              setFormActions(fullSession.actions || '');
              setFormNotes(fullSession.notes || '');
              setSelectedSubjects(fullSession.subjectsCovered || []);
              setSelectedTargetClientTypes(fullSession.targetClientTypes || []);
              setClientLocationCountry(fullSession.clientLocationCountry || '');
              setProgrammingType(fullSession.programmingType || 'Service standard');
              const hasSEBAAData = fullSession.lifeNeedsInd || fullSession.languageNeedsInd || fullSession.employmentNeedsInd || 
              fullSession.lifeAssetInd || fullSession.languageAssetInd || fullSession.employmentAssetInd ||
              fullSession.supportReceivedInd || fullSession.supportRequiredInd || fullSession.settlementPlanCreatedInd ||
              fullSession.languageOfService;
              
              if (hasSEBAAData) {
                setShowNAARS(true);
              }
              if (fullSession.employmentStatusCanada || fullSession.intendedOccupationCnp || fullSession.employmentTopicCareerPlanningInd || fullSession.employmentTargetInd) {
                setShowEmployment(true);
              }
            })
            .catch(err => console.error("Error hydrating session:", err))
            .finally(() => setIsHydrating(false));
            
        } else {
          setNaarsData(session || {});
        }
      } else {
        // Tentative de récupération d'un brouillon local
        const draftStr = localStorage.getItem(DRAFT_KEY);
        let draft = null;
        if (draftStr) {
          try {
            draft = JSON.parse(draftStr);
          } catch (e) { console.warn("Failed to parse draft", e); }
        }

        if (draft) {
          // CRITICAL: Never let the draft override the intended category.
          // If the draft was saved for a GROUP session and we're opening an INDIVIDUAL one (or vice-versa),
          // discard the draft entirely to avoid showing the wrong form.
          if (draft.category && draft.category !== initialCategory) {
            localStorage.removeItem(DRAFT_KEY);
            draft = null;
          }
        }

        if (draft) {
          setCategory(initialCategory); // Always use initialCategory — never the draft's category
          setFormDate(draft.formDate || initialDate || new Date().toISOString().split('T')[0]);
          setFormFacilitatorType(draft.formFacilitatorType || FacilitatorType.CONSULTANT);
          setSelectedConsultantName(draft.selectedConsultantName || '');
          setSelectedContractId(draft.selectedContractId || '');
          setModalParticipantIds(draft.modalParticipantIds || initialParticipantIds || []);
          setSelectedClient(draft.selectedClientId ? (clients || []).find(c => c.id === draft.selectedClientId) || null : (initialParticipantIds?.length ? (clients || []).find(c => c.id === initialParticipantIds[0]) || null : null));
          setAttendance(draft.attendance || AttendanceStatus.PRESENT);
          setSelectedSubjects(draft.selectedSubjects || []);
          setSelectedTargetClientTypes(draft.selectedTargetClientTypes || []);
          setSessionType(draft.sessionType || SessionType.ESTABLISHMENT);
          setProgrammingType(draft.programmingType || 'Service standard');
          setFormDiscussedNeeds(draft.formDiscussedNeeds || '');
          setFormActions(draft.formActions || '');
          setFormNotes(draft.formNotes || '');
          setNaarsData(draft.naarsData || { formalFollowUpInd: false, lifeNeedsInd: true });
          if (draft.showNAARS) setShowNAARS(true);
          if (draft.showEmployment) setShowEmployment(true);
        } else {
          // Si pas de brouillon, on regarde les champs "collants" (dernières valeurs utilisées)
          const stickyStr = localStorage.getItem(STICKY_KEY);
          let sticky = null;
          if (stickyStr) {
            try {
              sticky = JSON.parse(stickyStr);
            } catch (e) {}
          }

          setCategory(initialCategory);
          setFormDate(initialDate || new Date().toISOString().split('T')[0]);
          setFormFacilitatorType(sticky?.formFacilitatorType || FacilitatorType.CONSULTANT);
          setSelectedConsultantName(sticky?.selectedConsultantName || '');
          setSelectedContractId('');
          setModalParticipantIds(initialParticipantIds || []);
          setSelectedClient(initialParticipantIds?.length ? (clients || []).find(c => c.id === initialParticipantIds[0]) || null : null);
          setAttendance(AttendanceStatus.PRESENT);
          setSelectedSubjects([]);
          setSelectedTargetClientTypes([]);
          setSessionType(sticky?.sessionType || SessionType.ESTABLISHMENT);
          setProgrammingType(sticky?.programmingType || 'Service standard');
          setFormDiscussedNeeds('');
          setFormActions('');
          setFormNotes('');
          setNaarsData({
            formalFollowUpInd: false,
            lifeNeedsInd: true,
            formatRemoteStaffInd: true,
            formatInPersonInd: false,
            formatRemoteSelfInd: false,
            formatRemoteEmailTextPhoneInd: false,
          });
        }
      }
    } else if (!isOpen) {
      wasOpen.current = false;
      setIsHydrating(false);
    }
  }, [isOpen, session, initialCategory, initialDate]);

  // Persistance du brouillon (Auto-save)
  useEffect(() => {
    if (isOpen && !isEditing) {
      const draftData = {
        category,
        formDate,
        formFacilitatorType,
        selectedConsultantName,
        selectedContractId,
        modalParticipantIds,
        selectedClientId: selectedClient?.id,
        attendance,
        selectedSubjects,
        selectedTargetClientTypes,
        sessionType,
        programmingType,
        naarsData,
        formDiscussedNeeds,
        formActions,
        formNotes,
        showNAARS,
        showEmployment
      };
      localStorage.setItem(DRAFT_KEY, JSON.stringify(draftData));
    }
  }, [
    isOpen, isEditing, category, formDate, formFacilitatorType, 
    selectedConsultantName, selectedContractId, modalParticipantIds, 
    selectedClient, attendance, selectedSubjects, selectedTargetClientTypes, 
    sessionType, programmingType, naarsData, formDiscussedNeeds, formActions, 
    formNotes, showNAARS, showEmployment, DRAFT_KEY
  ]);

  // Auto-population du pays IRCC dans le champ de formulaire
  useEffect(() => {
    if (selectedClient && !isEditing) {
      const irccCountry = selectedClient.irccOriginCountry ||
        getIRCCCountry(selectedClient.residenceCountry || selectedClient.originCountry);
      if (irccCountry && irccCountry !== 'Inconnu') {
        setClientLocationCountry(irccCountry);
      }
    }
  }, [selectedClient, isEditing]);

  const isGroup = category === SessionCategory.GROUP;

  const availableFacilitators = useMemo(() => {
    if (formFacilitatorType === FacilitatorType.CONSULTANT) {
      return (partners || []).filter(p => p.type === PartnerType.CONSULTANT);
    } else {
      return (partners || []).filter(p => p.type === PartnerType.INTERNAL || p.type === PartnerType.EXTERNAL);
    }
  }, [partners, formFacilitatorType]);

  // Pays IRCC du client sélectionné (affiché et verrouillé dans le formulaire)
  const irccDisplayCountry = useMemo(() => {
    if (!selectedClient) return null;
    const country = selectedClient.irccOriginCountry ||
      getIRCCCountry(selectedClient.residenceCountry || selectedClient.originCountry);
    return (country && country !== 'Inconnu') ? country : null;
  }, [selectedClient]);

  const activeContractsForConsultant = useMemo(() => {
    if (!selectedConsultantName || formFacilitatorType !== FacilitatorType.CONSULTANT) return [];
    return (contracts || []).filter(c => c.consultantName === selectedConsultantName && c.status === 'ACTIVE');
  }, [contracts, selectedConsultantName, formFacilitatorType]);

  const validationError = useMemo(() => {
    if (!isGroup || formFacilitatorType !== FacilitatorType.CONSULTANT || !selectedContractId) return null;
    const contract = activeContractsForConsultant.find(c => c.id === selectedContractId);
    if (!contract) return null;

    const actualUsedSessions = (sessions || []).filter(s => s.contractId === contract.id && s.id !== session?.id).length;
    if (actualUsedSessions >= contract.totalSessions) {
      return `Attention : Le quota de ce contrat est atteint (${actualUsedSessions}/${contract.totalSessions}).`;
    }

    if (formDate && (formDate < contract.startDate || formDate > contract.endDate)) {
      return `Date invalide : La séance doit avoir lieu entre le ${new Date(contract.startDate + 'T12:00:00').toLocaleDateString('fr-FR')} et le ${new Date(contract.endDate + 'T12:00:00').toLocaleDateString('fr-FR')}.`;
    }
    return null;
  }, [isGroup, formFacilitatorType, selectedContractId, formDate, activeContractsForConsultant]);

  const filteredClientsForSearch = useMemo(() => {
    if (!clientSearchQuery || clientSearchQuery.length < 2) return [];
    const query = clientSearchQuery.toLowerCase();
    return (clients || []).filter(c => 
      c.firstName?.toLowerCase().includes(query) ||
      c.lastName?.toLowerCase().includes(query) ||
      c.email?.toLowerCase().includes(query)
    ).slice(0, 10);
  }, [clients, clientSearchQuery]);

  const handleSubmit = (e: React.FormEvent<HTMLFormElement>) => {
    e.preventDefault();
    const formData = new FormData(e.currentTarget);
    
    if (!isGroup && !selectedClient && !isEditing) {
      alert("Veuillez sélectionner un client.");
      return;
    }

    const type = formData.get('type') as SessionType;
    const sessionDate = formData.get('date') as string;
    const startTime = formData.get('startTime') as string;

    // Validation globale obligatoire pour toutes les séances individuelles (Présent ou non)
    // Validation globale obligatoire pour toutes les séances individuelles
    if (category === SessionCategory.INDIVIDUAL) {
      if (!sessionDate) {
        alert("Veuillez sélectionner une date.");
        return;
      }
      if (!startTime) {
        alert("Veuillez sélectionner une heure de début.");
        return;
      }
      
      // Besoins et Actions obligatoires seulement si PRÉSENT
      if (attendance === AttendanceStatus.PRESENT) {
        if (!formDiscussedNeeds || formDiscussedNeeds.trim() === "") {
          alert("Veuillez renseigner les besoins discutés.");
          return;
        }
        if (!formActions || formActions.trim() === "") {
          alert("Veuillez renseigner les actions planifiées.");
          return;
        }
      }
    }

    // Validation IRCC/SÉBAA complète uniquement si le client est PRÉSENT
    if (category === SessionCategory.INDIVIDUAL && attendance === AttendanceStatus.PRESENT) {
      if (type === SessionType.ESTABLISHMENT) {
        if (selectedSubjects.length === 0) {
          alert("Veuillez sélectionner au moins un sujet abordé.");
          return;
        }
        if (selectedTargetClientTypes.length > 3) {
          alert("Vous ne pouvez pas sélectionner plus de 3 types de clients spécifiques.");
          return;
        }
        if (selectedTargetClientTypes.length === 0) {
          alert("Veuillez sélectionner au moins un type de client spécifique.");
          return;
        }
      }
      
      // Validation SÉBAA uniquement pour le service Établissement si activé
      if (showNAARS && type === SessionType.ESTABLISHMENT) {
        if (!(naarsData as any).languageOfService) {
          alert("Veuillez sélectionner la langue officielle de préférence du client dans le module SÉBAA.");
          return;
        }
        
        // Validation : Au moins 3 besoins identifiés dans Vie au Canada
        const identifiedNeedsCount = LIFE_NEEDS_IDS.filter(id => !!(naarsData as any)[id]).length;
        if (identifiedNeedsCount < 3) {
          alert("Veuillez identifier au moins 3 besoins dans la section 'Vie au Canada — Atouts & Besoins' du module SÉBAA.");
          return;
        }

        // Validation : Compétences linguistiques
        const hasLanguageAsset = !!naarsData.languageAssetInd;
        const hasLanguageNeed = !!naarsData.languageNeedsInd;

        if (!hasLanguageAsset && !hasLanguageNeed) {
          alert("Veuillez renseigner la section 'Compétences Linguistiques' du module SÉBAA (soit les Atouts, soit les Besoins).");
          return;
        }

        if (hasLanguageAsset) {
          const hasAssetChild = LANGUAGE_ASSET_CHILDREN.some(id => !!(naarsData as any)[id]);
          if (!hasAssetChild) {
            alert("Vous avez indiqué que le client a des atouts linguistiques. Veuillez cocher au moins une langue dans la section Atouts.");
            return;
          }
        }

        if (hasLanguageNeed) {
          const hasNeedChild = LANGUAGE_NEED_CHILDREN.some(id => !!(naarsData as any)[id]);
          if (!hasNeedChild) {
            alert("Vous avez indiqué que le client a des besoins linguistiques. Veuillez cocher au moins un type de besoin dans la section Besoins.");
            return;
          }
        }

        // Validation : Emploi & Éducation des Adultes
        const hasEmploymentAsset = !!naarsData.employmentAssetInd;
        const hasEmploymentNeed = !!naarsData.employmentNeedsInd;

        if (!hasEmploymentAsset && !hasEmploymentNeed) {
          alert("Veuillez renseigner la section 'Emploi & Éducation des Adultes' du module SÉBAA (soit les Atouts, soit les Besoins).");
          return;
        }

        if (hasEmploymentAsset) {
          const hasEmpAssetChild = EMPLOYMENT_ASSET_CHILDREN.some(id => !!(naarsData as any)[id]);
          if (!hasEmpAssetChild) {
            alert("Vous avez indiqué que le client a des atouts liés à l'emploi. Veuillez cocher au moins une option dans la section Atouts.");
            return;
          }
        }

        if (hasEmploymentNeed) {
          const hasEmpNeedChildVal = EMPLOYMENT_NEED_CHILDREN.some(id => !!(naarsData as any)[id]);
          if (!hasEmpNeedChildVal) {
            alert("Vous avez indiqué que le client a des besoins liés à l'emploi. Veuillez cocher au moins un type de besoin dans la section Besoins.");
            return;
          }
        }
      }
      
      // Validation Emploi (SLE) if active
      if (!isGroup && (sessionType === SessionType.EMPLOYMENT || sessionType === SessionType.RTCE || showEmployment) && attendance === AttendanceStatus.PRESENT) {
        // 1. Statuts obligatoires
        if (!(naarsData as any).employmentStatusOutside) {
          alert("Le champ 'Statut professionnel (Hors Canada)' est obligatoire pour le module Emploi.");
          return;
        }
        if (!(naarsData as any).intendedOccupationCnp) {
          alert("Le champ 'Profession prévue (CNP)' est obligatoire pour le module Emploi.");
          return;
        }
        if (!(naarsData as any).languageOfService) {
          alert("Le champ 'Langue officielle de préférence' est obligatoire pour le module Emploi.");
          return;
        }

        // 2. Population cible
        if ((naarsData as any).employmentTargetInd) {
          if (!(naarsData as any).employmentTargetType) {
            alert("Veuillez sélectionner le type de population ciblée.");
            return;
          }
          if ((naarsData as any).employmentTargetType === "Sectoriel" && !(naarsData as any).employmentSectorSpecific) {
            alert("Le champ 'Secteur spécifique' est obligatoire lorsque vous choisissez 'Sectoriel'.");
            return;
          }
        }

        // 3. Activités et sujets fournis (min 3)
        const selectedTopicsCount = EMPLOYMENT_TOPIC_FIELDS.filter(id => !!(naarsData as any)[id]).length;
        if (selectedTopicsCount < 3) {
          alert("Veuillez sélectionner au moins 3 choix dans la section 'Activités et Sujets fournis' du module Emploi.");
          return;
        }
      }
    }

    // Validation : Pas de séances individuelles dans le futur pour les conseillers
    const today = new Date().toLocaleDateString('en-CA'); // YYYY-MM-DD local
    
    if (category === SessionCategory.INDIVIDUAL && sessionDate > today && activeRole === UserRole.ADVISOR) {
      alert("Erreur : Les conseillers ne peuvent pas programmer de séances individuelles à des dates futures. Veuillez saisir une séance passée ou présente.");
      return;
    }

    const facilitatorName = isGroup ? (formData.get('facilitatorName') as string) : (session?.facilitatorName || currentUserName);
    const contractId = isGroup ? (formData.get('contractId') as string) : undefined;
    
    const title = isGroup 
      ? (formData.get('title') as string) 
      : (selectedClient ? `${selectedClient.firstName} ${selectedClient.lastName}` : (session?.title || 'Client Inconnu'));

    const sessionData: Session = {
      ...naarsData, // Start with existing data (NAARS indicators etc.)
      formatRemoteStaffInd: true,
      formatInPersonInd: false,
      formatRemoteSelfInd: false,
      formatRemoteEmailTextPhoneInd: false,
      id: session?.id || Date.now().toString(),
      title,
      type,
      category,
      date: formData.get('date') as string,
      startTime: formData.get('startTime') as string,
      duration: parseInt(formData.get('duration') as string),
      participantIds: isGroup ? modalParticipantIds : (selectedClient ? [selectedClient.id] : (session?.participantIds || [])),
      noShowIds: !isGroup && selectedClient && attendance === AttendanceStatus.ABSENT ? [selectedClient.id] : (session?.noShowIds || []),
      location: isGroup ? 'À distance' : 'À distance',
      notes: formNotes,
      discussedNeeds: formDiscussedNeeds,
      actions: formActions,
      facilitatorName,
      facilitatorType: isGroup ? (formData.get('facilitatorType') as FacilitatorType) : FacilitatorType.ORGANIZATION,
      advisorName: session?.advisorName || currentUserName,
      advisorId: session?.advisorId || currentUserId,
      contractId: contractId || undefined,
      individualStatus: isGroup ? undefined : attendance,
      needsInterpretation: formData.get('needsInterpretation') === 'true',
      zoomLink: isGroup ? (formData.get('zoomLink') as string || '') : '',
      zoomId: isGroup ? (formData.get('zoomId') as string || '') : '',
      invoiceReceived: session?.invoiceReceived || false, 
      invoiceSubmitted: session?.invoiceSubmitted || false, 
      invoicePaid: session?.invoicePaid || false,
      subjectsCovered: selectedSubjects,
      targetClientTypes: selectedTargetClientTypes,
      clientLocationCountry,
      activityFormat: session?.activityFormat || 'À distance (en ligne/numérique) — dirigé par le personnel',
      languageUsed: session?.languageUsed || 'Français',
      serviceSetting: isGroup ? 'Informations et Orientation de Groupe' : (formData.get('serviceSetting') as string || 'Informations et Orientation Individuelles/Familiales'),
      providerLocation: session?.providerLocation || 'Canada',
      supportServices: session?.supportServices || 'Aucun service de soutien reçu',
      programmingType: (session as any)?.programmingType || 'Service standard',
    };

    // Sanitize: clear funded referral IDs where "Aiguillé" is not checked
    for (const [refField, fundedField] of REFERRAL_FUNDED_PAIRS) {
      if (!(sessionData as any)[refField]) {
        (sessionData as any)[fundedField] = '';
      }
    }

    // Sauvegarder les champs "collants" pour la prochaine fois
    const stickyData = {
      formFacilitatorType: sessionData.facilitatorType,
      selectedConsultantName: sessionData.facilitatorName,
      sessionType: sessionData.type,
      programmingType: sessionData.programmingType
    };
    localStorage.setItem(STICKY_KEY, JSON.stringify(stickyData));

    // Nettoyer le brouillon après sauvegarde réussie
    localStorage.removeItem(DRAFT_KEY);
    onSave(sessionData);
  };

  const toggleNAARSField = (field: keyof Session) => {
    setNaarsData(prev => {
      const newValue = !prev[field];
      const nextData = { ...prev, [field]: newValue };
      
      // Auto-fill logic: if checking "Aiguillé", set funded ID to "Oui"
      if (newValue) {
        const pair = REFERRAL_FUNDED_PAIRS.find(p => p[0] === field);
        if (pair) {
          (nextData as any)[pair[1]] = FUNDED_REFERRAL_OPTIONS[0]; // "Service financé par IRCC"
        }
      }
      
      return nextData;
    });
  };

  const setNAARSValue = (field: keyof Session, value: any) => {
    setNaarsData(prev => ({ ...prev, [field]: value }));
  };

  const renderNAARSCheckbox = (label: string, field: keyof Session, indent = false, disabled = false) => (
    <label key={field} className={`flex items-center gap-2 ${disabled ? 'opacity-40 cursor-not-allowed' : 'cursor-pointer group'} ${indent ? 'ml-6' : ''}`}>
      <input 
        type="checkbox" 
        checked={!!naarsData[field]} 
        onChange={() => !disabled && toggleNAARSField(field)} 
        disabled={disabled}
        className="rounded border-slds-border text-slds-brand focus:ring-slds-brand disabled:cursor-not-allowed"
      />
      <span className={`text-[11px] transition-colors ${disabled ? 'text-slate-300' : 'text-slds-text-primary group-hover:text-slds-brand'}`}>{label}</span>
    </label>
  );

  const renderNAARSText = (label: string, field: keyof Session, disabled = false) => (
    <div key={field} className={`space-y-1 ${disabled ? 'opacity-40' : ''}`}>
      <label className="text-[10px] font-bold text-slds-text-secondary uppercase">{label}</label>
      <select 
        value={(naarsData[field] as string) || ''} 
        onChange={(e) => !disabled && setNAARSValue(field, e.target.value)} 
        disabled={disabled}
        className="slds-input text-[11px] disabled:cursor-not-allowed disabled:bg-slate-50"
      >
        <option value="">Sélectionner...</option>
        {FUNDED_REFERRAL_OPTIONS.map(opt => (
          <option key={opt} value={opt}>{opt}</option>
        ))}
      </select>
    </div>
  );

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 bg-black/50 z-[300] flex items-center justify-center p-4">
      <div className="slds-card w-full max-w-2xl shadow-2xl overflow-hidden animate-in zoom-in-95 duration-200 flex flex-col h-[650px] max-h-[90vh]">
        {/* Header */}
        <div className="p-4 border-b border-slds-border flex justify-between items-center bg-slds-bg shrink-0 relative">
          {isHydrating && (
            <div className="absolute inset-0 bg-white/80 z-20 flex items-center justify-center gap-2 animate-pulse">
              <Loader2 className="animate-spin text-slds-brand" size={16} />
              <span className="text-xs font-medium text-slds-brand">Chargement des données SÉBAA...</span>
            </div>
          )}
          <div className="flex items-center gap-3">
            <div className={`p-2 rounded ${isGroup ? 'bg-indigo-500' : 'bg-slds-brand'} text-white shadow-sm`}>
              {isGroup ? <Users size={20} /> : <User size={20} />}
            </div>
            <div>
              <h3 className="text-base font-bold text-slds-text-primary">
                {isEditing ? 'Modifier' : 'Nouvelle'} Séance {isGroup ? 'Collective' : 'Individuelle'}
              </h3>
            </div>
          </div>
          <button onClick={onClose} className="p-2 text-slds-text-secondary hover:bg-white rounded transition-colors"><X size={20} /></button>
        </div>

        {/* Body */}
        <form id="session-modal-form" onSubmit={handleSubmit} className="flex flex-col flex-1 min-h-0 overflow-hidden">
          <div className="p-6 space-y-6 overflow-y-auto flex-1 min-h-0">
            {/* Informations Générales */}
            <div className="space-y-4">
              <p className="text-[10px] font-bold text-slds-text-secondary uppercase border-b pb-2 tracking-widest">Informations Générales</p>
              
              {isGroup && (
                <div className="space-y-1">
                  <label className="text-[10px] font-bold text-slds-text-secondary uppercase">Titre de la séance collective</label>
                  <input name="title" required defaultValue={session?.title} placeholder="Ex: Webinaire Emploi IT..." className="slds-input" />
                </div>
              )}

              {!isGroup && (
                <div className="space-y-2">
                  <label className="text-[10px] font-bold text-slds-text-secondary uppercase">Client</label>
                  {!selectedClient ? (
                    <div className="relative">
                      <Search size={14} className="absolute left-3 top-1/2 -translate-y-1/2 text-slds-text-secondary" />
                      <input 
                        type="text"
                        placeholder="Rechercher par nom ou email..."
                        className="slds-input pl-9"
                        value={clientSearchQuery}
                        onChange={(e) => setClientSearchQuery(e.target.value)}
                      />
                      {filteredClientsForSearch.length > 0 && (
                        <div className="absolute top-full left-0 w-full bg-white border border-slds-border rounded shadow-xl mt-1 z-[400] overflow-hidden divide-y divide-slds-border max-h-60 overflow-y-auto">
                          {filteredClientsForSearch.map(c => (
                            <button 
                              key={c.id}
                              type="button"
                              onClick={() => { setSelectedClient(c as any); setClientSearchQuery(''); }}
                              className="w-full flex items-center gap-3 p-3 hover:bg-slds-bg transition-all text-left group"
                            >
                              <div className="w-8 h-8 rounded bg-slds-bg text-slds-text-secondary flex items-center justify-center font-bold text-[10px] group-hover:bg-slds-brand group-hover:text-white transition-colors">
                                {c.firstName?.[0] || '?'}{c.lastName?.[0] || '?'}
                              </div>
                              <div className="flex-1 min-w-0">
                                <p className="text-xs font-bold text-slds-text-primary truncate">{c.firstName} {c.lastName}</p>
                                <p className="text-[9px] text-slds-text-secondary font-bold uppercase truncate">{ (c as any).profession || 'Client'}</p>
                              </div>
                              <ChevronRight size={14} className="text-slds-text-secondary" />
                            </button>
                          ))}
                        </div>
                      )}
                    </div>
                  ) : (
                    <div className="flex items-center justify-between p-3 bg-blue-50 border border-blue-100 rounded animate-in fade-in slide-in-from-left-2">
                      <div className="flex items-center gap-3">
                        <div className="w-8 h-8 rounded bg-slds-brand text-white flex items-center justify-center font-bold text-xs shadow-sm">
                          {selectedClient.firstName?.[0] || '?'}{selectedClient.lastName?.[0] || '?'}
                        </div>
                        <div>
                          <p className="text-xs font-bold text-slds-text-primary">{selectedClient.firstName} {selectedClient.lastName}</p>
                          <p className="text-[9px] text-slds-brand font-bold uppercase">{selectedClient.profession || 'Inscrit'}</p>
                        </div>
                      </div>
                      <div className="flex items-center gap-2">
                        <button 
                          type="button"
                          onClick={() => {
                            if (selectedClient) {
                              onSelectClient?.(selectedClient);
                              onClose();
                            }
                          }}
                          className="slds-button slds-button-neutral !px-3 !py-1 text-[10px] flex items-center gap-1.5 border-slds-brand/30 text-slds-brand hover:bg-blue-50"
                        >
                          <FileText size={12} /> Voir le dossier
                        </button>
                        {!isEditing && (
                          <button 
                            type="button"
                            onClick={() => setSelectedClient(null)}
                            className="p-1 text-slds-text-secondary hover:text-slds-error hover:bg-white rounded transition-all"
                          >
                            <X size={16} />
                          </button>
                        )}
                      </div>
                    </div>
                  )}
                </div>
              )}

              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div className="space-y-1">
                  <label className="text-[10px] font-bold text-slds-text-secondary uppercase">Type de service</label>
                  <select 
                    name="type" 
                    required 
                    value={sessionType} 
                    onChange={(e) => {
                      const newType = e.target.value as SessionType;
                      setSessionType(newType);
                      if (newType === SessionType.EMPLOYMENT || newType === SessionType.RTCE) {
                        setShowEmployment(true);
                      }
                      // Optionnel: On pourrait aussi désactiver SEBAA si ce n'est pas un service d'Établissement
                      // if (newType !== SessionType.ESTABLISHMENT) setShowNAARS(false);
                    }}
                    className="slds-input"
                  >
                    {Object.values(SessionType).map(t => <option key={t} value={t}>{SESSION_TYPE_LABELS[t]}</option>)}
                  </select>
                </div>
                <div className="space-y-1">
                  <label className="text-[10px] font-bold text-slds-text-secondary uppercase text-slds-brand">Date de la séance</label>
                  <input type="date" name="date" value={formDate} onChange={(e) => setFormDate(e.target.value)} required className="slds-input border-slds-brand/30" />
                </div>
                <div className="space-y-1">
                  <label className="text-[10px] font-bold text-slds-text-secondary uppercase">Heure de début</label>
                  <input type="time" name="startTime" defaultValue={session?.startTime || "09:00"} required className="slds-input" />
                </div>
                <div className="space-y-1">
                  <label className="text-[10px] font-bold text-slds-text-secondary uppercase">Durée de l'activité (heures)</label>
                  <select 
                    name="duration" 
                    defaultValue={session?.duration?.toString() || "60"} 
                    required 
                    className="slds-input"
                  >
                    <option value="30">0,5</option>
                    <option value="60">1,0</option>
                    <option value="90">1,5</option>
                    <option value="120">2,0</option>
                    <option value="150">2,5</option>
                    <option value="180">3,0</option>
                    <option value="210">3,5</option>
                    <option value="240">4,0</option>
                  </select>
                </div>
                <div className="space-y-1">
                  <label className="text-[10px] font-bold text-slds-text-secondary uppercase">Format de l'activité</label>
                  <div className="flex items-center gap-2 mt-1">
                    <span className="inline-flex items-center px-2 py-1 rounded text-[10px] font-bold bg-emerald-50 text-emerald-700 border border-emerald-200 shadow-sm">
                      ✓ À distance — dirigé par le personnel (Valeur fixe Arrivio)
                    </span>
                  </div>
                </div>
              </div>

              {isGroup && (
                <>
                  <div className="space-y-1">
                    <label className="text-[10px] font-bold text-slds-text-secondary uppercase flex items-center gap-1">
                      <Hash size={12} className="text-slds-brand" /> ID de réunion (Zoom/Teams) <span className="text-slds-error ml-1">*</span>
                    </label>
                    <input type="text" name="zoomId" defaultValue={session?.zoomId} required placeholder="Meeting ID..." className="slds-input text-slds-brand" />
                  </div>

                  <div className="space-y-1">
                    <label className="text-[10px] font-bold text-slds-text-secondary uppercase flex items-center gap-1">
                      <Video size={12} className="text-slds-brand" /> Lien Visioconférence <span className="text-slds-error ml-1">*</span>
                    </label>
                    <input type="text" name="zoomLink" defaultValue={session?.zoomLink} required placeholder="Lien Zoom/Teams..." className="slds-input text-slds-brand" />
                  </div>
                </>
              )}
            </div>

            {/* Intervenant et Contrat (Collectif) */}
            {isGroup && (
              <div className="space-y-4 pt-4 border-t border-slds-border">
                <p className="text-[10px] font-bold text-slds-text-secondary uppercase tracking-widest">Responsables & Contrats</p>
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  <div className="space-y-1">
                    <label className="text-[10px] font-bold text-slds-text-secondary uppercase">Type d'Intervenant</label>
                    <select 
                      name="facilitatorType" 
                      required 
                      className="slds-input text-slds-brand"
                      value={formFacilitatorType}
                      onChange={(e) => { 
                        setFormFacilitatorType(e.target.value as FacilitatorType); 
                        setSelectedConsultantName('');
                        setSelectedContractId('');
                      }}
                    >
                      <option value={FacilitatorType.CONSULTANT}>Consultant Externe</option>
                      <option value={FacilitatorType.ORGANIZATION}>Organisme ou Interne</option>
                    </select>
                  </div>
                  <div className="space-y-1">
                    <label className="text-[10px] font-bold text-slds-text-secondary uppercase">Nom de l'Intervenant</label>
                    <select 
                      name="facilitatorName" 
                      required 
                      value={selectedConsultantName}
                      onChange={(e) => { setSelectedConsultantName(e.target.value); setSelectedContractId(''); }}
                      className="slds-input"
                    >
                      <option value="">Sélectionner...</option>
                      {availableFacilitators.map(p => <option key={p.id} value={p.name}>{p.name}</option>)}
                    </select>
                  </div>
                </div>

                {formFacilitatorType === FacilitatorType.CONSULTANT && selectedConsultantName && (
                  <div className="p-3 bg-blue-50 border border-blue-100 rounded animate-in fade-in slide-in-from-top-1">
                     <div className="flex items-center gap-2 mb-2">
                        <FileText size={14} className="text-blue-600" />
                        <p className="text-[10px] font-bold text-blue-600 uppercase">Contrat d'imputation</p>
                     </div>
                     <select 
                      name="contractId" 
                      required 
                      value={selectedContractId}
                      onChange={(e) => setSelectedContractId(e.target.value)}
                      className={`slds-input bg-white ${validationError ? 'border-amber-400 ring-2 ring-amber-50' : ''}`}
                     >
                       <option value="">Choisir un contrat actif...</option>
                       {activeContractsForConsultant.map(c => {
                          const actualUsed = (sessions || []).filter(s => s.contractId === c.id && s.id !== session?.id).length;
                          return (
                            <option key={c.id} value={c.id}>
                              Contrat {c.id.split('-')[1]} - {c.serviceType} ({actualUsed}/{c.totalSessions})
                            </option>
                          );
                        })}
                     </select>
                     {validationError && (
                       <div className="mt-2 flex items-start gap-2 p-2 bg-amber-50 border border-amber-200 rounded text-[10px] font-bold text-amber-700">
                         <AlertCircle size={14} className="flex-shrink-0" />
                         {validationError}
                       </div>
                     )}
                  </div>
                )}
              </div>
            )}

            {/* Participant Manager (Collectif) */}
            {isGroup && (
              <div className="pt-4 border-t border-slds-border">
                <ParticipantManager 
                  clients={clients} 
                  selectedParticipantIds={modalParticipantIds} 
                  onChange={setModalParticipantIds} 
                />
              </div>
            )}

            {/* Suivi Individuel (Individuelle) */}
            {!isGroup && (
              <div className="pt-4 border-t border-slds-border space-y-4">
                <p className="text-[10px] font-bold text-slds-text-secondary uppercase flex items-center gap-2">
                   <ClipboardList size={14} className="text-slds-success" /> Suivi & Présence
                </p>
                
                <div className="space-y-2">
                   <label className="text-[10px] font-bold text-slds-text-secondary uppercase">État de présence</label>
                   <div className="flex flex-wrap gap-2">
                      {Object.values(AttendanceStatus).map(status => (
                        <button
                          key={status}
                          type="button"
                          onClick={() => setAttendance(status)}
                          className={`flex items-center gap-2 px-3 py-1.5 rounded text-[9px] font-bold uppercase border transition-all ${attendance === status ? 'bg-slds-brand text-white border-slds-brand shadow-sm' : 'bg-slds-bg text-slds-text-secondary border-slds-border hover:border-slds-brand'}`}
                        >
                          {status === AttendanceStatus.PRESENT ? <UserCheck size={14}/> : <UserX size={14}/>}
                          {status}
                        </button>
                      ))}
                   </div>
                </div>

                {attendance === AttendanceStatus.PRESENT && (
                  <>
                    <div className="space-y-1">
                      <label className="text-[10px] font-bold text-slds-text-secondary uppercase flex items-center gap-1">
                        <Target size={12} className="text-slds-brand" /> Besoins discutés <span className="text-slds-error ml-1">*</span>
                      </label>
                      <textarea 
                        value={formDiscussedNeeds}
                        onChange={(e) => setFormDiscussedNeeds(e.target.value)}
                        placeholder="Synthèse des besoins exprimés par le client..."
                        className="slds-input h-20 resize-none text-xs"
                      />
                    </div>

                    <div className="space-y-1">
                      <label className="text-[10px] font-bold text-slds-text-secondary uppercase flex items-center gap-1">
                        <Activity size={12} className="text-slds-success" /> Actions planifiées <span className="text-slds-error ml-1">*</span>
                      </label>
                      <textarea 
                        value={formActions}
                        onChange={(e) => setFormActions(e.target.value)}
                        placeholder="Prochaines étapes, rendez-vous, orientatons..."
                        className="slds-input h-20 resize-none text-xs"
                      />
                    </div>
                  </>
                )}
              </div>
            )}

            {/* Reporting IRCC (Etablissement - Individuel ou Groupe) */}
            {((sessionType === SessionType.ESTABLISHMENT || (isGroup && (sessionType === SessionType.EMPLOYMENT || sessionType === SessionType.RTCE))) && 
              (isGroup || attendance === AttendanceStatus.PRESENT)) && (
              <div className="pt-4 border-t border-slds-border space-y-6">
                <p className="text-[10px] font-bold text-slds-text-secondary uppercase flex items-center gap-2">
                   <Activity size={14} className="text-slds-brand" /> Reporting IRCC (Orientation I&O)
                </p>

                {/* Emplacement du client : Pays (Uniquement Individuel) */}
                {!isGroup && (
                  <div className="space-y-1">
                    {irccDisplayCountry && (
                      <div className="flex items-center gap-2 px-3 py-2 bg-indigo-50 border border-indigo-200 rounded-lg text-[10px] text-indigo-700 font-bold mb-2 shadow-sm">
                        <div className="p-1 bg-indigo-500 text-white rounded">
                          <Globe size={10} />
                        </div>
                        <span className="font-black text-indigo-400 uppercase tracking-widest mr-1">Pays IRCC :</span>
                        <span>{irccDisplayCountry}</span>
                      </div>
                    )}
                    <label className="text-[10px] font-bold text-slds-text-secondary uppercase">
                      Emplacement du client : Pays {attendance === AttendanceStatus.PRESENT && <span className="text-slds-error ml-1">*</span>}
                    </label>
                    <select 
                      name="clientLocationCountry" 
                      value={clientLocationCountry}
                      onChange={(e) => setClientLocationCountry(e.target.value)}
                      required 
                      disabled={!!irccDisplayCountry}
                      className={`slds-input text-slds-brand font-bold ${irccDisplayCountry ? 'bg-slate-100 cursor-not-allowed opacity-75' : ''}`}
                    >
                      <option value="">Sélectionner un pays...</option>
                      {IRCC_COUNTRIES.map(country => (
                        <option key={country} value={country}>{country}</option>
                      ))}
                    </select>
                    {irccDisplayCountry ? (
                      <p className="text-[8px] text-indigo-600 font-bold italic mt-1 flex items-center gap-1">
                        <CheckCircle2 size={8} /> Valeur IRCC auto-détectée — non modifiable.
                      </p>
                    ) : (
                      <p className="text-[9px] text-slds-text-secondary italic">
                        Ce champ est utilisé pour la Colonne 14 du rapport IRCC.
                      </p>
                    )}
                  </div>
                )}

                {/* Sujets Abordés */}
                <div className="space-y-3">
                  <div className="flex justify-between items-center">
                    <label className="text-[10px] font-bold text-slds-text-secondary uppercase">
                      Sujet(s) abordés {attendance === AttendanceStatus.PRESENT && <span className="text-slds-error ml-1">*</span>}
                    </label>
                    <span className="text-[8px] font-bold text-slds-text-secondary">MIN 1</span>
                  </div>
                  <div className="grid grid-cols-1 gap-2 p-3 bg-slds-bg rounded border border-slds-border">
                    {SUBJECTS_OPTIONS.map(option => (
                      <label key={option} className="flex items-start gap-3 cursor-pointer group">
                        <input 
                          type="checkbox"
                          checked={selectedSubjects.includes(option)}
                          onChange={(e) => {
                            if (e.target.checked) setSelectedSubjects([...selectedSubjects, option]);
                            else setSelectedSubjects(selectedSubjects.filter(s => s !== option));
                          }}
                          className="mt-1"
                        />
                        <span className="text-[10px] text-slds-text-primary group-hover:text-slds-brand transition-colors">{option}</span>
                      </label>
                    ))}
                  </div>
                </div>

                {/* Type de client spécifique */}
                <div className="space-y-3">
                  <div className="flex justify-between items-center">
                    <label className="text-[10px] font-bold text-slds-text-secondary uppercase">
                      Type de client spécifique {attendance === AttendanceStatus.PRESENT && <span className="text-slds-error ml-1">*</span>}
                    </label>
                    <span className={`text-[8px] font-bold ${selectedTargetClientTypes.length > 3 ? 'text-slds-error' : 'text-slds-text-secondary'}`}>
                      {selectedTargetClientTypes.length}/3
                    </span>
                  </div>
                  <div className="grid grid-cols-1 gap-2 p-3 bg-slds-bg rounded border border-slds-border">
                    {TARGET_CLIENT_TYPES_OPTIONS.map(option => (
                      <label key={option} className="flex items-start gap-3 cursor-pointer group">
                        <input 
                          type="checkbox"
                          checked={selectedTargetClientTypes.includes(option)}
                          onChange={(e) => {
                            if (e.target.checked) setSelectedTargetClientTypes([...selectedTargetClientTypes, option]);
                            else setSelectedTargetClientTypes(selectedTargetClientTypes.filter(s => s !== option));
                          }}
                          className="mt-1"
                        />
                        <span className="text-[10px] text-slds-text-primary group-hover:text-slds-brand transition-colors">{option}</span>
                      </label>
                    ))}
                  </div>
                </div>

                {/* Type de programmation / d'initiative */}
                <div className="space-y-1">
                  <label className="text-[10px] font-bold text-slds-text-secondary uppercase">Type de programmation / d'initiative</label>
                  <input 
                    type="text" 
                    value={programmingType} 
                    onChange={(e) => setProgrammingType(e.target.value)}
                    placeholder="Ex: Service standard..."
                    className="slds-input"
                  />
                </div>

                {/* Cadre du service (I&O) */}
                <div className="space-y-1">
                  <label className="text-[10px] font-bold text-slds-text-secondary uppercase">
                    Le service a-t-il été fourni dans un cadre de groupe ou individuel/familial ?
                  </label>
                  {isGroup ? (
                    <div className="flex items-center gap-2 mt-1">
                      <span className="inline-flex items-center px-2 py-1 rounded text-[10px] font-bold bg-indigo-50 text-indigo-700 border border-indigo-200">
                        ✓ Informations et Orientation de Groupe (fixe)
                      </span>
                    </div>
                  ) : (
                    <select 
                      name="serviceSetting" 
                      defaultValue={session?.serviceSetting || "Informations et Orientation Individuelles/Familiales"}
                      className="slds-input text-xs"
                    >
                      <option value="Informations et Orientation Individuelles/Familiales">Informations et Orientation Individuelles/Familiales</option>
                      <option value="Informations et Orientation de Groupe">Informations et Orientation de Groupe</option>
                    </select>
                  )}
                </div>


                {(!isGroup && attendance === AttendanceStatus.PRESENT) && (
                  <div className="pt-6 border-t-2 border-dashed border-slds-border mt-6">
                  <div className="flex items-center justify-between p-4 bg-sky-50 border border-sky-200 rounded-lg mb-4">
                    <div className="flex items-center gap-3">
                      <div className="p-2 bg-sky-500 text-white rounded shadow-sm">
                        <ClipboardList size={18} />
                      </div>
                      <div>
                        <p className="text-xs font-bold text-sky-900 leading-tight">Module SÉBAA — Évaluation des Besoins et des Atouts</p>
                        <p className="text-[10px] text-sky-700 font-medium">Conforme au gabarit IRCC VER 1335 — Orientation I&O individuelle</p>
                      </div>
                    </div>
                    <label className="flex items-center gap-3 cursor-pointer">
                      <span className="text-[10px] font-bold text-sky-800 uppercase tracking-tight">{showNAARS ? 'Module Actif' : 'Activer SÉBAA ?'}</span>
                      <div
                        className={`relative w-10 h-5 rounded-full transition-colors ${showNAARS ? 'bg-sky-600' : 'bg-slate-300'}`}
                        onClick={() => {
                          const next = !showNAARS;
                          setShowNAARS(next);
                          if (next && !naarsData.lifeNeedsInd) {
                            setNAARSValue('lifeNeedsInd', true);
                          }
                        }}
                      >
                        <div className={`absolute top-1 left-1 w-3 h-3 bg-white rounded-full transition-transform ${showNAARS ? 'translate-x-5' : ''}`} />
                      </div>
                    </label>
                  </div>

                  {showNAARS && (
                    <div className="space-y-3 animate-in slide-in-from-top-2 duration-300">

                      {/* Infos admin */}
                      <div className="grid grid-cols-2 gap-3 p-3 bg-white border border-sky-100 rounded">
                        <div className="space-y-1">
                          <label className="text-[9px] font-bold text-sky-800 uppercase">Code Postal Organisation</label>
                          <p className="text-xs font-bold text-sky-900">L5B3C4</p>
                        </div>
                        <div className="space-y-1">
                          <label className="text-[9px] font-bold text-sky-800 uppercase">Pays Organisation</label>
                          <p className="text-xs font-bold text-sky-900">—</p>
                        </div>
                        <div className="space-y-1 col-span-2">
                          <label className="text-[9px] font-bold text-sky-800 uppercase">Langue officielle de préférence du client {attendance === AttendanceStatus.PRESENT && <span className="text-slds-error ml-1">*</span>}</label>
                          <select
                            value={(naarsData as any).languageOfService || ''}
                            onChange={(e) => setNAARSValue('languageOfService' as any, e.target.value)}
                            className="slds-input text-xs"
                          >
                            <option value="">Sélectionner...</option>
                            <option>Français</option>
                            <option>Anglais</option>
                            <option>Les deux (Anglais et/ou Français)</option>
                            <option>Aucune (Anglais ou Français)</option>
                          </select>
                        </div>
                        <div className="space-y-1 col-span-2">
                          <label className="text-[9px] font-bold text-sky-800 uppercase">Cette évaluation est-elle le résultat d'un suivi formel ?</label>
                          <div className="flex items-center gap-2 mt-1">
                            <span className="inline-flex items-center px-2 py-0.5 rounded text-[10px] font-bold bg-slate-100 text-slate-500 border border-slate-200">
                              ✗ Non (fixe)
                            </span>
                            <span className="text-[9px] text-slate-400 italic">Cette valeur est fixe pour les orientations I&O individuelles.</span>
                          </div>
                        </div>
                      </div>

                      {/* Accordéon 1 : Vie au Canada */}
                      <div className="border border-slds-border rounded overflow-hidden">
                        <button type="button" onClick={() => setActiveSection(activeSection === 'life' ? null : 'life')}
                          className="w-full flex items-center justify-between p-3 bg-slds-bg hover:bg-white transition-colors">
                          <span className="text-[11px] font-bold text-slds-text-primary uppercase">1. Vie au Canada — Atouts &amp; Besoins</span>
                          <ChevronRight size={16} className={`transition-transform ${activeSection === 'life' ? 'rotate-90' : ''}`} />
                        </button>
                        {activeSection === 'life' && (
                          <div className="p-4 bg-white space-y-4 border-t border-slds-border animate-in slide-in-from-top-1">
                            <p className="text-[10px] font-black text-sky-700 uppercase tracking-widest border-b border-sky-100 pb-1">Atouts</p>
                            {renderNAARSCheckbox("Client dispose d'actifs pour subvenir à ses besoins au Canada", "lifeAssetInd")}
                            <div className={`pl-4 space-y-1 transition-opacity ${!naarsData.lifeAssetInd ? 'opacity-40' : ''}`}>
                              {renderNAARSCheckbox("Réseaux familiaux et personnels", "lifeAssetFamilyNetworksInd", true, !naarsData.lifeAssetInd)}
                              {renderNAARSCheckbox("Connaissance du Canada, des services gouvernementaux et autres services", "lifeAssetKnowledgeServicesInd", true, !naarsData.lifeAssetInd)}
                              {renderNAARSCheckbox("Motivation liée à l'établissement et à l'intégration", "lifeAssetSettlementMotivationInd", true, !naarsData.lifeAssetInd)}
                              {renderNAARSCheckbox("Autres compétences ou expériences utiles à la communauté ou au client", "lifeAssetOtherSkillsInd", true, !naarsData.lifeAssetInd)}
                            </div>

                            <p className="text-[10px] font-black text-sky-700 uppercase tracking-widest border-b border-sky-100 pb-1 pt-2">Besoins</p>
                            <div className="flex items-center gap-2">
                              <span className="inline-flex items-center px-2 py-0.5 rounded text-[10px] font-bold bg-emerald-50 text-emerald-700 border border-emerald-200">
                                ✓ Oui (fixe)
                              </span>
                              <span className="text-[9px] text-slate-400 italic">Toujours Oui pour une séance SÉBAA.</span>
                            </div>
                            <div className="pl-4 space-y-3">
                              {[
                                { label: "Besoins de base", hint: "Vêtements, nourriture, articles de soins personnels ou de garde d'enfants, fournitures, ressources financières, etc.", id: 'lifeNeedsBasicIdentifiedInd', ref: 'lifeNeedsBasicReferralInd', funded: 'lifeNeedsBasicFundedReferralId' },
                                { label: "Famille et enfants", hint: "Options de garde d'enfants, inscription des enfants à l'école, dynamiques familiales, conflits, etc.", id: 'lifeNeedsFamilyChildrenIdentifiedInd', ref: 'lifeNeedsFamilyChildrenReferralInd', funded: 'lifeNeedsFamilyChildrenFundedReferralId' },
                                { label: "Santé et santé mentale", hint: "Santé mentale, maladies, handicaps, dépendances, bien-être, problèmes de sécurité, etc.", id: 'lifeNeedsHealthAndMentalIdentifiedInd', ref: 'lifeNeedsHealthAndMentalReferralInd', funded: 'lifeNeedsHealthAndMentalFundedReferralId' },
                                { label: "Logement", hint: "Location, propriété, hypothèque, sécurité du logement, déménagement, propriétaires, parasites, services communs, etc.", id: 'lifeNeedsHousingIdentifiedInd', ref: 'lifeNeedsHousingReferralInd', funded: 'lifeNeedsHousingFundedReferralId' },
                                { label: "Connaissance des services gouvernementaux", hint: "Accès aux services et prestations gouvernementaux, documentation, etc.", id: 'lifeNeedsGovernmentKnowledgeIdentifiedInd', ref: 'lifeNeedsGovernmentKnowledgeNoReferralInd', funded: 'lifeNeedsGovernmentKnowledgeFundedReferralId' },
                                { label: "Connaissance du Canada", hint: "Apprendre davantage sur différents aspects du Canada, citoyenneté canadienne, connaissance du patrimoine francophone, relations avec les peuples autochtones, etc.", id: 'lifeNeedsCanadaKnowledgeIdentifiedInd', ref: 'lifeNeedsCanadaKnowledgeReferralInd', funded: 'lifeNeedsCanadaKnowledgeFundedReferralId' },
                                { label: "Juridiques", hint: "Problèmes juridiques, connaissance du système juridique canadien, aide juridique, etc.", id: 'lifeNeedsLegalIdentifiedInd', ref: 'lifeNeedsLegalReferralInd', funded: 'lifeNeedsLegalFundedReferralId' },
                                { label: "Financiers", hint: "Connaissances en finances au Canada, services bancaires, cartes de crédit, besoin de ressources financières, etc.", id: 'lifeNeedsFinancialIdentifiedInd', ref: 'lifeNeedsFinancialReferralInd', funded: 'lifeNeedsFinancialFundedReferralId' },
                                { label: "Connaissance communautaire", hint: "", id: 'lifeNeedsCommunityKnowledgeIdentifiedInd', ref: 'lifeNeedsCommunityKnowledgeReferralInd', funded: 'lifeNeedsCommunityKnowledgeFundedReferralId' },
                                { label: "Réseautage social", hint: "Améliorer l'accès aux réseaux sociaux, voisins, amis, etc.", id: 'lifeNeedsSocialNetworkingIdentifiedInd', ref: 'lifeNeedsSocialNetworkingReferralInd', funded: 'lifeNeedsSocialNetworkingFundedReferralId' },
                                { label: "Faire face au racisme et à la discrimination", hint: "Charte des droits et libertés, discrimination ou racisme, violence basée sur le genre, etc.", id: 'lifeNeedsRacismIdentifiedInd', ref: 'lifeNeedsRacismReferralInd', funded: 'lifeNeedsRacismFundedReferralId' },
                              ].map(n => {
                                const isIdentified = !!(naarsData as any)[n.id];
                                return (
                                  <div key={n.id} className="p-2 bg-slate-50 rounded border border-slate-100 space-y-1">
                                    <p className="text-[10px] font-bold text-slate-700">{n.label}</p>
                                    {n.hint && (
                                      <p className="text-[9px] text-slate-400 italic leading-relaxed">{n.hint}</p>
                                    )}
                                    <div className="pl-3 space-y-1 pt-1">
                                      {renderNAARSCheckbox("Besoin identifié", n.id as any, true)}
                                      {renderNAARSCheckbox("Aiguillé", n.ref as any, true, !isIdentified)}
                                      {renderNAARSText("Aiguillage vers services financés (ID)", n.funded as any, !isIdentified)}
                                    </div>
                                  </div>
                                );
                              })}
                            </div>
                          </div>
                        )}
                      </div>

                      {/* Accordéon 2 : Langue */}
                      <div className="border border-slds-border rounded overflow-hidden">
                        <button type="button" onClick={() => setActiveSection(activeSection === 'lang' ? null : 'lang')}
                          className="w-full flex items-center justify-between p-3 bg-slds-bg hover:bg-white transition-colors">
                          <span className="text-[11px] font-bold text-slds-text-primary uppercase">2. Compétences Linguistiques</span>
                          <ChevronRight size={16} className={`transition-transform ${activeSection === 'lang' ? 'rotate-90' : ''}`} />
                        </button>
                        {activeSection === 'lang' && (
                          <div className="p-4 bg-white space-y-4 border-t border-slds-border animate-in slide-in-from-top-1">
                            <p className="text-[10px] font-black text-sky-700 uppercase tracking-widest border-b border-sky-100 pb-1">Atouts</p>
                            {renderNAARSCheckbox("Client identifie des atouts liés à la langue", "languageAssetInd")}
                            <div className={`pl-4 space-y-1 transition-opacity ${!naarsData.languageAssetInd ? 'opacity-40' : ''}`}>
                              {renderNAARSCheckbox("Connaissance suffisante de l'anglais pour communiquer facilement", "languageAssetEnglishInd", true, !naarsData.languageAssetInd)}
                              {renderNAARSCheckbox("Connaissance suffisante du français pour communiquer facilement", "languageAssetFrenchInd", true, !naarsData.languageAssetInd)}
                              {renderNAARSCheckbox("Autres compétences en communication (ex: ALS/LSQ)", "languageAssetOtherInd", true, !naarsData.languageAssetInd)}
                            </div>
                            <p className="text-[10px] font-black text-sky-700 uppercase tracking-widest border-b border-sky-100 pb-1 pt-2">Besoins</p>
                            {renderNAARSCheckbox("Client a des besoins linguistiques", "languageNeedsInd")}
                            <div className={`pl-4 space-y-3 transition-opacity ${!naarsData.languageNeedsInd ? 'opacity-40' : ''}`}>
                              {[
                                { label: "Langues officielles", id: 'languageNeedsOfficialIdentifiedNeedInd', lang: 'languageNeedsOfficialLanguageId', ref: 'languageNeedsOfficialReferralInd', funded: 'languageNeedsOfficialFundedReferralId' },
                                { label: "Littéracie", id: 'languageNeedsLiteracyIdentifiedNeedInd', lang: 'languageNeedsLiteracyLanguageId', ref: 'languageNeedsLiteracyReferralInd', funded: 'languageNeedsLiteracyFundedReferralId' },
                                { label: "Langue de travail", id: 'languageNeedsEmploymentIdentifiedNeedInd', lang: 'languageNeedsEmploymentLanguageId', ref: 'languageNeedsEmploymentReferralInd', funded: 'languageNeedsEmploymentFundedReferralId' },
                              ].map(n => {
                                const parentDisabled = !naarsData.languageNeedsInd;
                                const isIdentified = !!(naarsData as any)[n.id] && !parentDisabled;
                                return (
                                  <div key={n.id} className="p-2 bg-slate-50 rounded border border-slate-100 space-y-1">
                                    <p className="text-[10px] font-bold text-slate-600">{n.label}</p>
                                    <div className="pl-3 space-y-1">
                                      {renderNAARSCheckbox("Besoin identifié", n.id as any, true, parentDisabled)}
                                      <div className={`space-y-1 transition-opacity ${!isIdentified ? 'opacity-40' : ''}`}>
                                        <label className="text-[10px] font-bold text-slds-text-secondary uppercase">Langue</label>
                                        <select
                                          value={(naarsData as any)[n.lang] || ''}
                                          onChange={(e) => !isIdentified ? undefined : setNAARSValue(n.lang as any, e.target.value)}
                                          disabled={!isIdentified}
                                          className="slds-input text-[11px] disabled:opacity-40 disabled:cursor-not-allowed"
                                        >
                                          <option value="">Sélectionner...</option>
                                          <option>Français</option>
                                          <option>Anglais</option>
                                          <option>Les deux (anglais et français)</option>
                                        </select>
                                      </div>
                                      {renderNAARSCheckbox("Aiguillé", n.ref as any, true, !isIdentified)}
                                      {renderNAARSText("Aiguillage vers services financés (ID)", n.funded as any, !isIdentified)}
                                    </div>
                                  </div>
                                );
                              })}
                            </div>
                          </div>
                        )}
                      </div>

                      {/* Accordéon 3 : Emploi & Éducation */}
                      <div className="border border-slds-border rounded overflow-hidden">
                        <button type="button" onClick={() => setActiveSection(activeSection === 'job' ? null : 'job')}
                          className="w-full flex items-center justify-between p-3 bg-slds-bg hover:bg-white transition-colors">
                          <span className="text-[11px] font-bold text-slds-text-primary uppercase">3. Emploi &amp; Éducation des Adultes</span>
                          <ChevronRight size={16} className={`transition-transform ${activeSection === 'job' ? 'rotate-90' : ''}`} />
                        </button>
                        {activeSection === 'job' && (
                          <div className="p-4 bg-white space-y-4 border-t border-slds-border animate-in slide-in-from-top-1">
                            <p className="text-[10px] font-black text-sky-700 uppercase tracking-widest border-b border-sky-100 pb-1">Atouts</p>
                            {renderNAARSCheckbox("Client possède des actifs liés à l'emploi ou à l'éducation des adultes", "employmentAssetInd")}
                            <div className={`pl-4 grid grid-cols-1 gap-1 transition-opacity ${!naarsData.employmentAssetInd ? 'opacity-40' : ''}`}>
                              {renderNAARSCheckbox("Actuellement employé au Canada", "employmentAssetEmployedInd", false, !naarsData.employmentAssetInd)}
                              {renderNAARSCheckbox("Diplôme étranger reconnu au Canada", "employmentAssetForeignCredentialInd", false, !naarsData.employmentAssetInd)}
                              {renderNAARSCheckbox("Connaissance du marché du travail canadien", "employmentAssetLabourMarketInd", false, !naarsData.employmentAssetInd)}
                              {renderNAARSCheckbox("Diplôme/certificat d'études postsecondaires obtenu au Canada", "employmentAssetDegreeInCanadaInd", false, !naarsData.employmentAssetInd)}
                              {renderNAARSCheckbox("Diplôme/certificat d'études postsecondaires obtenu à l'étranger", "employmentAssetDegreeOutsideCanadaInd", false, !naarsData.employmentAssetInd)}
                              {renderNAARSCheckbox("Expérience professionnelle antérieure au Canada", "employmentAssetPreviousEmploymentInd", false, !naarsData.employmentAssetInd)}
                              {renderNAARSCheckbox("Formation liée à l'emploi suivie ou terminée", "employmentAssetJobRelatedTrainingInd", false, !naarsData.employmentAssetInd)}
                              {renderNAARSCheckbox("Expérience de travail en dehors du Canada", "employmentAssetWorkExperienceOutsideCanadaInd", false, !naarsData.employmentAssetInd)}
                              {renderNAARSCheckbox("Autres compétences ou expériences spécialisées/liées au travail", "employmentAssetOtherSkillsInd", false, !naarsData.employmentAssetInd)}
                            </div>
                            <p className="text-[10px] font-black text-sky-700 uppercase tracking-widest border-b border-sky-100 pb-1 pt-2">Besoins</p>
                            {renderNAARSCheckbox("Client a des besoins liés à l'emploi ou à l'éducation des adultes", "employmentNeedsInd")}
                            <div className={`pl-4 space-y-3 transition-opacity ${!naarsData.employmentNeedsInd ? 'opacity-40' : ''}`}>
                              {[
                                { label: "Connaissance du marché du travail canadien", id: 'employmentLabourMarketNeedInd', ref: 'employmentLabourMarketReferralInd', funded: 'employmentLabourMarketFundedReferralId' },
                                { label: "Trouver un emploi au Canada", id: 'employmentFindingEmploymentNeedInd', ref: 'employmentFindingEmploymentReferralInd', funded: 'employmentFindingEmploymentFundedReferralId' },
                                { label: "Qualifications / Reconnaissance des diplômes", id: 'employmentCredentialsNeedInd', ref: 'employmentCredentialsReferralInd', funded: 'employmentCredentialsFundedReferralId' },
                                { label: "Éducation des adultes", id: 'employmentEducationNeedInd', ref: 'employmentEducationReferralInd', funded: 'employmentEducationFundedReferralId' },
                              ].map(n => {
                                const parentDisabled = !naarsData.employmentNeedsInd;
                                const isIdentified = !!(naarsData as any)[n.id] && !parentDisabled;
                                return (
                                  <div key={n.id} className="p-2 bg-slate-50 rounded border border-slate-100 space-y-1">
                                    <p className="text-[10px] font-bold text-slate-600">{n.label}</p>
                                    <div className="pl-3 space-y-1">
                                      {renderNAARSCheckbox("Besoin identifié", n.id as any, true, parentDisabled)}
                                      {renderNAARSCheckbox("Aiguillé", n.ref as any, true, !isIdentified)}
                                      {renderNAARSText("Aiguillage vers services financés (ID)", n.funded as any, !isIdentified)}
                                    </div>
                                  </div>
                                );
                              })}
                            </div>
                          </div>
                        )}
                      </div>

                      {/* Accordéon 4 : Format & Services de Soutien */}
                      <div className="border border-slds-border rounded overflow-hidden">
                        <button type="button" onClick={() => setActiveSection(activeSection === 'format' ? null : 'format')}
                          className="w-full flex items-center justify-between p-3 bg-slds-bg hover:bg-white transition-colors">
                          <span className="text-[11px] font-bold text-slds-text-primary uppercase">4. Format &amp; Services de Soutien</span>
                          <ChevronRight size={16} className={`transition-transform ${activeSection === 'format' ? 'rotate-90' : ''}`} />
                        </button>
                        {activeSection === 'format' && (
                          <div className="p-4 bg-white space-y-4 border-t border-slds-border animate-in slide-in-from-top-1">
                            <div className="space-y-2">
                              <label className="text-[10px] font-bold text-slds-text-secondary uppercase">Format de l'évaluation</label>
                              <div className="flex items-center gap-2 mt-1">
                                <span className="inline-flex items-center px-2 py-0.5 rounded text-[10px] font-bold bg-emerald-50 text-emerald-700 border border-emerald-200">
                                  ✓ À distance — dirigé par le personnel (fixe)
                                </span>
                                <span className="text-[9px] text-slate-400 italic">Valeur obligatoire pour les services Arrivio.</span>
                              </div>
                            </div>

                            {/* Services de soutien — Reçus vs Requis */}
                            <div className="space-y-2 pt-2">
                              <label className="text-[10px] font-bold text-slds-text-secondary uppercase">Services de soutien</label>
                              <div className="overflow-x-auto">
                                <table className="w-full text-[10px] border-collapse">
                                  <thead>
                                    <tr className="bg-slate-100">
                                      <th className="text-left p-2 font-bold text-slate-600 border border-slate-200">Service</th>
                                      <th className="text-center p-2 font-bold text-emerald-700 border border-slate-200">Reçu</th>
                                      <th className="text-center p-2 font-bold text-amber-700 border border-slate-200">Requis</th>
                                    </tr>
                                  </thead>
                                  <tbody>
                                    {[
                                      { label: "Services de soutien (général)", recInd: 'supportReceivedInd', reqInd: 'supportRequiredInd' },
                                      { label: "Garde d'enfants", recInd: 'childmindingReceivedInd', reqInd: 'childmindingRequiredInd' },
                                      { label: "Équipement numérique", recInd: 'digitalEquipmentReceivedInd', reqInd: 'digitalEquipmentRequiredInd' },
                                      { label: "Compétences numériques", recInd: 'digitalSkillReceivedInd', reqInd: 'digitalSkillRequiredInd' },
                                      { label: "Interprétation orale", recInd: 'interpretationReceivedInd', reqInd: 'interpretationRequiredInd' },
                                      { label: "Dispositions pour handicap", recInd: 'disabilitySupportReceivedInd', reqInd: 'disabilitySupportRequiredInd' },
                                      { label: "Conseils à court terme", recInd: 'counsellingReceivedInd', reqInd: null },
                                      { label: "Transport", recInd: 'transportationReceivedInd', reqInd: 'transportationRequiredInd' },
                                      { label: "Traduction écrite", recInd: 'translationReceivedInd', reqInd: 'translationRequiredInd' },
                                    ].map(s => (
                                      <tr key={s.recInd} className="hover:bg-slate-50">
                                        <td className="p-2 border border-slate-200 text-slate-700">{s.label}</td>
                                        <td className="p-2 border border-slate-200 text-center">
                                          <input type="checkbox" checked={!!naarsData[s.recInd as keyof Session]} onChange={() => toggleNAARSField(s.recInd as keyof Session)} className="rounded border-slds-border text-emerald-600 focus:ring-emerald-500" />
                                        </td>
                                        <td className="p-2 border border-slate-200 text-center">
                                          {s.reqInd ? <input type="checkbox" checked={!!naarsData[s.reqInd as keyof Session]} onChange={() => toggleNAARSField(s.reqInd as keyof Session)} className="rounded border-slds-border text-amber-600 focus:ring-amber-500" /> : <span className="text-slate-300">—</span>}
                                        </td>
                                      </tr>
                                    ))}
                                  </tbody>
                                </table>
                              </div>
                            </div>
                          </div>
                        )}
                      </div>

                      {/* Accordéon 5 : Plan & Aiguillages */}
                      <div className="border border-slds-border rounded overflow-hidden">
                        <button type="button" onClick={() => setActiveSection(activeSection === 'plan' ? null : 'plan')}
                          className="w-full flex items-center justify-between p-3 bg-slds-bg hover:bg-white transition-colors">
                          <span className="text-[11px] font-bold text-slds-text-primary uppercase">5. Plan d'Établissement &amp; Aiguillages</span>
                          <ChevronRight size={16} className={`transition-transform ${activeSection === 'plan' ? 'rotate-90' : ''}`} />
                        </button>
                        {activeSection === 'plan' && (
                          <div className="p-4 bg-white space-y-3 border-t border-slds-border animate-in slide-in-from-top-1">
                            {renderNAARSCheckbox("Le plan d'établissement a été créé et partagé avec le client", "settlementPlanCreatedInd")}
                            <div className="space-y-1">
                              <label className="text-[10px] font-bold text-slds-text-secondary uppercase">Le client a-t-il été aiguillé vers un fournisseur de services francophone ?</label>
                              <select value={(naarsData as any).francophoneReferredId || ''} onChange={(e) => setNAARSValue('francophoneReferredId' as any, e.target.value)} className="slds-input text-xs">
                                <option value="">Sélectionner...</option>
                                <option>Oui</option>
                                <option>Non — les services en français ne sont pas disponibles</option>
                                <option>Non — le client n'a pas demandé d'aiguillage</option>
                              </select>
                            </div>
                            <div className="space-y-1">
                              <label className="text-[10px] font-bold text-slds-text-secondary uppercase">Le client a-t-il été aiguillé vers la Gestion des cas ?</label>
                              <select value={(naarsData as any).caseManagementReferredId || ''} onChange={(e) => setNAARSValue('caseManagementReferredId' as any, e.target.value)} className="slds-input text-xs">
                                <option value="">Sélectionner...</option>
                                <option>Oui</option>
                                <option>Non — le client n'avait pas besoin d'être aiguillé vers la gestion des cas</option>
                                <option>Non — le service de gestion des cas n'était pas disponible</option>
                              </select>
                            </div>
                          </div>
                        )}
                      </div>

                    </div>
                  )}
                </div>
              )}
              </div>
            )}

            {/* --- MODULE EMPLOI (SLE) --- */}
            {(!isGroup && (sessionType === SessionType.EMPLOYMENT || sessionType === SessionType.RTCE || showEmployment) && attendance === AttendanceStatus.PRESENT) && (
                <div className="space-y-4 pt-4 border-t border-slds-border">
                  <div className="flex items-center justify-between">
                    <div className="flex items-center gap-2">
                      <Briefcase size={18} className="text-indigo-600" />
                      <h3 className="text-sm font-bold text-slate-800">Module Emploi (SLE)</h3>
                    </div>
                    <label className="relative inline-flex items-center cursor-pointer">
                      <input type="checkbox" checked={showEmployment} onChange={(e) => setShowEmployment(e.target.checked)} className="sr-only peer" />
                      <div className="w-9 h-5 bg-slate-200 peer-focus:outline-none rounded-full peer peer-checked:after:translate-x-full peer-checked:after:border-white after:content-[''] after:absolute after:top-[2px] after:left-[2px] after:bg-white after:border-gray-300 after:border after:rounded-full after:h-4 after:w-4 after:transition-all peer-checked:bg-indigo-600"></div>
                      <span className="ml-2 text-[10px] font-bold text-slate-500 uppercase">{showEmployment ? 'Activé' : 'Désactivé'}</span>
                    </label>
                  </div>

                  {showEmployment && (
                    <div className="space-y-3 animate-in fade-in slide-in-from-top-2 duration-300">
                      
                      <div className="space-y-1">
                        {irccDisplayCountry && (
                          <div className="flex items-center gap-2 px-3 py-2 bg-indigo-50 border border-indigo-200 rounded-lg text-[10px] text-indigo-700 font-bold mb-2 shadow-sm">
                            <div className="p-1 bg-indigo-500 text-white rounded">
                              <Globe size={10} />
                            </div>
                            <span className="font-black text-indigo-400 uppercase tracking-widest mr-1">Pays IRCC :</span>
                            <span>{irccDisplayCountry}</span>
                          </div>
                        )}
                        <div className="mb-4">
                          <label className="text-[10px] font-bold text-slds-text-secondary uppercase">Langue officielle de préférence du client {attendance === AttendanceStatus.PRESENT && <span className="text-slds-error ml-1">*</span>}</label>
                          <select
                            value={(naarsData as any).languageOfService || ''}
                            onChange={(e) => setNAARSValue('languageOfService' as any, e.target.value)}
                            className="slds-input text-xs"
                          >
                            <option value="">Sélectionner...</option>
                            <option>Français</option>
                            <option>Anglais</option>
                            <option>Les deux (Anglais et/ou Français)</option>
                            <option>Aucune (Anglais ou Français)</option>
                          </select>
                        </div>
                        <label className="text-[10px] font-bold text-slds-text-secondary uppercase">
                          Emplacement du client : Pays {attendance === AttendanceStatus.PRESENT && <span className="text-slds-error ml-1">*</span>}
                        </label>
                        <select 
                          name="clientLocationCountry" 
                          value={clientLocationCountry}
                          onChange={(e) => setClientLocationCountry(e.target.value)}
                          disabled={!!irccDisplayCountry}
                          className={`slds-input text-slds-brand font-bold ${irccDisplayCountry ? 'bg-slate-100 cursor-not-allowed opacity-75' : ''}`}
                        >
                          <option value="">Sélectionner un pays...</option>
                          {IRCC_COUNTRIES.map(country => (
                            <option key={country} value={country}>{country}</option>
                          ))}
                        </select>
                        {irccDisplayCountry ? (
                          <p className="text-[8px] text-indigo-600 font-bold italic mt-1 flex items-center gap-1">
                            <CheckCircle2 size={8} /> Valeur IRCC auto-détectée — non modifiable.
                          </p>
                        ) : (
                          <p className="text-[9px] text-slds-text-secondary italic">
                            Ce champ est utilisé pour la Colonne 13 du rapport IRCC (SLE).
                          </p>
                        )}
                      </div>

                      {/* Accordéon 1 : Statut & Profession */}
                      <div className="border border-slds-border rounded overflow-hidden">
                        <button type="button" onClick={() => setActiveSection(activeSection === 'emp-status' ? null : 'emp-status')}
                          className="w-full flex items-center justify-between p-3 bg-slds-bg hover:bg-white transition-colors text-left">
                          <span className="text-[11px] font-bold text-slds-text-primary uppercase">1. Statut Professionnel &amp; Profession</span>
                          <ChevronRight size={16} className={`transition-transform ${activeSection === 'emp-status' ? 'rotate-90' : ''}`} />
                        </button>
                        {activeSection === 'emp-status' && (
                          <div className="p-4 bg-white space-y-3 border-t border-slds-border animate-in slide-in-from-top-1">
                            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                              <div className="space-y-1">
                                <label className="text-[10px] font-bold text-slds-text-secondary uppercase">Statut professionnel (Canada)</label>
                                <select 
                                  value="" 
                                  disabled 
                                  className="slds-input text-xs bg-slate-50 opacity-60 cursor-not-allowed"
                                >
                                  <option value="">(Non applicable / Non modifiable)</option>
                                  {EMPLOYMENT_STATUS_CANADA.map(o => <option key={o} value={o}>{o}</option>)}
                                </select>
                              </div>
                              <div className="space-y-1">
                                <label className="text-[10px] font-bold text-slds-text-secondary uppercase">Statut professionnel (Hors Canada) {attendance === AttendanceStatus.PRESENT && <span className="text-red-500 ml-1">*</span>}</label>
                                <select 
                                  value={(naarsData as any).employmentStatusOutside || ''} 
                                  onChange={(e) => setNAARSValue('employmentStatusOutside' as any, e.target.value)} 
                                  required={attendance === AttendanceStatus.PRESENT}
                                  className="slds-input text-xs"
                                >
                                  <option value="">Sélectionner...</option>
                                  {EMPLOYMENT_STATUS_OUTSIDE.map(o => <option key={o} value={o}>{o}</option>)}
                                </select>
                              </div>
                            </div>
                            <div className="space-y-1">
                              {selectedClient?.intendedProfessionGroupCanada && (
                                <div className="flex items-center gap-2 px-3 py-1.5 bg-indigo-50 border border-indigo-200 rounded text-[10px] text-indigo-500 font-semibold mb-2">
                                  <span className="font-black text-indigo-400 uppercase tracking-widest">Profession visée (CA) :</span>
                                  <span className="text-indigo-700 font-bold">{selectedClient.intendedProfessionGroupCanada}</span>
                                </div>
                              )}
                              <label className="text-[10px] font-bold text-slds-text-secondary uppercase">Profession prévue (CNP) {attendance === AttendanceStatus.PRESENT && <span className="text-red-500 ml-1">*</span>}</label>
                              <div className="relative">
                                <Search size={14} className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400" />
                                <input 
                                  list="cnp-list"
                                  value={(naarsData as any).intendedOccupationCnp || ''} 
                                  onChange={(e) => setNAARSValue('intendedOccupationCnp' as any, e.target.value)}
                                  placeholder="Rechercher par code ou nom de métier..."
                                  required={attendance === AttendanceStatus.PRESENT}
                                  className="slds-input text-xs pl-10"
                                />
                                <datalist id="cnp-list">
                                  {CNP_CODES.map(c => <option key={c} value={c} />)}
                                </datalist>
                              </div>
                            </div>
                          </div>
                        )}
                      </div>

                      {/* Accordéon 2 : Ciblage Sectoriel */}
                      <div className="border border-slds-border rounded overflow-hidden">
                        <button type="button" onClick={() => setActiveSection(activeSection === 'emp-target' ? null : 'emp-target')}
                          className="w-full flex items-center justify-between p-3 bg-slds-bg hover:bg-white transition-colors text-left">
                          <span className="text-[11px] font-bold text-slds-text-primary uppercase">2. Population cible ou Secteur spécifique</span>
                          <ChevronRight size={16} className={`transition-transform ${activeSection === 'emp-target' ? 'rotate-90' : ''}`} />
                        </button>
                        {activeSection === 'emp-target' && (
                          <div className="p-4 bg-white space-y-3 border-t border-slds-border animate-in slide-in-from-top-1">
                            {renderNAARSCheckbox("L'activité est destinée à une population cible ou secteur spécifique", "employmentTargetInd")}
                            {(naarsData as any).employmentTargetInd && (
                              <div className="pl-7 grid grid-cols-1 md:grid-cols-2 gap-4 animate-in fade-in">
                                <div className="space-y-1">
                                  <label className="text-[10px] font-bold text-slds-text-secondary uppercase">Type de population ciblée</label>
                                  <select value={(naarsData as any).employmentTargetType || ''} onChange={(e) => setNAARSValue('employmentTargetType' as any, e.target.value)} className="slds-input text-xs">
                                    <option value="">Sélectionner...</option>
                                    {EMPLOYMENT_TARGET_TYPES.map(o => <option key={o} value={o}>{o}</option>)}
                                  </select>
                                </div>
                                <div className="space-y-1">
                                  <label className="text-[10px] font-bold text-slds-text-secondary uppercase">
                                    Secteur spécifique
                                    {(naarsData as any).employmentTargetType === "Sectoriel" && <span className="text-red-500 ml-1">*</span>}
                                  </label>
                                  <select 
                                    value={(naarsData as any).employmentSectorSpecific || ''} 
                                    onChange={(e) => setNAARSValue('employmentSectorSpecific' as any, e.target.value)} 
                                    className="slds-input text-xs disabled:opacity-40 disabled:bg-slate-50 disabled:cursor-not-allowed"
                                    disabled={(naarsData as any).employmentTargetType !== "Sectoriel"}
                                    required={(naarsData as any).employmentTargetType === "Sectoriel"}
                                  >
                                    <option value="">Sélectionner...</option>
                                    {EMPLOYMENT_SECTORS.map(o => <option key={o} value={o}>{o}</option>)}
                                  </select>
                                </div>
                              </div>
                            )}
                          </div>
                        )}
                      </div>

                      {/* Accordéon 3 : Activités/Sujets fournis */}
                      <div className="border border-slds-border rounded overflow-hidden">
                        <button type="button" onClick={() => setActiveSection(activeSection === 'emp-topics' ? null : 'emp-topics')}
                          className="w-full flex items-center justify-between p-3 bg-slds-bg hover:bg-white transition-colors text-left">
                          <span className="text-[11px] font-bold text-slds-text-primary uppercase">3. Activités et Sujets fournis</span>
                          <ChevronRight size={16} className={`transition-transform ${activeSection === 'emp-topics' ? 'rotate-90' : ''}`} />
                        </button>
                        {activeSection === 'emp-topics' && (
                          <div className="p-2 bg-white border-t border-slds-border">
                            {EMPLOYMENT_TOPICS.map(t => renderNAARSCheckbox(t.label, t.field as keyof Session))}
                          </div>
                        )}
                      </div>

                      {/* Accordéon 4 : Aiguillages Emploi */}
                      <div className="border border-slds-border rounded overflow-hidden">
                        <button type="button" onClick={() => setActiveSection(activeSection === 'emp-referrals' ? null : 'emp-referrals')}
                          className="w-full flex items-center justify-between p-3 bg-slds-bg hover:bg-white transition-colors text-left">
                          <span className="text-[11px] font-bold text-slds-text-primary uppercase">4. Aiguillages fournis</span>
                          <ChevronRight size={16} className={`transition-transform ${activeSection === 'emp-referrals' ? 'rotate-90' : ''}`} />
                        </button>
                        {activeSection === 'emp-referrals' && (
                          <div className="p-4 bg-white space-y-3 border-t border-slds-border animate-in slide-in-from-top-1">
                            {renderNAARSCheckbox("Des services d'aiguillages ont été fournis", "employmentReferralProvidedInd")}
                            {(naarsData as any).employmentReferralProvidedInd && (
                              <div className="pl-7 space-y-1 animate-in fade-in border-l-2 border-indigo-100">
                                <p className="text-[10px] font-bold text-indigo-600 uppercase mb-2">Types de références fournies :</p>
                                <div className="grid grid-cols-1 gap-1">
                                  {EMPLOYMENT_REFERRALS.map(r => renderNAARSCheckbox(r.label, r.field as keyof Session))}
                                </div>
                              </div>
                            )}
                          </div>
                        )}
                      </div>

                      {/* Accordéon 5 : Format & Services de Soutien (Emploi) */}
                      <div className="border border-slds-border rounded overflow-hidden">
                        <button type="button" onClick={() => setActiveSection(activeSection === 'emp-format' ? null : 'emp-format')}
                          className="w-full flex items-center justify-between p-3 bg-slds-bg hover:bg-white transition-colors text-left">
                          <span className="text-[11px] font-bold text-slds-text-primary uppercase">5. Format &amp; Services de Soutien</span>
                          <ChevronRight size={16} className={`transition-transform ${activeSection === 'emp-format' ? 'rotate-90' : ''}`} />
                        </button>
                        {activeSection === 'emp-format' && (
                          <div className="p-4 bg-white space-y-4 border-t border-slds-border animate-in slide-in-from-top-1">
                            <div className="space-y-2">
                               <label className="text-[10px] font-bold text-slds-text-secondary uppercase">Format de l'activité</label>
                               <div className="flex items-center gap-2 mt-1">
                                 <span className="inline-flex items-center px-2 py-0.5 rounded text-[10px] font-bold bg-emerald-50 text-emerald-700 border border-emerald-200">
                                   ✓ À distance — dirigé par le personnel (fixe)
                                 </span>
                                 <span className="text-[9px] text-slate-400 italic">Valeur obligatoire pour les services Arrivio.</span>
                               </div>
                            </div>
                            <div className="space-y-2">
                              <label className="text-[10px] font-bold text-slds-text-secondary uppercase">Services de soutien</label>
                              <div className="grid grid-cols-1 gap-1">
                                {renderNAARSCheckbox("Garde d'enfants", "childmindingReceivedInd")}
                                {renderNAARSCheckbox("Équipement de soutien numérique", "digitalEquipmentReceivedInd")}
                                {renderNAARSCheckbox("Interprétation orale", "interpretationReceivedInd")}
                                {renderNAARSCheckbox("Transport", "transportationReceivedInd")}
                              </div>
                            </div>
                          </div>
                        )}
                      </div>

                    </div>
                  )}
                </div>
            )}

            {/* Notes Générales */}
            <div className="space-y-1">
              <label className="text-[10px] font-bold text-slds-text-secondary uppercase flex items-center gap-1">
                <MessageSquare size={12} className="text-slate-400" /> Notes Internes
              </label>
              <textarea 
                name="notes" 
                defaultValue={session?.notes}
                onChange={(e) => setFormNotes(e.target.value)}
                placeholder="Commentaires additionnels..."
                className="slds-input h-20 resize-none text-xs"
              />
            </div>
          </div>

          {/* Footer */}
          <div className="p-4 bg-slds-bg border-t border-slds-border flex justify-end gap-3 shrink-0">
            <button type="button" onClick={onClose} className="slds-button slds-button-neutral">Annuler</button>
            <button 
              type="submit" 
              disabled={(!isGroup && !selectedClient) || !!validationError}
              className="slds-button slds-button-brand disabled:opacity-50 disabled:cursor-not-allowed"
            >
              {isEditing ? 'Enregistrer les modifications' : 'Confirmer'}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
};

export default SessionModal;
