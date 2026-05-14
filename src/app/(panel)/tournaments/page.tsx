'use client';

import { useState } from 'react';
import Link from 'next/link';
import {
  Trophy,
  Search,
  Filter,
  Users,
  Clock,
  Coins,
  TrendingUp,
  Swords,
  Target,
  User,
  ChevronRight,
} from 'lucide-react';

const statusColors: Record<string, string> = {
  Upcoming: 'text-blue-400 bg-blue-500/15 border-blue-500/30',
  Ongoing: 'text-green-400 bg-green-500/15 border-green-500/30',
  Completed: 'text-[oklch(0.55,0.04,290)] bg-[oklch(0.25,0.05,290)] border-[oklch(0.30,0.06,290)]',
};

const typeColors: Record<string, { bg: string; text: string; icon: React.ReactNode }> = {
  'Battle Royale': {
    bg: 'from-violet-500 to-purple-700',
    text: 'bg-violet-500/15 text-violet-400',
    icon: <Swords className="w-3.5 h-3.5" />,
  },
  'Clash Squad': {
    bg: 'from-orange-400 to-red-600',
    text: 'bg-orange-500/15 text-orange-400',
    icon: <Target className="w-3.5 h-3.5" />,
  },
  'Lone Wolf': {
    bg: 'from-cyan-500 to-teal-700',
    text: 'bg-cyan-500/15 text-cyan-400',
    icon: <User className="w-3.5 h-3.5" />,
  },
};

const demoTournaments = [
  // Battle Royale
  { id: 'EDM_279', type: 'Battle Royale', status: 'Ongoing', entryFee: 30, joined: 87, maxPlayers: 100, schedule: 'Today, 8:00 PM', time: '15 min ago', prizePool: '2,500', profit: null },
  { id: 'EDM_280', type: 'Battle Royale', status: 'Ongoing', entryFee: 50, joined: 42, maxPlayers: 50, schedule: 'Today, 9:30 PM', time: '30 min ago', prizePool: '1,800', profit: null },
  { id: 'EDM_278', type: 'Battle Royale', status: 'Upcoming', entryFee: 30, joined: 65, maxPlayers: 100, schedule: 'Tomorrow, 6:00 PM', time: '2 hrs ago', prizePool: '2,000', profit: null },
  { id: 'EDM_275', type: 'Battle Royale', status: 'Completed', entryFee: 50, joined: 100, maxPlayers: 100, schedule: 'Yesterday, 8:00 PM', time: '1 day ago', prizePool: '4,000', profit: '+450' },
  { id: 'EDM_273', type: 'Battle Royale', status: 'Completed', entryFee: 30, joined: 95, maxPlayers: 100, schedule: '2 days ago', time: '2 days ago', prizePool: '2,200', profit: '+280' },

  // Clash Squad
  { id: 'EDM_281', type: 'Clash Squad', status: 'Ongoing', entryFee: 20, joined: 8, maxPlayers: 12, schedule: 'Today, 10:00 PM', time: '10 min ago', prizePool: '180', profit: null },
  { id: 'EDM_282', type: 'Clash Squad', status: 'Upcoming', entryFee: 20, joined: 3, maxPlayers: 12, schedule: 'Tomorrow, 7:00 PM', time: '4 hrs ago', prizePool: '180', profit: null },
  { id: 'EDM_276', type: 'Clash Squad', status: 'Completed', entryFee: 20, joined: 12, maxPlayers: 12, schedule: 'Yesterday, 7:00 PM', time: '1 day ago', prizePool: '180', profit: '+85' },

  // Lone Wolf
  { id: 'EDM_283', type: 'Lone Wolf', status: 'Upcoming', entryFee: 10, joined: 28, maxPlayers: 50, schedule: 'Tomorrow, 9:00 PM', time: '6 hrs ago', prizePool: '400', profit: null },
  { id: 'EDM_277', type: 'Lone Wolf', status: 'Completed', entryFee: 10, joined: 48, maxPlayers: 50, schedule: 'Yesterday, 9:30 PM', time: '1 day ago', prizePool: '400', profit: '+120' },
  { id: 'EDM_271', type: 'Lone Wolf', status: 'Completed', entryFee: 5, joined: 50, maxPlayers: 50, schedule: '3 days ago', time: '3 days ago', prizePool: '200', profit: '+95' },
];

const filterTabs = ['All', 'Battle Royale', 'Clash Squad', 'Lone Wolf', 'Upcoming', 'Ongoing', 'Completed'];

export default function TournamentsPage() {
  const [search, setSearch] = useState('');
  const [activeTab, setActiveTab] = useState('All');

  let filtered = demoTournaments;

  // filter by tab
  if (activeTab !== 'All') {
    filtered = filtered.filter((t) => {
      if (['Upcoming', 'Ongoing', 'Completed'].includes(activeTab)) {
        return t.status === activeTab;
      }
      return t.type === activeTab;
    });
  }

  // filter by search
  if (search.trim()) {
    filtered = filtered.filter((t) =>
      t.id.toLowerCase().includes(search.toLowerCase())
    );
  }

  return (
    <div className="min-h-screen">
      {/* header */}
      <header className="bg-gradient-to-r from-blue-500 to-indigo-700 px-4 lg:px-6 py-6 sticky top-0 z-20">
        <div className="max-w-4xl mx-auto">
          <h1 className="text-xl lg:text-2xl font-extrabold text-white flex items-center gap-2">
            <Trophy className="w-6 h-6" />
            Tournaments
          </h1>
          <p className="text-white/60 text-sm mt-1">
            View all your hosted tournaments
          </p>
        </div>
      </header>

      <div className="max-w-4xl mx-auto px-4 lg:px-6 py-6 space-y-4">
        {/* search bar */}
        <div className="relative">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-[oklch(0.45,0.04,290)]" />
          <input
            type="text"
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            placeholder="Search by Tournament ID (e.g. EDM_279)"
            className="w-full h-11 rounded-xl bg-[oklch(0.18,0.04,290)] border border-[oklch(0.30,0.06,290)] pl-10 pr-4 text-sm text-white placeholder:text-[oklch(0.40,0.04,290)] focus:border-blue-500/50 focus:outline-none transition-colors"
          />
        </div>

        {/* filter tabs */}
        <div className="flex gap-2 overflow-x-auto pb-1 -mx-4 px-4 lg:-mx-0 lg:px-0">
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

        {/* tournament list */}
        <div className="space-y-3">
          <p className="text-xs font-medium text-[oklch(0.60,0.04,290)]">
            Tournament History
          </p>

          {filtered.length === 0 ? (
            <div className="flex flex-col items-center py-16 space-y-3">
              <Trophy className="w-10 h-10 text-[oklch(0.30,0.04,290)]" />
              <p className="text-xs text-[oklch(0.40,0.04,290)]">
                No tournaments found
              </p>
            </div>
          ) : (
            <div className="space-y-2">
              {filtered.map((tour) => {
                const progressPercent = Math.round((tour.joined / tour.maxPlayers) * 100);
                const tc = typeColors[tour.type];
                const sc = statusColors[tour.status];
                const isCompleted = tour.status === 'Completed';

                return (
                  <Link key={tour.id} href={`/tournaments/${tour.id}`}>
                    <div className="p-4 rounded-xl bg-[oklch(0.18,0.04,290)] border border-[oklch(0.25,0.05,290)] hover:border-[oklch(0.35,0.06,290)] transition-colors active:scale-[0.99] cursor-pointer">
                      {/* top row — type badge + status + time */}
                      <div className="flex items-center justify-between mb-3">
                        <div className="flex items-center gap-2">
                          {/* tournament type badge */}
                          <span className={`inline-flex items-center gap-1 px-2.5 py-1 rounded-lg text-[10px] font-semibold ${tc.text}`}>
                            {tc.icon}
                            {tour.type}
                          </span>
                          <span className="text-[10px] font-mono text-[oklch(0.50,0.04,290)]">
                            {tour.id}
                          </span>
                        </div>
                        <div className="flex items-center gap-2 shrink-0">
                          <span className={`inline-flex items-center px-2.5 py-1 rounded-full text-[10px] font-semibold border ${sc}`}>
                            {tour.status}
                          </span>
                        </div>
                      </div>

                      {/* middle row — info */}
                      <div className="grid grid-cols-3 gap-3 mb-3">
                        {/* entry fee */}
                        <div className="flex items-center gap-1.5">
                          <Coins className="w-3.5 h-3.5 text-yellow-400 shrink-0" />
                          <div>
                            <p className="text-[10px] text-[oklch(0.40,0.04,290)] leading-tight">Entry Fee</p>
                            <p className="text-xs font-semibold text-white leading-tight">{tour.entryFee} coins</p>
                          </div>
                        </div>

                        {/* schedule or profit */}
                        {isCompleted ? (
                          <div className="flex items-center gap-1.5">
                            <TrendingUp className="w-3.5 h-3.5 text-green-400 shrink-0" />
                            <div>
                              <p className="text-[10px] text-[oklch(0.40,0.04,290)] leading-tight">My Profit</p>
                              <p className="text-xs font-semibold text-green-400 leading-tight">{tour.profit} coins</p>
                            </div>
                          </div>
                        ) : (
                          <div className="flex items-center gap-1.5">
                            <Clock className="w-3.5 h-3.5 text-blue-400 shrink-0" />
                            <div>
                              <p className="text-[10px] text-[oklch(0.40,0.04,290)] leading-tight">Schedule</p>
                              <p className="text-xs font-semibold text-white leading-tight">{tour.schedule}</p>
                            </div>
                          </div>
                        )}

                        {/* prize pool */}
                        <div className="flex items-center gap-1.5">
                          <Trophy className="w-3.5 h-3.5 text-purple-400 shrink-0" />
                          <div>
                            <p className="text-[10px] text-[oklch(0.40,0.04,290)] leading-tight">Prize Pool</p>
                            <p className="text-xs font-semibold text-white leading-tight">{tour.prizePool}</p>
                          </div>
                        </div>
                      </div>

                      {/* bottom row — players progress + time + arrow */}
                      <div className="flex items-center gap-3">
                        {/* players progress */}
                        {!isCompleted ? (
                          <div className="flex-1">
                            <div className="flex items-center justify-between mb-1">
                              <div className="flex items-center gap-1">
                                <Users className="w-3 h-3 text-[oklch(0.45,0.04,290)]" />
                                <span className="text-[10px] text-[oklch(0.55,0.04,290)]">
                                  {tour.joined}/{tour.maxPlayers} Joined
                                </span>
                              </div>
                              <span className="text-[10px] font-semibold text-white">
                                {progressPercent}%
                              </span>
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
                              {tour.joined}/{tour.maxPlayers} Players Played
                            </span>
                          </div>
                        )}

                        {/* time */}
                        <span className="text-[10px] text-[oklch(0.35,0.04,290)] shrink-0">
                          {tour.time}
                        </span>

                        {/* arrow */}
                        <ChevronRight className="w-4 h-4 text-[oklch(0.30,0.04,290)] shrink-0" />
                      </div>
                    </div>
                  </Link>
                );
              })}
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
