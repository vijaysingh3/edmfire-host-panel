'use client';

import { useState } from 'react';
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
} from 'lucide-react';

const filterTabs = [
  'All',
  'Entry Fee',
  'Refund',
  'Withdrawal',
  'Deposit',
];

const demoTransactions = [
  {
    id: 'TXN_4F8A21',
    type: 'entry_fee',
    title: 'Entry Fee Received',
    subtitle: 'Player: ShadowKiller',
    meta: 'Tournament: EDM_279',
    amount: '+30',
    time: '5 min ago',
    icon: '🎮',
  },
  {
    id: 'TXN_7B2E93',
    type: 'entry_fee',
    title: 'Entry Fee Received',
    subtitle: 'Player: ProSniper_X',
    meta: 'Tournament: EDM_279',
    amount: '+30',
    time: '12 min ago',
    icon: '🎮',
  },
  {
    id: 'TXN_1C5D67',
    type: 'entry_fee',
    title: 'Entry Fee Received',
    subtitle: 'Player: DarkPhoenix99',
    meta: 'Tournament: EDM_280',
    amount: '+50',
    time: '25 min ago',
    icon: '🎮',
  },
  {
    id: 'TXN_9A3F14',
    type: 'entry_fee',
    title: 'Entry Fee Received',
    subtitle: 'Player: NightWolf',
    meta: 'Tournament: EDM_280',
    amount: '+50',
    time: '40 min ago',
    icon: '🎮',
  },
  {
    id: 'TXN_2E8B56',
    type: 'refund',
    title: 'Match Cancelled Refund',
    subtitle: 'Player: AceGamer_01',
    meta: 'Tournament: EDM_275',
    amount: '-30',
    time: '1 hr ago',
    icon: '🔄',
  },
  {
    id: 'TXN_6D1C89',
    type: 'refund',
    title: 'Match Cancelled Refund',
    subtitle: 'Player: BlazeMaster',
    meta: 'Tournament: EDM_275',
    amount: '-30',
    time: '1 hr ago',
    icon: '🔄',
  },
  {
    id: 'TXN_3F7A42',
    type: 'entry_fee',
    title: 'Entry Fee Received',
    subtitle: 'Player: ThunderStrike',
    meta: 'Tournament: EDM_278',
    amount: '+50',
    time: '2 hrs ago',
    icon: '🎮',
  },
  {
    id: 'TXN_8B4E17',
    type: 'entry_fee',
    title: 'Entry Fee Received',
    subtitle: 'Player: IronFist777',
    meta: 'Tournament: EDM_278',
    amount: '+50',
    time: '2 hrs ago',
    icon: '🎮',
  },
  {
    id: 'UTR_4521987365',
    type: 'withdrawal',
    title: 'Withdrawal to UPI',
    subtitle: 'vijay@upi',
    meta: '',
    amount: '-2,000',
    time: '3 hrs ago',
    icon: '📤',
    status: 'Completed',
  },
  {
    id: 'UTR_7891234560',
    type: 'deposit',
    title: 'Deposit via UPI',
    subtitle: 'Razorpay Payment',
    meta: '',
    amount: '+5,000',
    time: '5 hrs ago',
    icon: '📥',
    status: 'Completed',
  },
  {
    id: 'UTR_3216549870',
    type: 'withdrawal',
    title: 'Withdrawal to Paytm',
    subtitle: 'vijay@paytm',
    meta: '',
    amount: '-1,500',
    time: '8 hrs ago',
    icon: '📤',
    status: 'Pending',
  },
  {
    id: 'TXN_5C9D23',
    type: 'refund',
    title: 'Match Cancelled Refund',
    subtitle: 'Player: ViperShot',
    meta: 'Tournament: EDM_273',
    amount: '-50',
    time: '10 hrs ago',
    icon: '🔄',
  },
  {
    id: 'UTR_6549871230',
    type: 'deposit',
    title: 'Deposit via Paytm',
    subtitle: 'Paytm Wallet',
    meta: '',
    amount: '+3,000',
    time: '1 day ago',
    icon: '📥',
    status: 'Failed',
  },
];

const typeColors: Record<string, string> = {
  entry_fee: 'text-green-400 bg-green-500/15',
  refund: 'text-orange-400 bg-orange-500/15',
  withdrawal: 'text-yellow-400 bg-yellow-500/15',
  deposit: 'text-cyan-400 bg-cyan-500/15',
};

const statusConfig: Record<string, { color: string; icon: React.ReactNode }> = {
  Completed: { color: 'text-green-400 bg-green-500/15', icon: <CheckCircle2 className="w-3 h-3" /> },
  Pending: { color: 'text-yellow-400 bg-yellow-500/15', icon: <Clock className="w-3 h-3" /> },
  Failed: { color: 'text-red-400 bg-red-500/15', icon: <XCircle className="w-3 h-3" /> },
};

export default function RefundPage() {
  const [activeTab, setActiveTab] = useState('All');

  const filtered =
    activeTab === 'All'
      ? demoTransactions
      : demoTransactions.filter((t) => t.type.toLowerCase().replace('_', ' ') === activeTab.toLowerCase());

  return (
    <div className="min-h-screen pb-20 lg:pb-6">
      {/* header */}
      <header className="bg-gradient-to-r from-cyan-500 to-teal-700 px-4 lg:px-6 py-6 sticky top-0 z-20">
        <div className="max-w-4xl mx-auto">
          <h1 className="text-xl lg:text-2xl font-extrabold text-white flex items-center gap-2">
            <Wallet className="w-6 h-6" />
            Wallet
          </h1>
          <p className="text-white/60 text-sm mt-1">
            Manage coins, transactions &amp; refunds
          </p>
        </div>
      </header>

      <div className="max-w-4xl mx-auto px-4 lg:px-6 py-6 space-y-5">
        {/* balance card */}
        <div className="rounded-2xl bg-gradient-to-br from-cyan-600/20 via-[oklch(0.18,0.04,290)] to-teal-600/10 border border-cyan-500/20 p-5 lg:p-6">
          <div className="flex items-center gap-3 mb-4">
            <div className="w-12 h-12 rounded-xl bg-cyan-500/20 flex items-center justify-center">
              <Wallet className="w-6 h-6 text-cyan-400" />
            </div>
            <div>
              <p className="text-xs text-[oklch(0.55,0.04,290)]">Total Balance</p>
              <p className="text-2xl font-bold text-white">24,580 <span className="text-sm font-normal text-cyan-400">coins</span></p>
            </div>
          </div>

          {/* action buttons */}
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

        {/* stats tabs */}
        <div className="rounded-2xl bg-[oklch(0.18,0.04,290)] border border-[oklch(0.30,0.06,290)] p-3">
          <div className="flex gap-2 overflow-x-auto scrollbar-none">
            {[
              { label: "Today's Earnings", amount: '+2,400', color: 'text-cyan-400', icon: TrendingUp },
              { label: 'Received', amount: '+18,000', color: 'text-green-400', icon: ArrowDownLeft },
              { label: 'Refunded', amount: '-1,520', color: 'text-orange-400', icon: TrendingDown },
              { label: 'Withdrawn', amount: '-3,500', color: 'text-yellow-400', icon: ArrowUpRight },
            ].map((stat) => (
              <div
                key={stat.label}
                className="flex items-center gap-2 px-3 py-2 rounded-xl bg-[oklch(0.22,0.04,290)] border border-[oklch(0.28,0.05,290)] shrink-0 min-w-[120px]"
              >
                <stat.icon className={`w-4 h-4 ${stat.color} shrink-0`} />
                <div>
                  <p className="text-[10px] text-[oklch(0.45,0.04,290)] leading-tight">
                    {stat.label}
                  </p>
                  <p className={`text-xs font-bold ${stat.color} leading-tight`}>
                    {stat.amount}
                  </p>
                </div>
              </div>
            ))}
          </div>
        </div>

        {/* transaction history header */}
        <div className="text-center py-2">
          <h2 className="text-lg font-bold bg-gradient-to-r from-cyan-400 to-teal-400 bg-clip-text text-transparent">
            Transaction History
          </h2>
        </div>

        {/* filter tabs */}
        <div className="rounded-2xl bg-[oklch(0.18,0.04,290)] border border-[oklch(0.30,0.06,290)] p-3">
          <div className="flex gap-2 overflow-x-auto scrollbar-none">
            {filterTabs.map((tab) => (
              <button
                key={tab}
                onClick={() => setActiveTab(tab)}
                className={`px-3.5 py-2 rounded-full text-xs font-medium whitespace-nowrap shrink-0 transition-all ${
                  activeTab === tab
                    ? 'bg-cyan-500/20 text-cyan-400 border border-cyan-500/30'
                    : 'bg-[oklch(0.22,0.04,290)] border border-[oklch(0.28,0.05,290)] text-[oklch(0.55,0.04,290)] hover:border-[oklch(0.40,0.06,290)]'
                }`}
              >
                {tab}
              </button>
            ))}
          </div>
        </div>

        {/* transaction list */}
        <div className="space-y-2">
          {filtered.length === 0 ? (
            <div className="flex flex-col items-center py-16 space-y-3">
              <Wallet className="w-10 h-10 text-[oklch(0.30,0.04,290)]" />
              <p className="text-xs text-[oklch(0.40,0.04,290)]">
                No {activeTab} transactions found
              </p>
            </div>
          ) : (
            <div className="space-y-2">
              {filtered.map((txn) => {
                const st = txn.status ? statusConfig[txn.status] : null;
                return (
                  <div
                    key={txn.id}
                    className="p-3.5 rounded-xl bg-[oklch(0.18,0.04,290)] border border-[oklch(0.25,0.05,290)] hover:border-[oklch(0.35,0.06,290)] transition-colors active:scale-[0.99] cursor-pointer"
                  >
                    <div className="flex items-center gap-3">
                      <div
                        className={`w-10 h-10 rounded-xl ${typeColors[txn.type]} flex items-center justify-center text-lg shrink-0`}
                      >
                        {txn.icon}
                      </div>
                      <div className="flex-1 min-w-0">
                        <p className="text-sm font-medium text-white truncate">
                          {txn.title}
                        </p>
                        <p className="text-[10px] text-[oklch(0.45,0.04,290)] truncate">
                          {txn.subtitle}
                        </p>
                      </div>
                      <div className="text-right shrink-0">
                        <p
                          className={`text-sm font-semibold ${
                            txn.amount.startsWith('+')
                              ? 'text-green-400'
                              : 'text-red-400'
                          }`}
                        >
                          {txn.amount}
                        </p>
                        <p className="text-[10px] text-[oklch(0.40,0.04,290)]">
                          {txn.time}
                        </p>
                      </div>
                    </div>

                    <div className="flex items-center justify-between mt-2 pt-2 border-t border-[oklch(0.25,0.05,290)]">
                      <p className="text-[10px] text-[oklch(0.35,0.04,290)] truncate">
                        {txn.type === 'withdrawal' || txn.type === 'deposit'
                          ? `UTR: ${txn.id}`
                          : `TXN: ${txn.id}`}
                      </p>
                      <div className="flex items-center gap-2 shrink-0 ml-2">
                        {txn.meta && (
                          <p className="text-[10px] text-[oklch(0.50,0.04,290)]">
                            {txn.meta}
                          </p>
                        )}
                        {st && (
                          <span className={`inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-[10px] font-medium ${st.color}`}>
                            {st.icon}
                            {txn.status}
                          </span>
                        )}
                      </div>
                    </div>
                  </div>
                );
              })}
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
