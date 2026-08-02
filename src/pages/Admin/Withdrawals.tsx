import { useEffect, useMemo, useState } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Textarea } from '@/components/ui/textarea';
import { Label } from '@/components/ui/label';
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog';
import { Alert, AlertDescription } from '@/components/ui/alert';
import { Wallet, CheckCircle2, XCircle, Clock, Loader2 } from 'lucide-react';
import { useToast } from '@/hooks/use-toast';
import { supabase } from '@/integrations/supabase/client';
import { formatAmount } from '@/lib/currency';
import {
  adminProcessWithdrawal,
  approveAndPayWithdrawal,
  fetchAllWithdrawals,
  type WithdrawalRow,
} from '@/lib/withdrawalService';
import { WITHDRAWAL_POLICY } from '@/lib/withdrawalConfig';
import { KPAY_PAYOUT_ENABLED } from '@/config';

const STATUS_LABELS: Record<string, string> = {
  pending: 'En attente',
  processing: 'En cours',
  completed: 'Payé',
  failed: 'Refusé',
  cancelled: 'Annulé',
};

export default function AdminWithdrawals() {
  const { toast } = useToast();
  const [rows, setRows] = useState<WithdrawalRow[]>([]);
  const [loading, setLoading] = useState(true);
  const [loadError, setLoadError] = useState<string | null>(null);
  const [filter, setFilter] = useState('all');
  const [selected, setSelected] = useState<WithdrawalRow | null>(null);
  const [notes, setNotes] = useState('');
  const [rejectReason, setRejectReason] = useState('');
  const [actionLoading, setActionLoading] = useState(false);

  const load = async () => {
    try {
      setLoading(true);
      setLoadError(null);
      const data = await fetchAllWithdrawals(filter === 'all' ? undefined : filter);
      setRows(data);
    } catch (err) {
      const message = err instanceof Error ? err.message : 'Chargement impossible';
      setLoadError(message);
      setRows([]);
      toast({
        title: 'Erreur',
        description: message,
        variant: 'destructive',
      });
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    load();
    let channel: ReturnType<typeof supabase.channel> | null = null;
    try {
      channel = supabase
        .channel('admin-withdrawals')
        .on('postgres_changes', { event: '*', schema: 'public', table: 'withdrawals' }, () => load())
        .subscribe();
    } catch {
      // Realtime optionnel — la page reste utilisable sans abonnement
    }
    return () => {
      if (channel) supabase.removeChannel(channel);
    };
  }, [filter]);

  const stats = useMemo(() => ({
    pending: rows.filter((r) => r.status === 'pending').length,
    processing: rows.filter((r) => r.status === 'processing').length,
  }), [rows]);

  const runAction = async (action: 'approve' | 'complete' | 'reject' | 'approve_and_pay') => {
    if (!selected) return;
    if (action === 'reject' && !rejectReason.trim()) {
      toast({ title: 'Motif requis', variant: 'destructive' });
      return;
    }
    try {
      setActionLoading(true);
      if (action === 'approve_and_pay') {
        const result = await approveAndPayWithdrawal(selected.id);
        toast({
          title: 'Retrait validé via KPay',
          description:
            result.withdrawalStatus === 'completed'
              ? `Paiement confirmé (${result.reference}).`
              : `Payout ${result.reference} en cours — confirmation automatique via webhook.`,
        });
      } else {
        await adminProcessWithdrawal(
          selected.id,
          action,
          notes.trim() || undefined,
          action === 'reject' ? rejectReason.trim() : undefined
        );
        toast({
          title: 'Retrait mis à jour',
          description:
            action === 'approve'
              ? 'Statut « En cours » — le prestataire attend. Validez ensuite le retrait pour envoyer le Mobile Money.'
              : action === 'complete'
              ? 'Retrait marqué comme payé.'
              : 'Demande refusée.',
        });
      }
      setSelected(null);
      setNotes('');
      setRejectReason('');
      await load();
    } catch (err) {
      toast({
        title: 'Erreur',
        description: err instanceof Error ? err.message : 'Action échouée',
        variant: 'destructive',
      });
    } finally {
      setActionLoading(false);
    }
  };

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-3xl font-bold tracking-tight">Retraits prestataires</h1>
        <p className="mt-2 text-muted-foreground">
          Validez les demandes, effectuez le paiement hors plateforme (Mobile Money / banque), puis marquez comme payé.
        </p>
      </div>

      <div className="grid gap-4 md:grid-cols-3">
        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-sm font-medium text-muted-foreground">En attente</CardTitle>
          </CardHeader>
          <CardContent>
            <p className="text-3xl font-bold">{stats.pending}</p>
          </CardContent>
        </Card>
        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-sm font-medium text-muted-foreground">En cours</CardTitle>
          </CardHeader>
          <CardContent>
            <p className="text-3xl font-bold">{stats.processing}</p>
          </CardContent>
        </Card>
        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-sm font-medium text-muted-foreground">Délai cible</CardTitle>
          </CardHeader>
          <CardContent>
            <p className="text-lg font-semibold">
              {WITHDRAWAL_POLICY.processingHoursMin}–{WITHDRAWAL_POLICY.processingHoursMax}h
            </p>
          </CardContent>
        </Card>
      </div>

      <Alert>
        <Wallet className="h-4 w-4" />
        <AlertDescription>
          {KPAY_PAYOUT_ENABLED
            ? '1) Approuver → le prestataire voit « En cours ». 2) Valider le retrait → KPay envoie le Mobile Money. Virement bancaire : Approuver → payer hors plateforme → Marquer payé.'
            : 'Flux admin : 1) Approuver → 2) Payer manuellement sur le numéro/compte indiqué → 3) Marquer « Payé ».'}
        </AlertDescription>
      </Alert>

      {loadError && (
        <Alert variant="destructive">
          <AlertDescription>{loadError}</AlertDescription>
        </Alert>
      )}

      <div className="flex gap-2">
        {['pending', 'processing', 'completed', 'failed', 'all'].map((s) => (
          <Button
            key={s}
            variant={filter === s ? 'default' : 'outline'}
            size="sm"
            onClick={() => setFilter(s)}
          >
            {s === 'all' ? 'Tous' : STATUS_LABELS[s] || s}
          </Button>
        ))}
      </div>

      {loading ? (
        <div className="flex justify-center py-12">
          <Loader2 className="h-8 w-8 animate-spin text-primary" />
        </div>
      ) : rows.length === 0 ? (
        <Card>
          <CardContent className="py-12 text-center text-muted-foreground">Aucune demande</CardContent>
        </Card>
      ) : (
        <div className="space-y-3">
          {rows.map((row) => (
            <Card key={row.id} className="cursor-pointer hover:border-primary/40" onClick={() => setSelected(row)}>
              <CardContent className="flex flex-wrap items-center justify-between gap-4 pt-6">
                <div>
                  <p className="font-semibold">
                    {formatAmount(row.amount, row.currency)} — {row.users?.full_name || 'Prestataire'}
                  </p>
                  <p className="text-sm text-muted-foreground">
                    {row.method === 'mobile_money'
                      ? `${row.mobile_money_provider} · ${row.phone_number}`
                      : `Virement · ${(row.account_details as { bank_name?: string })?.bank_name || '—'}`}
                  </p>
                  <p className="text-xs text-muted-foreground">
                    {new Date(row.created_at).toLocaleString('fr-FR')}
                    {row.kpay_payout_reference && ` · KP: ${row.kpay_payout_reference}`}
                  </p>
                </div>
                <Badge
                  variant={
                    row.status === 'completed'
                      ? 'default'
                      : row.status === 'failed'
                      ? 'destructive'
                      : 'secondary'
                  }
                >
                  {STATUS_LABELS[row.status] || row.status}
                </Badge>
              </CardContent>
            </Card>
          ))}
        </div>
      )}

      <Dialog open={!!selected} onOpenChange={(o) => !o && setSelected(null)}>
        <DialogContent className="max-w-lg">
          <DialogHeader>
            <DialogTitle>Traiter le retrait</DialogTitle>
            <DialogDescription>
              {selected
                ? `${formatAmount(selected.amount, selected.currency)} — ${selected.users?.email ?? 'Prestataire'}`
                : ''}
            </DialogDescription>
          </DialogHeader>
          {selected && (
            <div className="space-y-4">
              <div className="rounded-lg bg-muted p-3 text-sm space-y-1">
                <p>
                  <strong>Méthode :</strong> {selected.method}
                </p>
                {selected.method === 'mobile_money' && (
                  <>
                    <p>
                      <strong>Opérateur :</strong> {selected.mobile_money_provider}
                    </p>
                    <p>
                      <strong>Téléphone :</strong> {selected.phone_number}
                    </p>
                  </>
                )}
                {selected.method === 'bank_transfer' && selected.account_details && (
                  <>
                    <p>
                      <strong>Banque :</strong>{' '}
                      {(selected.account_details as { bank_name?: string }).bank_name}
                    </p>
                    <p>
                      <strong>Compte :</strong>{' '}
                      {(selected.account_details as { account_number?: string }).account_number}
                    </p>
                    <p>
                      <strong>Titulaire :</strong>{' '}
                      {(selected.account_details as { account_holder?: string }).account_holder}
                    </p>
                  </>
                )}
                <p>
                  <strong>KYC :</strong> {selected.users?.kyc_status || '—'}
                </p>
                {selected.kpay_payout_reference && (
                  <p>
                    <strong>KPay :</strong> {selected.kpay_payout_reference}
                    {selected.kpay_payout_status ? ` (${selected.kpay_payout_status})` : ''}
                  </p>
                )}
              </div>

              <div>
                <Label>Notes internes (optionnel)</Label>
                <Textarea value={notes} onChange={(e) => setNotes(e.target.value)} rows={2} />
              </div>

              {(selected.status === 'pending' || selected.status === 'processing') && (
                <>
                  <div>
                    <Label>Motif de refus (si rejet)</Label>
                    <Input value={rejectReason} onChange={(e) => setRejectReason(e.target.value)} />
                  </div>
                  <div className="flex flex-wrap gap-2">
                    {selected.status === 'pending' && (
                      <Button
                        variant="default"
                        onClick={() => runAction('approve')}
                        disabled={actionLoading}
                      >
                        <Clock className="mr-2 h-4 w-4" />
                        Approuver (en cours)
                      </Button>
                    )}
                    {KPAY_PAYOUT_ENABLED &&
                      selected.method === 'mobile_money' &&
                      (selected.status === 'pending' || selected.status === 'processing') && (
                        <Button
                          onClick={() => runAction('approve_and_pay')}
                          disabled={actionLoading}
                          variant={selected.status === 'processing' ? 'default' : 'secondary'}
                        >
                          <CheckCircle2 className="mr-2 h-4 w-4" />
                          Valider le retrait (KPay)
                        </Button>
                      )}
                    <Button
                      variant="outline"
                      onClick={() => runAction('complete')}
                      disabled={actionLoading}
                    >
                      <CheckCircle2 className="mr-2 h-4 w-4" />
                      Marquer payé
                    </Button>
                    <Button variant="destructive" onClick={() => runAction('reject')} disabled={actionLoading}>
                      <XCircle className="mr-2 h-4 w-4" />
                      Refuser
                    </Button>
                  </div>
                </>
              )}
            </div>
          )}
        </DialogContent>
      </Dialog>
    </div>
  );
}
