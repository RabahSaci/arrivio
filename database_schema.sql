
-- [Sections précédentes conservées...]

-- Table des Séances (Mise à jour avec contract_id)
CREATE TABLE IF NOT EXISTS sessions (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  title TEXT NOT NULL,
  type session_type NOT NULL,
  category session_category NOT NULL,
  date DATE NOT NULL,
  start_time TEXT NOT NULL,
  duration INTEGER NOT NULL,
  participant_ids UUID[] DEFAULT '{}',
  no_show_ids UUID[] DEFAULT '{}',
  location TEXT,
  notes TEXT,
  facilitator_name TEXT,
  facilitator_type facilitator_type,
  advisor_name TEXT,
  contract_id UUID REFERENCES contracts(id) ON DELETE SET NULL, -- Nouveau lien
  individual_status attendance_status,
  discussed_needs TEXT,
  actions TEXT,
  zoom_link TEXT,
  needs_interpretation BOOLEAN DEFAULT FALSE,
  invoice_received BOOLEAN DEFAULT FALSE,
  invoice_submitted BOOLEAN DEFAULT FALSE,
  invoice_paid BOOLEAN DEFAULT FALSE,
  created_at TIMESTAMPTZ DEFAULT now()
);

-- [Reste du schéma conservé...]

-- Table des paramètres de l'application
CREATE TABLE IF NOT EXISTS app_settings (
  id INTEGER PRIMARY KEY,
  logo_url TEXT,
  login_photo_url TEXT
);

-- Insertion de la ligne de configuration par défaut
INSERT INTO app_settings (id, logo_url, login_photo_url) VALUES (1, NULL, NULL) ON CONFLICT (id) DO NOTHING;

-- Nouveaux champs pour les clients
ALTER TABLE clients ADD COLUMN IF NOT EXISTS consent_external_referral BOOLEAN DEFAULT FALSE;
ALTER TABLE clients ADD COLUMN IF NOT EXISTS is_unsubscribed BOOLEAN DEFAULT FALSE;

-- Table de messagerie
CREATE TABLE IF NOT EXISTS messages (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  sender_id UUID REFERENCES profiles(id) ON DELETE CASCADE,
  receiver_id UUID REFERENCES profiles(id) ON DELETE CASCADE,
  content TEXT NOT NULL,
  timestamp TIMESTAMPTZ DEFAULT now(),
  is_read BOOLEAN DEFAULT FALSE
);
