import { Session, Client, Contract, WorkflowTask, TaskStatus, TaskPriority, TaskType, SessionCategory } from '../types';

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
  existingTasks: WorkflowTask[],
  currentUserName: string,
  currentUserId: string
): WorkflowTask[] => {
  const newTasks: WorkflowTask[] = [...existingTasks];
  const now = new Date();
  const todayStr = now.toISOString().split('T')[0];

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
            
            newTasks.push({
              id: `task-session-${Date.now()}-${Math.random().toString(36).substr(2, 9)}`,
              type: 'UPLOAD_PARTICIPANTS',
              title: `Téléverser participants : ${session.title}`,
              description: `La séance du ${session.date} est terminée. Veuillez téléverser la liste des participants.`,
              status: TaskStatus.PENDING,
              priority: hoursPassed > 24 ? TaskPriority.CRITICAL : TaskPriority.HIGH,
              assignedToId: session.advisorId || currentUserId,
              assignedToName: session.advisorName || currentUserName,
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
      if (sessionDate < now) {
        // Si les notes, actions ou besoins discutés sont vides
        const isFollowUpEmpty = !session.notes && !session.actions && !session.discussedNeeds;
        
        if (isFollowUpEmpty) {
          const signature = generateSignature('FILL_SESSION_FOLLOWUP', session.id);
          const alreadyExists = existingTasks.some(t => t.processedSignature === signature);

          if (!alreadyExists) {
            newTasks.push({
              id: `task-indiv-${Date.now()}-${Math.random().toString(36).substr(2, 9)}`,
              type: 'FILL_SESSION_FOLLOWUP',
              title: `Saisir sur iEDEC : ${session.title}`,
              description: `La séance individuelle du ${session.date} est terminée. Merci de procéder à la saisie des informations sur iEDEC.`,
              status: TaskStatus.PENDING,
              priority: TaskPriority.HIGH,
              assignedToId: session.advisorId || currentUserId,
              assignedToName: session.advisorName || currentUserName,
              relatedEntityId: session.id,
              relatedEntityType: 'SESSION',
              dueDate: todayStr,
              createdAt: now.toISOString(),
              processedSignature: signature
            });
          }
        }
      }
    }
  });

  // 2. SCAN CLIENTS (Arrivée imminente <= 15 jours)
  allClients.forEach(client => {
    if (client.arrivalDate && client.status !== 'REFERE' && client.status !== 'FERME') {
      const arrivalDate = new Date(client.arrivalDate);
      const timeDiff = arrivalDate.getTime() - now.getTime();
      const daysLeft = Math.ceil(timeDiff / (1000 * 3600 * 24));

      if (daysLeft <= 15 && daysLeft >= -5) { // Uniquement si c'est proche (jusqu'à 5 jours après)
        const signature = generateSignature('REFER_CLIENT', client.id);
        const alreadyExists = existingTasks.some(t => t.processedSignature === signature);

        if (!alreadyExists) {
          newTasks.push({
            id: `task-client-${Date.now()}-${Math.random().toString(36).substr(2, 9)}`,
            type: 'REFER_CLIENT',
            title: `Référencement urgent : ${client.firstName} ${client.lastName}`,
            description: `Le client arrive le ${client.arrivalDate} (${daysLeft} jours restants). Veuillez procéder au référencement.`,
            status: TaskStatus.PENDING,
            priority: daysLeft <= 3 ? TaskPriority.CRITICAL : TaskPriority.HIGH,
            assignedToId: currentUserId, // On assigne à l'utilisateur courant ou à un gestionnaire
            assignedToName: currentUserName,
            relatedEntityId: client.id,
            relatedEntityType: 'CLIENT',
            dueDate: todayStr,
            createdAt: now.toISOString(),
            processedSignature: signature
          });
        }
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
