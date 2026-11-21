import { useMemo, useState } from 'react';
import { useNavigate, Link } from 'react-router-dom';
import { supabase } from '@/integrations/supabase/client';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import { AlertCircle } from 'lucide-react';
import AuthLayout from '@/components/layout/AuthLayout';
import { getOAuthErrorMessage } from '@/lib/authErrors';
import { DEFAULT_PLAN_ID, getCommissionRate } from '@/lib/plans';
import { SUPABASE_ANON_KEY, SUPABASE_URL } from '@/config';
import { COVERAGE_COUNTRIES } from '@/lib/kpayProviders';
import {
  WORLD_DIAL_CODES,
  composeE164,
  countryFlagSrc,
  getWorldDial,
  toNationalPhoneDigits,
} from '@/lib/worldDialCodes';

function FlagImg({ code, className }: { code: string; className?: string }) {
  return (
    <img
      src={countryFlagSrc(code)}
      alt=""
      width={20}
      height={14}
      className={className ?? 'h-3.5 w-5 shrink-0 rounded-[2px] object-cover'}
      loading="lazy"
    />
  );
}

export default function SignUp() {
  const navigate = useNavigate();
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  /** Pays d’activité Fidexa (couverture uniquement). */
  const [businessCountry, setBusinessCountry] = useState('CD');
  /** Indicatif WhatsApp (tous pays). */
  const [dialCountry, setDialCountry] = useState('CD');
  const [phoneNational, setPhoneNational] = useState('');
  const [dialQuery, setDialQuery] = useState('');
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(false);

  const dial = useMemo(() => getWorldDial(dialCountry), [dialCountry]);
  const filteredDials = useMemo(() => {
    const q = dialQuery.trim().toLowerCase();
    if (!q) return WORLD_DIAL_CODES;
    return WORLD_DIAL_CODES.filter(
      (c) =>
        c.name.toLowerCase().includes(q) ||
        c.code.toLowerCase().includes(q) ||
        c.dial.includes(q)
    );
  }, [dialQuery]);

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
      if (!email.trim()) {
        setError("L'adresse email est requise");
        return;
      }
      if (password.length < 6) {
        setError('Le mot de passe doit contenir au moins 6 caractères');
        return;
      }
      const phone = composeE164(dial.dial, phoneNational);
      if (phone.replace(/\D/g, '').length < 9) {
        setError('Indiquez un numéro WhatsApp valide');
        return;
      }

      const { data, error: signUpError } = await supabase.auth.signUp({
        email: email.trim().toLowerCase(),
        password,
        options: {
          data: {
            country: businessCountry,
            phone_number: phone,
            whatsapp_marketing_opt_in: true,
          },
        },
      });

      if (signUpError) {
        setError(signUpError.message || 'Erreur lors de la création du compte');
        return;
      }
      if (!data?.user) {
        setError('Impossible de créer le compte');
        return;
      }

      const { error: profileError } = await supabase.from('users').insert([
        {
          id: data.user.id,
          email: email.trim().toLowerCase(),
          full_name: null,
          role: 'provider',
          is_admin: false,
          verified: false,
          country: businessCountry,
          phone_number: phone,
          whatsapp_marketing_opt_in: true,
          subscription_type: DEFAULT_PLAN_ID,
          subscription_plan: DEFAULT_PLAN_ID,
          subscription_status: 'active',
          commission_rate: getCommissionRate(DEFAULT_PLAN_ID),
        },
      ]);

      if (profileError) {
        console.warn('Profil non créé:', profileError.message);
      }

      const session = data.session || (await supabase.auth.getSession()).data.session;
      if (session?.access_token) {
        await fetch(`${SUPABASE_URL}/functions/v1/signup-welcome`, {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
            Authorization: `Bearer ${session.access_token}`,
            apikey: SUPABASE_ANON_KEY ?? '',
          },
          body: JSON.stringify({
            phone,
            country: businessCountry,
            marketingOptIn: true,
            origin: window.location.origin,
          }),
        }).catch(() => null);
      }

      navigate('/dashboard/profile');
    } catch (err: unknown) {
      const message =
        err instanceof Error ? err.message : "Une erreur est survenue lors de l'inscription";
      setError(message);
    } finally {
      setLoading(false);
    }
  }

  return (
    <AuthLayout>
      <Card className="border-border/50 bg-card/95 shadow-2xl backdrop-blur">
        <CardHeader className="space-y-1 text-center">
          <CardTitle className="text-2xl">Créer un compte</CardTitle>
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
              <Label htmlFor="email">Email</Label>
              <Input
                id="email"
                type="email"
                placeholder="vous@exemple.com"
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                required
              />
            </div>

            <div className="space-y-2">
              <Label htmlFor="password">Mot de passe</Label>
              <Input
                id="password"
                type="password"
                placeholder="••••••••"
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                required
              />
            </div>

            <div className="space-y-2">
              <Label>Pays</Label>
              <Select
                value={businessCountry}
                onValueChange={(v) => {
                  setBusinessCountry(v);
                  const covered = COVERAGE_COUNTRIES.find((c) => c.code === v);
                  if (covered) {
                    setDialCountry(v);
                    setPhoneNational((prev) =>
                      toNationalPhoneDigits(prev, covered.phonePrefix)
                    );
                  }
                }}
              >
                <SelectTrigger className="h-11">
                  <SelectValue placeholder="Choisir un pays" />
                </SelectTrigger>
                <SelectContent>
                  {COVERAGE_COUNTRIES.map((c) => (
                    <SelectItem key={c.code} value={c.code}>
                      <span className="inline-flex items-center gap-2">
                        <FlagImg code={c.code} />
                        {c.name}
                      </span>
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>

            <div className="space-y-2">
              <Label htmlFor="phone">Numéro WhatsApp</Label>
              <div className="flex min-w-0 gap-2">
                <Select
                  value={dialCountry}
                  onValueChange={(v) => {
                    setDialCountry(v);
                    setPhoneNational((prev) =>
                      toNationalPhoneDigits(prev, getWorldDial(v).dial)
                    );
                  }}
                >
                  <SelectTrigger className="h-11 w-[7.75rem] shrink-0 gap-1.5 px-2.5 [&>svg]:h-3.5 [&>svg]:w-3.5">
                    <span className="inline-flex min-w-0 items-center gap-1.5 text-sm font-medium tabular-nums">
                      <FlagImg code={dialCountry} />
                      {dial.dial}
                    </span>
                  </SelectTrigger>
                  <SelectContent className="max-h-72 w-[min(100vw-2rem,20rem)]">
                    <div className="sticky top-0 z-10 bg-popover p-2">
                      <Input
                        value={dialQuery}
                        onChange={(e) => setDialQuery(e.target.value)}
                        placeholder="Rechercher…"
                        className="h-9"
                      />
                    </div>
                    {filteredDials.map((c) => (
                      <SelectItem key={c.code} value={c.code}>
                        <span className="inline-flex items-center gap-2">
                          <FlagImg code={c.code} />
                          {c.name} ({c.dial})
                        </span>
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
                <Input
                  id="phone"
                  value={phoneNational}
                  onChange={(e) =>
                    setPhoneNational(toNationalPhoneDigits(e.target.value, dial.dial))
                  }
                  inputMode="tel"
                  className="h-11 min-w-0 flex-1"
                  required
                />
              </div>
            </div>

            <div className="space-y-2">
              <Label>Type de compte</Label>
              <div className="w-full rounded-md border border-input bg-background px-3 py-2 text-sm">
                Prestataire
              </div>
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

            <Button type="submit" className="w-full" disabled={loading}>
              {loading ? 'Création en cours...' : 'Créer un compte'}
            </Button>

            <div className="text-center text-sm">
              <span className="text-muted-foreground">Déjà un compte ? </span>
              <Link to="/auth/signin" className="font-medium text-primary hover:underline">
                Se connecter
              </Link>
            </div>
          </form>
        </CardContent>
      </Card>
    </AuthLayout>
  );
}
