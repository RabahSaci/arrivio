-- 1. Activer le RLS sur toutes les tables sensibles
ALTER TABLE profiles ENABLE ROW LEVEL SECURITY;
ALTER TABLE clients ENABLE ROW LEVEL SECURITY;
ALTER TABLE sessions ENABLE ROW LEVEL SECURITY;
ALTER TABLE contracts ENABLE ROW LEVEL SECURITY;
ALTER TABLE partners ENABLE ROW LEVEL SECURITY;
ALTER TABLE messages ENABLE ROW LEVEL SECURITY;
ALTER TABLE activity_logs ENABLE ROW LEVEL SECURITY;
ALTER TABLE referrals ENABLE ROW LEVEL SECURITY;

-- 2. Politiques pour la table 'profiles'
DROP POLICY IF EXISTS "Profiles are viewable by authenticated users" ON profiles;
CREATE POLICY "Profiles are viewable by authenticated users" 
ON profiles FOR SELECT TO authenticated USING (true);

DROP POLICY IF EXISTS "Users can update own profile" ON profiles;
CREATE POLICY "Users can update own profile" 
ON profiles FOR UPDATE TO authenticated USING (auth.uid() = id);

DROP POLICY IF EXISTS "System can insert profiles" ON profiles;
CREATE POLICY "System can insert profiles" 
ON profiles FOR INSERT TO authenticated, service_role 
WITH CHECK (true);

-- 3. Politiques pour la table 'clients'
DROP POLICY IF EXISTS "Staff can see all clients" ON clients;
CREATE POLICY "Staff can see all clients" 
ON clients FOR ALL TO authenticated 
USING (
  EXISTS (
    SELECT 1 FROM profiles 
    WHERE profiles.id = auth.uid() 
    AND profiles.role IN ('ADMINISTRATEUR', 'GESTIONNAIRE', 'CONSEILLER_CFGT', 'MENTOR')
  )
);

DROP POLICY IF EXISTS "Partners can see referred clients" ON clients;
CREATE POLICY "Partners can see referred clients" 
ON clients FOR SELECT TO authenticated 
USING (
  EXISTS (
    SELECT 1 FROM profiles p
    WHERE p.id = auth.uid() 
    AND p.role = 'ORGANISME_PARTENAIRE'
    AND (
      clients.assigned_partner_id = p.partner_id 
      OR EXISTS (
        SELECT 1 FROM referrals r 
        WHERE r.client_id = clients.id 
        AND r.partner_id = p.partner_id
      )
    )
  )
);

-- 4. Politiques pour la table 'sessions'
DROP POLICY IF EXISTS "Staff can see all sessions" ON sessions;
CREATE POLICY "Staff can see all sessions" 
ON sessions FOR ALL TO authenticated 
USING (
  EXISTS (
    SELECT 1 FROM profiles 
    WHERE profiles.id = auth.uid() 
    AND profiles.role IN ('ADMINISTRATEUR', 'GESTIONNAIRE', 'CONSEILLER_CFGT')
  )
  OR facilitator_name = (SELECT (first_name || ' ' || last_name) FROM profiles WHERE id = auth.uid())
  OR advisor_name = (SELECT (first_name || ' ' || last_name) FROM profiles WHERE id = auth.uid())
);

-- 5. Politiques pour la table 'contracts'
DROP POLICY IF EXISTS "Admin and management can see all contracts" ON contracts;
CREATE POLICY "Admin and management can see all contracts" 
ON contracts FOR ALL TO authenticated 
USING (
  EXISTS (
    SELECT 1 FROM profiles 
    WHERE profiles.id = auth.uid() 
    AND profiles.role IN ('ADMINISTRATEUR', 'GESTIONNAIRE')
  )
);

-- 6. Politiques pour la table 'messages'
DROP POLICY IF EXISTS "Users can see their own messages" ON messages;
CREATE POLICY "Users can see their own messages" 
ON messages FOR SELECT TO authenticated 
USING (sender_id = auth.uid() OR receiver_id = auth.uid());

-- 7. Politiques pour la table 'activity_logs'
DROP POLICY IF EXISTS "Admin can see all logs" ON activity_logs;
CREATE POLICY "Admin can see all logs" 
ON activity_logs FOR SELECT TO authenticated 
USING (
  EXISTS (
    SELECT 1 FROM profiles 
    WHERE profiles.id = auth.uid() 
    AND profiles.role = 'ADMINISTRATEUR'
  )
  OR user_id = auth.uid()
);

-- 8. Politiques pour la table 'referrals'
DROP POLICY IF EXISTS "Staff can see all referrals" ON referrals;
CREATE POLICY "Staff can see all referrals" 
ON referrals FOR ALL TO authenticated 
USING (
  EXISTS (
    SELECT 1 FROM profiles 
    WHERE profiles.id = auth.uid() 
    AND profiles.role IN ('ADMINISTRATEUR', 'GESTIONNAIRE', 'CONSEILLER_CFGT')
  )
);

DROP POLICY IF EXISTS "Partners can see their own referrals" ON referrals;
CREATE POLICY "Partners can see their own referrals" 
ON referrals FOR SELECT TO authenticated 
USING (
  EXISTS (
    SELECT 1 FROM profiles p
    WHERE p.id = auth.uid() 
    AND p.partner_id = referrals.partner_id
  )
);
