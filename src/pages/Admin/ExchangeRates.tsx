import { useEffect, useMemo, useState } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { useToast } from '@/hooks/use-toast';
import { supabase } from '@/integrations/supabase/client';
import { RefreshCw, TrendingUp } from 'lucide-react';

interface RateRow {
  currency: string;
  units_per_usd: number;
  updated_at: string;
}

export default function AdminExchangeRates() {
  const { toast } = useToast();
  const [rows, setRows] = useState<RateRow[]>([]);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [edits, setEdits] = useState<Record<string, string>>({});

  const load = async () => {
    setLoading(true);
    const { data, error } = await supabase.from('exchange_rates').select('*').order('currency');
    if (error) {
      toast({ title: 'Erreur', description: error.message, variant: 'destructive' });
      setRows([]);
    } else {
      setRows((data as unknown as RateRow[]) || []);
    }
    setLoading(false);
  };

  useEffect(() => {
    void load();
  }, []);

  const displayRows = useMemo(() => {
    const base = [
      { currency: 'USD', label: 'USD — Dollar américain (toujours 1)' },
      { currency: 'EUR', label: 'EUR — Euro' },
      { currency: 'GBP', label: 'GBP — Livre sterling' },
      { currency: 'XOF', label: 'XOF — Franc CFA WAEMU' },
      { currency: 'XAF', label: 'XAF — Franc CFA BEAC' },
      { currency: 'FCFA', label: 'FCFA — Franc CFA (générique)' },
      { currency: 'CDF', label: 'CDF — Franc congolais' },
    ];

    return base.map((b) => {
      const db = rows.find((r) => r.currency === b.currency);
      return {
        ...b,
        value: db?.units_per_usd ?? 1,
        updated_at: db?.updated_at,
      };
    });
  }, [rows]);

  const handleSave = async () => {
    const updates = Object.entries(edits)
      .map(([currency, value]) => {
        const num = parseFloat(value.replace(',', '.'));
        return { currency, units_per_usd: num };
      })
      .filter((u) => Number.isFinite(u.units_per_usd) && u.units_per_usd > 0);

    if (updates.length === 0) {
      toast({ title: 'Aucun changement', description: 'Modifiez au moins un taux.' });
      return;
    }

    try {
      setSaving(true);
      const { error } = await supabase.from('exchange_rates').upsert(
        updates as never,
        { onConflict: 'currency' }
      );
      if (error) throw error;

      toast({ title: 'Taux mis à jour', description: 'Les conversions FidexaPay utilisent maintenant ces valeurs.' });
      setEdits({});
      await load();
    } catch (err) {
      toast({
        title: 'Erreur',
        description: err instanceof Error ? err.message : 'Sauvegarde impossible',
        variant: 'destructive',
      });
    } finally {
      setSaving(false);
    }
  };

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between gap-3">
        <div>
          <h1 className="text-2xl font-semibold">Taux de change</h1>
          <p className="text-sm text-muted-foreground">
            Gérez les taux FidexaPay (unités de devise pour 1 USD). Ex. 1 USD = 2294 CDF = 600 XOF.
          </p>
        </div>
        <Button variant="outline" size="sm" onClick={() => void load()} disabled={loading}>
          <RefreshCw className={`mr-2 h-4 w-4 ${loading ? 'animate-spin' : ''}`} />
          Actualiser
        </Button>
      </div>

      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2 text-base">
            <TrendingUp className="h-4 w-4" />
            Taux actuels
          </CardTitle>
        </CardHeader>
        <CardContent className="space-y-4">
          {loading ? (
            <div className="flex h-32 items-center justify-center">
              <div className="h-8 w-8 animate-spin rounded-full border-2 border-primary border-t-transparent" />
            </div>
          ) : (
            <>
              <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
                {displayRows.map((row) => (
                  <div key={row.currency} className="space-y-1.5">
                    <Label htmlFor={`rate-${row.currency}`}>{row.label}</Label>
                    <Input
                      id={`rate-${row.currency}`}
                      type="number"
                      step="0.01"
                      disabled={row.currency === 'USD'}
                      value={
                        edits[row.currency] ??
                        (Number.isFinite(row.value) ? row.value.toString() : '')
                      }
                      onChange={(e) =>
                        setEdits((prev) => ({ ...prev, [row.currency]: e.target.value }))
                      }
                      placeholder="Ex. 2294"
                    />
                    {row.updated_at && (
                      <p className="text-xs text-muted-foreground">
                        Dernière mise à jour : {new Date(row.updated_at).toLocaleString('fr-FR')}
                      </p>
                    )}
                  </div>
                ))}
              </div>
              <div className="flex justify-end">
                <Button onClick={() => void handleSave()} disabled={saving || loading}>
                  {saving ? 'Sauvegarde…' : 'Enregistrer les taux'}
                </Button>
              </div>
            </>
          )}
        </CardContent>
      </Card>
    </div>
  );
}
