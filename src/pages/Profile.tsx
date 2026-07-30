import { useState, useEffect } from 'react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Alert, AlertDescription } from '@/components/ui/alert';
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar';
import { Camera, Save, AlertCircle, Clock, CheckCircle2, FileUp, ArrowRight, LogOut } from 'lucide-react';
import { UserProfile } from '@/types/index';
import { loadUserProfile, updateUserProfile, uploadUserAvatar } from '@/lib/userService';
import { useProvider } from '@/contexts/ProviderContext';
import { COUNTRIES_DATA } from '@/lib/countriesData';
import { ImageCropper } from '@/components/ImageCropper';
import { useNavigate } from 'react-router-dom';
import { supabase } from '@/integrations/supabase/client';
import { clearProviderCache } from '@/contexts/ProviderContext';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';


export function Profile() {
  const navigate = useNavigate();
  const { refreshProfile } = useProvider();
  const [profile, setProfile] = useState<UserProfile | null>(null);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState('');
  const [success, setSuccess] = useState('');
  const [uploading, setUploading] = useState(false);
  const [imageToCrop, setImageToCrop] = useState<string | null>(null);
  const [showCropper, setShowCropper] = useState(false);

  const [formData, setFormData] = useState({
    full_name: '',
    bio: '',
    phone_number: '',
    country: '',
    skills: '',
    currency: '',
  });

  useEffect(() => {
    loadProfile();
  }, []);

  const loadProfile = async () => {
    try {
      setLoading(true);
      const data = await loadUserProfile();
      if (data) {
        setProfile(data);
        setFormData({
          full_name: data.full_name || '',
          bio: data.bio || '',
          phone_number: data.phone_number || '',
          country: data.country || '',
          skills: data.skills || '',
          currency: data.currency || '',
        });
      }
    } catch (err) {
      console.error('Error loading profile:', err);
      setError('Erreur au chargement du profil');
    } finally {
      setLoading(false);
    }
  };

  const handleInputChange = (e: React.ChangeEvent<HTMLInputElement | HTMLTextAreaElement>) => {
    const { name, value } = e.target;
    setFormData(prev => ({ ...prev, [name]: value }));
  };

  const handleCountryChange = (value: string) => {
    const countryData = COUNTRIES_DATA[value as keyof typeof COUNTRIES_DATA];
    // Devise du pays par défaut (RDC → CDF, CI → XOF, etc.) — pas de CFA forcé pour la RDC
    const currency = countryData?.currency || 'CDF';
    setFormData(prev => ({ ...prev, country: value, currency }));
  };

  const handleCurrencyChange = (value: string) => {
    setFormData(prev => ({ ...prev, currency: value }));
  };

  const handleAvatarUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    // Vérifier la taille du fichier (max 5MB)
    if (file.size > 5 * 1024 * 1024) {
      setError('Le fichier est trop volumineux (max 5MB)');
      return;
    }

    // Vérifier le type de fichier
    if (!file.type.startsWith('image/')) {
      setError('Veuillez sélectionner une image (JPG, PNG, GIF)');
      return;
    }

    // Lire l'image et ouvrir le cropper
    const reader = new FileReader();
    reader.onload = () => {
      setImageToCrop(reader.result as string);
      setShowCropper(true);
    };
    reader.readAsDataURL(file);
  };

  const handleCropComplete = async (croppedImageBlob: Blob) => {
    try {
      setUploading(true);
      setError('');
      setShowCropper(false);
      
      // Convertir le blob en fichier
      const file = new File([croppedImageBlob], 'avatar.jpg', { type: 'image/jpeg' });
      console.log('📝 Uploading cropped avatar:', file.size);
      
      const avatarUrl = await uploadUserAvatar(file);
      
      if (avatarUrl) {
        setSuccess('Avatar mis à jour avec succès !');
        // Forcer le rechargement du profil
        setTimeout(async () => {
          await loadProfile();
          // Forcer un re-render de l'avatar
          window.location.reload();
        }, 500);
      } else {
        setError('Échec du téléchargement. Vérifiez que le bucket "avatars" existe dans Supabase Storage.');
      }
      
      setTimeout(() => setSuccess(''), 5000);
    } catch (err: any) {
      console.error('Error uploading avatar:', err);
      setError(`Erreur: ${err?.message || 'Impossible de télécharger l\'avatar'}`);
    } finally {
      setUploading(false);
      setImageToCrop(null);
    }
  };

  const handleCropCancel = () => {
    setShowCropper(false);
    setImageToCrop(null);
  };

  const handleSave = async () => {
    try {
      setSaving(true);
      setError('');
      
      const updatedProfile = await updateUserProfile(formData);
      
      if (updatedProfile) {
        setSuccess('Profil mis à jour avec succès.');
        await loadProfile();
        await refreshProfile();
      } else {
        setError('Échec de la mise à jour. Vérifiez vos permissions.');
      }
      
      setTimeout(() => setSuccess(''), 5000);
    } catch (err: unknown) {
      console.error('Error saving profile:', err);
      setError(`Erreur: ${err instanceof Error ? err.message : 'Impossible de sauvegarder le profil'}`);
    } finally {
      setSaving(false);
    }
  };

  const handleLogout = async () => {
    clearProviderCache();
    await supabase.auth.signOut();
    navigate('/auth/signin');
  };

  if (loading) {
    return (
      <div className="flex min-h-[50vh] items-center justify-center p-4">
        <div className="text-center">
          <div className="mx-auto h-12 w-12 animate-spin rounded-full border-b-2 border-blue-500" />
          <p className="mt-4 text-gray-600">Chargement du profil...</p>
        </div>
      </div>
    );
  }

  return (
    <div className="mx-auto w-full max-w-3xl space-y-4 overflow-x-hidden p-4 sm:space-y-6 sm:p-6">
      <div className="min-w-0">
        <h1 className="text-2xl font-bold sm:text-3xl">Mon Profil</h1>
        <p className="mt-1 text-sm text-gray-600 sm:text-base">
          Gérez les informations de votre compte
        </p>
      </div>

      {error && (
        <Alert variant="destructive" className="min-w-0 break-words">
          <AlertCircle className="h-4 w-4 shrink-0" />
          <AlertDescription className="break-words">{error}</AlertDescription>
        </Alert>
      )}

      {success && (
        <Alert className="min-w-0 break-words border-green-200 bg-green-50">
          <AlertDescription className="break-words text-green-800">{success}</AlertDescription>
        </Alert>
      )}

      <Card className="min-w-0 overflow-hidden">
        <CardHeader className="px-4 sm:px-6">
          <CardTitle className="text-lg sm:text-xl">Photo de Profil</CardTitle>
          <CardDescription>Cliquez sur l&apos;avatar pour changer votre photo</CardDescription>
        </CardHeader>
        <CardContent className="flex flex-col items-center gap-4 px-4 sm:flex-row sm:items-start sm:gap-6 sm:px-6">
          <div className="flex shrink-0 flex-col items-center gap-2">
            <Label htmlFor="avatar-upload" className="group relative cursor-pointer">
              <Avatar className="h-20 w-20 transition-all duration-200 group-hover:opacity-80 group-hover:ring-4 group-hover:ring-blue-500 sm:h-24 sm:w-24">
                <AvatarImage
                  src={profile?.avatar_url || ''}
                  alt="Photo de profil"
                  onError={(e) => {
                    console.error('Error loading avatar:', profile?.avatar_url);
                    e.currentTarget.src = '';
                  }}
                />
                <AvatarFallback className="text-2xl font-bold">
                  {profile?.full_name?.[0]?.toUpperCase() || profile?.email?.[0]?.toUpperCase() || '?'}
                </AvatarFallback>
              </Avatar>
              <div className="absolute inset-0 flex items-center justify-center rounded-full bg-black bg-opacity-0 transition-all duration-200 group-hover:bg-opacity-50">
                <Camera className="h-8 w-8 text-white opacity-0 transition-opacity duration-200 group-hover:opacity-100" />
              </div>
            </Label>
          </div>
          <div className="min-w-0 w-full flex-1 text-center sm:text-left">
            <p className="mb-3 text-sm text-gray-700">
              {uploading ? 'Téléchargement en cours...' : 'Cliquez sur l\'avatar ou utilisez le bouton ci-dessous'}
            </p>
            <Label htmlFor="avatar-upload" className="inline-block cursor-pointer">
              <Button asChild variant="outline" disabled={uploading} className="w-full sm:w-auto">
                <span>
                  <Camera className="mr-2 h-4 w-4" />
                  {uploading ? 'Upload...' : 'Changer la photo'}
                </span>
              </Button>
            </Label>
            <Input
              id="avatar-upload"
              type="file"
              accept="image/*"
              className="hidden"
              onChange={handleAvatarUpload}
              disabled={uploading}
            />
            <p className="mt-2 text-xs text-gray-500">JPG, PNG ou GIF (max 5MB)</p>
          </div>
        </CardContent>
      </Card>

      <Card className="min-w-0 overflow-hidden">
        <CardHeader className="px-4 sm:px-6">
          <CardTitle className="text-lg sm:text-xl">Informations Personnelles</CardTitle>
          <CardDescription>Mettez à jour vos informations de compte</CardDescription>
        </CardHeader>
        <CardContent className="space-y-5 px-4 sm:space-y-6 sm:px-6">
          <div className="min-w-0">
            <Label htmlFor="email" className="text-sm font-medium">
              Email
            </Label>
            <Input
              id="email"
              value={profile?.email || ''}
              disabled
              className="mt-1.5 min-w-0 truncate bg-gray-50 cursor-not-allowed"
            />
            <p className="mt-1 text-xs text-gray-500">Non modifiable</p>
          </div>

          <div className="min-w-0">
            <Label htmlFor="full_name" className="text-sm font-medium">
              Nom Complet
            </Label>
            <Input
              id="full_name"
              name="full_name"
              value={formData.full_name}
              onChange={handleInputChange}
              placeholder="Votre nom complet"
              className="mt-1.5 min-w-0"
            />
          </div>

          <div className="min-w-0">
            <Label htmlFor="phone_number" className="text-sm font-medium">
              Numéro de Téléphone
            </Label>
            <Input
              id="phone_number"
              name="phone_number"
              type="tel"
              value={formData.phone_number}
              onChange={handleInputChange}
              placeholder="+243 123 456 789"
              className="mt-1.5 min-w-0"
            />
            <p className="mt-1 text-xs text-gray-500">Avec code pays</p>
          </div>

          <div className="min-w-0">
            <Label htmlFor="country" className="text-sm font-medium">
              Pays
            </Label>
            <Select value={formData.country} onValueChange={handleCountryChange}>
              <SelectTrigger className="mt-1.5 min-w-0 w-full">
                <SelectValue placeholder="Sélectionnez votre pays" />
              </SelectTrigger>
              <SelectContent>
                {Object.entries(COUNTRIES_DATA).map(([code, country]) => (
                  <SelectItem key={code} value={code}>
                    {country.flag} {country.nameFR}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>

          <div className="min-w-0">
            <Label htmlFor="currency" className="text-sm font-medium">
              Devise Préférée
            </Label>
            <Select value={formData.currency} onValueChange={handleCurrencyChange}>
              <SelectTrigger className="mt-1.5 min-w-0 w-full">
                <SelectValue placeholder="Sélectionnez votre devise" />
              </SelectTrigger>
              <SelectContent>
                {formData.country === 'CD' && (
                  <SelectItem value="CDF">CDF — Franc congolais (devise pays)</SelectItem>
                )}
                {(formData.country === 'CG' || formData.country === 'CM' || formData.country === 'GA') && (
                  <SelectItem value="XAF">XAF — Franc CFA BEAC (devise pays)</SelectItem>
                )}
                {(formData.country === 'CI' || formData.country === 'SN' || formData.country === 'BF' || formData.country === 'BJ' || formData.country === 'TG' || formData.country === 'ML' || formData.country === 'NE') && (
                  <SelectItem value="XOF">XOF — Franc CFA WAEMU (devise pays)</SelectItem>
                )}
                {!['CD', 'CG', 'CM', 'GA', 'CI', 'SN', 'BF', 'BJ', 'TG', 'ML', 'NE'].includes(formData.country) && (
                  <>
                    <SelectItem value="CDF">CDF — Franc congolais</SelectItem>
                    <SelectItem value="XAF">XAF — Franc CFA BEAC</SelectItem>
                    <SelectItem value="XOF">XOF — Franc CFA WAEMU</SelectItem>
                    <SelectItem value="FCFA">FCFA — Franc CFA</SelectItem>
                  </>
                )}
                <SelectItem value="USD">USD — Dollar américain</SelectItem>
                <SelectItem value="EUR">EUR — Euro</SelectItem>
              </SelectContent>
            </Select>
            <p className="mt-1 text-xs text-amber-700 dark:text-amber-400">
              Changer de devise convertit tous les soldes et montants affichés selon le taux FidexaPay.
              Les taux sont gérés par l&apos;administrateur dans le menu Taux de change.
              Ne change pas l&apos;historique des montants encaissés dans leur devise d&apos;origine.
            </p>
          </div>

          <div className="min-w-0">
            <Label htmlFor="bio" className="text-sm font-medium">
              Bio/Description
            </Label>
            <textarea
              id="bio"
              name="bio"
              value={formData.bio}
              onChange={handleInputChange}
              placeholder="Décrivez votre entreprise..."
              className="mt-1.5 w-full min-w-0 max-w-full resize-none rounded-lg border border-gray-200 px-3 py-2 text-sm"
              rows={4}
            />
            <p className="mt-1 text-xs text-gray-500">Visible sur votre page de paiement</p>
          </div>

          <div className="min-w-0">
            <Label htmlFor="skills" className="text-sm font-medium">
              Compétences
            </Label>
            <Input
              id="skills"
              name="skills"
              value={formData.skills}
              onChange={handleInputChange}
              placeholder="Ex: Web Design, E-commerce, Consulting"
              className="mt-1.5 min-w-0"
            />
          </div>

          <Button onClick={handleSave} disabled={saving} className="w-full" size="lg">
            <Save className="mr-2 h-4 w-4" />
            {saving ? 'Enregistrement...' : 'Enregistrer les modifications'}
          </Button>

          <Button variant="outline" onClick={handleLogout} className="w-full gap-2">
            <LogOut className="h-4 w-4" />
            Déconnexion
          </Button>
        </CardContent>
      </Card>

      {profile && (
        <Card className="min-w-0 overflow-hidden">
          <CardHeader className="px-4 sm:px-6">
            <CardTitle className="text-lg sm:text-xl">Statut KYC</CardTitle>
            <CardDescription>Vérification d&apos;identité pour les retraits</CardDescription>
          </CardHeader>
          <CardContent className="space-y-4 px-4 sm:px-6">
            <div className="min-w-0">
              <p className="mb-2 font-medium">Status:</p>
              <div className="flex flex-wrap items-center gap-2">
                {profile.kyc_status === 'verified' && (
                  <>
                    <CheckCircle2 className="shrink-0 text-green-600" size={20} />
                    <span className="font-semibold text-green-600">Vérifié</span>
                  </>
                )}
                {profile.kyc_status === 'pending' && (
                  <>
                    <Clock className="shrink-0 text-yellow-600" size={20} />
                    <span className="font-semibold text-yellow-600">En attente</span>
                  </>
                )}
                {profile.kyc_status === 'rejected' && (
                  <>
                    <AlertCircle className="shrink-0 text-red-600" size={20} />
                    <span className="font-semibold text-red-600">Rejeté</span>
                  </>
                )}
                {profile.kyc_status === 'not_submitted' && (
                  <>
                    <AlertCircle className="shrink-0 text-gray-600" size={20} />
                    <span className="font-semibold text-gray-600">Non soumis</span>
                  </>
                )}
              </div>
              <p className="mt-2 break-words text-sm text-gray-600">
                {profile.kyc_status === 'verified' && 'Vous pouvez effectuer des retraits sans limitation.'}
                {profile.kyc_status === 'pending' &&
                  'Votre demande est en cours de vérification. Vous serez notifié dans 24-48h.'}
                {profile.kyc_status === 'rejected' && 'Veuillez soumettre de nouveaux documents valides.'}
                {profile.kyc_status === 'not_submitted' &&
                  'Vérifiez votre identité pour effectuer des retraits.'}
              </p>
            </div>

            {(profile.kyc_status === 'rejected' || profile.kyc_status === 'not_submitted') && (
              <Button onClick={() => navigate('/dashboard/kyc')} className="w-full" size="lg">
                <FileUp className="mr-2 h-4 w-4 shrink-0" />
                <span className="truncate">Vérifier le profil (KYC)</span>
                <ArrowRight className="ml-2 h-4 w-4 shrink-0" />
              </Button>
            )}
          </CardContent>
        </Card>
      )}

      {imageToCrop && (
        <ImageCropper
          image={imageToCrop}
          onCropComplete={handleCropComplete}
          onCancel={handleCropCancel}
          open={showCropper}
        />
      )}
    </div>
  );
}

export default Profile;
