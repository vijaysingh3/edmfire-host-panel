'use client';

import { useState, useEffect, useMemo, useRef, useCallback } from 'react';
import Link from 'next/link';
import {
  Wallet,
  ArrowDownLeft,
  TrendingDown,
  TrendingUp,
  Plus,
  Minus,
  CheckCircle2,
  Clock,
  XCircle,
  ChevronRight,
  ArrowLeft,
  Gamepad2,
  RotateCcw,
  Gift,
  Upload,
  CircleDollarSign,
  Trash2,
} from 'lucide-react';
import { useAuth } from '@/context/AuthContext';
import {
  collection,
  getDocs,
  doc,
  writeBatch,
  onSnapshot as docOnSnapshot,
  type QueryDocumentSnapshot,
} from 'firebase/firestore';
import { db } from '@/lib/firebase';

// ═══════════════════════════════════════════════════
// TYPES
// ═══════════════════════════════════════════════════
interface TransactionItem {
  id: string;
  timestamp?: string;
  transactionType?: string;
  transactionId?: string;
  amount?: number;
  status?: string;
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
  category?: string;
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
// CONSTANTS
// ═══════════════════════════════════════════════════
const PAGE_SIZE = 50;

const filterTabs = [
  { key: 'all', label: 'All' },
  { key: 'deposit', label: 'Deposit' },
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

function safeTimestamp(val: any): string {
  if (!val) return '';
  if (typeof val === 'string') return val;
  // Handle Firestore {stringValue: "31 May 2026, 7:21 pm IST"} format
  if (val && typeof val === 'object' && 'stringValue' in val) {
    return typeof val.stringValue === 'string' ? val.stringValue : String(val.stringValue);
  }
  if (val && typeof val === 'object' && 'seconds' in val) {
    const d = new Date(val.seconds * 1000 + (val.nanoseconds || 0) / 1e6);
    return d.toLocaleString('en-IN', { day: '2-digit', month: 'short', year: 'numeric', hour: '2-digit', minute: '2-digit', hour12: true });
  }
  return String(val);
}

function getTransactionCategory(doc: Record<string, any>): string {
  const category = (doc.category || '').toLowerCase();
  const txnType = (doc.transactionType || '').toLowerCase();

  if (txnType === 'withdrawal') return 'withdrawal';
  if (category === 'deposit') return 'deposit';
  if (category === 'entryfee') return 'entry_fee';
  if (category === 'prizedistribution') return 'prize';
  if (category === 'refund') return 'refund';

  if (txnType === 'credit') {
    if (doc.utr) return 'deposit';
    return 'entry_fee';
  }
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

function isCredit(txn: TransactionItem): boolean {
  const raw = txn._raw || {};
  if (raw.transactionType === 'credit') return true;
  if (raw.transactionType === 'debit') return false;
  const cat = getTransactionCategory(raw);
  if (cat === 'entry_fee' || cat === 'deposit') return true;
  return false;
}

function getTxnIcon(txn: TransactionItem): { icon: React.ReactNode; bg: string } {
  const cat = getTransactionCategory(txn._raw || {});
  switch (cat) {
    case 'deposit':
      return { icon: <CircleDollarSign className="w-5 h-5" />, bg: 'bg-amber-500/15 text-amber-400' };
    case 'entry_fee':
      return { icon: <Gamepad2 className="w-5 h-5" />, bg: 'bg-cyan-500/15 text-cyan-400' };
    case 'prize':
      return { icon: <Gift className="w-5 h-5" />, bg: 'bg-red-500/15 text-red-400' };
    case 'refund':
      return { icon: <RotateCcw className="w-5 h-5" />, bg: 'bg-violet-500/15 text-violet-400' };
    case 'withdrawal':
      return { icon: <Upload className="w-5 h-5" />, bg: 'bg-orange-500/15 text-orange-400' };
    default:
      return { icon: <Wallet className="w-5 h-5" />, bg: 'bg-[oklch(0.22,0.04,290)] text-[oklch(0.55,0.04,290)]' };
  }
}

function getTxnTitle(txn: TransactionItem): string {
  const raw = txn._raw || {};
  const cat = getTransactionCategory(raw);
  switch (cat) {
    case 'deposit': return 'Deposit via UPI';
    case 'entry_fee': return raw.playerName ? `Entry Fee: ${raw.playerName}` : 'Entry Fee Received';
    case 'prize': return 'Prize Distribution';
    case 'refund': return raw.playerName ? `Refund: ${raw.playerName}` : 'Refund Processed';
    case 'withdrawal': return 'Withdrawal Request';
    default: return 'Transaction';
  }
}

function getTxnSubtitle(txn: TransactionItem): string {
  const raw = txn._raw || {};
  const cat = getTransactionCategory(raw);
  switch (cat) {
    case 'deposit': return raw.utr ? `UTR: ${raw.utr}` : 'UPI Payment';
    case 'entry_fee': return raw.playerUid ? `UID: ${raw.playerUid}` : (raw.tournamentId ? `Tournament: ${raw.tournamentId}` : 'Tournament Joining');
    case 'prize': return raw.tournamentId ? `Tournament: ${raw.tournamentId}` : 'Winners Paid';
    case 'refund':
      if (raw.playerName && raw.tournamentId) return `${raw.playerName} — ${raw.tournamentId}`;
      if (raw.playerName) return raw.playerName;
      return raw.tournamentId ? `Tournament: ${raw.tournamentId}` : 'Player Refund';
    case 'withdrawal': return raw.bankDetail || 'Bank / UPI';
    default: return raw.description || '';
  }
}

function getTxnMeta(txn: TransactionItem): string {
  const raw = txn._raw || {};
  if (raw.tournamentId) return `#${raw.tournamentId}`;
  return '';
}

// ═══════════════════════════════════════════════════
// SORT HELPER — Extract ms from any timestamp format
// Handles: Firestore Timestamp objects, numbers, ISO strings,
// and custom format like "31 May 2026, 7:21 pm IST"
// ═══════════════════════════════════════════════════
function parseCustomDateString(str: string): number {
  // Try native parser first
  const d = new Date(str);
  if (!isNaN(d.getTime())) return d.getTime();

  // Parse "31 May 2026, 7:21 pm IST" format
  const m = str.match(/^(\d{1,2})\s+(\w{3,9})\s+(\d{4}),\s*(\d{1,2}):(\d{2})\s*(am|pm)/i);
  if (m) {
    const months: Record<string, number> = {
      jan:0,feb:1,mar:2,apr:3,may:4,jun:5,
      jul:6,aug:7,sep:8,oct:9,nov:10,dec:11,
    };
    const mon = months[m[2].toLowerCase().slice(0,3)];
    if (mon === undefined) return 0;
    let h = parseInt(m[4]);
    if (m[6].toLowerCase() === 'pm' && h !== 12) h += 12;
    if (m[6].toLowerCase() === 'am' && h === 12) h = 0;
    return new Date(parseInt(m[3]), mon, parseInt(m[1]), h, parseInt(m[5])).getTime();
  }
  return 0;
}

function getTimestampMs(raw: Record<string, any>): number {
  const ts = raw.timestamp;
  if (!ts) return 0;
  // Firestore Timestamp object {seconds, nanoseconds}
  if (ts && typeof ts === 'object' && 'seconds' in ts) {
    return ts.seconds * 1000 + (ts.nanoseconds || 0) / 1e6;
  }
  // Handle {stringValue: "31 May 2026, 7:21 pm IST"} format
  if (ts && typeof ts === 'object' && 'stringValue' in ts) {
    return parseCustomDateString(String(ts.stringValue));
  }
  if (typeof ts === 'number') return ts;
  if (typeof ts === 'string') return parseCustomDateString(ts);
  return 0;
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
// PARSE DOC SNAPSHOT → TransactionItem (avoids duplication)
// ═══════════════════════════════════════════════════
function parseTxnDoc(docSnap: QueryDocumentSnapshot): TransactionItem {
  const data = docSnap.data();
  return {
    id: docSnap.id,
    _raw: data,
    timestamp: safeTimestamp(data.timestamp),
    transactionType: data.transactionType || '',
    transactionId: data.transactionId || docSnap.id,
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
  };
}

// ═══════════════════════════════════════════════════
// MAIN PAGE
// ═══════════════════════════════════════════════════
export default function WalletPage() {
  const { user, isLoading: authLoading } = useAuth();
  const [activeTab, setActiveTab] = useState('all');
  const [walletBalance, setWalletBalance] = useState(0);
  const [allTransactions, setAllTransactions] = useState<TransactionItem[]>([]);
  const [loading, setLoading] = useState(true);
  const [displayCount, setDisplayCount] = useState(PAGE_SIZE);
  const [selectedTxn, setSelectedTxn] = useState<TransactionItem | null>(null);

  const sentinelRef = useRef<HTMLDivElement | null>(null);

  // ── Clean History Modal State ──
  const [showCleanModal, setShowCleanModal] = useState(false);
  const [cleanType, setCleanType] = useState('all');
  const [cleaning, setCleaning] = useState(false);
  const [cleanResult, setCleanResult] = useState<{ deleted: number; message: string } | null>(null);

  // ── Aggregated stats from transactionRecord (saves read quota) ──
  const [recordStats, setRecordStats] = useState({
    totalDeposit: 0,
    entryFee: 0,
    totalPrizeDistribution: 0,
    totalRefunded: 0,
    withdrawnAmount: 0,
  });

  // ── Fetch ALL transactions once, sort client-side newest-first ──
  // Timestamp is {stringValue: "31 May 2026, 7:21 pm IST"} so we can't use
  // Firestore orderBy. Fetch all, sort once, then virtual-paginate the display.
  const loadTransactions = useCallback(async () => {
    if (!user) return;
    setLoading(true);
    try {
      const txnRef = collection(db, 'hosts', user.uid, 'transactionHistory');
      const snap = await getDocs(txnRef);
      const items = snap.docs.map(parseTxnDoc);
      // Client-side sort: newest first
      items.sort((a, b) => getTimestampMs(b._raw || {}) - getTimestampMs(a._raw || {}));
      setAllTransactions(items);
      setDisplayCount(PAGE_SIZE);
    } catch (e) {
      console.error('Transaction fetch error:', e);
    } finally {
      setLoading(false);
    }
  }, [user]);

  // Initial load
  useEffect(() => {
    if (authLoading || !user) return;
    loadTransactions();
  }, [user, authLoading, loadTransactions]);

  // ── Fetch Aggregated Stats from transactionRecord (5 docs only, no iteration) ──
  useEffect(() => {
    if (authLoading || !user) return;
    const recordRef = collection(db, 'hosts', user.uid, 'transactionRecord');
    getDocs(recordRef)
      .then((snap) => {
        const data: Record<string, number> = {};
        snap.forEach((d) => {
          const field = d.id;
          const val = d.data()?.amounts || 0;
          data[field] = val;
        });
        setRecordStats({
          totalDeposit: data.totalDeposit || 0,
          entryFee: data.entryFee || 0,
          totalPrizeDistribution: data.totalPrizeDistribution || 0,
          totalRefunded: data.totalRefunded || 0,
          withdrawnAmount: data.withdrawnAmount || 0,
        });
      })
      .catch((e) => console.error('transactionRecord fetch error:', e));
  }, [user, authLoading]);

  // ── Realtime Wallet Balance ──
  useEffect(() => {
    if (authLoading || !user) return;
    const walletRef = doc(db, 'hosts', user.uid, 'accountBalance', 'wallet');
    const unsubscribe = docOnSnapshot(walletRef, (snap) => {
      if (snap.exists()) {
        setWalletBalance(snap.data()?.walletBalance || 0);
      }
    }, () => {});
    return () => unsubscribe();
  }, [user, authLoading]);

  // ── Client-side filter (from all loaded data) ──
  const filtered = useMemo(() => {
    if (activeTab === 'all') return allTransactions;
    return allTransactions.filter((t) => {
      const cat = getTransactionCategory(t._raw || {});
      return cat === activeTab;
    });
  }, [allTransactions, activeTab]);

  // Reset visible count when switching type tabs
  useEffect(() => { setDisplayCount(PAGE_SIZE); }, [activeTab]);

  const hasMore = displayCount < filtered.length;

  // Virtual pagination: only render first `displayCount` items from sorted+filtered list
  const displayed = useMemo(() => filtered.slice(0, displayCount), [filtered, displayCount]);

  // ── Infinite Scroll via IntersectionObserver (no extra Firestore reads) ──
  useEffect(() => {
    const el = sentinelRef.current;
    if (!el) return;
    const observer = new IntersectionObserver(
      (entries) => {
        if (entries[0].isIntersecting && hasMore) {
          setDisplayCount((prev) => Math.min(prev + PAGE_SIZE, filtered.length));
        }
      },
      { rootMargin: '200px' }
    );
    observer.observe(el);
    return () => observer.disconnect();
  }, [hasMore, filtered.length]);

  // ── Stats (from transactionRecord — no iteration needed) ──
  const stats = useMemo(() => ({
    totalDeposit: recordStats.totalDeposit,
    totalEntry: recordStats.entryFee,
    totalPrize: recordStats.totalPrizeDistribution,
    totalRefund: recordStats.totalRefunded,
    totalWithdrawal: recordStats.withdrawnAmount,
  }), [recordStats]);

  // ── Clean History Handler ──
  const handleCleanHistory = async () => {
    if (!user || cleaning) return;
    setCleaning(true);
    setCleanResult(null);

    try {
      const txnRef = collection(db, 'hosts', user.uid, 'transactionHistory');
      const snap = await getDocs(txnRef);
      const now = Date.now();
      const cutoff = now - 24 * 60 * 60 * 1000; // 24 hours ago

      const toDelete: string[] = [];

      snap.forEach((docSnap) => {
        const data = docSnap.data();
        const tsMs = getTimestampMs(data);

        // Must be older than 24 hours
        if (tsMs === 0 || tsMs >= cutoff) return;

        // Filter by type
        if (cleanType !== 'all') {
          const cat = getTransactionCategory(data);
          if (cat !== cleanType) return;
        }

        toDelete.push(docSnap.id);
      });

      if (toDelete.length === 0) {
        setCleanResult({ deleted: 0, message: 'No transactions found older than 24 hours for this type.' });
        setCleaning(false);
        return;
      }

      // Batch delete (max 500 per batch)
      let deleted = 0;
      for (let i = 0; i < toDelete.length; i += 500) {
        const batch = writeBatch(db);
        const chunk = toDelete.slice(i, i + 500);
        chunk.forEach((id) => {
          batch.delete(doc(db, 'hosts', user.uid, 'transactionHistory', id));
        });
        await batch.commit();
        deleted += chunk.length;
      }

      setCleanResult({ deleted, message: `Successfully deleted ${deleted} transaction${deleted !== 1 ? 's' : ''}.` });

      // Refresh with paginated reload
      await loadTransactions();
    } catch (err) {
      console.error('Clean history error:', err);
      setCleanResult({ deleted: 0, message: 'Error deleting transactions. Try again.' });
    } finally {
      setCleaning(false);
    }
  };

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

    const categoryLabels: Record<string, string> = {
      deposit: 'Deposit',
      entry_fee: 'Entry Fee',
      prize: 'Prize Distribution',
      refund: 'Refund',
      withdrawal: 'Withdrawal',
      other: 'Other',
    };

    return (
      <div className="min-h-screen pb-20 lg:pb-6">
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
              ...(raw.utr ? [{ label: 'UTR', value: raw.utr }] : []),
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
              <p className="text-2xl font-bold text-white">{formatCoins(walletBalance)}</p>
            </div>
          </div>
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

        {/* Stats */}
        <div className="rounded-2xl bg-[oklch(0.18,0.04,290)] border border-[oklch(0.30,0.06,290)] p-3">
          <div className="flex gap-2 overflow-x-auto scrollbar-none">
            {[
              { label: 'Deposited', amount: `+${formatCoins(stats.totalDeposit)}`, color: 'text-amber-400', icon: CircleDollarSign },
              { label: 'Entry Fees', amount: `+${formatCoins(stats.totalEntry)}`, color: 'text-cyan-400', icon: ArrowDownLeft },
              { label: 'Prize Paid', amount: `-${formatCoins(stats.totalPrize)}`, color: 'text-red-400', icon: Gift },
              { label: 'Refunded', amount: `-${formatCoins(stats.totalRefund)}`, color: 'text-violet-400', icon: TrendingDown },
              { label: 'Withdrawn', amount: `-${formatCoins(stats.totalWithdrawal)}`, color: 'text-orange-400', icon: Upload },
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
        <div className="flex items-center justify-between py-2">
          <div className="text-center">
            <h2 className="text-lg font-bold bg-gradient-to-r from-cyan-400 to-teal-400 bg-clip-text text-transparent">
              Transaction History
            </h2>
            <p className="text-[11px] text-[oklch(0.45,0.04,290)] mt-0.5">
              {allTransactions.length > 0 ? `${filtered.length} transaction${filtered.length !== 1 ? 's' : ''}` : 'No transactions yet'}
            </p>
          </div>
          {allTransactions.length > 0 && (
            <button
              onClick={() => { setCleanType('all'); setCleanResult(null); setShowCleanModal(true); }}
              className="flex items-center gap-1.5 px-3 py-2 rounded-xl bg-red-500/10 border border-red-500/20 text-red-400 text-xs font-medium hover:bg-red-500/20 transition-colors active:scale-[0.97]">
              <Trash2 className="w-3.5 h-3.5" />
              Clean
            </button>
          )}
        </div>

        {/* Clean History Modal */}
        {showCleanModal && (
          <div className="fixed inset-0 z-50 flex items-end lg:items-center justify-center">
            <div className="absolute inset-0 bg-black/60 backdrop-blur-sm" onClick={() => !cleaning && setShowCleanModal(false)} />
            <div className="relative w-full max-w-md mx-4 mb-4 lg:mb-0 rounded-2xl bg-[oklch(0.16,0.04,290)] border border-[oklch(0.30,0.06,290)] p-5 space-y-4 animate-in slide-in-from-bottom-4">
              {/* Modal Header */}
              <div className="flex items-center gap-3">
                <div className="w-10 h-10 rounded-xl bg-red-500/15 flex items-center justify-center">
                  <Trash2 className="w-5 h-5 text-red-400" />
                </div>
                <div>
                  <h3 className="text-base font-bold text-white">Clean History</h3>
                  <p className="text-[11px] text-[oklch(0.50,0.04,290)]">Delete old transaction data</p>
                </div>
              </div>

              {/* Transaction Type Dropdown */}
              <div className="space-y-1.5">
                <label className="text-xs font-medium text-[oklch(0.60,0.04,290)]">Transaction Type</label>
                <select
                  value={cleanType}
                  onChange={(e) => setCleanType(e.target.value)}
                  disabled={cleaning}
                  className="w-full px-3 py-2.5 rounded-xl bg-[oklch(0.22,0.04,290)] border border-[oklch(0.30,0.06,290)] text-sm text-white focus:outline-none focus:border-cyan-500/50 transition-colors disabled:opacity-50 [&>option]:bg-[#1a1232] [&>option]:text-white"
                >
                  <option value="all">All Types</option>
                  <option value="deposit">Deposit</option>
                  <option value="entry_fee">Entry Fee</option>
                  <option value="prize">Prize Distribution</option>
                  <option value="refund">Refund</option>
                  <option value="withdrawal">Withdrawal</option>
                </select>
              </div>

              {/* Date Range Info */}
              <div className="flex items-center gap-2.5 px-3 py-2.5 rounded-xl bg-amber-500/10 border border-amber-500/20">
                <Clock className="w-4 h-4 text-amber-400 shrink-0" />
                <p className="text-xs text-amber-300">
                  Only transactions <span className="font-bold">older than 24 hours</span> will be deleted.
                </p>
              </div>

              {/* Result Message */}
              {cleanResult && (
                <div className={`flex items-center gap-2 px-3 py-2.5 rounded-xl ${
                  cleanResult.deleted > 0
                    ? 'bg-green-500/10 border border-green-500/20'
                    : 'bg-amber-500/10 border border-amber-500/20'
                }`}>
                  {cleanResult.deleted > 0
                    ? <CheckCircle2 className="w-4 h-4 text-green-400 shrink-0" />
                    : <Clock className="w-4 h-4 text-amber-400 shrink-0" />
                  }
                  <p className={`text-xs ${cleanResult.deleted > 0 ? 'text-green-300' : 'text-amber-300'}`}>{cleanResult.message}</p>
                </div>
              )}

              {/* Actions */}
              <div className="flex gap-2 pt-1">
                <button
                  onClick={() => setShowCleanModal(false)}
                  disabled={cleaning}
                  className="flex-1 py-2.5 rounded-xl bg-[oklch(0.22,0.04,290)] border border-[oklch(0.30,0.06,290)] text-sm font-medium text-[oklch(0.70,0.04,290)] hover:bg-[oklch(0.26,0.04,290)] transition-colors disabled:opacity-50"
                >
                  Cancel
                </button>
                <button
                  onClick={handleCleanHistory}
                  disabled={cleaning}
                  className="flex-1 py-2.5 rounded-xl bg-red-500 text-sm font-bold text-white hover:bg-red-600 transition-colors disabled:opacity-50 flex items-center justify-center gap-2"
                >
                  {cleaning ? (
                    <>
                      <div className="w-4 h-4 border-2 border-white/30 border-t-white rounded-full animate-spin" />
                      Deleting...
                    </>
                  ) : (
                    <>
                      <Trash2 className="w-4 h-4" />
                      Delete
                    </>
                  )}
                </button>
              </div>
            </div>
          </div>
        )}

        {/* Filter Tabs */}
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
          ) : displayed.length === 0 ? (
            <div className="flex flex-col items-center py-16 space-y-3">
              <Wallet className="w-10 h-10 text-[oklch(0.25,0.04,290)]" />
              <p className="text-xs text-[oklch(0.40,0.04,290)]">
                No {activeTab === 'all' ? '' : activeTab.replace('_', ' ')} transactions found
              </p>
            </div>
          ) : (
            <div className="space-y-2">
              {displayed.map((txn) => {
                const credit = isCredit(txn);
                const txnIcon = getTxnIcon(txn);
                const statusKey = (txn.paymentStatus || txn.status || '').toLowerCase();
                const st = statusConfig[statusKey];

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

          {/* Infinite Scroll Sentinel + Loading / End indicators */}
          {!loading && displayed.length > 0 && (
            <div ref={sentinelRef} className="py-4 flex flex-col items-center space-y-2">
              {!hasMore && (
                <p className="text-[11px] text-[oklch(0.35,0.04,290)]">You've seen all transactions</p>
              )}
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
