import { useState, useEffect, useMemo, useCallback } from 'react';
import { motion } from 'framer-motion';
import {
  AlertTriangle,
  CheckCircle,
  XCircle,
  Shield,
  MessageCircle,
  Send,
  User,
  Scale,
  Search,
  RefreshCw,
  Gavel,
  FileText,
  Clock,
} from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Textarea } from '@/components/ui/textarea';
import { Label } from '@/components/ui/label';
import { Input } from '@/components/ui/input';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog';
import { supabase } from '@/integrations/supabase/client';
import { useToast } from '@/hooks/use-toast';
import {
  convertToUSD,
  formatAmount,
  formatUSD,
  normalizeCurrency,
} from '@/lib/currency';

interface PaymentLinkInfo {
  link_id: string;
  client_name: string | null;
  client_email: string | null;
  client_phone: string | null;
  amount: number;
  description: string | null;
  provider_id: string | null;
  provider_name: string | null;
  order_status: string | null;
}

interface Dispute {
  id: string;
  payment_link_id: string | null;
  reason: string;
  description: string | null;
  status: string;
  created_at: string;
  resolved_at: string | null;
  resolution_type: string | null;
  resolution_notes: string | null;
  admin_notes: string | null;
  evidence_urls: string[] | null;
  provider_response: string | null;
  provider_response_at: string | null;
  provider_evidence_urls: string[] | null;
  resolved_in_favor_of: string | null;
  payment_links?: PaymentLinkInfo | null;
}

interface ProviderInfo {
  full_name: string | null;
  email: string;
  phone_number: string | null;
  currency: string | null;
  country: string | null;
  kyc_status: string | null;
  rating: number | null;
}

interface SupportMessage {
  id: string;
  sender_type: string;
  message: string;
  created_at: string;
  users?: { full_name: string | null } | null;
}

interface SupportConversation {
  id: string;
  subject: string;
  messages: SupportMessage[];
  users?: { full_name: string | null; email: string | null } | null;
}

function parseRpcResult(data: unknown): { success?: boolean; error?: string; message?: string } {
  if (!data) return { success: false, error: 'Réponse vide du serveur' };
  if (typeof data === 'string') {
    try {
      return JSON.parse(data);
    } catch {
      return { success: false, error: 'Réponse serveur invalide' };
    }
  }
  return data as { success?: boolean; error?: string; message?: string };
}

export default function AdminDisputes() {
  const { toast } = useToast();
  const [disputes, setDisputes] = useState<Dispute[]>([]);
  const [loading, setLoading] = useState(true);
  const [searchTerm, setSearchTerm] = useState('');
  const [filterStatus, setFilterStatus] = useState<'all' | 'open' | 'resolved'>('open');
  const [selectedDispute, setSelectedDispute] = useState<Dispute | null>(null);
  const [resolution, setResolution] = useState('');
  const [decision, setDecision] = useState<'refund_client' | 'pay_provider' | null>(null);
  const [resolving, setResolving] = useState(false);
  const [paymentLink, setPaymentLink] = useState<PaymentLinkInfo | null>(null);
  const [providerInfo, setProviderInfo] = useState<ProviderInfo | null>(null);
  const [providerLoading, setProviderLoading] = useState(false);
  const [providerCurrency, setProviderCurrency] = useState('FCFA');
  const [conversation, setConversation] = useState<SupportConversation | null>(null);
  const [newMessage, setNewMessage] = useState('');
  const [sendingMessage, setSendingMessage] = useState(false);

  const loadDisputes = useCallback(async () => {
    try {
      setLoading(true);
      const { data, error } = await supabase
        .from('disputes')
        .select(`
          *,
          payment_links (
            link_id,
            client_name,
            client_email,
            client_phone,
            amount,
            description,
            provider_id,
            provider_name,
            order_status
          )
        `)
        .order('created_at', { ascending: false });

      if (error) throw error;
      setDisputes((data as Dispute[]) || []);
    } catch (error) {
      console.error('Error loading disputes:', error);
      toast({
        title: 'Erreur',
        description: 'Impossible de charger les litiges',
        variant: 'destructive',
      });
    } finally {
      setLoading(false);
    }
  }, [toast]);

  useEffect(() => {
    loadDisputes();
    const channel = supabase
      .channel('admin-disputes')
      .on('postgres_changes', { event: '*', schema: 'public', table: 'disputes' }, () => loadDisputes())
      .subscribe();
    return () => {
      supabase.removeChannel(channel);
    };
  }, [loadDisputes]);

  const loadDisputeContext = useCallback(async (dispute: Dispute) => {
    setPaymentLink(null);
    setProviderInfo(null);
    setConversation(null);
    setProviderLoading(true);

    let link = dispute.payment_links ?? null;

    if (!link && dispute.payment_link_id) {
      const { data: pl } = await supabase
        .from('payment_links')
        .select('link_id, client_name, client_email, client_phone, amount, description, provider_id, provider_name, order_status')
        .eq('id', dispute.payment_link_id)
        .maybeSingle();
      link = pl;
    }

    setPaymentLink(link);

    const providerId = link?.provider_id;
    if (providerId) {
      const { data: provider, error } = await supabase
        .from('users')
        .select('full_name, email, phone_number, currency, country, kyc_status, rating')
        .eq('id', providerId)
        .maybeSingle();

      if (error) {
        console.error('Provider load error:', error);
        setProviderInfo(null);
      } else {
        setProviderInfo(provider);
        setProviderCurrency(normalizeCurrency(provider?.currency));
      }
    }

    setProviderLoading(false);

    if (dispute.payment_link_id) {
      const { data: conv } = await supabase
        .from('support_conversations')
        .select('id, subject, users(full_name, email)')
        .eq('payment_link_id', dispute.payment_link_id)
        .maybeSingle();

      if (conv) {
        const { data: messages } = await supabase
          .from('support_messages')
          .select('id, sender_type, message, created_at, users(full_name)')
          .eq('conversation_id', conv.id)
          .order('created_at', { ascending: true });

        setConversation({
          ...conv,
          messages: (messages || []) as SupportMessage[],
        } as SupportConversation);
      }
    }
  }, []);

  useEffect(() => {
    if (selectedDispute) {
      loadDisputeContext(selectedDispute);
    } else {
      setResolution('');
      setDecision(null);
      setPaymentLink(null);
      setProviderInfo(null);
      setConversation(null);
    }
  }, [selectedDispute, loadDisputeContext]);

  const filteredDisputes = useMemo(() => {
    let list = [...disputes];
    if (searchTerm) {
      const q = searchTerm.toLowerCase();
      list = list.filter(
        (d) =>
          d.reason.toLowerCase().includes(q) ||
          d.description?.toLowerCase().includes(q) ||
          d.payment_links?.client_name?.toLowerCase().includes(q) ||
          d.payment_links?.provider_name?.toLowerCase().includes(q)
      );
    }
    if (filterStatus === 'open') list = list.filter((d) => d.status === 'open');
    else if (filterStatus === 'resolved') list = list.filter((d) => d.status === 'resolved');
    return list;
  }, [disputes, searchTerm, filterStatus]);

  const openDisputes = disputes.filter((d) => d.status === 'open');
  const resolvedDisputes = disputes.filter((d) => d.status === 'resolved');

  const getDisputeCurrency = (dispute: Dispute) => {
    if (dispute.id === selectedDispute?.id) return providerCurrency;
    return 'FCFA';
  };

  const handleSendMessage = async () => {
    if (!conversation || !newMessage.trim()) return;
    try {
      setSendingMessage(true);
      const { error } = await supabase.rpc('send_support_message', {
        conversation_id_param: conversation.id,
        sender_type_param: 'admin',
        content_param: newMessage.trim(),
      });
      if (error) throw error;
      setNewMessage('');
      if (selectedDispute) await loadDisputeContext(selectedDispute);
    } catch {
      toast({ title: 'Erreur', description: "Impossible d'envoyer le message", variant: 'destructive' });
    } finally {
      setSendingMessage(false);
    }
  };

  const handleResolve = async () => {
    if (!selectedDispute || !resolution.trim() || !decision) {
      toast({
        title: 'Informations manquantes',
        description: 'Sélectionnez une décision et rédigez la résolution',
        variant: 'destructive',
      });
      return;
    }

    try {
      setResolving(true);

      const { data, error } = await supabase.rpc('admin_resolve_dispute', {
        dispute_id_param: selectedDispute.id,
        decision_param: decision,
        resolution_notes_param: resolution.trim(),
      });

      if (error) throw new Error(error.message);

      const result = parseRpcResult(data);
      if (!result.success) {
        throw new Error(result.error || 'Impossible de résoudre le litige');
      }

      toast({
        title: 'Litige résolu',
        description: result.message || 'Décision enregistrée avec succès',
      });
      setSelectedDispute(null);
      await loadDisputes();
    } catch (error) {
      console.error('Resolve dispute error:', error);
      toast({
        title: 'Erreur de résolution',
        description: error instanceof Error ? error.message : 'Impossible de résoudre le litige',
        variant: 'destructive',
      });
    } finally {
      setResolving(false);
    }
  };

  if (loading) {
    return (
      <div className="flex min-h-[50vh] items-center justify-center">
        <div className="h-12 w-12 animate-spin rounded-full border-b-2 border-primary" />
      </div>
    );
  }

  return (
    <>
      <div className="space-y-8">
        <div className="flex flex-wrap items-start justify-between gap-4">
          <div>
            <p className="text-xs uppercase tracking-wide text-muted-foreground">Administration</p>
            <h1 className="text-3xl font-bold tracking-tight">Centre de litiges</h1>
            <p className="mt-2 text-muted-foreground">
              Examinez les dossiers client/prestataire et tranchez avec une décision finale
            </p>
          </div>
          <Button onClick={loadDisputes} variant="outline" className="gap-2">
            <RefreshCw className="h-4 w-4" />
            Actualiser
          </Button>
        </div>

        <div className="grid gap-4 md:grid-cols-4">
          <Card>
            <CardHeader className="pb-2">
              <CardTitle className="text-sm font-medium text-muted-foreground">Total</CardTitle>
            </CardHeader>
            <CardContent>
              <p className="text-3xl font-bold">{disputes.length}</p>
            </CardContent>
          </Card>
          <Card className="border-orange-200">
            <CardHeader className="pb-2">
              <CardTitle className="text-sm font-medium text-orange-700">En attente</CardTitle>
            </CardHeader>
            <CardContent>
              <p className="text-3xl font-bold text-orange-600">{openDisputes.length}</p>
            </CardContent>
          </Card>
          <Card className="border-green-200">
            <CardHeader className="pb-2">
              <CardTitle className="text-sm font-medium text-green-700">Résolus</CardTitle>
            </CardHeader>
            <CardContent>
              <p className="text-3xl font-bold text-green-600">{resolvedDisputes.length}</p>
            </CardContent>
          </Card>
          <Card>
            <CardHeader className="pb-2">
              <CardTitle className="text-sm font-medium text-muted-foreground">Avec réponse prestataire</CardTitle>
            </CardHeader>
            <CardContent>
              <p className="text-3xl font-bold">
                {disputes.filter((d) => d.provider_response).length}
              </p>
            </CardContent>
          </Card>
        </div>

        <div className="flex flex-col gap-4 md:flex-row">
          <div className="relative flex-1">
            <Search className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
            <Input
              placeholder="Rechercher litige, client, prestataire..."
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
              className="pl-10"
            />
          </div>
          <div className="flex gap-2">
            {(['open', 'all', 'resolved'] as const).map((s) => (
              <Button
                key={s}
                variant={filterStatus === s ? 'default' : 'outline'}
                size="sm"
                onClick={() => setFilterStatus(s)}
              >
                {s === 'open' ? 'Ouverts' : s === 'resolved' ? 'Résolus' : 'Tous'}
              </Button>
            ))}
          </div>
        </div>

        <div className="space-y-3">
          {filteredDisputes.length === 0 ? (
            <Card>
              <CardContent className="py-16 text-center">
                <CheckCircle className="mx-auto mb-4 h-12 w-12 text-green-300" />
                <p className="text-muted-foreground">Aucun litige dans cette catégorie</p>
              </CardContent>
            </Card>
          ) : (
            filteredDisputes.map((dispute) => {
              const amount = dispute.payment_links?.amount ?? 0;
              const currency = getDisputeCurrency(dispute);
              return (
                <motion.div key={dispute.id} initial={{ opacity: 0, y: 12 }} animate={{ opacity: 1, y: 0 }}>
                  <Card className={dispute.status === 'open' ? 'border-orange-200 bg-orange-50/20' : ''}>
                    <CardContent className="flex flex-wrap items-start justify-between gap-4 pt-6">
                      <div className="min-w-0 flex-1 space-y-2">
                        <div className="flex flex-wrap items-center gap-2">
                          <AlertTriangle className="h-5 w-5 shrink-0 text-orange-600" />
                          <span className="font-bold">{dispute.reason}</span>
                          <Badge variant={dispute.status === 'open' ? 'destructive' : 'secondary'}>
                            {dispute.status === 'open' ? 'Ouvert' : 'Résolu'}
                          </Badge>
                          {dispute.provider_response && (
                            <Badge className="bg-blue-100 text-blue-800">Réponse prestataire</Badge>
                          )}
                        </div>
                        <p className="text-sm text-muted-foreground line-clamp-2">{dispute.description}</p>
                        <div className="flex flex-wrap gap-2 text-xs">
                          <Badge variant="outline">
                            Client: {dispute.payment_links?.client_name || 'N/A'}
                          </Badge>
                          <Badge variant="outline">
                            Prestataire: {dispute.payment_links?.provider_name || 'N/A'}
                          </Badge>
                          {amount > 0 && (
                            <Badge variant="outline">
                              {formatAmount(amount, currency)} · {formatUSD(convertToUSD(amount, currency))}
                            </Badge>
                          )}
                          <Badge variant="outline">
                            {new Date(dispute.created_at).toLocaleDateString('fr-FR')}
                          </Badge>
                        </div>
                      </div>
                      {dispute.status === 'open' && (
                        <Button onClick={() => setSelectedDispute(dispute)} className="gap-2">
                          <Gavel className="h-4 w-4" />
                          Trancher
                        </Button>
                      )}
                    </CardContent>
                  </Card>
                </motion.div>
              );
            })
          )}
        </div>
      </div>

      <Dialog
        open={selectedDispute !== null}
        onOpenChange={(open) => {
          if (!open && !resolving) setSelectedDispute(null);
        }}
      >
        <DialogContent className="max-h-[90vh] max-w-3xl overflow-y-auto">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2">
              <Scale className="h-5 w-5" />
              Résolution du litige
            </DialogTitle>
            <DialogDescription>
              Comparez les versions client et prestataire avant de statuer
            </DialogDescription>
          </DialogHeader>

          {selectedDispute && (
            <Tabs defaultValue="dossier" className="space-y-4">
              <TabsList className="grid w-full grid-cols-4">
                <TabsTrigger value="dossier">Dossier</TabsTrigger>
                <TabsTrigger value="client">Client</TabsTrigger>
                <TabsTrigger value="provider">Prestataire</TabsTrigger>
                <TabsTrigger value="decision">Décision</TabsTrigger>
              </TabsList>

              <TabsContent value="dossier" className="space-y-4">
                <Card>
                  <CardHeader className="pb-2">
                    <CardTitle className="text-base">Résumé</CardTitle>
                  </CardHeader>
                  <CardContent className="grid gap-4 sm:grid-cols-2">
                    <div>
                      <Label className="text-xs text-muted-foreground">Raison</Label>
                      <p className="font-medium">{selectedDispute.reason}</p>
                    </div>
                    <div>
                      <Label className="text-xs text-muted-foreground">Statut commande</Label>
                      <p className="font-medium">{paymentLink?.order_status || 'disputed'}</p>
                    </div>
                    <div className="sm:col-span-2">
                      <Label className="text-xs text-muted-foreground">Description client</Label>
                      <p className="text-sm">{selectedDispute.description || '—'}</p>
                    </div>
                    {selectedDispute.provider_response && (
                      <div className="sm:col-span-2 rounded-lg border border-blue-200 bg-blue-50/50 p-3">
                        <Label className="text-xs text-blue-700">Réponse prestataire</Label>
                        <p className="mt-1 text-sm">{selectedDispute.provider_response}</p>
                        {selectedDispute.provider_response_at && (
                          <p className="mt-1 text-xs text-muted-foreground">
                            Soumis le {new Date(selectedDispute.provider_response_at).toLocaleString('fr-FR')}
                          </p>
                        )}
                      </div>
                    )}
                    {!selectedDispute.provider_response && (
                      <div className="sm:col-span-2 rounded-lg border border-amber-200 bg-amber-50/50 p-3 text-sm text-amber-800">
                        Le prestataire n&apos;a pas encore soumis sa version des faits.
                      </div>
                    )}
                  </CardContent>
                </Card>
              </TabsContent>

              <TabsContent value="client" className="space-y-4">
                <Card>
                  <CardHeader className="pb-2">
                    <CardTitle className="text-base flex items-center gap-2">
                      <User className="h-4 w-4" /> Informations client
                    </CardTitle>
                  </CardHeader>
                  <CardContent className="space-y-3">
                    <div className="grid gap-3 sm:grid-cols-2">
                      <div>
                        <Label className="text-xs text-muted-foreground">Nom</Label>
                        <p>{paymentLink?.client_name || 'N/A'}</p>
                      </div>
                      <div>
                        <Label className="text-xs text-muted-foreground">Téléphone</Label>
                        <p>{paymentLink?.client_phone || '—'}</p>
                      </div>
                      <div>
                        <Label className="text-xs text-muted-foreground">Montant payé</Label>
                        <p className="font-semibold">
                          {formatAmount(paymentLink?.amount ?? 0, providerCurrency)}
                        </p>
                        <p className="text-xs text-muted-foreground">
                          {formatUSD(convertToUSD(paymentLink?.amount ?? 0, providerCurrency))}
                        </p>
                      </div>
                      <div>
                        <Label className="text-xs text-muted-foreground">Commande</Label>
                        <p className="text-sm">{paymentLink?.description || '—'}</p>
                      </div>
                    </div>
                  </CardContent>
                </Card>

                <Card>
                  <CardHeader className="pb-2">
                    <CardTitle className="text-base flex items-center gap-2">
                      <MessageCircle className="h-4 w-4" /> Support client
                    </CardTitle>
                  </CardHeader>
                  <CardContent>
                    {!conversation ? (
                      <p className="py-6 text-center text-sm text-muted-foreground">
                        Aucune conversation support liée
                      </p>
                    ) : (
                      <div className="space-y-3">
                        <div className="max-h-64 space-y-2 overflow-y-auto rounded-lg border bg-muted/30 p-3">
                          {conversation.messages.map((msg) => (
                            <div
                              key={msg.id}
                              className={`flex ${msg.sender_type === 'admin' ? 'justify-end' : 'justify-start'}`}
                            >
                              <div
                                className={`max-w-[85%] rounded-lg px-3 py-2 text-sm ${
                                  msg.sender_type === 'admin'
                                    ? 'bg-primary text-primary-foreground'
                                    : 'border bg-background'
                                }`}
                              >
                                <p>{msg.message}</p>
                                <p className="mt-1 text-xs opacity-70">
                                  {new Date(msg.created_at).toLocaleString('fr-FR')}
                                </p>
                              </div>
                            </div>
                          ))}
                        </div>
                        <div className="flex gap-2">
                          <Textarea
                            placeholder="Message au client..."
                            value={newMessage}
                            onChange={(e) => setNewMessage(e.target.value)}
                            rows={2}
                          />
                          <Button onClick={handleSendMessage} disabled={sendingMessage || !newMessage.trim()}>
                            <Send className="h-4 w-4" />
                          </Button>
                        </div>
                      </div>
                    )}
                  </CardContent>
                </Card>
              </TabsContent>

              <TabsContent value="provider" className="space-y-4">
                <Card>
                  <CardHeader className="pb-2">
                    <CardTitle className="text-base">Profil prestataire</CardTitle>
                  </CardHeader>
                  <CardContent>
                    {providerLoading ? (
                      <div className="flex items-center justify-center py-8">
                        <div className="h-8 w-8 animate-spin rounded-full border-b-2 border-primary" />
                      </div>
                    ) : providerInfo ? (
                      <div className="grid gap-3 sm:grid-cols-2">
                        <div>
                          <Label className="text-xs text-muted-foreground">Nom</Label>
                          <p className="font-medium">{providerInfo.full_name || paymentLink?.provider_name}</p>
                        </div>
                        <div>
                          <Label className="text-xs text-muted-foreground">Email</Label>
                          <p>{providerInfo.email}</p>
                        </div>
                        <div>
                          <Label className="text-xs text-muted-foreground">Téléphone</Label>
                          <p>{providerInfo.phone_number || '—'}</p>
                        </div>
                        <div>
                          <Label className="text-xs text-muted-foreground">Devise / Pays</Label>
                          <p>{providerCurrency} · {providerInfo.country || '—'}</p>
                        </div>
                        <div>
                          <Label className="text-xs text-muted-foreground">KYC</Label>
                          <Badge variant="outline">{providerInfo.kyc_status || 'N/A'}</Badge>
                        </div>
                        <div>
                          <Label className="text-xs text-muted-foreground">Note</Label>
                          <p>{providerInfo.rating != null ? `${providerInfo.rating}/5` : '—'}</p>
                        </div>
                      </div>
                    ) : (
                      <p className="py-6 text-center text-sm text-muted-foreground">
                        Prestataire introuvable pour cette commande
                      </p>
                    )}
                  </CardContent>
                </Card>

                {selectedDispute.provider_response && (
                  <Card className="border-blue-200">
                    <CardHeader className="pb-2">
                      <CardTitle className="text-base flex items-center gap-2">
                        <FileText className="h-4 w-4" /> Version du prestataire
                      </CardTitle>
                      <CardDescription>
                        Soumis le{' '}
                        {selectedDispute.provider_response_at
                          ? new Date(selectedDispute.provider_response_at).toLocaleString('fr-FR')
                          : '—'}
                      </CardDescription>
                    </CardHeader>
                    <CardContent>
                      <p className="whitespace-pre-wrap text-sm">{selectedDispute.provider_response}</p>
                    </CardContent>
                  </Card>
                )}
              </TabsContent>

              <TabsContent value="decision" className="space-y-4">
                <Card>
                  <CardHeader className="pb-2">
                    <CardTitle className="text-base">Décision finale FidexaPay</CardTitle>
                    <CardDescription>
                      Cette action est irréversible et déclenche remboursement ou libération escrow
                    </CardDescription>
                  </CardHeader>
                  <CardContent className="space-y-4">
                    <div>
                      <Label htmlFor="resolution">Motivation de la décision</Label>
                      <Textarea
                        id="resolution"
                        value={resolution}
                        onChange={(e) => setResolution(e.target.value)}
                        placeholder="Expliquez pourquoi vous tranchez en faveur du client ou du prestataire..."
                        rows={4}
                        className="mt-1"
                      />
                    </div>

                    <div>
                      <Label>Décision</Label>
                      <div className="mt-2 grid grid-cols-1 gap-3 sm:grid-cols-2">
                        <Button
                          type="button"
                          variant={decision === 'refund_client' ? 'default' : 'outline'}
                          onClick={() => setDecision('refund_client')}
                          className={`h-auto flex-col gap-2 py-4 ${decision === 'refund_client' ? 'bg-red-600 hover:bg-red-700' : ''}`}
                        >
                          <XCircle className="h-5 w-5" />
                          <span>Rembourser le client</span>
                          <span className="text-xs font-normal opacity-80">Fonds non libérés au prestataire</span>
                        </Button>
                        <Button
                          type="button"
                          variant={decision === 'pay_provider' ? 'default' : 'outline'}
                          onClick={() => setDecision('pay_provider')}
                          className={`h-auto flex-col gap-2 py-4 ${decision === 'pay_provider' ? 'bg-green-600 hover:bg-green-700' : ''}`}
                        >
                          <CheckCircle className="h-5 w-5" />
                          <span>Payer le prestataire</span>
                          <span className="text-xs font-normal opacity-80">Libération escrow + commission</span>
                        </Button>
                      </div>
                    </div>

                    <Button
                      type="button"
                      onClick={handleResolve}
                      disabled={resolving || !resolution.trim() || !decision}
                      className="w-full"
                      size="lg"
                    >
                      {resolving ? (
                        <>
                          <Clock className="mr-2 h-4 w-4 animate-spin" />
                          Résolution en cours...
                        </>
                      ) : (
                        <>
                          <Gavel className="mr-2 h-4 w-4" />
                          Confirmer la résolution
                        </>
                      )}
                    </Button>
                  </CardContent>
                </Card>
              </TabsContent>
            </Tabs>
          )}
        </DialogContent>
      </Dialog>
    </>
  );
}
