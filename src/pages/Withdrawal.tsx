import { useState, useEffect } from 'react';
import { Link } from 'react-router-dom';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Alert, AlertDescription } from '@/components/ui/alert';
import { AlertCircle, ArrowRight } from 'lucide-react';
import type { UserProfile } from '@/types/index';
import { loadUserProfile } from '@/lib/userService';
import { COUNTRIES_DATA, getCurrencyByCountry, getMobileMoneyProviders } from '@/lib/countriesData';
import { useProvider } from '@/contexts/ProviderContext';
import { formatAmount as formatCurrencyAmount, normalizeCurrency } from '@/lib/currency';
import {
  fetchProviderWallet,
  fetchMyWithdrawals,
  submitWithdrawalRequest,
  cancelWithdrawal,
  type WithdrawalRow,
} from '@/lib/withdrawalService';
import {
  getMinWithdrawalAmount,
  getMaxWithdrawalAmount,
  validateWithdrawalAmount,
} from '@/lib/withdrawalConfig';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import { ProviderNetworkIcon } from '@/components/brand/ProviderNetworkIcon';

interface WalletState {
  available_balance: number;
  total_earned: number;
  total_withdrawn: number;
  pending_withdrawals: number;
  currency: string;
}

export function Withdrawal() {
  const { currency: providerCurrency } = useProvider();
  const [profile, setProfile] = useState<UserProfile | null>(null);
  const [wallet, setWallet] = useState<WalletState | null>(null);
  const [loading, setLoading] = useState(true);
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState('');
  const [success, setSuccess] = useState('');
  const [withdrawals, setWithdrawals] = useState<WithdrawalRow[]>([]);

  const [formData, setFormData] = useState({
    amount: '',
    mobile_money_provider: '',
    phone_number: '',
  });

  useEffect(() => {
    loadProfile();
  }, []);

  const loadProfile = async () => {
    try {
      setLoading(true);
      const data = await loadUserProfile();
      setProfile(data);

      if (data) {
        const [walletData, list] = await Promise.all([
          fetchProviderWallet(),
          fetchMyWithdrawals(),
        ]);
        if (walletData.success) {
          setWallet({
            available_balance: Number(walletData.available_balance ?? 0),
            total_earned: Number(walletData.total_earned ?? 0),
            total_withdrawn: Number(walletData.total_withdrawn ?? 0),
            pending_withdrawals: Number(walletData.pending_withdrawals ?? 0),
            currency: walletData.currency || data.currency || 'CDF',
          });
        }
        setWithdrawals(list);
      }
    } catch (err) {
      console.error('Error loading profile:', err);
      setError('Impossible de charger le solde.');
    } finally {
      setLoading(false);
    }
  };

  const currency = normalizeCurrency(
    providerCurrency ||
      profile?.currency ||
      (profile?.country ? getCurrencyByCountry(profile.country) : 'FCFA')
  );
  const minAmount = getMinWithdrawalAmount(currency);
  const maxAmount = getMaxWithdrawalAmount(currency);
  const mobileMoneyProviders = profile?.country ? getMobileMoneyProviders(profile.country) : [];
  const isKycVerified = profile?.kyc_status === 'verified';

  const handleSubmit = async () => {
    if (!profile) return;

    if (!profile.country) {
      setError('Renseignez votre pays dans le profil.');
      return;
    }

    if (!isKycVerified) {
      setError('Vérification d’identité requise.');
      return;
    }

    const amount = parseFloat(formData.amount);
    const check = validateWithdrawalAmount(amount, currency);
    if (!check.valid) {
      setError(check.reason || 'Montant invalide');
      return;
    }

    if (wallet && amount > wallet.available_balance) {
      setError('Solde insuffisant.');
      return;
    }

    if (!formData.mobile_money_provider) {
      setError('Choisissez un opérateur.');
      return;
    }

    if (!formData.phone_number.trim()) {
      setError('Numéro requis.');
      return;
    }

    try {
      setSubmitting(true);
      setError('');

      await submitWithdrawalRequest({
        amount,
        method: 'mobile_money',
        mobile_money_provider: formData.mobile_money_provider,
        phone_number: formData.phone_number,
      });

      setSuccess('Demande envoyée.');
      setFormData({ amount: '', mobile_money_provider: '', phone_number: '' });
      await loadProfile();
      setTimeout(() => setSuccess(''), 4000);
    } catch (err) {
      console.error('Error submitting withdrawal:', err);
      setError(err instanceof Error ? err.message : 'Échec de la demande');
    } finally {
      setSubmitting(false);
    }
  };

  if (loading) {
    return (
      <div className="flex min-h-[50vh] items-center justify-center">
        <div className="h-8 w-8 animate-spin rounded-full border-2 border-[#0b3b78] border-t-transparent" />
      </div>
    );
  }

  return (
    <div className="mx-auto max-w-xl space-y-4">
      <h1 className="text-xl font-semibold tracking-tight text-[#0b2f63] sm:text-2xl">Retraits</h1>

      {wallet && (
        <div className="rounded-2xl border border-[#e2eaf3] bg-white p-4 shadow-[0_1px_2px_rgba(11,59,120,0.04)]">
          <p className="text-xs font-medium text-[#8a9bb0]">Disponible</p>
          <p className="mt-1 text-2xl font-semibold tabular-nums leading-none text-[#0b3b78]">
            {formatCurrencyAmount(wallet.available_balance, wallet.currency || currency)}
          </p>
          <p className="mt-2 text-[11px] leading-snug text-[#8a9bb0]">
            Min. {formatCurrencyAmount(minAmount, currency)} · Max.{' '}
            {formatCurrencyAmount(maxAmount, currency)}
          </p>
        </div>
      )}

      {error && (
        <Alert variant="destructive">
          <AlertCircle className="h-4 w-4" />
          <AlertDescription>{error}</AlertDescription>
        </Alert>
      )}
      {success && (
        <Alert className="border-green-200 bg-green-50">
          <AlertDescription className="text-green-800">{success}</AlertDescription>
        </Alert>
      )}

      {!isKycVerified ? (
        <Link
          to="/dashboard/kyc"
          className="flex items-center justify-between gap-3 rounded-2xl border border-[#e2eaf3] bg-white px-4 py-3 shadow-[0_1px_2px_rgba(11,59,120,0.04)] transition-colors hover:border-[#c5d4e8]"
        >
          <div className="leading-none">
            <p className="text-sm font-semibold text-[#0b2f63]">Vérifier mon identité</p>
            <p className="mt-1 text-[11px] text-[#8a9bb0]">Requis pour retirer vos fonds</p>
          </div>
          <ArrowRight className="h-4 w-4 shrink-0 text-[#0b3b78]" />
        </Link>
      ) : (
        <div className="space-y-4 rounded-2xl border border-[#e2eaf3] bg-white p-4 shadow-[0_1px_2px_rgba(11,59,120,0.04)]">
          <div className="space-y-1.5">
            <Label htmlFor="amount">Montant</Label>
            <div className="flex gap-2">
              <Input
                id="amount"
                name="amount"
                type="number"
                inputMode="decimal"
                value={formData.amount}
                onChange={(e) => setFormData((p) => ({ ...p, amount: e.target.value }))}
                placeholder={String(minAmount)}
                className="h-11 flex-1 text-base"
                disabled={submitting}
              />
              <span className="inline-flex h-11 items-center px-3 text-sm font-semibold text-[#0b3b78]">
                {currency}
              </span>
            </div>
          </div>

          <div className="space-y-1.5">
            <Label>Mobile Money</Label>
            {mobileMoneyProviders.length > 0 ? (
              <Select
                value={formData.mobile_money_provider}
                onValueChange={(value) =>
                  setFormData((p) => ({ ...p, mobile_money_provider: value }))
                }
              >
                <SelectTrigger className="h-11">
                  <SelectValue placeholder="Opérateur" />
                </SelectTrigger>
                <SelectContent>
                  {mobileMoneyProviders.map((provider) => (
                    <SelectItem key={provider.name} value={provider.name}>
                      <span className="inline-flex items-center gap-2">
                        <ProviderNetworkIcon label={provider.name} className="h-5 max-w-[4.5rem]" />
                        {provider.name}
                      </span>
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            ) : (
              <p className="text-sm text-[#5c7188]">Aucun opérateur pour votre pays.</p>
            )}
          </div>

          <div className="space-y-1.5">
            <Label htmlFor="phone_number">Numéro</Label>
            <Input
              id="phone_number"
              name="phone_number"
              type="tel"
              value={formData.phone_number}
              onChange={(e) => setFormData((p) => ({ ...p, phone_number: e.target.value }))}
              placeholder={
                COUNTRIES_DATA[profile?.country as keyof typeof COUNTRIES_DATA]?.phonePrefix ||
                '+…'
              }
              className="h-11 text-base"
              disabled={submitting}
            />
          </div>

          <Button
            onClick={handleSubmit}
            disabled={submitting}
            className="h-11 w-full bg-[#0b3b78] hover:bg-[#0a3266]"
            size="lg"
          >
            {submitting ? 'Envoi…' : 'Demander le retrait'}
          </Button>
        </div>
      )}

      <div className="overflow-hidden rounded-2xl border border-[#e2eaf3] bg-white shadow-[0_1px_2px_rgba(11,59,120,0.04)]">
        <h2 className="border-b border-[#eef3f9] px-4 py-3 text-sm font-semibold text-[#0b2f63]">Historique</h2>
        {withdrawals.length === 0 ? (
          <p className="px-4 py-8 text-center text-sm text-[#8a9bb0]">Aucun retrait</p>
        ) : (
          <div className="divide-y divide-[#eef3f9]">
            {withdrawals.map((w) => (
              <div key={w.id} className="flex items-center justify-between gap-3 px-4 py-2.5">
                <div className="min-w-0">
                  <p className="font-semibold tabular-nums text-[#0b2f63]">
                    {formatCurrencyAmount(w.amount, w.currency || currency)}
                  </p>
                  <p className="truncate text-xs text-[#5c7188]">
                    {w.mobile_money_provider || 'Mobile Money'} ·{' '}
                    {new Date(w.created_at).toLocaleDateString('fr-FR')}
                  </p>
                </div>
                <div className="flex shrink-0 items-center gap-2">
                  {w.status === 'pending' && (
                    <Button
                      variant="ghost"
                      size="sm"
                      className="text-[#5c7188]"
                      onClick={() =>
                        cancelWithdrawal(w.id)
                          .then(loadProfile)
                          .catch((err) =>
                            setError(err instanceof Error ? err.message : 'Annulation impossible')
                          )
                      }
                    >
                      Annuler
                    </Button>
                  )}
                  <span className="text-xs font-medium text-[#5c7188]">
                    {w.status === 'pending' && 'En attente'}
                    {w.status === 'processing' && 'En cours'}
                    {w.status === 'completed' && 'Payé'}
                    {w.status === 'failed' && 'Échoué'}
                  </span>
                </div>
              </div>
            ))}
          </div>
        )}
      </div>
    </div>
  );
}

export default Withdrawal;
