'use client';

import { useState, useEffect, useRef } from 'react';
import Link from 'next/link';
import {
  Trophy,
  Search,
  Users,
  Clock,
  Coins,
  Swords,
  Target,
  User,
  ChevronRight,
  RefreshCw,
  Zap,
  Gamepad2,
  Map,
} from 'lucide-react';
import { useAuth } from '@/context/AuthContext';
import { rtdbGet } from '@/lib/rtdb';
import { collection, getDocs, query, orderBy, where } from 'firebase/firestore';
import { db } from '@/lib/firebase';
import { toast } from 'sonner';

// ═══════════════════════════════════════════════════
// CONSTANTS
// ═══════════════════════════════════════════════════
const TOURNAMENT_TYPES = [
  { value: 'BattleRoyal', label: 'Battle Royale' },
  { value: 'ClashSquad', label: 'Clash Squad' },
  { value: 'FreeTournaments', label: 'Free' },
  { value: 'LoneWolf', label: 'Lone Wolf' },
];

// ═══════════════════════════════════════════════════
// BANK METHOD — PAISA → Coins
// ═══════════════════════════════════════════════════
function formatRupees(paisa: number): string {
  if (!paisa || paisa <= 0) return 'Free';
  const rupees = paisa / 100;
  if (rupees % 1 === 0) return `${Math.round(rupees)} Coins`;
  return `${rupees} Coins`;
}

// ═══════════════════════════════════════════════════
// TIME AGO
// ═══════════════════════════════════════════════════
function formatTimeAgo(createdAt: string): string {
  if (!createdAt) return '';
  try {
    const parts = createdAt.match(/(\d{2})\/(\d{2})\/(\d{4})\s+(\d{2}):(\d{2}):(\d{2})/);
    if (!parts) return createdAt;
    const [, day, month, year, hour, min, sec] = parts;
    const date = new Date(parseInt(year), parseInt(month) - 1, parseInt(day), parseInt(hour), parseInt(min), parseInt(sec));
    const diffMs = Date.now() - date.getTime();
    const diffMins = Math.floor(diffMs / 60000);
    const diffHours = Math.floor(diffMs / 3600000);
    const diffDays = Math.floor(diffMs / 86400000);

    if (diffMins < 1) return 'Just now';
    if (diffMins < 60) return `${diffMins}m ago`;
    if (diffHours < 24) return `${diffHours}h ago`;
    if (diffDays < 7) return `${diffDays}d ago`;
    if (diffDays < 30) return `${Math.floor(diffDays / 7)}w ago`;
    return `${Math.floor(diffDays / 30)}mo ago`;
  } catch {
    return createdAt;
  }
}

// ═══════════════════════════════════════════════════
// TYPES
// ═══════════════════════════════════════════════════
interface TournamentItem {
  tournamentId: string;
  tournamentType: string;   // RTDB: Mode field (BattleRoyal, ClashSquad, LoneWolf, FreeTournaments)
  title: string;
  status: string;
  joiningFee: number;       // RTDB: JoiningFee (paisa)
  pricePool: number;        // RTDB: PricePool (paisa)
  joinedCount: number;      // RTDB: JoinedPlayersCount
  maxSlots: number;         // RTDB: SlotNumbers
  dateTime: string;         // RTDB: DateTime
  createdAt: string;        // RTDB: CreatedAt
  gameType: string;         // RTDB: Type field (Solo, Duo, Squad)
  map: string;              // RTDB: Map
  perKill: number;          // RTDB: PerKill (paisa)
}

// ═══════════════════════════════════════════════════
// UI CONFIG
// ═══════════════════════════════════════════════════
const statusColors: Record<string, string> = {
  Upcoming: 'text-blue-400 bg-blue-500/15 border-blue-500/30',
  Ongoing: 'text-green-400 bg-green-500/15 border-green-500/30',
  Completed: 'text-[oklch(0.55,0.04,290)] bg-[oklch(0.25,0.05,290)] border-[oklch(0.30,0.06,290)]',
};

const typeConfig: Record<string, { bg: string; text: string; icon: React.ReactNode; label: string }> = {
  BattleRoyal: {
    bg: 'from-violet-500 to-purple-700',
    text: 'bg-violet-500/15 text-violet-400',
    icon: <Swords className="w-3.5 h-3.5" />,
    label: 'BR',
  },
  ClashSquad: {
    bg: 'from-orange-400 to-red-600',
    text: 'bg-orange-500/15 text-orange-400',
    icon: <Target className="w-3.5 h-3.5" />,
    label: 'CS',
  },
  FreeTournaments: {
    bg: 'from-green-400 to-emerald-600',
    text: 'bg-green-500/15 text-green-400',
    icon: <Zap className="w-3.5 h-3.5" />,
    label: 'Free',
  },
  LoneWolf: {
    bg: 'from-cyan-500 to-teal-700',
    text: 'bg-cyan-500/15 text-cyan-400',
    icon: <User className="w-3.5 h-3.5" />,
    label: 'LW',
  },
};

const filterTabs = ['All', 'Battle Royale', 'Clash Squad', 'Free', 'Lone Wolf', 'Upcoming', 'Ongoing', 'Completed'];

const tabToType: Record<string, string> = {
  'Battle Royale': 'BattleRoyal',
  'Clash Squad': 'ClashSquad',
  'Free': 'FreeTournaments',
  'Lone Wolf': 'LoneWolf',
};

// ═══════════════════════════════════════════════════
// STAT CELL — Gaming style stat box for list items
// ═══════════════════════════════════════════════════
function StatCell({ label, value, valueColor = 'text-white', icon }: {
  label: string;
  value: string;
  valueColor?: string;
  icon?: React.ReactNode;
}) {
  return (
    <div className="rounded-md bg-[oklch(0.22,0.04,290)] px-2 py-1.5">
      <p className="text-[8px] font-medium text-[oklch(0.45,0.04,290)] uppercase tracking-wide leading-none mb-0.5">
        {label}
      </p>
      <div className="flex items-center gap-1">
        {icon}
        <p className={`text-[11px] font-bold ${valueColor} leading-tight truncate`}>{value}</p>
      </div>
    </div>
  );
}

// ═══════════════════════════════════════════════════
// MAIN COMPONENT
// ═══════════════════════════════════════════════════
export default function TournamentsPage() {
  const { user, isLoading: authLoading } = useAuth();

  // ── UI State — Default tab = Upcoming ──
  const [search, setSearch] = useState('');
  const [activeTab, setActiveTab] = useState('Upcoming');

  // ── Data State ──
  const [allTournaments, setAllTournaments] = useState<TournamentItem[]>([]);
  const [configLoading, setConfigLoading] = useState(true);
  const [dataLoading, setDataLoading] = useState(false);

  // ── Cache: 50 second per-tab cache to avoid re-fetching on every tab switch ──
  const cacheRef = useRef<Record<string, { data: TournamentItem[]; ts: number }>>({});
  const CACHE_TTL = 50_000; // 50 seconds

  // ═══════════════════════════════════════════════════
  // INIT — Load Tournaments for default tab (Upcoming)
  // ═══════════════════════════════════════════════════
  useEffect(() => {
    if (authLoading || !user) return;
    setConfigLoading(false);
    loadTournaments();
  }, [user, authLoading]);

  // Reload when tab changes — uses cache if still valid
  useEffect(() => {
    if (authLoading || !user || configLoading) return;

    // Check cache first
    const cached = cacheRef.current[activeTab];
    if (cached && (Date.now() - cached.ts) < CACHE_TTL) {
      setAllTournaments(cached.data);
      return;
    }
    loadTournaments();
  }, [activeTab]);

  // ═══════════════════════════════════════════════════
  // LOAD TOURNAMENTS — Firestore myMatches + RTDB TournamentMeta
  // ═══════════════════════════════════════════════════
  const loadTournaments = async () => {
    if (!user || dataLoading) return;
    setDataLoading(true);

    try {
      // Determine which types to load based on active tab
      const isStatusTab = ['Upcoming', 'Ongoing', 'Completed'].includes(activeTab);
      const tabType = tabToType[activeTab]; // null for status tabs and 'All'

      // Step 1: Firestore — hosts/{uid}/myMatches
      // For type tabs: only fetch docs matching that type
      let snap;
      if (tabType) {
        // Type-specific: only query that type (faster)
        const { where } = await import('firebase/firestore');
        snap = await getDocs(
          query(collection(db, 'hosts', user.uid, 'myMatches'), where('tournamentType', '==', tabType), orderBy('__name__', 'desc'))
        );
      } else {
        snap = await getDocs(
          query(collection(db, 'hosts', user.uid, 'myMatches'), orderBy('__name__', 'desc'))
        );
      }

      if (snap.empty) {
        setAllTournaments([]);
        setDataLoading(false);
        return;
      }

      // Group by tournament type
      const grouped: Record<string, string[]> = {};
      snap.forEach((doc) => {
        const d = doc.data();
        const tType = d.tournamentType || '';
        const tId = d.tournamentId || '';
        if (tType && tId) {
          if (!grouped[tType]) grouped[tType] = [];
          grouped[tType].push(tId);
        }
      });

      // Step 2: For each type, fetch RTDB TournamentMeta (only needed types)
      const allTournaments: TournamentItem[] = [];

      for (const type of Object.keys(grouped)) {
        try {
          const metaPathStr = `Tournaments/TournamentMeta/${type}`;
          const data = await rtdbGet(metaPathStr);
          if (!data || typeof data !== 'object') continue;
          const ids = grouped[type];

          for (const [tId, meta] of Object.entries(data)) {
            if (!ids.includes(tId)) continue;
            const m = meta as Record<string, any>;

            // For status tabs: pre-filter by Status at fetch time
            if (isStatusTab && (m.Status || '') !== activeTab) continue;

            const feePaisa = m.JoiningFee || 0;
            const poolPaisa = m.PricePool || 0;
            const joined = m.JoinedPlayersCount || 0;
            const maxSlots = m.SlotNumbers || 0;

            allTournaments.push({
              tournamentId: tId,
              tournamentType: type,
              title: m.Title || tId,
              status: m.Status || 'Unknown',
              joiningFee: feePaisa,
              pricePool: poolPaisa,
              joinedCount: joined,
              maxSlots,
              dateTime: m.DateTime || '',
              createdAt: m.CreatedAt || '',
              gameType: m.Type || '',
              map: m.Map || '',
              perKill: m.PerKill || 0,
            });
          }
        } catch {}
      }

      // Sort: Tournament ID numeric part, biggest number first (EDM_750 > EDM_700 > EDM_100)
      allTournaments.sort((a, b) => {
        const extractNum = (id: string) => {
          if (!id) return 0;
          const m = id.match(/\d+/);
          return m ? parseInt(m[0], 10) : 0;
        };
        return extractNum(b.tournamentId) - extractNum(a.tournamentId);
      });

      // Store in cache for this tab
      cacheRef.current[activeTab] = { data: allTournaments, ts: Date.now() };

      setAllTournaments(allTournaments);
      if (allTournaments.length > 0) toast.success(`${allTournaments.length} tournaments loaded`);

    } catch (e: any) {
      toast.error('Failed to load tournaments', { description: e.message });
    } finally {
      setDataLoading(false);
    }
  };

  // ═══════════════════════════════════════════════════
  // FILTER + SEARCH
  // ═══════════════════════════════════════════════════
  let filtered = allTournaments;

  // For type tabs and status tabs: data is already filtered at fetch time
  // Only client-filter for 'All' tab (shows everything)
  if (activeTab !== 'All' && !['Upcoming', 'Ongoing', 'Completed'].includes(activeTab) && !tabToType[activeTab]) {
    // fallback — shouldn't happen
  }

  if (search.trim()) {
    const q = search.toLowerCase();
    filtered = filtered.filter((t) =>
      t.tournamentId.toLowerCase().includes(q) ||
      t.title.toLowerCase().includes(q)
    );
  }

  const isLoading = configLoading || dataLoading;

  return (
    <div className="min-h-screen pb-20 lg:pb-6">
      {/* Header */}
      <header className="bg-gradient-to-r from-blue-500 to-indigo-700 px-4 lg:px-6 py-6 sticky top-0 z-20">
        <div className="max-w-4xl mx-auto">
          <h1 className="text-xl lg:text-2xl font-extrabold text-white flex items-center gap-2">
            <Trophy className="w-6 h-6" />
            Tournaments
          </h1>
          <p className="text-white/60 text-sm mt-1">View all your hosted tournaments</p>
        </div>
      </header>

      <div className="max-w-4xl mx-auto px-4 lg:px-6 py-6 space-y-4">

        {/* Search Bar */}
        <div className="relative">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-[oklch(0.45,0.04,290)]" />
          <input
            type="text"
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            onFocus={() => { if (activeTab !== 'All') setActiveTab('All'); }}
            placeholder="Search by Tournament ID or Title"
            className="w-full h-11 rounded-xl bg-[oklch(0.18,0.04,290)] border border-[oklch(0.30,0.06,290)] pl-10 pr-4 text-sm text-white placeholder:text-[oklch(0.40,0.04,290)] focus:border-blue-500/50 focus:outline-none transition-colors"
          />
        </div>

        {/* Filter Tabs */}
        <div className="flex gap-2 overflow-x-auto pb-1 -mx-4 px-4 lg:-mx-0 lg:px-0 scrollbar-none">
          {filterTabs.map((tab) => (
            <button
              key={tab}
              onClick={() => setActiveTab(tab)}
              className={`px-3.5 py-2 rounded-full text-xs font-medium whitespace-nowrap shrink-0 transition-all ${
                activeTab === tab
                  ? 'bg-blue-500/20 text-blue-400 border border-blue-500/30'
                  : 'bg-[oklch(0.18,0.04,290)] border border-[oklch(0.30,0.06,290)] text-[oklch(0.55,0.04,290)] hover:border-[oklch(0.40,0.06,290)]'
              }`}
            >
              {tab}
            </button>
          ))}
        </div>

        {/* Refresh Button */}
        <button
          onClick={loadTournaments}
          disabled={isLoading}
          className="w-full h-11 rounded-xl bg-gradient-to-r from-blue-500 to-blue-600 text-white font-bold text-sm shadow-lg shadow-blue-500/20 disabled:opacity-40 flex items-center justify-center gap-2">
          {dataLoading ? (
            <div className="w-4 h-4 border-2 border-white/30 border-t-white rounded-full animate-spin" />
          ) : (
            <RefreshCw className="w-4 h-4" />
          )}
          REFRESH TOURNAMENTS
        </button>

        {/* Tournament Count */}
        {allTournaments.length > 0 && (
          <p className="text-xs font-medium text-[oklch(0.60,0.04,290)]">
            {filtered.length} of {allTournaments.length} tournaments
          </p>
        )}

        {/* Loading State */}
        {isLoading && allTournaments.length === 0 && (
          <div className="flex flex-col items-center py-16 space-y-3">
            <div className="w-8 h-8 border-2 border-blue-500/30 border-t-blue-500 rounded-full animate-spin" />
            <p className="text-xs text-[oklch(0.45,0.04,290)]">Loading tournaments...</p>
          </div>
        )}

        {/* Tournament List */}
        {!isLoading && allTournaments.length > 0 && (
          <div className="space-y-3">
            {filtered.length === 0 ? (
              <div className="flex flex-col items-center py-16 space-y-3">
                <Trophy className="w-10 h-10 text-[oklch(0.30,0.04,290)]" />
                <p className="text-xs text-[oklch(0.40,0.04,290)]">No tournaments match your filter</p>
              </div>
            ) : (
              filtered.map((tour) => {
                const progressPercent = tour.maxSlots > 0 ? Math.round((tour.joinedCount / tour.maxSlots) * 100) : 0;
                const tc = typeConfig[tour.tournamentType] || typeConfig.BattleRoyal;
                const sc = statusColors[tour.status] || statusColors.Completed;
                const isCompleted = tour.status === 'Completed';

                return (
                  <Link key={`${tour.tournamentType}-${tour.tournamentId}`} href={`/tournaments/${tour.tournamentId}?type=${tour.tournamentType}`}>
                    <div className="rounded-xl bg-[oklch(0.18,0.04,290)] border border-[oklch(0.25,0.05,290)] hover:border-[oklch(0.35,0.06,290)] transition-colors active:scale-[0.99] cursor-pointer overflow-hidden">

                      {/* Top Accent Line */}
                      <div className={`h-0.5 bg-gradient-to-r ${tc.bg}`} />

                      <div className="p-2.5 lg:p-3">

                        {/* Row 1 — Type Badge + ID + Status + Arrow */}
                        <div className="flex items-center justify-between mb-1.5">
                          <div className="flex items-center gap-1.5 min-w-0">
                            <span className={`inline-flex items-center gap-1 px-1.5 py-0.5 rounded-md text-[9px] font-bold shrink-0 ${tc.text}`}>
                              {tc.icon}
                              {tc.label}
                            </span>
                            <span className="text-[9px] font-mono text-[oklch(0.50,0.04,290)] truncate">
                              {tour.tournamentId}
                            </span>
                          </div>
                          <div className="flex items-center gap-1.5 shrink-0 ml-2">
                            <span className={`inline-flex items-center px-1.5 py-0.5 rounded-full text-[9px] font-bold border ${sc}`}>
                              {tour.status}
                            </span>
                            <ChevronRight className="w-3.5 h-3.5 text-[oklch(0.30,0.04,290)]" />
                          </div>
                        </div>

                        {/* Row 2 — Title */}
                        {tour.title && tour.title !== tour.tournamentId && (
                          <p className="text-[13px] font-bold text-white mb-1.5 leading-tight">{tour.title}</p>
                        )}

                        {/* Row 3 — Stat Grid (2x2 gaming style) */}
                        <div className="grid grid-cols-2 gap-1 mb-1.5">
                          <StatCell
                            label="Entry Fee"
                            value={formatRupees(tour.joiningFee)}
                            valueColor="text-yellow-400"
                            icon={<Coins className="w-3 h-3 text-yellow-400" />}
                          />
                          <StatCell
                            label="Prize Pool"
                            value={formatRupees(tour.pricePool)}
                            valueColor="text-purple-400"
                            icon={<Trophy className="w-3 h-3 text-purple-400" />}
                          />
                          <StatCell
                            label="Map"
                            value={tour.map || 'N/A'}
                            valueColor="text-cyan-300"
                            icon={<Map className="w-3 h-3 text-cyan-400" />}
                          />
                          <StatCell
                            label="Type"
                            value={tour.gameType || 'N/A'}
                            valueColor="text-emerald-300"
                            icon={<Gamepad2 className="w-3 h-3 text-emerald-400" />}
                          />
                        </div>

                        {/* Row 4 — Per Kill + DateTime */}
                        {(tour.perKill > 0 || tour.dateTime) && (
                          <div className="flex items-center justify-between mb-1.5">
                            {tour.perKill > 0 && (
                              <div className="flex items-center gap-1">
                                <Target className="w-3 h-3 text-red-400" />
                                <span className="text-[10px] font-semibold text-red-400">
                                  Per Kill: {formatRupees(tour.perKill)}
                                </span>
                              </div>
                            )}
                            {tour.dateTime && (
                              <div className="flex items-center gap-1">
                                <Clock className="w-3 h-3 text-blue-400" />
                                <span className="text-[10px] font-semibold text-blue-300">
                                  {tour.dateTime}
                                </span>
                              </div>
                            )}
                          </div>
                        )}

                        {/* Row 5 — Players Progress + Time Ago */}
                        <div className="flex items-center gap-2">
                          {!isCompleted ? (
                            <div className="flex-1 min-w-0">
                              <div className="flex items-center justify-between mb-0.5">
                                <div className="flex items-center gap-1">
                                  <Users className="w-3 h-3 text-[oklch(0.45,0.04,290)]" />
                                  <span className="text-[9px] text-[oklch(0.55,0.04,290)]">
                                    {tour.joinedCount}/{tour.maxSlots} Joined
                                  </span>
                                </div>
                                <span className="text-[9px] font-bold text-white">{progressPercent}%</span>
                              </div>
                              <div className="h-1 rounded-full bg-[oklch(0.25,0.05,290)] overflow-hidden">
                                <div
                                  className="h-full rounded-full bg-gradient-to-r from-blue-500 to-indigo-500 transition-all duration-500"
                                  style={{ width: `${progressPercent}%` }}
                                />
                              </div>
                            </div>
                          ) : (
                            <div className="flex-1 flex items-center gap-1">
                              <Users className="w-3 h-3 text-[oklch(0.45,0.04,290)]" />
                              <span className="text-[9px] text-[oklch(0.55,0.04,290)]">
                                {tour.joinedCount}/{tour.maxSlots} Played
                              </span>
                            </div>
                          )}
                          <span className="text-[9px] text-[oklch(0.35,0.04,290)] shrink-0">
                            {formatTimeAgo(tour.createdAt)}
                          </span>
                        </div>
                      </div>
                    </div>
                  </Link>
                );
              })
            )}
          </div>
        )}

        {/* Empty State */}
        {!isLoading && allTournaments.length === 0 && (
          <div className="flex flex-col items-center py-16 space-y-3">
            <Trophy className="w-10 h-10 text-[oklch(0.30,0.04,290)]" />
            <p className="text-xs text-[oklch(0.40,0.04,290)]">No tournaments found</p>
            <p className="text-[10px] text-[oklch(0.35,0.04,290)]">Create a tournament from Step 2</p>
          </div>
        )}
      </div>
    </div>
  );
}
