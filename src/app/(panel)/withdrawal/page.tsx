'use client';

import { useState, useEffect } from 'react';
import {
  ArrowUpRight,
  Wallet,
  Clock,
  CheckCircle2,
  XCircle,
  Coins,
  Building2,
  Send,
  AlertTriangle,
  RefreshCw,
} from 'lucide-react';
import { useAuth } from '@/context/AuthContext';
// Cloud Function URL from Vercel ENV (no Remote Config)
const FUN_WITHDRAWAL_REQUEST_URL = process.env.NEXT_PUBLIC_FUN_WITHDRAWAL_REQUEST || '';
import { doc, onSnapshot, collection, onSnapshot as colOnSnapshot } from 'firebase/firestore';
import { db } from '@/lib/firebase';
import { toast } from 'sonner';

// ═══════════════════════════════════════════════════
// HELPERS
// ═══════════════════════════════════════════════════
function formatCoins(paisa: number): string {
  const coins = paisa / 100;
  return coins % 1 === 0 ? `${Math.round(coins)} Coins` : `${parseFloat(coins.toFixed(2))} Coins`;
}

// ═══════════════════════════════════════════════════
// TYPES
// ═══════════════════════════════════════════════════
interface WithdrawalItem {
  id: string;
  bankDetail: string;          // UPI / Bank Account No.
  amount: number;              // paisa
  status: 'pending' | 'success' | 'completed' | 'failed';
  requestedAt: any;            // Firestore timestamp
  processedAt?: any;
  transactionId?: string;
  notes?: string;
  walletBalanceBefore?: number;
  walletBalanceAfter?: number;
}

// ═══════════════════════════════════════════════════
// STATUS CONFIG
// ═══════════════════════════════════════════════════
const statusConfig: Record<string, { color: string; bg: string; icon: React.ReactNode; label: string }> = {
  pending: {
    color: 'text-yellow-400',
    bg: 'bg-yellow-500/15 border-yellow-500/25',
    icon: <Clock className="w-3 h-3" />,
    label: 'Pending',
  },
  success: {
    color: 'text-green-400',
    bg: 'bg-green-500/15 border-green-500/25',
    icon: <CheckCircle2 className="w-3 h-3" />,
    label: 'Completed',
  },
  completed: {
    color: 'text-green-400',
    bg: 'bg-green-500/15 border-green-500/25',
    icon: <CheckCircle2 className="w-3 h-3" />,
    label: 'Completed',
  },
  failed: {
    color: 'text-red-400',
    bg: 'bg-red-500/15 border-red-500/25',
    icon: <XCircle className="w-3 h-3" />,
    label: 'Failed',
  },
};

// ═══════════════════════════════════════════════════
// MAIN PAGE
// ═══════════════════════════════════════════════════
export default function WithdrawalPage() {
  const { user, isLoading: authLoading } = useAuth();

  // ── UI State ──
  const [bankDetail, setBankDetail] = useState('');
  const [coinsInput, setCoinsInput] = useState('');
  const [walletBalance, setWalletBalance] = useState(0);
  const [withdrawals, setWithdrawals] = useState<WithdrawalItem[]>([]);
  const [loading, setLoading] = useState(true);
  const [submitting, setSubmitting] = useState(false);

  // ── Platform Fee — read from Firestore host doc (default 30%) ──
  const [feePercent, setFeePercent] = useState(30);
  const inputCoins = Number(coinsInput) || 0;
  const feeRate = feePercent / 100;
  const platformFee = inputCoins * feeRate;
  const finalCoins = inputCoins - platformFee;

  // ═══════════════════════════════════════════════════
  // REALTIME: Host doc — read platformFeePercent
  // ═══════════════════════════════════════════════════
  useEffect(() => {
    if (authLoading || !user) return;

    const hostRef = doc(db, 'hosts', user.uid);
    const unsubscribe = onSnapshot(hostRef, (snap) => {
      if (snap.exists()) {
        const fee = snap.data()?.platformFeePercent;
        // Use Firestore value if valid number > 0, else default 30
        setFeePercent((typeof fee === 'number' && fee > 0) ? fee : 30);
      }
    }, () => {});

    return () => unsubscribe();
  }, [user, authLoading]);

  // ═══════════════════════════════════════════════════
  // REALTIME WALLET BALANCE
  // ═══════════════════════════════════════════════════
  useEffect(() => {
    if (authLoading || !user) return;

    const walletRef = doc(db, 'hosts', user.uid, 'accountBalance', 'wallet');
    const unsubscribe = onSnapshot(walletRef, (snap) => {
      if (snap.exists()) {
        const bal = snap.data()?.walletBalance || 0;
        setWalletBalance(bal);
      }
    }, () => {});

    return () => unsubscribe();
  }, [user, authLoading]);

  // ═══════════════════════════════════════════════════
  // REALTIME WITHDRAWAL HISTORY — hosts/{uid}/transactionHistory
  // Filter transactionType === 'withdrawal', max 3
  // ═══════════════════════════════════════════════════
  useEffect(() => {
    if (authLoading || !user) return;

    const colRef = collection(db, 'hosts', user.uid, 'transactionHistory');

    const unsubscribe = colOnSnapshot(colRef, (snap) => {
      const items: WithdrawalItem[] = [];
      snap.forEach((doc) => {
        const data = doc.data();
        if (data.transactionType !== 'withdrawal') return;
        items.push({
          id: doc.id,
          bankDetail: data.bankDetail || '',
          amount: data.amount || 0,
          status: data.status || 'pending',
          requestedAt: data.requestedAt,
          processedAt: data.processedAt,
          transactionId: data.transactionId || '',
          notes: data.notes || '',
          walletBalanceBefore: data.walletBalanceBefore || 0,
          walletBalanceAfter: data.walletBalanceAfter || 0,
        });
      });
      // Sort by requestedAt (Firestore timestamp) descending
      items.sort((a, b) => {
        const ta = a.requestedAt?.toMillis?.() || 0;
        const tb = b.requestedAt?.toMillis?.() || 0;
        return tb - ta;
      });
      // Max 3
      setWithdrawals(items.slice(0, 3));
      setLoading(false);
    }, (err) => {
      setLoading(false);
    });

    return () => unsubscribe();
  }, [user, authLoading]);

  // ═══════════════════════════════════════════════════
  // SUBMIT WITHDRAWAL — Cloud Function call
  // ═══════════════════════════════════════════════════
  const balanceCoins = walletBalance / 100;

  const handleSubmit = async () => {
    if (!user) {
      toast.error('Not logged in');
      return;
    }

    const coins = Number(coinsInput);
    const detail = bankDetail.trim();

    // Validation
    if (!detail) { toast.error('Enter Bank Detail / UPI'); return; }
    if (!coins || coins <= 0) { toast.error('Enter valid amount'); return; }
    if (coins < 10) { toast.error('Minimum withdrawal is 10 Coins'); return; }
    if (coins > 500) { toast.error('Maximum withdrawal is 500 Coins'); return; }
    if (coins > balanceCoins) { toast.error('Insufficient balance'); return; }

    setSubmitting(true);

    try {
      const funcUrl = FUN_WITHDRAWAL_REQUEST_URL;

      if (!funcUrl) {
        toast.error('Function URL not configured');
        return;
      }

      // Send FULL amount — Cloud Function will calculate & deduct fee
      const amountPaisa = Math.round(coins * 100);

      const res = await fetch(funcUrl, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          hostId: user.uid,
          amount: amountPaisa,
          bankDetail: detail,
        }),
      });

      const data = await res.json();

      if (data.success) {
        toast.success('Withdrawal submitted!', {
          description: `Input: ${coins} Coins | Fee: ${data.platformFee || `${feePercent}%`} | You Receive: ${data.payoutAmount || '?'} Coins — ${data.transactionId || ''}`,
        });
        // Clear form
        setBankDetail('');
        setCoinsInput('');
      } else {
        toast.error('Withdrawal failed', {
          description: data.error || data.message || 'Unknown error',
        });
      }
    } catch (e: any) {
      toast.error('Request failed', { description: e.message });
    } finally {
      setSubmitting(false);
    }
  };

  // ═══════════════════════════════════════════════════
  // RENDER
  // ═══════════════════════════════════════════════════
  return (
    <div className="min-h-screen pb-20 lg:pb-6">
      {/* Header */}
      <header className="bg-gradient-to-r from-yellow-500 to-amber-600 px-4 lg:px-6 py-6 sticky top-0 z-20">
        <div className="max-w-4xl mx-auto">
          <h1 className="text-xl lg:text-2xl font-extrabold text-white flex items-center gap-2">
            <ArrowUpRight className="w-6 h-6" />
            Withdrawal
          </h1>
          <p className="text-white/60 text-sm mt-1">Withdraw your coins to bank / UPI</p>
        </div>
      </header>

      <div className="max-w-4xl mx-auto px-4 lg:px-6 py-6 space-y-5">

        {/* ═══ Balance Card ═══ */}
        <div className="rounded-2xl bg-gradient-to-br from-yellow-600/15 via-[oklch(0.18,0.04,290)] to-amber-600/10 border border-yellow-500/20 p-4 lg:p-5">
          <div className="flex items-center gap-3">
            <div className="w-12 h-12 rounded-xl bg-yellow-500/20 flex items-center justify-center shrink-0">
              <Wallet className="w-6 h-6 text-yellow-400" />
            </div>
            <div>
              <p className="text-[10px] text-[oklch(0.50,0.04,290)] uppercase tracking-wide">Available Balance</p>
              <p className="text-2xl font-extrabold text-white leading-tight">
                {formatCoins(walletBalance)}
              </p>
            </div>
          </div>
        </div>

        {/* ═══ Withdrawal Form ═══ */}
        <div className="rounded-2xl bg-[oklch(0.18,0.04,290)] border border-[oklch(0.30,0.06,290)] overflow-hidden">

          {/* Form Header */}
          <div className="px-4 py-3 bg-[oklch(0.14,0.03,290)] border-b border-[oklch(0.25,0.05,290)] flex items-center gap-2">
            <Send className="w-4 h-4 text-yellow-400" />
            <p className="text-xs font-bold text-[oklch(0.70,0.04,290)]">New Withdrawal Request</p>
          </div>

          <div className="p-4 space-y-4">

            {/* Input 1 — Bank Detail / UPI */}
            <div>
              <label className="flex items-center gap-1.5 mb-2">
                <Building2 className="w-3.5 h-3.5 text-[oklch(0.50,0.04,290)]" />
                <span className="text-[11px] font-semibold text-[oklch(0.60,0.04,290)]">
                  Bank Detail / UPI
                </span>
              </label>
              <input
                type="text"
                value={bankDetail}
                onChange={(e) => setBankDetail(e.target.value)}
                placeholder="Enter UPI ID or Bank Account No."
                className="w-full h-12 rounded-xl bg-[oklch(0.14,0.04,290)] border border-[oklch(0.30,0.06,290)] px-3.5 text-sm text-white placeholder:text-[oklch(0.35,0.04,290)] focus:border-yellow-500/50 focus:outline-none transition-colors"
              />
            </div>

            {/* Input 2 — Coins Amount */}
            <div>
              <label className="flex items-center gap-1.5 mb-2">
                <Coins className="w-3.5 h-3.5 text-[oklch(0.50,0.04,290)]" />
                <span className="text-[11px] font-semibold text-[oklch(0.60,0.04,290)]">
                  Amount (Coins)
                </span>
              </label>
              <div className="relative">
                <input
                  type="number"
                  value={coinsInput}
                  onChange={(e) => setCoinsInput(e.target.value)}
                  placeholder="Enter coins amount"
                  className="w-full h-12 rounded-xl bg-[oklch(0.14,0.04,290)] border border-[oklch(0.30,0.06,290)] px-3.5 pr-16 text-sm text-white placeholder:text-[oklch(0.35,0.04,290)] focus:border-yellow-500/50 focus:outline-none transition-colors"
                />
                <div className="absolute right-3 top-1/2 -translate-y-1/2 flex items-center gap-1.5">
                  <span className="text-[10px] font-bold text-yellow-400">Coins</span>
                  <button
                    onClick={() => setCoinsInput(String(balanceCoins))}
                    className="text-[9px] font-semibold text-yellow-400/70 hover:text-yellow-400 bg-yellow-500/10 px-1.5 py-0.5 rounded-md transition-colors"
                  >
                    MAX
                  </button>
                </div>
              </div>

              {/* Quick Amount Buttons */}
              <div className="flex gap-2 mt-2">
                {[0.25, 0.5, 0.75].map((pct) => {
                  const val = balanceCoins * pct;
                  return (
                    <button
                      key={pct}
                      onClick={() => setCoinsInput(String(Math.floor(val)))}
                      className="flex-1 h-8 rounded-lg bg-[oklch(0.14,0.04,290)] border border-[oklch(0.25,0.05,290)] text-[10px] font-semibold text-[oklch(0.55,0.04,290)] hover:border-yellow-500/30 hover:text-yellow-400 transition-colors"
                    >
                      {pct * 100}%
                    </button>
                  );
                })}
              </div>
            </div>

            {/* ✅ Platform Fee Display — real-time 30% cut info */}
            {inputCoins > 0 && (
              <div className="rounded-xl bg-green-500/10 border border-green-500/25 px-4 py-3 space-y-2">
                <div className="flex items-center gap-2">
                  <div className="w-5 h-5 rounded-full bg-green-500/20 flex items-center justify-center shrink-0">
                    <span className="text-[10px] font-bold text-green-400">%</span>
                  </div>
                  <p className="text-xs font-bold text-green-400">Platform Fee Breakdown</p>
                </div>
                <div className="grid grid-cols-3 gap-2">
                  <div className="text-center">
                    <p className="text-[10px] text-[oklch(0.45,0.04,290)]">Total Input</p>
                    <p className="text-sm font-bold text-white">{inputCoins} Coins</p>
                  </div>
                  <div className="text-center">
                    <p className="text-[10px] text-[oklch(0.45,0.04,290)]">Fee ({feePercent}%)</p>
                    <p className="text-sm font-bold text-red-400">-{platformFee % 1 === 0 ? Math.round(platformFee) : platformFee.toFixed(1)} Coins</p>
                  </div>
                  <div className="text-center">
                    <p className="text-[10px] text-[oklch(0.45,0.04,290)]">You Receive</p>
                    <p className="text-sm font-bold text-green-400">{finalCoins % 1 === 0 ? Math.round(finalCoins) : finalCoins.toFixed(1)} Coins</p>
                  </div>
                </div>
              </div>
            )}

            {/* Warning — Insufficient Balance */}
            {coinsInput && Number(coinsInput) > balanceCoins && (
              <div className="flex items-center gap-2 px-3 py-2 rounded-lg bg-red-500/10 border border-red-500/20">
                <AlertTriangle className="w-3.5 h-3.5 text-red-400 shrink-0" />
                <span className="text-[11px] font-medium text-red-400">
                  Insufficient balance. Available: {formatCoins(walletBalance)}
                </span>
              </div>
            )}

            {/* Submit Button */}
            <button
              onClick={handleSubmit}
              disabled={!bankDetail.trim() || !coinsInput || Number(coinsInput) <= 0 || Number(coinsInput) > balanceCoins || Number(coinsInput) < 10 || Number(coinsInput) > 500 || submitting}
              className="w-full h-12 rounded-xl bg-gradient-to-r from-yellow-500 to-amber-600 text-white font-bold text-sm shadow-lg shadow-yellow-500/20 disabled:opacity-30 disabled:shadow-none flex items-center justify-center gap-2 hover:scale-[1.01] active:scale-[0.99] transition-all"
            >
              {submitting ? (
                <div className="w-4 h-4 border-2 border-white/30 border-t-white rounded-full animate-spin" />
              ) : (
                <ArrowUpRight className="w-4 h-4" />
              )}
              SUBMIT WITHDRAWAL — {finalCoins % 1 === 0 ? Math.round(finalCoins) : finalCoins.toFixed(1)} Coins (after {feePercent}% fee)
            </button>
          </div>
        </div>

        {/* ═══ Recent Withdrawals ═══ */}
        <div className="text-center py-1">
          <h2 className="text-lg font-bold bg-gradient-to-r from-yellow-400 to-amber-400 bg-clip-text text-transparent">
            Recent Withdrawals
          </h2>
          <p className="text-[11px] text-[oklch(0.45,0.04,290)] mt-0.5">Latest 3 requests</p>
        </div>

        {/* Withdrawal List */}
        <div className="space-y-2">
          {loading ? (
            <div className="flex flex-col items-center py-12 space-y-3">
              <div className="w-6 h-6 border-2 border-yellow-400/30 border-t-yellow-400 rounded-full animate-spin" />
              <p className="text-xs text-[oklch(0.45,0.04,290)]">Loading withdrawals...</p>
            </div>
          ) : withdrawals.length === 0 ? (
            <div className="flex flex-col items-center py-12 space-y-3">
              <ArrowUpRight className="w-10 h-10 text-[oklch(0.22,0.04,290)]" />
              <p className="text-xs text-[oklch(0.40,0.04,290)]">No withdrawal requests yet</p>
              <p className="text-[10px] text-[oklch(0.30,0.04,290)]">Submit your first withdrawal above</p>
            </div>
          ) : (
            withdrawals.map((w) => {
              const st = statusConfig[w.status] || statusConfig.pending;
              const ts = w.requestedAt?.toDate?.()
                ? w.requestedAt.toDate().toLocaleString('en-IN', {
                    day: '2-digit', month: 'short', year: '2-digit',
                    hour: '2-digit', minute: '2-digit', hour12: true
                  })
                : '';

              return (
                <div key={w.id} className="rounded-xl bg-[oklch(0.18,0.04,290)] border border-[oklch(0.25,0.05,290)] p-3">

                  {/* Top Row — Amount + Status */}
                  <div className="flex items-center justify-between mb-2">
                    <div className="flex items-center gap-2">
                      <div className="w-8 h-8 rounded-lg bg-yellow-500/15 flex items-center justify-center">
                        <ArrowUpRight className="w-4 h-4 text-yellow-400" />
                      </div>
                      <p className="text-sm font-bold text-red-400">
                        -{formatCoins(w.amount)}
                      </p>
                    </div>
                    <span className={`inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-[10px] font-bold border ${st.bg} ${st.color}`}>
                      {st.icon} {st.label}
                    </span>
                  </div>

                  {/* Detail Rows */}
                  <div className="space-y-1.5">
                    <div className="flex items-center justify-between">
                      <span className="text-[10px] text-[oklch(0.45,0.04,290)]">Bank / UPI</span>
                      <span className="text-[10px] font-medium text-white truncate max-w-[65%]">{w.bankDetail || 'N/A'}</span>
                    </div>
                    {w.transactionId && (
                      <div className="flex items-center justify-between">
                        <span className="text-[10px] text-[oklch(0.45,0.04,290)]">Txn ID</span>
                        <span className="text-[10px] font-mono text-[oklch(0.55,0.04,290)] truncate max-w-[65%]">{w.transactionId}</span>
                      </div>
                    )}
                    {w.walletBalanceAfter > 0 && (
                      <div className="flex items-center justify-between">
                        <span className="text-[10px] text-[oklch(0.45,0.04,290)]">Balance After</span>
                        <span className="text-[10px] font-medium text-green-400">{formatCoins(w.walletBalanceAfter)}</span>
                      </div>
                    )}
                    {ts && (
                      <div className="flex items-center justify-between">
                        <span className="text-[10px] text-[oklch(0.45,0.04,290)]">Requested</span>
                        <span className="text-[10px] text-[oklch(0.50,0.04,290)]">{ts}</span>
                      </div>
                    )}
                    {w.notes && (
                      <div className="pt-1.5 border-t border-[oklch(0.25,0.05,290)]">
                        <p className="text-[10px] text-[oklch(0.40,0.04,290)] italic leading-relaxed">{w.notes}</p>
                      </div>
                    )}
                  </div>
                </div>
              );
            })
          )}
        </div>

      </div>
    </div>
  );
}
