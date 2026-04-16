-- Création du bucket 'app-assets' pour le stockage du logo et des photos
INSERT INTO storage.buckets (id, name, public) 
VALUES ('app-assets', 'app-assets', true)
ON CONFLICT (id) DO NOTHING;

-- Configuration des politiques de sécurité pour le stockage
-- Autoriser la lecture publique
DROP POLICY IF EXISTS "Accès public aux assets" ON storage.objects;
CREATE POLICY "Accès public aux assets" 
ON storage.objects FOR SELECT 
USING (bucket_id = 'app-assets');

-- Autoriser l'insertion pour les utilisateurs authentifiés
DROP POLICY IF EXISTS "Upload d'assets pour les authentifiés" ON storage.objects;
CREATE POLICY "Upload d'assets pour les authentifiés" 
ON storage.objects FOR INSERT 
TO authenticated 
WITH CHECK (bucket_id = 'app-assets');

-- Autoriser la modification/suppression pour les admins
DROP POLICY IF EXISTS "Gestion des assets par les admins" ON storage.objects;
CREATE POLICY "Gestion des assets par les admins" 
ON storage.objects FOR ALL 
TO authenticated 
USING (
  bucket_id = 'app-assets' 
  AND EXISTS (SELECT 1 FROM profiles WHERE id = auth.uid() AND role = 'ADMINISTRATEUR')
);
