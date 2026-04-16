--Extension du RLS aux tables opérationnelles restantes

-- 1. Activer le RLS
ALTER TABLE mentors ENABLE ROW LEVEL SECURITY;
ALTER TABLE notes ENABLE ROW LEVEL SECURITY;
ALTER TABLE notifications ENABLE ROW LEVEL SECURITY;
ALTER TABLE audit_logs ENABLE ROW LEVEL SECURITY;
ALTER TABLE user_activity_logs ENABLE ROW LEVEL SECURITY;
ALTER TABLE app_settings ENABLE ROW LEVEL SECURITY;

-- 2. Politiques pour la table 'mentors'
DROP POLICY IF EXISTS "Staff can see all mentors" ON mentors;
CREATE POLICY "Staff can see all mentors" 
ON mentors FOR SELECT TO authenticated 
USING (
  EXISTS (
    SELECT 1 FROM profiles 
    WHERE profiles.id = auth.uid() 
    AND profiles.role IN ('ADMINISTRATEUR', 'GESTIONNAIRE', 'CONSEILLER_CFGT')
  )
);

-- 3. Politiques pour la table 'notes'
DROP POLICY IF EXISTS "Users can see notes of clients they can access" ON notes;
CREATE POLICY "Users can see notes of clients they can access" 
ON notes FOR ALL TO authenticated 
USING (
  EXISTS (
    SELECT 1 FROM clients 
    WHERE clients.id = notes.client_id
  )
);
-- Note: Le RLS sur 'notes' s'appuie ici sur le fait que la sous-requête sur 'clients' 
-- est elle-même filtrée par le RLS de 'clients' que nous avons déjà défini.

-- 4. Politiques pour la table 'notifications'
DROP POLICY IF EXISTS "Users can only see their own notifications" ON notifications;
CREATE POLICY "Users can only see their own notifications" 
ON notifications FOR ALL TO authenticated 
USING (target_id::uuid = auth.uid());

-- 5. Politiques pour les tables de logs (Audit et Activité)
DROP POLICY IF EXISTS "Admins can see audit logs" ON audit_logs;
CREATE POLICY "Admins can see audit logs" 
ON audit_logs FOR SELECT TO authenticated 
USING (
  EXISTS (SELECT 1 FROM profiles WHERE id = auth.uid() AND role = 'ADMINISTRATEUR')
);

DROP POLICY IF EXISTS "Admins can see user activity logs" ON user_activity_logs;
CREATE POLICY "Admins can see user activity logs" 
ON user_activity_logs FOR SELECT TO authenticated 
USING (
  EXISTS (SELECT 1 FROM profiles WHERE id = auth.uid() AND role = 'ADMINISTRATEUR')
);

-- 6. Politiques pour la table 'app_settings'
DROP POLICY IF EXISTS "Everyone can read app settings" ON app_settings;
CREATE POLICY "Everyone can read app settings" 
ON app_settings FOR SELECT TO authenticated USING (true);

DROP POLICY IF EXISTS "Only admin can update app settings" ON app_settings;
CREATE POLICY "Only admin can update app settings" 
ON app_settings FOR ALL TO authenticated 
USING (
  EXISTS (SELECT 1 FROM profiles WHERE id = auth.uid() AND role = 'ADMINISTRATEUR')
);
