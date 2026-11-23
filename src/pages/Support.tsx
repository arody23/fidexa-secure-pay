import { useEffect, useMemo, useRef, useState } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Textarea } from '@/components/ui/textarea';
import { Badge } from '@/components/ui/badge';
import { Alert, AlertDescription } from '@/components/ui/alert';
import { SITE } from '@/config/site';
import { openExternalUrl } from '@/lib/native';
import {
  Loader2,
  MessageCircle,
  Phone,
  RefreshCw,
  Send,
  Sparkles,
  Smartphone,
} from 'lucide-react';

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

const quickSubjects = [
  'Retrait ou solde',
  'Paiement client',
  'Litige / escrow',
  'KYC et vérification',
] as const;

function cleanPhone(phone: string) {
  return phone.replace(/[^\d+]/g, '');
}

function whatsappUrl() {
  const phone = cleanPhone(SITE.phone).replace(/^\+/, '');
  const text = encodeURIComponent('Bonjour FidexaPay, j’ai besoin d’aide avec mon compte prestataire.');
  return `https://wa.me/${phone}?text=${text}`;
}

function openCallDialer() {
  window.location.href = `tel:${cleanPhone(SITE.phone)}`;
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
  const messagesEndRef = useRef<HTMLDivElement | null>(null);

  useEffect(() => {
    void loadData();
  }, []);

  useEffect(() => {
    if (!conversation?.id) return;

    const channel = supabase
      .channel(`support-conversation-${conversation.id}`)
      .on(
        'postgres_changes',
        {
          event: 'UPDATE',
          schema: 'public',
          table: 'support_conversations',
          filter: `id=eq.${conversation.id}`,
        },
        () => void loadData({ keepWarm: true })
      )
      .on(
        'postgres_changes',
        {
          event: 'INSERT',
          schema: 'public',
          table: 'support_messages',
          filter: `conversation_id=eq.${conversation.id}`,
        },
        () => void loadMessages(conversation.id)
      )
      .subscribe();

    return () => {
      supabase.removeChannel(channel);
    };
  }, [conversation?.id]);

  useEffect(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth', block: 'end' });
  }, [messages.length]);

  const lastReply = useMemo(() => messages[messages.length - 1], [messages]);

  const loadData = async (options?: { keepWarm?: boolean }) => {
    try {
      if (!options?.keepWarm) setLoading(true);
      setError('');

      const { data: authData, error: authError } = await supabase.auth.getUser();
      if (authError || !authData?.user) {
        setError('Session expirée, merci de vous reconnecter.');
        return;
      }
      const uid = authData.user.id;
      setUserId(uid);

      const { data: openConvData, error: openConvError } = await supabase
        .from('support_conversations')
        .select('*')
        .eq('user_id', uid)
        .eq('status', 'open')
        .order('created_at', { ascending: false })
        .limit(1)
        .maybeSingle();

      if (openConvError && openConvError.code !== 'PGRST116') throw openConvError;

      const activeConversation = openConvData ?? (await loadLastClosedConversation(uid));
      setConversation((activeConversation as Conversation | null) ?? null);
      if (activeConversation) await loadMessages(activeConversation.id);
      else setMessages([]);
    } catch (err) {
      console.error(err);
      setError(err instanceof Error ? err.message : 'Impossible de charger le support.');
    } finally {
      setLoading(false);
    }
  };

  const loadLastClosedConversation = async (uid: string) => {
    const { data, error: closedConvError } = await supabase
      .from('support_conversations')
      .select('*')
      .eq('user_id', uid)
      .eq('status', 'closed')
      .order('created_at', { ascending: false })
      .limit(1)
      .maybeSingle();

    if (closedConvError && closedConvError.code !== 'PGRST116') throw closedConvError;
    return data;
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

  const createConversation = async (selectedSubject = subject) => {
    if (!userId) return;
    const normalizedSubject = selectedSubject.trim();
    if (!normalizedSubject) {
      setError('Indiquez un sujet.');
      return;
    }
    try {
      setCreating(true);
      setError('');
      const { data, error: insertError } = await supabase
        .from('support_conversations')
        .insert({ user_id: userId, subject: normalizedSubject })
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
    if (!conversation || !userId || !draft.trim()) return;
    try {
      setSending(true);
      setError('');
      const optimisticMessage: SupportMessage = {
        id: `pending-${Date.now()}`,
        conversation_id: conversation.id,
        sender_type: 'user',
        sender_id: userId,
        message: draft.trim(),
        created_at: new Date().toISOString(),
      };
      setMessages((current) => [...current, optimisticMessage]);
      setDraft('');

      const { error: sendError } = await supabase.from('support_messages').insert({
        conversation_id: conversation.id,
        sender_type: 'user',
        sender_id: userId,
        message: optimisticMessage.message,
      });
      if (sendError) throw sendError;
      await loadMessages(conversation.id);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Envoi impossible.');
      if (conversation) await loadMessages(conversation.id);
    } finally {
      setSending(false);
    }
  };

  return (
    <div className="mx-auto w-full max-w-3xl space-y-4 overflow-x-hidden">
      <div className="rounded-[1.75rem] bg-[#0b3b78] p-4 text-white shadow-[0_18px_42px_rgba(11,59,120,.18)] sm:p-5">
        <div className="flex items-start justify-between gap-4">
          <div>
            <p className="text-xs font-medium uppercase tracking-[0.18em] text-white/55">Assistance</p>
            <h1 className="mt-1 text-2xl font-semibold tracking-tight">Conversation support</h1>
            <p className="mt-2 max-w-xl text-sm leading-relaxed text-white/72">
              Écrivez au support FidexaPay, ou contactez-nous directement par WhatsApp ou appel.
            </p>
          </div>
          <span className="hidden h-12 w-12 shrink-0 items-center justify-center rounded-2xl bg-white/12 sm:flex">
            <MessageCircle className="h-6 w-6" />
          </span>
        </div>
        <div className="mt-4 grid gap-2 sm:grid-cols-3">
          <Button
            type="button"
            variant="secondary"
            className="h-11 justify-start gap-2 bg-white text-[#0b3b78] hover:bg-white/92"
            onClick={() => document.getElementById('support-composer')?.focus()}
          >
            <Send className="h-4 w-4" />
            Chat direct
          </Button>
          <Button
            type="button"
            variant="outline"
            className="h-11 justify-start gap-2 border-white/20 bg-white/10 text-white hover:bg-white/15 hover:text-white"
            onClick={() => openExternalUrl(whatsappUrl())}
          >
            <Smartphone className="h-4 w-4" />
            WhatsApp
          </Button>
          <button
            type="button"
            onClick={openCallDialer}
            className="inline-flex h-11 items-center justify-start gap-2 rounded-md border border-white/20 bg-white/10 px-4 text-sm font-medium text-white transition-colors hover:bg-white/15"
          >
            <Phone className="h-4 w-4" />
            Appeler
          </button>
        </div>
      </div>

      {error && (
        <Alert variant="destructive">
          <AlertDescription>{error}</AlertDescription>
        </Alert>
      )}

      <div className="overflow-hidden rounded-[1.5rem] border border-[#dbe6f2] bg-white shadow-[0_1px_2px_rgba(11,59,120,0.04)]">
        <div className="flex flex-wrap items-center justify-between gap-3 border-b border-[#eef3f9] px-4 py-3">
          <div className="min-w-0">
            <p className="text-sm font-semibold text-[#0b2f63]">
              {conversation ? conversation.subject : 'Nouvelle conversation'}
            </p>
            <p className="mt-0.5 text-xs text-[#8a9bb0]">
              {lastReply
                ? `Dernier message ${new Date(lastReply.created_at).toLocaleString('fr-FR')}`
                : 'Réponse généralement rapide en heures ouvrées.'}
            </p>
          </div>
          <div className="flex items-center gap-2">
            {conversation && (
              <Badge variant={conversation.status === 'closed' ? 'destructive' : 'default'}>
                {conversation.status === 'closed' ? 'Fermée' : 'Ouverte'}
              </Badge>
            )}
            <Button variant="outline" size="sm" onClick={() => loadData()} disabled={loading}>
              <RefreshCw className={`mr-1.5 h-3.5 w-3.5 ${loading ? 'animate-spin' : ''}`} />
              Actualiser
            </Button>
          </div>
        </div>

        {loading && messages.length === 0 ? (
          <div className="space-y-3 p-4">
            <div className="h-16 w-4/5 animate-pulse rounded-2xl bg-[#eef3f9]" />
            <div className="ml-auto h-16 w-3/4 animate-pulse rounded-2xl bg-[#dbe6f2]" />
            <div className="h-14 w-2/3 animate-pulse rounded-2xl bg-[#eef3f9]" />
          </div>
        ) : (
          <>
            {(!conversation || conversation.status === 'closed') && (
              <div className="border-b border-[#eef3f9] bg-[#f8fbff] p-4">
                <div className="flex items-center gap-2 text-sm font-semibold text-[#0b2f63]">
                  <Sparkles className="h-4 w-4 text-[#0b3b78]" />
                  Démarrer avec un sujet
                </div>
                <div className="mt-3 flex flex-wrap gap-2">
                  {quickSubjects.map((item) => (
                    <Button
                      key={item}
                      type="button"
                      variant="outline"
                      size="sm"
                      disabled={creating}
                      onClick={() => createConversation(item)}
                    >
                      {item}
                    </Button>
                  ))}
                </div>
                <div className="mt-3 flex gap-2">
                  <Input
                    placeholder="Autre sujet"
                    value={subject}
                    onChange={(event) => setSubject(event.target.value)}
                    className="h-11"
                  />
                  <Button
                    onClick={() => createConversation()}
                    disabled={creating}
                    className="h-11 bg-[#0b3b78] hover:bg-[#0a3266]"
                  >
                    {creating ? <Loader2 className="h-4 w-4 animate-spin" /> : 'Créer'}
                  </Button>
                </div>
              </div>
            )}

            <div className="max-h-[58vh] min-h-[22rem] space-y-3 overflow-y-auto bg-[#f7fafd] px-4 py-4">
              {messages.length === 0 && (
                <div className="mx-auto flex max-w-sm flex-col items-center justify-center py-12 text-center">
                  <MessageCircle className="h-9 w-9 text-[#9aabbd]" />
                  <p className="mt-3 text-sm font-semibold text-[#0b2f63]">Aucun message pour le moment</p>
                  <p className="mt-1 text-xs leading-relaxed text-[#7a8fa6]">
                    Créez une conversation ou choisissez WhatsApp pour un contact externe.
                  </p>
                </div>
              )}
              {messages.map((message) => {
                const isUser = message.sender_type === 'user';
                return (
                  <div key={message.id} className={`flex ${isUser ? 'justify-end' : 'justify-start'}`}>
                    <div
                      className={`max-w-[84%] rounded-[1.15rem] px-3.5 py-2.5 text-sm leading-relaxed shadow-sm ${
                        isUser
                          ? 'rounded-br-md bg-[#0b3b78] text-white'
                          : 'rounded-bl-md bg-white text-[#0b2f63]'
                      }`}
                    >
                      <p className={`text-[10px] ${isUser ? 'text-white/65' : 'text-[#8a9bb0]'}`}>
                        {isUser ? 'Vous' : 'Support FidexaPay'} ·{' '}
                        {new Date(message.created_at).toLocaleTimeString('fr-FR', {
                          hour: '2-digit',
                          minute: '2-digit',
                        })}
                      </p>
                      <p className="mt-1 whitespace-pre-wrap">{message.message}</p>
                    </div>
                  </div>
                );
              })}
              <div ref={messagesEndRef} />
            </div>

            {conversation?.status === 'open' ? (
              <div className="border-t border-[#eef3f9] bg-white p-3 pb-[max(0.75rem,var(--safe-bottom))]">
                <Textarea
                  id="support-composer"
                  placeholder="Écrire un message au support…"
                  value={draft}
                  onChange={(event) => setDraft(event.target.value)}
                  rows={2}
                  className="max-h-32 resize-none rounded-2xl"
                  onKeyDown={(event) => {
                    if (event.key === 'Enter' && !event.shiftKey) {
                      event.preventDefault();
                      void sendMessage();
                    }
                  }}
                />
                <div className="mt-2 flex items-center justify-between gap-3">
                  <p className="text-xs text-[#8a9bb0]">Entrée pour envoyer, Maj+Entrée pour une ligne.</p>
                  <Button
                    onClick={sendMessage}
                    disabled={sending || draft.trim().length === 0}
                    className="h-10 gap-2 bg-[#0b3b78] hover:bg-[#0a3266]"
                  >
                    {sending ? <Loader2 className="h-4 w-4 animate-spin" /> : <Send className="h-4 w-4" />}
                    Envoyer
                  </Button>
                </div>
              </div>
            ) : conversation ? (
              <div className="border-t border-[#eef3f9] bg-white px-4 py-3 text-sm text-[#7a8fa6]">
                Cette conversation est clôturée. Créez un nouveau sujet pour relancer le support.
              </div>
            ) : null}
          </>
        )}
      </div>
    </div>
  );
}