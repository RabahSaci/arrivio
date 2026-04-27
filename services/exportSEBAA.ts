import * as XLSX from 'xlsx';
import { Session, Client } from '../types';

// ============================================================
// SÉBAA EXPORT SERVICE — Conforme gabarit IRCC VER 1335
// Toutes les colonnes en FORMAT TEXTE (s: '...'), dans l'ordre exact du fichier Excel
// Dates: AAAA-MM-JJ | Durée: chiffre décimal (ex: "1,0") | Booléens: "Oui" / "Non"
// ============================================================

const OUI = 'Oui';
const NON = 'Non';

function bool(val: any): string {
  return val ? OUI : NON;
}

function durationLabel(minutes: number): string {
  const h = minutes / 60;
  // Format as comma-decimal like the Excel: "0,5", "1,0", "1,5" etc.
  return h.toFixed(1).replace('.', ',');
}

// Returns YYYY-MM-DD or empty string
function formatDate(dateStr?: string | null): string {
  if (!dateStr) return '';
  // Already YYYY-MM-DD
  if (/^\d{4}-\d{2}-\d{2}$/.test(dateStr)) return dateStr;
  return '';
}

// Map a session + its client to a row in the exact Excel column order
function sessionToRow(session: Session, clients: Client[]): string[] {
  const client = clients.find(c => session.participantIds?.includes(c.id));
  const s = session as any; // cast to access dynamic NAARS fields

  // Compute client postal code from client profile if available
  const clientPostalCd = (client as any)?.postalCode || '';

  // Compute unique identifier type based on existing pattern in Reports.tsx
  const iucCrp = client?.iucCrpNumber || "";
  const idType = iucCrp.startsWith('1') 
    ? "N° d'identité SSOBL ou SMGC du client" 
    : iucCrp.toUpperCase().startsWith('T')
    ? "N° de formulaire IMM5292, IMM5509 ou IMM1000"
    : "#IUC";

  return [
    // Col 0: Détails sur le traitement (Vide)
    '',
    // Col 1: ID du dossier à mettre à jour (Vide)
    '',
    // Col 2: Type Identificateur unique
    idType,
    // Col 3: client_validation_id — #IUC ou #CRP du client (identificateur IRCC)
    iucCrp,
    // Col 4: client_birth_dt — Date de naissance AAAA-MM-JJ
    formatDate((client as any)?.birthDate),
    // Col 5: client_email_txt
    client?.email || '',
    // Col 6: preferred_official_lang_id — Langue officielle de préférence
    s.languageOfService || '',
    // Col 7: program_types_id — Type de programmation/d'initiative
    session.programmingType || 'Service standard',
    // Col 8: activity_start_dt — Date de l'évaluation AAAA-MM-JJ
    formatDate(session.date),
    // Col 9: activity_duration — Durée (ex: "1,0")
    durationLabel(session.duration || 60),
    // Col 10: activity_postal_cd — Code postal Organisation
    'L5B3C4',
    // Col 11: activity_country_id — Pays Organisation
    '',
    // Col 12: client_postal_cd — Code postal Client
    clientPostalCd,
    // Col 13: client_country_id — Pays du client
    session.clientLocationCountry || '',
    // Col 14: service_language_id — Langue utilisée lors de l'évaluation
    session.languageUsed || 'Français',
    // Col 15: formal_follow_up_ind
    bool(s.formalFollowUpInd),

    // === Vie au Canada — Atouts ===
    bool(s.lifeAssetInd),                      // Col 13
    bool(s.lifeAssetFamilyNetworksInd),        // Col 14
    bool(s.lifeAssetKnowledgeServicesInd),     // Col 15
    bool(s.lifeAssetSettlementMotivationInd),  // Col 16
    bool(s.lifeAssetOtherSkillsInd),           // Col 17

    // === Vie au Canada — Besoins ===
    bool(s.lifeNeedsInd),                                      // Col 18
    bool(s.lifeNeedsBasicIdentifiedInd),                       // Col 19
    bool(s.lifeNeedsBasicReferralInd),                         // Col 20
    s.lifeNeedsBasicReferralInd ? (s.lifeNeedsBasicFundedReferralId || '') : '',  // Col 21
    bool(s.lifeNeedsFamilyChildrenIdentifiedInd),              // Col 22
    bool(s.lifeNeedsFamilyChildrenReferralInd),                // Col 23
    s.lifeNeedsFamilyChildrenReferralInd ? (s.lifeNeedsFamilyChildrenFundedReferralId || '') : '', // Col 24
    bool(s.lifeNeedsHealthAndMentalIdentifiedInd),             // Col 25
    bool(s.lifeNeedsHealthAndMentalReferralInd),               // Col 26
    s.lifeNeedsHealthAndMentalReferralInd ? (s.lifeNeedsHealthAndMentalFundedReferralId || '') : '', // Col 27
    bool(s.lifeNeedsHousingIdentifiedInd),                     // Col 28
    bool(s.lifeNeedsHousingReferralInd),                       // Col 29
    s.lifeNeedsHousingReferralInd ? (s.lifeNeedsHousingFundedReferralId || '') : '', // Col 30
    bool(s.lifeNeedsGovernmentKnowledgeIdentifiedInd),         // Col 31
    bool(s.lifeNeedsGovernmentKnowledgeNoReferralInd),         // Col 32
    s.lifeNeedsGovernmentKnowledgeNoReferralInd ? (s.lifeNeedsGovernmentKnowledgeFundedReferralId || '') : '', // Col 33
    bool(s.lifeNeedsCanadaKnowledgeIdentifiedInd),             // Col 34
    bool(s.lifeNeedsCanadaKnowledgeReferralInd),               // Col 35
    s.lifeNeedsCanadaKnowledgeReferralInd ? (s.lifeNeedsCanadaKnowledgeFundedReferralId || '') : '', // Col 36
    bool(s.lifeNeedsLegalIdentifiedInd),                       // Col 37
    bool(s.lifeNeedsLegalReferralInd),                         // Col 38
    s.lifeNeedsLegalReferralInd ? (s.lifeNeedsLegalFundedReferralId || '') : '', // Col 39
    bool(s.lifeNeedsFinancialIdentifiedInd),                   // Col 40
    bool(s.lifeNeedsFinancialReferralInd),                     // Col 41
    s.lifeNeedsFinancialReferralInd ? (s.lifeNeedsFinancialFundedReferralId || '') : '', // Col 42
    bool(s.lifeNeedsCommunityKnowledgeIdentifiedInd),          // Col 43
    bool(s.lifeNeedsCommunityKnowledgeReferralInd),            // Col 44
    s.lifeNeedsCommunityKnowledgeReferralInd ? (s.lifeNeedsCommunityKnowledgeFundedReferralId || '') : '', // Col 45
    bool(s.lifeNeedsSocialNetworkingIdentifiedInd),            // Col 46
    bool(s.lifeNeedsSocialNetworkingReferralInd),              // Col 47
    s.lifeNeedsSocialNetworkingReferralInd ? (s.lifeNeedsSocialNetworkingFundedReferralId || '') : '', // Col 48
    bool(s.lifeNeedsRacismIdentifiedInd),                      // Col 49
    bool(s.lifeNeedsRacismReferralInd),                        // Col 50
    s.lifeNeedsRacismReferralInd ? (s.lifeNeedsRacismFundedReferralId || '') : '', // Col 51

    // === Langue — Atouts ===
    bool(s.languageAssetInd),         // Col 52
    bool(s.languageAssetEnglishInd),  // Col 53
    bool(s.languageAssetFrenchInd),   // Col 54
    bool(s.languageAssetOtherInd),    // Col 55

    // === Langue — Besoins ===
    bool(s.languageNeedsInd),                             // Col 56
    bool(s.languageNeedsOfficialIdentifiedNeedInd),       // Col 57
    s.languageNeedsOfficialLanguageId || '',              // Col 58
    bool(s.languageNeedsOfficialReferralInd),             // Col 59
    s.languageNeedsOfficialReferralInd ? (s.languageNeedsOfficialFundedReferralId || '') : '', // Col 60
    bool(s.languageNeedsLiteracyIdentifiedNeedInd),       // Col 61
    s.languageNeedsLiteracyLanguageId || '',              // Col 62
    bool(s.languageNeedsLiteracyReferralInd),             // Col 63
    s.languageNeedsLiteracyReferralInd ? (s.languageNeedsLiteracyFundedReferralId || '') : '', // Col 64
    bool(s.languageNeedsEmploymentIdentifiedNeedInd),     // Col 65
    s.languageNeedsEmploymentLanguageId || '',            // Col 66
    bool(s.languageNeedsEmploymentReferralInd),           // Col 67
    s.languageNeedsEmploymentReferralInd ? (s.languageNeedsEmploymentFundedReferralId || '') : '', // Col 68

    // === Emploi & Éducation — Atouts ===
    bool(s.employmentAssetInd),                           // Col 69
    bool(s.employmentAssetEmployedInd),                   // Col 70
    bool(s.employmentAssetForeignCredentialInd),          // Col 71
    bool(s.employmentAssetLabourMarketInd),               // Col 72
    bool(s.employmentAssetDegreeInCanadaInd),             // Col 73
    bool(s.employmentAssetDegreeOutsideCanadaInd),        // Col 74
    bool(s.employmentAssetPreviousEmploymentInd),         // Col 75
    bool(s.employmentAssetJobRelatedTrainingInd),         // Col 76
    bool(s.employmentAssetWorkExperienceOutsideCanadaInd), // Col 77
    bool(s.employmentAssetOtherSkillsInd),                // Col 78

    // === Emploi & Éducation — Besoins ===
    bool(s.employmentNeedsInd),                                          // Col 79
    bool(s.employmentLabourMarketNeedInd),                               // Col 80
    bool(s.employmentLabourMarketReferralInd),                           // Col 81
    s.employmentLabourMarketReferralInd ? (s.employmentLabourMarketFundedReferralId || '') : '', // Col 82
    bool(s.employmentFindingEmploymentNeedInd),                          // Col 83
    bool(s.employmentFindingEmploymentReferralInd),                      // Col 84
    s.employmentFindingEmploymentReferralInd ? (s.employmentFindingEmploymentFundedReferralId || '') : '', // Col 85
    bool(s.employmentCredentialsNeedInd),                                // Col 86
    bool(s.employmentCredentialsReferralInd),                            // Col 87
    s.employmentCredentialsReferralInd ? (s.employmentCredentialsFundedReferralId || '') : '', // Col 88
    bool(s.employmentEducationNeedInd),                                  // Col 89
    bool(s.employmentEducationReferralInd),                              // Col 90
    s.employmentEducationReferralInd ? (s.employmentEducationFundedReferralId || '') : '', // Col 91

    // === Format de l'évaluation ===
    bool(s.formatInPersonInd),           // Col 92
    bool(s.formatRemoteStaffInd),        // Col 93
    bool(s.formatRemoteSelfInd),         // Col 94
    bool(s.formatRemoteEmailTextPhoneInd), // Col 95

    // === Services de soutien — Reçus ===
    bool(s.supportReceivedInd),          // Col 96
    bool(s.childmindingReceivedInd),     // Col 97
    bool(s.digitalEquipmentReceivedInd), // Col 98
    bool(s.digitalSkillReceivedInd),     // Col 99
    bool(s.interpretationReceivedInd),   // Col 100
    bool(s.disabilitySupportReceivedInd), // Col 101
    bool(s.counsellingReceivedInd),      // Col 102
    bool(s.transportationReceivedInd),   // Col 103
    bool(s.translationReceivedInd),      // Col 104

    // === Services de soutien — Requis ===
    bool(s.supportRequiredInd),          // Col 105
    bool(s.childmindingRequiredInd),     // Col 106
    bool(s.digitalEquipmentRequiredInd), // Col 107
    bool(s.digitalSkillRequiredInd),     // Col 108
    bool(s.interpretationRequiredInd),   // Col 109
    bool(s.disabilitySupportRequiredInd), // Col 110
    bool(s.transportationRequiredInd),   // Col 111
    bool(s.translationRequiredInd),      // Col 112

    // === Plan & Aiguillages ===
    bool(s.settlementPlanCreatedInd),    // Col 113
    s.francophoneReferredId || 'Non — le client n\'a pas demandé d\'aiguillage', // Col 114
    s.caseManagementReferredId || 'Non — le client n\'avait pas besoin d\'être aiguillé vers la gestion des cas', // Col 115
  ];
}

// The exact column headers (row 1) in the same order as the Excel template
const HEADERS = [
  "Détails sur le traitement",
  "ID du dossier à mettre à jour",
  "Type Identificateur unique",
  "Valeur de l'identificateur unique",
  "Date de naissance du client (AAAA-MM-JJ)",
  "Courriel du client",
  "Langue officielle de préférence",
  "Type de programmation/d'initiative",
  "Date de début de l'évaluation (AAAA-MM-JJ)",
  "Durée de l'évaluation (heures)",
  "Emplacement de l'organisation: Code postal (A#A#A#)",
  "Emplacement de l'organisation: Pays",
  "Emplacement du client: Code postal (A#A#A#)",
  "Emplacement du client: Pays",
  "Langue utilisée le plus souvent par le client lors de l'évaluation",
  "Cette évaluation est-elle le résultat d'un suivi formel ?",
  "Client dispose d'actifs pour subvenir à ses besoins au Canada",
  "Réseaux familiaux et personnels",
  "Connaissance du Canada, des services gouvernementaux et d'autres services",
  "Motivation liée à d'établissement et à l'intégration",
  "Autres compétences ou expériences utiles à la communauté ou au client",
  "Client a des besoins liés à la vie au Canada",
  "La vie au Canada de Besoins: Besoins de base",
  "Aiguillé",
  "Aiguillage vers aux services financés",
  "La vie au Canada de Besoins: Famille et des enfants",
  "Aiguillé",
  "Aiguillage vers aux services financés",
  "La vie au Canada de Besoins: Santé et de santé mentale",
  "Aiguillé",
  "Aiguillage vers aux services financés",
  "La vie au Canada de Besoins: Logement",
  "Aiguillé",
  "Aiguillage vers aux services financés",
  "La vie au Canada de Besoins: Connaissance des services gouvernementaux",
  "Aiguillé",
  "Aiguillage vers aux services financés",
  "La vie au Canada de Besoins: Connaissance du Canada",
  "Aiguillé",
  "Aiguillage vers aux services financés",
  "La vie au Canada de Besoins: Juridiques",
  "Aiguillé",
  "Aiguillage vers aux services financés",
  "La vie au Canada de Besoins: Financiers",
  "Aiguillé",
  "Aiguillage vers aux services financés",
  "La vie au Canada de Besoins: Connaissance communautaire",
  "Aiguillé",
  "Aiguillage vers aux services financés",
  "La vie au Canada de Besoins: Réseautage social",
  "Aiguillé",
  "Aiguillage vers aux services financés",
  "La vie au Canada de Besoins: Faire face au racisme et à la discrimination",
  "Aiguillé",
  "Aiguillage vers aux services financés",
  "Client identifie-t-il des atouts liés à la langue",
  "Connaissance suffisante de l'anglais en vue de communiquer facilement",
  "Connaissance suffisante du français en vue de communiquer facilement",
  "Autres compétences en communication (par exemple ALS/LSQ)",
  "Client a-t-il des besoins linguistiques",
  "Langue Besoins: Langues officielles",
  "Langue",
  "Aiguillé",
  "Aiguillage vers aux services financés",
  "Langue Besoins: Littéracie",
  "Langue",
  "Aiguillé",
  "Aiguillage vers aux services financés",
  "Langue Besoins: Langue de travail",
  "Langue",
  "Aiguillé",
  "Aiguillage vers aux services financés",
  "Client possède des actifs liés à l'emploi ou à l'éducation des adultes",
  "Emploi et éducation des adultes: Actuellement employé au Canada",
  "Emploi et éducation des adultes: Diplôme étranger reconnu au Canada",
  "Emploi et éducation des adultes: Connaissance du marché du travail canadien",
  "Emploi et éducation des adultes: Diplôme/certificat d'études postsecondaires obtenu au Canada",
  "Emploi et éducation des adultes: Diplôme/certificat d'études postsecondaires obtenu à l'étrange",
  "Emploi et éducation des adultes: Expérience professionnelle antérieure au Canada",
  "Emploi et éducation des adultes: Formation liée à l'emploi suivie ou terminée",
  "Emploi et éducation des adultes: Expérience de travail en dehors du Canada",
  "Emploi et éducation des adultes: Autres compétences ou expériences spécialisées/liées au travail",
  "Client a des besoins liés à l'emploi ou à l'éducation des adultes",
  "Besoins à l'emploi ou à l'éducation des adultes: Connaissance du marché du travail canadien",
  "Aiguillé",
  "Aiguillage vers aux services financés",
  "Besoins à l'emploi ou à l'éducation des adultes: Trouver un emploi au Canada",
  "Aiguillé",
  "Aiguillage vers aux services financés",
  "Besoins à l'emploi ou à l'éducation des adultes: Qualifications",
  "Aiguillé",
  "Aiguillage vers aux services financés",
  "Besoins à l'emploi ou à l'éducation des adultes: Éducation",
  "Aiguillé",
  "Aiguillage vers aux services financés",
  "Format de l'évaluation: En personne",
  "Format de l'évaluation: À distance - dirigé par le personnel",
  "Format de l'évaluation: À distance - auto-dirigé",
  "Format de l'évaluation: À distance par courriel/message texte/téléphone",
  "Services de soutien reçus",
  "Garde d'enfants",
  "Équipement de soutien numérique",
  "Compétences en matière de soutien numérique",
  "Interprétation orale",
  "Dispositions en raison d'un handicap",
  "Counseils à court terme",
  "Transport",
  "Traduction écrite",
  "Services de soutien requis",
  "Garde d'enfants",
  "Équipement de soutien numérique",
  "Compétences en matière de soutien numérique",
  "Interprétation orale",
  "Dispositions en raison d'un handicap",
  "Transport",
  "Traduction écrite",
  "Le plan d'établissement a-t-il été créé et partagé avec le client ?",
  "Le client a-t-il été aiguillé vers un fournisseur de services francophone ?",
  "Le client a-t-il été aiguillé vers la Gestion des cas ?",
];

export async function exportSEBAAReport(sessions: Session[], clients: Client[]): Promise<void> {
  // Filter: only individual ESTABLISHMENT sessions
  const candidateSessions = sessions.filter(s =>
    s.category === 'INDIVIDUELLE' &&
    s.type === 'ETABLISSEMENT'
  );

  if (candidateSessions.length === 0) {
    alert('Aucune séance individuelle en Établissement trouvée. Créez d\'abord des séances individuelles de type "Établissement".');
    return;
  }

  // Fetch ALL sessions with full fields (includes NAARS/SÉBAA data)
  let hydratedSessions: Session[] = candidateSessions;
  try {
    const { apiService } = await import('./apiService');
    // GET /api/sessions?full=true returns SELECT * (all columns incl. NAARS)
    const allFullSessions: Session[] = await apiService.fetchTable('sessions', { full: 'true' });
    const candidateIds = new Set(candidateSessions.map(s => s.id));
    hydratedSessions = allFullSessions.filter(s =>
      candidateIds.has(s.id) &&
      s.category === 'INDIVIDUELLE' &&
      s.type === 'ETABLISSEMENT'
    );
    if (hydratedSessions.length === 0) hydratedSessions = candidateSessions;
  } catch (err) {
    console.error('Erreur lors du chargement complet des données SÉBAA:', err);
    // Fallback: use shallow data (NAARS fields will be empty)
    hydratedSessions = candidateSessions;
  }

  // Build worksheet data: all TEXT cells (type 's')
  const wsData: XLSX.CellObject[][] = [];

  // Row 0: Header
  const headerRow: XLSX.CellObject[] = HEADERS.map(h => ({ t: 's' as const, v: h }));
  wsData.push(headerRow);

  // Data rows
  hydratedSessions.forEach(session => {
    const rowValues = sessionToRow(session, clients);
    const row: XLSX.CellObject[] = rowValues.map(v => ({ t: 's' as const, v: String(v) }));
    wsData.push(row);
  });

  // Build worksheet from cell objects (forces TEXT format for all cells)
  const ws: XLSX.WorkSheet = {};
  const range = { s: { r: 0, c: 0 }, e: { r: wsData.length - 1, c: HEADERS.length - 1 } };

  wsData.forEach((row, r) => {
    row.forEach((cell, c) => {
      const addr = XLSX.utils.encode_cell({ r, c });
      ws[addr] = cell;
    });
  });

  ws['!ref'] = XLSX.utils.encode_range(range);

  // Set all columns to text format
  const colInfo: XLSX.ColInfo[] = HEADERS.map(() => ({ wch: 20 }));
  ws['!cols'] = colInfo;

  const wb = XLSX.utils.book_new();
  XLSX.utils.book_append_sheet(wb, ws, 'SÉBAA Export');

  // Generate and download
  const today = new Date().toISOString().split('T')[0];
  const filename = `SEBAA_Export_Arrivio_${today}.xlsx`;

  XLSX.writeFile(wb, filename);
}

