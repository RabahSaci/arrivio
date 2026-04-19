-- 1. Ajout des colonnes manquantes pour les mandats et les préférences
ALTER TABLE clients 
ADD COLUMN IF NOT EXISTS secondary_partner_ids UUID[] DEFAULT '{}',
ADD COLUMN IF NOT EXISTS consent_external_referral BOOLEAN DEFAULT FALSE,
ADD COLUMN IF NOT EXISTS is_unsubscribed BOOLEAN DEFAULT FALSE,
ADD COLUMN IF NOT EXISTS referred_by_id UUID REFERENCES profiles(id);

-- 2. Ajout de la traçabilité pour les séances
ALTER TABLE sessions 
ADD COLUMN IF NOT EXISTS created_by_id UUID REFERENCES profiles(id);

-- 2. Création de la politique de lecture pour les partenaires
-- Nécessaire pour que les conseillers puissent voir la liste des organismes dans le dropdown
DROP POLICY IF EXISTS "Staff can see all partners" ON partners;
CREATE POLICY "Staff can see all partners" 
ON partners FOR SELECT TO authenticated 
USING (
  EXISTS (
    SELECT 1 FROM profiles 
    WHERE profiles.id = auth.uid() 
    AND profiles.role IN ('ADMINISTRATEUR', 'GESTIONNAIRE', 'CONSEILLER_CFGT')
  )
);

-- 3. Vérification de la politique clients pour l'UPDATE
-- On s'assure que les conseillers peuvent modifier les dossiers pour le référencement
DROP POLICY IF EXISTS "Staff can update clients" ON clients;
CREATE POLICY "Staff can update clients" 
ON clients FOR UPDATE TO authenticated 
USING (
  EXISTS (
    SELECT 1 FROM profiles 
    WHERE profiles.id = auth.uid() 
    AND profiles.role IN ('ADMINISTRATEUR', 'GESTIONNAIRE', 'CONSEILLER_CFGT')
  )
);
