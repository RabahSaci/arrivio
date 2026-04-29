-- MIGRATION POUR LE MAPPAGE DES PAYS IRCC --
-- AJOUT DE LA COLONNE ircc_origin_country À LA TABLE clients

ALTER TABLE clients 
  ADD COLUMN IF NOT EXISTS ircc_origin_country TEXT;

-- OPTIONNEL : On peut aussi ajouter les versions IRCC pour la résidence et la naissance si besoin futur
ALTER TABLE clients 
  ADD COLUMN IF NOT EXISTS ircc_residence_country TEXT,
  ADD COLUMN IF NOT EXISTS ircc_birth_country TEXT;

COMMENT ON COLUMN clients.ircc_origin_country IS 'Nom du pays normalisé selon les standards du système IRCC (utilisé pour les rapports)';
