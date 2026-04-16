import React, { useState, useEffect } from 'react';
import { apiService } from '../services/apiService';
import { Settings as SettingsIcon, Upload, Loader2, CheckCircle2, AlertCircle, Image as ImageIcon } from 'lucide-react';

const Settings: React.FC = () => {
  const [logoUrl, setLogoUrl] = useState<string | null>(null);
  const [loginPhotoUrl, setLoginPhotoUrl] = useState<string | null>(null);
  const [isUploading, setIsUploading] = useState(false);
  const [uploadType, setUploadType] = useState<'logo' | 'login_photo' | null>(null);
  const [status, setStatus] = useState<'idle' | 'success' | 'error'>('idle');
  const [errorMessage, setErrorMessage] = useState('');

  useEffect(() => {
    fetchSettings();
  }, []);

  const fetchSettings = async () => {
    try {
      const data = await apiService.fetchTable('app_settings');
      const settings = Array.isArray(data) ? data[0] : data;
      if (settings) {
        if (settings.logo_url) setLogoUrl(settings.logo_url);
        if (settings.login_photo_url) setLoginPhotoUrl(settings.login_photo_url);
      }
    } catch (err) {
      console.warn("La table app_settings n'existe peut-être pas encore.", err);
    }
  };

  const handleFileUpload = async (e: React.ChangeEvent<HTMLInputElement>, type: 'logo' | 'login_photo') => {
    const file = e.target.files?.[0];
    if (!file) return;

    setIsUploading(true);
    setUploadType(type);
    setStatus('idle');
    setErrorMessage('');

    try {
      // 1. Upload via Proxy
      const fileExt = file.name.split('.').pop();
      const fileName = `${type}-${Date.now()}.${fileExt}`;
      const assetData = await apiService.uploadFile(file, 'app-assets', fileName);
      const publicUrl = assetData.url;

      // 2. Save settings via Proxy
      const updateData: any = { id: 1 };
      if (type === 'logo') updateData.logo_url = publicUrl;
      else updateData.login_photo_url = publicUrl;

      await apiService.update('app_settings', 1, updateData);

      if (type === 'logo') setLogoUrl(publicUrl);
      else setLoginPhotoUrl(publicUrl);
      
      setStatus('success');
      
      // Force reload to apply logo everywhere
      setTimeout(() => {
        window.location.reload();
      }, 1500);

    } catch (err: any) {
      console.error("Upload error:", err);
      setStatus('error');
      setErrorMessage(err.message || "Erreur lors du téléversement. Vérifiez que le bucket 'app-assets' et la table 'app_settings' existent.");
    } finally {
      setIsUploading(false);
      setUploadType(null);
    }
  };

  return (
    <div className="max-w-3xl mx-auto space-y-6">
      <div className="slds-card p-8">
        <div className="flex items-center gap-4 mb-8">
          <div className="p-4 bg-slate-900 text-white rounded-2xl shadow-lg">
            <SettingsIcon size={24} />
          </div>
          <div>
            <h2 className="text-2xl font-black text-slate-900 tracking-tight">Paramètres de l'application</h2>
            <p className="text-xs font-bold text-slate-400 uppercase tracking-widest mt-1">Personnalisation et configuration globale</p>
          </div>
        </div>

        <div className="space-y-8">
          {/* Section Logo */}
          <div className="p-6 bg-slate-50 rounded-3xl border border-slate-100">
            <h3 className="text-sm font-black text-slate-900 uppercase tracking-widest mb-4 flex items-center gap-2">
              <ImageIcon size={18} className="text-slds-brand" /> Logo de l'application
            </h3>
            
            <div className="flex flex-col md:flex-row gap-8 items-start">
              <div className="flex-1 space-y-4">
                <p className="text-sm text-slate-500 font-medium leading-relaxed">
                  Téléversez un logo personnalisé pour remplacer le logo par défaut "Arrivio". 
                  Il sera visible sur la page de connexion et dans la barre latérale.
                  <br/><br/>
                  <span className="text-xs font-bold text-slate-400 bg-white px-2 py-1 rounded-md border border-slate-200">Format recommandé : PNG ou SVG transparent, max 2MB.</span>
                </p>

                {status === 'success' && (
                  <div className="p-4 bg-emerald-50 border border-emerald-100 rounded-2xl flex items-center gap-3 text-emerald-600 animate-in fade-in">
                    <CheckCircle2 size={20} />
                    <p className="text-xs font-bold uppercase tracking-widest">Logo mis à jour avec succès !</p>
                  </div>
                )}

                {status === 'error' && (
                  <div className="p-4 bg-red-50 border border-red-100 rounded-2xl flex items-start gap-3 text-red-600 animate-in fade-in">
                    <AlertCircle size={20} className="shrink-0 mt-0.5" />
                    <p className="text-xs font-bold leading-relaxed">{errorMessage}</p>
                  </div>
                )}

                <div className="relative">
                  <input 
                    type="file" 
                    accept="image/png, image/jpeg, image/svg+xml"
                    onChange={(e) => handleFileUpload(e, 'logo')}
                    disabled={isUploading}
                    className="absolute inset-0 w-full h-full opacity-0 cursor-pointer disabled:cursor-not-allowed"
                  />
                  <div className={`slds-button ${
                    isUploading && uploadType === 'logo'
                      ? 'bg-slate-200 text-slate-400' 
                      : 'slds-button-brand !py-4'
                  }`}>
                    {isUploading && uploadType === 'logo' ? <Loader2 size={18} className="animate-spin mr-2" /> : <Upload size={18} className="mr-2" />}
                    {isUploading && uploadType === 'logo' ? 'Téléversement...' : 'Choisir une image'}
                  </div>
                </div>
              </div>

              <div className="w-full md:w-64 shrink-0 flex flex-col items-center justify-center p-6 bg-white rounded-2xl border border-slate-200 shadow-sm">
                <p className="text-[10px] font-black text-slate-300 uppercase tracking-widest mb-4">Aperçu actuel</p>
                {logoUrl ? (
                  <img src={logoUrl} alt="Logo personnalisé" className="max-w-full h-auto max-h-32 object-contain" />
                ) : (
                  <div className="flex items-center gap-2 opacity-50">
                    <div className="w-8 h-8 bg-slds-brand rounded-xl flex items-center justify-center font-black text-white text-sm">A</div>
                    <span className="text-lg font-black tracking-tighter uppercase text-slate-900">Arrivio</span>
                  </div>
                )}
              </div>
            </div>
          </div>

          {/* Section Photo Connexion */}
          <div className="p-6 bg-slate-50 rounded-3xl border border-slate-100">
            <h3 className="text-sm font-black text-slate-900 uppercase tracking-widest mb-4 flex items-center gap-2">
              <ImageIcon size={18} className="text-indigo-600" /> Photo de la page de connexion
            </h3>
            
            <div className="flex flex-col md:flex-row gap-8 items-start">
              <div className="flex-1 space-y-4">
                <p className="text-sm text-slate-500 font-medium leading-relaxed">
                  Cette photo s'affichera uniquement sur la page de connexion, au-dessus du logo. 
                  Elle est idéale pour renforcer l'identité visuelle de votre portail.
                  <br/><br/>
                  <span className="text-xs font-bold text-slate-400 bg-white px-2 py-1 rounded-md border border-slate-200">Format recommandé : Paysage, haute résolution, max 5MB.</span>
                </p>

                <div className="relative">
                  <input 
                    type="file" 
                    accept="image/png, image/jpeg"
                    onChange={(e) => handleFileUpload(e, 'login_photo')}
                    disabled={isUploading}
                    className="absolute inset-0 w-full h-full opacity-0 cursor-pointer disabled:cursor-not-allowed"
                  />
                  <div className={`slds-button ${
                    isUploading && uploadType === 'login_photo'
                      ? 'bg-slate-200 text-slate-400' 
                      : 'slds-button-brand !bg-indigo-600 !shadow-indigo-100 !py-4'
                  }`}>
                    {isUploading && uploadType === 'login_photo' ? <Loader2 size={18} className="animate-spin mr-2" /> : <Upload size={18} className="mr-2" />}
                    {isUploading && uploadType === 'login_photo' ? 'Téléversement...' : 'Choisir une photo'}
                  </div>
                </div>
              </div>

              <div className="w-full md:w-64 shrink-0 flex flex-col items-center justify-center p-6 bg-white rounded-2xl border border-slate-200 shadow-sm">
                <p className="text-[10px] font-black text-slate-300 uppercase tracking-widest mb-4">Aperçu actuel</p>
                {loginPhotoUrl ? (
                  <img src={loginPhotoUrl} alt="Photo de connexion" className="max-w-full h-auto max-h-32 object-cover rounded-lg" />
                ) : (
                  <div className="w-full h-32 bg-slate-100 rounded-lg flex items-center justify-center border-2 border-dashed border-slate-200">
                    <ImageIcon size={24} className="text-slate-300" />
                  </div>
                )}
              </div>
            </div>
          </div>

          {/* Instructions SQL */}
          <div className="p-6 bg-amber-50 rounded-3xl border border-amber-100">
            <h3 className="text-sm font-black text-amber-900 uppercase tracking-widest mb-2 flex items-center gap-2">
              <AlertCircle size={18} /> Prérequis Supabase
            </h3>
            <p className="text-xs text-amber-800 font-medium leading-relaxed mb-4">
              Pour que cette fonctionnalité marche, vous devez exécuter ce code SQL dans votre tableau de bord Supabase (SQL Editor) :
            </p>
            <pre className="p-4 bg-amber-900/5 text-amber-900 rounded-xl text-[10px] font-mono overflow-x-auto border border-amber-900/10">
{`-- 1. Créer la table des paramètres
CREATE TABLE IF NOT EXISTS app_settings (
  id INTEGER PRIMARY KEY,
  logo_url TEXT,
  login_photo_url TEXT
);

-- Désactiver RLS pour cette table de configuration (ou créer des policies)
ALTER TABLE app_settings DISABLE ROW LEVEL SECURITY;

-- 2. Insérer la ligne par défaut
INSERT INTO app_settings (id, logo_url, login_photo_url) VALUES (1, NULL, NULL) ON CONFLICT (id) DO NOTHING;

-- 3. Créer le bucket de stockage (si non existant)
insert into storage.buckets (id, name, public) 
values ('app-assets', 'app-assets', true)
on conflict (id) do nothing;

-- 4. Autoriser l'upload et la lecture publique des images
CREATE POLICY "Public Access" ON storage.objects FOR SELECT USING (bucket_id = 'app-assets');
CREATE POLICY "Allow Uploads" ON storage.objects FOR INSERT WITH CHECK (bucket_id = 'app-assets');
CREATE POLICY "Allow Updates" ON storage.objects FOR UPDATE USING (bucket_id = 'app-assets');

-- 5. Désactiver RLS pour la table contracts (Correction de l'erreur de création de contrat)
ALTER TABLE contracts DISABLE ROW LEVEL SECURITY;`}
            </pre>
          </div>
        </div>
      </div>
    </div>
  );
};

export default Settings;
