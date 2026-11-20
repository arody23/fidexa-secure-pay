import { useState } from 'react';
import { Bell, Send, Megaphone, Image as ImageIcon } from 'lucide-react';
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

  const [waTitle, setWaTitle] = useState('');
  const [waMessage, setWaMessage] = useState('');
  const [waAudience, setWaAudience] = useState<'opted_in' | 'all_providers' | 'one'>('opted_in');
  const [waUserId, setWaUserId] = useState('');
  const [mediaType, setMediaType] = useState<'none' | 'image' | 'video' | 'document'>('none');
  const [mediaUrl, setMediaUrl] = useState('');
  const [buttonLabel, setButtonLabel] = useState('');
  const [buttonUrl, setButtonUrl] = useState('');
  const [waSending, setWaSending] = useState(false);

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

  const sendWhatsAppCampaign = async () => {
    if (!waTitle.trim() || !waMessage.trim()) {
      toast({ title: 'Titre et message requis', variant: 'destructive' });
      return;
    }
    if (waAudience === 'one' && !waUserId.trim()) {
      toast({ title: 'User ID requis', variant: 'destructive' });
      return;
    }
    if (mediaType !== 'none' && !mediaUrl.trim()) {
      toast({ title: 'URL média requise', variant: 'destructive' });
      return;
    }

    try {
      setWaSending(true);
      const { data: { session } } = await supabase.auth.getSession();
      if (!session?.access_token) throw new Error('Session admin requise');

      const res = await fetch(`${SUPABASE_URL}/functions/v1/admin-broadcast-whatsapp`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          Authorization: `Bearer ${session.access_token}`,
          apikey: SUPABASE_ANON_KEY ?? '',
        },
        body: JSON.stringify({
          title: waTitle.trim(),
          message: waMessage.trim(),
          audience: waAudience,
          userId: waAudience === 'one' ? waUserId.trim() : undefined,
          mediaType: mediaType === 'none' ? 'none' : mediaType,
          mediaUrl: mediaType === 'none' ? null : mediaUrl.trim(),
          buttonLabel: buttonLabel.trim() || null,
          buttonUrl: buttonUrl.trim() || null,
        }),
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error || 'Campagne impossible');

      toast({
        title: 'Campagne WhatsApp mise en file',
        description: `${data.queued ?? 0} message(s) sur ${data.recipients ?? 0} destinataire(s)`,
      });
      setWaTitle('');
      setWaMessage('');
      setMediaUrl('');
      setButtonLabel('');
      setButtonUrl('');
      setMediaType('none');
    } catch (err) {
      toast({
        title: 'Erreur',
        description: err instanceof Error ? err.message : 'Échec campagne',
        variant: 'destructive',
      });
    } finally {
      setWaSending(false);
    }
  };

  return (
    <div className="mx-auto max-w-2xl space-y-6">
      <div>
        <h1 className="text-2xl font-bold sm:text-3xl">Notifications</h1>
        <p className="mt-1 text-muted-foreground">
          Push applicatif et campagnes WhatsApp (texte, image, vidéo, bouton)
        </p>
      </div>

      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Bell className="h-5 w-5 text-primary" />
            Push applicatif
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

      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Megaphone className="h-5 w-5 text-primary" />
            Campagne WhatsApp
          </CardTitle>
          <CardDescription>
            Offres personnalisées : texte, image/vidéo, lien et bouton d’action.
            Destinataires = prestataires ayant accepté la newsletter WhatsApp.
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="space-y-2">
            <Label>Audience</Label>
            <Select
              value={waAudience}
              onValueChange={(v) => setWaAudience(v as 'opted_in' | 'all_providers' | 'one')}
            >
              <SelectTrigger>
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="opted_in">Opt-in newsletter WhatsApp</SelectItem>
                <SelectItem value="all_providers">Tous les prestataires (avec téléphone)</SelectItem>
                <SelectItem value="one">Un utilisateur (UUID)</SelectItem>
              </SelectContent>
            </Select>
          </div>

          {waAudience === 'one' && (
            <div className="space-y-2">
              <Label>User ID</Label>
              <Input
                placeholder="uuid du prestataire"
                value={waUserId}
                onChange={(e) => setWaUserId(e.target.value)}
              />
            </div>
          )}

          <div className="space-y-2">
            <Label>Titre campagne</Label>
            <Input
              placeholder="Ex: Offre Essentiel −2 mois"
              value={waTitle}
              onChange={(e) => setWaTitle(e.target.value)}
            />
          </div>

          <div className="space-y-2">
            <Label>Message</Label>
            <Textarea
              rows={5}
              placeholder="Texte WhatsApp (variables libres, ton commercial)…"
              value={waMessage}
              onChange={(e) => setWaMessage(e.target.value)}
            />
          </div>

          <div className="grid gap-4 sm:grid-cols-2">
            <div className="space-y-2">
              <Label className="inline-flex items-center gap-1.5">
                <ImageIcon className="h-3.5 w-3.5" />
                Média
              </Label>
              <Select
                value={mediaType}
                onValueChange={(v) => setMediaType(v as typeof mediaType)}
              >
                <SelectTrigger>
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="none">Aucun</SelectItem>
                  <SelectItem value="image">Image</SelectItem>
                  <SelectItem value="video">Vidéo</SelectItem>
                  <SelectItem value="document">Document</SelectItem>
                </SelectContent>
              </Select>
            </div>
            <div className="space-y-2">
              <Label>URL média</Label>
              <Input
                placeholder="https://…/visuel.jpg"
                value={mediaUrl}
                onChange={(e) => setMediaUrl(e.target.value)}
                disabled={mediaType === 'none'}
              />
            </div>
          </div>

          <div className="grid gap-4 sm:grid-cols-2">
            <div className="space-y-2">
              <Label>Libellé bouton</Label>
              <Input
                placeholder="Ex: Voir l’offre"
                value={buttonLabel}
                onChange={(e) => setButtonLabel(e.target.value)}
              />
            </div>
            <div className="space-y-2">
              <Label>Lien du bouton</Label>
              <Input
                placeholder="https://… ou /dashboard/subscriptions"
                value={buttonUrl}
                onChange={(e) => setButtonUrl(e.target.value)}
              />
            </div>
          </div>

          <Button className="w-full gap-2" onClick={sendWhatsAppCampaign} disabled={waSending}>
            <Send className="h-4 w-4" />
            {waSending ? 'Mise en file…' : 'Envoyer la campagne WhatsApp'}
          </Button>
        </CardContent>
      </Card>
    </div>
  );
}
