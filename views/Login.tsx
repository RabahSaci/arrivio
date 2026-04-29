
import React, { useState, useEffect } from 'react';
import { UserRole } from '../types';
import { apiService } from '../services/apiService';
import { ShieldCheck, Mail, Lock, Loader2, ArrowRight, Info, AlertCircle, Building2, ArrowLeft, Send, CheckCircle2 } from 'lucide-react';

interface LoginProps {
  onLogin: (role: UserRole, userId: string, userName: string, partnerId?: string) => void;
}

const Login: React.FC<LoginProps> = ({ onLogin }) => {
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [isLoading, setIsLoading] = useState(false);
  const [isResetMode, setIsResetMode] = useState(false);
  const [resetSent, setResetSent] = useState(false);
  const [error, setError] = useState('');
  const [logoError, setLogoError] = useState(false);
  const [customLogoUrl, setCustomLogoUrl] = useState<string | null>(null);
  const [loginPhotoUrl, setLoginPhotoUrl] = useState<string | null>(null);
  const [isRecoveryMode, setIsRecoveryMode] = useState(false);
  const [newPassword, setNewPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');

  useEffect(() => {
    const fetchSettings = async () => {
      try {
        const data = await apiService.fetchTable('app_settings');
        const settings = Array.isArray(data) ? data[0] : data;
        if (settings?.logoUrl) setCustomLogoUrl(settings.logoUrl);
        if (settings?.loginPhotoUrl) setLoginPhotoUrl(settings.loginPhotoUrl);
      } catch (e) {
        // Ignore if table doesn't exist yet
      }
    };
    fetchSettings();

    // Check for recovery hash
    if (window.location.hash) {
      const hash = window.location.hash.substring(1);
      const params = new URLSearchParams(hash);
      const accessToken = params.get('access_token');
      const type = params.get('type');
      
      if (accessToken && type === 'recovery') {
        localStorage.removeItem('arrivio_user'); // Prevent auto-login with recovery token
        localStorage.setItem('arrivio_token', accessToken);
        setIsRecoveryMode(true);
        // Clear hash to avoid showing it in URL
        window.history.replaceState(null, '', window.location.pathname);
      }
    }
  }, []);

  const handleSignIn = async (e: React.FormEvent) => {
    e.preventDefault();
    setIsLoading(true);
    setError('');

    try {
      const data = await apiService.login(email, password);
      
      const { user, profile } = data;

      if (profile) {
        const fullName = `${profile.firstName} ${profile.lastName}`;
        onLogin(profile.role as UserRole, user.id, fullName, profile.partnerId);
      } else {
        onLogin(UserRole.ADVISOR, user.id, email);
      }
    } catch (err: any) {
      console.error("Login failed:", err);
      setError(err.message === 'Invalid login credentials' 
        ? 'Identifiants invalides. Vérifiez votre email et mot de passe.' 
        : err.message);
    } finally {
      setIsLoading(false);
    }
  };

  const handleResetPassword = async (e: React.FormEvent) => {
    e.preventDefault();
    setIsLoading(true);
    setError('');
    
    try {
      await apiService.resetPasswordRequest(email);
      setResetSent(true);
    } catch (err: any) {
      setError(err.message || "Une erreur est survenue lors de l'envoi de l'email.");
    } finally {
      setIsLoading(false);
    }
  };

  const handleRecoverySetPassword = async (e: React.FormEvent) => {
    e.preventDefault();
    if (newPassword !== confirmPassword) {
      setError("Les mots de passe ne correspondent pas.");
      return;
    }
    
    setIsLoading(true);
    setError('');
    
    try {
      await apiService.recoveryUpdatePassword(newPassword);
      setResetSent(true); // Re-use resetSent for success state
      setTimeout(() => {
        setIsRecoveryMode(false);
        setResetSent(false);
        localStorage.removeItem('arrivio_token'); // Clear temporary recovery token
      }, 3000);
    } catch (err: any) {
      setError(err.message || "Impossible de réinitialiser le mot de passe.");
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <div className="min-h-screen flex flex-col md:flex-row bg-white">
      {/* Panneau de Gauche */}
      <div className="hidden md:flex md:w-1/2 bg-slate-900 relative overflow-hidden flex-col justify-between p-12 lg:p-16">
        <div className="absolute inset-0 bg-[radial-gradient(circle_at_top_right,_var(--tw-gradient-stops))] from-blue-600/20 via-slate-900 to-slate-900"></div>
        <div className="relative z-10">
          <div className="mb-8">
            {customLogoUrl ? (
              <img 
                src={customLogoUrl} 
                alt="Arrivio" 
                className="h-32 w-auto max-w-full brightness-0 invert object-contain" 
                onError={() => setCustomLogoUrl(null)}
              />
            ) : !logoError ? (
              <img 
                src="logo.png" 
                alt="Arrivio" 
                className="h-32 w-auto max-w-full brightness-0 invert object-contain" 
                onError={() => setLogoError(true)}
              />
            ) : (
              <div className="flex items-center gap-3 text-white">
                <div className="w-8 h-8 bg-blue-600 rounded-2xl flex items-center justify-center font-black text-lg">A</div>
                <span className="text-lg font-black tracking-tighter uppercase">Arrivio</span>
              </div>
            )}
          </div>
          <h1 className="text-4xl lg:text-5xl font-black text-white leading-tight tracking-tighter mb-4">
            La continuité <br />
            <span className="text-blue-500">numérique</span> du <br />
            parcours francophone.
          </h1>
          <p className="text-slate-400 text-base max-w-md font-medium leading-relaxed">
            Une plateforme unifiée pour accompagner les nouveaux arrivants du pré-arrivée vers leur installation en Ontario sans jamais perdre le fil.
          </p>
        </div>
        <div className="relative z-10 space-y-8">
          <div className="flex gap-4 items-center">
            <div className="p-3 bg-white/5 border border-white/10 rounded-2xl text-blue-400">
              <Building2 size={24} />
            </div>
            <div>
              <p className="text-white font-bold text-sm tracking-tight">Centre Francophone du Grand Toronto</p>
            </div>
          </div>
        </div>
      </div>
      
      {/* Panneau de Droite (Formulaire) */}
      <div className="flex-1 flex flex-col justify-start items-center p-6 lg:p-10 bg-slate-50 md:bg-white overflow-y-auto">
        <div className="w-full max-w-sm pt-0 md:pt-1 pb-8">
          {isRecoveryMode ? (
            <div className="animate-in fade-in slide-in-from-bottom-2">
              <div className="mb-10">
                <h2 className="text-3xl font-black text-slate-900 tracking-tight mb-2">Nouveau mot de passe</h2>
                <p className="text-slate-500 font-medium">Définissez votre nouveau mot de passe sécurisé.</p>
              </div>

              {resetSent ? (
                <div className="p-8 bg-emerald-50 border border-emerald-100 rounded-[32px] text-center space-y-4 animate-in zoom-in-95 duration-300">
                  <div className="w-16 h-16 bg-emerald-500 text-white rounded-full flex items-center justify-center mx-auto shadow-lg shadow-emerald-200">
                    <CheckCircle2 size={32} />
                  </div>
                  <div>
                    <p className="font-black text-slate-900 uppercase text-xs tracking-widest">Réussi !</p>
                    <p className="text-xs text-slate-600 mt-2 leading-relaxed">Votre mot de passe a été mis à jour. Redirection...</p>
                  </div>
                </div>
              ) : (
                <form onSubmit={handleRecoverySetPassword} className="space-y-5">
                  {error && (
                    <div className="p-4 bg-red-50 border border-red-100 rounded-2xl flex items-start gap-3 text-red-600">
                      <AlertCircle size={18} className="shrink-0 mt-0.5" />
                      <p className="text-xs font-bold leading-relaxed">{error}</p>
                    </div>
                  )}
                  <div className="space-y-1.5">
                    <label className="text-[10px] font-black text-slate-400 uppercase tracking-widest ml-1">Nouveau mot de passe</label>
                    <div className="relative group">
                      <Lock className="absolute left-4 top-1/2 -translate-y-1/2 text-slate-400 group-focus-within:text-slds-brand transition-colors" size={18} />
                      <input 
                        type="password" 
                        required 
                        placeholder="••••••••" 
                        value={newPassword} 
                        onChange={(e) => setNewPassword(e.target.value)} 
                        className="w-full pl-12 pr-4 py-4 bg-slate-50 md:bg-white border border-slate-200 rounded-2xl outline-none focus:ring-4 focus:ring-slds-brand/10 focus:border-slds-brand transition-all font-bold text-slate-700 placeholder:text-slate-300" 
                      />
                    </div>
                  </div>
                  <div className="space-y-1.5">
                    <label className="text-[10px] font-black text-slate-400 uppercase tracking-widest ml-1">Confirmer le mot de passe</label>
                    <div className="relative group">
                      <Lock className="absolute left-4 top-1/2 -translate-y-1/2 text-slate-400 group-focus-within:text-slds-brand transition-colors" size={18} />
                      <input 
                        type="password" 
                        required 
                        placeholder="••••••••" 
                        value={confirmPassword} 
                        onChange={(e) => setConfirmPassword(e.target.value)} 
                        className="w-full pl-12 pr-4 py-4 bg-slate-50 md:bg-white border border-slate-200 rounded-2xl outline-none focus:ring-4 focus:ring-slds-brand/10 focus:border-slds-brand transition-all font-bold text-slate-700 placeholder:text-slate-300" 
                      />
                    </div>
                  </div>
                  <button type="submit" disabled={isLoading} className="w-full bg-slds-brand text-white font-black py-4 rounded-2xl shadow-xl shadow-slds-brand/20 hover:bg-slds-brand-dark transition-all flex items-center justify-center gap-2 uppercase text-[11px] tracking-widest mt-8 disabled:opacity-70">
                    {isLoading ? <><Loader2 size={16} className="animate-spin" /> Enregistrement...</> : <>Enregistrer le mot de passe <ArrowRight size={16} /></>}
                  </button>
                </form>
              )}
            </div>
          ) : !isResetMode ? (
            <>
              <div className="mb-4 text-center animate-in fade-in slide-in-from-bottom-2">
                {loginPhotoUrl && (
                  <div className="mb-4 rounded-[32px] overflow-hidden shadow-2xl shadow-indigo-100 border border-slate-100">
                    <img 
                      src={loginPhotoUrl} 
                      alt="Bienvenue" 
                      className="w-full h-auto object-cover max-h-[200px]"
                    />
                  </div>
                )}
                {customLogoUrl ? (
                  <img 
                    src={customLogoUrl} 
                    alt="Arrivio" 
                    className="h-32 w-auto max-w-full mb-8 mx-auto object-contain" 
                    onError={() => setCustomLogoUrl(null)}
                  />
                ) : !logoError ? (
                  <img 
                    src="logo.png" 
                    alt="Arrivio" 
                    className="h-32 w-auto max-w-full mb-8 mx-auto object-contain" 
                    onError={() => setLogoError(true)}
                  />
                ) : (
                  <div className="mb-4 flex items-center gap-3 justify-center">
                    <div className="w-10 h-10 bg-slds-brand rounded-2xl flex items-center justify-center font-black text-xl text-white shadow-xl">A</div>
                    <span className="text-2xl font-black tracking-tighter uppercase text-slate-900">Arrivio</span>
                  </div>
                )}
              </div>
              <form onSubmit={handleSignIn} className="space-y-4">
                {error && (
                  <div className="p-4 bg-red-50 border border-red-100 rounded-2xl flex items-start gap-3 text-red-600 animate-in fade-in slide-in-from-top-1">
                    <AlertCircle size={18} className="shrink-0 mt-0.5" />
                    <p className="text-xs font-bold leading-relaxed">{error}</p>
                  </div>
                )}
                <div className="space-y-1.5">
                  <label className="text-[10px] font-black text-slate-400 uppercase tracking-widest ml-1">Adresse Courriel</label>
                  <div className="relative group">
                    <Mail className="absolute left-4 top-1/2 -translate-y-1/2 text-slate-400 group-focus-within:text-slds-brand transition-colors" size={18} />
                    <input type="email" required placeholder="votre.nom@cfgt.ca" value={email} onChange={(e) => setEmail(e.target.value)} className="w-full pl-12 pr-4 py-4 bg-slate-50 md:bg-white border border-slate-200 rounded-2xl outline-none focus:ring-4 focus:ring-slds-brand/10 focus:border-slds-brand transition-all font-bold text-slate-700 placeholder:text-slate-300" />
                  </div>
                </div>
                <div className="space-y-1.5">
                  <div className="flex justify-between items-center ml-1">
                    <label className="text-[10px] font-black text-slate-400 uppercase tracking-widest">Mot de passe</label>
                    <button 
                      type="button" 
                      onClick={() => { setIsResetMode(true); setError(''); }}
                      className="text-[10px] font-black text-slds-brand uppercase tracking-widest hover:underline"
                    >
                      Mot de passe oublié ?
                    </button>
                  </div>
                  <div className="relative group">
                    <Lock className="absolute left-4 top-1/2 -translate-y-1/2 text-slate-400 group-focus-within:text-slds-brand transition-colors" size={18} />
                    <input type="password" required placeholder="••••••••" value={password} onChange={(e) => setPassword(e.target.value)} className="w-full pl-12 pr-4 py-4 bg-slate-50 md:bg-white border border-slate-200 rounded-2xl outline-none focus:ring-4 focus:ring-slds-brand/10 focus:border-slds-brand transition-all font-bold text-slate-700 placeholder:text-slate-300" />
                  </div>
                </div>
                <button type="submit" disabled={isLoading} className="w-full bg-slds-brand text-white font-black py-4 rounded-2xl shadow-xl shadow-slds-brand/20 hover:bg-slds-brand-dark transition-all flex items-center justify-center gap-2 uppercase text-[11px] tracking-widest mt-6 disabled:opacity-70">
                  {isLoading ? <><Loader2 size={16} className="animate-spin" /> Vérification...</> : <>Entrer dans le portail <ArrowRight size={16} /></>}
                </button>
              </form>
            </>
          ) : (
            <div className="animate-in fade-in slide-in-from-bottom-2">
              <button 
                onClick={() => { setIsResetMode(false); setResetSent(false); setError(''); }}
                className="flex items-center gap-2 text-slate-400 hover:text-slate-900 transition-colors mb-8 text-[10px] font-black uppercase tracking-widest"
              >
                <ArrowLeft size={16} /> Retour à la connexion
              </button>
              
              <div className="mb-10">
                <h2 className="text-3xl font-black text-slate-900 tracking-tight mb-2">Récupération</h2>
                <p className="text-slate-500 font-medium">Saisissez votre email pour recevoir un lien de réinitialisation.</p>
              </div>

              {resetSent ? (
                <div className="p-8 bg-emerald-50 border border-emerald-100 rounded-[32px] text-center space-y-4 animate-in zoom-in-95 duration-300">
                  <div className="w-16 h-16 bg-emerald-500 text-white rounded-full flex items-center justify-center mx-auto shadow-lg shadow-emerald-200">
                    <CheckCircle2 size={32} />
                  </div>
                  <div>
                    <p className="font-black text-slate-900 uppercase text-xs tracking-widest">Email envoyé !</p>
                    <p className="text-xs text-slate-600 mt-2 leading-relaxed">Consultez votre boîte de réception pour réinitialiser votre mot de passe.</p>
                  </div>
                  <button 
                    onClick={() => { setIsResetMode(false); setResetSent(false); }}
                    className="w-full py-3 bg-white border border-emerald-200 text-emerald-600 rounded-xl text-[10px] font-black uppercase tracking-widest hover:bg-emerald-100 transition-all"
                  >
                    Revenir à l'accueil
                  </button>
                </div>
              ) : (
                <form onSubmit={handleResetPassword} className="space-y-5">
                  {error && (
                    <div className="p-4 bg-red-50 border border-red-100 rounded-2xl flex items-start gap-3 text-red-600">
                      <AlertCircle size={18} className="shrink-0 mt-0.5" />
                      <p className="text-xs font-bold leading-relaxed">{error}</p>
                    </div>
                  )}
                  <div className="space-y-1.5">
                    <label className="text-[10px] font-black text-slate-400 uppercase tracking-widest ml-1">Adresse Courriel</label>
                    <div className="relative group">
                      <Mail className="absolute left-4 top-1/2 -translate-y-1/2 text-slate-400 group-focus-within:text-slds-brand transition-colors" size={18} />
                      <input 
                        type="email" 
                        required 
                        placeholder="votre.nom@cfgt.ca" 
                        value={email} 
                        onChange={(e) => setEmail(e.target.value)} 
                        className="w-full pl-12 pr-4 py-4 bg-slate-50 md:bg-white border border-slate-200 rounded-2xl outline-none focus:ring-4 focus:ring-slds-brand/10 focus:border-slds-brand transition-all font-bold text-slate-700 placeholder:text-slate-300" 
                      />
                    </div>
                  </div>
                  <button type="submit" disabled={isLoading} className="w-full bg-slds-brand text-white font-black py-4 rounded-2xl shadow-xl shadow-slds-brand/20 hover:bg-slds-brand-dark transition-all flex items-center justify-center gap-2 uppercase text-[11px] tracking-widest mt-8 disabled:opacity-70">
                    {isLoading ? <><Loader2 size={16} className="animate-spin" /> Envoi...</> : <>Réinitialiser le mot de passe <Send size={16} /></>}
                  </button>
                </form>
              )}
            </div>
          )}
        </div>
      </div>
    </div>
  );
};

export default Login;
