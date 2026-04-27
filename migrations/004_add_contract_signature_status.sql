-- Migration pour ajouter le statut de signature aux contrats
ALTER TABLE contracts ADD COLUMN IF NOT EXISTS signature_status TEXT DEFAULT 'PAS_ENCORE_SIGNE';
