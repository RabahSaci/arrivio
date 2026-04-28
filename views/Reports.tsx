
import React, { useState, useMemo } from 'react';
import { Client, Session, Partner, UserRole, ReferralStatus, SessionType, SessionCategory } from '../types';
import { SESSION_TYPE_LABELS, STATUS_COLORS } from '../constants';
import { apiService } from '../services/apiService';
import { 
  FileDown, 
  Filter, 
  Calendar, 
  Users, 
  Activity, 
  Download, 
  CheckCircle2, 
  AlertCircle,
  Building2,
  Table as TableIcon,
  Search,
  Clock,
  Briefcase
} from 'lucide-react';
import { exportSEBAAReport } from '../services/exportSEBAA';
import { exportEmployment } from '../services/exportEmployment';

import * as XLSX from 'xlsx';

interface ReportsProps {
  clients: Client[];
  sessions: Session[];
  partners: Partner[];
  activeRole: UserRole;
  currentPartnerId?: string;
  currentUserName?: string;
}

const Reports: React.FC<ReportsProps> = ({ clients, sessions, partners, activeRole, currentPartnerId, currentUserName }) => {
  const [startDate, setStartDate] = useState('');
  const [endDate, setEndDate] = useState('');
  const [selectedPartner, setSelectedPartner] = useState('ALL');
  const [selectedStatus, setSelectedStatus] = useState<ReferralStatus | 'ALL'>('ALL');
  const [selectedType, setSelectedType] = useState<SessionType | 'ALL'>('ALL');

  const isAdmin = activeRole === UserRole.ADMIN || activeRole === UserRole.MANAGER;

  // Logique de filtrage des clients pour l'export
  const filteredClients = useMemo(() => {
    return clients.filter(c => {
      const matchPartner = isAdmin 
        ? (selectedPartner === 'ALL' || c.assignedPartnerId === selectedPartner)
        : (c.assignedPartnerId === currentPartnerId);
      
      const matchStatus = selectedStatus === 'ALL' || c.status === selectedStatus;
      
      const clientDate = new Date(c.arrivalDate);
      const matchStart = !startDate || clientDate >= new Date(startDate);
      const matchEnd = !endDate || clientDate <= new Date(endDate);

      return matchPartner && matchStatus && matchStart && matchEnd;
    });
  }, [clients, selectedPartner, selectedStatus, startDate, endDate, isAdmin, currentPartnerId]);

  // Logique de filtrage des séances pour l'export
  const filteredSessions = useMemo(() => {
    return sessions.filter(s => {
      const matchType = selectedType === 'ALL' || s.type === selectedType;
      
      const sessionDate = new Date(s.date);
      const matchStart = !startDate || sessionDate >= new Date(startDate);
      const matchEnd = !endDate || sessionDate <= new Date(endDate);
      
      // Filtrage par conseiller : Les conseillers ne voient que leurs propres séances
      // L'admin et le manager voient tout.
      const matchUser = isAdmin || s.facilitatorName === currentUserName || s.advisorName === currentUserName;

      return matchType && matchStart && matchEnd && matchUser;
    });
  }, [sessions, selectedType, startDate, endDate, isAdmin, currentUserName]);

  const downloadExcel = (data: any[], filename: string) => {
    if (data.length === 0) {
      alert("Aucune donnée à exporter avec les filtres actuels.");
      return;
    }

    // Create worksheet
    const worksheet = XLSX.utils.json_to_sheet(data);

    // Force ALL cells to be strings (Text format in Excel)
    const range = XLSX.utils.decode_range(worksheet['!ref'] || 'A1');
    for (let R = range.s.r; R <= range.e.r; ++R) {
      for (let C = range.s.c; C <= range.e.c; ++C) {
        const cell_address = { c: C, r: R };
        const cell_ref = XLSX.utils.encode_cell(cell_address);
        if (worksheet[cell_ref]) {
          worksheet[cell_ref].t = 's'; // Set type to string
        }
      }
    }

    // Create workbook and append worksheet
    const workbook = XLSX.utils.book_new();
    XLSX.utils.book_append_sheet(workbook, worksheet, "Report");

    // Generate file and trigger download
    XLSX.writeFile(workbook, `${filename}_${new Date().toISOString().split('T')[0]}.xlsx`);
  };

  const downloadCSV = (data: any[], filename: string) => {
    if (data.length === 0) {
      alert("Aucune donnée à exporter avec les filtres actuels.");
      return;
    }

    const headers = Object.keys(data[0]);
    const csvRows = [
      headers.map(h => `"${h.replace(/"/g, '""')}"`).join(','), // header row
      ...data.map(row => 
        headers.map(fieldName => {
          const value = row[fieldName];
          const stringValue = (value === null || value === undefined) ? '' : String(value);
          const escaped = stringValue.replace(/"/g, '""'); // escape double quotes
          return `"${escaped}"`; // wrap in quotes
        }).join(',')
      )
    ];

    const csvContent = "\uFEFF" + csvRows.join('\r\n'); // Add BOM for Excel UTF-8
    const blob = new Blob([csvContent], { type: 'text/csv;charset=utf-8;' });
    const url = URL.createObjectURL(blob);
    const link = document.createElement("a");
    link.setAttribute("href", url);
    link.setAttribute("download", `${filename}_${new Date().toISOString().split('T')[0]}.csv`);
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
  };

  const handleExportClients = () => {
    const exportData = filteredClients.map(c => ({
      ID: c.id,
      Prenom: c.firstName,
      Nom: c.lastName,
      Email: c.email,
      PaysOrigine: c.originCountry,
      Profession: c.profession,
      VilleDestination: c.destinationCity,
      DateArrivee: c.arrivalDate,
      Statut: c.status,
      Consentement: c.consentShared ? 'OUI' : 'NON',
      OrganismeID: c.assignedPartnerId || 'Non assigné',
      OrganismeNom: partners.find(p => p.id === c.assignedPartnerId)?.name || 'N/A'
    }));
    downloadCSV(exportData, 'Arrivio_Export_Clients');
  };

  const handleExportSessions = () => {
    const exportData = filteredSessions.map(s => ({
      ID: s.id,
      Titre: s.title,
      Type: s.type,
      Categorie: s.category,
      Date: s.date,
      Heure: s.startTime,
      DureeMinutes: s.duration,
      Localisation: s.location,
      Facilitateur: s.facilitatorName,
      Conseiller: s.advisorName,
      NbParticipants: s.participantIds?.length || 0,
      NbAbsents: s.noShowIds?.length || 0
    }));
    downloadCSV(exportData, 'Arrivio_Export_Seances');
  };

  const handleExportSEBAAReport = async () => {
    const targetSessions = filteredSessions.filter(s => (s as any).languageOfService);
    if (targetSessions.length === 0) {
      alert("Aucune séance d'évaluation (SÉBAA) trouvée pour la période sélectionnée.");
      return;
    }
    try {
      const fullSessions = await apiService.fetchTable('sessions', { full: 'true', startDate, endDate });
      const mapped = targetSessions.map(ts => {
        const full = fullSessions.find((fs: any) => fs.id === ts.id);
        return full || ts;
      });
      await exportSEBAAReport(mapped, clients);
    } catch (err) {
      console.error("Error exporting SEBAA:", err);
    }
  };

  const handleExportEmploymentReport = async () => {
    const targetSessions = filteredSessions.filter(s => s.type === SessionType.EMPLOYMENT && s.category === SessionCategory.INDIVIDUAL);
    if (targetSessions.length === 0) {
      alert("Aucune séance individuelle du service emploi trouvée pour la période sélectionnée.");
      return;
    }
    try {
      const fullSessions = await apiService.fetchTable('sessions', { full: 'true', startDate, endDate });
      const mapped = targetSessions.map(ts => {
        const full = fullSessions.find((fs: any) => fs.id === ts.id);
        return full || ts;
      });
      await exportEmployment(mapped, clients);
    } catch (err) {
      console.error("Error exporting Employment:", err);
    }
  };

  const handleExportEstablishmentIndividual = async () => {
    // Filtrer : Type ETABLISSEMENT + Categorie INDIVIDUELLE
    let targetSessions = filteredSessions.filter(s => 
      s.type === SessionType.ESTABLISHMENT && s.category === SessionCategory.INDIVIDUAL
    );

    if (targetSessions.length === 0) {
      alert("Aucune séance individuelle du service établissement trouvée pour la période sélectionnée.");
      return;
    }

    // On-demand fetch of full records to get subjects and target groups
    try {
      const fullSessions = await apiService.fetchTable('sessions', { full: 'true', startDate, endDate });
      // Re-filter or update data from full sessions
      targetSessions = targetSessions.map(ts => {
        const full = fullSessions.find((fs: any) => fs.id === ts.id);
        return full || ts;
      });
    } catch (err) {
      console.error("Error fetching full sessions for Establishment export:", err);
    }

    const exportData = targetSessions.map(s => {
      const participantId = s.participantIds?.[0];
      const client = clients.find(c => c.id === participantId);
      
      const subjects = s.subjectsCovered || [];
      const targetGroups = s.targetClientTypes || [];
      const hasTargetGroup = targetGroups.length > 0 && !targetGroups.every(g => g === "Général - pas de groupe de clients spécifique");

      // Construction des 50 colonnes selon le gabarit iEDEC
      return {
        "Détails sur le traitement": "", 
        "ID du dossier à mettre à jour": "", 
        "Type Identificateur unique": (client?.iucCrpNumber?.startsWith('1')) 
          ? "N° d'identité SSOBL ou SMGC du client" 
          : (client?.iucCrpNumber?.toUpperCase().startsWith('T'))
          ? "N° de formulaire IMM5292, IMM5509 ou IMM1000"
          : "#IUC",
        "Valeur de l'identificateur unique": client?.iucCrpNumber || "",
        "Date de naissance du client (AAAA-MM-JJ)": client?.birthDate || "",
        "Courriel du client": client?.email || "",
        "Langue officielle de préférence": "Français",
        "Type de programmation/d'initiative": s.programmingType || "Service standard",
        "Date de début de l'activité (AAAA-MM-JJ)": s.date,
        "Durée de l'activité (heures)": (s.duration / 60).toFixed(2),
        "Emplacement de l'organisation: Code postal (A#A#A#)": "L5B3C4",
        "Emplacement de l’organisation : Pays": "",
        "Emplacement du client: Code postal (A#A#A#)": "",
        "Emplacement du client : Pays": s.clientLocationCountry || client?.residenceCountry || client?.originCountry || "Canada",
        "Langue du client utilisée pendant l'activité": s.languageUsed || "Français",
        "Le service a-t-il été fourni dans un cadre de groupe ou individuel/familial ?": s.serviceSetting || "Informations et Orientation Individuelles/Familiales",
        
        // Sujets abordés (Binary Cols 17-25)
        "Sujet abordé : Informations avant le départ": subjects.includes("Informations avant le départ") ? "Oui" : "",
        "Sujet abordé : Informations nationales": subjects.includes("Informations nationales") ? "Oui" : "",
        "Sujet abordé : Informations provinciales/territoriales": subjects.some(sb => sb.includes("Informations provinciales")) ? "Oui" : "",
        "Sujet abordé : Informations communautaires/municipales": subjects.some(sb => sb.includes("Informations communautaires")) ? "Oui" : "",
        "Sujet abordé : Emploi": subjects.some(sb => sb.toLowerCase().includes("emploi")) ? "Oui" : "",
        "Sujet abordé : Santé et bien-être": subjects.includes("Santé et bien-être") ? "Oui" : "",
        "Sujet abordé : Communautés et opportunités francophones": subjects.includes("Communautés francophones et opportunités") ? "Oui" : "",
        "Sujet abordé : Équité": subjects.includes("Équité") ? "Oui" : "",
        "Sujet abordé : Peuples autochtones": subjects.includes("Peuples autochtones") ? "Oui" : "",

        // Formats (Binary Cols 26-29)
        "Format de l'activité : En personne": s.activityFormat === "En personne" ? "Oui" : "",
        "Format de l'activité : À distance — dirigé par le personnel": (s.activityFormat || "").includes("À distance") ? "Oui" : "",
        "Format de l'activité : À distance — auto-dirigé": s.activityFormat === "Auto-dirigé" ? "Oui" : "",
        "Format de l'activité : À distance par courriel/message texte/téléphone": (s.activityFormat || "").toLowerCase().includes("téléphone") || (s.activityFormat || "").toLowerCase().includes("email") ? "Oui" : "",

        // Groupes cibles (Binary Cols 30-41)
        "Destiné à une population cible spécifique": hasTargetGroup ? "Oui" : "Non",
        "Enfants (0-14 ans)": targetGroups.includes("Enfants (0-14 ans)") ? "Oui" : "",
        "Clients formés à l'étranger dans une profession ou métier réglementé": targetGroups.includes("Clients formés à l'étranger dans une profession ou métier réglementé") ? "Oui" : "",
        "Familles/parents/soignants": targetGroups.includes("Familles/parents/soignants") ? "Oui" : "",
        "Minorités de langue officielle (Francophones)": targetGroups.includes("Minorités de langue officielle (Francophones)") ? "Oui" : "",
        "Personnes handicapées": targetGroups.includes("Personnes handicapées") ? "Oui" : "",
        "Nouveaux arrivants racisés": targetGroups.includes("Nouveaux arrivants racisés") ? "Oui" : "",
        "Réfugiés": targetGroups.includes("Réfugiés") ? "Oui" : "",
        "Personnes âgées (65+)": targetGroups.includes("Personnes âgées (65+)") ? "Oui" : "",
        "Femmes": targetGroups.includes("Femmes") ? "Oui" : "",
        "Jeunes (15-30 ans)": targetGroups.includes("Jeunes (15-30 ans)") ? "Oui" : "",
        "2ELGBTQI+": targetGroups.includes("2ELGBTQI+ (Bispirituel; Lesbienne; Gai; Bisexuel; Transgenre; Queer; Intersexuel et autres)") ? "Oui" : "",

        // Soutien (Binary Cols 42-50)
        "Services de soutien reçus": s.supportReceivedInd ? "Oui" : "Non",
        "Garde d'enfants": s.childmindingReceivedInd ? "Oui" : "",
        "Équipement de soutien numérique": s.digitalEquipmentReceivedInd ? "Oui" : "",
        "Compétences en matière de soutien numérique": s.digitalSkillReceivedInd ? "Oui" : "",
        "Interprétation orale": s.interpretationReceivedInd ? "Oui" : "",
        "Dispositions en raison d’un handicap": s.disabilitySupportReceivedInd ? "Oui" : "",
        "Counseils à court terme": s.counsellingReceivedInd ? "Oui" : "",
        "Transport": s.transportationReceivedInd ? "Oui" : "",
        "Traduction écrite": s.translationReceivedInd ? "Oui" : ""
      };
    });

    downloadExcel(exportData, 'Arrivio_IRCC_Etablissement_Individuel');
  };

  const handleExportNAARS = async () => {
    // Filtrer : Type ETABLISSEMENT + Categorie INDIVIDUELLE (ou tout autre critère NAARS)
    let targetSessions = filteredSessions.filter(s => 
      s.type === SessionType.ESTABLISHMENT && s.category === SessionCategory.INDIVIDUAL
    );

    if (targetSessions.length === 0) {
      alert("Aucune séance d'évaluation trouvée pour la période sélectionnée.");
      return;
    }

    // On-demand fetch of full records for these specific sessions to get NAARS indicators
    try {
      const fullSessions = await apiService.fetchTable('sessions', { full: 'true', startDate: filters.startDate, endDate: filters.endDate });
      // Match back to our filtered set if secondary filters were applied
      targetSessions = fullSessions.filter((fs: any) => targetSessions.some(ts => ts.id === fs.id));
    } catch (err) {
      console.error("Error fetching full sessions for export:", err);
      // Fallback to current (likely compact) sessions
    }

    const exportData = targetSessions.map(s => {
      const participantId = s.participantIds?.[0];
      const client = clients.find(c => c.id === participantId);

      // Cartographie complète des 118 colonnes selon le gabarit iEDEC NAARS
      return {
        "Détails sur le traitement": s.processingDetails || "",
        "ID du dossier à mettre à jour": s.updateRecordId || "",
        "Type Identificateur unique": (client?.iucCrpNumber?.startsWith('1')) ? "N° d'identité SSOBL ou SMGC du client" : (client?.iucCrpNumber?.toUpperCase().startsWith('T')) ? "N° de formulaire IMM5292, IMM5509 ou IMM1000" : "#IUC",
        "Valeur de l'identificateur unique": client?.iucCrpNumber || '',
        "Date de naissance du client (AAAA-MM-JJ)": client?.birthDate || '',
        "Courriel du client": client?.email || '',
        "Langue officielle de préférence": 'Français',
        "Type de programmation/d'initiative": s.programmingType || 'Service standard',
        "Date de début de l'évaluation (AAAA-MM-JJ)": s.date || "",
        "Durée de l'évaluation (heures)": (s.duration / 60).toFixed(2) || "",
        "Emplacement de l’organisation: Code postal (A#A#A#)": 'L5B3C4',
        "Emplacement de l’organisation: Pays": '' || "",
        "Emplacement du client: Code postal (A#A#A#)": '' || "",
        "Emplacement du client: Pays": s.clientLocationCountry || client?.residenceCountry || client?.originCountry || 'Canada',
        "Langue utilisée le plus souvent par le client lors de l'évaluation": s.languageUsed || 'Français',
        "Cette évaluation est-elle le résultat d'un suivi formel ?": s.formalFollowUpInd ? "Oui" : "",
        "Client dispose d’actifs pour subvenir à ses besoins au Canada": s.lifeAssetInd ? "Oui" : "Non",
        "Réseaux familiaux et personnels": s.lifeAssetFamilyNetworksInd ? "Oui" : "",
        "Connaissance du Canada, des services gouvernementaux et d'autres services": s.lifeAssetKnowledgeServicesInd ? "Oui" : "",
        "Motivation liée à d'établissement et à l'intégration": s.lifeAssetSettlementMotivationInd ? "Oui" : "",
        "Autres compétences ou expériences utiles à la communauté ou au client": s.lifeAssetOtherSkillsInd ? "Oui" : "",
        "Client a des besoins liés à la vie au Canada": s.lifeNeedsInd ? "Oui" : "Non",
        "La vie au Canada de Besoins: Besoins de base": s.lifeNeedsBasicIdentifiedInd ? "Oui" : "",
        "La vie au Canada de Besoins - Aiguillé": s.lifeNeedsBasicReferralInd ? "Oui" : "",
        "La vie au Canada de Besoins - Aiguillage vers aux services financés": s.lifeNeedsBasicFundedReferralId || "",
        "La vie au Canada de Besoins: Famille et des enfants": s.lifeNeedsFamilyChildrenIdentifiedInd ? "Oui" : "",
        "La vie au Canada de Besoins - Aiguillé\u200B": s.lifeNeedsFamilyChildrenReferralInd ? "Oui" : "",
        "La vie au Canada de Besoins - Aiguillage vers aux services financés\u200B": s.lifeNeedsFamilyChildrenFundedReferralId || "",
        "La vie au Canada de Besoins: Santé et de santé mentale": s.lifeNeedsHealthAndMentalIdentifiedInd ? "Oui" : "",
        "La vie au Canada de Besoins - Aiguillé\u200B\u200B": s.lifeNeedsHealthAndMentalReferralInd ? "Oui" : "",
        "La vie au Canada de Besoins - Aiguillage vers aux services financés\u200B\u200B": s.lifeNeedsHealthAndMentalFundedReferralId || "",
        "La vie au Canada de Besoins: Logement": s.lifeNeedsHousingIdentifiedInd ? "Oui" : "",
        "La vie au Canada de Besoins - Aiguillé\u200B\u200B\u200B": s.lifeNeedsHousingReferralInd ? "Oui" : "",
        "La vie au Canada de Besoins - Aiguillage vers aux services financés\u200B\u200B\u200B": s.lifeNeedsHousingFundedReferralId || "",
        "La vie au Canada de Besoins: Connaissance des services gouvernementaux": s.lifeNeedsGovernmentKnowledgeIdentifiedInd ? "Oui" : "",
        "La vie au Canada de Besoins - Aiguillé\u200B\u200B\u200B\u200B": s.lifeNeedsGovernmentKnowledgeNoReferralInd ? "Oui" : "",
        "La vie au Canada de Besoins - Aiguillage vers aux services financés\u200B\u200B\u200B\u200B": s.lifeNeedsGovernmentKnowledgeFundedReferralId || "",
        "La vie au Canada de Besoins: Connaissance du Canada": s.lifeNeedsCanadaKnowledgeIdentifiedInd ? "Oui" : "",
        "La vie au Canada de Besoins - Aiguillé\u200B\u200B\u200B\u200B\u200B": s.lifeNeedsCanadaKnowledgeReferralInd ? "Oui" : "",
        "La vie au Canada de Besoins - Aiguillage vers aux services financés\u200B\u200B\u200B\u200B\u200B": s.lifeNeedsCanadaKnowledgeFundedReferralId || "",
        "La vie au Canada de Besoins: Juridiques": s.lifeNeedsLegalIdentifiedInd ? "Oui" : "",
        "La vie au Canada de Besoins - Aiguillé\u200B\u200B\u200B\u200B\u200B\u200B": s.lifeNeedsLegalReferralInd ? "Oui" : "",
        "La vie au Canada de Besoins - Aiguillage vers aux services financés\u200B\u200B\u200B\u200B\u200B\u200B": s.lifeNeedsLegalFundedReferralId || "",
        "La vie au Canada de Besoins: Financiers": s.lifeNeedsFinancialIdentifiedInd ? "Oui" : "",
        "La vie au Canada de Besoins - Aiguillé\u200B\u200B\u200B\u200B\u200B\u200B\u200B": s.lifeNeedsFinancialReferralInd ? "Oui" : "",
        "La vie au Canada de Besoins - Aiguillage vers aux services financés\u200B\u200B\u200B\u200B\u200B\u200B\u200B": s.lifeNeedsFinancialFundedReferralId || "",
        "La vie au Canada de Besoins: Connaissance communautaire": s.lifeNeedsCommunityKnowledgeIdentifiedInd ? "Oui" : "",
        "La vie au Canada de Besoins - Aiguillé\u200B\u200B\u200B\u200B\u200B\u200B\u200B\u200B": s.lifeNeedsCommunityKnowledgeReferralInd ? "Oui" : "",
        "La vie au Canada de Besoins - Aiguillage vers aux services financés\u200B\u200B\u200B\u200B\u200B\u200B\u200B\u200B": s.lifeNeedsCommunityKnowledgeFundedReferralId || "",
        "La vie au Canada de Besoins: Réseautage social": s.lifeNeedsSocialNetworkingIdentifiedInd ? "Oui" : "",
        "La vie au Canada de Besoins - Aiguillé\u200B\u200B\u200B\u200B\u200B\u200B\u200B\u200B\u200B": s.lifeNeedsSocialNetworkingReferralInd ? "Oui" : "",
        "La vie au Canada de Besoins - Aiguillage vers aux services financés\u200B\u200B\u200B\u200B\u200B\u200B\u200B\u200B\u200B": s.lifeNeedsSocialNetworkingFundedReferralId || "",
        "La vie au Canada de Besoins: Faire face au racisme et à la discrimination": s.lifeNeedsRacismIdentifiedInd ? "Oui" : "",
        "La vie au Canada de Besoins - Aiguillé\u200B\u200B\u200B\u200B\u200B\u200B\u200B\u200B\u200B\u200B": s.lifeNeedsRacismReferralInd ? "Oui" : "",
        "La vie au Canada de Besoins - Aiguillage vers aux services financés\u200B\u200B\u200B\u200B\u200B\u200B\u200B\u200B\u200B\u200B": s.lifeNeedsRacismFundedReferralId || "",
        "Client identifie-t-il des atouts liés à la langue": s.languageAssetInd ? "Oui" : "Non",
        "Connaissance suffisante de l'anglais en vue de communiquer facilement": s.languageAssetEnglishInd ? "Oui" : "",
        "Connaissance suffisante du français en vue de communiquer facilement": s.languageAssetFrenchInd ? "Oui" : "",
        "Autres compétences en communication (par exemple ALS/LSQ)": s.languageAssetOtherInd ? "Oui" : "",
        "Client a-t-il des besoins linguistiques": s.languageNeedsInd ? "Oui" : "Non",
        "Langue Besoins: Langues officielles": s.languageNeedsOfficialIdentifiedNeedInd ? "Oui" : "",
        "Langue Besoins - Langue": s.languageNeedsOfficialLanguageId || "",
        "Langue Besoins - Aiguillé": s.languageNeedsOfficialReferralInd ? "Oui" : "",
        "Langue Besoins - Aiguillage vers aux services financés": s.languageNeedsOfficialFundedReferralId || "",
        "Langue Besoins: Littéracie": s.languageNeedsLiteracyIdentifiedNeedInd ? "Oui" : "",
        "Langue Besoins - Langue\u200B": s.languageNeedsLiteracyLanguageId || "",
        "Langue Besoins - Aiguillé\u200B": s.languageNeedsLiteracyReferralInd ? "Oui" : "",
        "Langue Besoins - Aiguillage vers aux services financés\u200B": s.languageNeedsLiteracyFundedReferralId || "",
        "Langue Besoins: Langue de travail": s.languageNeedsEmploymentIdentifiedNeedInd ? "Oui" : "",
        "Langue Besoins - Langue\u200B\u200B": s.languageNeedsEmploymentLanguageId || "",
        "Langue Besoins - Aiguillé\u200B\u200B": s.languageNeedsEmploymentReferralInd ? "Oui" : "",
        "Langue Besoins - Aiguillage vers aux services financés\u200B\u200B": s.languageNeedsEmploymentFundedReferralId || "",
        "Client possède des actifs liés à l'emploi ou à l'éducation des adultes": s.employmentAssetInd ? "Oui" : "Non",
        "Emploi et éducation des adultes: Actuellement employé au Canada": s.employmentAssetEmployedInd ? "Oui" : "",
        "Emploi et éducation des adultes: Diplôme étranger reconnu au Canada": s.employmentAssetForeignCredentialInd ? "Oui" : "",
        "Emploi et éducation des adultes: Connaissance du marché du travail canadien": s.employmentAssetLabourMarketInd ? "Oui" : "",
        "Emploi et éducation des adultes: Diplôme/certificat d'études postsecondaires obtenu au Canada": s.employmentAssetDegreeInCanadaInd ? "Oui" : "",
        "Emploi et éducation des adultes: Diplôme/certificat d'études postsecondaires obtenu à l'étrange": s.employmentAssetDegreeOutsideCanadaInd ? "Oui" : "",
        "Emploi et éducation des adultes: Expérience professionnelle antérieure au Canada": s.employmentAssetPreviousEmploymentInd ? "Oui" : "",
        "Emploi et éducation des adultes: Formation liée à l'emploi suivie ou terminée": s.employmentAssetJobRelatedTrainingInd ? "Oui" : "",
        "Emploi et éducation des adultes: Expérience de travail en dehors du Canada": s.employmentAssetWorkExperienceOutsideCanadaInd ? "Oui" : "",
        "Emploi et éducation des adultes: Autres compétences ou expériences spécialisées/liées au travail": s.employmentAssetOtherSkillsInd ? "Oui" : "",
        "Client a des besoins liés à l'emploi ou à l'éducation des adultes": s.employmentNeedsInd ? "Oui" : "Non",
        "Besoins à l'emploi ou à l'éducation des adultes: Connaissance du marché du travail canadien": s.employmentLabourMarketNeedInd ? "Oui" : "",
        "Besoins à l'emploi ou à l'éducation des adultes - Aiguillé": s.employmentLabourMarketReferralInd ? "Oui" : "",
        "Besoins à l'emploi ou à l'éducation des adultes - Aiguillage vers aux services financés": s.employmentLabourMarketFundedReferralId || "",
        "Besoins à l'emploi ou à l'éducation des adultes: Trouver un emploi au Canada": s.employmentFindingEmploymentNeedInd ? "Oui" : "",
        "Besoins à l'emploi ou à l'éducation des adultes - Aiguillé\u200B": s.employmentFindingEmploymentReferralInd ? "Oui" : "",
        "Besoins à l'emploi ou à l'éducation des adultes - Aiguillage vers aux services financés\u200B": s.employmentFindingEmploymentFundedReferralId || "",
        "Besoins à l'emploi ou à l'éducation des adultes: Qualifications": s.employmentCredentialsNeedInd ? "Oui" : "",
        "Besoins à l'emploi ou à l'éducation des adultes - Aiguillé\u200B\u200B": s.employmentCredentialsReferralInd ? "Oui" : "",
        "Besoins à l'emploi ou à l'éducation des adultes - Aiguillage vers aux services financés\u200B\u200B": s.employmentCredentialsFundedReferralId || "",
        "Besoins à l'emploi ou à l'éducation des adultes: Éducation": s.employmentEducationNeedInd ? "Oui" : "",
        "Besoins à l'emploi ou à l'éducation des adultes - Aiguillé\u200B\u200B\u200B": s.employmentEducationReferralInd ? "Oui" : "",
        "Besoins à l'emploi ou à l'éducation des adultes - Aiguillage vers aux services financés\u200B\u200B\u200B": s.employmentEducationFundedReferralId || "",
        "Format de l'évaluation: En personne": s.formatInPersonInd ? "Oui" : "",
        "Format de l'évaluation: À distance - dirigé par le personnel": s.formatRemoteStaffInd ? "Oui" : "",
        "Format de l'évaluation: À distance - auto-dirigé": s.formatRemoteSelfInd ? "Oui" : "",
        "Format de l'évaluation: À distance par courriel/message texte/téléphone": s.formatRemoteEmailTextPhoneInd ? "Oui" : "",
        "Services de soutien reçus": s.supportReceivedInd ? "Oui" : "Non",
        "Garde d'enfants": s.childmindingReceivedInd ? "Oui" : "",
        "Équipement de soutien numérique": s.digitalEquipmentReceivedInd ? "Oui" : "",
        "Compétences en matière de soutien numérique": s.digitalSkillReceivedInd ? "Oui" : "",
        "Interprétation orale": s.interpretationReceivedInd ? "Oui" : "",
        "Dispositions en raison d’un handicap": s.disabilitySupportReceivedInd ? "Oui" : "",
        "Counseils à court terme": s.counsellingReceivedInd ? "Oui" : "",
        "Transport": s.transportationReceivedInd ? "Oui" : "",
        "Traduction écrite": s.translationReceivedInd ? "Oui" : "",
        "Services de soutien requis": s.supportRequiredInd ? "Oui" : "Non",
        "Garde d'enfants\u200B": s.childmindingRequiredInd ? "Oui" : "",
        "Équipement de soutien numérique\u200B": s.digitalEquipmentRequiredInd ? "Oui" : "",
        "Compétences en matière de soutien numérique\u200B": s.digitalSkillRequiredInd ? "Oui" : "",
        "Interprétation orale\u200B": s.interpretationRequiredInd ? "Oui" : "",
        "Dispositions en raison d’un handicap\u200B": s.disabilitySupportRequiredInd ? "Oui" : "",
        "Transport\u200B": s.transportationRequiredInd ? "Oui" : "",
        "Traduction écrite\u200B": s.translationRequiredInd ? "Oui" : "",
        "Le plan d'établissement a-t-il été créé et partagé avec le client ?": s.settlementPlanCreatedInd ? "Oui" : "",
        "Le client a-t-il été aiguillé vers un fournisseur de services francophone ?": s.francophoneReferredId || "",
        "Le client a-t-il été aiguillé vers la Gestion des cas ?": s.caseManagementReferredId || "",
      };
    });

    downloadExcel(exportData, 'Arrivio_IRCC_NAARS_Evaluation');
  };

  return (
    <div className="space-y-8 animate-in fade-in duration-500">
      {/* Header et Filtres Globaux SLDS */}
      <div className="slds-card p-6 space-y-6">
        <div className="flex items-center gap-4">
          <div className="p-2 bg-slds-brand text-white rounded shadow-sm">
            <FileDown size={24} />
          </div>
          <div>
            <h2 className="text-lg font-bold text-slds-text-primary">Centre d'Extraction de Données</h2>
            <p className="text-[10px] text-slds-text-secondary font-bold uppercase tracking-widest mt-1">Générez vos rapports IRCC et exports personnalisés</p>
          </div>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4 pt-4 border-t border-slds-border">
          <div className="space-y-1">
            <label className="text-[10px] font-bold text-slds-text-secondary uppercase tracking-widest flex items-center gap-1">
              <Calendar size={12} /> Date de début
            </label>
            <input 
              type="date" 
              value={startDate}
              onChange={(e) => setStartDate(e.target.value)}
              className="slds-input" 
            />
          </div>
          <div className="space-y-1">
            <label className="text-[10px] font-bold text-slds-text-secondary uppercase tracking-widest flex items-center gap-1">
              <Calendar size={12} /> Date de fin
            </label>
            <input 
              type="date" 
              value={endDate}
              onChange={(e) => setEndDate(e.target.value)}
              className="slds-input" 
            />
          </div>
          {isAdmin && (
            <div className="space-y-1">
              <label className="text-[10px] font-bold text-slds-text-secondary uppercase tracking-widest flex items-center gap-1">
                <Building2 size={12} /> Organisme
              </label>
              <select 
                value={selectedPartner}
                onChange={(e) => setSelectedPartner(e.target.value)}
                className="slds-input"
              >
                <option value="ALL">Tous les organismes</option>
                {partners.map(p => <option key={p.id} value={p.id}>{p.name}</option>)}
              </select>
            </div>
          )}
          <div className="space-y-1">
             <label className="text-[10px] font-bold text-slds-text-secondary uppercase tracking-widest flex items-center gap-1">
               <Clock size={12} /> Rapidité
             </label>
             <div className="slds-input bg-slds-bg text-[10px] font-bold text-slds-brand flex items-center justify-center text-center h-[32px]">
               Génération instantanée via Cloud
             </div>
          </div>
        </div>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
        {/* Colonne Export Clients SLDS */}
        <div className="slds-card overflow-hidden flex flex-col group hover:border-slds-brand transition-all">
          <div className="p-6 border-b border-slds-border bg-slds-bg">
             <div className="flex justify-between items-start mb-4">
                <div className="p-3 bg-white text-slds-brand rounded border border-slds-border shadow-sm group-hover:scale-105 transition-transform">
                  <Users size={24} />
                </div>
                <div className="text-right">
                   <p className="text-2xl font-bold text-slds-text-primary leading-none">{filteredClients.length}</p>
                   <p className="text-[9px] font-bold text-slds-text-secondary uppercase tracking-widest mt-1">Dossiers correspondants</p>
                </div>
             </div>
             <h3 className="text-base font-bold text-slds-text-primary">Rapport des Données Clients</h3>
             <p className="text-slds-text-secondary text-xs mt-2 font-medium leading-relaxed">
               Export complet des profils incluant les informations démographiques, les besoins et le statut de référencement.
             </p>
          </div>
          
          <div className="p-6 space-y-4 flex-1">
             <div className="space-y-2">
                <label className="text-[10px] font-bold text-slds-text-secondary uppercase tracking-widest">Affiner par statut</label>
                <div className="flex flex-wrap gap-2">
                   <button 
                    onClick={() => setSelectedStatus('ALL')}
                    className={`px-3 py-1 rounded text-[9px] font-bold uppercase tracking-widest border transition-all ${selectedStatus === 'ALL' ? 'bg-slds-brand text-white border-slds-brand' : 'bg-white text-slds-text-secondary border-slds-border hover:border-slds-brand'}`}
                   >
                     Tous
                   </button>
                   {Object.values(ReferralStatus).map(st => (
                     <button 
                      key={st}
                      onClick={() => setSelectedStatus(st)}
                      className={`px-3 py-1 rounded text-[9px] font-bold uppercase tracking-widest border transition-all ${selectedStatus === st ? 'bg-slds-brand text-white border-slds-brand' : 'bg-white text-slds-text-secondary border-slds-border hover:border-slds-brand'}`}
                     >
                       {st.replace(/_/g, ' ')}
                     </button>
                   ))}
                </div>
             </div>
          </div>

          <div className="p-4 bg-slds-bg border-t border-slds-border mt-auto">
             <button 
              onClick={handleExportClients}
              className="slds-button slds-button-brand w-full flex items-center justify-center gap-2"
             >
               <Download size={14} /> Exporter Clients (.csv)
             </button>
          </div>
        </div>

        {/* Colonne Export Séances SLDS */}
        <div className="slds-card overflow-hidden flex flex-col group hover:border-slds-brand transition-all">
          <div className="p-6 border-b border-slds-border bg-slds-bg">
             <div className="flex justify-between items-start mb-4">
                <div className="p-3 bg-white text-slds-brand rounded border border-slds-border shadow-sm group-hover:scale-105 transition-transform">
                  <Activity size={24} />
                </div>
                <div className="text-right">
                   <p className="text-2xl font-bold text-slds-text-primary leading-none">{filteredSessions.length}</p>
                   <p className="text-[9px] font-bold text-slds-text-secondary uppercase tracking-widest mt-1">Activités correspondantes</p>
                </div>
             </div>
             <h3 className="text-base font-bold text-slds-text-primary">Rapport d'Activité & Séances</h3>
             <p className="text-slds-text-secondary text-xs mt-2 font-medium leading-relaxed">
               Détail des prestations de services, fréquentation et imputation des contrats pour la période sélectionnée.
             </p>
          </div>
          
          <div className="p-6 space-y-4 flex-1">
             <div className="space-y-2">
                <label className="text-[10px] font-bold text-slds-text-secondary uppercase tracking-widest">Filtrer par type de service</label>
                <div className="flex flex-wrap gap-2">
                   <button 
                    onClick={() => setSelectedType('ALL')}
                    className={`px-3 py-1 rounded text-[9px] font-bold uppercase tracking-widest border transition-all ${selectedType === 'ALL' ? 'bg-slds-brand text-white border-slds-brand' : 'bg-white text-slds-text-secondary border-slds-border hover:border-slds-brand'}`}
                   >
                     Tous les services
                   </button>
                   {Object.values(SessionType).map(t => (
                     <button 
                      key={t}
                      onClick={() => setSelectedType(t)}
                      className={`px-3 py-1 rounded text-[9px] font-bold uppercase tracking-widest border transition-all ${selectedType === t ? 'bg-slds-brand text-white border-slds-brand' : 'bg-white text-slds-text-secondary border-slds-border hover:border-slds-brand'}`}
                     >
                       {SESSION_TYPE_LABELS[t]}
                     </button>
                   ))}
                </div>
             </div>
          </div>

          <div className="p-4 bg-slds-bg border-t border-slds-border mt-auto space-y-2">
             <button 
              onClick={handleExportSessions}
              className="slds-button slds-button-neutral w-full flex items-center justify-center gap-2"
             >
               <Download size={14} /> Exporter Séances (.csv)
             </button>
             <button 
              onClick={handleExportSEBAAReport}
              className="slds-button slds-button-neutral w-full flex items-center justify-center gap-2"
             >
               <Download size={14} /> Rapport IRCC SÉBAA
             </button>
             <button 
              onClick={handleExportEmploymentReport}
              className="slds-button slds-button-neutral w-full flex items-center justify-center gap-2 border-indigo-200 text-indigo-700 hover:bg-indigo-50"
             >
               <Briefcase size={14} /> Rapport IRCC Emploi (SLE)
             </button>
             <button 
              onClick={handleExportEstablishmentIndividual}
              className="slds-button slds-button-neutral w-full flex items-center justify-center gap-2"
             >
               <TableIcon size={14} /> Rapport IRCC Établissement (I&O)
             </button>
             <button 
              onClick={handleExportNAARS}
              className="slds-button slds-button-brand w-full flex items-center justify-center gap-2"
             >
               <Download size={14} /> Rapport IRCC Évaluation (NAARS)
             </button>
          </div>
        </div>
      </div>

      {/* Footer Info SLDS */}
      <div className="slds-card p-8 bg-slds-text-primary text-white flex flex-col md:flex-row items-center justify-between gap-6 relative overflow-hidden">
        <div className="absolute top-0 right-0 p-12 text-white/5 pointer-events-none">
          <TableIcon size={120} />
        </div>
        <div className="max-w-xl relative z-10 text-center md:text-left">
           <h4 className="text-lg font-bold tracking-tight mb-2">Conformité IRCC & Confidentialité</h4>
           <p className="text-slds-border text-xs font-medium leading-relaxed">
             Les exports générés via Arrivio respectent les normes de protection des données. Assurez-vous que le stockage des fichiers téléchargés sur vos postes de travail est conforme aux politiques de sécurité du Centre Francophone du Grand Toronto.
           </p>
        </div>
        <div className="flex gap-4 relative z-10 shrink-0">
          <div className="px-6 py-4 bg-white/5 border border-white/10 rounded flex flex-col items-center">
            <CheckCircle2 size={24} className="text-slds-success mb-2" />
            <p className="text-[9px] font-bold uppercase tracking-tighter text-slds-border">Format Standard</p>
          </div>
          <div className="px-6 py-4 bg-white/5 border border-white/10 rounded flex flex-col items-center">
            <AlertCircle size={24} className="text-slds-brand mb-2" />
            <p className="text-[9px] font-bold uppercase tracking-tighter text-slds-border">Audit activé</p>
          </div>
        </div>
      </div>
    </div>
  );
};

export default Reports;
