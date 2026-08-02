import { supabase } from '@/integrations/supabase/client';

export interface ProviderWallet {
  success: boolean;
  currency?: string;
  total_earned?: number;
  total_withdrawn?: number;
  pending_withdrawals?: number;
  available_balance?: number;
  error?: string;
}

export interface WithdrawalRow {
  id: string;
  user_id: string;
  amount: number;
  currency: string;
  method: string;
  mobile_money_provider: string | null;
  phone_number: string | null;
  account_details: Record<string, string> | null;
  status: string;
  rejection_reason: string | null;
  admin_notes: string | null;
  created_at: string;
  processed_at: string | null;
  payout_mode?: string | null;
  kpay_payout_reference?: string | null;
  kpay_payout_status?: string | null;
  kpay_amount?: number | null;
  users?: {
    full_name: string | null;
    email: string | null;
    country: string | null;
    kyc_status: string | null;
  } | null;
}

function parseJson<T>(data: unknown): T {
  return (typeof data === 'string' ? JSON.parse(data) : data) as T;
}

export async function fetchProviderWallet(): Promise<ProviderWallet> {
  const { data, error } = await supabase.rpc('get_provider_wallet');
  if (error) throw error;
  return parseJson<ProviderWallet>(data);
}

export async function submitWithdrawalRequest(params: {
  amount: number;
  method: 'mobile_money' | 'bank_transfer' | 'wallet';
  mobile_money_provider?: string;
  phone_number?: string;
  account_details?: Record<string, string>;
}) {
  const { data, error } = await supabase.rpc('request_withdrawal', {
    amount_param: params.amount,
    method_param: params.method,
    mobile_money_provider_param: params.mobile_money_provider ?? null,
    phone_number_param: params.phone_number ?? null,
    account_details_param: params.account_details ?? {},
  });
  if (error) throw error;
  const result = parseJson<{ success: boolean; error?: string; message?: string }>(data);
  if (!result.success) throw new Error(result.error || 'Demande refusée');
  return result;
}

export async function cancelWithdrawal(withdrawalId: string) {
  const { data, error } = await supabase.rpc('cancel_my_withdrawal', {
    withdrawal_id_param: withdrawalId,
  });
  if (error) throw error;
  const result = parseJson<{ success: boolean; error?: string }>(data);
  if (!result.success) throw new Error(result.error || 'Annulation impossible');
}

export async function fetchMyWithdrawals() {
  const { data, error } = await supabase
    .from('withdrawals')
    .select('*')
    .order('created_at', { ascending: false });
  if (error) throw error;
  return (data || []) as WithdrawalRow[];
}

export async function fetchAllWithdrawals(statusFilter?: string) {
  const applyStatus = <T extends { eq: (col: string, val: string) => T }>(query: T) =>
    statusFilter && statusFilter !== 'all' ? query.eq('status', statusFilter) : query;

  const withUserJoin = applyStatus(
    supabase
      .from('withdrawals')
      .select('*, users!withdrawals_user_id_fkey(full_name, email, country, kyc_status)')
      .order('created_at', { ascending: false })
  );

  const { data, error } = await withUserJoin;
  if (!error) return (data || []) as WithdrawalRow[];

  // Fallback si la jointure échoue (ex. ancien cache schéma PostgREST)
  const { data: fallbackRows, error: fallbackError } = await applyStatus(
    supabase.from('withdrawals').select('*').order('created_at', { ascending: false })
  );
  if (fallbackError) throw fallbackError;
  return (fallbackRows || []) as WithdrawalRow[];
}

export async function adminProcessWithdrawal(
  withdrawalId: string,
  action: 'approve' | 'complete' | 'reject' | 'cancel',
  notes?: string,
  rejectionReason?: string
) {
  const { data, error } = await supabase.rpc('admin_process_withdrawal', {
    withdrawal_id_param: withdrawalId,
    action_param: action,
    notes_param: notes ?? null,
    rejection_reason_param: rejectionReason ?? null,
  });
  if (error) throw error;
  const result = parseJson<{ success: boolean; error?: string }>(data);
  if (!result.success) throw new Error(result.error || 'Action échouée');
  return result;
}

export async function approveAndPayWithdrawal(withdrawalId: string) {
  const { createKPayPayout } = await import('@/lib/kpay');
  return createKPayPayout(withdrawalId);
}
