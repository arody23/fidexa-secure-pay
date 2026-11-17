import { useEffect, useState } from 'react';
import { Send, Star } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Textarea } from '@/components/ui/textarea';
import { Label } from '@/components/ui/label';
import { Badge } from '@/components/ui/badge';
import { useToast } from '@/hooks/use-toast';
import { supabase } from '@/integrations/supabase/client';

interface MyTestimonial {
  id: string;
  content: string;
  rating: number;
  status: 'pending' | 'approved' | 'rejected';
  admin_note: string | null;
  created_at: string;
}

const statusLabel: Record<string, string> = {
  pending: 'En attente',
  approved: 'Publié',
  rejected: 'Refusé',
};

export default function ProviderFeedback() {
  const { toast } = useToast();
  const [content, setContent] = useState('');
  const [rating, setRating] = useState(5);
  const [loading, setLoading] = useState(false);
  const [items, setItems] = useState<MyTestimonial[]>([]);

  const load = async () => {
    const { data: { user } } = await supabase.auth.getUser();
    if (!user) return;
    const { data } = await supabase
      .from('provider_testimonials')
      .select('id, content, rating, status, admin_note, created_at')
      .eq('user_id', user.id)
      .order('created_at', { ascending: false });
    setItems((data || []) as MyTestimonial[]);
  };

  useEffect(() => {
    void load();
  }, []);

  const submit = async () => {
    const text = content.trim();
    if (text.length < 20) {
      toast({
        title: 'Avis trop court',
        description: 'Écrivez au moins 20 caractères.',
        variant: 'destructive',
      });
      return;
    }

    setLoading(true);
    try {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) throw new Error('Session requise');

      const { error } = await supabase.from('provider_testimonials').insert({
        user_id: user.id,
        content: text,
        rating,
        status: 'pending',
      });
      if (error) throw error;

      toast({
        title: 'Avis envoyé',
        description: 'Il sera visible après validation par un administrateur.',
      });
      setContent('');
      setRating(5);
      await load();
    } catch (err) {
      toast({
        title: 'Erreur',
        description: err instanceof Error ? err.message : 'Envoi impossible',
        variant: 'destructive',
      });
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="mx-auto w-full max-w-2xl space-y-8 overflow-x-hidden">
      <h1 className="text-2xl font-semibold tracking-tight text-[#0b2f63] sm:text-3xl">
        Laisser un avis
      </h1>

      <div className="space-y-5">
        <div className="min-w-0 space-y-2">
          <Label>Note</Label>
          <div className="flex gap-1">
            {[1, 2, 3, 4, 5].map((n) => (
              <button
                key={n}
                type="button"
                onClick={() => setRating(n)}
                className="rounded p-1 text-[#5c7188] transition hover:text-amber-500"
                aria-label={`${n} étoiles`}
              >
                <Star
                  className={`h-6 w-6 ${n <= rating ? 'fill-amber-400 text-amber-400' : ''}`}
                />
              </button>
            ))}
          </div>
        </div>
        <div className="min-w-0 space-y-1.5">
          <Label htmlFor="feedback">Votre avis</Label>
          <Textarea
            id="feedback"
            rows={5}
            value={content}
            onChange={(e) => setContent(e.target.value)}
            placeholder="Ex: FidexaPay m’a permis d’encaisser en Mobile Money sans stress…"
            maxLength={800}
          />
          <p className="text-xs text-[#5c7188]">{content.trim().length}/800</p>
        </div>
        <Button
          className="w-full gap-2 bg-[#0b3b78] hover:bg-[#0a3266]"
          onClick={submit}
          disabled={loading}
        >
          <Send className="h-4 w-4" />
          {loading ? 'Envoi…' : 'Envoyer pour validation'}
        </Button>
      </div>

      <div className="h-px bg-[#e4edf6]" />

      <div className="space-y-4">
        <h2 className="text-base font-semibold text-[#0b2f63]">Mes avis</h2>
        {items.length === 0 ? (
          <p className="text-sm text-[#5c7188]">Aucun avis</p>
        ) : (
          <div className="divide-y divide-[#e4edf6]">
            {items.map((item) => (
              <article key={item.id} className="space-y-2 py-4 first:pt-0 last:pb-0">
                <div className="flex items-center justify-between gap-2">
                  <div className="flex items-center gap-1">
                    {Array.from({ length: item.rating }).map((_, i) => (
                      <Star key={i} className="h-3.5 w-3.5 fill-amber-400 text-amber-400" />
                    ))}
                  </div>
                  <Badge variant={item.status === 'approved' ? 'default' : 'secondary'}>
                    {statusLabel[item.status] || item.status}
                  </Badge>
                </div>
                <p className="text-sm leading-relaxed text-[#5c7188]">{item.content}</p>
                {item.admin_note && item.status === 'rejected' && (
                  <p className="text-xs text-destructive">Motif : {item.admin_note}</p>
                )}
              </article>
            ))}
          </div>
        )}
      </div>
    </div>
  );
}