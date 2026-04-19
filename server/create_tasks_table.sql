
-- Table des tâches de workflow
CREATE TABLE IF NOT EXISTS workflow_tasks (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    type TEXT NOT NULL,
    title TEXT NOT NULL,
    description TEXT,
    status TEXT NOT NULL DEFAULT 'A_FAIRE',
    priority TEXT NOT NULL DEFAULT 'MOYENNE',
    assigned_to_id UUID REFERENCES profiles(id),
    assigned_to_name TEXT,
    related_entity_id UUID,
    related_entity_type TEXT,
    due_date DATE,
    created_at TIMESTAMPTZ DEFAULT now(),
    completed_at TIMESTAMPTZ,
    comment TEXT,
    processed_signature TEXT UNIQUE
);

-- Activation de RLS
ALTER TABLE workflow_tasks ENABLE ROW LEVEL SECURITY;

-- Politiques de sécurité
DROP POLICY IF EXISTS "Voir ses propres tâches" ON workflow_tasks;
CREATE POLICY "Voir ses propres tâches" ON workflow_tasks 
FOR SELECT USING (
  auth.uid() = assigned_to_id OR 
  EXISTS (SELECT 1 FROM profiles WHERE id = auth.uid() AND role IN ('ADMINISTRATEUR', 'GESTIONNAIRE'))
);

DROP POLICY IF EXISTS "Créer des tâches" ON workflow_tasks;
CREATE POLICY "Créer des tâches" ON workflow_tasks
FOR INSERT WITH CHECK (true);

DROP POLICY IF EXISTS "Modifier ses tâches" ON workflow_tasks;
CREATE POLICY "Modifier ses tâches" ON workflow_tasks
FOR UPDATE USING (
  auth.uid() = assigned_to_id OR 
  EXISTS (SELECT 1 FROM profiles WHERE id = auth.uid() AND role IN ('ADMINISTRATEUR', 'GESTIONNAIRE'))
);

DROP POLICY IF EXISTS "Supprimer ses tâches (Admin uniquement)" ON workflow_tasks;
CREATE POLICY "Supprimer ses tâches (Admin uniquement)" ON workflow_tasks
FOR DELETE USING (
  EXISTS (SELECT 1 FROM profiles WHERE id = auth.uid() AND role = 'ADMINISTRATEUR')
);
