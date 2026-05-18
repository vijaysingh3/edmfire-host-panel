'use client';

import { useState, useEffect, useMemo } from 'react';
import Link from 'next/link';
import {
  Wallet,
  ArrowDownLeft,
  ArrowUpRight,
  TrendingDown,
  TrendingUp,
  Plus,
  Minus,
  CheckCircle2,
  Clock,
  XCircle,
  X,
  ChevronRight,
  ArrowLeft,
  Gamepad2,
  RotateCcw,
  Gift,
  Upload,
} from 'lucide-react';
import { useAuth } from '@/context/AuthContext';
import {
  collection,
  query,
  onSnapshot,
  doc,
  onSnapshot as docOnSnapshot,
} from 'firebase/firestore';
import { db } from '@/lib/firebase';

// ═══════════════════════════════════════════════════
// TYPES
// ═══════════════════════════════════════════════════
interface TransactionItem {
  id: string;                       // document ID
  timestamp?: string;               // "16 May 2026, 3:30 PM"
  transactionType?: string;          // "credit" | "debit"
  transactionId?: string;            // "TJ2456987965" | "EDM118PRDxxx" | "EDM118RFDxxx"
  amount?: number;                   // PAISA (always positive, sign determined by transactionType)
  status?: string;                   // "success" | "completed" | "pending" | "failed"
  description?: string;
  tournamentId?: string;
  tournamentType?: string;
  playerName?: string;
  playerUid?: string;
  userId?: string;
  slotNumber?: number;
  entryFee?: number;
  referralBonusUsed?: number;
  refundPercent?: number;
  walletBalanceAfter?: number;
  category?: string;                 // "entryFee" | "priceDistribution" | "refund"
  paymentStatus?: string;
  upiId?: string;
  processedAt?: any;
  requestedAt?: any;
  bankDetail?: string;
  notes?: string;
  walletBalanceBefore?: number;
  _raw?: Record<string, any>;
}

// ═══════════════════════════════════════════════════
// FILTER TABS — Only 3 active types (no deposit/withdrawal yet)
// ═══════════════════════════════════════════════════
const filterTabs = [
  { key: 'all', label: 'All' },
  { key: 'entry_fee', label: 'Entry Fee' },
  { key: 'prize', label: 'Prize Dist.' },
  { key: 'refund', label: 'Refund' },
  { key: 'withdrawal', label: 'Withdrawal' },
];

// ═══════════════════════════════════════════════════
// HELPERS
// ═══════════════════════════════════════════════════
function formatCoins(paisa: number): string {
  const coins = paisa / 100;
  return coins % 1 === 0 ? `${Math.round(coins)} Coins` : `${parseFloat(coins.toFixed(2))} Coins`;
}

// ── Timestamp Parser — "17 May 2026, 01:11 am" / "16 May 2026, 3:30 PM" → Date
function parseTxnTimestamp(ts: string): Date | null {
  if (!ts || typeof ts !== 'string') return null;
  try {
    // Format: "16 May 2026, 3:30 PM" or "17 May 2026, 01:11 am" or "17 May 2026, 7:50 AM IST"
    const cleaned = ts.replace(/IST$/i, '').trim();
    const date = new Date(cleaned);
    if (!isNaN(date.getTime())) return date;
    return null;
  } catch {
    return null;
  }
}

// ── Category Detection — Matches Firestore data from 3 functions ──
// entryFee (joining)   → category: "entryFee",      transactionType: "credit"
// priceDistribution    → category: "priceDistribution", transactionType: "debit"
// refund               → category: "refund",         transactionType: "debit"
function getTransactionCategory(doc: Record<string, any>): string {
  const category = (doc.category || '').toLowerCase();
  const txnType = (doc.transactionType || '').toLowerCase();

  // Withdrawal check first
  if (txnType === 'withdrawal') return 'withdrawal';

  // Direct category match (most reliable)
  if (category === 'entryfee') return 'entry_fee';
  if (category === 'prizedistribution') return 'prize';
  if (category === 'refund') return 'refund';

  // Fallback: infer from transactionType
  if (txnType === 'credit') return 'entry_fee';
  if (txnType === 'debit') {
    if ((doc.tournamentId || '').includes('RFD')) return 'refund';
    if (doc.refundPercent !== undefined) return 'refund';
    if (doc.playerName && doc.playerUid) return 'entry_fee';
    return 'prize';
  }

  if (txnType.includes('refund')) return 'refund';
  if (txnType.includes('joining')) return 'entry_fee';
  if (txnType.includes('prize') || txnType.includes('distribution')) return 'prize';

  return 'other';
}

// ── Credit/Debit — Based on transactionType field ──
function isCredit(txn: TransactionItem): boolean {
  const raw = txn._raw || {};
  if (raw.transactionType === 'credit') return true;
  if (raw.transactionType === 'debit') return false;

  // Fallback: infer from category
  const cat = getTransactionCategory(raw);
  if (cat === 'entry_fee') return true;
  return false; // prize, refund, all debits
}

function getTxnIcon(txn: TransactionItem): { icon: React.ReactNode; bg: string } {
  const cat = getTransactionCategory(txn._raw || {});

  switch (cat) {
    case 'entry_fee':
      return { icon: <Gamepad2 className="w-5 h-5" />, bg: 'bg-green-500/15 text-green-400' };
    case 'prize':
      return { icon: <Gift className="w-5 h-5" />, bg: 'bg-purple-500/15 text-purple-400' };
    case 'refund':
      return { icon: <RotateCcw className="w-5 h-5" />, bg: 'bg-orange-500/15 text-orange-400' };
    case 'withdrawal':
      return { icon: <Upload className="w-5 h-5" />, bg: 'bg-yellow-500/15 text-yellow-400' };
    default:
      return { icon: <Wallet className="w-5 h-5" />, bg: 'bg-[oklch(0.22,0.04,290)] text-[oklch(0.55,0.04,290)]' };
  }
}

function getTxnTitle(txn: TransactionItem): string {
  const raw = txn._raw || {};
  const cat = getTransactionCategory(raw);

  switch (cat) {
    case 'entry_fee':
      return raw.playerName ? `Entry Fee: ${raw.playerName}` : 'Entry Fee Received';
    case 'prize':
      return 'Prize Distribution';
    case 'refund':
      return raw.playerName ? `Refund: ${raw.playerName}` : 'Refund Processed';
    case 'withdrawal':
      return 'Withdrawal Request';
    default:
      return 'Transaction';
  }
}

function getTxnSubtitle(txn: TransactionItem): string {
  const raw = txn._raw || {};
  const cat = getTransactionCategory(raw);

  switch (cat) {
    case 'entry_fee':
      return raw.playerUid ? `UID: ${raw.playerUid}` : (raw.tournamentId ? `Tournament: ${raw.tournamentId}` : 'Tournament Joining');
    case 'prize':
      return raw.tournamentId ? `Tournament: ${raw.tournamentId}` : 'Winners Paid';
    case 'refund':
      if (raw.playerName && raw.tournamentId) return `${raw.playerName} — ${raw.tournamentId}`;
      if (raw.playerName) return raw.playerName;
      return raw.tournamentId ? `Tournament: ${raw.tournamentId}` : 'Player Refund';
    case 'withdrawal':
      return raw.bankDetail || 'Bank / UPI';
    default:
      return raw.description || '';
  }
}

function getTxnMeta(txn: TransactionItem): string {
  const raw = txn._raw || {};
  if (raw.tournamentId) return `#${raw.tournamentId}`;
  return '';
}

// ═══════════════════════════════════════════════════
// STATUS CONFIG
// ═══════════════════════════════════════════════════
const statusConfig: Record<string, { color: string; icon: React.ReactNode }> = {
  completed: { color: 'text-green-400 bg-green-500/15', icon: <CheckCircle2 className="w-3 h-3" /> },
  success: { color: 'text-green-400 bg-green-500/15', icon: <CheckCircle2 className="w-3 h-3" /> },
  pending: { color: 'text-yellow-400 bg-yellow-500/15', icon: <Clock className="w-3 h-3" /> },
  failed: { color: 'text-red-400 bg-red-500/15', icon: <XCircle className="w-3 h-3" /> },
};

// ═══════════════════════════════════════════════════
// MAIN PAGE
// ═══════════════════════════════════════════════════
export default function WalletPage() {
  const { user, isLoading: authLoading } = useAuth();
  const [activeTab, setActiveTab] = useState('all');
  const [transactions, setTransactions] = useState<TransactionItem[]>([]);
  const [loading, setLoading] = useState(true);
  const [walletBalance, setWalletBalance] = useState(0);
  const [selectedTxn, setSelectedTxn] = useState<TransactionItem | null>(null);

  // ── Realtime Transaction History ──
  useEffect(() => {
    if (authLoading || !user) return;

    const txnRef = collection(db, 'hosts', user.uid, 'transactionHistory');
    // No orderBy on processedAt — entryFee & priceDistribution docs don't have it.
    // Firestore silently skips docs missing the ordered field.
    // Sort by document ID desc in JS instead (Firestore auto-IDs are chronologically ordered).
    const q = query(txnRef);

    const unsubscribe = onSnapshot(q, (snap) => {
      const items: TransactionItem[] = [];
      snap.forEach((doc) => {
        const data = doc.data();
        items.push({
          id: doc.id,
          _raw: data,
          timestamp: data.timestamp || '',
          transactionType: data.transactionType || '',
          transactionId: data.transactionId || doc.id,
          amount: data.amount || 0,
          paymentStatus: data.paymentStatus || data.status || '',
          status: data.status || data.paymentStatus || '',
          description: data.description || '',
          tournamentId: data.tournamentId || '',
          tournamentType: data.tournamentType || '',
          playerName: data.playerName || '',
          playerUid: data.playerUid || '',
          userId: data.userId || '',
          slotNumber: data.slotNumber || 0,
          entryFee: data.entryFee || 0,
          referralBonusUsed: data.referralBonusUsed || 0,
          refundPercent: data.refundPercent || 0,
          walletBalanceAfter: data.walletBalanceAfter || 0,
          category: data.category || '',
          upiId: data.upiId || '',
          processedAt: data.processedAt,
          requestedAt: data.requestedAt,
          bankDetail: data.bankDetail || '',
          notes: data.notes || '',
          walletBalanceBefore: data.walletBalanceBefore || 0,
        });
      });
      // Sort newest first by timestamp (parsed from "17 May 2026, 01:11 am" format)
      items.sort((a, b) => {
        const dateA = parseTxnTimestamp(a.timestamp);
        const dateB = parseTxnTimestamp(b.timestamp);
        if (dateB && dateA) return dateB.getTime() - dateA.getTime();
        if (dateB) return 1;
        if (dateA) return -1;
        return 0;
      });
      setTransactions(items);
      setLoading(false);
    }, (err) => {
      setLoading(false);
    });

    return () => unsubscribe();
  }, [user, authLoading]);

  // ── Realtime Wallet Balance ──
  useEffect(() => {
    if (authLoading || !user) return;

    const walletRef = doc(db, 'hosts', user.uid, 'accountBalance', 'wallet');
    const unsubscribe = docOnSnapshot(walletRef, (snap) => {
      if (snap.exists()) {
        const bal = snap.data()?.walletBalance || 0;
        setWalletBalance(bal);
      }
    }, () => {});

    return () => unsubscribe();
  }, [user, authLoading]);

  // ── Filter transactions ──
  const filtered = useMemo(() => {
    if (activeTab === 'all') return transactions;
    return transactions.filter((t) => {
      const cat = getTransactionCategory(t._raw || {});
      return cat === activeTab;
    });
  }, [transactions, activeTab]);

  // ── Stats — Only 3 active categories ──
  const stats = useMemo(() => {
    let totalEntry = 0, totalPrize = 0, totalRefund = 0, totalWithdrawal = 0;
    transactions.forEach((t) => {
      const amt = t.amount || 0;
      const cat = getTransactionCategory(t._raw || {});
      if (cat === 'entry_fee') totalEntry += amt;
      else if (cat === 'prize') totalPrize += amt;
      else if (cat === 'refund') totalRefund += amt;
      else if (cat === 'withdrawal') totalWithdrawal += amt;
    });
    return { totalEntry, totalPrize, totalRefund, totalWithdrawal };
  }, [transactions]);

  // ═══════════════════════════════════════════════════
  // DETAIL VIEW
  // ═══════════════════════════════════════════════════
  if (selectedTxn) {
    const raw = selectedTxn._raw || {};
    const credit = isCredit(selectedTxn);
    const statusKey = (selectedTxn.paymentStatus || selectedTxn.status || '').toLowerCase();
    const st = statusConfig[statusKey];
    const txnIcon = getTxnIcon(selectedTxn);
    const category = getTransactionCategory(raw);

    // Category display labels
    const categoryLabels: Record<string, string> = {
      entry_fee: 'Entry Fee',
      prize: 'Prize Distribution',
      refund: 'Refund',
      withdrawal: 'Withdrawal',
      other: 'Other',
    };

    return (
      <div className="min-h-screen pb-20 lg:pb-6">
        {/* Header */}
        <header className="bg-gradient-to-r from-cyan-500 to-teal-700 px-4 lg:px-6 py-6 sticky top-0 z-20">
          <div className="max-w-4xl mx-auto flex items-center gap-3">
            <button onClick={() => setSelectedTxn(null)}
              className="w-9 h-9 rounded-xl bg-white/10 flex items-center justify-center hover:bg-white/20 transition-colors">
              <ArrowLeft className="w-4 h-4 text-white" />
            </button>
            <div>
              <h1 className="text-lg font-bold text-white">Transaction Details</h1>
              <p className="text-white/50 text-xs">Full transaction information</p>
            </div>
          </div>
        </header>

        <div className="max-w-4xl mx-auto px-4 lg:px-6 py-6 space-y-4">

          {/* Amount Card */}
          <div className="rounded-2xl bg-[oklch(0.16,0.04,290)] border border-[oklch(0.30,0.06,290)] p-5 text-center">
            <div className={`w-16 h-16 rounded-2xl mx-auto mb-3 flex items-center justify-center ${txnIcon.bg}`}>
              {txnIcon.icon}
            </div>
            <p className={`text-3xl font-extrabold ${credit ? 'text-green-400' : 'text-red-400'}`}>
              {credit ? '+' : '-'}{formatCoins(selectedTxn.amount || 0)}
            </p>
            <p className="text-sm text-[oklch(0.55,0.04,290)] mt-1">{getTxnTitle(selectedTxn)}</p>
            {st && (
              <span className={`inline-flex items-center gap-1.5 px-3 py-1 rounded-full text-xs font-medium mt-2 ${st.color}`}>
                {st.icon} {statusKey.charAt(0).toUpperCase() + statusKey.slice(1)}
              </span>
            )}
          </div>

          {/* Detail Rows */}
          <div className="rounded-2xl bg-[oklch(0.16,0.04,290)] border border-[oklch(0.30,0.06,290)] overflow-hidden">
            <div className="px-4 py-3 bg-[oklch(0.12,0.02,290)] border-b border-[oklch(0.25,0.05,290)]">
              <p className="text-xs font-bold text-[oklch(0.70,0.04,290)]">Transaction Information</p>
            </div>

            {[
              { label: 'Transaction ID', value: selectedTxn.transactionId || selectedTxn.id },
              { label: 'Type', value: raw.transactionType === 'credit' ? 'Credit (+)' : raw.transactionType === 'withdrawal' ? 'Withdrawal (-)' : 'Debit (-)' },
              { label: 'Category', value: categoryLabels[category] || category || 'N/A' },
              { label: 'Amount', value: `${credit ? '+' : '-'}${formatCoins(selectedTxn.amount || 0)}` },
              { label: 'Timestamp', value: selectedTxn.timestamp || 'N/A' },
              ...(selectedTxn.tournamentId ? [{ label: 'Tournament ID', value: selectedTxn.tournamentId }] : []),
              ...(raw.playerName ? [{ label: 'Player Name', value: raw.playerName }] : []),
              ...(raw.playerUid ? [{ label: 'Player UID', value: String(raw.playerUid) }] : []),
              ...(raw.userId ? [{ label: 'User ID', value: raw.userId }] : []),
              ...(selectedTxn.refundPercent ? [{ label: 'Refund Percent', value: `${selectedTxn.refundPercent}%` }] : []),
              ...(selectedTxn.walletBalanceAfter ? [{ label: 'Wallet After', value: formatCoins(selectedTxn.walletBalanceAfter) }] : []),
              ...(selectedTxn.description ? [{ label: 'Description', value: selectedTxn.description }] : []),
              ...(selectedTxn.bankDetail ? [{ label: 'Bank Detail', value: selectedTxn.bankDetail }] : []),
              ...(selectedTxn.notes ? [{ label: 'Notes', value: selectedTxn.notes }] : []),
            ].filter(Boolean).map((row) => (
              <div key={row.label} className="flex items-center justify-between px-4 py-3 border-b border-[oklch(0.22,0.04,290)] last:border-b-0">
                <p className="text-xs text-[oklch(0.50,0.04,290)]">{row.label}</p>
                <p className="text-xs font-medium text-white text-right max-w-[60%] truncate">{row.value}</p>
              </div>
            ))}
          </div>

        </div>
      </div>
    );
  }

  // ═══════════════════════════════════════════════════
  // MAIN VIEW
  // ═══════════════════════════════════════════════════
  return (
    <div className="min-h-screen pb-20 lg:pb-6">
      {/* Header */}
      <header className="bg-gradient-to-r from-cyan-500 to-teal-700 px-4 lg:px-6 py-6 sticky top-0 z-20">
        <div className="max-w-4xl mx-auto">
          <h1 className="text-xl lg:text-2xl font-extrabold text-white flex items-center gap-2">
            <Wallet className="w-6 h-6" />
            Wallet
          </h1>
          <p className="text-white/60 text-sm mt-1">Manage coins, transactions & refunds</p>
        </div>
      </header>

      <div className="max-w-4xl mx-auto px-4 lg:px-6 py-6 space-y-5">

        {/* Balance Card */}
        <div className="rounded-2xl bg-gradient-to-br from-cyan-600/20 via-[oklch(0.18,0.04,290)] to-teal-600/10 border border-cyan-500/20 p-5 lg:p-6">
          <div className="flex items-center gap-3 mb-4">
            <div className="w-12 h-12 rounded-xl bg-cyan-500/20 flex items-center justify-center">
              <Wallet className="w-6 h-6 text-cyan-400" />
            </div>
            <div>
              <p className="text-xs text-[oklch(0.55,0.04,290)]">Total Balance</p>
              <p className="text-2xl font-bold text-white">
                {formatCoins(walletBalance)}
              </p>
            </div>
          </div>

          {/* Action Buttons */}
          <div className="grid grid-cols-2 gap-3">
            <Link href="/withdrawal">
              <div className="flex items-center justify-center gap-2 py-3 rounded-xl bg-gradient-to-r from-yellow-500 to-amber-600 text-white font-semibold text-sm shadow-lg shadow-yellow-500/20 hover:scale-[1.02] active:scale-[0.98] transition-transform cursor-pointer">
                <Minus className="w-4 h-4" />
                Withdrawal
              </div>
            </Link>
            <Link href="/deposit">
              <div className="flex items-center justify-center gap-2 py-3 rounded-xl bg-gradient-to-r from-green-500 to-emerald-600 text-white font-semibold text-sm shadow-lg shadow-green-500/20 hover:scale-[1.02] active:scale-[0.98] transition-transform cursor-pointer">
                <Plus className="w-4 h-4" />
                Deposit
              </div>
            </Link>
          </div>
        </div>

        {/* Stats — Only 3 active categories */}
        <div className="rounded-2xl bg-[oklch(0.18,0.04,290)] border border-[oklch(0.30,0.06,290)] p-3">
          <div className="flex gap-2 overflow-x-auto scrollbar-none">
            {[
              { label: 'Entry Fees', amount: `+${formatCoins(stats.totalEntry)}`, color: 'text-green-400', icon: ArrowDownLeft },
              { label: 'Prize Paid', amount: `-${formatCoins(stats.totalPrize)}`, color: 'text-purple-400', icon: Gift },
              { label: 'Refunded', amount: `-${formatCoins(stats.totalRefund)}`, color: 'text-orange-400', icon: TrendingDown },
              { label: 'Withdrawn', amount: `-${formatCoins(stats.totalWithdrawal)}`, color: 'text-yellow-400', icon: Upload },
            ].map((stat) => (
              <div key={stat.label}
                className="flex items-center gap-2 px-3 py-2 rounded-xl bg-[oklch(0.22,0.04,290)] border border-[oklch(0.28,0.05,290)] shrink-0 min-w-[120px]">
                <stat.icon className={`w-4 h-4 ${stat.color} shrink-0`} />
                <div>
                  <p className="text-[10px] text-[oklch(0.45,0.04,290)] leading-tight">{stat.label}</p>
                  <p className={`text-xs font-bold ${stat.color} leading-tight`}>{stat.amount}</p>
                </div>
              </div>
            ))}
          </div>
        </div>

        {/* Transaction History Header */}
        <div className="text-center py-2">
          <h2 className="text-lg font-bold bg-gradient-to-r from-cyan-400 to-teal-400 bg-clip-text text-transparent">
            Transaction History
          </h2>
          <p className="text-[11px] text-[oklch(0.45,0.04,290)] mt-0.5">{transactions.length} total transactions</p>
        </div>

        {/* Filter Tabs — Only 3 active types */}
        <div className="rounded-2xl bg-[oklch(0.18,0.04,290)] border border-[oklch(0.30,0.06,290)] p-3">
          <div className="flex gap-2 overflow-x-auto scrollbar-none">
            {filterTabs.map((tab) => (
              <button key={tab.key} onClick={() => setActiveTab(tab.key)}
                className={`px-3.5 py-2 rounded-full text-xs font-medium whitespace-nowrap shrink-0 transition-all ${
                  activeTab === tab.key
                    ? 'bg-cyan-500/20 text-cyan-400 border border-cyan-500/30'
                    : 'bg-[oklch(0.22,0.04,290)] border border-[oklch(0.28,0.05,290)] text-[oklch(0.55,0.04,290)] hover:border-[oklch(0.40,0.06,290)]'
                }`}>
                {tab.label}
              </button>
            ))}
          </div>
        </div>

        {/* Transaction List */}
        <div className="space-y-2">
          {loading ? (
            <div className="flex flex-col items-center py-16 space-y-3">
              <div className="w-6 h-6 border-2 border-cyan-400/30 border-t-cyan-400 rounded-full animate-spin" />
              <p className="text-xs text-[oklch(0.45,0.04,290)]">Loading transactions...</p>
            </div>
          ) : filtered.length === 0 ? (
            <div className="flex flex-col items-center py-16 space-y-3">
              <Wallet className="w-10 h-10 text-[oklch(0.25,0.04,290)]" />
              <p className="text-xs text-[oklch(0.40,0.04,290)]">
                No {activeTab === 'all' ? '' : activeTab.replace('_', ' ')} transactions found
              </p>
            </div>
          ) : (
            <div className="space-y-2">
              {filtered.map((txn) => {
                const credit = isCredit(txn);
                const txnIcon = getTxnIcon(txn);
                const statusKey = (txn.paymentStatus || txn.status || '').toLowerCase();
                const st = statusConfig[statusKey];
                const cat = getTransactionCategory(txn._raw || {});

                return (
                  <button key={txn.id} onClick={() => setSelectedTxn(txn)}
                    className="w-full text-left p-3.5 rounded-xl bg-[oklch(0.18,0.04,290)] border border-[oklch(0.25,0.05,290)] hover:border-[oklch(0.35,0.06,290)] transition-colors active:scale-[0.99]">

                    <div className="flex items-center gap-3">
                      <div className={`w-10 h-10 rounded-xl ${txnIcon.bg} flex items-center justify-center shrink-0`}>
                        {txnIcon.icon}
                      </div>
                      <div className="flex-1 min-w-0">
                        <p className="text-sm font-medium text-white truncate">{getTxnTitle(txn)}</p>
                        <p className="text-[10px] text-[oklch(0.45,0.04,290)] truncate">{getTxnSubtitle(txn)}</p>
                      </div>
                      <div className="flex items-center gap-2 shrink-0">
                        <div className="text-right">
                          <p className={`text-sm font-semibold ${credit ? 'text-green-400' : 'text-red-400'}`}>
                            {credit ? '+' : '-'}{formatCoins(txn.amount || 0)}
                          </p>
                          <p className="text-[10px] text-[oklch(0.40,0.04,290)]">{txn.timestamp || ''}</p>
                        </div>
                        <ChevronRight className="w-4 h-4 text-[oklch(0.30,0.04,290)]" />
                      </div>
                    </div>

                    {/* Bottom bar */}
                    <div className="flex items-center justify-between mt-2 pt-2 border-t border-[oklch(0.22,0.04,290)]">
                      <p className="text-[10px] text-[oklch(0.35,0.04,290)] truncate font-mono">
                        {txn.transactionId || txn.id}
                      </p>
                      <div className="flex items-center gap-2 shrink-0 ml-2">
                        {getTxnMeta(txn) && (
                          <p className="text-[10px] text-[oklch(0.50,0.04,290)]">{getTxnMeta(txn)}</p>
                        )}
                        {st && (
                          <span className={`inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-[10px] font-medium ${st.color}`}>
                            {st.icon} {statusKey.charAt(0).toUpperCase() + statusKey.slice(1)}
                          </span>
                        )}
                      </div>
                    </div>
                  </button>
                );
              })}
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
