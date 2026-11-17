import { useState, useEffect } from 'react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Alert, AlertDescription } from '@/components/ui/alert';
import { Badge } from '@/components/ui/badge';
import { AlertCircle, Wallet as WalletIcon } from 'lucide-react';
import type { UserProfile } from '@/types/index';
import { loadUserProfile } from '@/lib/userService';
import { COUNTRIES_DATA, getCurrencyByCountry, getMobileMoneyProviders, isWithinLimits } from '@/lib/countriesData';
import { useProvider } from '@/contexts/ProviderContext';
import { formatAmount as formatCurrencyAmount, normalizeCurrency } from '@/lib/currency';
import {
  fetchProviderWallet,
  fetchMyWithdrawals,
  submitWithdrawalRequest,
  cancelWithdrawal,
  type WithdrawalRow,
} from '@/lib/withdrawalService';
import { formatWithdrawalPolicySummary, WITHDRAWAL_POLICY } from '@/lib/withdrawalConfig';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';

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
    method: 'mobile_money' as 'bank_transfer' | 'mobile_money' | 'wallet',
    mobile_money_provider: '',
    phone_number: '',
    account_holder: '',
    account_number: '',
    bank_name: '',
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
      setError('Erreur au chargement du profil');
    } finally {
      setLoading(false);
    }
  };

  const handleInputChange = (e: React.ChangeEvent<HTMLInputElement | HTMLTextAreaElement>) => {
    const { name, value } = e.target;
    setFormData(prev => ({ ...prev, [name]: value }));
  };

  const handleMethodChange = (value: string) => {
    setFormData(prev => ({
      ...prev,
      method: value as 'bank_transfer' | 'mobile_money' | 'wallet',
      mobile_money_provider: '',
      phone_number: '',
      account_holder: '',
      account_number: '',
      bank_name: '',
    }));
  };

  const handleSubmit = async () => {
    if (!profile) return;

    // Vérifications
    if (!formData.amount || parseFloat(formData.amount) <= 0) {
      setError('Veuillez entrer un montant valide');
      return;
    }

    if (!profile.country) {
      setError('Veuillez choisir un pays dans votre profil');
      return;
    }

    if (profile.kyc_status !== 'verified') {
      setError('Votre profil doit être vérifié avant de faire un retrait');
      return;
    }

    const currency = normalizeCurrency(profile.currency || getCurrencyByCountry(profile.country));
    const amount = parseFloat(formData.amount);
    const limitsCheck = isWithinLimits(amount, currency as any);

    if (!limitsCheck.valid) {
      setError(limitsCheck.reason);
      return;
    }

    if (formData.method === 'mobile_money' && !formData.mobile_money_provider) {
      setError('Sélectionnez un fournisseur de mobile money');
      return;
    }

    if (!formData.phone_number && formData.method === 'mobile_money') {
      setError('Veuillez entrer votre numéro de téléphone');
      return;
    }

    if (formData.method === 'bank_transfer' && (!formData.bank_name || !formData.account_number)) {
      setError('Veuillez entrer les détails de votre compte bancaire');
      return;
    }

    try {
      setSubmitting(true);
      setError('');

      await submitWithdrawalRequest({
        amount,
        method: formData.method,
        mobile_money_provider:
          formData.method === 'mobile_money' ? formData.mobile_money_provider : undefined,
        phone_number: formData.method === 'mobile_money' ? formData.phone_number : undefined,
        account_details:
          formData.method === 'bank_transfer'
            ? {
                bank_name: formData.bank_name,
                account_number: formData.account_number,
                account_holder: formData.account_holder,
              }
            : undefined,
      });

      setSuccess(
        `Demande enregistrée ! Traitement sous ${WITHDRAWAL_POLICY.processingHoursMin}-${WITHDRAWAL_POLICY.processingHoursMax}h.`
      );
      setFormData({
        amount: '',
        method: 'mobile_money',
        mobile_money_provider: '',
        phone_number: '',
        account_holder: '',
        account_number: '',
        bank_name: '',
      });

      await loadProfile();
      setTimeout(() => setSuccess(''), 6000);
    } catch (err) {
      console.error('Error submitting withdrawal:', err);
      setError(err instanceof Error ? err.message : 'Erreur lors de la soumission');
    } finally {
      setSubmitting(false);
    }
  };

  const handleCancel = async (id: string) => {
    try {
      await cancelWithdrawal(id);
      setSuccess('Demande annulée');
      await loadProfile();
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Annulation impossible');
    }
  };

  if (loading) {
    return (
      <div className="flex min-h-[50vh] items-center justify-center">
        <div className="h-8 w-8 animate-spin rounded-full border-2 border-[#0b3b78] border-t-transparent" />
      </div>
    );
  }

  const currency = providerCurrency || normalizeCurrency(profile?.currency || (profile?.country ? getCurrencyByCountry(profile.country) : 'FCFA'));
  const mobileMoneyProviders = profile?.country ? getMobileMoneyProviders(profile.country) : [];
  const isKycVerified = profile?.kyc_status === 'verified';

  const policyLines = formatWithdrawalPolicySummary(
    (currency === 'FCFA' ? 'XOF' : currency) as 'CDF' | 'XOF' | 'XAF' | 'USD'
  );

  return (
    <div className="space-y-6">
      <h1 className="text-2xl font-semibold tracking-tight text-[#0b2f63] md:text-3xl">Retraits</h1>

      {wallet && (
        <div className="grid gap-3 md:grid-cols-3">
          <div className="rounded-2xl bg-white p-4 ring-1 ring-[#dbe6f2] sm:p-5">
            <p className="flex items-center gap-2 text-sm font-medium text-[#5c7188]">
              <WalletIcon className="h-4 w-4" /> Solde disponible
            </p>
            <p className="mt-2 text-2xl font-semibold tabular-nums text-[#0b3b78]">
              {formatCurrencyAmount(wallet.available_balance, wallet.currency)}
            </p>
          </div>
          <div className="rounded-2xl bg-white p-4 ring-1 ring-[#dbe6f2] sm:p-5">
            <p className="text-sm font-medium text-[#5c7188]">Total gagné (validé)</p>
            <p className="mt-2 text-xl font-semibold tabular-nums text-[#0b2f63]">
              {formatCurrencyAmount(wallet.total_earned, wallet.currency)}
            </p>
          </div>
          <div className="rounded-2xl bg-white p-4 ring-1 ring-[#dbe6f2] sm:p-5">
            <p className="text-sm font-medium text-[#5c7188]">Déjà retiré</p>
            <p className="mt-2 text-xl font-semibold tabular-nums text-[#0b2f63]">
              {formatCurrencyAmount(wallet.total_withdrawn, wallet.currency)}
            </p>
          </div>
        </div>
      )}

      <section className="rounded-2xl bg-white p-4 ring-1 ring-[#dbe6f2] sm:p-5">
        <h2 className="mb-3 text-base font-semibold text-[#0b2f63]">Politique de retrait</h2>
        <ul className="list-disc space-y-1 pl-5 text-sm text-[#5c7188]">
          {policyLines.map((line) => (
            <li key={line}>{line}</li>
          ))}
        </ul>
      </section>

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

        {/* KYC Alert */}
        {!isKycVerified && (
          <Alert className="border-yellow-200 bg-yellow-50">
            <AlertCircle className="h-4 w-4 text-yellow-600" />
            <AlertDescription className="text-yellow-800">
              Votre profil doit être vérifié avant de pouvoir effectuer des retraits. Complétez votre KYC dans votre profil.
            </AlertDescription>
          </Alert>
        )}

        <section className="rounded-2xl bg-white p-5 ring-1 ring-[#dbe6f2] sm:p-6">
          <h2 className="mb-1 text-base font-semibold text-[#0b2f63]">Nouvelle demande de retrait</h2>
          {profile?.country && (
            <p className="mb-5 text-sm text-[#5c7188]">
              {currency}
              {COUNTRIES_DATA[profile.country as keyof typeof COUNTRIES_DATA]?.nameFR
                ? ` · ${COUNTRIES_DATA[profile.country as keyof typeof COUNTRIES_DATA]?.nameFR}`
                : ''}
            </p>
          )}
          <div className="space-y-6">
            {isKycVerified ? (
              <>
                {/* Amount */}
                <div>
                  <Label htmlFor="amount" className="text-sm font-medium">
                    Montant
                  </Label>
                  <div className="flex gap-2 mt-1">
                    <Input
                      id="amount"
                      name="amount"
                      type="number"
                      value={formData.amount}
                      onChange={handleInputChange}
                      placeholder="Entrez le montant"
                      step="0.01"
                      disabled={!isKycVerified || submitting}
                    />
                    <div className="flex items-center rounded-lg border border-[#dbe6f2] bg-[#f7fafd] px-3 py-2">
                      <span className="font-semibold">{currency}</span>
                    </div>
                  </div>
                  {formData.amount && (
                    <p className="mt-2 text-xs text-[#5c7188]">
                      {formatCurrencyAmount(parseFloat(formData.amount), currency)}
                    </p>
                  )}
                </div>

                {/* Method */}
                <div>
                  <Label htmlFor="method" className="text-sm font-medium">
                    Méthode de Retrait
                  </Label>
                  <Select value={formData.method} onValueChange={handleMethodChange}>
                    <SelectTrigger>
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      {mobileMoneyProviders.length > 0 && (
                        <SelectItem value="mobile_money">Mobile Money</SelectItem>
                      )}
                      <SelectItem value="bank_transfer">Virement Bancaire</SelectItem>
                    </SelectContent>
                  </Select>
                </div>

                {/* Mobile Money Details */}
                {formData.method === 'mobile_money' && (
                  <>
                    <div>
                      <Label htmlFor="provider" className="text-sm font-medium">
                        Fournisseur
                      </Label>
                      <Select value={formData.mobile_money_provider} onValueChange={(value) =>
                        setFormData(prev => ({ ...prev, mobile_money_provider: value }))
                      }>
                        <SelectTrigger>
                          <SelectValue placeholder="Sélectionnez le fournisseur" />
                        </SelectTrigger>
                        <SelectContent>
                          {mobileMoneyProviders.map((provider) => (
                            <SelectItem key={provider.name} value={provider.name}>
                              {provider.icon} {provider.name}
                            </SelectItem>
                          ))}
                        </SelectContent>
                      </Select>
                    </div>

                    <div>
                      <Label htmlFor="phone_number" className="text-sm font-medium">
                        Numéro de Téléphone
                      </Label>
                      <Input
                        id="phone_number"
                        name="phone_number"
                        type="tel"
                        value={formData.phone_number}
                        onChange={handleInputChange}
                        placeholder={COUNTRIES_DATA[profile?.country as keyof typeof COUNTRIES_DATA]?.phonePrefix}
                      />
                    </div>
                  </>
                )}

                {/* Bank Transfer Details */}
                {formData.method === 'bank_transfer' && (
                  <>
                    <div>
                      <Label htmlFor="bank_name" className="text-sm font-medium">
                        Nom de la Banque
                      </Label>
                      <Input
                        id="bank_name"
                        name="bank_name"
                        value={formData.bank_name}
                        onChange={handleInputChange}
                        placeholder="ex: Standard Bank"
                      />
                    </div>

                    <div>
                      <Label htmlFor="account_number" className="text-sm font-medium">
                        Numéro de Compte
                      </Label>
                      <Input
                        id="account_number"
                        name="account_number"
                        value={formData.account_number}
                        onChange={handleInputChange}
                        placeholder="Numéro de compte"
                      />
                    </div>

                    <div>
                      <Label htmlFor="account_holder" className="text-sm font-medium">
                        Titulaire du Compte
                      </Label>
                      <Input
                        id="account_holder"
                        name="account_holder"
                        value={formData.account_holder}
                        onChange={handleInputChange}
                        placeholder="Nom du titulaire"
                      />
                    </div>
                  </>
                )}

                {/* Submit Button */}
                <Button
                  onClick={handleSubmit}
                  disabled={submitting || !isKycVerified}
                  className="w-full"
                  size="lg"
                >
                  {submitting ? 'En cours...' : 'Soumettre la Demande'}
                </Button>
              </>
            ) : (
              <div className="py-8 text-center">
                <Button variant="outline">Complétez votre KYC</Button>
              </div>
            )}
          </div>
        </section>

        <section className="rounded-2xl bg-white p-5 ring-1 ring-[#dbe6f2] sm:p-6">
          <h2 className="mb-4 text-base font-semibold text-[#0b2f63]">Historique des retraits</h2>
            {withdrawals.length > 0 ? (
              <div className="space-y-3">
                {withdrawals.map((withdrawal) => (
                  <div
                    key={withdrawal.id}
                    className="flex items-center justify-between rounded-xl bg-[#f7fafd] p-3 ring-1 ring-[#dbe6f2]"
                  >
                    <div>
                      <p className="font-medium">
                      {formatCurrencyAmount(withdrawal.amount, withdrawal.currency || currency)}
                      </p>
                      <p className="text-xs text-[#5c7188]">
                        {withdrawal.method === 'mobile_money'
                          ? `${withdrawal.mobile_money_provider} · ${withdrawal.phone_number}`
                          : 'Virement bancaire'}{' '}
                        · {new Date(withdrawal.created_at).toLocaleDateString('fr-FR')}
                      </p>
                      {withdrawal.rejection_reason && (
                        <p className="text-xs text-destructive mt-1">{withdrawal.rejection_reason}</p>
                      )}
                    </div>
                    <div className="flex items-center gap-2">
                      {withdrawal.status === 'pending' && (
                        <Button variant="ghost" size="sm" onClick={() => handleCancel(withdrawal.id)}>
                          Annuler
                        </Button>
                      )}
                      <Badge
                        variant={
                          withdrawal.status === 'completed'
                            ? 'default'
                            : withdrawal.status === 'failed'
                            ? 'destructive'
                            : 'secondary'
                        }
                      >
                        {withdrawal.status === 'pending' && 'En attente'}
                        {withdrawal.status === 'processing' && 'En cours'}
                        {withdrawal.status === 'completed' && 'Complété'}
                        {withdrawal.status === 'failed' && 'Échoué'}
                      </Badge>
                    </div>
                  </div>
                ))}
              </div>
            ) : (
              <p className="py-8 text-center text-sm text-[#5c7188]">Aucun retrait</p>
            )}
        </section>
    </div>
  );
}

export default Withdrawal;
