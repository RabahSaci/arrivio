const path = require('path');
require('dotenv').config({ path: path.join(__dirname, '.env') });
const express = require('express');
const cors = require('cors');
const helmet = require('helmet');
const rateLimit = require('express-rate-limit');
const { z } = require('zod');
const { createClient } = require('@supabase/supabase-js');
const multer = require('multer');
const upload = multer({ storage: multer.memoryStorage() });

const app = express();
const PORT = process.env.PORT || 5000;

const UserRole = {
  ADVISOR: 'CONSEILLER_CFGT',
  PARTNER: 'ORGANISME_PARTENAIRE',
  MENTOR: 'MENTOR',
  MANAGER: 'GESTIONNAIRE',
  ADMIN: 'ADMINISTRATEUR'
};

// ----- VALDIATION SCHEMAS -----
const clientSchema = z.object({
  first_name: z.string().min(2, "Le prénom est trop court"),
  last_name: z.string().min(2, "Le nom est trop court"),
  email: z.string().email("Format d'email invalide").optional().or(z.literal('')),
  phone: z.string().optional(),
  
  // Nouveaux champs pour import massif
  client_code: z.string().optional().nullable(),
  registration_date: z.string().regex(/^\d{4}-\d{2}-\d{2}$/).optional().nullable().or(z.literal('')),
  birth_date: z.string().regex(/^\d{4}-\d{2}-\d{2}$/).optional().nullable().or(z.literal('')),
  gender: z.string().optional().nullable(),
  residence_country: z.string().optional().nullable(),
  birth_country: z.string().optional().nullable(),
  iuc_crp_number: z.string().optional().nullable(),
  phone_number: z.string().optional().nullable(),
  participated_immigration_program: z.string().optional().nullable(),
  immigration_type: z.string().optional().nullable(),
  linked_account: z.string().optional().nullable(),
  main_applicant: z.string().optional().nullable(),
  spouse_full_name: z.string().optional().nullable(),
  spouse_birth_date: z.string().regex(/^\d{4}-\d{2}-\d{2}$/).optional().nullable().or(z.literal('')),
  spouse_email: z.string().optional().nullable(),
  spouse_iuc_crp_number: z.string().optional().nullable(),
  children_count: z.union([z.number(), z.string().transform(v => parseInt(v))]).optional().nullable(),
  children_birth_dates: z.string().optional().nullable(),
  children_full_names: z.string().optional().nullable(),
  chosen_province: z.string().optional().nullable(),
  destination_change: z.string().optional().nullable(),
  chosen_city: z.string().optional().nullable(),
  arrival_date_approx: z.string().regex(/^\d{4}-\d{2}-\d{2}$/).optional().nullable().or(z.literal('')),
  arrival_date_confirmed: z.string().regex(/^\d{4}-\d{2}-\d{2}$/).optional().nullable().or(z.literal('')),
  establishment_reason: z.string().optional().nullable(),
  current_job: z.string().optional().nullable(),
  current_employment_status: z.string().optional().nullable(),
  current_noc_group: z.string().optional().nullable(),
  current_profession_group: z.string().optional().nullable(),
  intended_employment_status_canada: z.string().optional().nullable(),
  intended_profession_group_canada: z.string().optional().nullable(),
  intention_credentials_recognition: z.string().optional().nullable(),
  intention_accreditation_before_arrival: z.string().optional().nullable(),
  done_eca: z.string().optional().nullable(),
  education_level: z.string().optional().nullable(),
  specialization: z.string().optional().nullable(),
  training_completion_date: z.string().regex(/^\d{4}-\d{2}-\d{2}$/).optional().nullable().or(z.literal('')),
  english_level: z.string().optional().nullable(),
  want_english_info: z.string().optional().nullable(),
  french_level: z.string().optional().nullable(),
  want_french_info: z.string().optional().nullable(),
  referral_source: z.string().optional().nullable(),
  marketing_consent: z.string().optional().nullable(),
  is_approved: z.string().optional().nullable(),
  is_profile_completed: z.string().optional().nullable(),
  referral_date: z.string().regex(/^\d{4}-\d{2}-\d{2}$/).optional().nullable().or(z.literal('')),
  questions: z.string().optional().nullable(),

  // Legacy fields compatible
  origin_country: z.string().optional(),
  profession: z.string().optional(),
  destination_city: z.string().optional(),
  arrival_date: z.string().optional()
});

const sessionSchema = z.object({
  title: z.string().min(3),
  date: z.string().regex(/^\d{4}-\d{2}-\d{2}$/, "Format de date YYYY-MM-DD requis"),
  start_time: z.string().regex(/^\d{2}:\d{2}$/, "Format d'heure HH:mm requis"),
  duration: z.union([z.number(), z.string().regex(/^\d+$/).transform(v => parseInt(v))]),
  facilitator_name: z.string().optional(),
  advisor_name: z.string().optional(),
  contract_id: z.string().uuid().optional().nullable().or(z.literal('')),
  client_id: z.string().uuid().optional().nullable().or(z.literal('')),
  zoom_link: z.string().url("Format d'URL invalide").optional().or(z.literal('')),
  zoom_id: z.string().regex(/^\d*$/, "L'ID Zoom doit être numérique").optional().or(z.literal('')),
  notes: z.string().optional()
}).passthrough(); // Allow additional fields from frontend (category, type, etc.)

const contractSchema = z.object({
  consultant_name: z.string().min(2),
  total_sessions: z.union([z.number(), z.string().transform(v => parseInt(v))]).refine(v => v > 0, "Le nombre doit être > 0"),
  used_sessions: z.number().default(0),
  start_date: z.string(),
  end_date: z.string()
}).refine(data => new Date(data.end_date) >= new Date(data.start_date), {
  message: "La date de fin doit être après le début",
  path: ["end_date"]
});

// Validation Middleware
const validate = (schema) => (req, res, next) => {
  try {
    req.body = schema.parse(req.body);
    next();
  } catch (error) {
    if (error instanceof z.ZodError) {
      console.warn(`[VALIDATION ERROR] ${req.method} ${req.originalUrl}:`, JSON.stringify(error.format(), null, 2));
    }
    return res.status(400).json({ 
      error: "Données invalides",
      details: (error.issues || []).map(e => ({ path: e.path, message: e.message }))
    });
  }
};
// ------------------------------

// Security Middlewares
app.use(helmet()); // Basic security headers

// Restricted CORS (Allow Vite and common dev ports)
app.use(cors({
  origin: [process.env.FRONTEND_URL || 'http://localhost:3000', 'http://localhost:5173', 'http://127.0.0.1:5173'],
  methods: ['GET', 'POST', 'PUT', 'DELETE'],
  allowedHeaders: ['Content-Type', 'Authorization']
}));

// Rate limiting: 10000 requests max per 15 minutes per IP (Increased for bulk imports)
const limiter = rateLimit({
  windowMs: 15 * 60 * 1000,
  max: 10000,
  message: { error: 'Trop de requêtes, veuillez réessayer plus tard.' }
});
app.use('/api', limiter);

// Helper: Haversine distance calculation (km)
const calculateDistance = (lat1, lon1, lat2, lon2) => {
  const R = 6371;
  const dLat = (lat2 - lat1) * Math.PI / 180;
  const dLon = (lon2 - lon1) * Math.PI / 180;
  const a = Math.sin(dLat/2) * Math.sin(dLat/2) +
          Math.cos(lat1 * Math.PI / 180) * Math.cos(lat2 * Math.PI / 180) *
          Math.sin(dLon/2) * Math.sin(dLon/2);
  const c = 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1-a));
  return R * c;
};

// Validate required environment variables for production
if (process.env.NODE_ENV === 'production') {
  const REQUIRED_VARS = [
    'SUPABASE_URL', 
    'SUPABASE_SERVICE_ROLE_KEY', 
    'SUPABASE_ANON_KEY',
    'DB_HOST',
    'DB_PASSWORD'
  ];
  REQUIRED_VARS.forEach(v => {
    if (!process.env[v]) {
      console.error(`ERROR: Missing required environment variable: ${v}`);
    }
  });
}

app.use(express.json({ limit: '10mb' }));
app.use(express.urlencoded({ extended: true, limit: '10mb' }));

// Supabase Admin Client — Stateless, RLS-bypassing, session-free
// CRITICAL: All auth options disabled to prevent session state corruption on concurrent requests
const supabaseAdmin = createClient(
  process.env.SUPABASE_URL,
  process.env.SUPABASE_SERVICE_ROLE_KEY,
  {
    auth: {
      autoRefreshToken: false,
      persistSession: false,
      detectSessionInUrl: false
    }
  }
);

// BOOTSTRAP DIAGNOSTIC
console.info("--- SERVER BOOTSTRAP ---");
console.info(`Supabase URL: ${process.env.SUPABASE_URL ? process.env.SUPABASE_URL.substring(0, 20) + '...' : 'NOT FOUND'}`);
console.info(`Service Role Key: ${process.env.SUPABASE_SERVICE_ROLE_KEY ? 'EXISTS (starts with ' + process.env.SUPABASE_SERVICE_ROLE_KEY.substring(0, 10) + '...)' : 'MISSING'}`);
console.info("------------------------");

// Factory: creates a fresh isolated admin client for each DB operation
// Prevents state corruption from concurrent auth.getUser() calls on the shared client
function getAdminClient() {
  return createClient(
    process.env.SUPABASE_URL,
    process.env.SUPABASE_SERVICE_ROLE_KEY,
    {
      auth: {
        autoRefreshToken: false,
        persistSession: false,
        detectSessionInUrl: false
      }
    }
  );
}

// Auth Middleware
const authenticateUser = async (req, res, next) => {
  const authHeader = req.headers.authorization;
  if (!authHeader || !authHeader.startsWith('Bearer ')) {
    return res.status(401).json({ error: 'Auth token missing' });
  }

  const token = authHeader.split(' ')[1];
  try {
    // 1. Verify token and get user
    const { data: { user }, error } = await supabaseAdmin.auth.getUser(token);
    if (error || !user) throw new Error('Invalid token');
    
    // 2. Create a user-scoped client that DOES respect RLS
    // We use the same URL but the user's own token
    const supabaseUser = createClient(
      process.env.SUPABASE_URL,
      process.env.SUPABASE_ANON_KEY,
      {
        global: {
          headers: {
            Authorization: `Bearer ${token}`,
          },
        },
      }
    );
    
    // 3. Fetch profile for role (using admin client to ensure we get it)
    const { data: profile, error: profileError } = await supabaseAdmin
      .from('profiles')
      .select('role')
      .eq('id', user.id)
      .single();
    
    if (profileError || !profile) {
      console.warn(`Profile not found for user ${user.id}`);
      user.role = null; 
    } else {
      user.role = profile.role;
    }

    req.user = user;
    req.sb = supabaseUser; // Attach the scoped client to the request
    next();
  } catch (err) {
    console.error('Auth error:', err.message);
    res.status(401).json({ error: 'Unauthorized' });
  }
};

// Authorization Middleware
const authorize = (allowedRoles) => (req, res, next) => {
  if (!req.user || !allowedRoles.includes(req.user.role)) {
    return res.status(403).json({ error: "Accès refusé. Autorisations insuffisantes." });
  }
  next();
};

// Combined Auth + Authorize middleware factory
// Used for explicit routes that are registered BEFORE the global auth middleware
const authenticate_then_authorize = (allowedRoles) => [
  authenticateUser,
  authorize(allowedRoles)
];

// 1. PUBLIC ROUTES (No Auth Required)
// These are defined BEFORE the auth middleware to ensure they are never blocked

// Health Check
app.get('/api/health', (req, res) => {
  res.json({ status: 'OK', message: 'Backend is running' });
});

// App Settings (Publicly accessible for the login screen and header)
app.get('/api/app_settings', async (req, res) => {
  try {
    const db = getAdminClient();
    const { data, error } = await db.from('app_settings').select('*').eq('id', 1).single();
    if (error) throw error;
    res.json(data || {});
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// Health check — check environment variables status
app.get('/api/health', (req, res) => {
  const status = {
    uptime: process.uptime(),
    timestamp: Date.now(),
    env: {
      NODE_ENV: process.env.NODE_ENV,
      SUPABASE_URL: !!process.env.SUPABASE_URL,
      SUPABASE_SERVICE_ROLE_KEY: !!process.env.SUPABASE_SERVICE_ROLE_KEY,
      DB_HOST: !!process.env.DB_HOST,
      PORT: process.env.PORT
    }
  };
  res.json(status);
});

// Dedicated partners route — PUBLIC
app.get('/api/partners', async (req, res) => {
  try {
    const db = getAdminClient();
    const { data, error } = await db
      .from('partners')
      .select('*')
      .order('name');
    if (error) throw error;
    res.json(data || []);
  } catch (err) {
    console.error('[GET /api/partners]', err.message);
    res.status(500).json({ error: err.message });
  }
});

// 2. AUTHENTICATION + LOGGING MIDDLEWARE
// Runs for all /api/* requests EXCEPT those handled by the explicit public routes above
app.use('/api', (req, res, next) => {
  console.info(`[${new Date().toLocaleTimeString()}] ${req.method} ${req.originalUrl}`);
  
  // Only /auth/login is truly public (no token needed)
  // GET /api/health, GET /api/app_settings, GET /api/partners are handled
  // by explicit routes BEFORE this middleware and never reach here.
  const publicRoutes = ['/auth/login'];
  if (publicRoutes.includes(req.path)) {
    req.sb = supabaseAdmin;
    return next();
  }
  authenticateUser(req, res, next);
});

// --- PROXY ROUTES ---

// 1. Auth Login Proxy
app.post('/api/auth/login', async (req, res) => {
  const { email, password } = req.body;
  const userAgent = req.headers['user-agent'];
  const ip = (req.headers['x-forwarded-for'] || req.socket.remoteAddress || '').split(',')[0].trim();

  try {
    const { data, error } = await supabaseAdmin.auth.signInWithPassword({ email, password });
    if (error) return res.status(401).json({ error: error.message });
    
    const userId = data.user.id;

    // --- SECURITY DETECTION (Impossible Travel & New Device) ---
    // Runs in the background (fire and forget) to not slow down user
    (async () => {
      try {
        // 1. Geolocation
        const geoRes = await fetch(`http://ip-api.com/json/${ip.includes('::') ? '' : ip}`);
        const geoData = await geoRes.json();
        
        if (geoData.status === 'success') {
          const { lat, lon, city, country } = geoData;

          // 2. Fetch last login
          const { data: lastLogin } = await supabaseAdmin
            .from('auth_login_history')
            .select('*')
            .eq('user_id', userId)
            .order('created_at', { ascending: false })
            .limit(1)
            .single();

          if (lastLogin) {
            // 3. Speed calculation
            const dist = calculateDistance(lat, lon, parseFloat(lastLogin.latitude), parseFloat(lastLogin.longitude));
            const timeDiffHours = (Date.now() - new Date(lastLogin.created_at).getTime()) / (1000 * 60 * 60);
            const speed = timeDiffHours > 0 ? dist / timeDiffHours : 0;

            console.info(`[SECURITY] Travel check for ${email}: ${dist.toFixed(0)}km in ${timeDiffHours.toFixed(2)}h (${speed.toFixed(0)}km/h)`);

            if (speed > 300) {
              await supabaseAdmin.from('activity_logs').insert([{
                user_id: userId,
                activity_type: 'SECURITY_ALERT',
                description: `Connexion suspecte (Voyage impossible) : détectée à ${city}, ${country} (${speed.toFixed(0)} km/h depuis la dernière position).`,
                module: 'AUTHENTIFICATION',
                status: 'WARNING'
              }]);
            }
          } else {
            console.info(`[SECURITY] First tracked login for ${email}`);
          }

          // 4. Save to history
          await supabaseAdmin.from('auth_login_history').insert([{
            user_id: userId,
            ip_address: ip,
            user_agent: userAgent,
            city,
            country,
            latitude: lat,
            longitude: lon
          }]);
        }
      } catch (secErr) {
        console.error('[SECURITY ERROR]', secErr.message);
      }
    })();
    // ----------------------------------------------------------

    // Fetch profile
    const { data: profile } = await supabaseAdmin
      .from('profiles')
      .select('*')
      .eq('id', userId)
      .single();

    res.json({
      user: data.user,
      session: data.session,
      profile: profile
    });
  } catch (err) {
    console.error('[LOGIN ERROR]', err.message);
    res.status(500).json({ error: "Erreur lors de l'authentification" });
  }
});

// 2. Auth Status/Session Check
app.get('/api/auth/status', (req, res) => {
  // If we reach here, authenticateUser middleware already succeeded
  res.json({ authenticated: true, user: req.user });
});

// 3. Storage Upload Proxy
app.post('/api/storage/upload', upload.single('file'), async (req, res) => {
  const { bucket, path } = req.body;
  const file = req.file;

  if (!file) return res.status(400).json({ error: "Aucun fichier reçu" });

  try {
    // Upload using req.sb to respect RLS or supabaseAdmin if we want server-override
    // Given the user wants "no direct communication", the backend uses req.sb (the user's identity)
    const { data, error } = await req.sb.storage
      .from(bucket || 'app-assets')
      .upload(path || `${Date.now()}-${file.originalname}`, file.buffer, {
        contentType: file.mimetype,
        upsert: true
      });

    if (error) throw error;

    const { data: { publicUrl } } = req.sb.storage
      .from(bucket || 'app-assets')
      .getPublicUrl(data.path);

    res.json({ url: publicUrl, path: data.path });
  } catch (err) {
    console.error('Upload proxy error:', err.message);
    res.status(500).json({ error: "Erreur lors du téléversement via proxy" });
  }
});

// 4. AI/Edge Function Proxy
app.post('/api/ai/invoke', async (req, res) => {
  const { action, body } = req.body;
  try {
    const { data, error } = await req.sb.functions.invoke('gemini-ai', {
      body: { action, ...body }
    });
    if (error) throw error;
    res.json(data);
  } catch (err) {
    console.error('AI Proxy error:', err.message);
    res.status(500).json({ error: "Erreur lors de l'appel IA via proxy" });
  }
});

// 5. Auth Password Update Proxy
app.post('/api/auth/update-password', async (req, res) => {
  const { currentPassword, newPassword } = req.body;
  try {
    // Re-auth to verify current password
    const { error: reAuthError } = await supabaseAdmin.auth.signInWithPassword({
      email: req.user.email,
      password: currentPassword
    });
    if (reAuthError) return res.status(401).json({ error: "Mot de passe actuel incorrect" });

    // Update password using the user's client (req.sb)
    const { error } = await req.sb.auth.updateUser({ password: newPassword });
    if (error) throw error;

    res.json({ message: "Mot de passe mis à jour avec succès" });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// 6. User Signup Proxy (Admin Only)
app.post('/api/auth/signup', authorize([UserRole.ADMIN]), async (req, res) => {
  const { email, password, profile } = req.body;
  try {
    console.info(`[SIGNUP] Creating user: ${email}`);
    
    // 1. Create User in Auth
    const { data, error: authError } = await supabaseAdmin.auth.admin.createUser({
      email: email,
      password: password,
      email_confirm: true
    });
    if (authError) throw authError;

    // 2. Create Profile — include email from Auth (it's not in the profile object)
    const profileToInsert = {
      id: data.user.id,
      email: data.user.email, // Always use the confirmed email from Auth
      ...profile
    };
    
    console.info(`[SIGNUP] Inserting profile:`, JSON.stringify(profileToInsert));
    
    const { error: profileError } = await supabaseAdmin.from('profiles').insert([profileToInsert]);
    if (profileError) throw profileError;

    res.status(201).json({ user: data.user });
  } catch (err) {
    console.error(`[SIGNUP ERROR]`, err.message);
    res.status(500).json({ error: err.message });
  }
});

// --- DATA ROUTES ---


// Example route: Get Sessions
app.get('/api/sessions', async (req, res) => {
  try {
    const client = getReadClient('sessions', req);
    let query = client
      .from('sessions')
      .select('*')
      .order('date', { ascending: false });

    const data = await fetchAll(query);
    res.json(data);
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// Create Client with validation
app.post('/api/clients', validate(clientSchema), async (req, res) => {
  const { email } = req.body;

  try {
    // 1. Duplicate check (still needed because it involves DB) - USE ADMIN
    if (email) {
      const { data: existingClient, error: searchError } = await supabaseAdmin
        .from('clients')
        .select('id')
        .eq('email', email)
        .single();
      
      if (existingClient) {
        return res.status(400).json({ error: "Un client avec cette adresse email existe déjà." });
      }
    }

    // 2. Create - USE USER CLIENT
    const { data, error } = await req.sb.from('clients').insert([req.body]).select();
    if (error) throw error;
    res.status(201).json(data[0]);
  } catch (err) {
    res.status(500).json({ error: "Erreur lors de la création du client." });
  }
});

// Bulk Create Clients
app.post('/api/clients/bulk', async (req, res) => {
  const clients = req.body;
  if (!Array.isArray(clients)) {
    return res.status(400).json({ error: "Un tableau de clients est requis." });
  }

  try {
    console.log(`[BULK] Début de l'importation de ${clients.length} clients.`);
    
    // On sépare pour traiter différemment ceux qui ont un identifiant IUC/CRP
    const withIuc = [];
    const withoutIuc = [];
    
    clients.forEach(c => {
      if (c.iuc_crp_number && c.iuc_crp_number.toString().trim().length > 0) {
        withIuc.push(c);
      } else {
        withoutIuc.push(c);
      }
    });

    // 1. Dédoublonnage pour ceux avec IUC (Pivot = iuc_crp_number)
    const uniqueIucMap = new Map();
    withIuc.forEach(c => {
      uniqueIucMap.set(c.iuc_crp_number.toString().trim(), c);
    });
    const finalWithIuc = Array.from(uniqueIucMap.values());

    console.log(`[BULK] Clients avec IUC (dépliés) : ${finalWithIuc.length}`);
    console.log(`[BULK] Clients sans IUC : ${withoutIuc.length}`);

    let totalInsertedOrUpdated = 0;

    // 2. Upsert basé sur IUC/CRP
    if (finalWithIuc.length > 0) {
      const { data, error } = await supabaseAdmin
        .from('clients')
        .upsert(finalWithIuc, { onConflict: 'iuc_crp_number' })
        .select();
      
      if (error) {
        console.error("UPSERT Error (IUC) :", error.message);
        throw error;
      }
      totalInsertedOrUpdated += (data?.length || 0);
    }

    // 3. Insertion simple pour ceux sans IUC (accepte tous les doublons)
    if (withoutIuc.length > 0) {
      const { data, error } = await supabaseAdmin
        .from('clients')
        .insert(withoutIuc)
        .select();
      
      if (error) {
        console.error("INSERT Error (Sans IUC) :", error.message);
        // On ne crashe pas tout pour ça, mais on prévient
      } else {
        totalInsertedOrUpdated += (data?.length || 0);
      }
    }

    console.log(`[BULK] Total importé/mis à jour : ${totalInsertedOrUpdated}`);

    // 2. Single Activity Log for the whole batch
    await supabaseAdmin.from('activity_logs').insert([{
      activity_type: 'IMPORT_MASSIF',
      description: `Importation massive réussie de ${totalInsertedOrUpdated} clients.`,
      module: 'GESTION_CLIENTS',
      status: 'SUCCESS'
    }]);

    res.json({ 
      success: true, 
      count: totalInsertedOrUpdated
    });
  } catch (err) {
    console.error("Bulk Import Error:", err.message);
    res.status(500).json({ error: "Erreur lors de l'importation massive." });
  }
});

// Bulk Update Clients by ID (for Referral Uploads)
app.post('/api/clients/bulk-update', async (req, res) => {
  const updates = req.body;
  if (!Array.isArray(updates)) {
    return res.status(400).json({ error: "Un tableau de mises à jour est requis." });
  }

  try {
    console.log(`[BULK-UPDATE] Mise à jour de ${updates.length} clients.`);
    
    // Perform bulk upsert on conflict 'id'
    const { data, error } = await supabaseAdmin
      .from('clients')
      .upsert(updates, { onConflict: 'id' });

    if (error) throw error;

    // Log the activity
    await supabaseAdmin.from('activity_logs').insert([{
      activity_type: 'MISE_A_JOUR_MASSIVE',
      description: `Mise à jour massive de ${updates.length} clients (Référencements).`,
      module: 'REFERENCEMENT',
      status: 'SUCCESS'
    }]);

    res.json({ success: true, count: updates.length });
  } catch (err) {
    console.error("[BULK-UPDATE] Erreur:", err.message);
    res.status(500).json({ error: "Erreur lors de la mise à jour massive des clients." });
  }
});


// Bulk Insert Sessions with Validation
app.post('/api/sessions/bulk', async (req, res) => {
  console.info(`[BULK SESSIONS] Request received. Body type: ${typeof req.body}, isArray: ${Array.isArray(req.body)}`);
  try {
    const sessions = req.body;
    if (!Array.isArray(sessions)) {
       console.warn("[BULK SESSIONS] Rejecting: not an array.");
       return res.status(400).json({ error: "Format attendu: tableau de séances." });
    }

    console.info(`[BULK SESSIONS] Starting validation and import of ${sessions.length} sessions.`);

    for (let i = 0; i < sessions.length; i++) {
      const s = sessions[i];
      
      // 1. Basic Schema Validation (Zod)
      const validation = sessionSchema.safeParse(s);
      if (!validation.success) {
        const firstError = (validation.error.issues || [])[0];
        return res.status(400).json({ 
          error: `Format invalide : ${firstError.message}`,
          rowIndex: i,
          field: firstError.path.join('.'),
          clientName: s.title
        });
      }

      const { date, start_time, duration, facilitator_name, advisor_name, contract_id } = s;
      const startMinutes = timeToMinutes(start_time);
      const endMinutes = startMinutes + parseInt(duration);

      // 2. Overlap validation (TEMPORARILY DISABLED for historical imports)
      /*
      const { data: existingSessions, error: fetchError } = await supabaseAdmin
        .from('sessions')
        .select('title, start_time, duration, facilitator_name, advisor_name')
        .eq('date', date);

      if (fetchError) throw fetchError;

      for (const existing of existingSessions) {
        const sStart = timeToMinutes(existing.start_time);
        const sEnd = sStart + parseInt(existing.duration);
        const hasOverlap = (startMinutes < sEnd && sStart < endMinutes);
        
        if (hasOverlap) {
          if (facilitator_name && existing.facilitator_name === facilitator_name) {
            return res.status(400).json({ 
              error: `Conflit d'horaire pour le facilitateur "${facilitator_name}" avec la séance "${existing.title}" (${existing.start_time}).`,
              rowIndex: i,
              field: 'start_time',
              clientName: s.title
            });
          }
          if (advisor_name && existing.advisor_name === advisor_name) {
            return res.status(400).json({ 
              error: `Conflit d'horaire pour le conseiller "${advisor_name}" avec la séance "${existing.title}" (${existing.start_time}).`,
              rowIndex: i,
              field: 'start_time',
              clientName: s.title
            });
          }
        }
      }
      */

      // 3. Contract check
      if (contract_id) {
        const { data: contract, error: contractError } = await supabaseAdmin
          .from('contracts')
          .select('total_sessions, used_sessions, consultant_name')
          .eq('id', contract_id)
          .single();
        
        if (contract && contract.used_sessions >= contract.total_sessions) {
          return res.status(400).json({ 
            error: `Le contrat de ${contract.consultant_name} est épuisé (${contract.used_sessions}/${contract.total_sessions} séances).`,
            rowIndex: i,
            field: 'contract_id',
            clientName: s.title
          });
        }
      }
    }

    // If all pass, proceed to bulk insert
    const { data, error } = await supabaseAdmin
      .from('sessions')
      .insert(sessions)
      .select();

    if (error) throw error;

    await supabaseAdmin.from('activity_logs').insert([{
      activity_type: 'IMPORT_MASSIF',
      description: `Importation massive réussie de ${data.length} séances.`,
      module: 'CALENDRIER',
      status: 'SUCCESS'
    }]);

    res.json({ success: true, count: data.length });
  } catch (err) {
    console.error("Bulk Sessions Error:", err.message);
    res.status(500).json({ error: `Erreur lors de l'importation massive : ${err.message}` });
  }
});

// Helper to convert time "HH:mm" to minutes from midnight
const timeToMinutes = (timeStr) => {
  const [hours, minutes] = timeStr.split(':').map(Number);
  return hours * 60 + minutes;
};

// Create Session with Overlap Validation
app.post('/api/sessions', validate(sessionSchema), async (req, res) => {
  const { title, date, start_time, duration, facilitator_name, advisor_name, contract_id } = req.body;

  const startMinutes = timeToMinutes(start_time);
  const endMinutes = startMinutes + duration;

  try {
    // 1. Overlap validation - USE ADMIN to see all sessions
    const { data: existingSessions, error: fetchError } = await supabaseAdmin
      .from('sessions')
      .select('title, start_time, duration, facilitator_name, advisor_name')
      .eq('date', date);

    if (fetchError) throw fetchError;

    for (const s of existingSessions) {
      const sStart = timeToMinutes(s.start_time);
      const sEnd = sStart + parseInt(s.duration);

      const hasOverlap = (startMinutes < sEnd && sStart < endMinutes);
      
      if (hasOverlap) {
        if (facilitator_name && s.facilitator_name === facilitator_name) {
          return res.status(400).json({ 
            error: `Conflit d'horaire pour le facilitateur "${facilitator_name}" avec la séance "${s.title}" (${s.start_time}).` 
          });
        }
        if (advisor_name && s.advisor_name === advisor_name) {
          return res.status(400).json({ 
            error: `Conflit d'horaire pour le conseiller "${advisor_name}" avec la séance "${s.title}" (${s.start_time}).` 
          });
        }
      }
    }

    // 2. Contract check - USE ADMIN to see global status
    if (contract_id) {
      const { data: contract, error: contractError } = await supabaseAdmin
        .from('contracts')
        .select('total_sessions, used_sessions, consultant_name')
        .eq('id', contract_id)
        .single();
      
      if (contract && contract.used_sessions >= contract.total_sessions) {
        return res.status(400).json({ error: `Le contrat de ${contract.consultant_name} est épuisé (${contract.used_sessions}/${contract.total_sessions} séances).` });
      }
    }

    // 3. Create - USE ADMIN IF APPROPRIATE
    const client = getMutationClient('sessions', req.sb);
    
    // DEEP DIAGNOSTIC
    console.info(`[CREATE SESSION] User: ${req.user?.email}, Client is Admin: ${client === supabaseAdmin}`);

    // Auto-fill advisor_id from current user
    const sessionToInsert = { ...req.body, advisor_id: req.user?.id };

    const { data, error } = await client.from('sessions').insert([sessionToInsert]).select();
    
    if (error) {
      console.error(`Error creating session in DB:`, error.message);
      throw error;
    }
    res.status(201).json(data[0]);
  } catch (err) {
    console.error(`Internal server error during session creation:`, err.message);
    res.status(500).json({ error: "Erreur lors de la création de la séance." });
  }
});

// Create Contract with validation (restricted to ADMIN/MANAGER)
app.post('/api/contracts', authorize([UserRole.ADMIN, UserRole.MANAGER]), validate(contractSchema), async (req, res) => {
  try {
    const client = getMutationClient('contracts', req.sb);
    const { data, error } = await client.from('contracts').insert([req.body]).select();
    if (error) throw error;
    res.status(201).json(data[0]);
  } catch (err) {
    res.status(500).json({ error: "Erreur lors de la création du contrat." });
  }
});

// Helper for fetching ALL records from a table (bypassing Supabase 1000 limit)
async function fetchAll(query) {
  let allData = [];
  let from = 0;
  const step = 1000;
  let hasMore = true;

  while (hasMore) {
    const { data, error } = await query.range(from, from + step - 1);
    if (error) throw error;
    if (!data || data.length === 0) {
      hasMore = false;
    } else {
      allData = [...allData, ...data];
      if (data.length < step) {
        hasMore = false;
      } else {
        from += step;
      }
    }
  }
  return allData;
}

// Helper to determine if we should use admin client for reading (SELECT)
function getReadClient(table, req) {
  const userRole = req.user?.role;
  const isAdminOrManager = (userRole === UserRole.ADMIN || userRole === UserRole.MANAGER);

  // These tables are required by ALL roles to function (reference data, no PII risk)
  // RLS would block advisors/partners from reading them, breaking the UI
  // workflow_tasks and sessions are included here so automation/list sync works for the team
  const alwaysAdminRead = ['partners', 'app_settings', 'contracts', 'sessions', 'workflow_tasks'];

  // These tables contain sensitive data — only admins/managers get global visibility
  const adminOnlyRead = ['profiles', 'clients'];

  if (alwaysAdminRead.includes(table)) {
    return supabaseAdmin;
  }
  if (adminOnlyRead.includes(table) && isAdminOrManager) {
    return supabaseAdmin;
  }
  return req.sb;
}

// Generic proxy for other tables
app.get('/api/:table', async (req, res) => {
  const { table } = req.params;
  const { page, limit, search, status, city, country, startDate, endDate, facilitator, type, priority } = req.query;

  try {
    const client = getReadClient(table, req);
    let query = client.from(table).select('*', { count: 'exact' });
    
    // --- FILTERS ---
    if (search) {
      if (table === 'clients') {
        query = query.or(`first_name.ilike.%${search}%,last_name.ilike.%${search}%,email.ilike.%${search}%`);
      } else if (table === 'sessions') {
        query = query.ilike('title', `%${search}%`);
      }
    }

    // Special logic for Referral Management
    if (table === 'clients' && req.query.referralOnly === 'true') {
      // In a real PG setting, this would be a join or subquery. 
      // For now, we allow filtering on clients who ALREADY have a partner OR logic handled by UI
      // But to be efficient, let's at least filter by partner presence or a specific referral status if it existed.
      // If we want exact match of the previous logic (has sessions), we need a subquery.
      // Supabase supports filtering on joined tables if we select them.
      // But let's keep it simple for now: match the status filters and partner filters.
    }

    if (status && status !== 'ALL') query = query.eq(table === 'clients' ? 'status' : 'individual_status', status);
    if (city && city !== 'ALL') query = query.eq('destination_city', city);
    if (country && country !== 'ALL') query = query.eq('origin_country', country);
    if (facilitator && facilitator !== 'ALL') query = query.eq('facilitator_name', facilitator);
    if (type && type !== 'ALL') query = query.eq('type', type);

    if (startDate) query = query.gte(table === 'sessions' ? 'date' : 'arrival_date', startDate);
    if (endDate) query = query.lte(table === 'sessions' ? 'date' : 'arrival_date', endDate);

    // --- ORDERING ---
    if (table === 'clients') {
      query = query.order('created_at', { ascending: false });
    } else if (table === 'activity_logs') {
      query = query.order('timestamp', { ascending: false });
    } else if (table === 'sessions') {
      query = query.order('date', { ascending: false }).order('start_time', { ascending: false });
    }

    // --- PAGINATION ---
    if (page && limit) {
      const from = (parseInt(page) - 1) * parseInt(limit);
      const to = from + parseInt(limit) - 1;
      const { data, count, error } = await query.range(from, to);
      if (error) throw error;
      return res.json({ data: data || [], total: count, page: parseInt(page), limit: parseInt(limit) });
    }

    // Fallback: Fetch All (for legacy components or small tables)
    const data = await fetchAll(query);
    res.json(data);
  } catch (err) {
    console.error(`Internal server error for ${table}:`, err.message);
    res.status(500).json({ error: err.message });
  }
});

// Helper to determine if we should use admin client for mutations
// (After roles are already verified by authorize middleware)
function getMutationClient(table, userScopedClient) {
  const restrictedTables = ['partners', 'contracts', 'app_settings', 'activity_logs', 'profiles', 'sessions'];
  if (restrictedTables.includes(table)) {
    return supabaseAdmin;
  }
  return userScopedClient;
}

// Explicit partner mutation routes (require authentication + ADMIN or MANAGER role)
app.post('/api/partners', authenticate_then_authorize([UserRole.ADMIN, UserRole.MANAGER]), async (req, res) => {
  try {
    const db = getAdminClient();
    const { data, error } = await db.from('partners').insert([req.body]).select();
    if (error) throw error;
    console.info(`[POST /api/partners] Created: ${data[0]?.name} by ${req.user?.email}`);
    res.status(201).json(data[0]);
  } catch (err) {
    console.error('[POST /api/partners]', err.message);
    res.status(500).json({ error: err.message });
  }
});

app.put('/api/partners/:id', authenticate_then_authorize([UserRole.ADMIN, UserRole.MANAGER]), async (req, res) => {
  try {
    const db = getAdminClient();
    const { data, error } = await db.from('partners').update(req.body).eq('id', req.params.id).select();
    if (error) throw error;
    res.json(data[0]);
  } catch (err) {
    console.error('[PUT /api/partners]', err.message);
    res.status(500).json({ error: err.message });
  }
});

app.delete('/api/partners/:id', authenticate_then_authorize([UserRole.ADMIN, UserRole.MANAGER]), async (req, res) => {
  try {
    const db = getAdminClient();
    const { error } = await db.from('partners').delete().eq('id', req.params.id);
    if (error) throw error;
    res.json({ success: true });
  } catch (err) {
    console.error('[DELETE /api/partners]', err.message);
    res.status(500).json({ error: err.message });
  }
});

// Specialized route for messaging: mark as read
app.post('/api/messages/mark-read', async (req, res) => {
  const { otherParticipantId } = req.body;
  const currentUserId = req.user?.id;

  if (!otherParticipantId || !currentUserId) {
    console.error('[POST /api/messages/mark-read] Missing parameters:', { otherParticipantId, currentUserId });
    return res.status(400).json({ error: "Missing required parameters" });
  }

  console.info(`[MARK-READ] Admin attempting to mark msgs read. currentUserId (receiver): ${currentUserId}, otherParticipantId (sender): ${otherParticipantId}`);

  try {
    const db = getAdminClient();
    const { data, error } = await db
      .from('messages')
      .update({ is_read: true })
      .eq('receiver_id', currentUserId)
      .eq('sender_id', otherParticipantId)
      .eq('is_read', false)
      .select();

    console.info(`[MARK-READ] Supabase update complete. Error?`, error ? error.message : 'None', `Data:`, data ? data.length : 0);

    if (error) throw error;
    res.json({ success: true });
  } catch (err) {
    console.error('[POST /api/messages/mark-read] Error:', err.message);
    res.status(500).json({ error: "Failed to mark messages as read" });
  }
});

// Generic Bulk Create - Must be defined BEFORE Single Create to prevent route collision
app.post('/api/:table/bulk', async (req, res) => {
  const { table } = req.params;
  const items = req.body;
  
  if (!Array.isArray(items)) {
    return res.status(400).json({ error: "Un tableau d'entrées est requis." });
  }

  try {
    const db = getAdminClient();
    console.info(`[BULK CREATE] Table: ${table}, Items: ${items.length}, User: ${req.user?.email}`);
    
    let query = db.from(table);
    
    // Pour les tâches, on utilise upsert pour ignorer silencieusement les doublons de signature
    if (table === 'workflow_tasks') {
      const { data, error } = await query
        .upsert(items, { onConflict: 'processed_signature', ignoreDuplicates: true })
        .select();
      if (error) throw error;
      return res.status(201).json(data);
    } else {
      const { data, error } = await query.insert(items).select();
      if (error) throw error;
      return res.status(201).json(data);
    }
  } catch (err) {
    console.error(`[BULK CREATE] Error in ${table}:`, err.message);
    res.status(500).json({ error: `Erreur lors de la création groupée dans ${table}.` });
  }
});

// Generic POST (all other tables)
// Create entry
app.post('/api/:table', async (req, res) => {
  const { table } = req.params;
  
  // app_settings: restricted to ADMIN only
  if (table === 'app_settings') {
    return authorize([UserRole.ADMIN])(req, res, async () => {
      await handleCreate(table, req, res);
    });
  }
  
  await handleCreate(table, req, res);
});

async function handleCreate(table, req, res) {
  let body = { ...req.body };
  if (body.user_id === "") body.user_id = null;
  if (body.client_id === "") body.client_id = null;
  if (body.author_id === "") body.author_id = null;
  if (body.consultant_id === "") body.consultant_id = null;

  try {
    const db = getAdminClient();
    console.info(`[CREATE] Table: ${table}, User: ${req.user?.email}, Role: ${req.user?.role}`);

    // Sanitization for sessions
    if (table === 'sessions') {
      const knownSessionFields = [
        'title', 'type', 'category', 'date', 'start_time', 'duration',
        'participant_ids', 'no_show_ids', 'location', 'notes',
        'facilitator_name', 'facilitator_type', 'advisor_name', 'advisor_id',
        'contract_id', 'zoom_link', 'zoom_id', 'needs_interpretation',
        'individual_status', 'discussed_needs', 'actions',
        'invoice_received', 'invoice_submitted', 'invoice_paid', 'invoice_amount',
        'created_at'
      ];
      body = Object.fromEntries(
        Object.entries(body).filter(([key]) => knownSessionFields.includes(key))
      );
      console.info(`[CREATE sessions] Sanitized body keys: ${Object.keys(body).join(', ')}`);
    }

    const { data, error } = await db.from(table).insert([body]).select();
    if (error) throw error;
    res.status(201).json(data[0]);
  } catch (err) {
    console.error(`[CREATE] Error in ${table}:`, err.message);
    res.status(500).json({ error: "Erreur lors de la création de l'entrée." });
  }
}

// Update entry
app.put('/api/:table/:id', async (req, res) => {
  const { table, id } = req.params;
  
  // Custom logic for sessions: Admin OR Creator only
  if (table === 'sessions') {
    try {
      const { data: session, error } = await supabaseAdmin
        .from('sessions')
        .select('advisor_id')
        .eq('id', id)
        .single();
      
      if (error || !session) return res.status(404).json({ error: "Séance non trouvée" });

      const isAdmin = req.user?.role === UserRole.ADMIN;
      const isCreator = session.advisor_id === req.user?.id;

      if (!isAdmin && !isCreator) {
        return res.status(403).json({ error: "Vous n'avez pas le droit de modifier cette séance (Admin ou Créateur uniquement)." });
      }
    } catch (err) {
      return res.status(500).json({ error: "Erreur lors de la vérification des permissions" });
    }
  }

  // For now restrict updates on other sensitive tables
  if (['contracts', 'partners', 'app_settings', 'profiles'].includes(table)) {
     return authorize([UserRole.ADMIN, UserRole.MANAGER])(req, res, async () => {
        await handleUpdate(table, id, req, res);
     });
  }

  await handleUpdate(table, id, req, res);
});

async function handleUpdate(table, id, req, res) {
  try {
    // Always use supabaseAdmin for mutations on protected tables (bypasses RLS)
    const client = getMutationClient(table, req.sb);
    console.info(`[UPDATE] Table: ${table}, ID: ${id}, Client is Admin: ${client === supabaseAdmin}`);
    
    let body = { ...req.body };

    // Strip fields that may not exist in the sessions table schema
    if (table === 'sessions') {
      const knownSessionFields = [
        'title', 'type', 'category', 'date', 'start_time', 'duration',
        'participant_ids', 'no_show_ids', 'location', 'notes',
        'facilitator_name', 'facilitator_type', 'advisor_name', 'advisor_id',
        'contract_id', 'zoom_link', 'zoom_id', 'needs_interpretation',
        'individual_status', 'discussed_needs', 'actions',
        'invoice_received', 'invoice_submitted', 'invoice_paid', 'invoice_amount'
      ];
      body = Object.fromEntries(
        Object.entries(body).filter(([key]) => knownSessionFields.includes(key))
      );
      console.info(`[UPDATE sessions] Sanitized body keys: ${Object.keys(body).join(', ')}`);
    }

    const { data, error } = await client.from(table).update(body).eq('id', id).select();
    if (error) {
      if (error.code === '42703') { // PostgreSQL undefined_column error
        console.warn(`[UPDATE ${table}] One or more columns in the request do not exist in the database: ${error.message}`);
        
        // Retry without the offending keys if it's a known schema mismatch
        if (table === 'sessions') {
          console.info('[UPDATE sessions] Retrying without invoice_amount due to schema mismatch...');
          const fallbackBody = { ...body };
          delete fallbackBody.invoice_amount;
          const { data: d2, error: e2 } = await client.from(table).update(fallbackBody).eq('id', id).select();
          if (e2) throw e2;
          return res.json(d2[0]);
        }
      }
      throw error;
    }
    res.json(data[0]);
  } catch (err) {
    console.error(`Error updating ${table}:`, err.message);
    res.status(err.code === '42703' ? 400 : 500).json({ 
      error: err.code === '42703' ? `Schéma base de données incomplet : ${err.message}` : "Erreur lors de la mise à jour." 
    });
  }
}

// Delete entry — ADMIN can delete anything; ADVISOR can delete their own sessions
app.delete('/api/:table/:id', async (req, res) => {
  const { table, id } = req.params;
  const userRole = req.user?.role;
  const isAdmin = userRole === UserRole.ADMIN;
  const isAdvisor = userRole === UserRole.ADVISOR;

  // Only admin or manager can delete partners/contracts/settings; advisors can only delete their sessions
  const isAdminOrManager = userRole === UserRole.ADMIN || userRole === UserRole.MANAGER;

  if (table !== 'sessions' && !isAdminOrManager) {
    return res.status(403).json({ error: "Accès refusé. Seul un administrateur ou gestionnaire peut effectuer cette suppression." });
  }

  try {
    // For sessions: advisors can only delete sessions they created
    if (table === 'sessions' && isAdvisor) {
      const { data: session, error: fetchErr } = await supabaseAdmin
        .from('sessions')
        .select('advisor_id, advisor_name')
        .eq('id', id)
        .single();

      if (fetchErr || !session) {
        return res.status(404).json({ error: "Séance introuvable." });
      }

      const isOwner = session.advisor_id === req.user?.id;
      
      // Fallback to name matching if advisor_id is missing (legacy)
      let isNameOwner = false;
      if (!session.advisor_id && session.advisor_name) {
        const { data: profile } = await supabaseAdmin
          .from('profiles')
          .select('first_name, last_name')
          .eq('id', req.user?.id)
          .single();
        const profileFullName = profile ? `${profile.first_name} ${profile.last_name}`.trim().toLowerCase() : '';
        isNameOwner = session.advisor_name.trim().toLowerCase() === profileFullName;
      }

      if (!isOwner && !isNameOwner && !isAdmin) {
        return res.status(403).json({ error: "Vous ne pouvez supprimer que vos propres séances." });
      }
    }

    const { error } = await supabaseAdmin.from(table).delete().eq('id', id);
    if (error) throw error;
    res.json({ success: true });
  } catch (err) {
    console.error(`Error deleting from ${table}:`, err.message);
    res.status(500).json({ error: "Erreur lors de la suppression." });
  }
});

app.listen(PORT, '0.0.0.0', () => {
  console.log(`Server is running on http://0.0.0.0:${PORT}`);
});

// 404 Handler for API
app.use('/api', (req, res) => {
  res.status(404).json({ error: `Route non trouvée : ${req.method} ${req.originalUrl}` });
});

// Global Error Handler
app.use((err, req, res, next) => {
  console.error('Unhandled Error:', err);
  res.status(500).json({ 
    error: "Une erreur interne est survenue.",
    message: process.env.NODE_ENV === 'development' ? err.message : undefined 
  });
});
