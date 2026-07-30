import { supabase } from '@/integrations/supabase/client';

export async function uploadSupportAttachment(
  paymentLinkId: string,
  file: Blob,
  ext: string,
  mimeType?: string
): Promise<string> {
  const safeExt = ext.replace(/[^a-z0-9]/gi, '') || 'bin';
  const fileName = `support/${paymentLinkId}/${Date.now()}.${safeExt}`;
  const contentType =
    mimeType ||
    (file.type && file.type !== 'application/octet-stream' ? file.type : undefined) ||
    guessMimeType(safeExt);

  const { error } = await supabase.storage
    .from('support-attachments')
    .upload(fileName, file, {
      upsert: false,
      contentType,
    });

  if (error) {
    const msg = error.message.toLowerCase();
    if (msg.includes('bucket') || msg.includes('not found')) {
      throw new Error('Le stockage des pièces jointes n\'est pas encore configuré.');
    }
    if (msg.includes('mime') || msg.includes('type')) {
      throw new Error('Type de fichier non autorisé. Utilisez une image (JPG, PNG) ou un PDF.');
    }
    throw new Error(`Upload impossible : ${error.message}`);
  }

  const { data } = supabase.storage.from('support-attachments').getPublicUrl(fileName);
  return data.publicUrl;
}

function guessMimeType(ext: string): string {
  const map: Record<string, string> = {
    jpg: 'image/jpeg',
    jpeg: 'image/jpeg',
    png: 'image/png',
    gif: 'image/gif',
    webp: 'image/webp',
    pdf: 'application/pdf',
    mp3: 'audio/mpeg',
    ogg: 'audio/ogg',
    wav: 'audio/wav',
    webm: 'audio/webm',
  };
  return map[ext.toLowerCase()] || 'application/octet-stream';
}

export async function sendOrderSupport(params: {
  paymentLinkId: string;
  clientName?: string | null;
  clientPhone?: string | null;
  conversationId?: string | null;
  content: string;
  messageType?: string;
  attachmentUrl?: string | null;
}) {
  const messageType = params.messageType || 'text';
  const content =
    params.content.trim() ||
    (messageType === 'audio'
      ? 'Message vocal'
      : params.attachmentUrl
        ? 'Pièce jointe'
        : '');

  if (!content && !params.attachmentUrl) {
    throw new Error('Message vide');
  }

  if (params.conversationId) {
    const { data, error } = await supabase.rpc('send_order_support_message', {
      conversation_id_param: params.conversationId,
      content_param: content,
      message_type_param: messageType,
      attachment_url_param: params.attachmentUrl ?? null,
    });
    if (error) throw rpcError(error);
    const result = typeof data === 'string' ? JSON.parse(data) : data;
    if (!result?.success) throw new Error(result?.error || 'Erreur envoi');
    return result;
  }

  const { data, error } = await supabase.rpc('create_order_support', {
    payment_link_id_param: params.paymentLinkId,
    client_name_param: params.clientName || 'Client',
    client_phone_param: params.clientPhone || '',
    initial_message_param: content,
    message_type_param: messageType,
    attachment_url_param: params.attachmentUrl ?? null,
  });
  if (error) throw rpcError(error);
  const result = typeof data === 'string' ? JSON.parse(data) : data;
  if (!result?.success) throw new Error(result?.error || 'Erreur création');
  return result;
}

function rpcError(error: { message: string; code?: string }) {
  if (
    error.message.includes('Could not find the function') ||
    error.code === 'PGRST202'
  ) {
    return new Error(
      'Le support commande n\'est pas encore activé sur le serveur. Contactez FidexaPay.'
    );
  }
  return new Error(error.message);
}
