import { apiService } from './apiService';
import { Client, Mentor, Session } from "../types";

/**
 * Service Client : Sécurisé.
 * Ne contient AUCUNE clé API ni logique IA directe.
 * Il délègue le traitement au serveur proxy qui appelle ensuite l'Edge Function.
 */

// Fonction utilitaire pour appeler le Proxy IA
const invokeGeminiFunction = async (action: string, payload: any) => {
  try {
    return await apiService.invokeAI(action, payload);
  } catch (err) {
    console.error(`Exception lors de l'invocation IA pour ${action}:`, err);
    return null;
  }
};

export const getIntelligentMatches = async (client: Client, mentors: Mentor[]) => {
  const result = await invokeGeminiFunction('match-mentors', { client, mentors });
  return result?.matches || [];
};

export const getJobMatches = async (jobDescription: string, clients: Client[]) => {
  const result = await invokeGeminiFunction('match-jobs', { jobDescription, clients });
  return result?.matches || [];
};

export const getActivityMatches = async (activityDescription: string, clients: Client[]) => {
  const result = await invokeGeminiFunction('match-activities', { activityDescription, clients });
  return result?.matches || [];
};

export const getPeerMatches = async (client: Client, allClients: Client[]) => {
  const result = await invokeGeminiFunction('match-peers', { client, allClients });
  return result?.matches || [];
};

export const generateClientSynthesis = async (client: Client, sessions: Session[]) => {
  const result = await invokeGeminiFunction('synthesis', { client, sessions });
  return result?.synthesis || "La génération de la synthèse est indisponible pour le moment.";
};
