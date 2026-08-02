import { useEffect, useMemo, useState } from 'react';
import { Bell, Loader2, MessageSquareText, Save, Send } from 'lucide-react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Textarea } from '@/components/ui/textarea';
import { Label } from '@/components/ui/label';
import { Badge } from '@/components/ui/badge';
import { Switch } from '@/components/ui/switch';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import { useToast } from '@/hooks/use-toast';
import { supabase } from '@/integrations/supabase/client';
import AdminNotificationsPush from './Notifications';

type Template = {
  id: string;
  event_type: string;
  category: string;
  name: string;
  description: string | null;
  channel: string;
  body: string;
  is_active: boolean;
  variables: string[] | null;
};

/**
 * Admin — modèles de messages WhatsApp (textes 100% éditables, zéro hardcode métier).
 */
export default function AdminMessageTemplates() {
  const { toast } = useToast();
  const [templates, setTemplates] = useState<Template[]>([]);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState('');
  const [category, setCategory] = useState('all');
  const [selected, setSelected] = useState<Template | null>(null);
  const [draftBody, setDraftBody] = useState('');
  const [preview, setPreview] = useState('');
  const [saving, setSaving] = useState(false);
  const [testPhone, setTestPhone] = useState('');
  const [testing, setTesting] = useState(false);

  const load = async () => {
    try {
      setLoading(true);
      let q = supabase.from('notification_templates').select('*').order('category').order('name');
      if (category !== 'all') q = q.eq('category', category);
      const { data, error } = await q;
      if (error) throw error;
      let rows = (data || []) as Template[];
      if (search.trim()) {
        const s = search.toLowerCase();
        rows = rows.filter(
          (t) =>
            t.name.toLowerCase().includes(s) ||
            t.event_type.toLowerCase().includes(s) ||
            t.body.toLowerCase().includes(s)
        );
      }
      setTemplates(rows);
      if (selected) {
        const fresh = rows.find((t) => t.id === selected.id);
        if (fresh) {
          setSelected(fresh);
          setDraftBody(fresh.body);
        }
      }
    } catch (err) {
      toast({
        title: 'Erreur',
        description: err instanceof Error ? err.message : 'Chargement impossible',
        variant: 'destructive',
      });
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    load();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [category]);

  const categories = useMemo(() => {
    const set = new Set(templates.map((t) => t.category));
    return ['all', ...Array.from(set)];
  }, [templates]);

  const openTemplate = (t: Template) => {
    setSelected(t);
    setDraftBody(t.body);
    setPreview('');
  };

  const save = async () => {
    if (!selected) return;
    try {
      setSaving(true);
      const { error } = await supabase
        .from('notification_templates')
        .update({ body: draftBody, updated_at: new Date().toISOString() })
        .eq('id', selected.id);
      if (error) throw error;
      toast({ title: 'Modèle enregistré' });
      await load();
    } catch (err) {
      toast({
        title: 'Erreur',
        description: err instanceof Error ? err.message : 'Sauvegarde impossible',
        variant: 'destructive',
      });
    } finally {
      setSaving(false);
    }
  };

  const toggleActive = async (t: Template, active: boolean) => {
    const { error } = await supabase
      .from('notification_templates')
      .update({ is_active: active, updated_at: new Date().toISOString() })
      .eq('id', t.id);
    if (error) {
      toast({ title: 'Erreur', description: error.message, variant: 'destructive' });
      return;
    }
    await load();
  };

  const buildPreview = () => {
    const sample: Record<string, string> = {
      client_name: 'Jean Client',
      merchant_name: 'Marie Prestataire',
      amount: '25 000',
      currency: 'CDF',
      transaction_id: 'txn_demo',
      otp: '482910',
      otp_minutes: '15',
      order_reference: 'CMD-DEMO',
      payment_link: 'https://app.fidexapay.com/pay/demo',
      tracking_link: 'https://app.fidexapay.com/order/demo',
      date: new Date().toLocaleDateString('fr-FR'),
      time: new Date().toLocaleTimeString('fr-FR', { hour: '2-digit', minute: '2-digit' }),
    };
    const text = draftBody.replace(/\{\{\s*([a-zA-Z0-9_]+)\s*\}\}/g, (_, key) => sample[key] ?? `{{${key}}}`);
    setPreview(text);
  };

  const sendTest = async () => {
    if (!selected || !testPhone.trim()) {
      toast({ title: 'Numéro requis', variant: 'destructive' });
      return;
    }
    try {
      setTesting(true);
      const { adminNotify } = await import('@/lib/adminNotify');
      const result = await adminNotify.templateTest(
        selected.event_type,
        testPhone.trim(),
        { clientName: 'Test', amount: '1000', currency: 'CDF', orderUrl: window.location.origin }
      );
      toast({
        title: result.ok === false ? 'Échec envoi' : 'Test envoyé',
        description:
          result.error ||
          result.skippedReason ||
          `WhatsApp → ${testPhone} (${selected.event_type})`,
        variant: result.ok === false ? 'destructive' : 'default',
      });
    } catch (err) {
      toast({
        title: 'Service notifications',
        description:
          err instanceof Error
            ? err.message
            : 'Déployez notification-service (Railway) et scannez WhatsApp.',
        variant: 'destructive',
      });
    } finally {
      setTesting(false);
    }
  };

  return (
    <div className="mx-auto max-w-6xl space-y-6">
      <div>
        <h1 className="text-2xl font-bold sm:text-3xl">Notifications</h1>
        <p className="mt-1 text-muted-foreground">
          Push applicatif et modèles WhatsApp (textes administrables, zéro hardcode)
        </p>
      </div>

      <Tabs defaultValue="templates">
        <TabsList>
          <TabsTrigger value="templates" className="gap-2">
            <MessageSquareText className="h-4 w-4" />
            Modèles WhatsApp
          </TabsTrigger>
          <TabsTrigger value="push" className="gap-2">
            <Bell className="h-4 w-4" />
            Push
          </TabsTrigger>
        </TabsList>

        <TabsContent value="push" className="mt-4">
          <AdminNotificationsPush />
        </TabsContent>

        <TabsContent value="templates" className="mt-4 space-y-4">
          <div className="flex flex-wrap gap-2">
            <Input
              placeholder="Rechercher…"
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              className="max-w-xs"
              onKeyDown={(e) => e.key === 'Enter' && load()}
            />
            <Select value={category} onValueChange={setCategory}>
              <SelectTrigger className="w-44">
                <SelectValue placeholder="Catégorie" />
              </SelectTrigger>
              <SelectContent>
                {categories.map((c) => (
                  <SelectItem key={c} value={c}>
                    {c === 'all' ? 'Toutes' : c}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
            <Button variant="outline" onClick={load}>
              Filtrer
            </Button>
          </div>

          {loading ? (
            <div className="flex justify-center py-12">
              <Loader2 className="h-8 w-8 animate-spin text-primary" />
            </div>
          ) : (
            <div className="grid gap-4 lg:grid-cols-2">
              <Card>
                <CardHeader>
                  <CardTitle>Modèles</CardTitle>
                  <CardDescription>{templates.length} modèle(s)</CardDescription>
                </CardHeader>
                <CardContent className="max-h-[32rem] space-y-2 overflow-y-auto">
                  {templates.map((t) => (
                    <button
                      key={t.id}
                      type="button"
                      onClick={() => openTemplate(t)}
                      className={`w-full rounded-lg border p-3 text-left transition hover:border-primary/50 ${
                        selected?.id === t.id ? 'border-primary bg-primary/5' : ''
                      }`}
                    >
                      <div className="flex items-center justify-between gap-2">
                        <p className="font-medium">{t.name}</p>
                        <Badge variant={t.is_active ? 'default' : 'secondary'}>
                          {t.is_active ? 'Actif' : 'Off'}
                        </Badge>
                      </div>
                      <p className="text-xs text-muted-foreground">
                        {t.event_type} · {t.category}
                      </p>
                    </button>
                  ))}
                </CardContent>
              </Card>

              <Card>
                <CardHeader>
                  <CardTitle>{selected ? selected.name : 'Éditeur'}</CardTitle>
                  <CardDescription>
                    {selected
                      ? selected.description || selected.event_type
                      : 'Sélectionnez un modèle à gauche'}
                  </CardDescription>
                </CardHeader>
                <CardContent className="space-y-4">
                  {!selected ? (
                    <p className="text-sm text-muted-foreground">Aucun modèle sélectionné.</p>
                  ) : (
                    <>
                      <div className="flex items-center justify-between">
                        <Label>Actif</Label>
                        <Switch
                          checked={selected.is_active}
                          onCheckedChange={(v) => toggleActive(selected, v)}
                        />
                      </div>
                      <div className="space-y-2">
                        <Label>Corps du message</Label>
                        <Textarea
                          rows={8}
                          value={draftBody}
                          onChange={(e) => setDraftBody(e.target.value)}
                        />
                        <p className="text-xs text-muted-foreground">
                          Variables : {(selected.variables || []).map((v) => `{{${v}}}`).join(' ')}
                        </p>
                      </div>
                      <div className="flex flex-wrap gap-2">
                        <Button onClick={save} disabled={saving}>
                          {saving ? (
                            <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                          ) : (
                            <Save className="mr-2 h-4 w-4" />
                          )}
                          Enregistrer
                        </Button>
                        <Button variant="outline" onClick={buildPreview}>
                          Prévisualiser
                        </Button>
                      </div>
                      {preview && (
                        <div className="rounded-lg bg-muted p-3 text-sm whitespace-pre-wrap">
                          {preview}
                        </div>
                      )}
                      <div className="space-y-2 border-t pt-4">
                        <Label>Test WhatsApp (indicatif)</Label>
                        <Input
                          placeholder="+243…"
                          value={testPhone}
                          onChange={(e) => setTestPhone(e.target.value)}
                        />
                        <Button variant="secondary" onClick={sendTest} disabled={testing}>
                          <Send className="mr-2 h-4 w-4" />
                          Aide envoi test
                        </Button>
                      </div>
                    </>
                  )}
                </CardContent>
              </Card>
            </div>
          )}
        </TabsContent>
      </Tabs>
    </div>
  );
}
