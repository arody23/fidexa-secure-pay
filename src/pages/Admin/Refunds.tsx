import { useCallback, useEffect, useState } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Textarea } from '@/components/ui/textarea';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { RefreshCw, Scale } from 'lucide-react';
import { useToast } from '@/hooks/use-toast';
import { supabase } from '@/integrations/supabase/client';
import { formatAmount } from '@/lib/currency';

interface RefundRequest {
  id: string;
  link_id: string;
  payment_link_id: string;
  status: string;
  client_statement: string | null;
  provider_statement: string | null;
  admin_decision: string | null;
  created_at: string;
  payment_links?: {
    amount: number;
    currency: string | null;
    client_name: string | null;
    provider_name: string | null;
    order_status: string | null;
  } | null;
}

function parseRpc(data: unknown): { success?: boolean; error?: string } {
  if (!data) return { success: false, error: 'Réponse vide' };
  if (typeof data === 'string') {
    try {
      return JSON.parse(data);
    } catch {
      return { success: false, error: 'Réponse invalide' };
    }
  }
  return data as { success?: boolean; error?: string };
}

export default function AdminRefunds() {
  const { toast } = useToast();
  const [rows, setRows] = useState<RefundRequest[]>([]);
  const [loading, setLoading] = useState(true);
  const [notes, setNotes] = useState<Record<string, string>>({});
  const [settlements, setSettlements] = useState<Record<string, {
    amount: string; providerCredit: string; phone: string; provider: string; country: string;
  }>>({});
  const [acting, setActing] = useState<string | null>(null);

  const load = useCallback(async () => {
    setLoading(true);
    const { data, error } = await supabase
      .from('refund_requests' as never)
      .select(
        `
        id, link_id, payment_link_id, status, client_statement, provider_statement,
        admin_decision, created_at,
        payment_links ( amount, currency, client_name, provider_name, order_status )
      `
      )
      .order('created_at', { ascending: false });

    if (error) {
      toast({
        title: 'Erreur',
        description: error.message,
        variant: 'destructive',
      });
      setRows([]);
    } else {
      setRows((data as unknown as RefundRequest[]) || []);
    }
    setLoading(false);
  }, [toast]);

  useEffect(() => {
    void load();
  }, [load]);

  const decide = async (id: string, decision: 'approved' | 'rejected') => {
    try {
      setActing(id);
      const { data, error } = await supabase.rpc('decide_refund_request' as never, {
        request_id_param: id,
        decision_param: decision,
        admin_note_param: notes[id]?.trim() || null,
      } as never);
      if (error) throw error;
      const result = parseRpc(data);
      if (!result.success) throw new Error(result.error || 'Décision refusée');
      toast({
        title: decision === 'approved' ? 'Remboursement approuvé' : 'Demande rejetée',
        description:
          decision === 'approved'
            ? 'Marqué remboursé côté FidexaPay — exécutez le remboursement PSP manuellement selon la politique.'
            : 'La commande est rétablie en statut payé.',
      });
      await load();
    } catch (err) {
      toast({
        title: 'Erreur',
        description: err instanceof Error ? err.message : 'Impossible de décider',
        variant: 'destructive',
      });
    } finally {
      setActing(null);
    }
  };

  const field = (id: string) => settlements[id] ?? {
    amount: '', providerCredit: '0', phone: '', provider: 'Airtel', country: 'CD',
  };
  const setField = (id: string, patch: Partial<ReturnType<typeof field>>) =>
    setSettlements((prev) => ({ ...prev, [id]: { ...field(id), ...patch } }));

  const payRefund = async (row: RefundRequest) => {
    const values = field(row.id);
    try {
      setActing(row.id);
      const { data, error } = await supabase.functions.invoke('kpay-settle-refund', {
        body: {
          refundRequestId: row.id,
          clientAmount: Number(values.amount),
          providerCreditAmount: Number(values.providerCredit || 0),
          clientPhone: values.phone,
          clientProvider: values.provider,
          clientCountry: values.country,
          adminNote: notes[row.id]?.trim() || undefined,
        },
      });
      if (error) throw error;
      if (!data?.success) throw new Error(data?.error || 'Paiement de remboursement refusé');
      toast({
        title: 'Remboursement envoyé à KPay',
        description: 'Le statut final sera confirmé automatiquement par le webhook KPay.',
      });
      await load();
    } catch (err) {
      toast({
        title: 'Remboursement non envoyé',
        description: err instanceof Error ? err.message : 'Erreur inconnue',
        variant: 'destructive',
      });
    } finally {
      setActing(null);
    }
  };

  const open = rows.filter((r) =>
    ['pending', 'awaiting_provider', 'awaiting_client', 'under_review', 'approved'].includes(r.status)
  );

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between gap-3">
        <div>
          <h1 className="text-2xl font-semibold">Remboursements</h1>
          <p className="text-sm text-muted-foreground">
            Demandes d’annulation avant démarrage — versions client / prestataire + décision admin
          </p>
        </div>
        <Button variant="outline" size="sm" onClick={() => void load()} disabled={loading}>
          <RefreshCw className={`mr-2 h-4 w-4 ${loading ? 'animate-spin' : ''}`} />
          Actualiser
        </Button>
      </div>

      {loading ? (
        <div className="flex min-h-[30vh] items-center justify-center">
          <div className="h-8 w-8 animate-spin rounded-full border-2 border-primary border-t-transparent" />
        </div>
      ) : open.length === 0 ? (
        <Card>
          <CardContent className="py-10 text-center text-muted-foreground">
            Aucune demande ouverte
          </CardContent>
        </Card>
      ) : (
        <div className="space-y-4">
          {open.map((row) => (
            <Card key={row.id}>
              <CardHeader>
                <CardTitle className="flex flex-wrap items-center gap-2 text-base">
                  <Scale className="h-4 w-4" />
                  {row.link_id}
                  <Badge variant="secondary">{row.status}</Badge>
                  {row.payment_links && (
                    <span className="text-sm font-normal text-muted-foreground">
                      {formatAmount(
                        row.payment_links.amount,
                        row.payment_links.currency || 'USD'
                      )}{' '}
                      — {row.payment_links.client_name || 'Client'} /{' '}
                      {row.payment_links.provider_name || 'Prestataire'}
                    </span>
                  )}
                </CardTitle>
              </CardHeader>
              <CardContent className="space-y-4">
                <div className="grid gap-3 md:grid-cols-2">
                  <div className="rounded-lg border p-3 text-sm">
                    <p className="mb-1 text-xs font-medium text-muted-foreground">Version client</p>
                    <p className="whitespace-pre-wrap">{row.client_statement || '—'}</p>
                  </div>
                  <div className="rounded-lg border p-3 text-sm">
                    <p className="mb-1 text-xs font-medium text-muted-foreground">
                      Version prestataire
                    </p>
                    <p className="whitespace-pre-wrap">{row.provider_statement || 'En attente…'}</p>
                  </div>
                </div>
                <div>
                  <Label htmlFor={`note-${row.id}`}>Note admin (politique)</Label>
                  <Textarea
                    id={`note-${row.id}`}
                    className="mt-1"
                    rows={2}
                    value={notes[row.id] || ''}
                    onChange={(e) => setNotes((prev) => ({ ...prev, [row.id]: e.target.value }))}
                    placeholder="Motif de la décision selon la politique de remboursement…"
                  />
                </div>
                {row.status !== 'approved' ? (
                  <div className="flex flex-wrap gap-2">
                    <Button onClick={() => void decide(row.id, 'approved')} disabled={acting === row.id}>
                      Approuver et préparer le règlement
                    </Button>
                    <Button variant="outline" onClick={() => void decide(row.id, 'rejected')} disabled={acting === row.id}>
                      Rejeter (reprendre commande)
                    </Button>
                  </div>
                ) : (
                  <div className="space-y-3 rounded-lg border border-primary/30 bg-primary/5 p-4">
                    <p className="text-sm font-medium">Règlement validé par l’admin</p>
                    <p className="text-xs text-muted-foreground">
                      Saisissez le montant réel à envoyer au client. Le crédit prestataire est optionnel et
                      ne lui est attribué qu’après confirmation KPay. Le total ne peut pas dépasser 85% de la commande.
                    </p>
                    <div className="grid gap-3 md:grid-cols-2">
                      <div>
                        <Label>Montant client ({row.payment_links?.currency || 'devise commande'})</Label>
                        <Input type="number" min="1" value={field(row.id).amount}
                          onChange={(e) => setField(row.id, { amount: e.target.value })} />
                      </div>
                      <div>
                        <Label>Crédit prestataire (optionnel)</Label>
                        <Input type="number" min="0" value={field(row.id).providerCredit}
                          onChange={(e) => setField(row.id, { providerCredit: e.target.value })} />
                      </div>
                      <div>
                        <Label>Numéro Mobile Money du client</Label>
                        <Input placeholder="+243…" value={field(row.id).phone}
                          onChange={(e) => setField(row.id, { phone: e.target.value })} />
                      </div>
                      <div>
                        <Label>Opérateur</Label>
                        <select className="h-10 w-full rounded-md border border-input bg-background px-3 text-sm"
                          value={field(row.id).provider} onChange={(e) => setField(row.id, { provider: e.target.value })}>
                          <option>Airtel</option><option>Orange</option><option>Vodacom M-Pesa</option>
                        </select>
                      </div>
                    </div>
                    <Button onClick={() => void payRefund(row)} disabled={acting === row.id}>
                      Envoyer le remboursement client via KPay
                    </Button>
                  </div>
                )}
              </CardContent>
            </Card>
          ))}
        </div>
      )}

      {rows.filter((r) => ['completed', 'failed', 'rejected'].includes(r.status)).length > 0 && (
        <Card>
          <CardHeader>
            <CardTitle className="text-base">Historique récent</CardTitle>
          </CardHeader>
          <CardContent className="space-y-2 text-sm">
            {rows
              .filter((r) => ['completed', 'failed', 'rejected'].includes(r.status))
              .slice(0, 20)
              .map((r) => (
                <div key={r.id} className="flex flex-wrap items-center gap-2 border-b py-2 last:border-0">
                  <Badge variant={r.status === 'approved' ? 'default' : 'secondary'}>{r.status}</Badge>
                  <span>{r.link_id}</span>
                  <span className="text-muted-foreground">{r.admin_decision || ''}</span>
                </div>
              ))}
          </CardContent>
        </Card>
      )}
    </div>
  );
}
