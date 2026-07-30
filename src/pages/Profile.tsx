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
    // Auto-sélectionner la devise selon le pays
    const countryData = COUNTRIES_DATA[value as keyof typeof COUNTRIES_DATA];
    const currency = countryData?.currency || 'FCFA';
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
              <div className="flex items-center justify-center min-h-screen">
          <div className="text-center">
            <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-500 mx-auto"></div>
            <p className="mt-4 text-gray-600">Chargement du profil...</p>
          </div>
        </div>
          );
  }

  return (
          <div className="space-y-6 p-6">
        {/* Header */}
        <div>
          <h1 className="text-3xl font-bold">Mon Profil</h1>
          <p className="text-gray-600 mt-1">Gérez les informations de votre compte</p>
        </div>

        {error && (
          <Alert variant="destructive">
            <AlertCircle className="h-4 w-4" />
            <AlertDescription>{error}</AlertDescription>
          </Alert>
        )}

        {success && (
          <Alert className="border-green-200 bg-green-50">
            <AlertDescription className="text-green-800">{success}</AlertDescription>
          </Alert>
        )}

        {/* Avatar Card */}
        <Card>
          <CardHeader>
            <CardTitle>Photo de Profil</CardTitle>
            <CardDescription>Cliquez sur l'avatar pour changer votre photo</CardDescription>
          </CardHeader>
          <CardContent className="flex items-center gap-6">
            <div className="flex flex-col items-center gap-2">
              <Label htmlFor="avatar-upload" className="cursor-pointer group relative">
                <Avatar className="h-24 w-24 transition-all duration-200 group-hover:opacity-80 group-hover:ring-4 group-hover:ring-blue-500">
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
                {/* Overlay avec icône caméra au survol */}
                <div className="absolute inset-0 flex items-center justify-center bg-black bg-opacity-0 group-hover:bg-opacity-50 rounded-full transition-all duration-200">
                  <Camera className="h-8 w-8 text-white opacity-0 group-hover:opacity-100 transition-opacity duration-200" />
                </div>
              </Label>
            </div>
            <div className="flex-1">
              <p className="text-sm text-gray-700 mb-3">
                {uploading ? '⏳ Téléchargement en cours...' : 'Cliquez sur l\'avatar ou utilisez le bouton ci-dessous'}
              </p>
              <Label htmlFor="avatar-upload" className="cursor-pointer">
                <Button asChild variant="outline" disabled={uploading}>
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
              <p className="text-xs text-gray-500 mt-2">JPG, PNG ou GIF (max 5MB)</p>
            </div>
          </CardContent>
        </Card>

        {/* Informations Personnelles */}
        <Card>
          <CardHeader>
            <CardTitle>Informations Personnelles</CardTitle>
            <CardDescription>Mettez à jour vos informations de compte</CardDescription>
          </CardHeader>
          <CardContent className="space-y-6">
            {/* Email (readonly) */}
            <div>
              <Label htmlFor="email" className="text-sm font-medium">
                Email
              </Label>
              <Input
                id="email"
                value={profile?.email || ''}
                disabled
                className="bg-gray-50 cursor-not-allowed"
              />
              <p className="text-xs text-gray-500 mt-1">Non modifiable</p>
            </div>

            {/* Nom */}
            <div>
              <Label htmlFor="full_name" className="text-sm font-medium">
                Nom Complet
              </Label>
              <Input
                id="full_name"
                name="full_name"
                value={formData.full_name}
                onChange={handleInputChange}
                placeholder="Votre nom complet"
              />
            </div>

            {/* Téléphone */}
            <div>
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
              />
              <p className="text-xs text-gray-500 mt-1">Avec code pays</p>
            </div>

            {/* Pays */}
            <div>
              <Label htmlFor="country" className="text-sm font-medium">
                Pays
              </Label>
              <Select value={formData.country} onValueChange={handleCountryChange}>
                <SelectTrigger>
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

            {/* Devise */}
            <div>
              <Label htmlFor="currency" className="text-sm font-medium">
                Devise Préférée
              </Label>
              <Select value={formData.currency} onValueChange={handleCurrencyChange}>
                <SelectTrigger>
                  <SelectValue placeholder="Sélectionnez votre devise" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="CDF">CDF — Franc congolais</SelectItem>
                  <SelectItem value="XAF">XAF — Franc CFA BEAC</SelectItem>
                  <SelectItem value="XOF">XOF — Franc CFA WAEMU</SelectItem>
                  <SelectItem value="FCFA">FCFA — Franc CFA</SelectItem>
                  <SelectItem value="USD">USD — Dollar américain</SelectItem>
                  <SelectItem value="EUR">EUR — Euro</SelectItem>
                </SelectContent>
              </Select>
              <p className="text-xs text-gray-500 mt-1">
                Cette devise sera utilisée pour tous vos paiements
              </p>
            </div>

            {/* Bio */}
            <div>
              <Label htmlFor="bio" className="text-sm font-medium">
                Bio/Description
              </Label>
              <textarea
                id="bio"
                name="bio"
                value={formData.bio}
                onChange={handleInputChange}
                placeholder="Décrivez votre entreprise..."
                className="w-full px-3 py-2 border border-gray-200 rounded-lg resize-none"
                rows={4}
              />
              <p className="text-xs text-gray-500 mt-1">Visible sur votre page de paiement</p>
            </div>

            {/* Compétences */}
            <div>
              <Label htmlFor="skills" className="text-sm font-medium">
                Compétences
              </Label>
              <Input
                id="skills"
                name="skills"
                value={formData.skills}
                onChange={handleInputChange}
                placeholder="Ex: Web Design, E-commerce, Consulting"
              />
            </div>

            {/* Save Button */}
            <Button
              onClick={handleSave}
              disabled={saving}
              className="w-full"
              size="lg"
            >
              <Save className="mr-2 h-4 w-4" />
              {saving ? 'Enregistrement...' : 'Enregistrer les modifications'}
            </Button>

            <Button
              variant="outline"
              onClick={handleLogout}
              className="w-full gap-2"
            >
              <LogOut className="h-4 w-4" />
              Déconnexion
            </Button>
          </CardContent>
        </Card>

        {/* KYC Status */}
        {profile && (
          <Card>
            <CardHeader>
              <CardTitle>Statut KYC</CardTitle>
              <CardDescription>Vérification d'identité pour les retraits</CardDescription>
            </CardHeader>
            <CardContent className="space-y-4">
              {/* Statut Actuel */}
              <div className="flex items-start gap-4">
                <div className="flex-1">
                  <p className="font-medium mb-2">Status:</p>
                  <div className="flex items-center gap-2">
                    {profile.kyc_status === 'verified' && (
                      <>
                        <CheckCircle2 className="text-green-600" size={20} />
                        <span className="text-green-600 font-semibold">Vérifié</span>
                      </>
                    )}
                    {profile.kyc_status === 'pending' && (
                      <>
                        <Clock className="text-yellow-600" size={20} />
                        <span className="text-yellow-600 font-semibold">En attente</span>
                      </>
                    )}
                    {profile.kyc_status === 'rejected' && (
                      <>
                        <AlertCircle className="text-red-600" size={20} />
                        <span className="text-red-600 font-semibold">Rejeté</span>
                      </>
                    )}
                    {profile.kyc_status === 'not_submitted' && (
                      <>
                        <AlertCircle className="text-gray-600" size={20} />
                        <span className="text-gray-600 font-semibold">Non soumis</span>
                      </>
                    )}
                  </div>
                  <p className="text-sm text-gray-600 mt-2">
                    {profile.kyc_status === 'verified' && 'Vous pouvez effectuer des retraits sans limitation.'}
                    {profile.kyc_status === 'pending' && 'Votre demande est en cours de vérification. Vous serez notifié dans 24-48h.'}
                    {profile.kyc_status === 'rejected' && 'Veuillez soumettre de nouveaux documents valides.'}
                    {profile.kyc_status === 'not_submitted' && 'Vérifiez votre identité pour effectuer des retraits.'}
                  </p>
                </div>
              </div>

              {/* Bouton Vérifier le profil - redirige vers page KYC */}
              {(profile.kyc_status === 'rejected' || profile.kyc_status === 'not_submitted') && (
                <Button
                  onClick={() => navigate('/dashboard/kyc')}
                  className="w-full"
                  size="lg"
                >
                  <FileUp className="mr-2 h-4 w-4" />
                  Vérifier le profil (KYC)
                  <ArrowRight className="ml-2 h-4 w-4" />
                </Button>
              )}
            </CardContent>
          </Card>
        )}

        {/* Image Cropper Dialog */}
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
