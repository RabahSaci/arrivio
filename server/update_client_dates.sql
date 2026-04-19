
-- Ajout de la date de référencement entrant (depuis Connexions Francophones)
ALTER TABLE clients 
ADD COLUMN IF NOT EXISTS inbound_referral_date DATE;

-- Commentaire pour clarté
COMMENT ON COLUMN clients.registration_date IS 'Date d''inscription chez Connexions Francophones';
COMMENT ON COLUMN clients.inbound_referral_date IS 'Date de référencement entrant de CF vers Arrivio';
COMMENT ON COLUMN clients.referral_date IS 'Date de référencement sortant d''Arrivio vers un partenaire';
