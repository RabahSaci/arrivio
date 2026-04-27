-- ============================================================
-- Migration 003 : Vérification et correction des colonnes NAARS/SÉBAA
-- Exécutez ce script dans l'éditeur SQL de Supabase pour vérifier
-- que toutes les colonnes NAARS existent bien dans la table sessions.
-- ============================================================

-- 1. VÉRIFICATION : Afficher les colonnes NAARS existantes
SELECT column_name, data_type, column_default
FROM information_schema.columns
WHERE table_name = 'sessions'
  AND (column_name LIKE '%_ind' OR column_name LIKE '%_funded_referral_id' 
       OR column_name = 'language_of_service' OR column_name = 'settlement_plan_created_ind'
       OR column_name = 'francophone_referred_id' OR column_name = 'case_management_referred_id')
ORDER BY ordinal_position;

-- ============================================================
-- 2. AJOUT DES COLONNES MANQUANTES (si pas encore appliqué)
--    Toutes les colonnes utilisent IF NOT EXISTS pour être idempotentes.
-- ============================================================

-- En-tête SÉBAA
ALTER TABLE sessions ADD COLUMN IF NOT EXISTS language_of_service TEXT;
ALTER TABLE sessions ADD COLUMN IF NOT EXISTS formal_follow_up_ind BOOLEAN DEFAULT FALSE;

-- Vie au Canada — Atouts
ALTER TABLE sessions ADD COLUMN IF NOT EXISTS life_asset_ind BOOLEAN DEFAULT FALSE;
ALTER TABLE sessions ADD COLUMN IF NOT EXISTS life_asset_family_networks_ind BOOLEAN DEFAULT FALSE;
ALTER TABLE sessions ADD COLUMN IF NOT EXISTS life_asset_knowledge_services_ind BOOLEAN DEFAULT FALSE;
ALTER TABLE sessions ADD COLUMN IF NOT EXISTS life_asset_settlement_motivation_ind BOOLEAN DEFAULT FALSE;
ALTER TABLE sessions ADD COLUMN IF NOT EXISTS life_asset_other_skills_ind BOOLEAN DEFAULT FALSE;

-- Vie au Canada — Besoins
ALTER TABLE sessions ADD COLUMN IF NOT EXISTS life_needs_ind BOOLEAN DEFAULT FALSE;
ALTER TABLE sessions ADD COLUMN IF NOT EXISTS life_needs_basic_identified_ind BOOLEAN DEFAULT FALSE;
ALTER TABLE sessions ADD COLUMN IF NOT EXISTS life_needs_basic_referral_ind BOOLEAN DEFAULT FALSE;
ALTER TABLE sessions ADD COLUMN IF NOT EXISTS life_needs_basic_funded_referral_id TEXT;
ALTER TABLE sessions ADD COLUMN IF NOT EXISTS life_needs_family_children_identified_ind BOOLEAN DEFAULT FALSE;
ALTER TABLE sessions ADD COLUMN IF NOT EXISTS life_needs_family_children_referral_ind BOOLEAN DEFAULT FALSE;
ALTER TABLE sessions ADD COLUMN IF NOT EXISTS life_needs_family_children_funded_referral_id TEXT;
ALTER TABLE sessions ADD COLUMN IF NOT EXISTS life_needs_health_and_mental_identified_ind BOOLEAN DEFAULT FALSE;
ALTER TABLE sessions ADD COLUMN IF NOT EXISTS life_needs_health_and_mental_referral_ind BOOLEAN DEFAULT FALSE;
ALTER TABLE sessions ADD COLUMN IF NOT EXISTS life_needs_health_and_mental_funded_referral_id TEXT;
ALTER TABLE sessions ADD COLUMN IF NOT EXISTS life_needs_housing_identified_ind BOOLEAN DEFAULT FALSE;
ALTER TABLE sessions ADD COLUMN IF NOT EXISTS life_needs_housing_referral_ind BOOLEAN DEFAULT FALSE;
ALTER TABLE sessions ADD COLUMN IF NOT EXISTS life_needs_housing_funded_referral_id TEXT;
ALTER TABLE sessions ADD COLUMN IF NOT EXISTS life_needs_government_knowledge_identified_ind BOOLEAN DEFAULT FALSE;
ALTER TABLE sessions ADD COLUMN IF NOT EXISTS life_needs_government_knowledge_no_referral_ind BOOLEAN DEFAULT FALSE;
ALTER TABLE sessions ADD COLUMN IF NOT EXISTS life_needs_government_knowledge_funded_referral_id TEXT;
ALTER TABLE sessions ADD COLUMN IF NOT EXISTS life_needs_canada_knowledge_identified_ind BOOLEAN DEFAULT FALSE;
ALTER TABLE sessions ADD COLUMN IF NOT EXISTS life_needs_canada_knowledge_referral_ind BOOLEAN DEFAULT FALSE;
ALTER TABLE sessions ADD COLUMN IF NOT EXISTS life_needs_canada_knowledge_funded_referral_id TEXT;
ALTER TABLE sessions ADD COLUMN IF NOT EXISTS life_needs_legal_identified_ind BOOLEAN DEFAULT FALSE;
ALTER TABLE sessions ADD COLUMN IF NOT EXISTS life_needs_legal_referral_ind BOOLEAN DEFAULT FALSE;
ALTER TABLE sessions ADD COLUMN IF NOT EXISTS life_needs_legal_funded_referral_id TEXT;
ALTER TABLE sessions ADD COLUMN IF NOT EXISTS life_needs_financial_identified_ind BOOLEAN DEFAULT FALSE;
ALTER TABLE sessions ADD COLUMN IF NOT EXISTS life_needs_financial_referral_ind BOOLEAN DEFAULT FALSE;
ALTER TABLE sessions ADD COLUMN IF NOT EXISTS life_needs_financial_funded_referral_id TEXT;
ALTER TABLE sessions ADD COLUMN IF NOT EXISTS life_needs_community_knowledge_identified_ind BOOLEAN DEFAULT FALSE;
ALTER TABLE sessions ADD COLUMN IF NOT EXISTS life_needs_community_knowledge_referral_ind BOOLEAN DEFAULT FALSE;
ALTER TABLE sessions ADD COLUMN IF NOT EXISTS life_needs_community_knowledge_funded_referral_id TEXT;
ALTER TABLE sessions ADD COLUMN IF NOT EXISTS life_needs_social_networking_identified_ind BOOLEAN DEFAULT FALSE;
ALTER TABLE sessions ADD COLUMN IF NOT EXISTS life_needs_social_networking_referral_ind BOOLEAN DEFAULT FALSE;
ALTER TABLE sessions ADD COLUMN IF NOT EXISTS life_needs_social_networking_funded_referral_id TEXT;
ALTER TABLE sessions ADD COLUMN IF NOT EXISTS life_needs_racism_identified_ind BOOLEAN DEFAULT FALSE;
ALTER TABLE sessions ADD COLUMN IF NOT EXISTS life_needs_racism_referral_ind BOOLEAN DEFAULT FALSE;
ALTER TABLE sessions ADD COLUMN IF NOT EXISTS life_needs_racism_funded_referral_id TEXT;

-- Langue — Atouts
ALTER TABLE sessions ADD COLUMN IF NOT EXISTS language_asset_ind BOOLEAN DEFAULT FALSE;
ALTER TABLE sessions ADD COLUMN IF NOT EXISTS language_asset_english_ind BOOLEAN DEFAULT FALSE;
ALTER TABLE sessions ADD COLUMN IF NOT EXISTS language_asset_french_ind BOOLEAN DEFAULT FALSE;
ALTER TABLE sessions ADD COLUMN IF NOT EXISTS language_asset_other_ind BOOLEAN DEFAULT FALSE;

-- Langue — Besoins
ALTER TABLE sessions ADD COLUMN IF NOT EXISTS language_needs_ind BOOLEAN DEFAULT FALSE;
ALTER TABLE sessions ADD COLUMN IF NOT EXISTS language_needs_official_identified_need_ind BOOLEAN DEFAULT FALSE;
ALTER TABLE sessions ADD COLUMN IF NOT EXISTS language_needs_official_language_id TEXT;
ALTER TABLE sessions ADD COLUMN IF NOT EXISTS language_needs_official_referral_ind BOOLEAN DEFAULT FALSE;
ALTER TABLE sessions ADD COLUMN IF NOT EXISTS language_needs_official_funded_referral_id TEXT;
ALTER TABLE sessions ADD COLUMN IF NOT EXISTS language_needs_literacy_identified_need_ind BOOLEAN DEFAULT FALSE;
ALTER TABLE sessions ADD COLUMN IF NOT EXISTS language_needs_literacy_language_id TEXT;
ALTER TABLE sessions ADD COLUMN IF NOT EXISTS language_needs_literacy_referral_ind BOOLEAN DEFAULT FALSE;
ALTER TABLE sessions ADD COLUMN IF NOT EXISTS language_needs_literacy_funded_referral_id TEXT;
ALTER TABLE sessions ADD COLUMN IF NOT EXISTS language_needs_employment_identified_need_ind BOOLEAN DEFAULT FALSE;
ALTER TABLE sessions ADD COLUMN IF NOT EXISTS language_needs_employment_language_id TEXT;
ALTER TABLE sessions ADD COLUMN IF NOT EXISTS language_needs_employment_referral_ind BOOLEAN DEFAULT FALSE;
ALTER TABLE sessions ADD COLUMN IF NOT EXISTS language_needs_employment_funded_referral_id TEXT;

-- Emploi & Éducation — Atouts
ALTER TABLE sessions ADD COLUMN IF NOT EXISTS employment_asset_ind BOOLEAN DEFAULT FALSE;
ALTER TABLE sessions ADD COLUMN IF NOT EXISTS employment_asset_employed_ind BOOLEAN DEFAULT FALSE;
ALTER TABLE sessions ADD COLUMN IF NOT EXISTS employment_asset_foreign_credential_ind BOOLEAN DEFAULT FALSE;
ALTER TABLE sessions ADD COLUMN IF NOT EXISTS employment_asset_labour_market_ind BOOLEAN DEFAULT FALSE;
ALTER TABLE sessions ADD COLUMN IF NOT EXISTS employment_asset_degree_in_canada_ind BOOLEAN DEFAULT FALSE;
ALTER TABLE sessions ADD COLUMN IF NOT EXISTS employment_asset_degree_outside_canada_ind BOOLEAN DEFAULT FALSE;
ALTER TABLE sessions ADD COLUMN IF NOT EXISTS employment_asset_previous_employment_ind BOOLEAN DEFAULT FALSE;
ALTER TABLE sessions ADD COLUMN IF NOT EXISTS employment_asset_job_related_training_ind BOOLEAN DEFAULT FALSE;
ALTER TABLE sessions ADD COLUMN IF NOT EXISTS employment_asset_work_experience_outside_canada_ind BOOLEAN DEFAULT FALSE;
ALTER TABLE sessions ADD COLUMN IF NOT EXISTS employment_asset_other_skills_ind BOOLEAN DEFAULT FALSE;

-- Emploi & Éducation — Besoins
ALTER TABLE sessions ADD COLUMN IF NOT EXISTS employment_needs_ind BOOLEAN DEFAULT FALSE;
ALTER TABLE sessions ADD COLUMN IF NOT EXISTS employment_labour_market_need_ind BOOLEAN DEFAULT FALSE;
ALTER TABLE sessions ADD COLUMN IF NOT EXISTS employment_labour_market_referral_ind BOOLEAN DEFAULT FALSE;
ALTER TABLE sessions ADD COLUMN IF NOT EXISTS employment_labour_market_funded_referral_id TEXT;
ALTER TABLE sessions ADD COLUMN IF NOT EXISTS employment_finding_employment_need_ind BOOLEAN DEFAULT FALSE;
ALTER TABLE sessions ADD COLUMN IF NOT EXISTS employment_finding_employment_referral_ind BOOLEAN DEFAULT FALSE;
ALTER TABLE sessions ADD COLUMN IF NOT EXISTS employment_finding_employment_funded_referral_id TEXT;
ALTER TABLE sessions ADD COLUMN IF NOT EXISTS employment_credentials_need_ind BOOLEAN DEFAULT FALSE;
ALTER TABLE sessions ADD COLUMN IF NOT EXISTS employment_credentials_referral_ind BOOLEAN DEFAULT FALSE;
ALTER TABLE sessions ADD COLUMN IF NOT EXISTS employment_credentials_funded_referral_id TEXT;
ALTER TABLE sessions ADD COLUMN IF NOT EXISTS employment_education_need_ind BOOLEAN DEFAULT FALSE;
ALTER TABLE sessions ADD COLUMN IF NOT EXISTS employment_education_referral_ind BOOLEAN DEFAULT FALSE;
ALTER TABLE sessions ADD COLUMN IF NOT EXISTS employment_education_funded_referral_id TEXT;

-- Format de l'évaluation
ALTER TABLE sessions ADD COLUMN IF NOT EXISTS format_in_person_ind BOOLEAN DEFAULT FALSE;
ALTER TABLE sessions ADD COLUMN IF NOT EXISTS format_remote_staff_ind BOOLEAN DEFAULT FALSE;
ALTER TABLE sessions ADD COLUMN IF NOT EXISTS format_remote_self_ind BOOLEAN DEFAULT FALSE;
ALTER TABLE sessions ADD COLUMN IF NOT EXISTS format_remote_email_text_phone_ind BOOLEAN DEFAULT FALSE;

-- Services de soutien — Reçus
ALTER TABLE sessions ADD COLUMN IF NOT EXISTS support_received_ind BOOLEAN DEFAULT FALSE;
ALTER TABLE sessions ADD COLUMN IF NOT EXISTS childminding_received_ind BOOLEAN DEFAULT FALSE;
ALTER TABLE sessions ADD COLUMN IF NOT EXISTS digital_equipment_received_ind BOOLEAN DEFAULT FALSE;
ALTER TABLE sessions ADD COLUMN IF NOT EXISTS digital_skill_received_ind BOOLEAN DEFAULT FALSE;
ALTER TABLE sessions ADD COLUMN IF NOT EXISTS interpretation_received_ind BOOLEAN DEFAULT FALSE;
ALTER TABLE sessions ADD COLUMN IF NOT EXISTS disability_support_received_ind BOOLEAN DEFAULT FALSE;
ALTER TABLE sessions ADD COLUMN IF NOT EXISTS counselling_received_ind BOOLEAN DEFAULT FALSE;
ALTER TABLE sessions ADD COLUMN IF NOT EXISTS transportation_received_ind BOOLEAN DEFAULT FALSE;
ALTER TABLE sessions ADD COLUMN IF NOT EXISTS translation_received_ind BOOLEAN DEFAULT FALSE;

-- Services de soutien — Requis
ALTER TABLE sessions ADD COLUMN IF NOT EXISTS support_required_ind BOOLEAN DEFAULT FALSE;
ALTER TABLE sessions ADD COLUMN IF NOT EXISTS childminding_required_ind BOOLEAN DEFAULT FALSE;
ALTER TABLE sessions ADD COLUMN IF NOT EXISTS digital_equipment_required_ind BOOLEAN DEFAULT FALSE;
ALTER TABLE sessions ADD COLUMN IF NOT EXISTS digital_skill_required_ind BOOLEAN DEFAULT FALSE;
ALTER TABLE sessions ADD COLUMN IF NOT EXISTS interpretation_required_ind BOOLEAN DEFAULT FALSE;
ALTER TABLE sessions ADD COLUMN IF NOT EXISTS disability_support_required_ind BOOLEAN DEFAULT FALSE;
ALTER TABLE sessions ADD COLUMN IF NOT EXISTS transportation_required_ind BOOLEAN DEFAULT FALSE;
ALTER TABLE sessions ADD COLUMN IF NOT EXISTS translation_required_ind BOOLEAN DEFAULT FALSE;

-- Plan & Aiguillages finaux
ALTER TABLE sessions ADD COLUMN IF NOT EXISTS settlement_plan_created_ind BOOLEAN DEFAULT FALSE;
ALTER TABLE sessions ADD COLUMN IF NOT EXISTS francophone_referred_id TEXT;
ALTER TABLE sessions ADD COLUMN IF NOT EXISTS case_management_referred_id TEXT;

-- ============================================================
-- 3. VÉRIFICATION FINALE : Compter les colonnes NAARS présentes
-- ============================================================
SELECT COUNT(*) AS colonnes_naars_presentes
FROM information_schema.columns
WHERE table_name = 'sessions'
  AND (column_name LIKE '%_ind' OR column_name LIKE '%_funded_referral_id'
       OR column_name IN ('language_of_service', 'francophone_referred_id', 'case_management_referred_id'));
-- Résultat attendu : 83 colonnes NAARS
