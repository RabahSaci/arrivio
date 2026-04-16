-- Autoriser la lecture publique des paramètres de l'application (pour la page de connexion)
DROP POLICY IF EXISTS "Everyone can read app settings" ON app_settings;
CREATE POLICY "Everyone can read app settings" 
ON app_settings FOR SELECT 
USING (true); -- Sans 'TO authenticated', c'est accessible par les utilisateurs anonymes
