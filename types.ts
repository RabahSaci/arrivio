
export enum UserRole {
  ADVISOR = 'CONSEILLER_CFGT',
  PARTNER = 'ORGANISME_PARTENAIRE',
  MENTOR = 'MENTOR',
  MANAGER = 'GESTIONNAIRE',
  ADMIN = 'ADMINISTRATEUR'
}

export enum ReferralStatus {
  PENDING = 'EN_ATTENTE',
  REFERRED = 'REFERE',
  ACKNOWLEDGED = 'PRIS_EN_CHARGE',
  CONTACTED = 'CONTACTE',
  IN_PROGRESS = 'EN_COURS',
  CLOSED = 'TERMINE'
}

export interface Referral {
  id: string;
  clientId: string;
  partnerId: string;
  status: ReferralStatus;
  referralDate: string;
  acknowledgedAt?: string;
  contactedAt?: string;
  closedAt?: string;
}

export enum SessionType {
  ESTABLISHMENT = 'ETABLISSEMENT',
  EMPLOYMENT = 'EMPLOI',
  RTCE = 'RTCE',
  MATCHING = 'JUMELAGE',
  COMMUNITY_CONNECTION = 'CONNEXIONS'
}

export enum SessionCategory {
  INDIVIDUAL = 'INDIVIDUELLE',
  GROUP = 'GROUPE'
}

export enum AttendanceStatus {
  PRESENT = 'PRESENT',
  ABSENT = 'ABSENT',
  CANCELLED = 'ANNULE',
  TECH_ISSUE = 'TECH_ISSUE',
  NON_ELIGIBLE = 'NON_ELIGIBLE',
  DECALEE = 'DECALEE'
}

export enum FacilitatorType {
  CONSULTANT = 'CONSULTANT',
  ORGANIZATION = 'ORGANISME'
}

export enum PartnerType {
  INTERNAL = 'INTERNE',
  EXTERNAL = 'EXTERNE',
  CONSULTANT = 'CONSULTANT'
}

export enum NotificationType {
  SYSTEM = 'SYSTEM',
  SUCCESS = 'SUCCESS',
  REFERRAL = 'REFERRAL',
  SESSION = 'SESSION'
}

export interface Profile {
  id: string;
  firstName: string;
  lastName: string;
  email: string;
  role: UserRole;
  partnerId?: string;
  position?: string;
  createdAt?: string;
}

export type ContractSignatureStatus = 'PAS_ENCORE_SIGNE' | 'ATTENTE_DIRECTION' | 'ATTENTE_FOURNISSEUR' | 'SIGNE';

export const CONTRACT_SIGNATURE_STATUS_LABELS: Record<ContractSignatureStatus, string> = {
  PAS_ENCORE_SIGNE: 'Pas encore signé',
  ATTENTE_DIRECTION: 'En attente de signature de la Direction',
  ATTENTE_FOURNISSEUR: 'En attente de signature du fournisseur',
  SIGNE: 'Signé'
};

export interface Contract {
  id: string;
  consultantName: string;
  totalSessions: number;
  usedSessions: number;
  startDate: string;
  endDate: string;
  status: 'ACTIVE' | 'EXPIRED' | 'COMPLETED';
  signatureStatus?: ContractSignatureStatus;
  amount: number;
  serviceType?: string;
}

export interface Session {
  id: string;
  title: string;
  type: SessionType;
  category: SessionCategory;
  date: string;
  startTime: string;
  duration: number;
  participantIds: string[];
  noShowIds: string[];
  location: string;
  notes: string;
  facilitatorName: string;
  facilitatorType: FacilitatorType;
  advisorName: string;
  advisorId?: string; // ID du créateur (pour permissions)
  contractId?: string; // Lié à un contrat spécifique
  individualStatus?: AttendanceStatus;
  discussedNeeds?: string;
  actions?: string;
  zoomLink?: string;
  zoomId?: string;
  needsInterpretation: boolean;
  invoiceReceived: boolean;
  invoiceSubmitted: boolean;
  invoicePaid: boolean;
  invoiceAmount?: number;
  subjectsCovered?: string[];
  targetClientTypes?: string[];
  activityFormat?: string;
  languageUsed?: string;
  serviceSetting?: string;
  providerLocation?: string;
  supportServices?: string;
  programmingType?: string;
  clientLocationCountry?: string;

  // --- IRCC NAARS FIELDS ---
  formalFollowUpInd?: boolean;
  lifeAssetInd?: boolean;
  lifeAssetFamilyNetworksInd?: boolean;
  lifeAssetKnowledgeServicesInd?: boolean;
  lifeAssetSettlementMotivationInd?: boolean;
  lifeAssetOtherSkillsInd?: boolean;
  lifeNeedsInd?: boolean;
  lifeNeedsBasicIdentifiedInd?: boolean;
  lifeNeedsBasicReferralInd?: boolean;
  lifeNeedsBasicFundedReferralId?: string;
  lifeNeedsFamilyChildrenIdentifiedInd?: boolean;
  lifeNeedsFamilyChildrenReferralInd?: boolean;
  lifeNeedsFamilyChildrenFundedReferralId?: string;
  lifeNeedsHealthAndMentalIdentifiedInd?: boolean;
  lifeNeedsHealthAndMentalReferralInd?: boolean;
  lifeNeedsHealthAndMentalFundedReferralId?: string;
  lifeNeedsHousingIdentifiedInd?: boolean;
  lifeNeedsHousingReferralInd?: boolean;
  lifeNeedsHousingFundedReferralId?: string;
  lifeNeedsGovernmentKnowledgeIdentifiedInd?: boolean;
  lifeNeedsGovernmentKnowledgeNoReferralInd?: boolean;
  lifeNeedsGovernmentKnowledgeFundedReferralId?: string;
  lifeNeedsCanadaKnowledgeIdentifiedInd?: boolean;
  lifeNeedsCanadaKnowledgeReferralInd?: boolean;
  lifeNeedsCanadaKnowledgeFundedReferralId?: string;
  lifeNeedsLegalIdentifiedInd?: boolean;
  lifeNeedsLegalReferralInd?: boolean;
  lifeNeedsLegalFundedReferralId?: string;
  lifeNeedsFinancialIdentifiedInd?: boolean;
  lifeNeedsFinancialReferralInd?: boolean;
  lifeNeedsFinancialFundedReferralId?: string;
  lifeNeedsCommunityKnowledgeIdentifiedInd?: boolean;
  lifeNeedsCommunityKnowledgeReferralInd?: boolean;
  lifeNeedsCommunityKnowledgeFundedReferralId?: string;
  lifeNeedsSocialNetworkingIdentifiedInd?: boolean;
  lifeNeedsSocialNetworkingReferralInd?: boolean;
  lifeNeedsSocialNetworkingFundedReferralId?: string;
  lifeNeedsRacismIdentifiedInd?: boolean;
  lifeNeedsRacismReferralInd?: boolean;
  lifeNeedsRacismFundedReferralId?: string;
  languageAssetInd?: boolean;
  languageAssetEnglishInd?: boolean;
  languageAssetFrenchInd?: boolean;
  languageAssetOtherInd?: boolean;
  languageNeedsInd?: boolean;
  languageNeedsOfficialIdentifiedNeedInd?: boolean;
  languageNeedsOfficialLanguageId?: string;
  languageNeedsOfficialReferralInd?: boolean;
  languageNeedsOfficialFundedReferralId?: string;
  languageNeedsLiteracyIdentifiedNeedInd?: boolean;
  languageNeedsLiteracyLanguageId?: string;
  languageNeedsLiteracyReferralInd?: boolean;
  languageNeedsLiteracyFundedReferralId?: string;
  languageNeedsEmploymentIdentifiedNeedInd?: boolean;
  languageNeedsEmploymentLanguageId?: string;
  languageNeedsEmploymentReferralInd?: boolean;
  languageNeedsEmploymentFundedReferralId?: string;
  employmentAssetInd?: boolean;
  employmentAssetEmployedInd?: boolean;
  employmentAssetForeignCredentialInd?: boolean;
  employmentAssetLabourMarketInd?: boolean;
  employmentAssetDegreeInCanadaInd?: boolean;
  employmentAssetDegreeOutsideCanadaInd?: boolean;
  employmentAssetPreviousEmploymentInd?: boolean;
  employmentAssetJobRelatedTrainingInd?: boolean;
  employmentAssetWorkExperienceOutsideCanadaInd?: boolean;
  employmentAssetOtherSkillsInd?: boolean;
  employmentNeedsInd?: boolean;
  employmentLabourMarketNeedInd?: boolean;
  employmentLabourMarketReferralInd?: boolean;
  employmentLabourMarketFundedReferralId?: string;
  employmentFindingEmploymentNeedInd?: boolean;
  employmentFindingEmploymentReferralInd?: boolean;
  employmentFindingEmploymentFundedReferralId?: string;
  employmentCredentialsNeedInd?: boolean;
  employmentCredentialsReferralInd?: boolean;
  employmentCredentialsFundedReferralId?: string;
  employmentEducationNeedInd?: boolean;
  employmentEducationReferralInd?: boolean;
  employmentEducationFundedReferralId?: string;
  formatInPersonInd?: boolean;
  formatRemoteStaffInd?: boolean;
  formatRemoteSelfInd?: boolean;
  formatRemoteEmailTextPhoneInd?: boolean;
  supportReceivedInd?: boolean;
  childmindingReceivedInd?: boolean;
  digitalEquipmentReceivedInd?: boolean;
  digitalSkillReceivedInd?: boolean;
  interpretationReceivedInd?: boolean;
  disabilitySupportReceivedInd?: boolean;
  counsellingReceivedInd?: boolean;
  transportationReceivedInd?: boolean;
  translationReceivedInd?: boolean;
  supportRequiredInd?: boolean;
  childmindingRequiredInd?: boolean;
  digitalEquipmentRequiredInd?: boolean;
  digitalSkillRequiredInd?: boolean;
  interpretationRequiredInd?: boolean;
  disabilitySupportRequiredInd?: boolean;
  transportationRequiredInd?: boolean;
  translationRequiredInd?: boolean;
  settlementPlanCreatedInd?: boolean;
  francophoneReferredId?: string;
  caseManagementReferredId?: string;

  // --- IRCC EMPLOYMENT FIELDS (SLE) ---
  employmentStatusCanada?: string;
  employmentStatusOutside?: string;
  intendedOccupationCnp?: string;
  employmentTargetInd?: boolean;
  employmentTargetType?: string;
  employmentSectorSpecific?: string;
  employmentTopicCareerPlanningInd?: boolean;
  employmentTopicLabourMarketInd?: boolean;
  employmentTopicRegulatedProfessionInd?: boolean;
  employmentTopicEntrepreneurshipInd?: boolean;
  employmentTopicUnregulatedProfessionInd?: boolean;
  employmentTopicSkillsInd?: boolean;
  employmentTopicWorkplaceOrientationInd?: boolean;
  employmentReferralProvidedInd?: boolean;
  employmentRefEducationTrainingInd?: boolean;
  employmentRefCredentialEvaluationInd?: boolean;
  employmentRefEmployerInd?: boolean;
  employmentRefLanguageTrainingInd?: boolean;
  employmentRefLanguageAssessmentInd?: boolean;
  employmentRefOtherFederalInd?: boolean;
  employmentRefProfessionalBodyInd?: boolean;
  employmentRefProvincialServicesInd?: boolean;
}

export interface UserActivityLog {
  id: string;
  userId: string;
  userName: string;
  actionType: 'CREATE' | 'UPDATE' | 'DELETE' | 'LOGIN' | 'SECURITY_ALERT';
  entityType: 'SESSION' | 'CLIENT' | 'MENTOR' | 'CONTRACT' | 'PROFILE' | 'PARTNER' | 'AUTHENTIFICATION';
  details: string;
  timestamp: string;
}

export interface AuditLog {
  id: string;
  action: string;
  details: string;
  timestamp: string;
  targetId: string;
}

export interface Client {
  id: string;
  clientCode?: string;
  registrationDate?: string; // Inscription chez Connexions Francophones
  inboundReferralDate?: string; // Référencement entrant (CF -> Arrivio)
  referralDate?: string; // Référencement sortant (Arrivio -> Partenaire)
  firstName: string;
  lastName: string;
  birthDate?: string;
  gender?: string;
  residenceCountry?: string;
  birthCountry?: string;
  iucCrpNumber?: string;
  email: string;
  phoneNumber?: string;
  participatedImmigrationProgram?: string;
  immigrationType?: string;
  linkedAccount?: string;
  mainApplicant?: string;
  spouseFullName?: string;
  spouseBirthDate?: string;
  spouseEmail?: string;
  spouseIucCrpNumber?: string;
  childrenCount?: number;
  childrenBirthDates?: string;
  childrenFullNames?: string;
  chosenProvince?: string;
  destinationChange?: string;
  chosenCity?: string;
  arrivalDateApprox?: string;
  arrivalDateConfirmed?: string;
  establishmentReason?: string;
  currentJob?: string;
  currentEmploymentStatus?: string;
  currentNocGroup?: string;
  currentProfessionGroup?: string;
  intendedEmploymentStatusCanada?: string;
  intendedProfessionGroupCanada?: string;
  intentionCredentialsRecognition?: string;
  intentionAccreditationBeforeArrival?: string;
  doneEca?: string;
  educationLevel?: string;
  specialization?: string;
  trainingCompletionDate?: string;
  englishLevel?: string;
  wantEnglishInfo?: string;
  frenchLevel?: string;
  wantFrenchInfo?: string;
  referralSource?: string;
  marketingConsent?: string;
  isApproved?: string;
  isProfileCompleted?: string;
  
  // Legacy/Internal fields
  originCountry: string;
  profession: string;
  destinationCity: string;
  arrivalDate: string;
  needs: string[];
  status: ReferralStatus;
  consentShared: boolean;
  consentExternalReferral?: boolean;
  isUnsubscribed?: boolean;
  assignedPartnerId?: string;
  secondaryPartnerIds?: string[];
  referredById?: string;
  assignedMentorId?: string;
  acknowledgedAt?: string;
  contactedAt?: string;
  closedAt?: string;
  notes: Note[];
  noShowRatio?: number;
  referrals?: Referral[];
}

export interface Partner {
  id: string;
  name: string;
  city: string;
  province: string;
  specialties: string[];
  type: PartnerType;
}

export interface Consultant {
  id: string;
  name: string;
  specialty: string;
}

export interface Mentor {
  id: string;
  firstName: string;
  lastName: string;
  profession: string;
  city: string;
  domain: string;
  originCountry: string;
  organizationId: string;
}

export interface Note {
  id: string;
  authorName: string;
  content: string;
  timestamp: string;
}

export interface Notification {
  id: string;
  type: NotificationType;
  title: string;
  message: string;
  timestamp: string;
  isRead: boolean;
  targetId?: string;
}

export interface Message {
  id: string;
  senderId: string;
  receiverId: string;
  content: string;
  timestamp: string;
  isRead: boolean;
}

export interface Conversation {
  otherParticipant: Profile;
  lastMessage?: Message;
  unreadCount: number;
}

export enum TaskStatus {
  PENDING = 'A_FAIRE',
  COMPLETED = 'TERMINEE',
  DEFERRED = 'REPORTEE'
}

export enum TaskPriority {
  LOW = 'BASSE',
  MEDIUM = 'MOYENNE',
  HIGH = 'HAUTE',
  CRITICAL = 'CRITIQUE'
}

export type TaskType = 'UPLOAD_PARTICIPANTS' | 'REFER_CLIENT' | 'RENEW_CONTRACT' | 'MANUAL' | 'FILL_SESSION_FOLLOWUP';

export interface WorkflowTask {
  id: string;
  type: TaskType;
  title: string;
  description?: string;
  status: TaskStatus;
  priority: TaskPriority;
  assignedToId: string;
  assignedToName: string;
  relatedEntityId?: string;
  relatedEntityType?: 'SESSION' | 'CLIENT' | 'CONTRACT';
  dueDate: string;
  createdAt: string;
  completedAt?: string;
  comment?: string;
  processedSignature?: string; // Signature unique pour éviter les doublons auto
}
