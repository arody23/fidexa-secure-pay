import { useEffect, useState } from 'react';
import { MessageCircle, Loader2, Send, XCircle, RefreshCw } from 'lucide-react';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Textarea } from '@/components/ui/textarea';
import { Alert, AlertDescription } from '@/components/ui/alert';
import { supabase } from '@/integrations/supabase/client';

interface Conversation {
  id: string;
  user_id: string;
  subject: string;
  status: string;
  created_at: string;
  updated_at: string;
  provider_name?: string;
  provider_email?: string;
  message_count?: number;
}

interface SupportMessage {
  id: string;
  conversation_id: string;
  sender_type: 'user' | 'admin';
  sender_id: string | null;
  message: string;
  created_at: string;
}

export default function AdminSupport() {
  const [conversations, setConversations] = useState<Conversation[]>([]);
  const [selected, setSelected] = useState<Conversation | null>(null);
  const [messages, setMessages] = useState<SupportMessage[]>([]);
  const [reply, setReply] = useState('');
  const [loading, setLoading] = useState(true);
  const [sending, setSending] = useState(false);
  const [closing, setClosing] = useState(false);
  const [error, setError] = useState('');
  const [adminId, setAdminId] = useState<string | null>(null);

  useEffect(() => {
    init();

    // S'abonner aux nouveaux messages et conversations
    const channel = supabase
      .channel('admin-support-changes')
      .on(
        'postgres_changes',
        {
          event: '*',
          schema: 'public',
          table: 'support_conversations',
        },
        () => {
          // Recharger les conversations quand il y a un changement
          loadConversations();
        }
      )
      .on(
        'postgres_changes',
        {
          event: 'INSERT',
          schema: 'public',
          table: 'support_messages',
        },
        (payload) => {
          // Recharger les messages si on regarde cette conversation
          if (selected && payload.new.conversation_id === selected.id) {
            selectConversation(selected);
          }
        }
      )
      .subscribe();

    return () => {
      supabase.removeChannel(channel);
    };
  }, [selected?.id]);

  const init = async () => {
    setLoading(true);
    setError('');
    const { data: authData, error: authError } = await supabase.auth.getUser();
    if (authError || !authData?.user) {
      setError('Session expirée, reconnectez-vous.');
      setLoading(false);
      return;
    }
    setAdminId(authData.user.id);
    await loadConversations();
    setLoading(false);
  };

  const loadConversations = async () => {
    // Charger les conversations avec les infos du prestataire via JOIN
    const { data, error: convError } = await supabase
      .from('support_conversations')
      .select(`
        *,
        users!support_conversations_user_id_fkey (
          full_name,
          email
        )
      `)
      .order('updated_at', { ascending: false });

    if (convError) {
      setError(convError.message);
      return;
    }
    
    // Transformer les données pour inclure provider_name et provider_email
    const items = (data || []).map((conv: any) => ({
      ...conv,
      provider_name: conv.users?.full_name || 'Inconnu',
      provider_email: conv.users?.email || '',
      users: undefined // Supprimer l'objet users pour garder l'interface propre
    })) as Conversation[];
    
    setConversations(items);
    if (items.length > 0) {
      selectConversation(items[0]);
    } else {
      setSelected(null);
      setMessages([]);
    }
  };

  const selectConversation = async (conv: Conversation) => {
    setSelected(conv);
    const { data, error: msgError } = await supabase
      .from('support_messages')
      .select('*')
      .eq('conversation_id', conv.id)
      .order('created_at', { ascending: true });
    if (msgError) {
      setError(msgError.message);
      return;
    }
    setMessages((data || []) as SupportMessage[]);
  };

  const sendReply = async () => {
    if (!selected || !adminId || !reply.trim()) return;
    setSending(true);
    setError('');
    const { error: sendError } = await supabase.from('support_messages').insert({
      conversation_id: selected.id,
      sender_type: 'admin',
      sender_id: adminId,
      message: reply.trim(),
    });
    if (sendError) {
      setError(sendError.message);
    } else {
      setReply('');
      await selectConversation(selected);
      await loadConversations();
    }
    setSending(false);
  };

  const closeConversation = async () => {
    if (!selected) return;
    setClosing(true);
    setError('');
    const { error: closeError } = await supabase
      .from('support_conversations')
      .update({ status: 'closed' })
      .eq('id', selected.id);
    if (closeError) {
      setError(closeError.message);
    } else {
      await loadConversations();
    }
    setClosing(false);
  };

  return (
    <div className="space-y-4">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-3">
            <MessageCircle className="text-blue-600" />
            <div>
              <h1 className="text-2xl font-bold">Support prestataires</h1>
              <p className="text-sm text-muted-foreground">Consultez et répondez aux demandes.</p>
            </div>
          </div>
          <Button
            variant="outline"
            size="sm"
            onClick={loadConversations}
            disabled={loading}
            className="gap-2"
          >
            <RefreshCw className={`h-4 w-4 ${loading ? 'animate-spin' : ''}`} />
            Actualiser
          </Button>
        </div>

        {error && (
          <Alert variant="destructive">
            <AlertDescription>{error}</AlertDescription>
          </Alert>
        )}

        {loading ? (
          <div className="flex items-center gap-2 text-muted-foreground">
            <Loader2 className="h-4 w-4 animate-spin" /> Chargement du support...
          </div>
        ) : (
          <div className="grid grid-cols-1 lg:grid-cols-3 gap-4">
            <Card className="lg:col-span-1">
              <CardHeader>
                <CardTitle>Conversations</CardTitle>
                <CardDescription>Ouvertes et clôturées</CardDescription>
              </CardHeader>
              <CardContent className="space-y-3 max-h-[70vh] overflow-y-auto">
                {conversations.length === 0 && (
                  <p className="text-sm text-muted-foreground">Aucune conversation.</p>
                )}
                {conversations.map((conv) => (
                  <button
                    key={conv.id}
                    onClick={() => selectConversation(conv)}
                    className={`w-full text-left rounded border px-3 py-2 transition ${
                      selected?.id === conv.id ? 'border-primary bg-primary/5' : 'border-border hover:bg-muted'
                    }`}
                  >
                    <div className="flex items-center justify-between">
                      <div className="flex-1">
                        <p className="font-semibold text-sm">{conv.subject}</p>
                        <p className="text-xs text-muted-foreground mt-0.5">
                          {conv.provider_name || 'Prestataire inconnu'}
                        </p>
                      </div>
                      <Badge variant={conv.status === 'closed' ? 'secondary' : 'outline'}>{conv.status}</Badge>
                    </div>
                    <p className="text-xs text-muted-foreground mt-1">
                      {new Date(conv.updated_at).toLocaleString('fr-FR')}
                    </p>
                  </button>
                ))}
              </CardContent>
            </Card>

            <Card className="lg:col-span-2">
              <CardHeader>
                <CardTitle>Messages</CardTitle>
                <CardDescription>
                  {selected ? selected.subject : 'Sélectionnez une conversation pour répondre.'}
                </CardDescription>
              </CardHeader>
              <CardContent className="space-y-4">
                <div className="h-96 overflow-y-auto rounded border border-border p-3 bg-muted/40 space-y-3">
                  {!selected && <p className="text-sm text-muted-foreground">Aucune conversation sélectionnée.</p>}
                  {selected && messages.length === 0 && (
                    <p className="text-sm text-muted-foreground">Aucun message pour le moment.</p>
                  )}
                  {selected &&
                    messages.map((msg) => (
                      <div
                        key={msg.id}
                        className={`flex ${msg.sender_type === 'admin' ? 'justify-end' : 'justify-start'}`}
                      >
                        <div
                          className={`max-w-[75%] rounded-lg px-3 py-2 text-sm shadow-sm ${
                            msg.sender_type === 'admin'
                              ? 'bg-blue-600 text-white'
                              : 'bg-white border border-border'
                          }`}
                        >
                          <div className="text-xs opacity-80 mb-1">
                            {msg.sender_type === 'admin' ? 'Vous (admin)' : 'Prestataire'}
                          </div>
                          <div>{msg.message}</div>
                          <div className="mt-1 text-[11px] opacity-70">
                            {new Date(msg.created_at).toLocaleString('fr-FR')}
                          </div>
                        </div>
                      </div>
                    ))}
                </div>

                <div className="space-y-2">
                  <Textarea
                    placeholder={selected ? 'Réponse...' : 'Sélectionnez une conversation'}
                    value={reply}
                    onChange={(e) => setReply(e.target.value)}
                    rows={3}
                    disabled={!selected}
                  />
                  <div className="flex items-center gap-2">
                    <Button onClick={sendReply} disabled={!selected || sending || reply.trim().length === 0} className="gap-2">
                      {sending ? <Loader2 className="h-4 w-4 animate-spin" /> : <Send className="h-4 w-4" />}
                      Envoyer
                    </Button>
                    <Button
                      variant="outline"
                      onClick={closeConversation}
                      disabled={!selected || closing}
                      className="gap-2"
                    >
                      {closing ? <Loader2 className="h-4 w-4 animate-spin" /> : <XCircle className="h-4 w-4" />}
                      Clôturer
                    </Button>
                  </div>
                </div>
              </CardContent>
            </Card>
          </div>
        )}
      </div>
  );
}
