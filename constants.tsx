
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

