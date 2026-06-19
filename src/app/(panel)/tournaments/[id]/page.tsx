'use client';

import { useState, useEffect } from 'react';
import { useParams, useSearchParams } from 'next/navigation';
import Link from 'next/link';
import {
  Trophy,
  ArrowLeft,
  Users,
  Coins,
  Swords,
  Target,
  User,
  Zap,
  Shield,
  ShieldCheck,
  CircleDot,
  RefreshCw,
  Skull,
  Crosshair,
  Flame,
  Award,
  Clock,
  X,
} from 'lucide-react';
import { useAuth } from '@/context/AuthContext';
import { rtdbGet } from '@/lib/rtdb';
import { toast } from 'sonner';

// ═══════════════════════════════════════════════════
// CONSTANTS
// ═══════════════════════════════════════════════════
const ARRAY_FORMAT_TYPES = ['ClashSquad', 'LoneWolf'];

// ═══════════════════════════════════════════════════
// HELPERS
// ═══════════════════════════════════════════════════
function formatRupees(paisa: number): string {
  if (!paisa || paisa <= 0) return 'Free';
  const rupees = paisa / 100;
  if (rupees % 1 === 0) return `${Math.round(rupees)} Coins`;
  return `${rupees} Coins`;
}

function formatJoinTime(epochMs: number): string {
  if (!epochMs) return '';
  return new Date(epochMs).toLocaleTimeString('en-IN', {
    hour: '2-digit', minute: '2-digit', hour12: true,
  });
}

// ═══════════════════════════════════════════════════
// TYPES
// ═══════════════════════════════════════════════════
interface PlayerData {
  playerKey: string;
  userId: string;
  inGameName: string;
  inGameUID: number;
  inGameLevel: number;
  positionSeat: number;
  joinTime: number;
  paymentStatus: boolean;
  joiningFee: number;
  finalAmount: number;
  referralBonusUsed: number;
  kills?: number;
  deaths?: number;
  damage?: number;
  rank?: number;
  coinsEarned?: number;
  assists?: number;
}

// ═══════════════════════════════════════════════════
// UI CONFIG
// ═══════════════════════════════════════════════════
const typeConfig: Record<string, { icon: React.ReactNode; label: string }> = {
  BattleRoyal: { icon: <Swords className="w-3.5 h-3.5" />, label: 'BR' },
  ClashSquad: { icon: <Target className="w-3.5 h-3.5" />, label: 'CS' },
  FreeTournaments: { icon: <Zap className="w-3.5 h-3.5" />, label: 'Free' },
  LoneWolf: { icon: <User className="w-3.5 h-3.5" />, label: 'LW' },
};

// ═══════════════════════════════════════════════════
// POPUP STAT CELL
// ═══════════════════════════════════════════════════
function PopStat({ label, value, icon, bg, text }: {
  label: string;
  value: string;
  icon?: React.ReactNode;
  bg?: string;
  text?: string;
}) {
  return (
    <div className={`rounded-lg px-3 py-2.5 ${bg || 'bg-[oklch(0.22,0.04,290)]'}`}>
      <p className="text-[9px] font-bold uppercase tracking-wider opacity-50 mb-0.5">{label}</p>
      <div className="flex items-center gap-1.5">
        {icon && <span className="shrink-0">{icon}</span>}
        <p className={`text-sm font-bold leading-tight ${text || 'text-white'}`}>{value}</p>
      </div>
    </div>
  );
}

// ═══════════════════════════════════════════════════
// PLAYER FULL DETAIL POPUP
// ═══════════════════════════════════════════════════
function PlayerPopup({ player, onClose }: { player: PlayerData; onClose: () => void }) {
  if (!player) return null;

  return (
    <div className="fixed inset-0 z-50 flex items-end lg:items-center justify-center" onClick={onClose}>
      <div className="absolute inset-0 bg-black/60 backdrop-blur-sm" />
      <div
        className="relative w-full max-w-lg max-h-[85vh] overflow-y-auto rounded-t-2xl lg:rounded-2xl bg-[oklch(0.16,0.04,290)] border border-[oklch(0.30,0.06,290)] shadow-2xl shadow-black/40"
        onClick={(e) => e.stopPropagation()}
      >
        {/* Header */}
        <div className="sticky top-0 z-10 bg-gradient-to-r from-purple-600 to-fuchsia-700 px-4 py-4 rounded-t-2xl lg:rounded-t-2xl">
          <button onClick={onClose}
            className="absolute top-3 right-3 w-8 h-8 rounded-full bg-white/15 hover:bg-white/25 flex items-center justify-center transition-colors">
            <X className="w-4 h-4 text-white" />
          </button>
          <div className="flex items-center gap-3">
            <div className="w-12 h-12 rounded-full bg-white/20 flex items-center justify-center text-white text-lg font-bold shrink-0">
              {player.inGameName ? player.inGameName.charAt(0).toUpperCase() : '?'}
            </div>
            <div className="min-w-0">
              <p className="text-lg font-bold text-white truncate leading-tight">{player.inGameName || 'Unknown'}</p>
              <p className="text-xs text-white/70 font-mono mt-0.5">UID: {player.inGameUID || '-'}</p>
            </div>
            <span className={`inline-flex items-center gap-1 px-2.5 py-1 rounded-full text-[11px] font-semibold border shrink-0 ml-auto ${
              player.paymentStatus
                ? 'border-green-400/40 text-green-200 bg-green-500/20'
                : 'border-yellow-400/40 text-yellow-200 bg-yellow-500/20'
            }`}>
              {player.paymentStatus ? <ShieldCheck className="w-3.5 h-3.5" /> : <CircleDot className="w-3.5 h-3.5" />}
              {player.paymentStatus ? 'Paid (WinnerList)' : 'Unpaid'}
            </span>
          </div>
        </div>

        {/* Body */}
        <div className="p-4 space-y-4">
          {/* Basic Info */}
          <div>
            <p className="text-[10px] font-bold text-[oklch(0.45,0.04,290)] uppercase tracking-wider mb-2">Basic Info</p>
            <div className="grid grid-cols-3 gap-2">
              <PopStat label="Seat" value={String(player.positionSeat || '-')} icon={<Target className="w-3.5 h-3.5 text-cyan-400" />} bg="bg-cyan-500/10" text="text-cyan-300" />
              <PopStat label="Level" value={String(player.inGameLevel || '-')} icon={<Shield className="w-3.5 h-3.5 text-blue-400" />} bg="bg-blue-500/10" text="text-blue-300" />
              <PopStat label="Joined" value={player.joinTime > 0 ? formatJoinTime(player.joinTime) : '-'} icon={<Clock className="w-3.5 h-3.5 text-[oklch(0.50,0.04,290)]" />} bg="bg-[oklch(0.22,0.04,290)]" text="text-[oklch(0.70,0.04,290)]" />
            </div>
          </div>

          {/* Payment */}
          <div>
            <p className="text-[10px] font-bold text-[oklch(0.45,0.04,290)] uppercase tracking-wider mb-2">Payment</p>
            <div className="grid grid-cols-2 gap-2">
              <PopStat label="Entry Fee" value={formatRupees(player.joiningFee)} icon={<Coins className="w-3.5 h-3.5 text-yellow-400" />} bg="bg-yellow-500/10" text="text-yellow-300" />
              <PopStat label="Amount Paid" value={player.finalAmount > 0 ? formatRupees(player.finalAmount) : '-'} icon={<Coins className="w-3.5 h-3.5 text-green-400" />} bg="bg-green-500/10" text="text-green-300" />
            </div>
            {player.referralBonusUsed > 0 && (
              <div className="mt-2">
                <PopStat label="Referral Bonus Used" value={formatRupees(player.referralBonusUsed)} icon={<Coins className="w-3.5 h-3.5 text-purple-400" />} bg="bg-purple-500/10" text="text-purple-300" />
              </div>
            )}
          </div>

          {/* Match Results */}
          {(player.kills !== undefined || player.rank !== undefined || player.assists !== undefined || player.damage !== undefined) && (
            <div>
              <p className="text-[10px] font-bold text-[oklch(0.45,0.04,290)] uppercase tracking-wider mb-2">Match Results</p>
              <div className="grid grid-cols-3 gap-2">
                {player.rank !== undefined && (
                  <PopStat label="Rank" value={`#${player.rank}`} icon={<Award className="w-3.5 h-3.5 text-amber-400" />} bg="bg-amber-500/10" text="text-amber-300" />
                )}
                {player.kills !== undefined && (
                  <PopStat label="Kills" value={String(player.kills)} icon={<Skull className="w-3.5 h-3.5 text-red-400" />} bg="bg-red-500/10" text="text-red-300" />
                )}
                {player.assists !== undefined && (
                  <PopStat label="Assists" value={String(player.assists)} icon={<Shield className="w-3.5 h-3.5 text-blue-400" />} bg="bg-blue-500/10" text="text-blue-300" />
                )}
              </div>
              {(player.damage !== undefined || player.deaths !== undefined) && (
                <div className="grid grid-cols-2 gap-2 mt-2">
                  {player.damage !== undefined && (
                    <PopStat label="Damage" value={String(player.damage)} icon={<Flame className="w-3.5 h-3.5 text-orange-400" />} bg="bg-orange-500/10" text="text-orange-300" />
                  )}
                  {player.deaths !== undefined && (
                    <PopStat label="Deaths" value={String(player.deaths)} icon={<Skull className="w-3.5 h-3.5 text-gray-400" />} bg="bg-gray-500/10" text="text-gray-300" />
                  )}
                </div>
              )}
              {player.coinsEarned !== undefined && (
                <div className="mt-2">
                  <PopStat label="Coins Earned" value={player.coinsEarned > 0 ? `+${formatRupees(player.coinsEarned)}` : '-'} icon={<Coins className="w-3.5 h-3.5 text-green-400" />} bg="bg-green-500/15" text="text-green-300" />
                </div>
              )}
            </div>
          )}

          {/* Player Key */}
          {player.playerKey && (
            <div className="pt-2 border-t border-[oklch(0.25,0.05,290)]">
              <p className="text-[10px] text-[oklch(0.40,0.04,290)]">
                Key: <span className="font-mono text-[oklch(0.55,0.04,290)]">{player.playerKey}</span>
              </p>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}

// ═══════════════════════════════════════════════════
// FIELD RESOLVER — Flexible: handles PascalCase & camelCase
// ═══════════════════════════════════════════════════
function resolveField(obj: Record<string, any>, ...keys: string[]): any {
  for (const k of keys) {
    if (obj[k] !== undefined && obj[k] !== null) return obj[k];
  }
  return undefined;
}

// ═══════════════════════════════════════════════════
// PARSE JOINED PLAYERS — Handles both Object & Array formats
// ═══════════════════════════════════════════════════
function parseJoinedPlayers(raw: any, tournamentType: string): PlayerData[] {
  const list: PlayerData[] = [];

  const parseItem = (key: string, obj: Record<string, any>) => {
    if (!obj || typeof obj !== 'object') return;
    // Skip null entries (removed players set to null in array format)
    if (obj === null || Object.keys(obj).length === 0) return;

    list.push({
      playerKey: key,
      userId: resolveField(obj, 'userId', 'UserId') || '',
      inGameName: resolveField(obj, 'InGameName', 'playerName', 'inGameName') || '',
      inGameUID: resolveField(obj, 'InGameUID', 'playerUID', 'PlayerUID') || 0,
      inGameLevel: resolveField(obj, 'InGameLevel', 'Level', 'level') || 0,
      positionSeat: resolveField(obj, 'PositionSeat', 'SeatNumber', 'seatNumber') || 0,
      joinTime: resolveField(obj, 'JoinTime', 'joinTimestamp', 'JoinTimestamp') || 0,
      paymentStatus: resolveField(obj, 'PaymentStatus', 'paymentStatus', 'FeePaid', 'feePaid') === true || resolveField(obj, 'PaymentStatus', 'paymentStatus', 'FeePaid', 'feePaid') === 'true',
      joiningFee: resolveField(obj, 'JoiningFee', 'joiningFee', 'FeePaid', 'feePaid') || 0,
      finalAmount: resolveField(obj, 'finalAmount', 'FinalAmount', 'AmountPaid') || 0,
      referralBonusUsed: resolveField(obj, 'ReferralBonusUsed', 'referralBonusUsed') || 0,
      kills: resolveField(obj, 'Kills', 'kills'),
      deaths: resolveField(obj, 'Deaths', 'deaths'),
      damage: resolveField(obj, 'Damage', 'damage'),
      rank: resolveField(obj, 'Rank', 'rank'),
      coinsEarned: resolveField(obj, 'CoinsEarned', 'coinsEarned', 'EarnedCoins', 'earnedCoins'),
      assists: resolveField(obj, 'Assists', 'assists'),
    });
  };

  if (!raw || typeof raw !== 'object') return list;

  // Array format: ClashSquad, LoneWolf — keys are "0", "1", "2"...
  if (ARRAY_FORMAT_TYPES.includes(tournamentType)) {
    if (Array.isArray(raw)) {
      raw.forEach((item, i) => parseItem(String(i), item as Record<string, any>));
    } else {
      // Object with numeric keys
      const keys = Object.keys(raw).map(Number).filter((k) => !isNaN(k)).sort((a, b) => a - b);
      for (const k of keys) {
        const item = raw[String(k)];
        if (item && typeof item === 'object') parseItem(String(k), item);
      }
    }
  } else {
    // Object format: BattleRoyal, FreeTournaments — keys are UIDs or push IDs
    for (const [key, val] of Object.entries(raw)) {
      parseItem(key, val as Record<string, any>);
    }
  }

  return list;
}

// ═══════════════════════════════════════════════════
// MAIN COMPONENT
// ═══════════════════════════════════════════════════
export default function TournamentDetailPage() {
  const params = useParams();
  const searchParams = useSearchParams();
  const id = params.id as string;
  const type = searchParams.get('type') || '';

  const { authLoading } = useAuth();

  // ── Data State ──
  const [players, setPlayers] = useState<PlayerData[]>([]);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [selectedPlayer, setSelectedPlayer] = useState<PlayerData | null>(null);

  // ═══════════════════════════════════════════════════
  // LOAD JOINED PLAYERS — Direct RTDB fetch, no meta/details
  // ═══════════════════════════════════════════════════
  const loadPlayers = async (isRefresh = false) => {
    if (!type || !id) {
      setLoading(false);
      setRefreshing(false);
      return;
    }

    if (isRefresh) setRefreshing(true);
    else setLoading(true);

    try {
      // Fetch JoinedPlayers
      const joinedPath = `Tournaments/TournamentDetails/${type}/${id}/JoinedPlayers`;
      const rawData = await rtdbGet(joinedPath);

      // Fetch WinnerList to check Paid status
      let winnerPaidUserIds = new Set<string>();
      try {
        const wlPath = `Tournaments/TournamentDetails/${type}/${id}/WinnerList`;
        const wlData = await rtdbGet(wlPath);
        if (wlData && typeof wlData === 'object') {
          const checkPaid = (obj: any) => {
            if (obj && typeof obj === 'object' && obj.PaymentStatus === true && obj.userId) {
              winnerPaidUserIds.add(String(obj.userId));
            }
          };
          if (Array.isArray(wlData)) wlData.forEach(checkPaid);
          else Object.values(wlData).forEach(checkPaid);
        }
      } catch {}

      if (rawData === null) {
        setPlayers([]);
      } else if (typeof rawData === 'object') {
        const parsed = parseJoinedPlayers(rawData, type);
        // Override paymentStatus: only Paid if in WinnerList with PaymentStatus=true
        parsed.forEach(p => {
          p.paymentStatus = winnerPaidUserIds.has(String(p.userId));
        });
        setPlayers(parsed);
      } else {
        setPlayers([]);
      }
    } catch (e: any) {
      toast.error('Failed to load players', { description: e.message });
      setPlayers([]);
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  };

  useEffect(() => {
    if (authLoading) return;
    loadPlayers();
  }, [authLoading, type, id]);

  const tc = typeConfig[type] || typeConfig.BattleRoyal;

  return (
    <div className="min-h-screen pb-20 lg:pb-6">
      {/* Header */}
      <header className="bg-gradient-to-r from-blue-500 to-indigo-700 px-4 lg:px-6 py-5 sticky top-0 z-20">
        <div className="max-w-4xl mx-auto">
          <Link
            href="/tournaments"
            className="inline-flex items-center gap-1.5 text-xs text-white/70 hover:text-white mb-3 transition-colors"
          >
            <ArrowLeft className="w-3.5 h-3.5" />
            Back to Tournaments
          </Link>

          <div className="flex items-center justify-between">
            <div>
              <h1 className="text-lg lg:text-xl font-extrabold text-white">{id}</h1>
              <div className="flex items-center gap-2 flex-wrap mt-1">
                <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-lg text-[10px] font-semibold bg-white/10 text-white/80">
                  {tc.icon} {tc.label}
                </span>
                <span className="text-[10px] font-mono text-white/50">{type}</span>
              </div>
            </div>
            <div className="text-right shrink-0">
              <div className="flex items-center gap-1.5">
                <Users className="w-4 h-4 text-white/60" />
                <span className="text-lg font-bold text-white">{players.length}</span>
              </div>
              <p className="text-[10px] text-white/50">Players</p>
            </div>
          </div>
        </div>
      </header>

      <div className="max-w-4xl mx-auto px-4 lg:px-6 py-6 space-y-4">

        {/* Loading */}
        {loading && (
          <div className="flex flex-col items-center py-16 space-y-3">
            <div className="w-8 h-8 border-2 border-blue-500/30 border-t-blue-500 rounded-full animate-spin" />
            <p className="text-xs text-[oklch(0.45,0.04,290)]">Loading players...</p>
          </div>
        )}

        {!loading && (
          <>
            {/* Refresh Button */}
            <button
              onClick={() => loadPlayers(true)}
              disabled={refreshing}
              className="w-full h-11 rounded-xl bg-gradient-to-r from-blue-500 to-blue-600 text-white font-bold text-sm shadow-lg shadow-blue-500/20 disabled:opacity-40 flex items-center justify-center gap-2"
            >
              {refreshing ? (
                <div className="w-4 h-4 border-2 border-white/30 border-t-white rounded-full animate-spin" />
              ) : (
                <RefreshCw className="w-4 h-4" />
              )}
              REFRESH
            </button>

            {/* Players List */}
            <div className="space-y-3">
              <div className="flex items-center justify-between px-1">
                <p className="text-sm font-semibold text-white">Joined Players</p>
                <span className="text-[10px] text-[oklch(0.40,0.04,290)]">Tap for details</span>
              </div>

              {players.length === 0 ? (
                <div className="flex flex-col items-center py-12 space-y-2">
                  <Users className="w-8 h-8 text-[oklch(0.25,0.04,290)]" />
                  <p className="text-xs text-[oklch(0.40,0.04,290)]">No players joined yet</p>
                </div>
              ) : (
                <div className="space-y-2">
                  {players.map((player, i) => (
                    <div
                      key={`${player.playerKey}-${i}`}
                      onClick={() => setSelectedPlayer(player)}
                      className="flex items-center gap-2.5 px-3 py-2.5 rounded-xl bg-[oklch(0.18,0.04,290)] border border-[oklch(0.25,0.05,290)] hover:border-[oklch(0.35,0.06,290)] active:scale-[0.99] transition-all cursor-pointer"
                    >
                      {/* Avatar */}
                      <div className="w-9 h-9 rounded-full bg-gradient-to-br from-purple-500 to-fuchsia-600 flex items-center justify-center text-white text-sm font-bold shrink-0">
                        {player.inGameName ? player.inGameName.charAt(0).toUpperCase() : '?'}
                      </div>

                      {/* Name + UID */}
                      <div className="flex-1 min-w-0">
                        <p className="text-sm font-semibold text-white truncate leading-tight">
                          {player.inGameName || 'Unknown'}
                        </p>
                        <p className="text-[10px] text-[oklch(0.50,0.04,290)] font-mono leading-tight mt-0.5">
                          UID: {player.inGameUID || '-'}
                        </p>
                      </div>

                      {/* Seat + Level + Joined */}
                      <div className="flex items-center gap-2.5 shrink-0">
                        <div className="text-center">
                          <p className="text-[8px] font-bold text-[oklch(0.40,0.04,290)] uppercase leading-none">Seat</p>
                          <p className="text-xs font-bold text-cyan-400 mt-0.5">{player.positionSeat || '-'}</p>
                        </div>
                        <div className="text-center">
                          <p className="text-[8px] font-bold text-[oklch(0.40,0.04,290)] uppercase leading-none">Level</p>
                          <p className="text-xs font-bold text-blue-400 mt-0.5">{player.inGameLevel || '-'}</p>
                        </div>
                        <div className="text-center">
                          <p className="text-[8px] font-bold text-[oklch(0.40,0.04,290)] uppercase leading-none">Joined</p>
                          <p className="text-[10px] font-bold text-[oklch(0.65,0.04,290)] mt-0.5">
                            {player.joinTime > 0 ? formatJoinTime(player.joinTime) : '-'}
                          </p>
                        </div>
                      </div>

                      {/* Paid Badge — based on WinnerList PaymentStatus */}
                      <span className={`inline-flex items-center gap-1 px-2 py-1 rounded-full text-[10px] font-semibold border shrink-0 ${
                        player.paymentStatus
                          ? 'border-green-500/30 text-green-400 bg-green-500/10'
                          : 'border-yellow-500/30 text-yellow-400 bg-yellow-500/10'
                      }`}>
                        {player.paymentStatus ? <ShieldCheck className="w-3 h-3" /> : <CircleDot className="w-3 h-3" />}
                        {player.paymentStatus ? 'Paid' : 'Unpaid'}
                      </span>
                    </div>
                  ))}
                </div>
              )}
            </div>
          </>
        )}
      </div>

      {/* Player Detail Popup */}
      {selectedPlayer && (
        <PlayerPopup player={selectedPlayer} onClose={() => setSelectedPlayer(null)} />
      )}
    </div>
  );
}
