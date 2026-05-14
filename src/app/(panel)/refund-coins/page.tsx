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
import { fetchRemoteConfig, getRemoteString, RC_KEYS } from '@/lib/remoteConfig';
import { rtdbGet, rtdbPut, rtdbPatch, rtdbPush, rtdbDelete } from '@/lib/rtdb';
import { db } from '@/lib/firebase';
import {
  doc,
  runTransaction,
  setDoc,
  serverTimestamp,
} from 'firebase/firestore';
import {
  RotateCcw,
  RefreshCw,
  X,
  Users,
  Terminal,
  Trash2,
} from 'lucide-react';

// ═══════════════════════════════════════════════════
// CONSTANTS — Kotlin RefundCoinsActivity companion object
// ═══════════════════════════════════════════════════
const TOURNAMENT_TYPES = [
  { value: 'BattleRoyal', label: 'BattleRoyal' },
  { value: 'ClashSquad', label: 'ClashSquad' },
  { value: 'FreeTournaments', label: 'FreeTournaments' },
  { value: 'LoneWolf', label: 'LoneWolf' },
];

// ClashSquad and LoneWolf use array format for JoinedPlayers
const ARRAY_FORMAT_TYPES = ['ClashSquad', 'LoneWolf'];

// RTDB path helpers — Kotlin basePath() / metaPath()
const basePath = (type: string, id: string) =>
  `Tournaments/TournamentDetails/${type}/${id}`;
const metaPath = (type: string) =>
  `Tournaments/TournamentMeta/${type}`;

// ═══════════════════════════════════════════════════
// TYPES — Kotlin RefundPlayerModel data class
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
// LOG TYPES
// ═══════════════════════════════════════════════════
type LogType = 'INFO' | 'SUCCESS' | 'WARNING' | 'ERROR';

interface LogEntry {
  message: string;
  type: LogType;
  time: string;
}

function getCurrentTime(): string {
  return new Date().toLocaleTimeString('en-IN', {
    hour: '2-digit',
    minute: '2-digit',
    second: '2-digit',
    hour12: false,
  });
}

// ═══════════════════════════════════════════════════
// HELPERS — Kotlin companion object utils
// ═══════════════════════════════════════════════════

// Bank Method: PAISA → RUPEES display
function formatRupees(paisa: number): string {
  const rupees = paisa / 100;
  return rupees % 1 === 0 ? `${Math.round(rupees)} Coins` : `${rupees} Coins`;
}

// IST timestamp: "09 May 2026, 10:30 AM"
function getISTTimestamp(): string {
  return new Date().toLocaleDateString('en-IN', {
    day: '2-digit',
    month: 'short',
    year: 'numeric',
  }) + ', ' + new Date().toLocaleTimeString('en-IN', {
    hour: '2-digit',
    minute: '2-digit',
    hour12: true,
  });
}

// Transaction ID: RFD_{timestamp}_{random}
function generateTransactionId(): string {
  const timestamp = Date.now();
  const random = Math.floor(1000 + Math.random() * 9000);
  return `RFD_${timestamp}_${random}`;
}

export default function RefundCoinsPage() {
  const { user, isLoading: authLoading } = useAuth();
  const logEndRef = useRef<HTMLDivElement>(null);

  // ── UI State — Kotlin spinnerTournamentType, etTournamentId ──
  const [tournamentType, setTournamentType] = useState('');
  const [tournamentId, setTournamentId] = useState('');
  const [typeEnabled, setTypeEnabled] = useState(false);
  const [idEnabled, setIdEnabled] = useState(false);

  // ── Loading states ──
  const [configLoading, setConfigLoading] = useState(true);
  const [dataLoading, setDataLoading] = useState(false);
  const [refreshing, setRefreshing] = useState(false);
  const [refundProcessing, setRefundProcessing] = useState(false);

  // ── Log state ──
  const [logs, setLogs] = useState<LogEntry[]>([]);
  const [showLog, setShowLog] = useState(false);

  // ── Tournament data — Kotlin tournamentIdsMap ──
  const tournamentIdsMap = useRef<Record<string, string[]>>({});

  // ── Players — Kotlin playersList ──
  const [players, setPlayers] = useState<RefundPlayerModel[]>([]);
  const [joiningFeePaisa, setJoiningFeePaisa] = useState(0);

  // ── Dialog state — Kotlin showRefundDialogWithSlider ──
  const [dialogOpen, setDialogOpen] = useState(false);
  const [confirmDialogOpen, setConfirmDialogOpen] = useState(false);
  const [selectedPlayer, setSelectedPlayer] = useState<RefundPlayerModel | null>(null);
  const [refundPercent, setRefundPercent] = useState(100);
  const [customPercent, setCustomPercent] = useState('100');

  // ═══════════════════════════════════════════════════
  // INIT — Kotlin onCreate → setupRemoteConfig() + loadTournamentIds()
  // ═══════════════════════════════════════════════════
  useEffect(() => {
    if (authLoading || !user) return;
    const init = async () => {
      appendLog('Fetching Remote Config...', 'INFO');
      setConfigLoading(true);

      await fetchRemoteConfig();

      const rtdbUrl = getRemoteString(RC_KEYS.RTDB_URL);
      const rtdbSecret = getRemoteString(RC_KEYS.RTDB_SECRET);

      appendLog('Remote Config fetched', 'SUCCESS');
      appendLog(`Database URL: ${rtdbUrl ? 'Received' : 'EMPTY'}`, rtdbUrl ? 'INFO' : 'WARNING');
      appendLog(`DB Secret: ${rtdbSecret ? 'Received' : 'EMPTY'}`, rtdbSecret ? 'INFO' : 'WARNING');

      if (!rtdbUrl || !rtdbSecret) {
        appendLog('Config error: URL or Secret missing', 'ERROR');
        toast.warning('Config error: URL or Secret missing');
      }

      setConfigLoading(false);

      if (rtdbUrl && rtdbSecret) {
        loadTournamentIds();
      }
    };
    init();
  }, [user, authLoading]);

  // Auto-scroll log
  useEffect(() => {
    logEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  }, [logs]);

  // ── Append to log ──
  const appendLog = (message: string, type: LogType = 'INFO') => {
    setLogs((prev) => [...prev, { message, type, time: getCurrentTime() }]);
  };

  const handleClearLog = () => {
    setLogs([]);
    appendLog('Logs cleared', 'SUCCESS');
  };

  // ═══════════════════════════════════════════════════
  // LOAD TOURNAMENT IDS — Kotlin loadTournamentIds()
  // Fetch from RTDB: Tournaments/TournamentMeta/{type}
  // ═══════════════════════════════════════════════════
  const loadTournamentIds = async () => {
    if (dataLoading) {
      appendLog('Already loading...', 'WARNING');
      return;
    }

    setDataLoading(true);
    tournamentIdsMap.current = {};
    appendLog('Loading tournament IDs...', 'INFO');

    let completed = 0;
    const total = TOURNAMENT_TYPES.length;

    for (const type of TOURNAMENT_TYPES) {
      try {
        const data = await rtdbGet(metaPath(type.value));
        const ids = parseTournamentMetaIds(data, type.value);
        tournamentIdsMap.current[type.value] = ids;
        appendLog(`${type.value}: ${ids.length} tournaments found`);
      } catch (e: any) {
        appendLog(`Failed to load ${type.value} meta: ${e.message}`, 'ERROR');
        tournamentIdsMap.current[type.value] = [];
      }
      completed++;
    }

    setDataLoading(false);
    setTypeEnabled(true);

    // Initial: first type select
    updateTournamentIdField(TOURNAMENT_TYPES[0].value);
    setTournamentType(TOURNAMENT_TYPES[0].value);
    appendLog('Tournament IDs loaded', 'SUCCESS');
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

  // ── Type change handler ──
  const handleTypeChange = (value: string) => {
    setTournamentType(value);
    appendLog(`Selected: ${value}`, 'INFO');
    updateTournamentIdField(value);
    setPlayers([]);
  };

  // ═══════════════════════════════════════════════════
  // REFRESH — Kotlin refreshTournamentIdsForType() + fetchTournamentAndPlayersData()
  // ═══════════════════════════════════════════════════
  const handleRefresh = async () => {
    if (dataLoading || refreshing) {
      appendLog('Already loading...', 'WARNING');
      return;
    }
    if (!tournamentType) {
      appendLog('Select a tournament type first', 'ERROR');
      return;
    }

    const previousId = tournamentId.trim();
    setRefreshing(true);

    try {
      // Refresh IDs for selected type only (1 query vs 4)
      const data = await rtdbGet(metaPath(tournamentType));
      const ids = parseTournamentMetaIds(data, tournamentType);
      tournamentIdsMap.current[tournamentType] = ids;
      appendLog(`${tournamentType}: ${ids.length} tournaments`, 'SUCCESS');

      if (ids.length > 0) {
        if (ids.includes(previousId)) {
          setTournamentId(previousId);
        } else {
          setTournamentId(ids[0]);
        }
        setIdEnabled(true);
      } else {
        setTournamentId('');
        setIdEnabled(false);
      }

      // Also fetch players for current tournament
      await fetchTournamentAndPlayersData();
    } catch (e: any) {
      appendLog(`Refresh failed: ${e.message}`, 'ERROR');
    } finally {
      setRefreshing(false);
    }
  };

  // ═══════════════════════════════════════════════════
  // FETCH TOURNAMENT + PLAYERS — Kotlin fetchTournamentAndPlayersData()
  // RTDB: Tournaments/TournamentDetails/{type}/{id}
  // ═══════════════════════════════════════════════════
  const fetchTournamentAndPlayersData = async () => {
    const id = tournamentId.trim();
    if (!id) {
      appendLog('Tournament ID required', 'ERROR');
      return;
    }

    setRefreshing(true);
    setPlayers([]);
    appendLog(`Fetching: ${tournamentType}/${id}`, 'INFO');

    try {
      const data = await rtdbGet(basePath(tournamentType, id));

      if (!data || data === null) {
        appendLog('Tournament not found', 'ERROR');
        toast.error('Tournament not found');
        setRefreshing(false);
        return;
      }

      // JoiningFee — PAISA mein
      const fee = data.JoiningFee || 0;
      setJoiningFeePaisa(fee);
      appendLog(`Joining Fee: ${formatRupees(fee)} | PAISA: ${fee}`, 'INFO');

      // JoinedPlayers parse
      if (data.JoinedPlayers) {
        parseJoinedPlayers(data.JoinedPlayers, tournamentType, id, fee);
      } else {
        appendLog('No players found in this tournament', 'WARNING');
        toast.warning('No players found');
      }
    } catch (e: any) {
      appendLog(`Fetch failed: ${e.message}`, 'ERROR');
      toast.error('Failed to fetch tournament');
    } finally {
      setRefreshing(false);
    }
  };

  // ═══════════════════════════════════════════════════
  // PARSE JOINED PLAYERS — Kotlin parseJoinedPlayers()
  // Array format (ClashSquad/LoneWolf) vs Object format (BattleRoyal/FreeTournaments)
  // ═══════════════════════════════════════════════════
  const parseJoinedPlayers = (raw: any, type: string, tid: string, fee: number) => {
    const list: RefundPlayerModel[] = [];

    if (ARRAY_FORMAT_TYPES.includes(type)) {
      // Array format — ClashSquad, LoneWolf
      const arr = Array.isArray(raw) ? raw : convertToArray(raw);
      for (let i = 0; i < arr.length; i++) {
        const item = arr[i];
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
      // Object format — BattleRoyal, FreeTournaments
      if (raw && typeof raw === 'object' && !Array.isArray(raw)) {
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
    }

    setPlayers(list);
    if (list.length > 0) {
      appendLog(`Loaded ${list.length} players`, 'SUCCESS');
      toast.success(`${list.length} players loaded`);
    } else {
      appendLog('No players data found', 'WARNING');
      toast.warning('No players found');
    }
  };

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
  // REFUND DIALOG — Kotlin showRefundDialogWithSlider()
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

  // PROCEED REFUND → show confirmation
  const handleProceedRefund = () => {
    if (!selectedPlayer) return;
    setDialogOpen(false);
    setConfirmDialogOpen(true);
  };

  // ═══════════════════════════════════════════════════
  // CONFIRM + PROCESS — Kotlin showRefundConfirmationDialog() + processRefund()
  // ═══════════════════════════════════════════════════
  const handleRefundConfirm = async () => {
    if (!selectedPlayer) return;
    setConfirmDialogOpen(false);
    await processRefund(selectedPlayer, refundAmountPaisa, refundPercent);
  };

  // ═══════════════════════════════════════════════════
  // 5-STEP REFUND PROCESS — Kotlin processRefund() → Step 1-5
  // ═══════════════════════════════════════════════════
  const processRefund = async (player: RefundPlayerModel, amountPaisa: number, percent: number) => {
    setRefundProcessing(true);
    setShowLog(true);
    appendLog('=== REFUND PROCESS START ===', 'INFO');
    appendLog(`Player: ${player.inGameName} | Amount: ${formatRupees(amountPaisa)} (${percent}%)`, 'INFO');

    try {
      // Step 1: Firestore TopUpCoins increment
      appendLog('Step 1: Updating user coins (Firestore transaction)...', 'INFO');
      const newBalance = await step1_UpdateUserCoins(player.userId, amountPaisa);
      appendLog(`Step 1: Coins updated → ${newBalance} (${formatRupees(newBalance)})`, 'SUCCESS');

      // Step 2: Firestore TransactionHistory
      appendLog('Step 2: Saving transaction history...', 'INFO');
      await step2_AddTransactionHistory(player, amountPaisa, percent);
      appendLog('Step 2: Transaction history saved', 'SUCCESS');

      // Step 3: RTDB PricePool deduct
      appendLog('Step 3: Deducting from PricePool (RTDB)...', 'INFO');
      await step3_DeductPricePool(player, amountPaisa);
      appendLog('Step 3: PricePool updated', 'SUCCESS');

      // Step 4: RTDB Move player to RemovedUsers
      appendLog('Step 4: Moving player to RemovedUsers...', 'INFO');
      await step4_MoveToRemovedUsers(player, amountPaisa, percent);
      appendLog('Step 4: Player moved to RemovedUsers', 'SUCCESS');

      // Step 5: RTDB JoinedPlayersCount update
      appendLog('Step 5: Updating JoinedPlayersCount...', 'INFO');
      await step5_UpdateJoinedPlayersCount(player);
      appendLog('Step 5: JoinedPlayersCount updated', 'SUCCESS');

      appendLog('=== REFUND COMPLETE ===', 'SUCCESS');
      toast.success(`${player.inGameName} — ${formatRupees(amountPaisa)} refunded (${percent}%)`);

      // Refresh player list after refund
      await fetchTournamentAndPlayersData();

    } catch (e: any) {
      appendLog(`REFUND ERROR: ${e.message}`, 'ERROR');
      toast.error('Refund failed', { description: e.message });
    } finally {
      setRefundProcessing(false);
    }
  };

  // ─── Step 1: Firestore TopUpCoins increment (transaction) ───
  const step1_UpdateUserCoins = async (userId: string, amountPaisa: number): Promise<number> => {
    const userRef = doc(db, 'Users', userId);

    const newCoins = await runTransaction(db, async (transaction) => {
      const docSnap = await transaction.get(userRef);
      const currentCoins = docSnap.exists() ? (docSnap.data().TopUpCoins || 0) : 0;
      const newBalance = currentCoins + amountPaisa;
      transaction.update(userRef, {
        TopUpCoins: newBalance,
        LastUpdated: serverTimestamp(),
      });
      return newBalance;
    });

    return newCoins as number;
  };

  // ─── Step 2: Firestore TransactionHistory ───
  const step2_AddTransactionHistory = async (
    player: RefundPlayerModel,
    amountPaisa: number,
    percent: number,
  ) => {
    const transactionId = generateTransactionId();
    const istTimestamp = getISTTimestamp();

    const transactionRef = doc(db, 'Users', player.userId, 'TransactionHistory', transactionId);

    await setDoc(transactionRef, {
      transactionId,
      transactionType: 'Tournament Refund',
      amount: amountPaisa, // PAISA
      paymentStatus: 'completed',
      timestamp: istTimestamp,
      description: `refund for not playing (${percent}% of joining fee) - TournamentID: ${player.tournamentId}`,
      tournamentId: player.tournamentId,
      refundPercent: percent,
      processedAt: serverTimestamp(),
    });
  };

  // ─── Step 3: RTDB PricePool deduct ───
  const step3_DeductPricePool = async (player: RefundPlayerModel, amountPaisa: number) => {
    const path = `${basePath(player.tournamentType, player.tournamentId)}/PricePool`;
    const current = await rtdbGet(path);
    const currentPool = typeof current === 'number' ? current : 0;
    const newPool = Math.max(0, currentPool - amountPaisa);
    appendLog(`   PricePool: ${currentPool} → ${newPool}`, 'INFO');
    await rtdbPut(path, newPool);
  };

  // ─── Step 4: Move player to RemovedUsers ───
  const step4_MoveToRemovedUsers = async (
    player: RefundPlayerModel,
    amountPaisa: number,
    percent: number,
  ) => {
    if (ARRAY_FORMAT_TYPES.includes(player.tournamentType)) {
      await handleArrayFormatRemoval(player, amountPaisa, percent);
    } else {
      await handleObjectFormatRemoval(player, amountPaisa, percent);
    }
  };

  // Object format: BattleRoyal, FreeTournaments
  const handleObjectFormatRemoval = async (
    player: RefundPlayerModel,
    amountPaisa: number,
    percent: number,
  ) => {
    const playerPath = `${basePath(player.tournamentType, player.tournamentId)}/JoinedPlayers/${player.playerKey}`;
    const removedPath = `${basePath(player.tournamentType, player.tournamentId)}/RemovedUsers`;

    // Read player data
    const playerData = await rtdbGet(playerPath);
    if (!playerData || playerData === null) {
      appendLog('Player data not found in tournament', 'ERROR');
      toast.error('Player not found in tournament');
      return;
    }

    // Add refund metadata
    const enrichedPlayer = {
      ...playerData,
      refundedAt: Date.now(),
      refundedBy: 'admin',
      refundAmount: amountPaisa,
      refundPercent: percent,
      refundReason: `Tournament refund - ${percent}% of joining fee`,
      originalJoiningFee: player.joiningFee,
    };

    // Push to RemovedUsers
    appendLog('   Pushing to RemovedUsers...', 'INFO');
    await rtdbPush(removedPath, enrichedPlayer);

    // Delete from JoinedPlayers
    appendLog('   Removing from JoinedPlayers...', 'INFO');
    await rtdbDelete(playerPath);
  };

  // Array format: ClashSquad, LoneWolf
  const handleArrayFormatRemoval = async (
    player: RefundPlayerModel,
    amountPaisa: number,
    percent: number,
  ) => {
    const joinedPath = `${basePath(player.tournamentType, player.tournamentId)}/JoinedPlayers`;
    const removedPath = `${basePath(player.tournamentType, player.tournamentId)}/RemovedUsers`;

    // Read entire JoinedPlayers array
    const rawData = await rtdbGet(joinedPath);
    const arr = Array.isArray(rawData) ? rawData : convertToArray(rawData);

    // Find index — 3 methods (same as Kotlin)
    let resolvedIndex = -1;

    // Method 1: playerKey as index
    const keyAsInt = parseInt(player.playerKey);
    if (!isNaN(keyAsInt) && keyAsInt >= 0 && keyAsInt < arr.length) {
      if (arr[keyAsInt]?.userId === player.userId) {
        resolvedIndex = keyAsInt;
        appendLog(`   Method 1: Index from playerKey = ${resolvedIndex}`, 'INFO');
      }
    }

    // Method 2: search by userId
    if (resolvedIndex < 0) {
      for (let i = 0; i < arr.length; i++) {
        if (arr[i]?.userId === player.userId) {
          resolvedIndex = i;
          appendLog(`   Method 2: userId se index mila: ${i}`, 'INFO');
          break;
        }
      }
    }

    // Method 3: search by InGameName
    if (resolvedIndex < 0) {
      for (let i = 0; i < arr.length; i++) {
        if (arr[i]?.InGameName === player.inGameName) {
          resolvedIndex = i;
          appendLog(`   Method 3: InGameName se index mila: ${i}`, 'INFO');
          break;
        }
      }
    }

    if (resolvedIndex < 0 || resolvedIndex >= arr.length) {
      appendLog('Player not found in array. Refresh and try again.', 'ERROR');
      toast.error('Player not found in array. Refresh and try again.');
      return;
    }

    const playerObj = arr[resolvedIndex] || {};
    const enrichedPlayer = {
      ...playerObj,
      refundedAt: Date.now(),
      refundedBy: 'admin',
      refundAmount: amountPaisa,
      refundPercent: percent,
      refundReason: `Tournament refund - ${percent}% of joining fee`,
      originalJoiningFee: player.joiningFee,
      originalArrayIndex: resolvedIndex,
    };

    // Push to RemovedUsers
    appendLog(`   Pushing to RemovedUsers (index: ${resolvedIndex})...`, 'INFO');
    await rtdbPush(removedPath, enrichedPlayer);

    // PATCH index to null
    appendLog(`   Setting index ${resolvedIndex} to null...`, 'INFO');
    const patchData: Record<string, null> = {};
    patchData[resolvedIndex.toString()] = null;
    await rtdbPatch(joinedPath, patchData);
  };

  // ─── Step 5: RTDB JoinedPlayersCount update ───
  const step5_UpdateJoinedPlayersCount = async (player: RefundPlayerModel) => {
    const countPath = `${basePath(player.tournamentType, player.tournamentId)}/JoinedPlayersCount`;
    const current = await rtdbGet(countPath);
    const currentCount = typeof current === 'number' ? current : 0;
    const newCount = Math.max(0, currentCount - 1);
    appendLog(`   JoinedPlayersCount: ${currentCount} → ${newCount}`, 'INFO');
    await rtdbPut(countPath, newCount);
  };

  // ── Log color ──
  const getLogColor = (type: LogType): string => {
    switch (type) {
      case 'SUCCESS': return 'text-green-400';
      case 'WARNING': return 'text-orange-400';
      case 'ERROR': return 'text-red-400';
      default: return 'text-[oklch(0.55,0.04,290)]';
    }
  };

  const isLoading = configLoading || dataLoading || refreshing;

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
              return (
                <button key={`${player.playerKey}-${idx}`}
                  onClick={() => openRefundDialog(player)}
                  disabled={refundProcessing}
                  className="w-full text-left rounded-xl bg-[oklch(0.18,0.04,290)] border border-[oklch(0.28,0.05,290)] p-4 hover:border-green-500/30 transition-colors active:scale-[0.99] disabled:opacity-40">

                  {/* Row 1: Name + Seat */}
                  <div className="flex items-center gap-2">
                    <span className="text-sm font-bold text-white truncate flex-1">{player.inGameName}</span>
                    <span className="text-xs font-bold text-white bg-[oklch(0.28,0.06,290)] px-2 py-0.5 rounded shrink-0">
                      Seat: {player.positionSeat}
                    </span>
                  </div>

                  {/* Row 2: UID */}
                  <p className="text-[11px] text-[oklch(0.50,0.04,290)] mt-1.5 font-mono">
                    User ID: {player.userId.slice(0, 10)}...
                  </p>

                  {/* Row 3: Fee + Refund */}
                  <div className="flex items-center justify-between mt-2">
                    <span className="text-xs font-bold text-green-400">Fee: {feeRupees} Coins</span>
                    <span className="text-[11px] text-orange-400">Refund: {feeRupees} Coins (100%)</span>
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

        {/* Toggle Log */}
        {logs.length > 0 && (
          <button onClick={() => setShowLog(!showLog)}
            className="w-full flex items-center justify-between rounded-xl bg-[oklch(0.18,0.04,290)] border border-[oklch(0.28,0.05,290)] p-3">
            <div className="flex items-center gap-2">
              <Terminal className="w-4 h-4 text-yellow-400" />
              <span className="text-sm font-bold text-yellow-400">Activity Log</span>
              {refundProcessing && <div className="w-2 h-2 rounded-full bg-green-400 animate-pulse ml-1" />}
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
                {refundProcessing && <span className="inline-block w-1.5 h-3 bg-yellow-400 animate-pulse ml-1" />}
              </div>
              <div ref={logEndRef} />
            </div>
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
