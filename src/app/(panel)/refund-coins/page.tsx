'use client';

import { useState, useEffect, useRef } from 'react';
import { Input } from '@/components/ui/input';
import { Button } from '@/components/ui/button';
import { Label } from '@/components/ui/label';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import { toast } from 'sonner';
import { useAuth } from '@/context/AuthContext';
// Cloud Function URL from Vercel ENV (no Remote Config)
const FUN_REFUND_JOINED_PLAYERS_URL = process.env.NEXT_PUBLIC_FUN_REFUND_JOINED_PLAYERS || '';
import { rtdbGet } from '@/lib/rtdb';
import { doc, onSnapshot } from 'firebase/firestore';
import { db } from '@/lib/firebase';
import {
  RotateCcw,
  RefreshCw,
  X,
  Users,
  Wallet,
  Activity,
} from 'lucide-react';

// ═══════════════════════════════════════════════════
// CONSTANTS
// ═══════════════════════════════════════════════════
const TOURNAMENT_TYPES = [
  { value: 'BattleRoyal', label: 'BattleRoyal' },
  { value: 'ClashSquad', label: 'ClashSquad' },
  { value: 'FreeTournaments', label: 'FreeTournaments' },
  { value: 'LoneWolf', label: 'LoneWolf' },
];

// JoinedPlayers auto-detected as array or object — no hardcoded type list needed

const basePath = (type: string, id: string) =>
  `Tournaments/TournamentDetails/${type}/${id}`;
const metaPath = (type: string) =>
  `Tournaments/TournamentMeta/${type}`;

// ═══════════════════════════════════════════════════
// TYPES
// ═══════════════════════════════════════════════════
interface RefundPlayerModel {
  playerKey: string;
  tournamentType: string;
  tournamentId: string;
  inGameName: string;
  positionSeat: number;
  userId: string;
  joiningFee: number; // PAISA
}

// ═══════════════════════════════════════════════════
// HELPERS
// ═══════════════════════════════════════════════════

// PAISA → "X Coins" display (NEVER show paisa / ₹ to user)
function formatRupees(paisa: number): string {
  const rupees = paisa / 100;
  return rupees % 1 === 0 ? `${Math.round(rupees)} Coins` : `${parseFloat(rupees.toFixed(2))} Coins`;
}

// Convert RTDB object with numeric keys to array
const convertToArray = (obj: any): any[] => {
  if (!obj || typeof obj !== 'object') return [];
  const keys = Object.keys(obj).map(Number).filter(k => !isNaN(k));
  const maxIdx = keys.length > 0 ? Math.max(...keys) : -1;
  if (maxIdx < 0) return [];
  const arr: any[] = [];
  for (let i = 0; i <= maxIdx; i++) {
    arr.push(obj[i.toString()]);
  }
  return arr;
};

// ═══════════════════════════════════════════════════
// MAIN PAGE
// ═══════════════════════════════════════════════════
export default function RefundCoinsPage() {
  const { user, isLoading: authLoading } = useAuth();

  // ── UI State ──
  const [tournamentType, setTournamentType] = useState('');
  const [tournamentId, setTournamentId] = useState('');
  const [typeEnabled, setTypeEnabled] = useState(false);
  const [idEnabled, setIdEnabled] = useState(false);

  // ── Loading states ──
  const [configLoading, setConfigLoading] = useState(true);
  const [dataLoading, setDataLoading] = useState(false);
  const [refreshing, setRefreshing] = useState(false);
  const [refundProcessing, setRefundProcessing] = useState(false);

  // ── Tournament data ──
  const tournamentIdsMap = useRef<Record<string, string[]>>({});

  // ── Players ──
  const [players, setPlayers] = useState<RefundPlayerModel[]>([]);
  const [joiningFeePaisa, setJoiningFeePaisa] = useState(0);

  // ── Dialog state ──
  const [dialogOpen, setDialogOpen] = useState(false);
  const [confirmDialogOpen, setConfirmDialogOpen] = useState(false);
  const [selectedPlayer, setSelectedPlayer] = useState<RefundPlayerModel | null>(null);
  const [refundPercent, setRefundPercent] = useState(100);
  const [customPercent, setCustomPercent] = useState('100');

  // ── Realtime Wallet Balance ──
  const [walletBalance, setWalletBalance] = useState(0);
  const [displayBalance, setDisplayBalance] = useState(0);
  const [walletStatus, setWalletStatus] = useState<'idle' | 'deducting'>('idle');
  const animationRef = useRef<number | null>(null);
  const prevBalanceRef = useRef(0);

  // ── Function URL ──
  const refundFunctionUrl = useRef<string>('');

  // ═══════════════════════════════════════════════════
  // INIT — Fetch Config + Load Tournaments
  // ═══════════════════════════════════════════════════
  useEffect(() => {
    if (authLoading || !user) return;
    const init = async () => {
      setConfigLoading(true);

      refundFunctionUrl.current = FUN_REFUND_JOINED_PLAYERS_URL;

      if (!refundFunctionUrl.current) {
        toast.warning('Refund function not configured');
      }

      setConfigLoading(false);
      loadTournamentIds();
    };
    init();
  }, [user, authLoading]);

  // ── Realtime Wallet Balance (onSnapshot) ──
  useEffect(() => {
    if (authLoading || !user) return;

    const walletDocRef = doc(db, 'hosts', user.uid, 'accountBalance', 'wallet');
    const unsubscribe = onSnapshot(walletDocRef, (snap) => {
      if (snap.exists()) {
        const bal = snap.data()?.walletBalance || 0;
        prevBalanceRef.current = walletBalance;
        setWalletBalance(bal);
        setWalletStatus('deducting');
      }
    }, () => {});

    return () => unsubscribe();
  }, [user, authLoading]);

  // ── Animated Balance Counter (cubic ease-out ~1s) ──
  useEffect(() => {
    const target = walletBalance;

    if (prevBalanceRef.current === target) {
      setWalletStatus('idle');
      return;
    }

    if (animationRef.current) {
      cancelAnimationFrame(animationRef.current);
    }

    const startVal = displayBalance;
    const startTime = performance.now();
    const duration = 1000;
    const easeOut = (t: number) => 1 - Math.pow(1 - t, 3);

    const animate = (now: number) => {
      const elapsed = now - startTime;
      const progress = Math.min(elapsed / duration, 1);
      const easedProgress = easeOut(progress);
      const current = startVal + (target - startVal) * easedProgress;
      setDisplayBalance(Math.round(current));

      if (progress < 1) {
        animationRef.current = requestAnimationFrame(animate);
      } else {
        setDisplayBalance(target);
        setWalletStatus('idle');
      }
    };

    animationRef.current = requestAnimationFrame(animate);
  }, [walletBalance]);

  // ═══════════════════════════════════════════════════
  // LOAD TOURNAMENT IDS
  // ═══════════════════════════════════════════════════
  const loadTournamentIds = async () => {
    if (dataLoading) return;

    setDataLoading(true);
    tournamentIdsMap.current = {};

    for (const type of TOURNAMENT_TYPES) {
      try {
        const data = await rtdbGet(metaPath(type.value));
        const ids = parseTournamentMetaIds(data, type.value);
        tournamentIdsMap.current[type.value] = ids;
      } catch (e: any) {
        toast.error(`Failed to load ${type.value}`);
        tournamentIdsMap.current[type.value] = [];
      }
    }

    setDataLoading(false);
    setTypeEnabled(true);

    updateTournamentIdField(TOURNAMENT_TYPES[0].value);
    setTournamentType(TOURNAMENT_TYPES[0].value);
    toast.success('Tournaments loaded');
  };

  const parseTournamentMetaIds = (data: any, type: string): string[] => {
    const ids: string[] = [];
    if (!data || data === null || typeof data !== 'object') return ids;
    for (const key of Object.keys(data)) {
      ids.push(key);
    }
    return ids;
  };

  const updateTournamentIdField = (selectedType: string) => {
    const ids = tournamentIdsMap.current[selectedType] || [];
    if (ids.length > 0) {
      setTournamentId(ids[0]);
      setIdEnabled(true);
    } else {
      setTournamentId('');
      setIdEnabled(false);
    }
  };

  const handleTypeChange = (value: string) => {
    setTournamentType(value);
    updateTournamentIdField(value);
    setPlayers([]);
  };

  // ═══════════════════════════════════════════════════
  // REFRESH
  // ═══════════════════════════════════════════════════
  const handleRefresh = async () => {
    if (dataLoading || refreshing) return;
    if (!tournamentType) {
      toast.error('Select a tournament type first');
      return;
    }

    const previousId = tournamentId.trim();
    setRefreshing(true);

    try {
      const data = await rtdbGet(metaPath(tournamentType));
      const ids = parseTournamentMetaIds(data, tournamentType);
      tournamentIdsMap.current[tournamentType] = ids;

      let selectedId = previousId;
      if (ids.length > 0) {
        if (ids.includes(previousId)) {
          selectedId = previousId;
          setTournamentId(previousId);
        } else {
          selectedId = ids[0];
          setTournamentId(ids[0]);
        }
        setIdEnabled(true);
      } else {
        selectedId = '';
        setTournamentId('');
        setIdEnabled(false);
      }

      // Use selectedId directly (React state is async — tournamentId not updated yet)
      if (!selectedId) return;

      setRefreshing(true);
      setPlayers([]);

      const tData = await rtdbGet(basePath(tournamentType, selectedId));

      if (!tData || tData === null) {
        toast.error('Tournament not found');
        setRefreshing(false);
        return;
      }

      // ═══ HostUID Check — sirf apni tournament ═══
      const hostUID = tData.HostUID || tData.hostUID || '';
      if (user && hostUID && hostUID !== user.uid) {
        toast.error('ACCESS DENIED: This tournament belongs to another host');
        setRefreshing(false);
        return;
      }

      const fee = tData.JoiningFee || 0;
      setJoiningFeePaisa(fee);

      if (tData.JoinedPlayers) {
        parseJoinedPlayers(tData.JoinedPlayers, tournamentType, selectedId, fee);
      } else {
        toast.warning('No players found');
      }
    } catch (e: any) {
      toast.error('Refresh failed');
    } finally {
      setRefreshing(false);
    }
  };

  // ═══════════════════════════════════════════════════
  // FETCH TOURNAMENT + PLAYERS
  // ═══════════════════════════════════════════════════
  const fetchTournamentAndPlayersData = async () => {
    const id = tournamentId.trim();
    if (!id) return;

    setRefreshing(true);
    setPlayers([]);

    try {
      const data = await rtdbGet(basePath(tournamentType, id));

      if (!data || data === null) {
        toast.error('Tournament not found');
        setRefreshing(false);
        return;
      }

      // ═══ HostUID Check — sirf apni tournament ═══
      const hostUID = data.HostUID || data.hostUID || '';
      if (user && hostUID && hostUID !== user.uid) {
        toast.error('ACCESS DENIED: This tournament belongs to another host');
        setRefreshing(false);
        return;
      }

      const fee = data.JoiningFee || 0;
      setJoiningFeePaisa(fee);

      if (data.JoinedPlayers) {
        parseJoinedPlayers(data.JoinedPlayers, tournamentType, id, fee);
      } else {
        toast.warning('No players found');
      }
    } catch (e: any) {
      toast.error('Failed to fetch tournament');
    } finally {
      setRefreshing(false);
    }
  };

  // ═══════════════════════════════════════════════════
  // PARSE JOINED PLAYERS
  // ═══════════════════════════════════════════════════
  const parseJoinedPlayers = (raw: any, type: string, tid: string, fee: number) => {
    const list: RefundPlayerModel[] = [];

    if (!raw || typeof raw !== 'object') {
      setPlayers(list);
      if (list.length === 0) toast.warning('No players found');
      return;
    }

    // Auto-detect format: array vs object (any type can have either format)
    if (Array.isArray(raw)) {
      for (let i = 0; i < raw.length; i++) {
        const item = raw[i];
        if (!item || typeof item !== 'object') continue;
        list.push({
          playerKey: i.toString(),
          tournamentType: type,
          tournamentId: tid,
          inGameName: item.InGameName || '',
          positionSeat: item.PositionSeat || 0,
          userId: item.userId || '',
          joiningFee: fee,
        });
      }
    } else {
      for (const [key, val] of Object.entries(raw)) {
        const obj = val as Record<string, any>;
        if (!obj || typeof obj !== 'object') continue;
        list.push({
          playerKey: key,
          tournamentType: type,
          tournamentId: tid,
          inGameName: obj.InGameName || '',
          positionSeat: obj.PositionSeat || 0,
          userId: obj.userId || '',
          joiningFee: fee,
        });
      }
    }

    setPlayers(list);
    if (list.length > 0) {
      toast.success(`${list.length} players loaded`);
    } else {
      toast.warning('No players found');
    }
  };

  // ═══════════════════════════════════════════════════
  // REFUND DIALOG
  // ═══════════════════════════════════════════════════
  const openRefundDialog = (player: RefundPlayerModel) => {
    setSelectedPlayer(player);
    setRefundPercent(100);
    setCustomPercent('100');
    setDialogOpen(true);
  };

  const handleSliderChange = (val: number) => {
    setRefundPercent(val);
    setCustomPercent(String(val));
  };

  const handleCustomPercentChange = (val: string) => {
    const num = parseInt(val);
    if (!isNaN(num) && num >= 1 && num <= 100) {
      setCustomPercent(val);
      setRefundPercent(num);
    }
  };

  const refundAmountPaisa = selectedPlayer
    ? Math.floor((selectedPlayer.joiningFee * refundPercent) / 100)
    : 0;

  const handleProceedRefund = () => {
    if (!selectedPlayer) return;
    setDialogOpen(false);
    setConfirmDialogOpen(true);
  };

  // ═══════════════════════════════════════════════════
  // CONFIRM + CALL FUNCTION
  // ═══════════════════════════════════════════════════
  const handleRefundConfirm = async () => {
    if (!selectedPlayer || !user) return;
    setConfirmDialogOpen(false);
    await callRefundFunction(selectedPlayer, refundAmountPaisa, refundPercent);
  };

  // ═══════════════════════════════════════════════════
  // CALL FIREBASE FUNCTION — refundJoinedPlayers
  // ═══════════════════════════════════════════════════
  const callRefundFunction = async (
    player: RefundPlayerModel,
    amountPaisa: number,
    percent: number,
  ) => {
    setRefundProcessing(true);

    const funcUrl = FUN_REFUND_JOINED_PLAYERS_URL;

    if (!funcUrl) {
      toast.error('Refund function not configured');
      setRefundProcessing(false);
      return;
    }

    try {
      const token = await user.getIdToken();
      if (!token) {
        toast.error('Authentication failed');
        setRefundProcessing(false);
        return;
      }

      const requestBody = {
        tournamentType: player.tournamentType,
        tournamentId: player.tournamentId,
        hostId: user.uid,
        playerKey: player.playerKey,
        userId: player.userId,
        inGameName: player.inGameName,
        refundPercent: percent,
        joiningFee: player.joiningFee,
      };

      const response = await fetch(funcUrl, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${token}`,
        },
        body: JSON.stringify(requestBody),
      });

      const data = await response.json();

      if (!response.ok || data.error) {
        handleFunctionError(data);
        return;
      }

      // ═══ SUCCESS ═══
      toast.success(`${player.inGameName} — ${formatRupees(amountPaisa)} refunded (${percent}%)`, {
        description: `TxnId: ${data.transactionId || 'N/A'} | Wallet: ${formatRupees(data.hostWalletBalance)} → ${formatRupees(data.newHostWallet)}`,
        duration: 6000,
      });

      await fetchTournamentAndPlayersData();

    } catch (e: any) {
      toast.error('Refund failed', { description: e.message, duration: 6000 });
    } finally {
      setRefundProcessing(false);
    }
  };

  // ═══════════════════════════════════════════════════
  // HANDLE FUNCTION ERROR (Toast Only)
  // ═══════════════════════════════════════════════════
  const handleFunctionError = (data: any) => {
    const error = data.error || 'unknown';

    switch (error) {
      case 'notOwner':
        toast.error('Access Denied', {
          description: 'You do not own this tournament',
          duration: 6000,
        });
        break;

      case 'insufficientBalance':
        toast.warning('Insufficient Balance', {
          description: `Required: ${formatRupees(data.refundAmount || 0)}, Available: ${formatRupees(data.hostWalletBalance || 0)}`,
          duration: 6000,
        });
        break;

      case 'processFailed':
        toast.error('Refund Failed', {
          description: data.message || `Failed at step ${data.failedStep}`,
          duration: 6000,
        });
        break;

      default:
        toast.error('Refund Failed', {
          description: data.message || 'Unknown error',
          duration: 6000,
        });
    }

    setRefundProcessing(false);
  };

  const isLoading = configLoading || dataLoading || refreshing;

  // ═══════════════════════════════════════════════════
  // RENDER
  // ═══════════════════════════════════════════════════
  return (
    <div className="min-h-screen pb-20 lg:pb-6">
      {/* Header */}
      <header className="bg-gradient-to-r from-emerald-500 to-green-700 px-4 lg:px-6 py-6 sticky top-0 z-20">
        <div className="max-w-4xl mx-auto">
          <h1 className="text-xl lg:text-2xl font-extrabold text-white flex items-center gap-2">
            <RotateCcw className="w-6 h-6" />
            Tournament Refund Management
          </h1>
          <p className="text-white/60 text-sm mt-1">Step 6 — Refund joining fees to players</p>
        </div>
      </header>

      <div className="max-w-4xl mx-auto px-4 lg:px-6 py-6 space-y-4">

        {/* ── Realtime Wallet Balance ── */}
        <div className="rounded-2xl bg-[oklch(0.16,0.04,290)] border border-[oklch(0.30,0.06,290)] p-4">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-3">
              <div className="w-10 h-10 rounded-xl bg-gradient-to-br from-emerald-500 to-green-600 flex items-center justify-center shadow-lg shadow-green-500/20">
                <Wallet className="w-5 h-5 text-white" />
              </div>
              <div>
                <p className="text-[11px] text-[oklch(0.55,0.04,290)] font-semibold">Host Wallet Balance</p>
                <p className={`text-xl font-extrabold tabular-nums transition-colors duration-500 ${
                  walletStatus === 'deducting' ? 'text-red-400' : 'text-green-400'
                }`}>
                  {formatRupees(displayBalance)}
                </p>
              </div>
            </div>
            <div className="flex items-center gap-2">
              <Activity className={`w-4 h-4 ${walletStatus === 'deducting' ? 'text-red-400 animate-pulse' : 'text-green-400'}`} />
              <span className={`text-[11px] font-bold ${walletStatus === 'deducting' ? 'text-red-400' : 'text-green-400'}`}>
                {walletStatus === 'deducting' ? 'Deducting...' : 'Live'}
              </span>
            </div>
          </div>
        </div>

        {/* Tournament Type + ID */}
        <div className="grid grid-cols-2 gap-3">
          <div className="space-y-1.5">
            <Label className="text-[11px] text-[oklch(0.70,0.04,290)] font-semibold">Tournament Type</Label>
            <Select value={tournamentType} onValueChange={handleTypeChange} disabled={!typeEnabled || isLoading}>
              <SelectTrigger className="bg-[oklch(0.22,0.04,290)] border-[oklch(0.35,0.06,290)] text-white h-10 rounded-xl text-sm disabled:opacity-40">
                <SelectValue placeholder="Select Type" />
              </SelectTrigger>
              <SelectContent>
                {TOURNAMENT_TYPES.map((t) => (
                  <SelectItem key={t.value} value={t.value}>{t.label}</SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>
          <div className="space-y-1.5">
            <Label className="text-[11px] text-[oklch(0.70,0.04,290)] font-semibold">Tournament ID</Label>
            <Input
              value={tournamentId}
              onChange={(e) => setTournamentId(e.target.value)}
              placeholder={idEnabled ? 'Tournament ID' : 'No tournaments available'}
              disabled={!idEnabled}
              className="bg-[oklch(0.22,0.04,290)] border-[oklch(0.35,0.06,290)] text-white placeholder:text-[oklch(0.40,0.04,290)] h-10 rounded-xl text-sm text-center font-mono disabled:opacity-40"
            />
          </div>
        </div>

        {/* Refresh Button */}
        <Button onClick={handleRefresh} disabled={isLoading || refundProcessing}
          className="w-full h-11 rounded-xl bg-gradient-to-r from-blue-500 to-blue-600 text-white font-bold text-sm shadow-lg shadow-blue-500/20 disabled:opacity-40">
          {refreshing ? <div className="w-4 h-4 border-2 border-white/30 border-t-white rounded-full animate-spin mr-2" /> :
            <RefreshCw className="w-4 h-4 mr-2" />} REFRESH & LOAD PLAYERS
        </Button>

        {/* Tournament Info */}
        {players.length > 0 && (
          <div className="rounded-xl bg-[oklch(0.18,0.04,290)] border border-[oklch(0.30,0.06,290)] p-3 flex items-center justify-between">
            <div className="flex items-center gap-2">
              <Users className="w-4 h-4 text-green-400" />
              <span className="text-xs text-[oklch(0.60,0.04,290)]">
                Joining Fee: <span className="font-bold text-green-400">{formatRupees(joiningFeePaisa)}</span>
              </span>
            </div>
            <span className="text-xs text-[oklch(0.60,0.04,290)]">
              Players: <span className="font-bold text-white">{players.length}</span>
            </span>
          </div>
        )}

        {/* Player Cards */}
        {players.length > 0 && (
          <div className="space-y-2.5">
            <p className="text-xs font-bold text-green-400">Players: {players.length}</p>

            {players.map((player, idx) => {
              const feeRupees = player.joiningFee / 100;
              const feeDisplay = feeRupees % 1 === 0 ? Math.round(feeRupees) : parseFloat(feeRupees.toFixed(2));
              return (
                <button key={`${player.playerKey}-${idx}`}
                  onClick={() => openRefundDialog(player)}
                  disabled={refundProcessing}
                  className="w-full text-left rounded-xl bg-[oklch(0.18,0.04,290)] border border-[oklch(0.28,0.05,290)] p-4 hover:border-green-500/30 transition-colors active:scale-[0.99] disabled:opacity-40">

                  <div className="flex items-center gap-2">
                    <span className="text-sm font-bold text-white truncate flex-1">{player.inGameName}</span>
                    <span className="text-xs font-bold text-white bg-[oklch(0.28,0.06,290)] px-2 py-0.5 rounded shrink-0">
                      Seat: {player.positionSeat}
                    </span>
                  </div>

                  <p className="text-[11px] text-[oklch(0.50,0.04,290)] mt-1.5 font-mono">
                    User ID: {player.userId.slice(0, 10)}...
                  </p>

                  <div className="flex items-center justify-between mt-2">
                    <span className="text-xs font-bold text-green-400">Fee: {feeDisplay} Coins</span>
                    <span className="text-[11px] text-orange-400">Refund: {feeDisplay} Coins (100%)</span>
                  </div>
                </button>
              );
            })}
          </div>
        )}

        {/* Empty State */}
        {players.length === 0 && !configLoading && (
          <div className="flex flex-col items-center py-16 space-y-3">
            <RotateCcw className="w-10 h-10 text-[oklch(0.25,0.04,290)]" />
            <p className="text-xs text-[oklch(0.40,0.04,290)]">Select type and refresh to load players</p>
          </div>
        )}
      </div>

      {/* ═══ Refund Slider Dialog ═══ */}
      {dialogOpen && selectedPlayer && (
        <div className="fixed inset-0 z-50 flex items-end lg:items-center justify-center" onClick={() => setDialogOpen(false)}>
          <div className="absolute inset-0 bg-black/60 backdrop-blur-sm" />
          <div className="relative w-full max-w-md mx-4 mb-4 lg:mb-0 rounded-2xl bg-[oklch(0.16,0.04,290)] border border-[oklch(0.30,0.06,290)] p-5 space-y-4 shadow-2xl"
            onClick={(e) => e.stopPropagation()}>

            <button onClick={() => setDialogOpen(false)}
              className="absolute top-3 right-3 w-8 h-8 rounded-lg bg-[oklch(0.22,0.04,290)] flex items-center justify-center hover:bg-[oklch(0.28,0.06,290)] transition-colors">
              <X className="w-4 h-4 text-[oklch(0.55,0.04,290)]" />
            </button>

            <h3 className="text-base font-bold text-blue-400">Player: {selectedPlayer.inGameName}</h3>
            <p className="text-sm text-[oklch(0.60,0.04,290)]">
              Joining Fee: <span className="font-bold text-white">{formatRupees(selectedPlayer.joiningFee)}</span>
            </p>

            <div className="h-px bg-[oklch(0.28,0.05,290)]" />
            <p className="text-sm font-bold text-red-400">Refund Percentage</p>

            {/* Slider */}
            <div className="px-1">
              <input
                type="range"
                min={1}
                max={100}
                value={refundPercent}
                onChange={(e) => handleSliderChange(parseInt(e.target.value))}
                className="w-full h-2 rounded-full appearance-none cursor-pointer accent-green-500"
                style={{
                  background: `linear-gradient(to right, #22c55e 0%, #22c55e ${refundPercent}%, oklch(0.22 0.04 290) ${refundPercent}%, oklch(0.22 0.04 290) 100%)`,
                }}
              />
              <div className="flex justify-between mt-1 px-0.5">
                {[1, 25, 50, 75, 100].map((tick) => (
                  <span key={tick} className="text-[9px] text-[oklch(0.35,0.04,290)]">{tick}</span>
                ))}
              </div>
            </div>

            {/* Custom % */}
            <div className="flex items-center gap-2">
              <span className="text-sm text-[oklch(0.55,0.04,290)]">Custom:</span>
              <input
                type="number"
                min={1}
                max={100}
                value={customPercent}
                onChange={(e) => handleCustomPercentChange(e.target.value)}
                className="w-16 h-9 rounded-lg bg-[oklch(0.22,0.04,290)] border border-[oklch(0.35,0.06,290)] text-white text-center text-sm font-bold outline-none focus:border-green-500/50"
              />
              <span className="text-sm text-[oklch(0.55,0.04,290)]">%</span>
            </div>

            <div className="h-px bg-[oklch(0.28,0.05,290)]" />
            <p className="text-base font-bold text-green-400">Refund: {refundPercent}%</p>
            <p className="text-sm text-orange-400 font-medium">Amount: {formatRupees(refundAmountPaisa)}</p>

            <Button onClick={handleProceedRefund}
              className="w-full h-11 rounded-xl bg-gradient-to-r from-green-500 to-emerald-600 text-white font-bold text-sm shadow-lg shadow-green-500/20">
              PROCEED REFUND
            </Button>
          </div>
        </div>
      )}

      {/* ═══ Confirmation Dialog ═══ */}
      {confirmDialogOpen && selectedPlayer && (
        <div className="fixed inset-0 z-50 flex items-end lg:items-center justify-center" onClick={() => setConfirmDialogOpen(false)}>
          <div className="absolute inset-0 bg-black/60 backdrop-blur-sm" />
          <div className="relative w-full max-w-md mx-4 mb-4 lg:mb-0 rounded-2xl bg-[oklch(0.16,0.04,290)] border border-[oklch(0.30,0.06,290)] p-5 space-y-4 shadow-2xl"
            onClick={(e) => e.stopPropagation()}>

            <h3 className="text-base font-bold text-red-400">Confirm Refund</h3>
            <div className="space-y-2 text-sm text-[oklch(0.60,0.04,290)]">
              <p>
                Refund <span className="font-bold text-green-400">{formatRupees(refundAmountPaisa)}</span>
                {' '}({refundPercent}% of {formatRupees(selectedPlayer.joiningFee)}) to player:
              </p>
              <p>Player: <span className="font-bold text-white">{selectedPlayer.inGameName}</span></p>
              <p className="font-mono text-xs">User ID: {selectedPlayer.userId}</p>
              <div className="h-px bg-[oklch(0.28,0.05,290)]" />
              <p className="text-red-400 font-bold">This action cannot be undone!</p>
            </div>

            <div className="grid grid-cols-2 gap-3">
              <Button onClick={() => setConfirmDialogOpen(false)}
                className="h-11 rounded-xl bg-[oklch(0.22,0.04,290)] border border-[oklch(0.35,0.06,290)] text-[oklch(0.60,0.04,290)] font-bold text-sm">
                CANCEL
              </Button>
              <Button onClick={handleRefundConfirm}
                className="h-11 rounded-xl bg-gradient-to-r from-red-500 to-orange-500 text-white font-bold text-sm shadow-lg shadow-red-500/20">
                YES, REFUND
              </Button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
