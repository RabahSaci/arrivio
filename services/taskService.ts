import { Session, Client, Contract, Profile, WorkflowTask, TaskStatus, TaskPriority, TaskType, SessionCategory, SessionType, AttendanceStatus } from '../types';

/**
 * Génère une signature unique pour identifier si une tâche a déjà été créée pour un objet.
 */
const generateSignature = (type: TaskType, entityId: string): string => `${type}_${entityId}`;

/**
 * Moteur de scan automatisé des tâches.
 */
export const refreshAutomatedTasks = (
  allSessions: Session[],
  allClients: Client[],
  allContracts: Contract[],
  allProfiles: Profile[],
  existingTasks: WorkflowTask[],
  currentUserName: string,
  currentUserId: string
): WorkflowTask[] => {
  const newTasks: WorkflowTask[] = [...existingTasks];
  const now = new Date();
  const todayStr = now.toLocaleDateString('en-CA'); // YYYY-MM-DD local

  // Helper to find advisor name
  const getAdvisorInfo = (id: string | null | undefined) => {
    if (!id) return { id: currentUserId, name: currentUserName };
    const p = allProfiles.find(prof => prof.id === id);
    return p ? { id: p.id, name: `${p.firstName} ${p.lastName}` } : { id: currentUserId, name: currentUserName };
  };

  // 1. SCAN SESSIONS (Webinaires terminés sans participants)
  allSessions.forEach(session => {
    if (session.category === SessionCategory.GROUP) {
      const sessionDate = new Date(session.date);
      // Si la séance est passée
      if (sessionDate < now) {
        // Et qu'il n'y a pas encore de participants téléversés
        if (session.participantIds.length <= 0) {
          const signature = generateSignature('UPLOAD_PARTICIPANTS', session.id);
          const alreadyExists = existingTasks.some(t => t.processedSignature === signature);

          if (!alreadyExists) {
            const timeDiff = now.getTime() - sessionDate.getTime();
            const hoursPassed = timeDiff / (1000 * 3600);
            const adv = getAdvisorInfo(session.advisorId);
            
            newTasks.push({
              id: `task-session-${Date.now()}-${Math.random().toString(36).substr(2, 9)}`,
              type: 'UPLOAD_PARTICIPANTS',
              title: `Téléverser participants : ${session.title}`,
              description: `La séance du ${session.date} est terminée. Veuillez téléverser la liste des participants.`,
              status: TaskStatus.PENDING,
              priority: hoursPassed > 24 ? TaskPriority.CRITICAL : TaskPriority.HIGH,
              assignedToId: adv.id,
              assignedToName: adv.name,
              relatedEntityId: session.id,
              relatedEntityType: 'SESSION',
              dueDate: todayStr,
              createdAt: now.toISOString(),
              processedSignature: signature
            });
          }
        }
      }
    } else if (session.category === SessionCategory.INDIVIDUAL) {
      // 1.1 SCAN SESSIONS INDIVIDUELLES (Compte-rendu manquant)
      const sessionDate = new Date(session.date);
      // RÈGLE : Une tâche iEDEC pour CHAQUE séance individuelle où le client est présent
      if (session.individualStatus === AttendanceStatus.PRESENT) {
        const signature = generateSignature('FILL_SESSION_FOLLOWUP', session.id);
        const alreadyExists = existingTasks.some(t => t.processedSignature === signature);

        if (!alreadyExists) {
          const adv = getAdvisorInfo(session.advisorId);
          newTasks.push({
            id: `task-indiv-${Date.now()}-${Math.random().toString(36).substr(2, 9)}`,
            type: 'FILL_SESSION_FOLLOWUP',
            title: `Saisir sur iEDEC : ${session.title}`,
            description: `La séance individuelle du ${session.date} (${session.type}) est terminée. Merci de procéder à la saisie sur iEDEC.`,
            status: TaskStatus.PENDING,
            priority: TaskPriority.HIGH,
            assignedToId: adv.id,
            assignedToName: adv.name,
            relatedEntityId: session.id,
            relatedEntityType: 'SESSION',
            dueDate: todayStr,
            createdAt: now.toISOString(),
            processedSignature: signature
          });
        }
      }
    }
  });

  // 2. SCAN CLIENTS (Cibles: Statut EN_ATTENTE + Séance Établissement)
  allClients.forEach(client => {
    // Si le client est en attente de référencement
    if (client.status === 'EN_ATTENTE') {
      const signature = generateSignature('REFER_CLIENT', client.id);
      const alreadyExists = existingTasks.some(t => t.processedSignature === signature);

      if (!alreadyExists) {
        // A. Trouvons la séance "Établissement" Individuelle la plus récente de ce client
        const establishmentSessions = allSessions
          .filter(s => 
            s.type === SessionType.ESTABLISHMENT && 
            s.category === SessionCategory.INDIVIDUAL && 
            s.individualStatus === AttendanceStatus.PRESENT &&
            s.participantIds?.includes(client.id) &&
            new Date(s.date) >= new Date('2025-04-01')
          )
          .sort((a, b) => new Date(b.date).getTime() - new Date(a.date).getTime());

        const lastSession = establishmentSessions[0];

        // RÈGLE : Pas de tâche si aucune séance établissement trouvée
        if (!lastSession) return;

        // B. Identifions le conseiller responsable
        let assignedToId = '';
        let assignedToName = '';

        if (lastSession.advisorId) {
          const advInfo = getAdvisorInfo(lastSession.advisorId);
          assignedToId = advInfo.id;
          assignedToName = advInfo.name;
        } else if (lastSession.advisorName) {
          // Tentative de matching par nom (robuste)
          const queryName = lastSession.advisorName.toLowerCase().trim();
          const matchedProfile = allProfiles.find(p => {
            const fullName = `${p.firstName} ${p.lastName}`.toLowerCase().trim();
            return fullName === queryName || p.email.toLowerCase() === queryName || p.firstName.toLowerCase() === queryName;
          });

          if (matchedProfile) {
            assignedToId = matchedProfile.id;
            assignedToName = `${matchedProfile.firstName} ${matchedProfile.lastName}`;
          }
        }

        // Fallback final si mapping échoue
        if (!assignedToId) {
          const fallback = getAdvisorInfo(client.referredById || (client as any).referred_by_id);
          assignedToId = fallback.id;
          assignedToName = fallback.name;
        }

        let daysLeft = 999;
        if (client.arrivalDate) {
          const arrivalDate = new Date(client.arrivalDate);
          const timeDiff = arrivalDate.getTime() - now.getTime();
          daysLeft = Math.ceil(timeDiff / (1000 * 3600 * 24));
        }

        // Détermination de la priorité
        let priority = TaskPriority.MEDIUM;
        if (daysLeft <= 3) priority = TaskPriority.CRITICAL;
        else if (daysLeft <= 15) priority = TaskPriority.HIGH;

        newTasks.push({
          id: `task-client-${Date.now()}-${Math.random().toString(36).substr(2, 9)}`,
          type: 'REFER_CLIENT',
          title: `Référencement à faire : ${client.firstName} ${client.lastName}`,
          description: lastSession 
            ? `Client rencontré lors de la séance "${lastSession.title}" le ${lastSession.date}.`
            : client.arrivalDate 
              ? `Le client arrive le ${client.arrivalDate}.`
              : `Client en attente de référencement.`,
          status: TaskStatus.PENDING,
          priority: priority,
          assignedToId: assignedToId,
          assignedToName: assignedToName,
          relatedEntityId: client.id,
          relatedEntityType: 'CLIENT',
          dueDate: todayStr,
          createdAt: now.toISOString(),
          processedSignature: signature
        });
      }
    }
  });

  // 3. SCAN CONTRATS (Usage > 90%)
  allContracts.forEach(contract => {
    if (contract.status === 'ACTIVE') {
      const usagePercent = (contract.usedSessions / contract.totalSessions) * 100;
      if (usagePercent >= 90) {
        const signature = generateSignature('RENEW_CONTRACT', contract.id);
        const alreadyExists = existingTasks.some(t => t.processedSignature === signature);

        if (!alreadyExists) {
          newTasks.push({
            id: `task-contract-${Date.now()}-${Math.random().toString(36).substr(2, 9)}`,
            type: 'RENEW_CONTRACT',
            title: `Renouvellement contrat : ${contract.consultantName}`,
            description: `Le contrat ${contract.id} a atteint ${usagePercent.toFixed(0)}% de son quota. Prévoir un renouvellement.`,
            status: TaskStatus.PENDING,
            priority: TaskPriority.MEDIUM,
            assignedToId: 'ADMIN-1', // Les contrats vont à l'admin
            assignedToName: 'Administrateur',
            relatedEntityId: contract.id,
            relatedEntityType: 'CONTRACT',
            dueDate: todayStr,
            createdAt: now.toISOString(),
            processedSignature: signature
          });
        }
      }
    }
  });

  return newTasks;
};

/**
 * Purge les tâches terminées depuis plus de 7 jours.
 */
export const purgeOldTasks = (tasks: WorkflowTask[]): WorkflowTask[] => {
  const now = new Date();
  const sevenDaysInMs = 7 * 24 * 60 * 60 * 1000;

  return tasks.filter(task => {
    if (task.status === TaskStatus.COMPLETED && task.completedAt) {
      const completionDate = new Date(task.completedAt);
      return (now.getTime() - completionDate.getTime()) < sevenDaysInMs;
    }
    return true;
  });
};
