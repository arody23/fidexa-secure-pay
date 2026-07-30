import { useState } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { supabase } from '@/integrations/supabase/client';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { AlertCircle, Eye, EyeOff } from 'lucide-react';
import AuthLayout from '@/components/layout/AuthLayout';
import { getOAuthErrorMessage } from '@/lib/authErrors';

export default function SignIn() {
  const navigate = useNavigate();
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [showPassword, setShowPassword] = useState(false);
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(false);

  async function handleSignIn(e: React.FormEvent) {
    e.preventDefault();
    setError('');
    setLoading(true);

    try {
      if (!email.trim() || !password) {
        setError('Email et mot de passe requis');
        return;
      }

      const { data, error: signInError } = await supabase.auth.signInWithPassword({
        email: email.trim().toLowerCase(),
        password,
      });

      if (signInError) {
        setError(signInError.message || 'Erreur lors de la connexion');
        return;
      }

      if (!data?.user) {
        setError('Impossible de se connecter');
        return;
      }

      const { data: userProfile, error: profileError } = await supabase
        .from('users')
        .select('id, email, is_admin, full_name, role')
        .eq('id', data.user.id)
        .single();

      if (profileError?.code === 'PGRST116') {
        await supabase.from('users').insert([{
          id: data.user.id,
          email: data.user.email,
          full_name: '',
          role: 'provider',
          is_admin: false,
          verified: false,
        }]);
        navigate('/dashboard/profile');
        return;
      }

      if (profileError || !userProfile) {
        setError(profileError?.message || 'Impossible de lire le profil');
        return;
      }

      const isAdmin = userProfile.is_admin === true || userProfile.role === 'admin';
      if (isAdmin) navigate('/admin');
      else if (!userProfile.full_name?.trim()) navigate('/dashboard/profile');
      else navigate('/dashboard');
    } catch (err: unknown) {
      setError(err instanceof Error ? err.message : 'Une erreur est survenue');
    } finally {
      setLoading(false);
    }
  }

  async function handleGoogleSignIn() {
    setError('');
    setLoading(true);
    try {
      const { error: oauthError } = await supabase.auth.signInWithOAuth({
        provider: 'google',
        options: { redirectTo: `${window.location.origin}/dashboard` },
      });
      if (oauthError) setError(getOAuthErrorMessage(oauthError.message));
    } catch (err: unknown) {
      setError(err instanceof Error ? err.message : 'Erreur Google');
    } finally {
      setLoading(false);
    }
  }

  return (
    <AuthLayout>
      <Card className="border-border/50 bg-card/95 shadow-2xl backdrop-blur">
        <CardHeader className="space-y-1 text-center">
          <CardTitle className="text-2xl">Connexion</CardTitle>
          <p className="text-sm text-muted-foreground">Accédez à votre espace FidexaPay</p>
        </CardHeader>
        <CardContent>
          <form onSubmit={handleSignIn} className="space-y-4">
            {error && (
              <div className="flex items-center gap-2 rounded-lg border border-destructive/30 bg-destructive/10 p-3 text-sm text-destructive">
                <AlertCircle className="h-4 w-4 shrink-0" />
                {error}
              </div>
            )}
            <Input type="email" placeholder="Email" value={email} onChange={(e) => setEmail(e.target.value)} required />
            <div className="relative">
              <Input
                type={showPassword ? 'text' : 'password'}
                placeholder="Mot de passe"
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                required
                className="pr-10"
              />
              <button
                type="button"
                onClick={() => setShowPassword((v) => !v)}
                className="absolute right-3 top-1/2 -translate-y-1/2 text-muted-foreground"
              >
                {showPassword ? <EyeOff className="h-4 w-4" /> : <Eye className="h-4 w-4" />}
              </button>
            </div>
            <div className="text-right">
              <Link to="/auth/forgot-password" className="text-sm text-primary hover:underline">
                Mot de passe oublié ?
              </Link>
            </div>
            <Button type="submit" className="w-full" disabled={loading}>
              {loading ? 'Connexion…' : 'Se connecter'}
            </Button>
            <div className="relative py-2">
              <div className="absolute inset-0 flex items-center"><span className="w-full border-t" /></div>
              <div className="relative flex justify-center text-xs uppercase">
                <span className="bg-card px-2 text-muted-foreground">ou</span>
              </div>
            </div>
            <Button type="button" variant="outline" className="w-full" disabled={loading} onClick={handleGoogleSignIn}>
              Continuer avec Google
            </Button>
            <p className="text-center text-sm text-muted-foreground">
              Pas de compte ?{' '}
              <Link to="/auth/signup" className="font-medium text-primary hover:underline">
                S&apos;inscrire
              </Link>
            </p>
          </form>
        </CardContent>
      </Card>
    </AuthLayout>
  );
}
