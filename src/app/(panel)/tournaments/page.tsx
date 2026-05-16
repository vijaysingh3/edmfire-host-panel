'use client';

import { useState, useEffect } from 'react';
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
} from 'lucide-react';
import { useAuth } from '@/context/AuthContext';
import { fetchRemoteConfig, getRemoteString, RC_KEYS } from '@/lib/remoteConfig';
import { rtdbGet } from '@/lib/rtdb';
import { collection, getDocs, query, orderBy } from 'firebase/firestore';
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
    if (diffMins < 60) return `${diffMins} min ago`;
    if (diffHours < 24) return `${diffHours} hrs ago`;
    if (diffDays < 7) return `${diffDays} days ago`;
    if (diffDays < 30) return `${Math.floor(diffDays / 7)} weeks ago`;
    return `${Math.floor(diffDays / 30)} months ago`;
  } catch {
    return createdAt;
  }
}

// ═══════════════════════════════════════════════════
// TYPES
// ═══════════════════════════════════════════════════
interface TournamentItem {
  tournamentId: string;
  tournamentType: string;
  title: string;
  status: string;
  joiningFee: number;
  pricePool: number;
  joinedCount: number;
  maxSlots: number;
  dateTime: string;
  createdAt: string;
  mode: string;
  map: string;
  perKill: number;
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
// MAIN COMPONENT
// ═══════════════════════════════════════════════════
export default function TournamentsPage() {
  const { user, isLoading: authLoading } = useAuth();

  // ── UI State — Default tab = Upcoming ──
  const [search, setSearch] = useState('');
  const [activeTab, setActiveTab] = useState('Upcoming');

  // ── Data State ──
  const [tournaments, setTournaments] = useState<TournamentItem[]>([]);
  const [configLoading, setConfigLoading] = useState(true);
  const [dataLoading, setDataLoading] = useState(false);

  // ═══════════════════════════════════════════════════
  // INIT — Fetch Remote Config + Load Tournaments
  // ═══════════════════════════════════════════════════
  useEffect(() => {
    if (authLoading || !user) return;
    const init = async () => {
      setConfigLoading(true);

      await fetchRemoteConfig();

      const rtdbUrl = getRemoteString(RC_KEYS.RTDB_URL);
      const rtdbSecret = getRemoteString(RC_KEYS.RTDB_SECRET);

      if (!rtdbUrl || !rtdbSecret) {
        toast.warning('Config error: URL or Secret missing');
        setConfigLoading(false);
        return;
      }

      setConfigLoading(false);
      await loadTournaments();
    };
    init();
  }, [user, authLoading]);

  // ═══════════════════════════════════════════════════
  // LOAD TOURNAMENTS — Firestore myMatches + RTDB TournamentMeta
  // ═══════════════════════════════════════════════════
  const loadTournaments = async () => {
    if (!user || dataLoading) return;

    setDataLoading(true);

    try {
      // Step 1: Firestore — hosts/{uid}/myMatches
      const snap = await getDocs(
        query(collection(db, 'hosts', user.uid, 'myMatches'), orderBy('__name__', 'desc'))
      );

      if (snap.empty) {
        setTournaments([]);
        setDataLoading(false);
        return;
      }

      // Group by type
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

      // Step 2: For each type, fetch RTDB TournamentMeta
      const allTournaments: TournamentItem[] = [];

      for (const type of Object.keys(grouped)) {
        try {
          const metaPath = `Tournaments/TournamentMeta/${type}`;
          const data = await rtdbGet(metaPath);

          if (!data || typeof data !== 'object') continue;

          const ids = grouped[type];

          for (const [id, meta] of Object.entries(data)) {
            if (!ids.includes(id)) continue;

            const m = meta as Record<string, any>;
            const feePaisa = m.JoiningFee || 0;
            const poolPaisa = m.PricePool || 0;
            const joined = m.JoinedPlayersCount || 0;
            const maxSlots = m.SlotNumbers || 0;

            allTournaments.push({
              tournamentId: id,
              tournamentType: type,
              title: m.Title || id,
              status: m.Status || 'Unknown',
              joiningFee: feePaisa,
              pricePool: poolPaisa,
              joinedCount: joined,
              maxSlots,
              dateTime: m.DateTime || '',
              createdAt: m.CreatedAt || '',
              mode: m.Type || '',
              map: m.Map || '',
              perKill: m.PerKill || 0,
            });
          }
        } catch (e: any) {
          console.error(`Failed to load ${type} meta:`, e);
        }
      }

      // Sort: newest first
      allTournaments.sort((a, b) => {
        if (!a.createdAt && !b.createdAt) return 0;
        if (!a.createdAt) return 1;
        if (!b.createdAt) return -1;
        return b.createdAt.localeCompare(a.createdAt);
      });

      setTournaments(allTournaments);
      toast.success(`${allTournaments.length} tournaments loaded`);

    } catch (e: any) {
      toast.error('Failed to load tournaments', { description: e.message });
    } finally {
      setDataLoading(false);
    }
  };

  // ═══════════════════════════════════════════════════
  // FILTER + SEARCH
  // ═══════════════════════════════════════════════════
  let filtered = tournaments;

  if (activeTab !== 'All') {
    filtered = filtered.filter((t) => {
      if (['Upcoming', 'Ongoing', 'Completed'].includes(activeTab)) {
        return t.status === activeTab;
      }
      const tabType = tabToType[activeTab];
      return tabType && t.tournamentType === tabType;
    });
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
        {tournaments.length > 0 && (
          <p className="text-xs font-medium text-[oklch(0.60,0.04,290)]">
            {filtered.length} of {tournaments.length} tournaments
          </p>
        )}

        {/* Loading State */}
        {isLoading && tournaments.length === 0 && (
          <div className="flex flex-col items-center py-16 space-y-3">
            <div className="w-8 h-8 border-2 border-blue-500/30 border-t-blue-500 rounded-full animate-spin" />
            <p className="text-xs text-[oklch(0.45,0.04,290)]">Loading tournaments...</p>
          </div>
        )}

        {/* Tournament List */}
        {!isLoading && tournaments.length > 0 && (
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
                    <div className="p-4 rounded-xl bg-[oklch(0.18,0.04,290)] border border-[oklch(0.25,0.05,290)] hover:border-[oklch(0.35,0.06,290)] transition-colors active:scale-[0.99] cursor-pointer">

                      {/* Row 1 — Type Badge + Status + Arrow */}
                      <div className="flex items-center justify-between mb-2">
                        <div className="flex items-center gap-2 min-w-0">
                          <span className={`inline-flex items-center gap-1 px-2 py-0.5 rounded-md text-[10px] font-bold shrink-0 ${tc.text}`}>
                            {tc.icon}
                            {tc.label}
                          </span>
                          <span className="text-[10px] font-mono text-[oklch(0.50,0.04,290)] truncate">
                            {tour.tournamentId}
                          </span>
                        </div>
                        <div className="flex items-center gap-2 shrink-0 ml-2">
                          <span className={`inline-flex items-center px-2 py-0.5 rounded-full text-[10px] font-bold border ${sc}`}>
                            {tour.status}
                          </span>
                          <ChevronRight className="w-4 h-4 text-[oklch(0.30,0.04,290)]" />
                        </div>
                      </div>

                      {/* Row 2 — Title */}
                      {tour.title && tour.title !== tour.tournamentId && (
                        <p className="text-sm font-semibold text-white mb-2.5 leading-snug">{tour.title}</p>
                      )}

                      {/* Row 3 — Info: Fee | Prize | Schedule (responsive wrap) */}
                      <div className="flex flex-wrap items-center gap-x-4 gap-y-1.5 mb-2.5">
                        <div className="flex items-center gap-1.5">
                          <Coins className="w-3.5 h-3.5 text-yellow-400 shrink-0" />
                          <span className="text-xs text-[oklch(0.50,0.04,290)]">Entry:</span>
                          <span className="text-xs font-bold text-white">{formatRupees(tour.joiningFee)}</span>
                        </div>

                        <div className="flex items-center gap-1.5">
                          <Trophy className="w-3.5 h-3.5 text-purple-400 shrink-0" />
                          <span className="text-xs text-[oklch(0.50,0.04,290)]">Prize:</span>
                          <span className="text-xs font-bold text-white">{formatRupees(tour.pricePool)}</span>
                        </div>

                        <div className="flex items-center gap-1.5">
                          <Clock className="w-3.5 h-3.5 text-blue-400 shrink-0" />
                          <span className="text-xs font-semibold text-white">{tour.dateTime || 'N/A'}</span>
                        </div>
                      </div>

                      {/* Row 4 — Tags: Map + Mode + PerKill */}
                      {(tour.map || tour.mode || tour.perKill > 0) && (
                        <div className="flex flex-wrap items-center gap-1.5 mb-2.5">
                          {tour.map && (
                            <span className="px-2 py-0.5 rounded-md bg-[oklch(0.22,0.04,290)] text-[10px] text-[oklch(0.55,0.04,290)] font-medium">
                              {tour.map}
                            </span>
                          )}
                          {tour.mode && (
                            <span className="px-2 py-0.5 rounded-md bg-[oklch(0.22,0.04,290)] text-[10px] text-[oklch(0.55,0.04,290)] font-medium">
                              {tour.mode}
                            </span>
                          )}
                          {tour.perKill > 0 && (
                            <span className="px-2 py-0.5 rounded-md bg-[oklch(0.22,0.04,290)] text-[10px] text-[oklch(0.55,0.04,290)] font-medium">
                              Per Kill: {formatRupees(tour.perKill)}
                            </span>
                          )}
                        </div>
                      )}

                      {/* Row 5 — Players Progress + Time */}
                      <div className="flex items-center gap-3">
                        {!isCompleted ? (
                          <div className="flex-1 min-w-0">
                            <div className="flex items-center justify-between mb-1">
                              <div className="flex items-center gap-1">
                                <Users className="w-3 h-3 text-[oklch(0.45,0.04,290)]" />
                                <span className="text-[10px] text-[oklch(0.55,0.04,290)]">
                                  {tour.joinedCount}/{tour.maxSlots} Joined
                                </span>
                              </div>
                              <span className="text-[10px] font-bold text-white">{progressPercent}%</span>
                            </div>
                            <div className="h-1.5 rounded-full bg-[oklch(0.25,0.05,290)] overflow-hidden">
                              <div
                                className="h-full rounded-full bg-gradient-to-r from-blue-500 to-indigo-500 transition-all duration-500"
                                style={{ width: `${progressPercent}%` }}
                              />
                            </div>
                          </div>
                        ) : (
                          <div className="flex-1 flex items-center gap-1">
                            <Users className="w-3 h-3 text-[oklch(0.45,0.04,290)]" />
                            <span className="text-[10px] text-[oklch(0.55,0.04,290)]">
                              {tour.joinedCount}/{tour.maxSlots} Played
                            </span>
                          </div>
                        )}
                        <span className="text-[10px] text-[oklch(0.35,0.04,290)] shrink-0">
                          {formatTimeAgo(tour.createdAt)}
                        </span>
                      </div>
                    </div>
                  </Link>
                );
              })
            )}
          </div>
        )}

        {/* Empty State */}
        {!isLoading && tournaments.length === 0 && (
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
