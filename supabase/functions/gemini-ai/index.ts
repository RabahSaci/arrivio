
import "jsr:@supabase/functions-js/edge-runtime.d.ts";
import { GoogleGenAI, Type } from "npm:@google/genai";

// Configuration CORS stricte mais permissive pour l'appel
const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
};

// Déclaration Deno pour TS
declare const Deno: any;

console.info('Gemini AI function started');

Deno.serve(async (req: Request) => {
  // 1. Gestion du Pre-flight CORS (OPTIONS)
  if (req.method === 'OPTIONS') {
    return new Response('ok', { headers: corsHeaders });
  }

  try {
    // 2. Récupération Clé API (Supporte API_KEY et GEMINI_API_KEY)
    const apiKey = Deno.env.get('API_KEY') || Deno.env.get('GEMINI_API_KEY');
    
    if (!apiKey) {
      console.error("Erreur: Clé API manquante dans les secrets Supabase (API_KEY).");
      // On renvoie une erreur JSON propre au lieu de throw pour éviter le crash brutal
      return new Response(JSON.stringify({ error: "Configuration serveur incomplète: Clé API manquante" }), {
        status: 500,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' }
      });
    }

    // 3. Initialisation du client
    const ai = new GoogleGenAI({ apiKey });
    
    // 4. Parsing du body avec sécurité
    let body;
    try {
      body = await req.json();
    } catch (e) {
      return new Response(JSON.stringify({ error: "Body JSON invalide" }), {
        status: 400,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' }
      });
    }

    const { action, client, mentors, jobDescription, clients, activityDescription, allClients, sessions } = body;
    console.log(`Action reçue: ${action}`);

    let responseData = null;
    let rawText = null;

    // 5. Logique Métier
    if (action === 'match-mentors') {
      if (!client || !mentors || !Array.isArray(mentors)) throw new Error("Données client ou mentors manquantes");

      const prompt = `
        En tant qu'expert en intégration, analysez la compatibilité entre ce client et ces mentors.
        CLIENT: ${client.profession}, ${client.destinationCity}, ${client.originCountry}.
        MENTORS: ${mentors.map((m: any) => `ID:${m.id}, ${m.profession}, ${m.city}, ${m.originCountry}`).join(' | ')}
        Répondez en JSON avec un score (0-100) et une raison courte.
      `;
      
      const result = await ai.models.generateContent({
        model: "gemini-3-pro-preview",
        contents: prompt,
        config: {
          responseMimeType: "application/json",
          responseSchema: {
            type: Type.OBJECT,
            properties: {
              matches: {
                type: Type.ARRAY,
                items: {
                  type: Type.OBJECT,
                  properties: {
                    mentorId: { type: Type.STRING },
                    score: { type: Type.NUMBER },
                    reason: { type: Type.STRING }
                  },
                  required: ["mentorId", "score", "reason"]
                }
              }
            }
          }
        }
      });
      rawText = result.text;

    } else if (action === 'match-jobs') {
      if (!jobDescription || !clients || !Array.isArray(clients)) throw new Error("Description emploi ou liste clients manquante");
      if (clients.length === 0) return new Response(JSON.stringify({ matches: [] }), { headers: { ...corsHeaders, 'Content-Type': 'application/json' } });

      const prompt = `
        En tant qu'expert RH, analysez cette offre:
        "${jobDescription.substring(0, 1000)}..."
        
        CANDIDATS:
        ${clients.map((c: any) => `ID:${c.id}, Nom:${c.firstName} ${c.lastName}, Job:${c.profession}, Ville:${c.destinationCity}`).join(' | ')}

        Score (0-100) de pertinence. JSON requis.
      `;

      const result = await ai.models.generateContent({
        model: "gemini-3-pro-preview",
        contents: prompt,
        config: {
          responseMimeType: "application/json",
          responseSchema: {
            type: Type.OBJECT,
            properties: {
              matches: {
                type: Type.ARRAY,
                items: {
                  type: Type.OBJECT,
                  properties: {
                    clientId: { type: Type.STRING },
                    score: { type: Type.NUMBER },
                    reason: { type: Type.STRING }
                  },
                  required: ["clientId", "score", "reason"]
                }
              }
            }
          }
        }
      });
      rawText = result.text;

    } else if (action === 'match-activities') {
      if (!activityDescription || !clients) throw new Error("Description activité ou clients manquants");

      const prompt = `
        Conseiller intégration. Identifiez les clients intéressés par cette activité: "${activityDescription}".
        CLIENTS: ${clients.map((c: any) => `ID:${c.id}, ${c.firstName}, ${c.profession}, ${c.destinationCity}`).join(' | ')}
        Score pertinence (0-100). JSON.
      `;
      
      const result = await ai.models.generateContent({
        model: "gemini-3-pro-preview",
        contents: prompt,
        config: {
          responseMimeType: "application/json",
          responseSchema: {
            type: Type.OBJECT,
            properties: {
              matches: {
                type: Type.ARRAY,
                items: {
                  type: Type.OBJECT,
                  properties: {
                    clientId: { type: Type.STRING },
                    score: { type: Type.NUMBER },
                    reason: { type: Type.STRING }
                  },
                  required: ["clientId", "score", "reason"]
                }
              }
            }
          }
        }
      });
      rawText = result.text;

    } else if (action === 'match-peers') {
      if (!client || !allClients) throw new Error("Données manquantes pour match-peers");
      
      const otherClients = allClients.filter((c: any) => c.id !== client.id);
      if (otherClients.length === 0) return new Response(JSON.stringify({ matches: [] }), { headers: { ...corsHeaders, 'Content-Type': 'application/json' } });

      const prompt = `
        Jumelage entraide. Cible: ${client.firstName} (${client.profession}, ${client.originCountry}).
        Pairs: ${otherClients.map((c: any) => `ID:${c.id}, ${c.firstName}, ${c.profession}, ${c.originCountry}`).join(' | ')}
        Connecter profils similaires. JSON.
      `;
      
      const result = await ai.models.generateContent({
        model: "gemini-3-pro-preview",
        contents: prompt,
        config: {
          responseMimeType: "application/json",
          responseSchema: {
            type: Type.OBJECT,
            properties: {
              matches: {
                type: Type.ARRAY,
                items: {
                  type: Type.OBJECT,
                  properties: {
                    clientId: { type: Type.STRING },
                    score: { type: Type.NUMBER },
                    reason: { type: Type.STRING }
                  },
                  required: ["clientId", "score", "reason"]
                }
              }
            }
          }
        }
      });
      rawText = result.text;

    } else if (action === 'synthesis') {
      if (!client || !sessions) throw new Error("Données manquantes pour synthèse");

      const context = {
        profile: {
          name: `${client.firstName} ${client.lastName}`,
          origin: client.originCountry,
          profession: client.profession,
          needs: client.needs
        },
        notes: (client.notes || []).map((n: any) => `[${n.authorName}]: ${n.content}`),
        sessions: (sessions || []).map((s: any) => ({
          title: s.title,
          date: s.date,
          attendance: s.noShowIds?.includes(client.id) ? 'Absent' : 'Présent'
        }))
      };

      const prompt = `
        Rédigez une synthèse courte et professionnelle pour ce client du CFGT.
        Données: ${JSON.stringify(context)}
        Format: Résumé (2 phrases), Points Forts, Recommandations.
      `;
      
      const result = await ai.models.generateContent({
        model: "gemini-3-pro-preview",
        contents: prompt
      });
      
      responseData = { synthesis: result.text };
    } else {
      throw new Error(`Action inconnue: ${action}`);
    }

    // Parse du JSON si ce n'est pas déjà fait (synthesis est déjà objet)
    if (rawText && !responseData) {
      try {
        responseData = JSON.parse(rawText);
      } catch (e) {
        console.error("JSON parse error:", e);
        responseData = { error: "Réponse IA mal formée", raw: rawText };
      }
    }

    return new Response(JSON.stringify(responseData), {
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
    });

  } catch (error: any) {
    console.error("Erreur Edge Function:", error.message);
    return new Response(JSON.stringify({ error: error.message }), {
      status: 500,
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
    });
  }
});
