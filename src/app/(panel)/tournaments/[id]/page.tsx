'use client';

import { useParams } from 'next/navigation';
import Link from 'next/link';
import {
  Trophy,
  ArrowLeft,
  Users,
  Coins,
  Clock,
  Swords,
  Target,
  User,
  Shield,
  UserX,
  CircleDot,
} from 'lucide-react';

const typeConfig: Record<string, { icon: React.ReactNode; color: string }> = {
  'Battle Royale': { icon: <Swords className="w-3.5 h-3.5" />, color: 'text-violet-400' },
  'Clash Squad': { icon: <Target className="w-3.5 h-3.5" />, color: 'text-orange-400' },
  'Lone Wolf': { icon: <User className="w-3.5 h-3.5" />, color: 'text-cyan-400' },
};

// demo data — tournament detail
const tournamentDetails: Record<string, {
  type: string;
  status: string;
  entryFee: number;
  prizePool: string;
  schedule: string;
  roomId: string;
  roomPass: string;
  players: Array<{
    name: string;
    uid: string;
    joinedAt: string;
    status: 'Verified' | 'Unverified' | 'Flagged';
    kills?: number;
  }>;
}> = {
  EDM_279: {
    type: 'Battle Royale',
    status: 'Ongoing',
    entryFee: 30,
    prizePool: '2,500',
    schedule: 'Today, 8:00 PM',
    roomId: '1234567890',
    roomPass: 'edmfire279',
    players: [
      { name: 'ShadowKiller', uid: 'UID_5123456789', joinedAt: '7:45 PM', status: 'Verified' },
      { name: 'ProSniper_X', uid: 'UID_4987654321', joinedAt: '7:46 PM', status: 'Verified' },
      { name: 'DarkPhoenix99', uid: 'UID_5876543210', joinedAt: '7:48 PM', status: 'Verified' },
      { name: 'NightWolf', uid: 'UID_5123498765', joinedAt: '7:50 PM', status: 'Unverified' },
      { name: 'ThunderStrike', uid: 'UID_5987654321', joinedAt: '7:52 PM', status: 'Verified' },
      { name: 'AceGamer_01', uid: 'UID_5345678901', joinedAt: '7:53 PM', status: 'Verified' },
      { name: 'BlazeMaster', uid: 'UID_5567890123', joinedAt: '7:55 PM', status: 'Flagged' },
      { name: 'StormRider', uid: 'UID_5678901234', joinedAt: '7:56 PM', status: 'Verified' },
    ],
  },
};

export default function TournamentPlayersPage() {
  const params = useParams();
  const id = params.id as string;
  const tour = tournamentDetails[id];
  const tc = tour ? typeConfig[tour.type] : typeConfig['Battle Royale'];

  // fallback data
  const fallbackPlayers = [
    { name: 'ShadowKiller', uid: 'UID_5123456789', joinedAt: '5 min ago', status: 'Verified' as const },
    { name: 'ProSniper_X', uid: 'UID_4987654321', joinedAt: '8 min ago', status: 'Verified' as const },
    { name: 'DarkPhoenix99', uid: 'UID_5876543210', joinedAt: '12 min ago', status: 'Unverified' as const },
    { name: 'NightWolf', uid: 'UID_5123498765', joinedAt: '15 min ago', status: 'Verified' as const },
    { name: 'ThunderStrike', uid: 'UID_5987654321', joinedAt: '20 min ago', status: 'Flagged' as const },
  ];

  const players = tour ? tour.players : fallbackPlayers;
  const statusBadge: Record<string, string> = {
    Verified: 'border-green-500/30 text-green-400 bg-green-500/10',
    Unverified: 'border-yellow-500/30 text-yellow-400 bg-yellow-500/10',
    Flagged: 'border-red-500/30 text-red-400 bg-red-500/10',
  };
  const statusIcon: Record<string, React.ReactNode> = {
    Verified: <Shield className="w-3 h-3" />,
    Unverified: <CircleDot className="w-3 h-3" />,
    Flagged: <UserX className="w-3 h-3" />,
  };

  return (
    <div className="min-h-screen">
      {/* header */}
      <header className="bg-gradient-to-r from-blue-500 to-indigo-700 px-4 lg:px-6 py-5 sticky top-0 z-20">
        <div className="max-w-4xl mx-auto">
          {/* back button */}
          <Link
            href="/tournaments"
            className="inline-flex items-center gap-1.5 text-xs text-white/70 hover:text-white mb-3 transition-colors"
          >
            <ArrowLeft className="w-3.5 h-3.5" />
            Back to Tournaments
          </Link>

          <div className="flex items-center justify-between">
            <div>
              <div className="flex items-center gap-2 mb-1">
                <h1 className="text-lg lg:text-xl font-extrabold text-white">
                  Tournament {id}
                </h1>
              </div>
              {tour && (
                <div className="flex items-center gap-2 flex-wrap">
                  <span className={`inline-flex items-center gap-1 px-2 py-0.5 rounded-lg text-[10px] font-semibold bg-white/10 text-white/80`}>
                    {tc.icon} {tour.type}
                  </span>
                  <span className="text-[10px] text-white/60">{tour.schedule}</span>
                </div>
              )}
            </div>
            {tour && (
              <div className="text-right shrink-0">
                <p className="text-[10px] text-white/60">Prize Pool</p>
                <p className="text-sm font-bold text-yellow-400">{tour.prizePool}</p>
              </div>
            )}
          </div>
        </div>
      </header>

      <div className="max-w-4xl mx-auto px-4 lg:px-6 py-6 space-y-5">
        {/* tournament info cards */}
        {tour && (
          <div className="grid grid-cols-2 gap-2">
            <div className="p-3 rounded-xl bg-[oklch(0.18,0.04,290)] border border-[oklch(0.30,0.06,290)]">
              <p className="text-[10px] text-[oklch(0.45,0.04,290)]">Entry Fee</p>
              <div className="flex items-center gap-1 mt-0.5">
                <Coins className="w-3.5 h-3.5 text-yellow-400" />
                <span className="text-sm font-bold text-white">{tour.entryFee} coins</span>
              </div>
            </div>
            <div className="p-3 rounded-xl bg-[oklch(0.18,0.04,290)] border border-[oklch(0.30,0.06,290)]">
              <p className="text-[10px] text-[oklch(0.45,0.04,290)]">Room ID</p>
              <p className="text-sm font-bold text-white font-mono mt-0.5">{tour.roomId}</p>
            </div>
            <div className="p-3 rounded-xl bg-[oklch(0.18,0.04,290)] border border-[oklch(0.30,0.06,290)]">
              <p className="text-[10px] text-[oklch(0.45,0.04,290)]">Room Password</p>
              <p className="text-sm font-bold text-white font-mono mt-0.5">{tour.roomPass}</p>
            </div>
            <div className="p-3 rounded-xl bg-[oklch(0.18,0.04,290)] border border-[oklch(0.30,0.06,290)]">
              <p className="text-[10px] text-[oklch(0.45,0.04,290)]">Status</p>
              <p className="text-sm font-bold text-green-400 mt-0.5">{tour.status}</p>
            </div>
          </div>
        )}

        {/* players list */}
        <div className="space-y-2">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-2">
              <Users className="w-4 h-4 text-[oklch(0.60,0.04,290)]" />
              <p className="text-sm font-semibold text-white">
                Joined Players
              </p>
            </div>
            <span className="text-xs text-[oklch(0.45,0.04,290)]">
              {players.length} players
            </span>
          </div>

          <div className="space-y-2">
            {players.map((player, i) => (
              <div
                key={player.uid}
                className="flex items-center gap-3 p-3.5 rounded-xl bg-[oklch(0.18,0.04,290)] border border-[oklch(0.25,0.05,290)]"
              >
                {/* serial + avatar */}
                <div className="flex items-center gap-2 shrink-0">
                  <span className="text-[10px] font-bold text-[oklch(0.40,0.04,290)] w-4 text-center">
                    {i + 1}
                  </span>
                  <div className="w-9 h-9 rounded-full bg-gradient-to-br from-purple-500 to-fuchsia-600 flex items-center justify-center text-white text-xs font-bold">
                    {player.name.charAt(0)}
                  </div>
                </div>

                {/* info */}
                <div className="flex-1 min-w-0">
                  <p className="text-sm font-medium text-white truncate">
                    {player.name}
                  </p>
                  <p className="text-[10px] text-[oklch(0.45,0.04,290)]">
                    {player.uid} &middot; {player.joinedAt}
                  </p>
                </div>

                {/* status badge */}
                <span className={`inline-flex items-center gap-1 px-2.5 py-1 rounded-full text-[10px] font-semibold border ${statusBadge[player.status]}`}>
                  {statusIcon[player.status]}
                  {player.status}
                </span>
              </div>
            ))}
          </div>
        </div>
      </div>
    </div>
  );
}
