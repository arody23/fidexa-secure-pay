import { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { supabase } from '@/integrations/supabase/client';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { AlertCircle } from 'lucide-react';
import AuthLayout from '@/components/layout/AuthLayout';
import { getOAuthErrorMessage } from '@/lib/authErrors';

export default function SignUp() {
  const navigate = useNavigate();
  const [fullName, setFullName] = useState('');
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(false);

  async function handleGoogleAuth() {
    setError('');
    setLoading(true);
    try {
      const { error: oauthError } = await supabase.auth.signInWithOAuth({
        provider: 'google',
        options: {
          redirectTo: `${window.location.origin}/dashboard/profile`,
        },
      });
      if (oauthError) {
        setError(getOAuthErrorMessage(oauthError.message || 'Erreur lors de la connexion Google'));
      }
    } catch (err: unknown) {
      const message = err instanceof Error ? err.message : 'Erreur Google';
      setError(message);
    } finally {
      setLoading(false);
    }
  }

  async function handleSignUp(e: React.FormEvent) {
    e.preventDefault();
    setError('');
    setLoading(true);

    try {
      // Validate inputs
      if (!fullName.trim()) {
        setError('Le nom complet est requis');
        setLoading(false);
        return;
      }

      if (!email.trim()) {
        setError('L\'adresse email est requise');
        setLoading(false);
        return;
      }

      if (password.length < 6) {
        setError('Le mot de passe doit contenir au moins 6 caractères');
        setLoading(false);
        return;
      }

      // Create auth user
      const { data, error: signUpError } = await supabase.auth.signUp({
        email: email.trim().toLowerCase(),
        password,
      });

      if (signUpError) {
        console.error('Sign up error:', signUpError);
        setError(signUpError.message || 'Erreur lors de la création du compte');
        return;
      }

      if (!data?.user) {
        setError('Impossible de créer le compte');
        return;
      }

      // Create user profile in users table
      const { error: profileError } = await supabase
        .from('users')
        .insert([
          {
            id: data.user.id,
            email: email.trim().toLowerCase(),
            full_name: fullName.trim(),
            role: 'provider',
            is_admin: false,
            verified: false,
            subscription_type: 'basic',
            subscription_status: 'active',
            commission_rate: 15,
          }
        ]);

      if (profileError) {
        console.error('Profile creation error:', profileError);
        // Show warning but still allow user to proceed
        console.warn('Profil non créé, mais l\'utilisateur peut continuer');
      }

      // Redirect to profile completion page
      navigate('/dashboard/profile');
    } catch (err: any) {
      console.error('Sign up exception:', err);
      setError(err?.message || 'Une erreur est survenue lors de l\'inscription');
    } finally {
      setLoading(false);
    }
  }

  return (
    <AuthLayout>
      <Card className="border-border/50 bg-card/95 shadow-2xl backdrop-blur">
        <CardHeader className="space-y-1 text-center">
          <CardTitle className="text-2xl">Créer un compte</CardTitle>
          <p className="text-sm text-muted-foreground">Rejoignez FidexaPay — plan Basique gratuit</p>
        </CardHeader>

        <CardContent>
          <form onSubmit={handleSignUp} className="space-y-4">
            {error && (
              <div className="flex items-center gap-2 rounded-lg border border-destructive/30 bg-destructive/10 p-3 text-sm text-destructive">
                <AlertCircle className="h-4 w-4 shrink-0" />
                {error}
              </div>
            )}

            <div className="space-y-2">
              <label className="text-sm font-medium">Nom Complet</label>
              <Input
                type="text"
                placeholder="Jean Dupont"
                value={fullName}
                onChange={(e) => setFullName(e.target.value)}
                required
              />
            </div>

            <div className="space-y-2">
              <label className="text-sm font-medium">Email</label>
              <Input
                type="email"
                placeholder="email@example.com"
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                required
              />
            </div>

            <div className="space-y-2">
              <label className="text-sm font-medium">Mot de passe</label>
              <Input
                type="password"
                placeholder="••••••••"
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                required
              />
            </div>

            <div className="space-y-2">
              <label className="text-sm font-medium">Type de compte</label>
              <div className="w-full px-3 py-2 border border-input rounded-md bg-background text-sm">
                Prestataire
              </div>
              <p className="text-xs text-muted-foreground">Seuls les prestataires peuvent créer un compte. Les clients accèdent via le lien de paiement.</p>
            </div>

            <Button
              type="button"
              variant="outline"
              className="w-full"
              disabled={loading}
              onClick={handleGoogleAuth}
            >
              <svg className="mr-2 h-4 w-4" viewBox="0 0 24 24" aria-hidden="true">
                <path
                  fill="currentColor"
                  d="M22.56 12.25c0-.78-.07-1.53-.2-2.25H12v4.26h5.92a5.06 5.06 0 0 1-2.2 3.32v2.77h3.57c2.08-1.92 3.28-4.74 3.28-8.1z"
                />
                <path
                  fill="currentColor"
                  d="M12 23c2.97 0 5.46-.98 7.28-2.66l-3.57-2.77c-.98.66-2.23 1.06-3.71 1.06-2.86 0-5.29-1.93-6.16-4.53H2.18v2.84C3.99 20.53 7.7 23 12 23z"
                />
                <path
                  fill="currentColor"
                  d="M5.84 14.09c-.22-.66-.35-1.36-.35-2.09s.13-1.43.35-2.09V7.07H2.18C1.43 8.55 1 10.22 1 12s.43 3.45 1.18 4.93l2.85-2.22.81-.62z"
                />
                <path
                  fill="currentColor"
                  d="M12 5.38c1.62 0 3.06.56 4.21 1.64l3.15-3.15C17.45 2.09 14.97 1 12 1 7.7 1 3.99 3.47 2.18 7.07l3.66 2.84c.87-2.6 3.3-4.53 6.16-4.53z"
                />
              </svg>
              S&apos;inscrire avec Google
            </Button>

            <div className="relative">
              <div className="absolute inset-0 flex items-center">
                <span className="w-full border-t" />
              </div>
              <div className="relative flex justify-center text-xs uppercase">
                <span className="bg-card px-2 text-muted-foreground">ou</span>
              </div>
            </div>

            <Button
              type="submit"
              className="w-full"
              disabled={loading}
            >
              {loading ? 'Création en cours...' : 'Créer un compte'}
            </Button>

            <div className="text-center text-sm">
              <span className="text-muted-foreground">Déjà un compte ? </span>
              <button
                type="button"
                onClick={() => navigate('/auth/signin')}
                className="font-medium text-primary hover:underline"
              >
                Se connecter
              </button>
            </div>
          </form>
        </CardContent>
      </Card>
    </AuthLayout>
  );
}
