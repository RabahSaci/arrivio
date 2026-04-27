
-- ============================================================
-- MIGRATION : ADD EMPLOYMENT SERVICES (SLE) COLUMNS
-- CONFORME GABARIT IRCC VER 1329
-- ============================================================

-- Statut et Profession
ALTER TABLE sessions ADD COLUMN IF NOT EXISTS employment_status_canada TEXT;
ALTER TABLE sessions ADD COLUMN IF NOT EXISTS employment_status_outside TEXT;
ALTER TABLE sessions ADD COLUMN IF NOT EXISTS intended_occupation_cnp TEXT;

-- Ciblage
ALTER TABLE sessions ADD COLUMN IF NOT EXISTS employment_target_ind BOOLEAN DEFAULT FALSE;
ALTER TABLE sessions ADD COLUMN IF NOT EXISTS employment_target_type TEXT;
ALTER TABLE sessions ADD COLUMN IF NOT EXISTS employment_sector_specific TEXT;

-- Sujets / Activités fournies
ALTER TABLE sessions ADD COLUMN IF NOT EXISTS employment_topic_career_planning_ind BOOLEAN DEFAULT FALSE;
ALTER TABLE sessions ADD COLUMN IF NOT EXISTS employment_topic_labour_market_ind BOOLEAN DEFAULT FALSE;
ALTER TABLE sessions ADD COLUMN IF NOT EXISTS employment_topic_regulated_profession_ind BOOLEAN DEFAULT FALSE;
ALTER TABLE sessions ADD COLUMN IF NOT EXISTS employment_topic_entrepreneurship_ind BOOLEAN DEFAULT FALSE;
ALTER TABLE sessions ADD COLUMN IF NOT EXISTS employment_topic_unregulated_profession_ind BOOLEAN DEFAULT FALSE;
ALTER TABLE sessions ADD COLUMN IF NOT EXISTS employment_topic_skills_ind BOOLEAN DEFAULT FALSE;
ALTER TABLE sessions ADD COLUMN IF NOT EXISTS employment_topic_workplace_orientation_ind BOOLEAN DEFAULT FALSE;

-- Aiguillages Emploi
ALTER TABLE sessions ADD COLUMN IF NOT EXISTS employment_referral_provided_ind BOOLEAN DEFAULT FALSE;
ALTER TABLE sessions ADD COLUMN IF NOT EXISTS employment_ref_education_training_ind BOOLEAN DEFAULT FALSE;
ALTER TABLE sessions ADD COLUMN IF NOT EXISTS employment_ref_credential_evaluation_ind BOOLEAN DEFAULT FALSE;
ALTER TABLE sessions ADD COLUMN IF NOT EXISTS employment_ref_employer_ind BOOLEAN DEFAULT FALSE;
ALTER TABLE sessions ADD COLUMN IF NOT EXISTS employment_ref_language_training_ind BOOLEAN DEFAULT FALSE;
ALTER TABLE sessions ADD COLUMN IF NOT EXISTS employment_ref_language_assessment_ind BOOLEAN DEFAULT FALSE;
ALTER TABLE sessions ADD COLUMN IF NOT EXISTS employment_ref_other_federal_ind BOOLEAN DEFAULT FALSE;
ALTER TABLE sessions ADD COLUMN IF NOT EXISTS employment_ref_professional_body_ind BOOLEAN DEFAULT FALSE;
ALTER TABLE sessions ADD COLUMN IF NOT EXISTS employment_ref_provincial_services_ind BOOLEAN DEFAULT FALSE;
