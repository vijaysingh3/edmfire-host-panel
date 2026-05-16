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
  Gamepad2,
  Timer,
} from 'lucide-react';
import { useAuth } from '@/context/AuthContext';
import { fetchRemoteConfig, getRemoteString, RC_KEYS } from '@/lib/remoteConfig';
import { rtdbGet } from '@/lib/rtdb';
import { toast } from 'sonner';

// ═══════════════════════════════════════════════════
// CONSTANTS
// ═══════════════════════════════════════════════════
const ARRAY_FORMAT_TYPES = ['ClashSquad', 'LoneWolf'];

const basePath = (type: string, id: string) =>
  `Tournaments/TournamentDetails/${type}/${id}`;
const metaPath = (type: string, id: string) =>
  `Tournaments/TournamentMeta/${type}/${id}`;

// ═══════════════════════════════════════════════════
// BANK METHOD — PAISA → Coins
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
  joiningFee: number;     // PAISA
  finalAmount: number;    // PAISA
  referralBonusUsed: number;
  // After results
  kills?: number;
  deaths?: number;
  damage?: number;
  rank?: number;
  coinsEarned?: number;   // PAISA
  assists?: number;
}

interface TournamentMeta {
  title: string;
  status: string;
  joiningFee: number;
  prizePool: number;
  perKill: number;
  joinedCount: number;
  maxSlots: number;
  dateTime: string;
  mode: string;           // RTDB Mode field (BattleRoyal, ClashSquad, etc.)
  type: string;           // RTDB Type field (Solo, Duo, Squad)
  map: string;
  bannerUrl: string;
  createdAt: string;
}

interface TournamentDetails {
  roomId: string;
  roomPassword: string;
  paymentStatus: boolean;
  resultStatus: boolean;
  hostUID: string;
  description: string;
  lastUpdated: string;
  videoUrl: string;
}

// ═══════════════════════════════════════════════════
// UI CONFIG
// ═══════════════════════════════════════════════════
const typeConfig: Record<string, { icon: React.ReactNode; color: string; label: string }> = {
  BattleRoyal: { icon: <Swords className="w-3.5 h-3.5" />, color: 'text-violet-400', label: 'Battle Royale' },
  ClashSquad: { icon: <Target className="w-3.5 h-3.5" />, color: 'text-orange-400', label: 'Clash Squad' },
  FreeTournaments: { icon: <Zap className="w-3.5 h-3.5" />, color: 'text-green-400', label: 'Free' },
  LoneWolf: { icon: <User className="w-3.5 h-3.5" />, color: 'text-cyan-400', label: 'Lone Wolf' },
};

const statusColors: Record<string, string> = {
  Upcoming: 'text-blue-400 bg-blue-500/15 border-blue-500/30',
  Ongoing: 'text-green-400 bg-green-500/15 border-green-500/30',
  Completed: 'text-[oklch(0.55,0.04,290)] bg-[oklch(0.25,0.05,290)] border-[oklch(0.30,0.06,290)]',
};

// ═══════════════════════════════════════════════════
// PLAYER STAT CELL — Gaming style mini card
// ═══════════════════════════════════════════════════
function PStatCell({ label, value, icon, bg, text }: {
  label: string;
  value: string;
  icon?: React.ReactNode;
  bg?: string;
  text?: string;
}) {
  return (
    <div className={`rounded-lg px-2 py-1.5 ${bg || 'bg-[oklch(0.22,0.04,290)]'}`}>
      <p className="text-[8px] font-bold uppercase tracking-wider opacity-60 mb-0.5">{label}</p>
      <div className="flex items-center gap-1">
        {icon && <span className="shrink-0">{icon}</span>}
        <p className={`text-xs font-bold leading-tight ${text || 'text-white'}`}>{value}</p>
      </div>
    </div>
  );
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
  const [meta, setMeta] = useState<TournamentMeta | null>(null);
  const [details, setDetails] = useState<TournamentDetails | null>(null);
  const [players, setPlayers] = useState<PlayerData[]>([]);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);

  // ═══════════════════════════════════════════════════
  // LOAD TOURNAMENT DATA
  // ═══════════════════════════════════════════════════
  const loadTournament = async (isRefresh = false) => {
    if (!type || !id) {
      setLoading(false);
      setRefreshing(false);
      return;
    }

    if (isRefresh) setRefreshing(true);
    else setLoading(true);

    try {
      await fetchRemoteConfig();

      const [metaData, detailData] = await Promise.all([
        rtdbGet(metaPath(type, id)).catch(() => null),
        rtdbGet(basePath(type, id)).catch(() => null),
      ]);

      // Parse Meta — RTDB field mapping: Mode=tournamentMode, Type=gameType
      if (metaData && typeof metaData === 'object') {
        const m = metaData as Record<string, any>;
        setMeta({
          title: m.Title || id,
          status: m.Status || 'Unknown',
          joiningFee: m.JoiningFee || 0,
          prizePool: m.PricePool || 0,
          perKill: m.PerKill || 0,
          joinedCount: m.JoinedPlayersCount || 0,
          maxSlots: m.SlotNumbers || 0,
          dateTime: m.DateTime || '',
          mode: m.Mode || type,        // RTDB Mode = BattleRoyal/ClashSquad/LoneWolf
          type: m.Type || '',          // RTDB Type = Solo/Duo/Squad
          map: m.Map || '',
          bannerUrl: m.BannerUrl || '',
          createdAt: m.CreatedAt || '',
        });
      } else {
        toast.error('Tournament not found');
      }

      // Parse Details
      if (detailData && typeof detailData === 'object') {
        const d = detailData as Record<string, any>;
        setDetails({
          roomId: d.RoomID || '',
          roomPassword: d.RoomPassword || '',
          paymentStatus: d.PaymentStatus === true || d.PaymentStatus === 'true',
          resultStatus: d.ResultStatus === true || d.ResultStatus === 'true',
          hostUID: d.HostUID || '',
          description: d.Description || '',
          lastUpdated: d.LastUpdated || '',
          videoUrl: d.VideoUrl || '',
        });

        if (d.JoinedPlayers) {
          parseJoinedPlayers(d.JoinedPlayers);
        }
      }

    } catch (e: any) {
      toast.error('Failed to load tournament', { description: e.message });
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  };

  useEffect(() => {
    if (authLoading) return;
    loadTournament();
  }, [authLoading, type, id]);

  // ═══════════════════════════════════════════════════
  // PARSE JOINED PLAYERS — Handle both Array & Object format
  // ═══════════════════════════════════════════════════
  const parseJoinedPlayers = (raw: any) => {
    const list: PlayerData[] = [];

    if (ARRAY_FORMAT_TYPES.includes(type)) {
      const arr = Array.isArray(raw) ? raw : convertToArray(raw);
      for (let i = 0; i < arr.length; i++) {
        const item = arr[i];
        if (!item || typeof item !== 'object') continue;
        list.push({
          playerKey: i.toString(),
          userId: item.userId || '',
          inGameName: item.InGameName || '',
          inGameUID: item.InGameUID || 0,
          inGameLevel: item.InGameLevel || 0,
          positionSeat: item.PositionSeat || 0,
          joinTime: item.JoinTime || 0,
          paymentStatus: item.PaymentStatus === true || item.PaymentStatus === 'true',
          joiningFee: item.joiningFee || 0,
          finalAmount: item.finalAmount || 0,
          referralBonusUsed: item.referralBonusUsed || 0,
          kills: item.Kills,
          deaths: item.Deaths,
          damage: item.Damage,
          rank: item.Rank,
          coinsEarned: item.CoinsEarned,
          assists: item.Assists,
        });
      }
    } else {
      if (raw && typeof raw === 'object' && !Array.isArray(raw)) {
        for (const [key, val] of Object.entries(raw)) {
          const obj = val as Record<string, any>;
          if (!obj || typeof obj !== 'object') continue;
          list.push({
            playerKey: key,
            userId: obj.userId || '',
            inGameName: obj.InGameName || '',
            inGameUID: obj.InGameUID || 0,
            inGameLevel: obj.InGameLevel || 0,
            positionSeat: obj.PositionSeat || 0,
            joinTime: obj.JoinTime || 0,
            paymentStatus: obj.PaymentStatus === true || obj.PaymentStatus === 'true',
            joiningFee: obj.joiningFee || 0,
            finalAmount: obj.finalAmount || 0,
            referralBonusUsed: obj.referralBonusUsed || 0,
            kills: obj.Kills,
            deaths: obj.Deaths,
            damage: obj.Damage,
            rank: obj.Rank,
            coinsEarned: obj.CoinsEarned,
            assists: obj.Assists,
          });
        }
      }
    }

    setPlayers(list);
  };

  const convertToArray = (obj: any): any[] => {
    if (!obj || typeof obj !== 'object') return [];
    const keys = Object.keys(obj).map(Number).filter((k) => !isNaN(k));
    const maxIdx = keys.length > 0 ? Math.max(...keys) : -1;
    if (maxIdx < 0) return [];
    const arr: any[] = [];
    for (let i = 0; i <= maxIdx; i++) arr.push(obj[i.toString()]);
    return arr;
  };

  // Check if results are available
  const hasResults = players.some((p) => p.kills !== undefined || p.rank !== undefined);

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
              <h1 className="text-lg lg:text-xl font-extrabold text-white">
                {meta?.title || id}
              </h1>
              <div className="flex items-center gap-2 flex-wrap mt-1">
                <span className={`inline-flex items-center gap-1 px-2 py-0.5 rounded-lg text-[10px] font-semibold bg-white/10 text-white/80`}>
                  {tc.icon} {tc.label}
                </span>
                {meta?.type && (
                  <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-lg text-[10px] font-semibold bg-emerald-500/20 text-emerald-300">
                    <Gamepad2 className="w-3 h-3" /> {meta.type}
                  </span>
                )}
                {meta?.status && (
                  <span className={`inline-flex items-center px-2.5 py-1 rounded-full text-[10px] font-semibold border ${statusColors[meta.status] || ''}`}>
                    {meta.status}
                  </span>
                )}
                {meta?.dateTime && (
                  <span className="text-[10px] text-white/60">{meta.dateTime}</span>
                )}
              </div>
            </div>
            {meta && (
              <div className="text-right shrink-0">
                <p className="text-[10px] text-white/60">Prize Pool</p>
                <p className="text-sm font-bold text-yellow-400">{formatRupees(meta.prizePool)}</p>
              </div>
            )}
          </div>
        </div>
      </header>

      <div className="max-w-4xl mx-auto px-4 lg:px-6 py-6 space-y-5">

        {/* Loading */}
        {loading && (
          <div className="flex flex-col items-center py-16 space-y-3">
            <div className="w-8 h-8 border-2 border-blue-500/30 border-t-blue-500 rounded-full animate-spin" />
            <p className="text-xs text-[oklch(0.45,0.04,290)]">Loading tournament...</p>
          </div>
        )}

        {!loading && meta && details && (
          <>
            {/* Tournament Info Cards */}
            <div className="grid grid-cols-2 gap-2">
              {/* Entry Fee */}
              <div className="p-3 rounded-xl bg-[oklch(0.18,0.04,290)] border border-[oklch(0.30,0.06,290)]">
                <p className="text-[10px] text-[oklch(0.45,0.04,290)]">Entry Fee</p>
                <div className="flex items-center gap-1 mt-0.5">
                  <Coins className="w-3.5 h-3.5 text-yellow-400" />
                  <span className="text-sm font-bold text-white">{formatRupees(meta.joiningFee)}</span>
                </div>
              </div>

              {/* Room ID */}
              <div className="p-3 rounded-xl bg-[oklch(0.18,0.04,290)] border border-[oklch(0.30,0.06,290)]">
                <p className="text-[10px] text-[oklch(0.45,0.04,290)]">Room ID</p>
                <p className="text-sm font-bold text-white font-mono mt-0.5">{details.roomId || 'Not Set'}</p>
              </div>

              {/* Room Password */}
              <div className="p-3 rounded-xl bg-[oklch(0.18,0.04,290)] border border-[oklch(0.30,0.06,290)]">
                <p className="text-[10px] text-[oklch(0.45,0.04,290)]">Room Password</p>
                <p className="text-sm font-bold text-white font-mono mt-0.5">{details.roomPassword || 'Not Set'}</p>
              </div>

              {/* Per Kill */}
              {meta.perKill > 0 && (
                <div className="p-3 rounded-xl bg-[oklch(0.18,0.04,290)] border border-[oklch(0.30,0.06,290)]">
                  <p className="text-[10px] text-[oklch(0.45,0.04,290)]">Per Kill</p>
                  <div className="flex items-center gap-1 mt-0.5">
                    <Crosshair className="w-3.5 h-3.5 text-red-400" />
                    <span className="text-sm font-bold text-white">{formatRupees(meta.perKill)}</span>
                  </div>
                </div>
              )}

              {/* Map */}
              {meta.map && (
                <div className="p-3 rounded-xl bg-[oklch(0.18,0.04,290)] border border-[oklch(0.30,0.06,290)]">
                  <p className="text-[10px] text-[oklch(0.45,0.04,290)]">Map</p>
                  <p className="text-sm font-bold text-white mt-0.5">{meta.map}</p>
                </div>
              )}

              {/* Payment Status */}
              <div className="p-3 rounded-xl bg-[oklch(0.18,0.04,290)] border border-[oklch(0.30,0.06,290)]">
                <p className="text-[10px] text-[oklch(0.45,0.04,290)]">Payment</p>
                <p className={`text-sm font-bold mt-0.5 ${details.paymentStatus ? 'text-green-400' : 'text-orange-400'}`}>
                  {details.paymentStatus ? 'Settled' : 'Pending'}
                </p>
              </div>

              {/* Result Status */}
              <div className="p-3 rounded-xl bg-[oklch(0.18,0.04,290)] border border-[oklch(0.30,0.06,290)]">
                <p className="text-[10px] text-[oklch(0.45,0.04,290)]">Result</p>
                <p className={`text-sm font-bold mt-0.5 ${details.resultStatus ? 'text-green-400' : 'text-orange-400'}`}>
                  {details.resultStatus ? 'Published' : 'Pending'}
                </p>
              </div>

              {/* Slot Numbers */}
              <div className="p-3 rounded-xl bg-[oklch(0.18,0.04,290)] border border-[oklch(0.30,0.06,290)]">
                <p className="text-[10px] text-[oklch(0.45,0.04,290)]">Slots</p>
                <div className="flex items-center gap-1 mt-0.5">
                  <Users className="w-3.5 h-3.5 text-blue-400" />
                  <span className="text-sm font-bold text-white">{meta.joinedCount}/{meta.maxSlots}</span>
                </div>
              </div>
            </div>

            {/* Description */}
            {details.description && (
              <div className="p-3 rounded-xl bg-[oklch(0.18,0.04,290)] border border-[oklch(0.30,0.06,290)]">
                <p className="text-[10px] text-[oklch(0.45,0.04,290)] mb-1">Description</p>
                <p className="text-xs text-[oklch(0.65,0.04,290)] leading-relaxed">{details.description}</p>
              </div>
            )}

            {/* Refresh Button */}
            <button
              onClick={() => loadTournament(true)}
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
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-2">
                  <Users className="w-4 h-4 text-[oklch(0.60,0.04,290)]" />
                  <p className="text-sm font-semibold text-white">Joined Players</p>
                </div>
                <span className="text-xs text-[oklch(0.45,0.04,290)]">
                  {players.length} players
                </span>
              </div>

              {players.length === 0 ? (
                <div className="flex flex-col items-center py-12 space-y-2">
                  <Users className="w-8 h-8 text-[oklch(0.25,0.04,290)]" />
                  <p className="text-xs text-[oklch(0.40,0.04,290)]">No players joined yet</p>
                </div>
              ) : (
                <div className="space-y-2.5">
                  {players.map((player, i) => {
                    const hasResult = player.kills !== undefined || player.rank !== undefined;
                    return (
                      <div
                        key={`${player.playerKey}-${i}`}
                        className="rounded-xl bg-[oklch(0.18,0.04,290)] border border-[oklch(0.25,0.05,290)] overflow-hidden"
                      >
                        {/* Player Header — Name + Payment Badge */}
                        <div className="flex items-center gap-2.5 px-3 py-2.5 bg-gradient-to-r from-purple-500/10 via-transparent to-transparent">
                          <div className="flex items-center gap-2 min-w-0 shrink-0">
                            <div className="w-8 h-8 rounded-full bg-gradient-to-br from-purple-500 to-fuchsia-600 flex items-center justify-center text-white text-xs font-bold shrink-0">
                              {player.inGameName ? player.inGameName.charAt(0).toUpperCase() : '?'}
                            </div>
                            <div className="min-w-0">
                              <p className="text-sm font-semibold text-white truncate leading-tight">
                                {player.inGameName || 'Unknown'}
                              </p>
                              <p className="text-[10px] text-[oklch(0.50,0.04,290)] font-mono leading-tight mt-0.5">
                                UID: {player.inGameUID || '-'}
                              </p>
                            </div>
                          </div>
                          <span className={`inline-flex items-center gap-1 px-2 py-1 rounded-full text-[10px] font-semibold border shrink-0 ml-auto ${
                            player.paymentStatus
                              ? 'border-green-500/30 text-green-400 bg-green-500/10'
                              : 'border-yellow-500/30 text-yellow-400 bg-yellow-500/10'
                          }`}>
                            {player.paymentStatus ? <ShieldCheck className="w-3 h-3" /> : <CircleDot className="w-3 h-3" />}
                            {player.paymentStatus ? 'Paid' : 'Unpaid'}
                          </span>
                        </div>

                        {/* Player Info Row — Seat, Level, Join Time */}
                        <div className="grid grid-cols-3 gap-1.5 px-2.5 py-2">
                          <PStatCell
                            label="Seat"
                            value={String(player.positionSeat || '-')}
                            icon={<Target className="w-3 h-3 text-cyan-400" />}
                            bg="bg-cyan-500/8"
                            text="text-cyan-300"
                          />
                          <PStatCell
                            label="Level"
                            value={String(player.inGameLevel || '-')}
                            icon={<Shield className="w-3 h-3 text-blue-400" />}
                            bg="bg-blue-500/8"
                            text="text-blue-300"
                          />
                          <PStatCell
                            label="Joined"
                            value={player.joinTime > 0 ? formatJoinTime(player.joinTime) : '-'}
                            icon={<Clock className="w-3 h-3 text-[oklch(0.50,0.04,290)]" />}
                            bg="bg-[oklch(0.20,0.04,290)]"
                            text="text-[oklch(0.65,0.04,290)]"
                          />
                        </div>

                        {/* Fee Info Row */}
                        <div className="grid grid-cols-2 gap-1.5 px-2.5 pb-2">
                          <PStatCell
                            label="Fee"
                            value={formatRupees(player.joiningFee)}
                            icon={<Coins className="w-3 h-3 text-yellow-400" />}
                            bg="bg-yellow-500/8"
                            text="text-yellow-300"
                          />
                          {player.finalAmount > 0 ? (
                            <PStatCell
                              label="Paid"
                              value={formatRupees(player.finalAmount)}
                              icon={<Coins className="w-3 h-3 text-green-400" />}
                              bg="bg-green-500/8"
                              text="text-green-300"
                            />
                          ) : player.referralBonusUsed > 0 ? (
                            <PStatCell
                              label="Referral"
                              value={formatRupees(player.referralBonusUsed)}
                              icon={<Coins className="w-3 h-3 text-purple-400" />}
                              bg="bg-purple-500/8"
                              text="text-purple-300"
                            />
                          ) : (
                            <PStatCell
                              label="Paid"
                              value="-"
                              bg="bg-[oklch(0.20,0.04,290)]"
                              text="text-[oklch(0.40,0.04,290)]"
                            />
                          )}
                        </div>

                        {/* Result Stats — Only if results available */}
                        {hasResult && (
                          <div className="border-t border-[oklch(0.25,0.05,290)]">
                            <div className="grid grid-cols-3 gap-1.5 px-2.5 py-2">
                              {player.rank !== undefined && (
                                <PStatCell
                                  label="Rank"
                                  value={`#${player.rank}`}
                                  icon={<Award className="w-3 h-3 text-amber-400" />}
                                  bg="bg-amber-500/10"
                                  text="text-amber-300"
                                />
                              )}
                              {player.kills !== undefined && (
                                <PStatCell
                                  label="Kills"
                                  value={String(player.kills)}
                                  icon={<Skull className="w-3 h-3 text-red-400" />}
                                  bg="bg-red-500/10"
                                  text="text-red-300"
                                />
                              )}
                              {player.assists !== undefined && (
                                <PStatCell
                                  label="Assists"
                                  value={String(player.assists)}
                                  icon={<Shield className="w-3 h-3 text-blue-400" />}
                                  bg="bg-blue-500/10"
                                  text="text-blue-300"
                                />
                              )}
                            </div>
                            {(player.damage !== undefined || (player.coinsEarned !== undefined && player.coinsEarned > 0)) && (
                              <div className="grid grid-cols-2 gap-1.5 px-2.5 pb-2">
                                {player.damage !== undefined && (
                                  <PStatCell
                                    label="Damage"
                                    value={String(player.damage)}
                                    icon={<Flame className="w-3 h-3 text-orange-400" />}
                                    bg="bg-orange-500/10"
                                    text="text-orange-300"
                                  />
                                )}
                                {player.coinsEarned !== undefined && player.coinsEarned > 0 ? (
                                  <PStatCell
                                    label="Earned"
                                    value={`+${formatRupees(player.coinsEarned)}`}
                                    icon={<Coins className="w-3 h-3 text-green-400" />}
                                    bg="bg-green-500/10"
                                    text="text-green-300"
                                  />
                                ) : (
                                  <PStatCell
                                    label="Earned"
                                    value="-"
                                    bg="bg-[oklch(0.20,0.04,290)]"
                                    text="text-[oklch(0.40,0.04,290)]"
                                  />
                                )}
                              </div>
                            )}
                          </div>
                        )}
                      </div>
                    );
                  })}
                </div>
              )}
            </div>
          </>
        )}

        {/* Not Found */}
        {!loading && !meta && (
          <div className="flex flex-col items-center py-16 space-y-3">
            <Trophy className="w-10 h-10 text-[oklch(0.30,0.04,290)]" />
            <p className="text-xs text-[oklch(0.40,0.04,290)]">Tournament not found</p>
            <Link href="/tournaments" className="text-xs text-blue-400 hover:underline">Go back</Link>
          </div>
        )}
      </div>
    </div>
  );
}
