
import * as XLSX from 'xlsx';
import { Session, Client } from '../types';

// ============================================================
// EMPLOYMENT EXPORT SERVICE — Conforme gabarit IRCC VER 1329
// Services liés à l'emploi (SLE) - Counselling individuel
// ============================================================

const OUI = 'Oui';
const NON = 'Non';

function bool(val: any): string {
  return val ? OUI : NON;
}

function durationLabel(minutes: number): string {
  const h = minutes / 60;
  return h.toFixed(1).replace('.', ',');
}

function formatDate(dateStr?: string | null): string {
  if (!dateStr) return '';
  if (/^\d{4}-\d{2}-\d{2}$/.test(dateStr)) return dateStr;
  return '';
}

function sessionToRow(session: Session, clients: Client[]): string[] {
  const client = clients.find(c => session.participantIds?.includes(c.id));
  const s = session as any;

  const iucCrp = client?.iucCrpNumber || "";
  const idType = iucCrp.startsWith('1') 
    ? "N° d'identité SSOBL ou SMGC du client" 
    : iucCrp.toUpperCase().startsWith('T')
    ? "N° de formulaire IMM5292, IMM5509 ou IMM1000"
    : "#IUC";

  return [
    '', // Col 0: Détails sur le traitement
    '', // Col 1: ID du dossier à mettre à jour
    idType, // Col 2: Type Identificateur unique
    iucCrp, // Col 3: Valeur de l'identificateur unique
    formatDate((client as any)?.birthDate), // Col 4
    client?.email || '', // Col 5
    s.languageOfService || 'Français', // Col 6: Langue officielle de préférence
    session.programmingType || 'Service standard', // Col 7
    formatDate(session.date), // Col 8
    durationLabel(session.duration || 60), // Col 9
    'L5B3C4', // Col 10: Code postal organisation
    '', // Col 11: Pays organisation (vide selon demande utilisateur)
    (client as any)?.postalCode || '', // Col 12: Code postal client
    session.clientLocationCountry || '', // Col 13
    session.languageUsed || 'Français', // Col 14
    
    // SLE Specifiques
    s.employmentStatusCanada || '', // Col 15: Statut pro (Canada)
    s.employmentStatusOutside || '', // Col 16: Statut pro (Extérieur)
    s.intendedOccupationCnp || '', // Col 17: Profession prévue
    bool(s.employmentTargetInd), // Col 18: Activité destinée à population cible
    s.employmentTargetInd ? (s.employmentTargetType || '') : '', // Col 19
    s.employmentTargetInd ? (s.employmentSectorSpecific || '') : '', // Col 20
    
    // Activités fournies
    bool(s.employmentTopicCareerPlanningInd), // Col 21
    bool(s.employmentTopicLabourMarketInd), // Col 22
    bool(s.employmentTopicRegulatedProfessionInd), // Col 23
    bool(s.employmentTopicEntrepreneurshipInd), // Col 24
    bool(s.employmentTopicUnregulatedProfessionInd), // Col 25
    bool(s.employmentTopicSkillsInd), // Col 26
    bool(s.employmentTopicWorkplaceOrientationInd), // Col 27
    
    // Formats (shared with SEBAA names for consistency)
    bool(s.formatInPersonInd), // Col 28
    bool(s.formatRemoteStaffInd), // Col 29
    bool(s.formatRemoteSelfInd), // Col 30
    bool(s.formatRemoteEmailTextPhoneInd), // Col 31
    
    // Aiguillages
    bool(s.employmentReferralProvidedInd), // Col 32
    bool(s.employmentRefEducationTrainingInd), // Col 33
    bool(s.employmentRefCredentialEvaluationInd), // Col 34
    bool(s.employmentRefEmployerInd), // Col 35
    bool(s.employmentRefLanguageTrainingInd), // Col 36
    bool(s.employmentRefLanguageAssessmentInd), // Col 37
    bool(s.employmentRefOtherFederalInd), // Col 38
    bool(s.employmentRefProfessionalBodyInd), // Col 39
    bool(s.employmentRefProvincialServicesInd), // Col 40

    // Groupes cibles (Shared with NAARS names)
    bool(s.targetGroupInd), // Col 41
    bool(s.targetGroupChildrenInd), // Col 42
    bool(s.targetGroupInternationalTrainingInd), // Col 43
    bool(s.targetGroupFamilyParentCaregiverInd), // Col 44
    bool(s.targetGroupOfficialLanguageMinoritiesInd), // Col 45
    bool(s.targetGroupDisabilitiesInd), // Col 46
    bool(s.targetGroupRacializedNewcomerInd), // Col 47
    bool(s.targetGroupRefugeesInd), // Col 48
    bool(s.targetGroupSeniorsInd), // Col 49
    bool(s.targetGroupWomenInd), // Col 50
    bool(s.targetGroupYouthInd), // Col 51
    bool(s.targetGroupLGBTQInd), // Col 52

    // Soutiens (Shared)
    bool(s.supportReceivedInd), // Col 53
    bool(s.childmindingReceivedInd), // Col 54
    bool(s.digitalEquipmentReceivedInd), // Col 55
    bool(s.digitalSkillReceivedInd), // Col 56
    bool(s.interpretationReceivedInd), // Col 57
    bool(s.disabilitySupportReceivedInd), // Col 58
    bool(s.counsellingReceivedInd), // Col 59
    bool(s.transportationReceivedInd), // Col 60
    bool(s.translationReceivedInd)  // Col 61
  ];
}

export async function exportEmployment(sessions: Session[], clients: Client[]) {
  const headers = [
    "Détails sur le traitement",
    "ID du dossier à mettre à jour",
    "Type Identificateur unique",
    "Valeur de l'identificateur unique",
    "Date de naissance du client (AAAA-MM-JJ)",
    "Courriel du client",
    "Langue officielle de préférence",
    "Type de programmation/d'initiative",
    "Date de début de l'activité (AAAA-MM-JJ)",
    "Durée de l'activité (heures)",
    "Emplacement de l'organisation: Code postal (A#A#A#)",
    "Emplacement de l’organisation: Pays",
    "Emplacement du client: Code postal (A#A#A#)",
    "Emplacement du client: Pays",
    "Langue du client utilisée pendant l'activité",
    "Statut professsionel du client ? (Client au Canada)",
    "Statut professsionel du client ? (Client à l'extérieur du Canada)",
    "Quelle est la profession prévue du client ?",
    "Activité d'emploi destinée à une population cible ou à un secteur spécifique",
    "Destiné à des populations ciblées ou à un secteur spécifique",
    "Secteur spécifique",
    "Activités fournies: Planification de carrière, navigation et compétences en recherche d'emploi",
    "Activités fournies: Informations sur le marché du travail",
    "Activités fournies: Préparation à une profession réglementée",
    "Activités fournies: Préparation à l'entrepreneuriat",
    "Activités fournies: Préparation à une profession non réglementée",
    "Activités fournies: Compétences pour réussir",
    "Activités fournies: Orientation en milieu de travail et/ou Santé et Sécurité",
    "Format de l'activité: En personne",
    "Format de l'activité: À distance - dirigé par le personnel",
    "Format de l'activité: À distance — auto-dirigé",
    "Format de l'activité:  À distance par courriel/message texte/téléphone",
    "Des services d'aiguillages ont-ils été fournis dans le cadre du service",
    "Référence fournie: Établissement d’enseignement et de formation",
    "Référence fournie: Organisme d’évaluation des diplômes d’études",
    "Référence fournie: Employeur",
    "Référence fournie: Formation linguistique liée à l’emploi",
    "Référence fournie: Évaluation linguistique",
    "Référence fournie: Autres services d’emploi financés par le gouvernement fédéral (p. ex., EDSC)",
    "Référence fournie: Organisme professionnel ou de réglementation",
    "Référence fournie: Services d’emploi des gouvernements provinciaux ou territoriaux",
    "Destiné à une population cible spécifique",
    "Enfants (0-14 ans)",
    "Clients formés à l'étranger dans une profession ou métier réglementé",
    "Familles/parents/soignants",
    "Minorités de langue officielle (Francophones)",
    "Personnes handicapées",
    "Nouveaux arrivants racisés",
    "Réfugiés",
    "Personnes âgées (65+)",
    "Femmes",
    "Jeunes (15-30 ans)",
    "2ELGBTQI+ (Bispirituel; Lesbienne; Gai; Bisexuel; Transgenre; Queer; Intersexuel et autres)",
    "Services de soutien reçus",
    "Garde d'enfants",
    "Équipement de soutien numérique",
    "Compétences en matière de soutien numérique",
    "Interprétation orale",
    "Dispositions en raison d’un handicap",
    "Counseils à court terme",
    "Transport",
    "Traduction écrit"
  ];

  const rows = sessions.map(s => sessionToRow(s, clients));
  
  const ws = XLSX.utils.aoa_to_sheet([headers, ...rows]);

  // Set all cells to text format to preserve leading zeros and formatting
  const range = XLSX.utils.decode_range(ws['!ref'] || 'A1');
  for (let R = range.s.r; R <= range.e.r; ++R) {
    for (let C = range.s.c; C <= range.e.c; ++C) {
      const cell_address = XLSX.utils.encode_cell({ c: C, r: R });
      if (!ws[cell_address]) continue;
      ws[cell_address].t = 's'; // simple text
    }
  }

  const wb = XLSX.utils.book_new();
  XLSX.utils.book_append_sheet(wb, ws, "iCARE Template");

  XLSX.writeFile(wb, `Export_Emploi_SLE_${new Date().toISOString().split('T')[0]}.xlsx`);
}
