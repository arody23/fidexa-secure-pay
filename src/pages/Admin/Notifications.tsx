import { useState } from 'react';
import { Bell, Send } from 'lucide-react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Textarea } from '@/components/ui/textarea';
import { Label } from '@/components/ui/label';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { useToast } from '@/hooks/use-toast';
import { supabase } from '@/integrations/supabase/client';
import { SUPABASE_URL, SUPABASE_ANON_KEY } from '@/config';

export default function AdminNotifications() {
  const { toast } = useToast();
  const [title, setTitle] = useState('');
  const [body, setBody] = useState('');
  const [url, setUrl] = useState('/dashboard/notifications');
  const [audience, setAudience] = useState<'all' | 'one'>('all');
  const [userId, setUserId] = useState('');
  const [sending, setSending] = useState(false);

  const send = async () => {
    if (!title.trim()) {
      toast({ title: 'Titre requis', variant: 'destructive' });
      return;
    }
    if (audience === 'one' && !userId.trim()) {
      toast({ title: 'User ID requis', description: 'Indiquez l’UUID du prestataire.', variant: 'destructive' });
      return;
    }

    try {
      setSending(true);
      const { data: { session } } = await supabase.auth.getSession();
      if (!session?.access_token) throw new Error('Session admin requise');

      const res = await fetch(`${SUPABASE_URL}/functions/v1/admin-broadcast-push`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          Authorization: `Bearer ${session.access_token}`,
          apikey: SUPABASE_ANON_KEY ?? '',
        },
        body: JSON.stringify({
          title: title.trim(),
          body: body.trim() || title.trim(),
          url: url.trim() || '/dashboard/notifications',
          audience,
          user_id: audience === 'one' ? userId.trim() : undefined,
        }),
      });

      const data = await res.json();
      if (!res.ok) throw new Error(data.error || 'Envoi impossible');

      toast({
        title: 'Notification envoyée',
        description: data.warning
          ? data.warning
          : `${data.users ?? 0} utilisateur(s) · ${data.pushSent ?? 0} push délivré(s)`,
      });
      setTitle('');
      setBody('');
    } catch (err) {
      toast({
        title: 'Erreur',
        description: err instanceof Error ? err.message : 'Échec envoi',
        variant: 'destructive',
      });
    } finally {
      setSending(false);
    }
  };

  return (
    <div className="mx-auto max-w-2xl space-y-6">
      <div>
        <h1 className="text-2xl font-bold sm:text-3xl">Notifications push</h1>
        <p className="mt-1 text-muted-foreground">
          Envoyez une alerte aux utilisateurs de l&apos;app (cloche + push écran)
        </p>
      </div>

      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Bell className="h-5 w-5 text-primary" />
            Nouvelle notification
          </CardTitle>
          <CardDescription>
            Les destinataires avec notifications activées recevront aussi un push système.
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="space-y-2">
            <Label>Audience</Label>
            <Select value={audience} onValueChange={(v) => setAudience(v as 'all' | 'one')}>
              <SelectTrigger>
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="all">Tous les abonnés push</SelectItem>
                <SelectItem value="one">Un utilisateur (UUID)</SelectItem>
              </SelectContent>
            </Select>
          </div>

          {audience === 'one' && (
            <div className="space-y-2">
              <Label htmlFor="userId">User ID</Label>
              <Input
                id="userId"
                placeholder="uuid du prestataire"
                value={userId}
                onChange={(e) => setUserId(e.target.value)}
              />
            </div>
          )}

          <div className="space-y-2">
            <Label htmlFor="title">Titre</Label>
            <Input
              id="title"
              placeholder="Ex: Mise à jour FidexaPay"
              value={title}
              onChange={(e) => setTitle(e.target.value)}
            />
          </div>

          <div className="space-y-2">
            <Label htmlFor="body">Message</Label>
            <Textarea
              id="body"
              rows={4}
              placeholder="Contenu de la notification…"
              value={body}
              onChange={(e) => setBody(e.target.value)}
            />
          </div>

          <div className="space-y-2">
            <Label htmlFor="url">Lien (optionnel)</Label>
            <Input
              id="url"
              placeholder="/dashboard/notifications"
              value={url}
              onChange={(e) => setUrl(e.target.value)}
            />
          </div>

          <Button className="w-full gap-2" onClick={send} disabled={sending}>
            <Send className="h-4 w-4" />
            {sending ? 'Envoi…' : 'Envoyer la notification'}
          </Button>
        </CardContent>
      </Card>
    </div>
  );
}
