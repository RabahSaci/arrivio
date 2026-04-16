const API_BASE_URL = '/api';

const getHeaders = () => {
  const token = localStorage.getItem('arrivio_token');
  return {
    'Content-Type': 'application/json',
    'Authorization': `Bearer ${token || ''}`
  };
};

export const apiService = {
  // --- Auth ---
  async login(email, password) {
    const response = await fetch(`${API_BASE_URL}/auth/login`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ email, password }),
    });
    const data = await response.json();
    if (!response.ok) throw new Error(data.error || "Erreur d'authentification");
    
    localStorage.setItem('arrivio_token', data.session.access_token);
    localStorage.setItem('arrivio_user', JSON.stringify(data.user));
    return data;
  },

  async logout() {
    localStorage.removeItem('arrivio_token');
  },

  async getSessionStatus() {
    const headers = getHeaders();
    const response = await fetch(`${API_BASE_URL}/auth/status`, { headers });
    return response.ok;
  },

  async signup(email, password, profile) {
    const headers = getHeaders();
    const response = await fetch(`${API_BASE_URL}/auth/signup`, {
      method: 'POST',
      headers,
      body: JSON.stringify({ email, password, profile }),
    });
    const data = await response.json();
    if (!response.ok) throw new Error(data.error || "Erreur lors de la création du compte");
    return data;
  },

  async updatePassword(currentPassword, newPassword) {
    const headers = getHeaders();
    const response = await fetch(`${API_BASE_URL}/auth/update-password`, {
      method: 'POST',
      headers,
      body: JSON.stringify({ currentPassword, newPassword }),
    });
    const data = await response.json();
    if (!response.ok) throw new Error(data.error || "Erreur lors du changement de mot de passe");
    return data;
  },

  // --- Storage ---
  async uploadFile(file, bucket = 'app-assets', path = '') {
    const token = localStorage.getItem('arrivio_token');
    const formData = new FormData();
    formData.append('file', file);
    formData.append('bucket', bucket);
    formData.append('path', path);

    const response = await fetch(`${API_BASE_URL}/storage/upload`, {
      method: 'POST',
      headers: {
        'Authorization': `Bearer ${token || ''}`
        // Do NOT set Content-Type, let the browser set it for FormData
      },
      body: formData,
    });
    
    const data = await response.json();
    if (!response.ok) throw new Error(data.error || "Erreur lors du téléversement");
    return data;
  },

  // --- AI ---
  async invokeAI(action, body) {
    const headers = getHeaders();
    const response = await fetch(`${API_BASE_URL}/ai/invoke`, {
      method: 'POST',
      headers,
      body: JSON.stringify({ action, body }),
    });
    const data = await response.json();
    if (!response.ok) throw new Error(data.error || "Erreur IA");
    return data;
  },

  // --- Data ---
  async fetchTable(table: string) {
    const headers = getHeaders();
    const response = await fetch(`${API_BASE_URL}/${table}`, { headers });
    if (!response.ok) throw new Error(`Erreur lors de la récupération de ${table}`);
    return response.json();
  },

  async create(table: string, data: any) {
    const headers = getHeaders();
    const response = await fetch(`${API_BASE_URL}/${table}`, {
      method: 'POST',
      headers,
      body: JSON.stringify(data),
    });
    const resData = await response.json();
    if (!response.ok) throw new Error(resData.error || `Erreur lors de la création dans ${table}`);
    return resData;
  },

  async update(table: string, id: string | number, data: any) {
    const headers = getHeaders();
    const response = await fetch(`${API_BASE_URL}/${table}/${id}`, {
      method: 'PUT',
      headers,
      body: JSON.stringify(data),
    });
    const resData = await response.json();
    if (!response.ok) throw new Error(resData.error || `Erreur lors de la mise à jour de ${table}`);
    return resData;
  },

  async delete(table: string, id: string | number) {
    const headers = getHeaders();
    const response = await fetch(`${API_BASE_URL}/${table}/${id}`, {
      method: 'DELETE',
      headers,
    });
    if (!response.ok) throw new Error(`Erreur lors de la suppression dans ${table}`);
    return response.json();
  },

  async bulkCreateClients(clients: any[]) {
    const headers = getHeaders();
    
    const toBool = (val: any) => {
      if (val === true || val === 1) return true;
      if (val === false || val === 0) return false;
      if (!val) return false;
      if (typeof val === 'string') {
        const lower = val.toLowerCase().trim();
        // Liste explicite de ce qui est considéré comme FAUX
        if (['non', 'no', 'false', '0', 'faux', 'off', 'aucun', 'aucune', '---', '-'].includes(lower)) return false;
        // Tout le reste (si le texte n'est pas vide) est considéré comme VRAI pour une colonne booléenne
        if (lower.length > 0) return true;
      }
      return !!val;
    };

    const mappedClients = clients.map(c => ({
      client_code: c.clientCode,
      registration_date: c.registrationDate,
      first_name: c.firstName,
      last_name: c.lastName,
      birth_date: c.birthDate,
      gender: c.gender,
      residence_country: c.residenceCountry,
      birth_country: c.birthCountry,
      iuc_crp_number: c.iucCrpNumber,
      email: c.email,
      phone_number: c.phoneNumber,
      participated_immigration_program: toBool(c.participatedImmigrationProgram),
      immigration_type: c.immigrationType,
      linked_account: c.linkedAccount,
      main_applicant: c.mainApplicant,
      spouse_full_name: c.spouseFullName,
      spouse_birth_date: c.spouseBirthDate,
      spouse_email: c.spouseEmail,
      spouse_iuc_crp_number: c.spouseIucCrpNumber,
      children_count: c.childrenCount,
      children_birth_dates: c.childrenBirthDates,
      children_full_names: c.childrenFullNames,
      chosen_province: c.chosenProvince,
      destination_change: toBool(c.destinationChange),
      chosen_city: c.chosenCity,
      arrival_date_approx: c.arrivalDateApprox,
      arrival_date_confirmed: c.arrivalDateConfirmed,
      establishment_reason: c.establishmentReason,
      current_job: c.currentJob,
      current_employment_status: c.currentEmploymentStatus,
      current_noc_group: c.currentNocGroup,
      current_profession_group: c.currentProfessionGroup,
      intended_employment_status_canada: c.intendedEmploymentStatusCanada,
      intended_profession_group_canada: c.intendedProfessionGroupCanada,
      intention_credentials_recognition: c.intentionCredentialsRecognition,
      intention_accreditation_before_arrival: c.intentionAccreditationBeforeArrival,
      done_eca: c.doneEca,
      education_level: c.educationLevel,
      specialization: c.specialization,
      training_completion_date: c.trainingCompletionDate,
      english_level: c.englishLevel,
      want_english_info: c.wantEnglishInfo,
      french_level: c.frenchLevel,
      want_french_info: c.wantFrenchInfo,
      referral_source: c.referralSource,
      marketing_consent: toBool(c.marketingConsent),
      is_approved: toBool(c.isApproved),
      is_profile_completed: toBool(c.isProfileCompleted),
      referral_date: c.referralDate,
      questions: c.questions,

      // Compatibility/Legacy
      origin_country: c.originCountry,
      profession: c.profession,
      destination_city: c.destinationCity,
      arrival_date: c.arrivalDate,
      status: c.status,
      consent_shared: toBool(c.consentShared),
      consent_external_referral: toBool(c.consentExternalReferral),
      is_unsubscribed: toBool(c.isUnsubscribed)
    }));

    const response = await fetch(`${API_BASE_URL}/clients/bulk`, {
      method: 'POST',
      headers,
      body: JSON.stringify(mappedClients),
    });

    const resData = await response.json();
    if (!response.ok) throw new Error(resData.error || `Erreur lors de l'importation massive`);
    return resData;
  }
};
