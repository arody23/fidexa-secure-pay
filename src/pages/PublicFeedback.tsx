import { useEffect, useMemo, useState } from 'react';
import { Link, useNavigate, useParams, useSearchParams } from 'react-router-dom';
import { Send, Star } from 'lucide-react';
import Logo from '@/components/Logo';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { useToast } from '@/hooks/use-toast';
import { useAuth } from '@/contexts/AuthContext';
import { supabase } from '@/integrations/supabase/client';

/** Page publique type Google Review — client (token) ou prestataire (connexion). */
export default function PublicFeedback() {
  const { audience = 'client' } = useParams<{ audience?: string }>();
  const [params] = useSearchParams();
  const token = params.get('t') || params.get('token') || '';
  const navigate = useNavigate();
  const { user } = useAuth();
  const { toast } = useToast();

  const isProvider = audience === 'prestataire' || audience === 'provider';

  const [displayName, setDisplayName] = useState('');
  const [profession, setProfession] = useState('');
  const [rating, setRating] = useState(0);
  const [content, setContent] = useState('');
  const [loading, setLoading] = useState(false);
  const [done, setDone] = useState(false);

  useEffect(() => {
    if (isProvider) {
      if (user) navigate('/dashboard/feedback', { replace: true });
      else navigate(`/auth/signin?redirect=${encodeURIComponent('/dashboard/feedback')}`, { replace: true });
    }
  }, [isProvider, user, navigate]);

  const canSubmit = useMemo(
    () => Boolean(token) && rating >= 1 && content.trim().length >= 12 && !loading,
    [token, rating, content, loading]
  );

  const submit = async () => {
    if (!canSubmit) return;
    setLoading(true);
    try {
      const { data, error } = await supabase.rpc('submit_public_feedback', {
        token_param: token,
        rating_param: rating,
        content_param: content.trim(),
        display_name_param: displayName.trim() || null,
        profession_param: profession.trim() || null,
      });
      if (error) throw error;
      const result = typeof data === 'string' ? JSON.parse(data) : data;
      if (!result?.success) throw new Error(result?.error || 'Envoi impossible');
      setDone(true);
      toast({ title: 'Merci !', description: 'Votre avis a été envoyé pour validation.' });
    } catch (err) {
      toast({
        title: 'Erreur',
        description: err instanceof Error ? err.message : 'Impossible d’envoyer l’avis',
        variant: 'destructive',
      });
    } finally {
      setLoading(false);
    }
  };

  if (isProvider) {
    return (
      <div className="flex min-h-[100dvh] items-center justify-center bg-[#eef3f9]">
        <div className="h-8 w-8 animate-spin rounded-full border-2 border-[#0b3b78] border-t-transparent" />
      </div>
    );
  }

  return (
    <div className="min-h-[100dvh] bg-[#eef3f9]">
      <header className="border-b border-[#dbe6f2] bg-white/95">
        <div className="mx-auto flex h-14 max-w-lg items-center px-4">
          <Logo size="sm" />
        </div>
      </header>

      <main className="mx-auto max-w-lg px-4 py-8">
        {done ? (
          <div className="rounded-2xl bg-white p-8 text-center ring-1 ring-[#dbe6f2]">
            <p className="text-xl font-semibold text-[#0b2f63]">Merci pour votre retour</p>
            <p className="mt-2 text-sm text-[#5c7188]">
              Votre avis sera publié après validation par FidexaPay.
            </p>
            <Link to="/" className="mt-6 inline-block text-sm font-semibold text-[#0b3b78]">
              Retour à l’accueil
            </Link>
          </div>
        ) : (
          <div className="rounded-2xl bg-white p-6 ring-1 ring-[#dbe6f2] sm:p-8">
            <p className="text-xs font-semibold uppercase tracking-[0.18em] text-[#178c52]">Avis FidexaPay</p>
            <h1 className="mt-2 text-2xl font-semibold tracking-tight text-[#0b2f63]">
              Comment s’est passée votre prestation ?
            </h1>
            <p className="mt-2 text-sm text-[#5c7188]">
              Comme un avis Google — 30 secondes pour noter et laisser un message.
            </p>

            {!token && (
              <p className="mt-4 rounded-xl bg-amber-50 px-3 py-2 text-sm text-amber-800">
                Lien incomplet. Ouvrez le lien reçu sur WhatsApp.
              </p>
            )}

            <div className="mt-6 space-y-4">
              <div className="space-y-1.5">
                <Label htmlFor="profession">Votre profession (optionnel)</Label>
                <Input
                  id="profession"
                  value={profession}
                  onChange={(e) => setProfession(e.target.value)}
                  placeholder="Ex. Entrepreneur, Étudiant, Commerçant…"
                  maxLength={80}
                />
              </div>
              <div className="space-y-1.5">
                <Label htmlFor="name">Votre nom</Label>
                <Input
                  id="name"
                  value={displayName}
                  onChange={(e) => setDisplayName(e.target.value)}
                  placeholder="Prénom ou nom affiché"
                  maxLength={80}
                />
              </div>

              <div className="space-y-2">
                <Label>Note</Label>
                <div className="flex gap-1">
                  {[1, 2, 3, 4, 5].map((n) => (
                    <button
                      key={n}
                      type="button"
                      onClick={() => setRating(n)}
                      className="rounded-lg p-1.5 transition hover:bg-[#f3f7fc]"
                      aria-label={`${n} étoiles`}
                    >
                      <Star
                        className={`h-8 w-8 ${
                          n <= rating ? 'fill-amber-400 text-amber-400' : 'text-[#c5d0de]'
                        }`}
                      />
                    </button>
                  ))}
                </div>
              </div>

              <div className="space-y-1.5">
                <Label htmlFor="message">Votre message</Label>
                <Textarea
                  id="message"
                  rows={5}
                  value={content}
                  onChange={(e) => setContent(e.target.value)}
                  placeholder="Décrivez votre expérience avec le prestataire et FidexaPay…"
                  maxLength={800}
                />
                <p className="text-xs text-[#8a9bb0]">{content.trim().length}/800</p>
              </div>

              <Button
                className="w-full gap-2 bg-[#0b3b78] hover:bg-[#0a3266]"
                disabled={!canSubmit}
                onClick={() => void submit()}
              >
                <Send className="h-4 w-4" />
                {loading ? 'Envoi…' : 'Envoyer mon avis'}
              </Button>
            </div>
          </div>
        )}
      </main>
    </div>
  );
}
