'use client';

import { useState, useEffect, useRef } from 'react';
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
  ShieldAlert,
  CircleDot,
  Terminal,
  Trash2,
  RefreshCw,
  Skull,
  Crosshair,
  Flame,
  Award,
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
// BANK METHOD — PAISA → RUPEES + Coins
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
  mode: string;
  map: string;
  bannerUrl: string;
  type: string;
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
// LOG TYPES
// ═══════════════════════════════════════════════════
type LogType = 'INFO' | 'SUCCESS' | 'WARNING' | 'ERROR';
interface LogEntry { message: string; type: LogType; time: string; }

function getCurrentTime(): string {
  return new Date().toLocaleTimeString('en-IN', {
    hour: '2-digit', minute: '2-digit', second: '2-digit', hour12: false,
  });
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
// MAIN COMPONENT
// ═══════════════════════════════════════════════════
export default function TournamentDetailPage() {
  const params = useParams();
  const searchParams = useSearchParams();
  const id = params.id as string;
  const type = searchParams.get('type') || '';

  const { authLoading } = useAuth();
  const logEndRef = useRef<HTMLDivElement>(null);

  // ── Data State ──
  const [meta, setMeta] = useState<TournamentMeta | null>(null);
  const [details, setDetails] = useState<TournamentDetails | null>(null);
  const [players, setPlayers] = useState<PlayerData[]>([]);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);

  // ── Log State ──
  const [logs, setLogs] = useState<LogEntry[]>([]);
  const [showLog, setShowLog] = useState(false);

  useEffect(() => {
    logEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  }, [logs]);

  const appendLog = (message: string, type: LogType = 'INFO') => {
    setLogs((prev) => [...prev, { message, type, time: getCurrentTime() }]);
  };

  const handleClearLog = () => {
    setLogs([]);
    appendLog('Logs cleared', 'SUCCESS');
  };

  // ═══════════════════════════════════════════════════
  // LOAD TOURNAMENT DATA
  // ═══════════════════════════════════════════════════
  const loadTournament = async (isRefresh = false) => {
    if (!type || !id) {
      appendLog('Missing tournament type or ID in URL', 'ERROR');
      setLoading(false);
      setRefreshing(false);
      return;
    }

    if (isRefresh) setRefreshing(true);
    else setLoading(true);

    appendLog(`Loading tournament: ${type}/${id}`, 'INFO');

    try {
      // Fresh Remote Config fetch
      await fetchRemoteConfig();
      appendLog('Remote Config fetched', 'SUCCESS');

      // Fetch TournamentMeta + TournamentDetails in parallel
      const [metaData, detailData] = await Promise.all([
        rtdbGet(metaPath(type, id)).catch((e) => { appendLog(`Meta fetch failed: ${e.message}`, 'WARNING'); return null; }),
        rtdbGet(basePath(type, id)).catch((e) => { appendLog(`Details fetch failed: ${e.message}`, 'WARNING'); return null; }),
      ]);

      // Parse Meta
      if (metaData && typeof metaData === 'object') {
        const m = metaData as Record<string, any>;
        setMeta({
          title: m.Title || id,
          status: m.Status || 'Unknown',
          joiningFee: m.JoiningFee || 0,
          prizePool: m.PrizePool || 0,
          perKill: m.PerKill || 0,
          joinedCount: m.JoinedPlayersCount || 0,
          maxSlots: m.SlotNumbers || 0,
          dateTime: m.DateTime || '',
          mode: m.Type || '',
          map: m.Map || '',
          bannerUrl: m.BannerUrl || '',
          type: m.Mode || type,
          createdAt: m.CreatedAt || '',
        });
        appendLog(`Meta: ${m.Title || id} | Status: ${m.Status || '?'}`, 'SUCCESS');
        appendLog(`JoiningFee: ${formatRupees(m.JoiningFee || 0)} | PrizePool: ${formatRupees(m.PrizePool || 0)}`, 'INFO');
      } else {
        appendLog('Tournament meta not found', 'ERROR');
        toast.error('Tournament not found');
      }

      // Parse Details
      if (detailData && typeof detailData === 'object') {
        const d = detailData as Record<string, any>;
        setDetails({
          roomId: d.RoomID || '',
          roomPassword: d.RoomPassword || '',
          paymentStatus: d.PaymentStatus === true,
          resultStatus: d.ResultStatus === true,
          hostUID: d.HostUID || '',
          description: d.Description || '',
          lastUpdated: d.LastUpdated || '',
          videoUrl: d.VideoUrl || '',
        });
        appendLog(`Details: RoomID=${d.RoomID || 'N/A'} | HostUID=${d.HostUID ? '***' : 'N/A'}`, 'INFO');

        // Parse JoinedPlayers
        if (d.JoinedPlayers) {
          parseJoinedPlayers(d.JoinedPlayers);
        } else {
          appendLog('No JoinedPlayers found', 'WARNING');
        }
      } else {
        appendLog('Tournament details not found', 'WARNING');
      }

    } catch (e: any) {
      appendLog(`Load failed: ${e.message}`, 'ERROR');
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
      // Array format (null-padded, index 0 = null)
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
          paymentStatus: item.PaymentStatus === true,
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
      // Object format — key is seat number
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
            paymentStatus: obj.PaymentStatus === true,
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
    appendLog(`Players loaded: ${list.length}`, list.length > 0 ? 'SUCCESS' : 'WARNING');
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

  // Check if results are available (any player has kills/rank data)
  const hasResults = players.some((p) => p.kills !== undefined || p.rank !== undefined);

  // ── Log color ──
  const getLogColor = (t: LogType): string => {
    switch (t) {
      case 'SUCCESS': return 'text-green-400';
      case 'WARNING': return 'text-orange-400';
      case 'ERROR': return 'text-red-400';
      default: return 'text-[oklch(0.55,0.04,290)]';
    }
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

              {/* Mode */}
              {meta.mode && (
                <div className="p-3 rounded-xl bg-[oklch(0.18,0.04,290)] border border-[oklch(0.30,0.06,290)]">
                  <p className="text-[10px] text-[oklch(0.45,0.04,290)]">Mode</p>
                  <p className="text-sm font-bold text-white mt-0.5">{meta.mode}</p>
                </div>
              )}

              {/* Payment Status */}
              <div className="p-3 rounded-xl bg-[oklch(0.18,0.04,290)] border border-[oklch(0.30,0.06,290)]">
                <p className="text-[10px] text-[oklch(0.45,0.04,290)]">Payment Status</p>
                <p className={`text-sm font-bold mt-0.5 ${details.paymentStatus ? 'text-green-400' : 'text-orange-400'}`}>
                  {details.paymentStatus ? 'Settled' : 'Pending'}
                </p>
              </div>

              {/* Result Status */}
              <div className="p-3 rounded-xl bg-[oklch(0.18,0.04,290)] border border-[oklch(0.30,0.06,290)]">
                <p className="text-[10px] text-[oklch(0.45,0.04,290)]">Result Status</p>
                <p className={`text-sm font-bold mt-0.5 ${details.resultStatus ? 'text-green-400' : 'text-orange-400'}`}>
                  {details.resultStatus ? 'Published' : 'Pending'}
                </p>
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
            <div className="space-y-2">
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
                <div className="space-y-2">
                  {players.map((player, i) => {
                    const hasResult = player.kills !== undefined || player.rank !== undefined;
                    return (
                      <div
                        key={`${player.playerKey}-${i}`}
                        className="flex items-center gap-3 p-3.5 rounded-xl bg-[oklch(0.18,0.04,290)] border border-[oklch(0.25,0.05,290)]"
                      >
                        {/* Serial + Avatar */}
                        <div className="flex items-center gap-2 shrink-0">
                          <span className="text-[10px] font-bold text-[oklch(0.40,0.04,290)] w-4 text-center">
                            {i + 1}
                          </span>
                          <div className="w-9 h-9 rounded-full bg-gradient-to-br from-purple-500 to-fuchsia-600 flex items-center justify-center text-white text-xs font-bold">
                            {player.inGameName ? player.inGameName.charAt(0).toUpperCase() : '?'}
                          </div>
                        </div>

                        {/* Info */}
                        <div className="flex-1 min-w-0">
                          <p className="text-sm font-medium text-white truncate">
                            {player.inGameName || 'Unknown'}
                          </p>
                          <p className="text-[10px] text-[oklch(0.45,0.04,290)]">
                            UID: {player.inGameUID || '-'} &middot; Seat: {player.positionSeat || '-'} &middot; Lvl: {player.inGameLevel || '-'}
                            {player.joinTime > 0 && ` \u00b7 ${formatJoinTime(player.joinTime)}`}
                          </p>
                          {/* Fee Info */}
                          <div className="flex items-center gap-2 mt-0.5">
                            <span className="text-[10px] text-yellow-400">
                              Fee: {formatRupees(player.joiningFee)}
                            </span>
                            {player.finalAmount > 0 && (
                              <span className="text-[10px] text-green-400">
                                Paid: {formatRupees(player.finalAmount)}
                              </span>
                            )}
                            {player.referralBonusUsed > 0 && (
                              <span className="text-[10px] text-purple-400">
                                Referral: {formatRupees(player.referralBonusUsed)}
                              </span>
                            )}
                          </div>
                          {/* Result Stats */}
                          {hasResult && (
                            <div className="flex items-center gap-2 mt-0.5 flex-wrap">
                              {player.rank !== undefined && (
                                <span className="inline-flex items-center gap-0.5 text-[10px] text-amber-400">
                                  <Award className="w-2.5 h-2.5" /> Rank #{player.rank}
                                </span>
                              )}
                              {player.kills !== undefined && (
                                <span className="inline-flex items-center gap-0.5 text-[10px] text-red-400">
                                  <Skull className="w-2.5 h-2.5" /> {player.kills} Kills
                                </span>
                              )}
                              {player.assists !== undefined && (
                                <span className="inline-flex items-center gap-0.5 text-[10px] text-blue-400">
                                  <Shield className="w-2.5 h-2.5" /> {player.assists} Assists
                                </span>
                              )}
                              {player.damage !== undefined && (
                                <span className="inline-flex items-center gap-0.5 text-[10px] text-orange-400">
                                  <Flame className="w-2.5 h-2.5" /> {player.damage} Dmg
                                </span>
                              )}
                              {player.coinsEarned !== undefined && player.coinsEarned > 0 && (
                                <span className="inline-flex items-center gap-0.5 text-[10px] text-green-400 font-bold">
                                  <Coins className="w-2.5 h-2.5" /> +{formatRupees(player.coinsEarned)}
                                </span>
                              )}
                            </div>
                          )}
                        </div>

                        {/* Payment Status Badge */}
                        <span className={`inline-flex items-center gap-1 px-2.5 py-1 rounded-full text-[10px] font-semibold border shrink-0 ${
                          player.paymentStatus
                            ? 'border-green-500/30 text-green-400 bg-green-500/10'
                            : 'border-yellow-500/30 text-yellow-400 bg-yellow-500/10'
                        }`}>
                          {player.paymentStatus ? <Shield className="w-3 h-3" /> : <CircleDot className="w-3 h-3" />}
                          {player.paymentStatus ? 'Paid' : 'Unpaid'}
                        </span>
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

        {/* Toggle Log */}
        {logs.length > 0 && (
          <button onClick={() => setShowLog(!showLog)}
            className="w-full flex items-center justify-between rounded-xl bg-[oklch(0.18,0.04,290)] border border-[oklch(0.28,0.05,290)] p-3">
            <div className="flex items-center gap-2">
              <Terminal className="w-4 h-4 text-yellow-400" />
              <span className="text-sm font-bold text-yellow-400">Activity Log</span>
              {refreshing && <div className="w-2 h-2 rounded-full bg-green-400 animate-pulse ml-1" />}
            </div>
            <span className="text-[11px] text-[oklch(0.50,0.04,290)]">{showLog ? 'HIDE' : 'SHOW'} ({logs.length})</span>
          </button>
        )}

        {/* Log Viewer */}
        {showLog && logs.length > 0 && (
          <div className="rounded-2xl bg-[oklch(0.12,0.02,290)] border border-[oklch(0.28,0.05,290)] overflow-hidden">
            <div className="flex items-center justify-between px-3.5 py-2.5 bg-[oklch(0.10,0.02,290)] border-b border-[oklch(0.25,0.05,290)]">
              <span className="text-[11px] font-semibold text-[oklch(0.70,0.04,290)]">Logcat</span>
              <button onClick={handleClearLog}
                className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg bg-gradient-to-r from-red-500 to-orange-500 text-white text-[11px] font-bold shadow-lg shadow-red-500/20 active:scale-95 transition-transform">
                <Trash2 className="w-3 h-3" /> CLEAR
              </button>
            </div>
            <div className="p-3 h-[300px] lg:h-[400px] overflow-y-auto scrollbar-none">
              <div className="space-y-0.5">
                {logs.map((log, i) => (
                  <p key={i} className={`text-[11px] font-mono leading-relaxed ${getLogColor(log.type)}`}>
                    [{log.time}] {log.message}
                  </p>
                ))}
                {refreshing && <span className="inline-block w-1.5 h-3 bg-yellow-400 animate-pulse ml-1" />}
              </div>
              <div ref={logEndRef} />
            </div>
          </div>
        )}
      </div>
    </div>
  );
}
