import { useCallback, useEffect, useState } from 'react';
import { Check, MessageSquareQuote, X } from 'lucide-react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Textarea } from '@/components/ui/textarea';
import { useToast } from '@/hooks/use-toast';
import { supabase } from '@/integrations/supabase/client';

interface FeedbackRow {
  id: string;
  content: string;
  rating: number;
  status: string;
  admin_note: string | null;
  created_at: string;
  user_id: string;
  users?: {
    full_name: string | null;
    email: string | null;
    avatar_url: string | null;
  } | null;
}

export default function AdminFeedback() {
  const { toast } = useToast();
  const [items, setItems] = useState<FeedbackRow[]>([]);
  const [filter, setFilter] = useState<'pending' | 'approved' | 'rejected' | 'all'>('pending');
  const [loading, setLoading] = useState(true);
  const [notes, setNotes] = useState<Record<string, string>>({});

  const load = useCallback(async () => {
    setLoading(true);
    try {
      let query = supabase
        .from('provider_testimonials')
        .select('id, content, rating, status, admin_note, created_at, user_id')
        .order('created_at', { ascending: false });

      if (filter !== 'all') {
        query = query.eq('status', filter);
      }

      const { data: testimonials, error: tError } = await query;
      if (tError) throw tError;

      const userIds = [...new Set((testimonials || []).map((t) => t.user_id).filter(Boolean))];
      let userMap: Record<string, { full_name: string | null; email: string | null; avatar_url: string | null }> = {};
      if (userIds.length > 0) {
        const { data: users } = await supabase
          .from('users')
          .select('id, full_name, email, avatar_url')
          .in('id', userIds);
        (users || []).forEach((u) => {
          userMap[u.id as string] = u as unknown as { full_name: string | null; email: string | null; avatar_url: string | null };
        });
      }

      const merged = (testimonials || []).map((t) => ({
        ...t,
        users: userMap[t.user_id] || null,
      })) as unknown as FeedbackRow[];

      setItems(merged);
    } catch (error) {
      console.error(error);
      toast({ title: 'Erreur chargement', description: error instanceof Error ? error.message : String(error), variant: 'destructive' });
      setItems([]);
    }
    setLoading(false);
  }, [filter, toast]);

  useEffect(() => {
    void load();
  }, [load]);

  const moderate = async (id: string, status: 'approved' | 'rejected') => {
    const { data: { user } } = await supabase.auth.getUser();
    const { error } = await supabase
      .from('provider_testimonials')
      .update({
        status,
        reviewed_at: new Date().toISOString(),
        reviewed_by: user?.id ?? null,
        admin_note: status === 'rejected' ? notes[id]?.trim() || null : null,
        updated_at: new Date().toISOString(),
      })
      .eq('id', id);

    if (error) {
      toast({ title: 'Erreur', description: error.message, variant: 'destructive' });
      return;
    }
    toast({
      title: status === 'approved' ? 'Avis publié' : 'Avis refusé',
    });
    await load();
  };

  return (
    <div className="mx-auto max-w-3xl space-y-6">
      <div>
        <h1 className="text-2xl font-bold sm:text-3xl">Feedback prestataires</h1>
        <p className="mt-1 text-muted-foreground">Modérez les avis avant publication sur la landing.</p>
      </div>

      <div className="flex flex-wrap gap-2">
        {(['pending', 'approved', 'rejected', 'all'] as const).map((f) => (
          <Button
            key={f}
            size="sm"
            variant={filter === f ? 'default' : 'outline'}
            onClick={() => setFilter(f)}
          >
            {f === 'pending' ? 'En attente' : f === 'approved' ? 'Publiés' : f === 'rejected' ? 'Refusés' : 'Tous'}
          </Button>
        ))}
      </div>

      {loading ? (
        <p className="text-sm text-muted-foreground">Chargement…</p>
      ) : items.length === 0 ? (
        <Card>
          <CardContent className="p-6 text-sm text-muted-foreground">Aucun avis dans cette catégorie.</CardContent>
        </Card>
      ) : (
        items.map((item) => (
          <Card key={item.id}>
            <CardHeader className="pb-2">
              <div className="flex items-start justify-between gap-3">
                <div className="flex items-center gap-3">
                  {item.users?.avatar_url ? (
                    <img
                      src={item.users.avatar_url}
                      alt=""
                      className="h-10 w-10 rounded-full object-cover"
                    />
                  ) : (
                    <div className="flex h-10 w-10 items-center justify-center rounded-full bg-primary/10 text-sm font-bold text-primary">
                      {(item.users?.full_name || '?').charAt(0).toUpperCase()}
                    </div>
                  )}
                  <div>
                    <CardTitle className="text-base">
                      {item.users?.full_name || 'Prestataire'}
                    </CardTitle>
                    <CardDescription>{item.users?.email}</CardDescription>
                  </div>
                </div>
                <Badge>{item.status}</Badge>
              </div>
            </CardHeader>
            <CardContent className="space-y-3">
              <p className="text-sm leading-relaxed">{item.content}</p>
              <p className="text-xs text-muted-foreground">
                Note {item.rating}/5 · {new Date(item.created_at).toLocaleString('fr-FR')}
              </p>
              {item.status === 'pending' && (
                <>
                  <Textarea
                    placeholder="Motif de refus (optionnel)"
                    value={notes[item.id] || ''}
                    onChange={(e) => setNotes((prev) => ({ ...prev, [item.id]: e.target.value }))}
                    rows={2}
                  />
                  <div className="flex gap-2">
                    <Button className="gap-2" onClick={() => moderate(item.id, 'approved')}>
                      <Check className="h-4 w-4" /> Publier
                    </Button>
                    <Button
                      variant="destructive"
                      className="gap-2"
                      onClick={() => moderate(item.id, 'rejected')}
                    >
                      <X className="h-4 w-4" /> Refuser
                    </Button>
                  </div>
                </>
              )}
            </CardContent>
          </Card>
        ))
      )}

      {!loading && items.length > 0 && filter === 'pending' && (
        <p className="flex items-center gap-2 text-xs text-muted-foreground">
          <MessageSquareQuote className="h-3.5 w-3.5" />
          Les avis publiés apparaissent dans la section témoignages de l&apos;accueil.
        </p>
      )}
    </div>
  );
}
