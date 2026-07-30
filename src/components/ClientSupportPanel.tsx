import { useRef, useState } from 'react';
import { Mic, MicOff, Paperclip, Send, Loader2, Headphones } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Textarea } from '@/components/ui/textarea';
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from '@/components/ui/dialog';
import { useToast } from '@/hooks/use-toast';
import { sendOrderSupport, uploadSupportAttachment } from '@/lib/orderSupport';

interface SupportMessage {
  id: string;
  sender_type: string;
  message?: string;
  content?: string;
  message_type?: string;
  attachment_url?: string;
  created_at: string;
}

interface Conversation {
  id: string;
  status: string;
  messages: SupportMessage[];
}

interface ClientSupportPanelProps {
  paymentLinkId: string;
  clientName?: string | null;
  clientPhone?: string | null;
  conversation: Conversation | null;
  onUpdate: () => Promise<void>;
}

export default function ClientSupportPanel({
  paymentLinkId,
  clientName,
  clientPhone,
  conversation,
  onUpdate,
}: ClientSupportPanelProps) {
  const { toast } = useToast();
  const [open, setOpen] = useState(false);
  const [message, setMessage] = useState('');
  const [sending, setSending] = useState(false);
  const [uploading, setUploading] = useState(false);
  const [recording, setRecording] = useState(false);
  const mediaRecorderRef = useRef<MediaRecorder | null>(null);
  const chunksRef = useRef<Blob[]>([]);
  const fileInputRef = useRef<HTMLInputElement>(null);

  const dispatchSupport = async (
    content: string,
    messageType = 'text',
    attachmentUrl: string | null = null
  ) => {
    await sendOrderSupport({
      paymentLinkId,
      clientName,
      clientPhone,
      conversationId: conversation?.id,
      content,
      messageType,
      attachmentUrl,
    });
    setMessage('');
    await onUpdate();
    toast({ title: 'Message envoyé', description: 'Notre équipe vous répondra rapidement.' });
  };

  const handleSendText = async () => {
    if (!message.trim()) return;
    setSending(true);
    try {
      await dispatchSupport(message);
    } catch (err) {
      toast({
        title: 'Erreur',
        description: err instanceof Error ? err.message : 'Envoi impossible',
        variant: 'destructive',
      });
    } finally {
      setSending(false);
    }
  };

  const handleFile = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;
    setUploading(true);
    try {
      const ext = file.name.split('.').pop() || 'bin';
      const url = await uploadSupportAttachment(paymentLinkId, file, ext, file.type);
      const type = file.type.startsWith('audio/')
        ? 'audio'
        : file.type.startsWith('image/')
          ? 'image'
          : 'file';
      await dispatchSupport(file.name, type, url);
    } catch (err) {
      toast({
        title: 'Erreur',
        description: err instanceof Error ? err.message : 'Upload impossible',
        variant: 'destructive',
      });
    } finally {
      setUploading(false);
      if (fileInputRef.current) fileInputRef.current.value = '';
    }
  };

  const startRecording = async () => {
    try {
      const stream = await navigator.mediaDevices.getUserMedia({ audio: true });
      const recorder = new MediaRecorder(stream);
      chunksRef.current = [];
      recorder.ondataavailable = (e) => {
        if (e.data.size > 0) chunksRef.current.push(e.data);
      };
      recorder.onstop = async () => {
        stream.getTracks().forEach((t) => t.stop());
        const blob = new Blob(chunksRef.current, { type: 'audio/webm' });
        setUploading(true);
        try {
          const url = await uploadSupportAttachment(paymentLinkId, blob, 'webm', 'audio/webm');
          await dispatchSupport('Message vocal', 'audio', url);
        } catch (err) {
          toast({
            title: 'Erreur',
            description: err instanceof Error ? err.message : 'Envoi vocal impossible',
            variant: 'destructive',
          });
        } finally {
          setUploading(false);
        }
      };
      mediaRecorderRef.current = recorder;
      recorder.start();
      setRecording(true);
    } catch {
      toast({
        title: 'Microphone',
        description: 'Autorisez le micro pour enregistrer un message vocal.',
        variant: 'destructive',
      });
    }
  };

  const stopRecording = () => {
    mediaRecorderRef.current?.stop();
    setRecording(false);
  };

  const messages = conversation?.messages ?? [];
  const busy = sending || uploading;

  return (
    <Dialog open={open} onOpenChange={setOpen}>
      <DialogTrigger asChild>
        <Button variant="outline" className="w-full gap-2">
          <Headphones className="h-4 w-4" />
          Contacter FidexaPay (support)
        </Button>
      </DialogTrigger>
      <DialogContent className="max-w-lg max-h-[90vh] flex flex-col">
        <DialogHeader>
          <DialogTitle>Support FidexaPay</DialogTitle>
          <DialogDescription>
            Contactez directement notre équipe. Joignez des preuves, un message vocal ou décrivez votre situation.
          </DialogDescription>
        </DialogHeader>

        <div className="flex-1 min-h-[280px] max-h-[360px] overflow-y-auto rounded-lg border bg-muted/30 p-3 space-y-3">
          {messages.length === 0 ? (
            <p className="text-sm text-muted-foreground text-center py-8">
              Décrivez votre demande. Un agent FidexaPay prendra en charge votre dossier.
            </p>
          ) : (
            messages.map((msg) => (
              <div
                key={msg.id}
                className={`flex ${msg.sender_type === 'client' ? 'justify-end' : 'justify-start'}`}
              >
                <div
                  className={`max-w-[85%] rounded-lg px-3 py-2 text-sm ${
                    msg.sender_type === 'client'
                      ? 'bg-primary text-primary-foreground'
                      : 'bg-background border'
                  }`}
                >
                  {msg.message_type === 'image' && msg.attachment_url && (
                    <img src={msg.attachment_url} alt="Preuve" className="mb-2 max-h-40 rounded" />
                  )}
                  {msg.message_type === 'audio' && msg.attachment_url && (
                    <audio controls src={msg.attachment_url} className="mb-2 w-full max-w-xs" />
                  )}
                  {msg.message_type === 'file' && msg.attachment_url && (
                    <a
                      href={msg.attachment_url}
                      target="_blank"
                      rel="noopener noreferrer"
                      className="underline mb-2 block"
                    >
                      Voir la pièce jointe
                    </a>
                  )}
                  <p>{msg.message || msg.content}</p>
                  <p className="text-[10px] opacity-70 mt-1">
                    {new Date(msg.created_at).toLocaleString('fr-FR')}
                  </p>
                </div>
              </div>
            ))
          )}
        </div>

        <div className="space-y-2 pt-2">
          <Textarea
            placeholder="Décrivez votre problème ou question..."
            value={message}
            onChange={(e) => setMessage(e.target.value)}
            rows={3}
            onKeyDown={(e) => {
              if (e.key === 'Enter' && !e.shiftKey) {
                e.preventDefault();
                handleSendText();
              }
            }}
          />
          <div className="flex flex-wrap gap-2">
            <input
              ref={fileInputRef}
              type="file"
              accept="image/*,audio/*,.pdf,.doc,.docx"
              className="hidden"
              onChange={handleFile}
            />
            <Button
              type="button"
              variant="outline"
              size="sm"
              disabled={busy}
              onClick={() => fileInputRef.current?.click()}
            >
              {uploading ? <Loader2 className="h-4 w-4 animate-spin" /> : <Paperclip className="h-4 w-4" />}
              <span className="ml-1 hidden sm:inline">Preuve</span>
            </Button>
            <Button
              type="button"
              variant="outline"
              size="sm"
              disabled={busy}
              onClick={recording ? stopRecording : startRecording}
            >
              {recording ? <MicOff className="h-4 w-4 text-destructive" /> : <Mic className="h-4 w-4" />}
              <span className="ml-1 hidden sm:inline">{recording ? 'Stop' : 'Vocal'}</span>
            </Button>
            <Button
              className="flex-1"
              disabled={busy || !message.trim()}
              onClick={handleSendText}
            >
              {sending ? <Loader2 className="h-4 w-4 animate-spin mr-2" /> : <Send className="h-4 w-4 mr-2" />}
              Envoyer
            </Button>
          </div>
        </div>
      </DialogContent>
    </Dialog>
  );
}
