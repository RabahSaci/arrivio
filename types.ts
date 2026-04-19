
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
  ACKNOWLEDGED = 'RECU_PAR_PARTENAIRE',
  CONTACTED = 'CONTACTE',
  IN_PROGRESS = 'EN_ACCOMPAGNEMENT',
  CLOSED = 'FERME'
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
  COMMUNITY_CONNECTION = 'CONNEXIONS_COMMUNAUTAIRES'
}

export enum SessionCategory {
  INDIVIDUAL = 'INDIVIDUELLE',
  GROUP = 'GROUPE'
}

export enum AttendanceStatus {
  PRESENT = 'PRESENT',
  ABSENT = 'ABSENT',
  CANCELLED = 'ANNULE_PAR_CLIENT',
  TECH_ISSUE = 'PROBLEME_TECHNIQUE',
  NON_ELIGIBLE = 'NON_ELIGIBLE',
  DECALEE = 'DECALEE'
}

export enum FacilitatorType {
  CONSULTANT = 'CONSULTANT',
  ORGANIZATION = 'ORGANISME'
}

export enum PartnerType {
  INTERNAL = 'INTERNE',
  EXTERNAL = 'COLLABORATION_EXTERNE',
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

export interface Contract {
  id: string;
  consultantName: string;
  totalSessions: number;
  usedSessions: number;
  startDate: string;
  endDate: string;
  status: 'ACTIVE' | 'EXPIRED' | 'COMPLETED';
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
  registrationDate?: string;
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
  referralDate?: string;
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
