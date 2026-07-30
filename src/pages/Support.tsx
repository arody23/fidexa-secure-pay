import { useEffect, useState } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Textarea } from '@/components/ui/textarea';
import { Badge } from '@/components/ui/badge';
import { Alert, AlertDescription } from '@/components/ui/alert';
import { MessageCircle, Send, Loader2, RefreshCw } from 'lucide-react';

interface Conversation {
  id: string;
  user_id: string;
  subject: string;
  status: string;
  created_at: string;
  updated_at: string;
}

interface SupportMessage {
  id: string;
  conversation_id: string;
  sender_type: 'user' | 'admin';
  sender_id: string | null;
  message: string;
  created_at: string;
}

export default function Support() {
  const [userId, setUserId] = useState<string | null>(null);
  const [conversation, setConversation] = useState<Conversation | null>(null);
  const [messages, setMessages] = useState<SupportMessage[]>([]);
  const [loading, setLoading] = useState(true);
  const [sending, setSending] = useState(false);
  const [creating, setCreating] = useState(false);
  const [subject, setSubject] = useState('');
  const [draft, setDraft] = useState('');
  const [error, setError] = useState('');

  useEffect(() => {
    loadData();

    // S'abonner aux changements de statut de conversation
    const channel = supabase
      .channel('support-changes')
      .on(
        'postgres_changes',
        {
          event: 'UPDATE',
          schema: 'public',
          table: 'support_conversations',
        },
        (payload) => {
          // Recharger les données quand une conversation est mise à jour (ex: clôturée par admin)
          loadData();
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
          // Recharger les messages quand un nouveau message arrive
          if (conversation && payload.new.conversation_id === conversation.id) {
            loadMessages(conversation.id);
          }
        }
      )
      .subscribe();

    return () => {
      supabase.removeChannel(channel);
    };
  }, [conversation?.id]);

  const loadData = async () => {
    try {
      setLoading(true);
      setError('');

      const { data: authData, error: authError } = await supabase.auth.getUser();
      if (authError || !authData?.user) {
        setError('Session expirée, merci de vous reconnecter.');
        return;
      }
      const uid = authData.user.id;
      setUserId(uid);

      // Charger d'abord les conversations ouvertes
      const { data: openConvData, error: openConvError } = await supabase
        .from('support_conversations')
        .select('*')
        .eq('user_id', uid)
        .eq('status', 'open')
        .order('created_at', { ascending: false })
        .limit(1)
        .maybeSingle();

      if (openConvError && openConvError.code !== 'PGRST116') {
        throw openConvError;
      }

      // Si aucune conversation ouverte, charger la dernière fermée pour afficher l'historique
      if (!openConvData) {
        const { data: closedConvData, error: closedConvError } = await supabase
          .from('support_conversations')
          .select('*')
          .eq('user_id', uid)
          .eq('status', 'closed')
          .order('created_at', { ascending: false })
          .limit(1)
          .maybeSingle();

        if (closedConvError && closedConvError.code !== 'PGRST116') {
          throw closedConvError;
        }

        if (closedConvData) {
          setConversation(closedConvData as Conversation);
          await loadMessages(closedConvData.id);
        }
      } else {
        setConversation(openConvData as Conversation);
        await loadMessages(openConvData.id);
      }
    } catch (err) {
      console.error(err);
      setError(err instanceof Error ? err.message : 'Impossible de charger le support.');
    } finally {
      setLoading(false);
    }
  };

  const loadMessages = async (conversationId: string) => {
    const { data, error: msgError } = await supabase
      .from('support_messages')
      .select('*')
      .eq('conversation_id', conversationId)
      .order('created_at', { ascending: true });

    if (msgError) {
      setError(msgError.message);
      return;
    }
    setMessages((data || []) as SupportMessage[]);
  };

  const createConversation = async () => {
    if (!userId) return;
    if (!subject.trim()) {
      setError('Indiquez un sujet.');
      return;
    }
    try {
      setCreating(true);
      setError('');
      const { data, error: insertError } = await supabase
        .from('support_conversations')
        .insert({ user_id: userId, subject: subject.trim() })
        .select('*')
        .single();
      if (insertError) throw insertError;
      setConversation(data as Conversation);
      setSubject('');
      await loadMessages(data.id);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Création impossible.');
    } finally {
      setCreating(false);
    }
  };

  const sendMessage = async () => {
    if (!conversation || !userId) return;
    if (!draft.trim()) return;
    try {
      setSending(true);
      setError('');
      const { error: sendError } = await supabase.from('support_messages').insert({
        conversation_id: conversation.id,
        sender_type: 'user',
        sender_id: userId,
        message: draft.trim(),
      });
      if (sendError) throw sendError;
      setDraft('');
      await loadMessages(conversation.id);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Envoi impossible.');
    } finally {
      setSending(false);
    }
  };

  return (
          <div className="max-w-4xl mx-auto space-y-6">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-3">
            <MessageCircle className="text-blue-600" />
            <div>
              <h1 className="text-2xl font-bold">Support client</h1>
              <p className="text-sm text-muted-foreground">Contactez l'équipe FidexaPay pour obtenir de l'aide.</p>
            </div>
          </div>
          {conversation && (
            <Button
              variant="outline"
              size="sm"
              onClick={loadData}
              disabled={loading}
              className="gap-2"
            >
              <RefreshCw className={`h-4 w-4 ${loading ? 'animate-spin' : ''}`} />
              Actualiser
            </Button>
          )}
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
          <>
            {(!conversation || conversation.status === 'closed') && (
              <Card>
                <CardHeader>
                  <CardTitle>Ouvrir une conversation</CardTitle>
                  <CardDescription>
                    {conversation?.status === 'closed' 
                      ? 'Votre dernière conversation a été clôturée. Vous pouvez en créer une nouvelle si vous avez besoin d\'aide.' 
                      : 'Expliquez votre problème, nous reviendrons vers vous rapidement.'}
                  </CardDescription>
                </CardHeader>
                <CardContent className="space-y-3">
                  <Input
                    placeholder="Sujet"
                    value={subject}
                    onChange={(e) => setSubject(e.target.value)}
                  />
                  <Button onClick={createConversation} disabled={creating}>
                    {creating && <Loader2 className="h-4 w-4 animate-spin mr-2" />}Créer une nouvelle conversation
                  </Button>
                </CardContent>
              </Card>
            )}

            {conversation && (
              <Card className="shadow-sm">
                <CardHeader className="flex flex-col gap-1">
                  <CardTitle className="flex items-center gap-2">
                    {conversation.subject}
                    <Badge variant={conversation.status === 'closed' ? 'destructive' : 'default'}>
                      {conversation.status === 'closed' ? 'Fermée' : 'Ouverte'}
                    </Badge>
                  </CardTitle>
                  <CardDescription>
                    Ouverte le {new Date(conversation.created_at).toLocaleString('fr-FR')}
                  </CardDescription>
                </CardHeader>
                <CardContent className="space-y-4">
                  <div className="h-80 overflow-y-auto rounded border border-border p-3 bg-muted/40 space-y-3">
                    {messages.length === 0 && (
                      <p className="text-sm text-muted-foreground">Aucun message pour le moment.</p>
                    )}
                    {messages.map((msg) => (
                      <div
                        key={msg.id}
                        className={`flex ${msg.sender_type === 'user' ? 'justify-end' : 'justify-start'}`}
                      >
                        <div
                          className={`max-w-[75%] rounded-lg px-3 py-2 text-sm shadow-sm ${
                            msg.sender_type === 'user'
                              ? 'bg-blue-600 text-white'
                              : 'bg-white border border-border'
                          }`}
                        >
                          <div className="text-xs opacity-80 mb-1">
                            {msg.sender_type === 'user' ? 'Vous' : 'Support FidexaPay'}
                          </div>
                          <div>{msg.message}</div>
                          <div className="mt-1 text-[11px] opacity-70">
                            {new Date(msg.created_at).toLocaleString('fr-FR')}
                          </div>
                        </div>
                      </div>
                    ))}
                  </div>

                  {conversation.status === 'open' ? (
                    <div className="space-y-2">
                      <Textarea
                        placeholder="Votre message..."
                        value={draft}
                        onChange={(e) => setDraft(e.target.value)}
                        rows={3}
                      />
                      <div className="flex justify-end">
                        <Button onClick={sendMessage} disabled={sending || draft.trim().length === 0} className="gap-2">
                          {sending ? <Loader2 className="h-4 w-4 animate-spin" /> : <Send className="h-4 w-4" />}
                          Envoyer
                        </Button>
                      </div>
                    </div>
                  ) : (
                    <Alert>
                      <AlertDescription>
                        Cette conversation a été clôturée par l'équipe support. Vous pouvez consulter l'historique ci-dessus. Pour un nouveau problème, créez une nouvelle conversation.
                      </AlertDescription>
                    </Alert>
                  )}
                </CardContent>
              </Card>
            )}
          </>
        )}
      </div>
      );
}
