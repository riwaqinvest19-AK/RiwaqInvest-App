import { MIN_INVESTMENT_DZD } from '@/constants/Investment';
import { supabase } from '@/lib/supabase';

const FEE_PCT = 2;

export type InvestErrorCode =
  | 'NOT_AUTHENTICATED'
  | 'INVALID_AMOUNT'
  | 'BELOW_MINIMUM'
  | 'INSUFFICIENT_BALANCE'
  | 'PROJECT_NOT_FOUND'
  | 'RPC_FAILED';

export type InvestResult =
  | { ok: true; newBalance: number; fee: number; totalCharged: number }
  | { ok: false; code: InvestErrorCode; message?: string };

type InvestRpcPayload = {
  ok?: boolean;
  new_balance?: number | string;
  fee?: number | string;
  total_charged?: number | string;
};

export function computeInvestTotals(amount: number): { fee: number; total: number } {
  const principal = Math.trunc(amount);
  const fee = Math.round(principal * (FEE_PCT / 100));
  return { fee, total: principal + fee };
}

function parseRpcNumber(value: number | string | undefined | null): number | null {
  if (value == null) return null;
  const n = typeof value === 'string' ? Number(value) : value;
  return Number.isFinite(n) ? n : null;
}

/**
 * Validates wallet balance and records investment via `invest_in_project` RPC.
 */
export async function handleInvestment(
  projectId: string,
  amount: number,
): Promise<InvestResult> {
  const principal = Math.trunc(amount);
  if (!projectId || principal <= 0) {
    return { ok: false, code: 'INVALID_AMOUNT', message: 'Amount must be greater than zero' };
  }
  if (principal < MIN_INVESTMENT_DZD) {
    return {
      ok: false,
      code: 'BELOW_MINIMUM',
      message: `Minimum investment is ${MIN_INVESTMENT_DZD} DZD`,
    };
  }

  const {
    data: { user },
    error: authError,
  } = await supabase.auth.getUser();
  if (authError || !user?.id) {
    return { ok: false, code: 'NOT_AUTHENTICATED', message: authError?.message };
  }

  const { fee, total } = computeInvestTotals(principal);

  const { data: profile, error: profileError } = await supabase
    .from('profiles')
    .select('total_balance')
    .eq('id', user.id)
    .maybeSingle();

  if (profileError) {
    return { ok: false, code: 'RPC_FAILED', message: profileError.message };
  }

  const balance = Number(profile?.total_balance ?? 0);
  if (!Number.isFinite(balance)) {
    return { ok: false, code: 'RPC_FAILED', message: 'Could not read wallet balance' };
  }

  if (balance < total) {
    return {
      ok: false,
      code: 'INSUFFICIENT_BALANCE',
      message: `Balance ${balance} < required ${total} (amount ${principal} + fee ${fee})`,
    };
  }

  const { data, error: rpcError } = await supabase.rpc('invest_in_project', {
    p_project_id: projectId,
    p_amount: principal,
  });

  if (rpcError) {
    const msg = (rpcError.message ?? '').toLowerCase();
    if (msg.includes('minimum investment')) {
      return { ok: false, code: 'BELOW_MINIMUM', message: rpcError.message };
    }
    if (msg.includes('insufficient balance')) {
      return { ok: false, code: 'INSUFFICIENT_BALANCE', message: rpcError.message };
    }
    if (msg.includes('project not found')) {
      return { ok: false, code: 'PROJECT_NOT_FOUND', message: rpcError.message };
    }
    if (msg.includes('payload') || msg.includes('schema cache') || msg.includes('function')) {
      return {
        ok: false,
        code: 'RPC_FAILED',
        message:
          'استثمار الخادم غير متاح. طبّق migration invest_in_project_json_return في Supabase ثم أعد المحاولة.',
      };
    }
    return { ok: false, code: 'RPC_FAILED', message: rpcError.message };
  }

  const payload = (data ?? null) as InvestRpcPayload | null;
  const rpcFee = parseRpcNumber(payload?.fee) ?? fee;
  const rpcTotal = parseRpcNumber(payload?.total_charged) ?? total;
  const rpcBalance = parseRpcNumber(payload?.new_balance);

  const { data: afterProfile } = await supabase
    .from('profiles')
    .select('total_balance')
    .eq('id', user.id)
    .maybeSingle();

  const refreshedBalance = Number(afterProfile?.total_balance ?? NaN);
  const newBalance =
    rpcBalance ??
    (Number.isFinite(refreshedBalance) ? refreshedBalance : balance - rpcTotal);

  return { ok: true, newBalance, fee: rpcFee, totalCharged: rpcTotal };
}
