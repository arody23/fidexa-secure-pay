import { useState, useEffect } from 'react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Alert, AlertDescription } from '@/components/ui/alert';
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar';
import { Camera, Save, AlertCircle, CheckCircle2, ArrowRight } from 'lucide-react';
import { UserProfile } from '@/types/index';
import { loadUserProfile, updateUserProfile, uploadUserAvatar } from '@/lib/userService';
import { useProvider } from '@/contexts/ProviderContext';
import { COUNTRIES_DATA } from '@/lib/countriesData';
import { ImageCropper } from '@/components/ImageCropper';
import { useNavigate } from 'react-router-dom';
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
      setError('Impossible de charger les informations.');
    } finally {
      setLoading(false);
    }
  };

  const handleInputChange = (e: React.ChangeEvent<HTMLInputElement | HTMLTextAreaElement>) => {
    const { name, value } = e.target;
    setFormData((prev) => ({ ...prev, [name]: value }));
  };

  const handleCountryChange = (value: string) => {
    const countryData = COUNTRIES_DATA[value as keyof typeof COUNTRIES_DATA];
    const currency = countryData?.currency || 'CDF';
    setFormData((prev) => ({ ...prev, country: value, currency }));
  };

  const handleCurrencyChange = (value: string) => {
    setFormData((prev) => ({ ...prev, currency: value }));
  };

  const handleAvatarUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    if (file.size > 5 * 1024 * 1024) {
      setError('Image trop volumineuse.');
      return;
    }

    if (!file.type.startsWith('image/')) {
      setError('Format non supporté.');
      return;
    }

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

      const file = new File([croppedImageBlob], 'avatar.jpg', { type: 'image/jpeg' });
      const avatarUrl = await uploadUserAvatar(file);

      if (avatarUrl) {
        setSuccess('Photo mise à jour.');
        setTimeout(async () => {
          await loadProfile();
          window.location.reload();
        }, 500);
      } else {
        setError('Échec du téléchargement.');
      }

      setTimeout(() => setSuccess(''), 4000);
    } catch (err: unknown) {
      console.error('Error uploading avatar:', err);
      setError('Impossible de mettre à jour la photo.');
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
        setSuccess('Enregistré.');
        await loadProfile();
        await refreshProfile();
      } else {
        setError('Échec de la mise à jour.');
      }

      setTimeout(() => setSuccess(''), 4000);
    } catch (err: unknown) {
      console.error('Error saving profile:', err);
      setError('Impossible d’enregistrer.');
    } finally {
      setSaving(false);
    }
  };

  if (loading) {
    return (
      <div className="flex min-h-[50vh] items-center justify-center p-4">
        <div className="h-8 w-8 animate-spin rounded-full border-2 border-[#0b3b78] border-t-transparent" />
      </div>
    );
  }

  return (
    <div className="mx-auto w-full max-w-2xl space-y-8 overflow-x-hidden">
      <div className="min-w-0">
        <h1 className="text-2xl font-semibold tracking-tight text-[#0b2f63] sm:text-3xl">Paramètres</h1>
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

      <section className="space-y-4">
        <div className="flex flex-col items-center gap-4 sm:flex-row sm:items-center sm:gap-6">
          <Label htmlFor="avatar-upload" className="group relative shrink-0 cursor-pointer">
            <Avatar className="h-20 w-20 ring-2 ring-[#dbe6f2] transition-opacity group-hover:opacity-90 sm:h-24 sm:w-24">
              <AvatarImage
                src={profile?.avatar_url || ''}
                alt=""
                onError={(e) => {
                  e.currentTarget.src = '';
                }}
              />
              <AvatarFallback className="bg-[#0b3b78] text-2xl font-bold text-white">
                {profile?.full_name?.[0]?.toUpperCase() || profile?.email?.[0]?.toUpperCase() || '?'}
              </AvatarFallback>
            </Avatar>
            {profile?.kyc_status === 'verified' && (
              <span className="absolute -bottom-0.5 -right-0.5 flex h-7 w-7 items-center justify-center rounded-full bg-white shadow-sm ring-2 ring-white">
                <CheckCircle2 className="h-5 w-5 fill-[#1d9bf0] text-white" strokeWidth={0} />
                <span className="sr-only">Vérifié</span>
              </span>
            )}
            <div className="absolute inset-0 flex items-center justify-center rounded-full bg-black/0 transition-colors group-hover:bg-black/40">
              <Camera className="h-6 w-6 text-white opacity-0 transition-opacity group-hover:opacity-100" />
            </div>
          </Label>
          <div className="min-w-0 w-full flex-1 space-y-1 text-center sm:text-left">
            <div className="flex items-center justify-center gap-1.5 sm:justify-start">
              <p className="truncate text-lg font-semibold text-[#0b2f63]">
                {profile?.full_name || 'Compte'}
              </p>
              {profile?.kyc_status === 'verified' && (
                <CheckCircle2 className="h-5 w-5 shrink-0 fill-[#1d9bf0] text-white" strokeWidth={0} aria-label="Vérifié" />
              )}
            </div>
            <Label htmlFor="avatar-upload" className="inline-block cursor-pointer">
              <Button asChild variant="outline" disabled={uploading} className="w-full border-[#dbe6f2] sm:w-auto">
                <span>
                  <Camera className="mr-2 h-4 w-4" />
                  {uploading ? 'Envoi…' : 'Changer la photo'}
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
          </div>
        </div>
      </section>

      <div className="h-px bg-[#e4edf6]" />

      <section className="space-y-5">
        <div className="min-w-0 space-y-1.5">
          <Label htmlFor="email">Email</Label>
          <Input id="email" value={profile?.email || ''} disabled className="bg-[#f6f9fd]" />
        </div>

        <div className="min-w-0 space-y-1.5">
          <Label htmlFor="full_name">Nom complet</Label>
          <Input
            id="full_name"
            name="full_name"
            value={formData.full_name}
            onChange={handleInputChange}
            placeholder="Nom complet"
          />
        </div>

        <div className="min-w-0 space-y-1.5">
          <Label htmlFor="phone_number">Téléphone</Label>
          <Input
            id="phone_number"
            name="phone_number"
            type="tel"
            value={formData.phone_number}
            onChange={handleInputChange}
            placeholder="+243 …"
          />
        </div>

        <div className="min-w-0 space-y-1.5">
          <Label htmlFor="country">Pays</Label>
          <Select value={formData.country} onValueChange={handleCountryChange}>
            <SelectTrigger className="w-full">
              <SelectValue placeholder="Pays" />
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

        <div className="min-w-0 space-y-1.5">
          <Label htmlFor="currency">Devise</Label>
          <Select value={formData.currency} onValueChange={handleCurrencyChange}>
            <SelectTrigger className="w-full">
              <SelectValue placeholder="Devise" />
            </SelectTrigger>
            <SelectContent>
              {formData.country === 'CD' && (
                <SelectItem value="CDF">CDF</SelectItem>
              )}
              {(formData.country === 'CG' || formData.country === 'CM' || formData.country === 'GA') && (
                <SelectItem value="XAF">XAF</SelectItem>
              )}
              {(formData.country === 'CI' ||
                formData.country === 'SN' ||
                formData.country === 'BF' ||
                formData.country === 'BJ' ||
                formData.country === 'TG' ||
                formData.country === 'ML' ||
                formData.country === 'NE') && (
                <SelectItem value="XOF">XOF</SelectItem>
              )}
              {!['CD', 'CG', 'CM', 'GA', 'CI', 'SN', 'BF', 'BJ', 'TG', 'ML', 'NE'].includes(formData.country) && (
                <>
                  <SelectItem value="CDF">CDF</SelectItem>
                  <SelectItem value="XAF">XAF</SelectItem>
                  <SelectItem value="XOF">XOF</SelectItem>
                  <SelectItem value="FCFA">FCFA</SelectItem>
                </>
              )}
              <SelectItem value="USD">USD</SelectItem>
              <SelectItem value="EUR">EUR</SelectItem>
            </SelectContent>
          </Select>
        </div>

        <div className="min-w-0 space-y-1.5">
          <Label htmlFor="bio">Bio</Label>
          <textarea
            id="bio"
            name="bio"
            value={formData.bio}
            onChange={handleInputChange}
            placeholder="Courte description"
            className="w-full resize-none rounded-lg border border-input bg-background px-3 py-2 text-sm"
            rows={3}
          />
        </div>

        <div className="min-w-0 space-y-1.5">
          <Label htmlFor="skills">Compétences</Label>
          <Input
            id="skills"
            name="skills"
            value={formData.skills}
            onChange={handleInputChange}
            placeholder="Web Design, Consulting…"
          />
        </div>

        <Button
          onClick={handleSave}
          disabled={saving}
          className="w-full bg-[#0b3b78] hover:bg-[#0a3266]"
          size="lg"
        >
          <Save className="mr-2 h-4 w-4" />
          {saving ? 'Enregistrement…' : 'Enregistrer'}
        </Button>
      </section>

      {profile && profile.kyc_status !== 'verified' && (
        <>
          <div className="h-px bg-[#e4edf6]" />
          <button
            type="button"
            onClick={() => navigate('/dashboard/kyc')}
            className="flex w-full items-center justify-between gap-3 rounded-2xl bg-white px-4 py-4 text-left ring-1 ring-[#dbe6f2] transition-colors hover:bg-[#f7fafd]"
          >
            <div className="min-w-0">
              <p className="font-semibold text-[#0b2f63]">Vérification d’identité</p>
              <p className="mt-0.5 text-sm text-[#5c7188]">
                {profile.kyc_status === 'pending'
                  ? 'Demande en cours d’examen'
                  : profile.kyc_status === 'rejected'
                    ? 'Nouvelle soumission requise'
                    : 'Requis pour les retraits'}
              </p>
            </div>
            <ArrowRight className="h-5 w-5 shrink-0 text-[#0b3b78]" />
          </button>
        </>
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
