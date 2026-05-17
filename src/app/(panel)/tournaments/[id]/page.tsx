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
  X,
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

interface TournamentMeta {
  title: string;
  status: string;
  joiningFee: number;
  prizePool: number;
  perKill: number;
  joinedCount: number;
  maxSlots: number;
  dateTime: string;
  mode: string;
  type: string;
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
// POPUP STAT — Gaming style cell for full detail popup
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
    <div
      className="fixed inset-0 z-50 flex items-end lg:items-center justify-center"
      onClick={onClose}
    >
      {/* Backdrop */}
      <div className="absolute inset-0 bg-black/60 backdrop-blur-sm" />

      {/* Popup Card — slides up on phone, centered on PC */}
      <div
        className="relative w-full max-w-lg max-h-[85vh] overflow-y-auto rounded-t-2xl lg:rounded-2xl bg-[oklch(0.16,0.04,290)] border border-[oklch(0.30,0.06,290)] shadow-2xl shadow-black/40"
        onClick={(e) => e.stopPropagation()}
      >
        {/* Popup Header */}
        <div className="sticky top-0 z-10 bg-gradient-to-r from-purple-600 to-fuchsia-700 px-4 py-4 rounded-t-2xl lg:rounded-t-2xl">
          <button
            onClick={onClose}
            className="absolute top-3 right-3 w-8 h-8 rounded-full bg-white/15 hover:bg-white/25 flex items-center justify-center transition-colors"
          >
            <X className="w-4 h-4 text-white" />
          </button>
          <div className="flex items-center gap-3">
            <div className="w-12 h-12 rounded-full bg-white/20 flex items-center justify-center text-white text-lg font-bold shrink-0">
              {player.inGameName ? player.inGameName.charAt(0).toUpperCase() : '?'}
            </div>
            <div className="min-w-0">
              <p className="text-lg font-bold text-white truncate leading-tight">
                {player.inGameName || 'Unknown'}
              </p>
              <p className="text-xs text-white/70 font-mono mt-0.5">
                UID: {player.inGameUID || '-'}
              </p>
            </div>
            <span className={`inline-flex items-center gap-1 px-2.5 py-1 rounded-full text-[11px] font-semibold border shrink-0 ml-auto ${
              player.paymentStatus
                ? 'border-green-400/40 text-green-200 bg-green-500/20'
                : 'border-yellow-400/40 text-yellow-200 bg-yellow-500/20'
            }`}>
              {player.paymentStatus ? <ShieldCheck className="w-3.5 h-3.5" /> : <CircleDot className="w-3.5 h-3.5" />}
              {player.paymentStatus ? 'Paid' : 'Unpaid'}
            </span>
          </div>
        </div>

        {/* Popup Body */}
        <div className="p-4 space-y-4">

          {/* Basic Info */}
          <div>
            <p className="text-[10px] font-bold text-[oklch(0.45,0.04,290)] uppercase tracking-wider mb-2">Basic Info</p>
            <div className="grid grid-cols-3 gap-2">
              <PopStat
                label="Seat"
                value={String(player.positionSeat || '-')}
                icon={<Target className="w-3.5 h-3.5 text-cyan-400" />}
                bg="bg-cyan-500/10"
                text="text-cyan-300"
              />
              <PopStat
                label="Level"
                value={String(player.inGameLevel || '-')}
                icon={<Shield className="w-3.5 h-3.5 text-blue-400" />}
                bg="bg-blue-500/10"
                text="text-blue-300"
              />
              <PopStat
                label="Joined"
                value={player.joinTime > 0 ? formatJoinTime(player.joinTime) : '-'}
                icon={<Clock className="w-3.5 h-3.5 text-[oklch(0.50,0.04,290)]" />}
                bg="bg-[oklch(0.22,0.04,290)]"
                text="text-[oklch(0.70,0.04,290)]"
              />
            </div>
          </div>

          {/* Payment Info */}
          <div>
            <p className="text-[10px] font-bold text-[oklch(0.45,0.04,290)] uppercase tracking-wider mb-2">Payment</p>
            <div className="grid grid-cols-2 gap-2">
              <PopStat
                label="Entry Fee"
                value={formatRupees(player.joiningFee)}
                icon={<Coins className="w-3.5 h-3.5 text-yellow-400" />}
                bg="bg-yellow-500/10"
                text="text-yellow-300"
              />
              <PopStat
                label="Amount Paid"
                value={player.finalAmount > 0 ? formatRupees(player.finalAmount) : '-'}
                icon={<Coins className="w-3.5 h-3.5 text-green-400" />}
                bg="bg-green-500/10"
                text="text-green-300"
              />
            </div>
            {player.referralBonusUsed > 0 && (
              <div className="mt-2">
                <PopStat
                  label="Referral Bonus Used"
                  value={formatRupees(player.referralBonusUsed)}
                  icon={<Coins className="w-3.5 h-3.5 text-purple-400" />}
                  bg="bg-purple-500/10"
                  text="text-purple-300"
                />
              </div>
            )}
          </div>

          {/* Match Results — Only if results exist */}
          {(player.kills !== undefined || player.rank !== undefined || player.assists !== undefined || player.damage !== undefined) && (
            <div>
              <p className="text-[10px] font-bold text-[oklch(0.45,0.04,290)] uppercase tracking-wider mb-2">Match Results</p>
              <div className="grid grid-cols-3 gap-2">
                {player.rank !== undefined && (
                  <PopStat
                    label="Rank"
                    value={`#${player.rank}`}
                    icon={<Award className="w-3.5 h-3.5 text-amber-400" />}
                    bg="bg-amber-500/10"
                    text="text-amber-300"
                  />
                )}
                {player.kills !== undefined && (
                  <PopStat
                    label="Kills"
                    value={String(player.kills)}
                    icon={<Skull className="w-3.5 h-3.5 text-red-400" />}
                    bg="bg-red-500/10"
                    text="text-red-300"
                  />
                )}
                {player.assists !== undefined && (
                  <PopStat
                    label="Assists"
                    value={String(player.assists)}
                    icon={<Shield className="w-3.5 h-3.5 text-blue-400" />}
                    bg="bg-blue-500/10"
                    text="text-blue-300"
                  />
                )}
              </div>
              {(player.damage !== undefined || player.deaths !== undefined) && (
                <div className="grid grid-cols-2 gap-2 mt-2">
                  {player.damage !== undefined && (
                    <PopStat
                      label="Damage"
                      value={String(player.damage)}
                      icon={<Flame className="w-3.5 h-3.5 text-orange-400" />}
                      bg="bg-orange-500/10"
                      text="text-orange-300"
                    />
                  )}
                  {player.deaths !== undefined && (
                    <PopStat
                      label="Deaths"
                      value={String(player.deaths)}
                      icon={<Skull className="w-3.5 h-3.5 text-gray-400" />}
                      bg="bg-gray-500/10"
                      text="text-gray-300"
                    />
                  )}
                </div>
              )}
              {player.coinsEarned !== undefined && (
                <div className="mt-2">
                  <PopStat
                    label="Coins Earned"
                    value={player.coinsEarned > 0 ? `+${formatRupees(player.coinsEarned)}` : '-'}
                    icon={<Coins className="w-3.5 h-3.5 text-green-400" />}
                    bg="bg-green-500/15"
                    text="text-green-300"
                  />
                </div>
              )}
            </div>
          )}

          {/* Transaction ID */}
          {player.playerKey && (
            <div className="pt-2 border-t border-[oklch(0.25,0.05,290)]">
              <p className="text-[10px] text-[oklch(0.40,0.04,290)]">
                Player Key: <span className="font-mono text-[oklch(0.55,0.04,290)]">{player.playerKey}</span>
              </p>
            </div>
          )}
        </div>
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

  // ── Popup State ──
  const [selectedPlayer, setSelectedPlayer] = useState<PlayerData | null>(null);

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
          mode: m.Mode || type,
          type: m.Type || '',
          map: m.Map || '',
          bannerUrl: m.BannerUrl || '',
          createdAt: m.CreatedAt || '',
        });
      } else {
        toast.error('Tournament not found');
      }

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
  // PARSE JOINED PLAYERS
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
              <div className="p-3 rounded-xl bg-[oklch(0.18,0.04,290)] border border-[oklch(0.30,0.06,290)]">
                <p className="text-[10px] text-[oklch(0.45,0.04,290)]">Entry Fee</p>
                <div className="flex items-center gap-1 mt-0.5">
                  <Coins className="w-3.5 h-3.5 text-yellow-400" />
                  <span className="text-sm font-bold text-white">{formatRupees(meta.joiningFee)}</span>
                </div>
              </div>

              <div className="p-3 rounded-xl bg-[oklch(0.18,0.04,290)] border border-[oklch(0.30,0.06,290)]">
                <p className="text-[10px] text-[oklch(0.45,0.04,290)]">Room ID</p>
                <p className="text-sm font-bold text-white font-mono mt-0.5">{details.roomId || 'Not Set'}</p>
              </div>

              <div className="p-3 rounded-xl bg-[oklch(0.18,0.04,290)] border border-[oklch(0.30,0.06,290)]">
                <p className="text-[10px] text-[oklch(0.45,0.04,290)]">Room Password</p>
                <p className="text-sm font-bold text-white font-mono mt-0.5">{details.roomPassword || 'Not Set'}</p>
              </div>

              {meta.perKill > 0 && (
                <div className="p-3 rounded-xl bg-[oklch(0.18,0.04,290)] border border-[oklch(0.30,0.06,290)]">
                  <p className="text-[10px] text-[oklch(0.45,0.04,290)]">Per Kill</p>
                  <div className="flex items-center gap-1 mt-0.5">
                    <Crosshair className="w-3.5 h-3.5 text-red-400" />
                    <span className="text-sm font-bold text-white">{formatRupees(meta.perKill)}</span>
                  </div>
                </div>
              )}

              {meta.map && (
                <div className="p-3 rounded-xl bg-[oklch(0.18,0.04,290)] border border-[oklch(0.30,0.06,290)]">
                  <p className="text-[10px] text-[oklch(0.45,0.04,290)]">Map</p>
                  <p className="text-sm font-bold text-white mt-0.5">{meta.map}</p>
                </div>
              )}

              <div className="p-3 rounded-xl bg-[oklch(0.18,0.04,290)] border border-[oklch(0.30,0.06,290)]">
                <p className="text-[10px] text-[oklch(0.45,0.04,290)]">Payment</p>
                <p className={`text-sm font-bold mt-0.5 ${details.paymentStatus ? 'text-green-400' : 'text-orange-400'}`}>
                  {details.paymentStatus ? 'Settled' : 'Pending'}
                </p>
              </div>

              <div className="p-3 rounded-xl bg-[oklch(0.18,0.04,290)] border border-[oklch(0.30,0.06,290)]">
                <p className="text-[10px] text-[oklch(0.45,0.04,290)]">Result</p>
                <p className={`text-sm font-bold mt-0.5 ${details.resultStatus ? 'text-green-400' : 'text-orange-400'}`}>
                  {details.resultStatus ? 'Published' : 'Pending'}
                </p>
              </div>

              <div className="p-3 rounded-xl bg-[oklch(0.18,0.04,290)] border border-[oklch(0.30,0.06,290)]">
                <p className="text-[10px] text-[oklch(0.45,0.04,290)]">Slots</p>
                <div className="flex items-center gap-1 mt-0.5">
                  <Users className="w-3.5 h-3.5 text-blue-400" />
                  <span className="text-sm font-bold text-white">{meta.joinedCount}/{meta.maxSlots}</span>
                </div>
              </div>
            </div>

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

            {/* ═══ Players List ═══ */}
            <div className="space-y-3">
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-2">
                  <Users className="w-4 h-4 text-[oklch(0.60,0.04,290)]" />
                  <p className="text-sm font-semibold text-white">Joined Players</p>
                </div>
                <div className="flex items-center gap-2">
                  <span className="text-xs text-[oklch(0.45,0.04,290)]">
                    {players.length} players
                  </span>
                  <span className="text-[10px] text-[oklch(0.40,0.04,290)]">Tap for details</span>
                </div>
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
                          <p className="text-[10px] font-bold text-[oklch(0.65,0.04,290)] mt-0.5">{player.joinTime > 0 ? formatJoinTime(player.joinTime) : '-'}</p>
                        </div>
                      </div>

                      {/* Paid Badge */}
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

        {/* Not Found */}
        {!loading && !meta && (
          <div className="flex flex-col items-center py-16 space-y-3">
            <Trophy className="w-10 h-10 text-[oklch(0.30,0.04,290)]" />
            <p className="text-xs text-[oklch(0.40,0.04,290)]">Tournament not found</p>
            <Link href="/tournaments" className="text-xs text-blue-400 hover:underline">Go back</Link>
          </div>
        )}
      </div>

      {/* ═══ Player Detail Popup ═══ */}
      {selectedPlayer && (
        <PlayerPopup
          player={selectedPlayer}
          onClose={() => setSelectedPlayer(null)}
        />
      )}
    </div>
  );
}
