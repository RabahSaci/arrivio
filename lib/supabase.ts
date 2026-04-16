// CONFIGURATION SUPABASE - DÉSACTIVÉE CÔTÉ CLIENT
// L'application utilise désormais une architecture Proxy (BFF).
// Toutes les communications doivent passer par 'services/apiService.ts'.

export const supabase: any = new Proxy({}, {
  get: () => {
    throw new Error(
      "ACCÈS DIRECT REFUSÉ : Pour des raisons de sécurité, le client Supabase ne peut plus être utilisé directement côté frontend. " +
      "Veuillez utiliser 'apiService' pour toutes vos requêtes (Architecture Proxy/BFF)."
    );
  }
});
