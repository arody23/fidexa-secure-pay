import { useState, useEffect, useCallback } from 'react';

import {

  XCircle,

  AlertTriangle,

  ThumbsUp,

} from 'lucide-react';

import { Button } from '@/components/ui/button';

import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';

import { Textarea } from '@/components/ui/textarea';

import { Input } from '@/components/ui/input';

import { Label } from '@/components/ui/label';

import {

  Dialog,

  DialogContent,

  DialogDescription,

  DialogHeader,

  DialogTitle,

  DialogTrigger,

} from '@/components/ui/dialog';

import { Alert, AlertDescription } from '@/components/ui/alert';

import { supabase } from '@/integrations/supabase/client';

import { useToast } from '@/hooks/use-toast';

import OrderStatusStepper from '@/components/OrderStatusStepper';

import { getAutoReleaseCountdown } from '@/lib/escrowConfig';

import { formatAmount } from '@/lib/currency';



interface OrderTrackerProps {

  linkId: string;

  orderStatus: string;

  canCancel: boolean;

  amount: number;

  currency?: string;

  autoReleaseAt?: string | null;

  paymentLink?: {

    created_at: string;

    paid_at?: string | null;

    started_at?: string | null;

    completed_at?: string | null;

    validated_at?: string | null;

    escrow_released_at?: string | null;

    is_paid?: boolean;

  };

  onStatusUpdate: () => void;

  onValidateDelivery?: () => Promise<boolean>;

}



interface TimelineEvent {

  id: string;

  status: string;

  action: string;

  description: string | null;

  created_at: string;

}



function buildSyntheticTimeline(

  paymentLink: OrderTrackerProps['paymentLink'],

  orderStatus: string

): TimelineEvent[] {

  if (!paymentLink) return [];



  const events: TimelineEvent[] = [];

  const push = (id: string, status: string, action: string, description: string, at?: string | null) => {

    if (!at) return;

    events.push({ id, status, action, description, created_at: at });

  };



  push('syn-created', 'pending', 'Commande créée', 'Lien de paiement généré', paymentLink.created_at);

  if (paymentLink.is_paid || paymentLink.paid_at) {

    push('syn-paid', 'paid', 'Paiement effectué', 'Fonds sécurisés en escrow', paymentLink.paid_at || paymentLink.created_at);

  }

  push('syn-started', 'started', 'Travail démarré', 'Le prestataire a commencé', paymentLink.started_at);

  push('syn-completed', 'completed', 'Travail terminé', 'En attente de validation client', paymentLink.completed_at);

  push(

    'syn-validated',

    'validated',

    'Commande validée',

    'Fonds libérés au prestataire',

    paymentLink.validated_at || paymentLink.escrow_released_at

  );



  if (events.length === 0 && orderStatus === 'validated') {

    events.push({

      id: 'syn-validated-fallback',

      status: 'validated',

      action: 'Commande validée',

      description: 'Fonds libérés au prestataire',

      created_at: new Date().toISOString(),

    });

  }



  return events.sort((a, b) => new Date(a.created_at).getTime() - new Date(b.created_at).getTime());

}



export default function OrderTracker({

  linkId,

  orderStatus,

  canCancel,

  amount,

  currency = 'FCFA',

  autoReleaseAt,

  paymentLink,

  onStatusUpdate,

  onValidateDelivery,

}: OrderTrackerProps) {

  const { toast } = useToast();

  const [timeline, setTimeline] = useState<TimelineEvent[]>([]);

  const [loading, setLoading] = useState(false);

  const [cancelReason, setCancelReason] = useState('');

  const [disputeReason, setDisputeReason] = useState('');

  const [disputeDescription, setDisputeDescription] = useState('');



  const loadTimeline = useCallback(async () => {

    let rows: TimelineEvent[] = [];



    try {

      const { data, error } = await supabase.rpc('get_order_timeline', {

        link_id_param: linkId,

      });

      if (!error && data?.length) {

        rows = (data as TimelineEvent[]).map((e) => ({

          ...e,

          description: e.description ?? null,

        }));

      }

    } catch {

      /* fallback below */

    }



    if (rows.length === 0) {

      const { data: plData } = await supabase

        .from('payment_links')

        .select('id, created_at, paid_at, started_at, completed_at, validated_at, escrow_released_at, is_paid')

        .eq('link_id', linkId)

        .single();



      if (plData) {

        const { data: dbTimeline } = await supabase

          .from('order_timeline')

          .select('*')

          .eq('payment_link_id', plData.id)

          .order('created_at', { ascending: true });



        if (dbTimeline?.length) {

          rows = dbTimeline as TimelineEvent[];

        } else {

          rows = buildSyntheticTimeline(

            {

              created_at: plData.created_at,

              paid_at: plData.paid_at,

              started_at: plData.started_at,

              completed_at: plData.completed_at,

              validated_at: plData.validated_at,

              escrow_released_at: plData.escrow_released_at,

              is_paid: plData.is_paid,

            },

            orderStatus

          );

        }

      }

    }



    if (rows.length === 0 && paymentLink) {

      rows = buildSyntheticTimeline(paymentLink, orderStatus);

    }



    setTimeline(rows);

  }, [linkId, orderStatus, paymentLink]);



  useEffect(() => {

    loadTimeline();

    supabase.rpc('process_auto_escrow_releases').then(() => onStatusUpdate());



    const channel = supabase

      .channel(`timeline-${linkId}`)

      .on(

        'postgres_changes',

        { event: '*', schema: 'public', table: 'payment_links' },

        (payload) => {

          if ((payload.new as { link_id?: string })?.link_id === linkId) {

            loadTimeline();

            onStatusUpdate();

          }

        }

      )

      .on(

        'postgres_changes',

        { event: 'INSERT', schema: 'public', table: 'order_timeline' },

        () => loadTimeline()

      )

      .subscribe();



    return () => {

      supabase.removeChannel(channel);

    };

  }, [linkId, loadTimeline, onStatusUpdate]);



  useEffect(() => {

    loadTimeline();

  }, [orderStatus, paymentLink?.validated_at, paymentLink?.completed_at, loadTimeline]);



  const handleValidate = async () => {

    try {

      setLoading(true);

      if (onValidateDelivery) {

        const ok = await onValidateDelivery();

        if (ok) {

          await loadTimeline();

          onStatusUpdate();

        }

        return;

      }



      const { data, error } = await supabase.rpc('validate_order', {

        link_id_param: linkId,

      });

      if (error) throw error;

      const result = typeof data === 'string' ? JSON.parse(data) : data;

      if (result.success) {

        toast({

          title: 'Commande validée',

          description: result.message,

        });

        onStatusUpdate();

        await loadTimeline();

      } else {

        throw new Error(result.error);

      }

    } catch (error) {
      const message =
        error instanceof Error
          ? error.message
          : typeof error === 'object' && error !== null && 'message' in error
            ? String((error as { message: unknown }).message)
            : 'Validation impossible';

      toast({

        title: 'Erreur',

        description: message,

        variant: 'destructive',

      });

    } finally {

      setLoading(false);

    }

  };



  const handleCancel = async () => {

    if (!cancelReason.trim()) return;

    try {

      setLoading(true);

      // Demande de remboursement (pas de refund auto) — admin + versions des deux parties
      const { data, error } = await supabase.rpc('request_cancel_refund', {

        link_id_param: linkId,

        reason_param: cancelReason,

        actor_role: 'client',

      });

      if (error) throw error;

      const result = typeof data === 'string' ? JSON.parse(data) : data;

      if (result.success) {

        toast({
          title: 'Demande envoyée',
          description:
            result.message ||
            'Le prestataire et FidexaPay examineront le dossier avant tout remboursement.',
        });

        onStatusUpdate();

        await loadTimeline();

      } else throw new Error(result.error);

    } catch (error) {

      toast({

        title: 'Erreur',

        description: error instanceof Error ? error.message : 'Annulation impossible',

        variant: 'destructive',

      });

    } finally {

      setLoading(false);

    }

  };



  const handleDispute = async () => {

    if (!disputeReason.trim() || !disputeDescription.trim()) return;

    try {

      setLoading(true);

      const { data, error } = await supabase.rpc('create_dispute', {

        link_id_param: linkId,

        reason_param: disputeReason,

        description_param: disputeDescription,

      });

      if (error) throw error;

      const result = typeof data === 'string' ? JSON.parse(data) : data;

      if (result.success) {

        toast({ title: 'Litige ouvert', description: result.message });

        onStatusUpdate();

      } else throw new Error(result.error);

    } catch (error) {

      toast({

        title: 'Erreur',

        description: error instanceof Error ? error.message : 'Litige impossible',

        variant: 'destructive',

      });

    } finally {

      setLoading(false);

    }

  };



  const countdown = orderStatus === 'completed' ? getAutoReleaseCountdown(autoReleaseAt) : null;



  return (

    <div className="space-y-6">

      <Card>

        <CardHeader>

          <CardTitle>Suivi de commande</CardTitle>

        </CardHeader>

        <CardContent>

          <OrderStatusStepper status={orderStatus} />

        </CardContent>

      </Card>



      {countdown && (

        <Alert>

          <AlertDescription>

            Sans action de votre part, les fonds seront libérés au prestataire automatiquement dans{' '}

            <strong>{countdown}</strong> (commission plateforme déduite selon le forfait du prestataire).

          </AlertDescription>

        </Alert>

      )}



      {orderStatus === 'completed' && (

        <Card className="border-primary/30 bg-primary/5">

          <CardContent className="pt-6 space-y-4">

            <p className="text-sm text-muted-foreground">

              Le prestataire a terminé. Validez pour libérer {formatAmount(amount, currency)} (commission déduite).

            </p>

            <Button onClick={handleValidate} disabled={loading} size="lg" className="w-full">

              <ThumbsUp className="mr-2 h-5 w-5" />

              Valider la livraison et libérer le paiement

            </Button>

          </CardContent>

        </Card>

      )}



      <div className="grid grid-cols-1 gap-3 md:grid-cols-2">

        {orderStatus !== 'validated' && orderStatus !== 'cancelled' && orderStatus !== 'disputed' && (

          <Dialog>

            <DialogTrigger asChild>

              <Button variant="destructive" disabled={!canCancel || loading} className="w-full">

                <XCircle className="mr-2 h-4 w-4" />

                {canCancel ? 'Annuler' : 'Annulation impossible'}

              </Button>

            </DialogTrigger>

            <DialogContent>

              <DialogHeader>

                <DialogTitle>Demander l&apos;annulation</DialogTitle>

                <DialogDescription>
                  Ceci ouvre une demande de remboursement. Vous et le prestataire devez chacun donner
                  votre version des faits ; FidexaPay applique ensuite la politique de remboursement
                  (aucun remboursement automatique).
                </DialogDescription>

              </DialogHeader>

              <Textarea

                value={cancelReason}

                onChange={(e) => setCancelReason(e.target.value)}

                placeholder="Raison..."

                rows={4}

              />

              <Button
                onClick={handleCancel}
                disabled={loading || cancelReason.trim().length < 10}
                variant="destructive"
              >
                Envoyer la demande
              </Button>

            </DialogContent>

          </Dialog>

        )}



        {orderStatus !== 'validated' && orderStatus !== 'cancelled' && orderStatus !== 'disputed' && (

          <Dialog>

            <DialogTrigger asChild>

              <Button variant="outline" className="w-full border-orange-300 text-orange-700">

                <AlertTriangle className="mr-2 h-4 w-4" />

                Signaler un litige

              </Button>

            </DialogTrigger>

            <DialogContent>

              <DialogHeader>

                <DialogTitle>Ouvrir un litige</DialogTitle>

                <DialogDescription>Un administrateur FidexaPay examinera votre dossier.</DialogDescription>

              </DialogHeader>

              <div className="space-y-3">

                <div>

                  <Label>Raison</Label>

                  <Input value={disputeReason} onChange={(e) => setDisputeReason(e.target.value)} />

                </div>

                <div>

                  <Label>Description</Label>

                  <Textarea

                    value={disputeDescription}

                    onChange={(e) => setDisputeDescription(e.target.value)}

                    rows={4}

                  />

                </div>

                <Button onClick={handleDispute} disabled={loading} className="w-full">

                  Soumettre le litige

                </Button>

              </div>

            </DialogContent>

          </Dialog>

        )}

      </div>



      <Card>

        <CardHeader>

          <CardTitle className="text-base">Historique</CardTitle>

        </CardHeader>

        <CardContent>

          {timeline.length === 0 ? (

            <p className="text-sm text-muted-foreground">Les étapes apparaîtront ici au fur et à mesure.</p>

          ) : (

            <ul className="space-y-3 border-l-2 border-border pl-4">

              {timeline.map((event) => (

                <li key={event.id} className="relative">

                  <span className="absolute -left-[21px] top-1.5 h-2.5 w-2.5 rounded-full bg-primary" />

                  <p className="font-medium text-sm">{event.action}</p>

                  {event.description && (

                    <p className="text-xs text-muted-foreground">{event.description}</p>

                  )}

                  <p className="text-[10px] text-muted-foreground mt-0.5">

                    {new Date(event.created_at).toLocaleString('fr-FR')}

                  </p>

                </li>

              ))}

            </ul>

          )}

        </CardContent>

      </Card>



      {['paid', 'started', 'completed'].includes(orderStatus) && (

        <Card className="bg-muted/40">

          <CardContent className="pt-4 text-sm">

            <p className="font-medium">Escrow actif</p>

            <p className="text-muted-foreground mt-1">

              {formatAmount(amount, currency)} sont sécurisés jusqu&apos;à votre validation ou libération automatique.

            </p>

          </CardContent>

        </Card>

      )}

    </div>

  );

}


