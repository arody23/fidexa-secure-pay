import { useEffect, useMemo, useState } from 'react';
import {
  Bell,
  Send,
  Megaphone,
  Image as ImageIcon,
  Upload,
  CalendarClock,
  RefreshCw,
} from 'lucide-react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Textarea } from '@/components/ui/textarea';
import { Label } from '@/components/ui/label';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Badge } from '@/components/ui/badge';
import { useToast } from '@/hooks/use-toast';
import { supabase } from '@/integrations/supabase/client';
import { SUPABASE_URL, SUPABASE_ANON_KEY } from '@/config';

type CampaignRow = {
  id: string;
  title: string;
  status: string;
  scheduled_at: string | null;
  automation: string | null;
  queued_count: number;
  created_at: string;
};

export default function AdminNotifications() {
  const { toast } = useToast();
  const [title, setTitle] = useState('');
  const [body, setBody] = useState('');
  const [url, setUrl] = useState('/dashboard/notifications');
  const [audience, setAudience] = useState<'all' | 'one'>('all');
  const [userId, setUserId] = useState('');
  const [sending, setSending] = useState(false);

  const [waTitle, setWaTitle] = useState('');
  const [headline, setHeadline] = useState('');
  const [waMessage, setWaMessage] = useState('');
  const [waAudience, setWaAudience] = useState<'opted_in' | 'all_providers' | 'one'>('opted_in');
  const [waUserId, setWaUserId] = useState('');
  const [mediaType, setMediaType] = useState<'none' | 'image' | 'video'>('none');
  const [mediaUrl, setMediaUrl] = useState('');
  const [mediaPreview, setMediaPreview] = useState<string | null>(null);
  const [uploading, setUploading] = useState(false);
  const [buttonLabel, setButtonLabel] = useState('Découvrir');
  const [buttonUrl, setButtonUrl] = useState('');
  const [previewDomain, setPreviewDomain] = useState('fidexapay.com');
  const [scheduledAt, setScheduledAt] = useState('');
  const [automation, setAutomation] = useState<'none' | 'daily' | 'weekly' | 'monthly'>('none');
  const [waSending, setWaSending] = useState(false);
  const [campaigns, setCampaigns] = useState<CampaignRow[]>([]);

  const loadCampaigns = async () => {
    const { data } = await supabase
      .from('whatsapp_campaigns')
      .select('id, title, status, scheduled_at, automation, queued_count, created_at')
      .order('created_at', { ascending: false })
      .limit(12);
    setCampaigns((data as CampaignRow[]) || []);
  };

  useEffect(() => {
    void loadCampaigns();
  }, []);

  const previewHost = useMemo(() => {
    try {
      if (buttonUrl.startsWith('http')) return new URL(buttonUrl).hostname;
    } catch {
      /* ignore */
    }
    return previewDomain || 'fidexapay.com';
  }, [buttonUrl, previewDomain]);

  const send = async () => {
    if (!title.trim()) {
      toast({ title: 'Titre requis', variant: 'destructive' });
      return;
    }
    if (audience === 'one' && !userId.trim()) {
      toast({ title: 'User ID requis', variant: 'destructive' });
      return;
    }

    try {
      setSending(true);
      const {
        data: { session },
      } = await supabase.auth.getSession();
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

  const uploadMedia = async (file: File) => {
    const isVideo = file.type.startsWith('video/');
    const isImage = file.type.startsWith('image/');
    if (!isImage && !isVideo) {
      toast({ title: 'Fichier non supporté', description: 'Image ou vidéo uniquement.', variant: 'destructive' });
      return;
    }
    try {
      setUploading(true);
      const ext = file.name.split('.').pop() || (isVideo ? 'mp4' : 'jpg');
      const path = `${Date.now()}-${crypto.randomUUID().slice(0, 8)}.${ext}`;
      const { error } = await supabase.storage.from('campaign-media').upload(path, file, {
        cacheControl: '3600',
        upsert: false,
        contentType: file.type,
      });
      if (error) throw error;
      const { data } = supabase.storage.from('campaign-media').getPublicUrl(path);
      setMediaUrl(data.publicUrl);
      setMediaType(isVideo ? 'video' : 'image');
      setMediaPreview(isImage ? URL.createObjectURL(file) : data.publicUrl);
      toast({ title: 'Média téléversé', description: file.name });
    } catch (err) {
      toast({
        title: 'Upload impossible',
        description: err instanceof Error ? err.message : 'Réessayez',
        variant: 'destructive',
      });
    } finally {
      setUploading(false);
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
      toast({ title: 'Ajoutez un média (upload)', variant: 'destructive' });
      return;
    }

    try {
      setWaSending(true);
      const {
        data: { session },
      } = await supabase.auth.getSession();
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
          headline: headline.trim() || waTitle.trim(),
          message: waMessage.trim(),
          audience: waAudience,
          userId: waAudience === 'one' ? waUserId.trim() : undefined,
          mediaType: mediaType === 'none' ? 'none' : mediaType,
          mediaUrl: mediaType === 'none' ? null : mediaUrl.trim(),
          buttonLabel: buttonLabel.trim() || null,
          buttonUrl: buttonUrl.trim() || null,
          previewDomain: previewHost,
          linkTitle: headline.trim() || waTitle.trim(),
          scheduledAt: scheduledAt || null,
          automation,
        }),
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error || 'Campagne impossible');

      toast({
        title: data.scheduled ? 'Campagne programmée' : 'Campagne mise en file',
        description: data.scheduled
          ? `Envoi prévu le ${new Date(data.scheduledAt).toLocaleString('fr-FR')}`
          : `${data.queued ?? 0} message(s) · ${data.recipients ?? 0} destinataire(s)`,
      });
      setWaTitle('');
      setHeadline('');
      setWaMessage('');
      setMediaUrl('');
      setMediaPreview(null);
      setMediaType('none');
      setScheduledAt('');
      setAutomation('none');
      await loadCampaigns();
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

  const dispatchDue = async () => {
    try {
      const {
        data: { session },
      } = await supabase.auth.getSession();
      if (!session?.access_token) throw new Error('Session admin requise');
      const res = await fetch(`${SUPABASE_URL}/functions/v1/admin-broadcast-whatsapp`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          Authorization: `Bearer ${session.access_token}`,
          apikey: SUPABASE_ANON_KEY ?? '',
        },
        body: JSON.stringify({ action: 'dispatch_due' }),
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error || 'Dispatch impossible');
      toast({ title: 'Dispatch', description: `${data.processed ?? 0} campagne(s) traitée(s)` });
      await loadCampaigns();
    } catch (err) {
      toast({
        title: 'Erreur',
        description: err instanceof Error ? err.message : 'Échec',
        variant: 'destructive',
      });
    }
  };

  return (
    <div className="mx-auto max-w-5xl space-y-6">
      <div>
        <h1 className="text-2xl font-bold sm:text-3xl">Notifications</h1>
        <p className="mt-1 text-muted-foreground">
          Push applicatif et campagnes WhatsApp riches (média, bouton, programmation)
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
              <Input id="userId" value={userId} onChange={(e) => setUserId(e.target.value)} />
            </div>
          )}
          <div className="space-y-2">
            <Label htmlFor="title">Titre</Label>
            <Input id="title" value={title} onChange={(e) => setTitle(e.target.value)} />
          </div>
          <div className="space-y-2">
            <Label htmlFor="body">Message</Label>
            <Textarea id="body" rows={3} value={body} onChange={(e) => setBody(e.target.value)} />
          </div>
          <div className="space-y-2">
            <Label htmlFor="url">Lien</Label>
            <Input id="url" value={url} onChange={(e) => setUrl(e.target.value)} />
          </div>
          <Button className="w-full gap-2" onClick={send} disabled={sending}>
            <Send className="h-4 w-4" />
            {sending ? 'Envoi…' : 'Envoyer la notification'}
          </Button>
        </CardContent>
      </Card>

      <div className="grid gap-6 lg:grid-cols-2">
        <Card className="border-border/70 shadow-none">
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <Megaphone className="h-5 w-5 text-primary" />
              Campagne WhatsApp
            </CardTitle>
            <CardDescription>
              Style message riche : image/vidéo, titre, texte, bouton d’action — comme une
              campagne pro.
            </CardDescription>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="space-y-2">
              <Label>Audience</Label>
              <Select
                value={waAudience}
                onValueChange={(v) => setWaAudience(v as typeof waAudience)}
              >
                <SelectTrigger>
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="opted_in">Opt-in newsletter</SelectItem>
                  <SelectItem value="all_providers">Tous les prestataires</SelectItem>
                  <SelectItem value="one">Un utilisateur</SelectItem>
                </SelectContent>
              </Select>
            </div>
            {waAudience === 'one' && (
              <Input
                placeholder="UUID prestataire"
                value={waUserId}
                onChange={(e) => setWaUserId(e.target.value)}
              />
            )}
            <div className="space-y-2">
              <Label>Titre interne</Label>
              <Input value={waTitle} onChange={(e) => setWaTitle(e.target.value)} placeholder="Campagne mars" />
            </div>
            <div className="space-y-2">
              <Label>Titre affiché (gras)</Label>
              <Input
                value={headline}
                onChange={(e) => setHeadline(e.target.value)}
                placeholder="See How FidexaPay Works"
              />
            </div>
            <div className="space-y-2">
              <Label>Message</Label>
              <Textarea
                rows={5}
                value={waMessage}
                onChange={(e) => setWaMessage(e.target.value)}
                placeholder="Amplifiez vos paiements sécurisés…"
              />
            </div>

            <div className="space-y-2">
              <Label className="inline-flex items-center gap-1.5">
                <ImageIcon className="h-3.5 w-3.5" />
                Média (depuis l’appareil)
              </Label>
              <div className="flex flex-wrap gap-2">
                <label className="inline-flex h-10 cursor-pointer items-center gap-2 rounded-md border border-input bg-background px-3 text-sm hover:bg-muted/50">
                  <Upload className="h-4 w-4" />
                  {uploading ? 'Upload…' : 'Choisir un fichier'}
                  <input
                    type="file"
                    accept="image/*,video/mp4,video/quicktime"
                    className="hidden"
                    disabled={uploading}
                    onChange={(e) => {
                      const f = e.target.files?.[0];
                      if (f) void uploadMedia(f);
                    }}
                  />
                </label>
                {mediaType !== 'none' && (
                  <Button
                    type="button"
                    variant="ghost"
                    size="sm"
                    onClick={() => {
                      setMediaType('none');
                      setMediaUrl('');
                      setMediaPreview(null);
                    }}
                  >
                    Retirer
                  </Button>
                )}
              </div>
            </div>

            <div className="grid gap-3 sm:grid-cols-2">
              <div className="space-y-2">
                <Label>Libellé bouton</Label>
                <Input value={buttonLabel} onChange={(e) => setButtonLabel(e.target.value)} />
              </div>
              <div className="space-y-2">
                <Label>Lien bouton</Label>
                <Input
                  value={buttonUrl}
                  onChange={(e) => setButtonUrl(e.target.value)}
                  placeholder="https://…"
                />
              </div>
            </div>

            <div className="grid gap-3 sm:grid-cols-2">
              <div className="space-y-2">
                <Label className="inline-flex items-center gap-1.5">
                  <CalendarClock className="h-3.5 w-3.5" />
                  Programmer
                </Label>
                <Input
                  type="datetime-local"
                  value={scheduledAt}
                  onChange={(e) => setScheduledAt(e.target.value)}
                />
              </div>
              <div className="space-y-2">
                <Label>Automatisation</Label>
                <Select
                  value={automation}
                  onValueChange={(v) => setAutomation(v as typeof automation)}
                >
                  <SelectTrigger>
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="none">Une seule fois</SelectItem>
                    <SelectItem value="daily">Tous les jours</SelectItem>
                    <SelectItem value="weekly">Toutes les semaines</SelectItem>
                    <SelectItem value="monthly">Tous les mois</SelectItem>
                  </SelectContent>
                </Select>
              </div>
            </div>

            <div className="flex flex-col gap-2 sm:flex-row">
              <Button className="flex-1 gap-2" onClick={sendWhatsAppCampaign} disabled={waSending}>
                <Send className="h-4 w-4" />
                {waSending
                  ? '…'
                  : scheduledAt
                    ? 'Programmer'
                    : 'Envoyer maintenant'}
              </Button>
              <Button type="button" variant="outline" onClick={dispatchDue}>
                <RefreshCw className="mr-2 h-4 w-4" />
                Traiter dues
              </Button>
            </div>
          </CardContent>
        </Card>

        {/* Aperçu style Sent / WhatsApp */}
        <div className="space-y-4">
          <Card className="overflow-hidden border-0 bg-[#0b141a] text-white shadow-xl">
            <CardHeader className="border-b border-white/10 pb-3">
              <CardTitle className="text-base font-medium text-white/90">Aperçu WhatsApp</CardTitle>
              <CardDescription className="text-white/45">
                Rendu proche d’une campagne marketing (média + CTA)
              </CardDescription>
            </CardHeader>
            <CardContent className="bg-[#0b141a] p-4">
              <div className="mx-auto max-w-[320px] overflow-hidden rounded-xl bg-[#1f2c34] shadow-lg">
                {(mediaPreview || mediaUrl) && mediaType === 'image' ? (
                  <img
                    src={mediaPreview || mediaUrl}
                    alt=""
                    className="aspect-[16/10] w-full object-cover"
                  />
                ) : mediaType === 'video' && mediaUrl ? (
                  <div className="flex aspect-[16/10] items-center justify-center bg-black/40 text-sm text-white/70">
                    Vidéo jointe
                  </div>
                ) : (
                  <div className="flex aspect-[16/10] items-center justify-center bg-gradient-to-br from-[#0b3b78] to-[#082848] px-4 text-center text-sm font-medium text-white/90">
                    {headline || waTitle || 'Votre visuel de campagne'}
                  </div>
                )}
                <div className="space-y-2 px-3 py-3">
                  <p className="text-sm font-bold text-white">
                    *{headline || waTitle || 'Titre du message'}*
                  </p>
                  <p className="whitespace-pre-wrap text-[13px] leading-relaxed text-white/80">
                    {waMessage ||
                      'Le corps du message apparaîtra ici. Ajoutez une description claire pour convertir.'}
                  </p>
                  {(buttonLabel || buttonUrl) && (
                    <p className="whitespace-pre-wrap text-[13px] font-medium leading-relaxed text-[#53bdeb]">
                      👉 {buttonLabel || 'Ouvrir'}
                      {buttonUrl ? `\n${buttonUrl}` : ''}
                    </p>
                  )}
                  <p className="text-right text-[10px] text-white/35">aperçu</p>
                </div>
              </div>
            </CardContent>
          </Card>

          <Card>
            <CardHeader className="pb-3">
              <CardTitle className="text-base">Campagnes récentes</CardTitle>
            </CardHeader>
            <CardContent className="space-y-2">
              {campaigns.length === 0 ? (
                <p className="text-sm text-muted-foreground">Aucune campagne pour l’instant.</p>
              ) : (
                campaigns.map((c) => (
                  <div
                    key={c.id}
                    className="flex items-center justify-between gap-2 rounded-lg border px-3 py-2 text-sm"
                  >
                    <div className="min-w-0">
                      <p className="truncate font-medium">{c.title}</p>
                      <p className="text-[11px] text-muted-foreground">
                        {c.scheduled_at
                          ? `Prévu ${new Date(c.scheduled_at).toLocaleString('fr-FR')}`
                          : new Date(c.created_at).toLocaleString('fr-FR')}
                        {c.automation ? ` · auto ${c.automation}` : ''}
                      </p>
                    </div>
                    <Badge variant="secondary">{c.status}</Badge>
                  </div>
                ))
              )}
            </CardContent>
          </Card>
        </div>
      </div>
    </div>
  );
}
