
import { Client, Partner, Mentor, UserRole, ReferralStatus, Session, SessionType, SessionCategory, FacilitatorType, Consultant, Contract, AuditLog, PartnerType, AttendanceStatus } from './types';

// Utilisation de vrais UUID pour la compatibilité Supabase
export const MOCK_CLIENTS: Client[] = [
  {
    id: 'd290f1ee-6c54-4b01-90e6-d701748f0851',
    firstName: 'Jean',
    lastName: 'Dupont',
    email: 'jean.dupont@email.com',
    originCountry: 'France',
    profession: 'Ingénieur Logiciel',
    destinationCity: 'Toronto',
    arrivalDate: '2024-05-15',
    needs: ['Emploi', 'Logement'],
    status: ReferralStatus.PENDING,
    consentShared: true,
    notes: []
  },
  {
    id: 'b87f8f2b-8b2d-4d5c-9c9d-8c8c8c8c8c8c',
    firstName: 'Marie',
    lastName: 'Lefebvre',
    email: 'marie.l@email.com',
    originCountry: 'Sénégal',
    profession: 'Infirmière',
    destinationCity: 'Ottawa',
    arrivalDate: '2024-06-10',
    needs: ['Santé', 'Communautaire'],
    status: ReferralStatus.ACKNOWLEDGED,
    assignedPartnerId: 'a1111111-1111-1111-1111-111111111111',
    referralDate: '2024-03-01T10:05:00Z',
    acknowledgedAt: '2024-03-02T09:30:00Z',
    consentShared: true,
    notes: [
      { id: 'n1', authorName: 'Jean Conseil (CFGT)', content: 'Client très motivé, recherche activement un poste en milieu hospitalier.', timestamp: '2024-03-01T10:00:00Z' }
    ]
  }
];

export const MOCK_CONTRACTS: Contract[] = [
  {
    id: 'cont-1',
    consultantName: 'Sophie Emploi',
    totalSessions: 12,
    usedSessions: 5,
    startDate: '2024-01-01',
    endDate: '2024-12-31',
    status: 'ACTIVE',
    // Added missing required property 'amount'
    amount: 5000
  },
  {
    id: 'cont-2',
    consultantName: 'Marc Dubé',
    totalSessions: 8,
    usedSessions: 2,
    startDate: '2024-01-01',
    endDate: '2024-06-30',
    status: 'ACTIVE',
    // Added missing required property 'amount'
    amount: 3200
  }
];

export const MOCK_SESSIONS: Session[] = [
  {
    id: 's1',
    title: 'Orientation Établissement Toronto',
    type: SessionType.ESTABLISHMENT,
    category: SessionCategory.GROUP,
    date: '2024-03-10',
    startTime: '10:00',
    duration: 120,
    participantIds: ['d290f1ee-6c54-4b01-90e6-d701748f0851'],
    noShowIds: [],
    location: 'Zoom',
    notes: 'Introduction pour les nouveaux arrivants.',
    facilitatorName: 'Marc Dubé',
    facilitatorType: FacilitatorType.CONSULTANT,
    advisorName: 'Jean Conseil',
    needsInterpretation: false,
    invoiceReceived: true,
    invoiceSubmitted: true,
    invoicePaid: false
  }
];

export const MOCK_PARTNERS: Partner[] = [
  { id: 'a1111111-1111-1111-1111-111111111111', name: 'Centre d’Accueil Ottawa', city: 'Ottawa', province: 'Ontario', specialties: ['Santé'], type: PartnerType.EXTERNAL },
  { id: 'b2222222-2222-2222-2222-222222222222', name: 'Emploi Ontario Francophone', city: 'Toronto', province: 'Ontario', specialties: ['Emploi'], type: PartnerType.EXTERNAL }
];

export const MOCK_CONSULTANTS: Consultant[] = [
  { id: 'con1', name: 'Sophie Emploi', specialty: 'Expertise Marché du Travail' },
  { id: 'con2', name: 'Marc Dubé', specialty: 'Orientation Établissement' },
  { id: 'con3', name: 'Julie Travail', specialty: 'Conseil RTCE' }
];

export const MOCK_MENTORS: Mentor[] = [
  { id: 'm1', firstName: 'Luc', lastName: 'Martin', profession: 'Directeur IT', city: 'Toronto', domain: 'Informatique', originCountry: 'France', organizationId: 'b2222222-2222-2222-2222-222222222222' }
];

export const MOCK_AUDIT_LOGS: AuditLog[] = [
  { id: 'l1', action: 'CREATION_DOSSIER', details: 'Dossier créé via portail IRCC', timestamp: '2024-01-10T14:30:00Z', targetId: 'd290f1ee-6c54-4b01-90e6-d701748f0851' }
];

export const ROLE_LABELS: Record<UserRole, string> = {
  [UserRole.ADVISOR]: 'Conseiller CFGT',
  [UserRole.PARTNER]: 'Organisme Partenaire',
  [UserRole.MENTOR]: 'Mentor',
  [UserRole.MANAGER]: 'Gestionnaire',
  [UserRole.ADMIN]: 'Administrateur'
};

export const PARTNER_TYPE_LABELS: Record<PartnerType, string> = {
  [PartnerType.INTERNAL]: 'Interne',
  [PartnerType.EXTERNAL]: 'Collaboration externe',
  [PartnerType.CONSULTANT]: 'Consultant'
};

export const STATUS_COLORS: Record<ReferralStatus, string> = {
  [ReferralStatus.PENDING]: 'bg-amber-500 text-white border-amber-400 shadow-md shadow-amber-200',
  [ReferralStatus.REFERRED]: 'bg-blue-50 text-blue-700 border-blue-200',
  [ReferralStatus.ACKNOWLEDGED]: 'bg-indigo-100 text-indigo-800 border-indigo-200',
  [ReferralStatus.CONTACTED]: 'bg-blue-100 text-blue-800 border-blue-200',
  [ReferralStatus.IN_PROGRESS]: 'bg-green-100 text-green-800 border-green-200',
  [ReferralStatus.CLOSED]: 'bg-slate-100 text-slate-800 border-slate-200'
};

export const SESSION_TYPE_LABELS: Record<SessionType, string> = {
  [SessionType.ESTABLISHMENT]: 'Établissement',
  [SessionType.EMPLOYMENT]: 'Emploi',
  [SessionType.RTCE]: 'RTCE',
  [SessionType.MATCHING]: 'Jumelage',
  [SessionType.COMMUNITY_CONNECTION]: 'Connexions'
};

export const SESSION_CATEGORY_LABELS: Record<SessionCategory, string> = {
  [SessionCategory.INDIVIDUAL]: 'Individuelle',
  [SessionCategory.GROUP]: 'Collective'
};

export const ATTENDANCE_STATUS_LABELS: Record<AttendanceStatus, string> = {
  [AttendanceStatus.PRESENT]: 'Présent',
  [AttendanceStatus.ABSENT]: 'Absent',
  [AttendanceStatus.CANCELLED]: 'Annulé',
  [AttendanceStatus.TECH_ISSUE]: 'Problème technique',
  [AttendanceStatus.NON_ELIGIBLE]: 'Non éligible',
  [AttendanceStatus.DECALEE]: 'Décalée'
};

export const INACTIVITY_LIMIT = 10 * 60 * 1000; // 10 minutes en millisecondes

export const IRCC_COUNTRIES = [
  "Açores", "Afghanistan", "Afrique du Sud", "Afrique Nma", "Aland, Iles", "Albanie", "Algérie", 
  "Allemagne, République Démocratique d'", "Amérique Centrale Nma", "Amérique du Sud Nma", "Andorre", 
  "Angleterre", "Anglo Normandes, Îles", "Angola", "Anguilla", "Antigua-et-Barbuda", "Antilles néerlandaises", 
  "Antilles Nma", "Apatride", "Arabie Saoudite", "Argentine", "Arménie", "Aruba", "Asie Nma", 
  "Australes et Antarctiques Francaises, Terres", "Australie", "Australie Nma", 
  "Autorité palestinienne (Gaza/Cisjordanie)", "Autriche", "Azerbaïdjan", "Bahamas, Les", "Bahreïn", 
  "Bailliage de Jersey", "Bangladesh", "Barbade", "Bélarus", "Belgique", "Bélize", "Bénin, République Populaire de", 
  "Bermudes", "Bhoutan", "Bolivie", "Bonaire, Saint-Eustache et Saba", "Bosnie-Herzégovine", "Botswana, République du", 
  "Bouvet, Ile", "Brésil", "Brunéi", "Bulgarie", "Burkina-Faso", "Burundi", "Caïmans, Îles", "Cambodge", 
  "Canaries, Îles", "Cap-Vert, Îles du", "Centrafricaine, République", "Chili", "Christmas, Ile", "Chypre", 
  "Citoyen Britanniques à l'Étranger", "Citoyen des Dépendances Britanniques", "Colombie", 
  "Commonwealth des Îles Mariannes du Nord", "Comores, Les", "Congo, République Démocratique du", 
  "Congo, République Populaire du", "Cook, Îles", "Corée, République de", "Corée, République Démocratique Populaire de", 
  "Costa Rica", "Côte d'Ivoire", "Croatie", "Cuba", "Curacao", "Danemark", "Djibouti, République de", "Dominique", 
  "Écosse", "Égypte", "El Salvador", "Émirats arabes unis", "Équateur", "Érythrée", "Espagne", "Estonie", 
  "Etats Federes de Micronésie", "États-Unis d'Amérique", "Éthiopie", "EUE", "Europe Nma", "Falkland, Îles", 
  "Feroe, Iles", "Fidji", "Finlande", "France", "Gabon, République du", "Galles, Pays de", "Gambie", "Géorgie", 
  "Ghana", "Gibraltar", "Grèce", "Grenade, La", "Groenland", "Guadeloupe", "Guam", "Guatemala", "Guernsey", 
  "Guinée équatoriale", "Guinée, République de", "Guinée-Bissau", "Guyane", "Guyane Française", "Haïti", 
  "Heard et MacDonald, Iles", "Honduras", "Hong Kong", "Hongrie", "Iles Mineures Eloignees des Etats-Unis", 
  "Îles Soloman", "Inconnu", "Inde", "Indonésie, République d'", "Iran", "Iraq", "Irlande", "Irlande du Nord", 
  "Islande", "Israël", "Italie", "Jamaïque", "Japon", "Jordanie", "Kazakhstan", "Kenya", "Kirghizistan", "Kiribati", 
  "Kosovo, République du", "Koweït", "Laos", "les Pays-Bas", "Lesotho", "Lettonie", "Liban", "Libéria", "Libye", 
  "Liechtenstein", "Lituanie", "Luxembourg", "Macao", "Macau, Ras", "Macédoine", "Madagascar", "Madère", "Malawi", 
  "Malaysie", "Maldives, République des", "Mali, République du", "Malte", "Man, Ile de", "Marinas", "Maroc", 
  "Marshall Îles", "Martinique", "Maurice", "Mauritanie", "Mayotte", "Mexique", "Moldavie", "Monaco", 
  "Mongolie, République Populaire de", "Montenegro, République d'", "Montserrat", "Mozambique", "Myanmar (Birmanie)", 
  "Namibie", "Nauru", "Népal", "Nevis", "Nicaragua", "Niger, République du", "Nigéria", "Niue", "Norvège", 
  "Nouvelle Zélande", "Nouvelle-Calédonie", "Océanie Nma", "Oman", "ONU - Institution spécialisée", 
  "ONU ou fonctionnaire", "Ouganda", "Ouzbékistan", "Pakistan", "Palau", "Panama, République du", 
  "Panama, Zone du Canal de", "Papau", "Papouasie-Nouvelle-Guinée", "Paraguay", "Pérou", "Philippines", 
  "Pitcairn, Îles", "Pologne", "Polynésie Française", "Porto Rico", "Portugal", "Qatar", "QCE", "QCI", "QCJ", 
  "QCU", "QCW", "R.-U. - Citoyen britannique", "R.-U. - Protégé britannique", "R.-U. - Ress. brit. outre-mer", 
  "RAS Hong Kong", "Republic des Palaos", "République démocratique du Soudan", "Republique des Îles Marshall", 
  "République Dominicaine", "République fédérale de l'Allemagne", "République fédérale du Cameroun", 
  "République populaire de Chine", "République socialiste du Vietnam", "République Unie de Tanzanie", "Réunion", 
  "Roumanie", "Royaume-Uni et Colonies", "Russie", "Rwanda", "Sahara Occidental", "Saint Christophe-Nevis", 
  "Saint Marin", "Saint-Barthelemy", "Sainte-Hélène", "Sainte-Lucie", "Saint-Martin", "Saint-Pierre-et-Miquelon", 
  "Saint-Vincent-et-Grenadines", "Salomons, Les", "Samoa américaine", "Samoa, Etat independant du", 
  "Sao Tomé-et-Principe", "Sénégal", "Serbie, République d'", "Serbie-et-Montenegro", "Seychelles", "Sierra Leone", 
  "Sikkim (Asie)", "Singapour", "Sint-Maarten", "Slovaque République", "Slovénie", "Somalie, République Démocratique de", 
  "Soudan du Sud, Republique de", "Sri Lanka", "Suède", "Suisse", "Surinam", "Swaziland", "Syrie", "Tadjikistan", 
  "Taïwan", "Tchad, République du", "Tchécoslovaquie", "Tchèque, République", "Terre-Neuve", 
  "Territoire Britannique de l'ocean Indien", "Thaïlande", "Tibet", "Timor Est, Republique Democratique du", 
  "Togo, République de", "Tokelaou", "Tongo", "Trinité-et-Tobago, République du", "Tunisie", "Turkménistan", 
  "Turks et Caicos, Îles", "Turquie", "Tuvalu", "Ukraine", "Union des Républiques Socialistes Soviétiques", 
  "Uruguay", "Vanuatu", "Vatican", "Venezuela", "Vierges, Îles Americaines", "Vierges, Îles Britanniques", 
  "Vietnam Nord", "Wallis-et-Futuna", "Yémen, République Démocratique Populaire du", "Yémen, République du", 
  "Yougoslavie", "Zambie", "Zimbabwe"
]; // 295 items derived from Pays.xlsx

/**
 * Mappage complet basé sur les données de production réelles.
 * Chaque clé est un nom de pays tel qu'il peut apparaître dans les imports clients,
 * et la valeur est le nom officiel du système IRCC.
 */
export const COUNTRY_MAPPING: Record<string, string> = {
  // ============================================================
  // AFRIQUE — Pays fréquents dans la base Arrivio
  // ============================================================
  // Afrique du Sud
  "Afrique du Sud": "Afrique du Sud",
  "South Africa": "Afrique du Sud",

  // Algérie (avec corruption d'encodage potentielle)
  "Algérie": "Algérie",
  "Alg\u00e9rie": "Algérie",
  "Alg?rie": "Algérie",
  "Algeria": "Algérie",

  // Angola
  "Angola": "Angola",

  // Arabie Saoudite
  "Arabie saoudite": "Arabie Saoudite",
  "Arabie Saoudite": "Arabie Saoudite",
  "Saudi Arabia": "Arabie Saoudite",

  // Azerbaïdjan
  "Azerbaïdjan": "Azerbaïdjan",
  "Azerbaidjan": "Azerbaïdjan",
  "Azerbaijan": "Azerbaïdjan",

  // Bénin
  "Bénin": "Bénin, République Populaire de",
  "B\u00e9nin": "Bénin, République Populaire de",
  "B?nin": "Bénin, République Populaire de",
  "Benin": "Bénin, République Populaire de",

  // Burkina Faso
  "Burkina Faso": "Burkina-Faso",
  "Burkina": "Burkina-Faso",

  // Burundi
  "Burundi": "Burundi",

  // Cameroun
  "Cameroun": "République fédérale du Cameroun",
  "Cameroon": "République fédérale du Cameroun",

  // Djibouti
  "Djibouti": "Djibouti, République de",

  // Égypte
  "Égypte": "Égypte",
  "\u00c9gypte": "Égypte",
  "?gypte": "Égypte",
  "Egypte": "Égypte",
  "Egypt": "Égypte",

  // Émirats arabes unis
  "Émirats arabes unis": "Émirats arabes unis",
  "\u00c9mirats arabes unis": "Émirats arabes unis",
  "Emirats arabes unis": "Émirats arabes unis",
  "Émirats Arabes Unis": "Émirats arabes unis",
  "Emirats Arabes Unis": "Émirats arabes unis",
  "UAE": "Émirats arabes unis",
  "United Arab Emirates": "Émirats arabes unis",

  // Gabon
  "Gabon": "Gabon, République du",

  // Guinée
  "Guinée": "Guinée, République de",
  "Guin\u00e9e": "Guinée, République de",
  "Guin?e": "Guinée, République de",
  "Guinea": "Guinée, République de",

  // Guinée équatoriale
  "Guinée équatoriale": "Guinée équatoriale",
  "Guinee equatoriale": "Guinée équatoriale",
  "Equatorial Guinea": "Guinée équatoriale",

  // Haïti
  "Haïti": "Haïti",
  "Ha\u00efti": "Haïti",
  "Ha?ti": "Haïti",
  "Haiti": "Haïti",

  // Madagascar
  "Madagascar": "Madagascar",

  // Mali
  "Mali": "Mali, République du",

  // Maroc
  "Maroc": "Maroc",
  "Morocco": "Maroc",

  // Maurice (Île Maurice)
  "Maurice": "Maurice",
  "Mauritius": "Maurice",

  // Mauritanie
  "Mauritanie": "Mauritanie",
  "Mauritania": "Mauritanie",

  // Niger
  "Niger": "Niger, République du",

  // Nigéria / Nigeria
  "Nigéria": "Nigéria",
  "Nigeria": "Nigéria",

  // Ouganda
  "Ouganda": "Ouganda",
  "Uganda": "Ouganda",

  // République démocratique du Congo
  "République démocratique du Congo": "Congo, République Démocratique du",
  "R\u00e9publique d\u00e9mocratique du Congo": "Congo, République Démocratique du",
  "R?publique d?mocratique du Congo": "Congo, République Démocratique du",
  "RD Congo": "Congo, République Démocratique du",
  "RDC": "Congo, République Démocratique du",
  "Congo-Kinshasa": "Congo, République Démocratique du",
  "Democratic Republic of Congo": "Congo, République Démocratique du",
  "DRC": "Congo, République Démocratique du",

  // République du Congo (Congo-Brazzaville)
  "République du Congo": "Congo, République Populaire du",
  "R\u00e9publique du Congo": "Congo, République Populaire du",
  "R?publique du Congo": "Congo, République Populaire du",
  "Congo-Brazzaville": "Congo, République Populaire du",

  // République dominicaine
  "République dominicaine": "République Dominicaine",
  "R\u00e9publique dominicaine": "République Dominicaine",
  "R?publique dominicaine": "République Dominicaine",
  "Dominican Republic": "République Dominicaine",

  // Rwanda
  "Rwanda": "Rwanda",

  // Sénégal
  "Sénégal": "Sénégal",
  "S\u00e9n\u00e9gal": "Sénégal",
  "S?n?gal": "Sénégal",
  "Senegal": "Sénégal",

  // Tchad
  "Tchad": "Tchad, République du",
  "Chad": "Tchad, République du",

  // Togo
  "Togo": "Togo, République de",

  // Tunisie
  "Tunisie": "Tunisie",
  "Tunisia": "Tunisie",

  // ============================================================
  // AMÉRIQUES
  // ============================================================
  // États-Unis
  "États-Unis": "États-Unis d'Amérique",
  "\u00c9tats-Unis": "États-Unis d'Amérique",
  "?tats-Unis": "États-Unis d'Amérique",
  "Etats-Unis": "États-Unis d'Amérique",
  "USA": "États-Unis d'Amérique",
  "United States": "États-Unis d'Amérique",
  "United States of America": "États-Unis d'Amérique",

  // Colombie
  "Colombie": "Colombie",
  "Colombia": "Colombie",

  // Guatemala
  "Guatemala": "Guatemala",

  // Venezuela
  "Venezuela": "Venezuela",
  "Vénézuela": "Venezuela",

  // ============================================================
  // ASIE
  // ============================================================
  // Chine
  "Chine": "République populaire de Chine",
  "China": "République populaire de Chine",
  "RPC": "République populaire de Chine",

  // Inde
  "Inde": "Inde",
  "India": "Inde",

  // Iran
  "Iran": "Iran",

  // Liban
  "Liban": "Liban",
  "Lebanon": "Liban",

  // Qatar
  "Qatar": "Qatar",

  // Turquie
  "Turquie": "Turquie",
  "Turkey": "Turquie",
  "Türkiye": "Turquie",

  // Vietnam
  "Vietnam": "République socialiste du Vietnam",
  "Viêt Nam": "République socialiste du Vietnam",
  "Viet Nam": "République socialiste du Vietnam",

  // Palestine
  "Palestine": "Autorité palestinienne (Gaza/Cisjordanie)",
  "Gaza": "Autorité palestinienne (Gaza/Cisjordanie)",

  // Philippines
  "Philippines": "Philippines",

  // Corée du Sud / Nord
  "Corée du Sud": "Corée, République de",
  "Corée": "Corée, République de",
  "Corée du Nord": "Corée, République Démocratique Populaire de",

  // Taïwan
  "Taïwan": "Taïwan",
  "Taiwan": "Taïwan",

  // Hong Kong
  "Hong-Kong": "RAS Hong Kong",
  "Hong Kong": "RAS Hong Kong",

  // ============================================================
  // EUROPE
  // ============================================================
  // Azerbaïdjan (déjà en Asie mais redondance utile)
  "Irlande": "Irlande",
  "Ireland": "Irlande",

  "Italie": "Italie",
  "Italy": "Italie",

  "Belgique": "Belgique",
  "Belgium": "Belgique",

  "France": "France",

  "Russie": "Russie",
  "Russia": "Russie",

  "Hongrie": "Hongrie",
  "Hungary": "Hongrie",

  "Royaume-Uni": "Angleterre",
  "UK": "Angleterre",
  "United Kingdom": "Angleterre",
  "Great Britain": "Angleterre",

  "Australie": "Australie",
  "Australia": "Australie",

  "Pays-Bas": "les Pays-Bas",
  "Holland": "les Pays-Bas",
  "Netherlands": "les Pays-Bas",

  "Tchéquie": "Tchèque, République",
  "République Tchèque": "Tchèque, République",
  "Czech Republic": "Tchèque, République",

  "Tanzanie": "République Unie de Tanzanie",
  "Tanzania": "République Unie de Tanzanie",

  "Soudan du Sud": "Soudan du Sud, Republique de",
  "South Sudan": "Soudan du Sud, Republique de",
};

/**
 * Normalise un nom de pays pour qu'il corresponde à la liste officielle IRCC.
 * Stratégie multi-niveaux:
 * 1. Mappage manuel (correspondances connues + variantes encodées)
 * 2. Correspondance exacte dans IRCC_COUNTRIES
 * 3. Correspondance normalisée (sans accents, insensible à la casse)
 * 4. Correspondance partielle (si un terme IRCC est contenu dans la recherche)
 */
export const getIRCCCountry = (uploadedName: string | null | undefined): string => {
  if (!uploadedName) return "Inconnu";
  
  const clean = uploadedName.trim();
  if (!clean) return "Inconnu";

  // Helper: normalise les accents et la casse
  const normalize = (s: string) => s
    .normalize("NFD")
    .replace(/[\u0300-\u036f]/g, "")
    // Gère aussi les caractères Windows-1252 corrompus (?, ?, etc.)
    .replace(/[?]/g, "")
    .toLowerCase()
    .trim();

  const normalizedSearch = normalize(clean);

  // 1. Mappage manuel exact
  if (COUNTRY_MAPPING[clean]) return COUNTRY_MAPPING[clean];

  // 2. Correspondance exacte IRCC
  if (IRCC_COUNTRIES.includes(clean)) return clean;

  // 3. Mappage manuel normalisé (accents et casse ignorés)
  for (const [key, value] of Object.entries(COUNTRY_MAPPING)) {
    if (normalize(key) === normalizedSearch) return value;
  }

  // 4. Correspondance normalisée dans IRCC_COUNTRIES
  const irccMatch = IRCC_COUNTRIES.find(c => normalize(c) === normalizedSearch);
  if (irccMatch) return irccMatch;

  // 5. Correspondance partielle: le nom cherché est contenu dans un pays IRCC
  // (ex: "Congo" → "Congo, République Démocratique du" ne sera pas choisi ici car ambigu)
  // On cherche plutôt si un pays IRCC commence par le terme cherché
  const startMatch = IRCC_COUNTRIES.find(c => normalize(c).startsWith(normalizedSearch) && normalizedSearch.length > 4);
  if (startMatch) return startMatch;

  // 6. Retourner le nom original (non trouvé mais mieux que vide)
  return clean;
};

// --- EMPLOYMENT SLE CONSTANTS ---
export const EMPLOYMENT_STATUS_CANADA = [
  "Sans emploi présentement",
  "A démarré une entreprise / travailleur indépendant",
  "Employé au Canada, dans sa profession",
  "Employé au Canada, mais pas dans sa profession"
];

export const EMPLOYMENT_STATUS_OUTSIDE = [
  "N'a pas d'offre d'emploi au Canada",
  "A démarré sa propre entreprise/devenir travailleur autonome au Canada",
  "A un offre d'emploi au Canada, dans sa profession",
  "A un offre d'emploi au Canada, mais pas dans sa profession"
];

export const EMPLOYMENT_TARGET_TYPES = [
  "Populations ciblées",
  "Sectoriel"
];

export const EMPLOYMENT_SECTORS = [
  "Couloir pour les enseignants de français au Canada",
  "Éducation",
  "Santé",
  "Science, Technologie, Ingénierie et Mathématiques (STIM)",
  "Métier",
  "Transport"
];

export const EMPLOYMENT_TOPICS = [
  { label: "Planification de carrière, navigation et compétences en recherche d'emploi", field: 'employmentTopicCareerPlanningInd' },
  { label: "Informations sur le marché du travail", field: 'employmentTopicLabourMarketInd' },
  { label: "Préparation à une profession réglementée", field: 'employmentTopicRegulatedProfessionInd' },
  { label: "Préparation à l'entrepreneuriat", field: 'employmentTopicEntrepreneurshipInd' },
  { label: "Préparation à une profession non réglementée", field: 'employmentTopicUnregulatedProfessionInd' },
  { label: "Compétences pour réussir", field: 'employmentTopicSkillsInd' },
  { label: "Orientation en milieu de travail et/ou Santé et Sécurité", field: 'employmentTopicWorkplaceOrientationInd' }
];

export const EMPLOYMENT_REFERRALS = [
  { label: "Établissement d’enseignement et de formation", field: 'employmentRefEducationTrainingInd' },
  { label: "Organisme d’évaluation des diplômes d’études", field: 'employmentRefCredentialEvaluationInd' },
  { label: "Employeur", field: 'employmentRefEmployerInd' },
  { label: "Formation linguistique liée à l’emploi", field: 'employmentRefLanguageTrainingInd' },
  { label: "Évaluation linguistique", field: 'employmentRefLanguageAssessmentInd' },
  { label: "Autres services d’emploi financés par le gouvernement fédéral (p. ex., EDSC)", field: 'employmentRefOtherFederalInd' },
  { label: "Organisme professionnel ou de réglementation", field: 'employmentRefProfessionalBodyInd' },
  { label: "Services d’emploi des gouvernements provinciaux ou territoriaux", field: 'employmentRefProvincialServicesInd' }
];

