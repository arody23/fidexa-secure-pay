import { useState, useEffect } from 'react';
import { motion } from 'framer-motion';
import { AlertTriangle, CheckCircle, XCircle, Eye, Shield, MessageCircle, Send, User } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Textarea } from '@/components/ui/textarea';
import { Label } from '@/components/ui/label';
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

interface Dispute {
  id: string;
  payment_link_id?: string;
  transaction_id?: string;
  raised_by: string;
  reason: string;
  description: string;
  status: string;
  created_at: string;
  payment_links?: {
    link_id: string;
    client_name: string;
    client_phone: string;
    amount: number;
    description: string;
    provider_id: string;
  };
  [key: string]: any;
}

interface SupportMessage {
  id: string;
  sender_type: string;
  sender_id?: string;
  content: string;
  created_at: string;
  users?: {
    full_name: string;
  };
}

interface SupportConversation {
  id: string;
  user_id: string;
  subject: string;
  status: string;
  created_at: string;
  updated_at: string;
  messages: SupportMessage[];
  users?: {
    full_name: string;
    email: string;
  };
}

export default function AdminDisputeResolution() {
  const { toast } = useToast();
  const [disputes, setDisputes] = useState<Dispute[]>([]);
  const [loading, setLoading] = useState(true);
  const [selectedDispute, setSelectedDispute] = useState<Dispute | null>(null);
  const [resolution, setResolution] = useState('');
  const [decision, setDecision] = useState<'refund_client' | 'pay_provider' | null>(null);
  const [resolving, setResolving] = useState(false);
  
  // Support conversation state
  const [conversation, setConversation] = useState<SupportConversation | null>(null);
  const [newMessage, setNewMessage] = useState("");
  const [sendingMessage, setSendingMessage] = useState(false);
  const [providerInfo, setProviderInfo] = useState<any>(null);

  useEffect(() => {
    loadDisputes();
  }, []);

  useEffect(() => {
    if (selectedDispute) {
      loadSupportConversation();
      loadProviderInfo();
    }
  }, [selectedDispute]);

  const loadDisputes = async () => {
    try {
      setLoading(true);
      const { data, error } = await (supabase as any)
        .from('disputes')
        .select(`
          *,
          payment_links (
            link_id,
            client_name,
            client_phone,
            amount,
            description,
            provider_id
          )
        `)
        .order('created_at', { ascending: false });

      if (error) throw error;
      setDisputes(data || []);
    } catch (error) {
      console.error('Error loading disputes:', error);
      toast({
        title: "Erreur",
        description: "Impossible de charger les litiges",
        variant: "destructive"
      });
    } finally {
      setLoading(false);
    }
  };

  const loadSupportConversation = async () => {
    if (!selectedDispute?.payment_link_id) return;

    // Récupérer la conversation via la liaison payment_link -> provider (ou directement client)
    const { data: paymentLink } = await supabase
      .from("payment_links")
      .select("provider_id, client_name")
      .eq("id", selectedDispute.payment_link_id)
      .maybeSingle();

    if (!paymentLink) return;

    // Rechercher conversation liée au provider de ce payment_link
    const { data: conv } = await supabase
      .from("support_conversations")
      .select("*, users(full_name, email)")
      .eq("user_id", paymentLink.provider_id)
      .maybeSingle();

    if (conv) {
      const { data: messages } = await supabase
        .from("support_messages")
        .select("*, users(full_name)")
        .eq("conversation_id", conv.id)
        .order("created_at", { ascending: true });

      setConversation({
        ...conv,
        messages: (messages || []) as any
      });
    }
  };

  const loadProviderInfo = async () => {
    if (!selectedDispute?.payment_links?.provider_id) return;

    const { data } = await supabase
      .from("users")
      .select("full_name, email, phone")
      .eq("id", selectedDispute.payment_links.provider_id)
      .single();

    setProviderInfo(data);
  };

  const handleSendMessage = async () => {
    if (!conversation || !newMessage.trim()) return;

    try {
      setSendingMessage(true);

      const { error } = await (supabase as any).rpc("send_support_message", {
        conversation_id_param: conversation.id,
        sender_type_param: "admin",
        content_param: newMessage
      });

      if (error) throw error;

      setNewMessage("");
      await loadSupportConversation();
    } catch (err) {
      toast({
        title: "Erreur",
        description: "Impossible d'envoyer le message",
        variant: "destructive",
      });
    } finally {
      setSendingMessage(false);
    }
  };

  const handleResolve = async () => {
    if (!selectedDispute || !resolution.trim() || !decision) {
      toast({
        title: "Informations manquantes",
        description: "Veuillez remplir tous les champs",
        variant: "destructive"
      });
      return;
    }

    try {
      setResolving(true);
      
      console.log('🔍 Début résolution litige:', {
        dispute_id: selectedDispute.id,
        decision,
        resolution
      });
      
      let data: unknown;
      let error: Error | null = null;

      const adminRes = await supabase.rpc('admin_resolve_dispute', {
        dispute_id_param: selectedDispute.id,
        decision_param: decision,
        resolution_notes_param: resolution,
      });

      if (adminRes.error) {
        const fallback = await supabase.rpc('resolve_dispute', {
          dispute_id_param: selectedDispute.id,
          resolution_param: resolution,
          decision_param: decision,
        });
        data = fallback.data;
        error = fallback.error;
      } else {
        data = adminRes.data;
        error = adminRes.error;
      }

      console.log('🔍 Résultat RPC:', { data, error });

      if (error) {
        console.error('❌ Erreur RPC:', error);
        throw error;
      }

      const result = typeof data === 'string' ? JSON.parse(data) : data;
      console.log('🔍 Résultat parsé:', result);

      if (result.success) {
        toast({
          title: "Litige résolu",
          description: result.message,
        });
        setSelectedDispute(null);
        setResolution('');
        setDecision(null);
        await loadDisputes();
      } else {
        throw new Error(result.error || 'Erreur inconnue');
      }
    } catch (error) {
      console.error('❌ Exception handleResolve:', error);
      toast({
        title: "Erreur de résolution",
        description: error instanceof Error ? error.message : 'Impossible de résoudre le litige',
        variant: "destructive"
      });
    } finally {
      setResolving(false);
    }
  };

  const openDisputes = disputes.filter(d => d.status === 'open');
  const resolvedDisputes = disputes.filter(d => d.status === 'resolved');

  if (loading) {
    return (
      <div className="flex min-h-[50vh] items-center justify-center">
        <div className="h-12 w-12 animate-spin rounded-full border-b-2 border-primary" />
      </div>
    );
  }

  return (
    <>
    <div className="space-y-6">
        <div>
          <h1 className="text-3xl font-bold text-gray-900">Résolution des litiges</h1>
          <p className="text-gray-600 mt-1">
            {openDisputes.length} litige(s) en attente
          </p>
        </div>

        {/* Stats */}
        <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
          <Card>
            <CardContent className="pt-6">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-sm text-gray-600">Total</p>
                  <p className="text-2xl font-bold">{disputes.length}</p>
                </div>
                <AlertTriangle className="h-8 w-8 text-gray-400" />
              </div>
            </CardContent>
          </Card>
          <Card>
            <CardContent className="pt-6">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-sm text-gray-600">En attente</p>
                  <p className="text-2xl font-bold text-orange-600">{openDisputes.length}</p>
                </div>
                <XCircle className="h-8 w-8 text-orange-400" />
              </div>
            </CardContent>
          </Card>
          <Card>
            <CardContent className="pt-6">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-sm text-gray-600">Résolus</p>
                  <p className="text-2xl font-bold text-green-600">{resolvedDisputes.length}</p>
                </div>
                <CheckCircle className="h-8 w-8 text-green-400" />
              </div>
            </CardContent>
          </Card>
        </div>

        {/* Litiges en attente */}
        <div className="space-y-4">
          <h2 className="text-xl font-semibold">Litiges en attente de résolution</h2>
          {openDisputes.length === 0 ? (
            <Card>
              <CardContent className="py-12 text-center">
                <CheckCircle className="h-16 w-16 text-green-300 mx-auto mb-4" />
                <p className="text-gray-500">Aucun litige en attente</p>
              </CardContent>
            </Card>
          ) : (
            <div className="space-y-3">
              {openDisputes.map((dispute) => (
                <motion.div
                  key={dispute.id}
                  initial={{ opacity: 0, y: 20 }}
                  animate={{ opacity: 1, y: 0 }}
                >
                  <Card className="border-orange-200 bg-orange-50/30">
                    <CardContent className="pt-6">
                      <div className="flex items-start justify-between gap-4">
                        <div className="flex-1 space-y-2">
                          <div className="flex items-center gap-2">
                            <AlertTriangle className="h-5 w-5 text-orange-600" />
                            <span className="font-bold text-orange-900">{dispute.reason}</span>
                          </div>
                          <p className="text-sm text-gray-700">{dispute.description}</p>
                          <div className="flex flex-wrap gap-2 text-sm">
                            <Badge variant="outline">
                              Client: {dispute.payment_links?.client_name || 'N/A'}
                            </Badge>
                            <Badge variant="outline">
                              Montant: {dispute.payment_links?.amount.toLocaleString('fr-FR')} FCFA
                            </Badge>
                            <Badge variant="outline">
                              {new Date(dispute.created_at).toLocaleDateString('fr-FR')}
                            </Badge>
                          </div>
                        </div>
                        <Button
                          onClick={() => setSelectedDispute(dispute)}
                          className="bg-blue-600 hover:bg-blue-700"
                        >
                          <Shield className="mr-2 h-4 w-4" />
                          Résoudre
                        </Button>
                      </div>
                    </CardContent>
                  </Card>
                </motion.div>
              ))}
            </div>
          )}
        </div>

        {/* Litiges résolus */}
        {resolvedDisputes.length > 0 && (
          <div className="space-y-4">
            <h2 className="text-xl font-semibold">Litiges résolus</h2>
            <div className="space-y-3">
              {resolvedDisputes.slice(0, 5).map((dispute) => (
                <Card key={dispute.id} className="border-green-200 bg-green-50/30">
                  <CardContent className="pt-6">
                    <div className="flex items-start gap-3">
                      <CheckCircle className="h-5 w-5 text-green-600 mt-0.5" />
                      <div className="flex-1">
                        <p className="font-semibold text-green-900">{dispute.reason}</p>
                        <p className="text-sm text-gray-600 mt-1">
                          Résolu le {new Date(dispute.created_at).toLocaleDateString('fr-FR')}
                        </p>
                      </div>
                    </div>
                  </CardContent>
                </Card>
              ))}
            </div>
          </div>
        )}
      </div>

      {/* Dialog de résolution */}
      <Dialog open={selectedDispute !== null} onOpenChange={() => setSelectedDispute(null)}>
        <DialogContent className="max-w-2xl">
          <DialogHeader>
            <DialogTitle>Résoudre le litige</DialogTitle>
            <DialogDescription>
              Examinez les détails et prenez une décision
            </DialogDescription>
          </DialogHeader>

          {selectedDispute && (
            <Tabs defaultValue="details" className="space-y-6">
              <TabsList className="grid w-full grid-cols-3">
                <TabsTrigger value="details">Détails</TabsTrigger>
                <TabsTrigger value="support">
                  Support Client
                  {conversation && (
                    <Badge variant="secondary" className="ml-2">
                      {conversation.messages.length}
                    </Badge>
                  )}
                </TabsTrigger>
                <TabsTrigger value="provider">Prestataire</TabsTrigger>
              </TabsList>

              {/* Onglet Détails */}
              <TabsContent value="details" className="space-y-6">
                {/* Détails du litige */}
                <div className="bg-gray-50 rounded-lg p-4 space-y-3">
                  <div>
                    <Label className="text-xs text-gray-600">Raison</Label>
                    <p className="font-semibold">{selectedDispute.reason}</p>
                  </div>
                  <div>
                    <Label className="text-xs text-gray-600">Description</Label>
                    <p className="text-sm">{selectedDispute.description}</p>
                  </div>
                  <div className="grid grid-cols-2 gap-4">
                    <div>
                      <Label className="text-xs text-gray-600">Client</Label>
                      <p className="text-sm font-medium">
                        {selectedDispute.payment_links?.client_name || 'N/A'}
                      </p>
                      {selectedDispute.payment_links?.client_phone && (
                        <p className="text-xs text-gray-500">
                          {selectedDispute.payment_links.client_phone}
                        </p>
                      )}
                    </div>
                    <div>
                      <Label className="text-xs text-gray-600">Montant</Label>
                      <p className="text-sm font-medium">
                        {selectedDispute.payment_links?.amount.toLocaleString('fr-FR')} FCFA
                      </p>
                    </div>
                  </div>
                  <div>
                    <Label className="text-xs text-gray-600">Commande</Label>
                    <p className="text-sm">{selectedDispute.payment_links?.description}</p>
                  </div>
                </div>

                {/* Résolution */}
                <div className="space-y-4">
                  <div>
                    <Label htmlFor="resolution">Votre résolution</Label>
                    <Textarea
                      id="resolution"
                      value={resolution}
                      onChange={(e) => setResolution(e.target.value)}
                      placeholder="Expliquez votre décision et les raisons..."
                      rows={4}
                    />
                  </div>

                  <div>
                    <Label>Décision finale</Label>
                    <div className="grid grid-cols-2 gap-4 mt-2">
                      <Button
                        variant={decision === 'refund_client' ? 'default' : 'outline'}
                        onClick={() => setDecision('refund_client')}
                        className={decision === 'refund_client' ? 'bg-red-600' : ''}
                      >
                        <XCircle className="mr-2 h-4 w-4" />
                        Rembourser le client
                      </Button>
                      <Button
                        variant={decision === 'pay_provider' ? 'default' : 'outline'}
                        onClick={() => setDecision('pay_provider')}
                        className={decision === 'pay_provider' ? 'bg-green-600' : ''}
                      >
                        <CheckCircle className="mr-2 h-4 w-4" />
                        Payer le prestataire
                      </Button>
                    </div>
                  </div>

                  <Button
                    onClick={handleResolve}
                    disabled={resolving || !resolution.trim() || !decision}
                    className="w-full bg-blue-600 hover:bg-blue-700"
                    size="lg"
                  >
                    {resolving ? 'Résolution en cours...' : 'Confirmer la résolution'}
                  </Button>
                </div>
              </TabsContent>

              {/* Onglet Support Client */}
              <TabsContent value="support" className="space-y-4">
                <Card>
                  <CardHeader>
                    <CardTitle className="text-lg">Conversation avec le client</CardTitle>
                  </CardHeader>
                  <CardContent>
                    {!conversation ? (
                      <p className="text-sm text-muted-foreground text-center py-8">
                        Aucune conversation support pour cette commande
                      </p>
                    ) : (
                      <div className="space-y-4">
                        {/* Messages */}
                        <div className="max-h-96 overflow-y-auto space-y-3 border rounded-lg p-4 bg-gray-50">
                          {conversation.messages.map((msg) => (
                            <div
                              key={msg.id}
                              className={`flex ${msg.sender_type === 'admin' ? 'justify-end' : 'justify-start'}`}
                            >
                              <div
                                className={`max-w-[80%] rounded-lg p-3 ${
                                  msg.sender_type === 'admin'
                                    ? 'bg-primary text-primary-foreground'
                                    : 'bg-white border'
                                }`}
                              >
                                <div className="flex items-center gap-2 mb-1">
                                  {msg.sender_type === 'admin' ? (
                                    <Shield className="w-3 h-3" />
                                  ) : (
                                    <User className="w-3 h-3" />
                                  )}
                                  <span className="text-xs font-medium">
                                    {msg.sender_type === 'admin' 
                                      ? msg.users?.full_name || 'Admin'
                                      : conversation.users?.full_name || conversation.subject}
                                  </span>
                                </div>
                                <p className="text-sm">{msg.content}</p>
                                <p className="text-xs opacity-70 mt-1">
                                  {new Date(msg.created_at).toLocaleTimeString('fr-FR', {
                                    hour: '2-digit',
                                    minute: '2-digit'
                                  })}
                                </p>
                              </div>
                            </div>
                          ))}
                        </div>

                        {/* Input */}
                        <div className="flex gap-2">
                          <Textarea
                            placeholder="Répondre au client..."
                            value={newMessage}
                            onChange={(e) => setNewMessage(e.target.value)}
                            rows={2}
                          />
                          <Button
                            onClick={handleSendMessage}
                            disabled={sendingMessage || !newMessage.trim()}
                          >
                            <Send className="w-4 h-4" />
                          </Button>
                        </div>
                      </div>
                    )}
                  </CardContent>
                </Card>
              </TabsContent>

              {/* Onglet Prestataire */}
              <TabsContent value="provider" className="space-y-4">
                <Card>
                  <CardHeader>
                    <CardTitle className="text-lg">Informations du prestataire</CardTitle>
                  </CardHeader>
                  <CardContent>
                    {providerInfo ? (
                      <div className="space-y-3">
                        <div>
                          <Label className="text-xs text-gray-600">Nom</Label>
                          <p className="font-medium">{providerInfo.full_name}</p>
                        </div>
                        <div>
                          <Label className="text-xs text-gray-600">Email</Label>
                          <p className="text-sm">{providerInfo.email}</p>
                        </div>
                        {providerInfo.phone && (
                          <div>
                            <Label className="text-xs text-gray-600">Téléphone</Label>
                            <p className="text-sm">{providerInfo.phone}</p>
                          </div>
                        )}
                        <Button
                          variant="outline"
                          className="w-full mt-4"
                          onClick={() => {
                            toast({
                              title: "Fonction à venir",
                              description: "La messagerie avec le prestataire sera bientôt disponible",
                            });
                          }}
                        >
                          <MessageCircle className="w-4 h-4 mr-2" />
                          Contacter le prestataire
                        </Button>
                      </div>
                    ) : (
                      <p className="text-sm text-muted-foreground text-center py-8">
                        Chargement des informations...
                      </p>
                    )}
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
