'use client';

import { useState, useEffect, useCallback, useMemo } from 'react';
import { Input } from '@/components/ui/input';
import { Textarea } from '@/components/ui/textarea';
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
import { rtdbGet, rtdbPut, rtdbPatch } from '@/lib/rtdb';
import {
  collection,
  query,
  orderBy,
  getDocs,
  addDoc,
  Timestamp,
} from 'firebase/firestore';
import { db } from '@/lib/firebase';
import {
  Trophy,
  RefreshCw,
  Save,
  ArrowRight,
} from 'lucide-react';

// ═══════════════════════════════════════════════════
// CONSTANTS — Spinner options (Kotlin arrays equivalent)
// ═══════════════════════════════════════════════════
const TOURNAMENT_TYPES = [
  { value: 'BattleRoyal', label: 'BattleRoyal' },
  { value: 'ClashSquad', label: 'ClashSquad' },
  { value: 'LoneWolf', label: 'LoneWolf' },
  { value: 'FreeTournaments', label: 'FreeTournaments' },
];

const GAME_MODES = [
  { value: 'BattleRoyal', label: 'BattleRoyal' },
  { value: 'ClashSquad', label: 'ClashSquad' },
  { value: 'LoneWolf', label: 'LoneWolf' },
];

const MAPS = [
  { value: 'Bermuda', label: 'Bermuda' },
  { value: 'Purgatory', label: 'Purgatory' },
  { value: 'Kalahari', label: 'Kalahari' },
  { value: 'Alpine', label: 'Alpine' },
  { value: 'Nexterra', label: 'Nexterra' },
];

const MAPS_LONEWOLF = [
  { value: 'IronCage', label: 'IronCage' },
];

const TYPES = [
  { value: 'Solo', label: 'Solo' },
  { value: 'Duo', label: 'Duo' },
  { value: 'Squad', label: 'Squad' },
];

const STATUSES = [
  { value: 'Upcoming', label: 'Upcoming' },
  { value: 'Ongoing', label: 'Ongoing' },
  { value: 'Completed', label: 'Completed' },
];

// ═══════════════════════════════════════════════════
// PAISA ↔ RUPEES CONVERSION — "Database Paisa, User Rupees, Decimal Allowed"
// ═══════════════════════════════════════════════════
const RUPEE_TO_PAISA = 100;

function rupeesToPaisa(rupees: number): number {
  return Math.round(rupees * RUPEE_TO_PAISA);
}

function paisaToRupees(paisa: number): number {
  return paisa / RUPEE_TO_PAISA;
}

// Display formatting: 1000 paisa → "10 Coins", 150 paisa → "1.5 Coins"
function formatCoins(paisa: number): string {
  const rupees = paisaToRupees(paisa);
  if (rupees % 1 === 0) {
    return `${rupees} Coins`;
  }
  return `${rupees} Coins`;
}

// ═══════════════════════════════════════════════════
// TOURNAMENT ID GENERATOR — Kotlin TournamentIdGenerator equivalent
// ═══════════════════════════════════════════════════
function generateNewTournamentId(existingIds: string[]): string {
  const numbers = existingIds.map((id) => {
    const num = id.replace('EDM_', '').trim();
    return parseInt(num, 10);
  }).filter((n) => !isNaN(n));

  const highest = numbers.length > 0 ? Math.max(...numbers) : 99;
  return `EDM_${highest + 1}`;
}

// ═══════════════════════════════════════════════════
// DATETIME FORMAT — "YYYY/MM/DD HH:MM AM/PM"
// Separate date + hour + minute + AM/PM fields → RTDB string
// ═══════════════════════════════════════════════════
function formatDateTimeForRTDB(dateStr: string, hour: string, minute: string, ampm: string): string {
  // "2025-05-14", "03", "30", "PM" → "2025/05/14 03:30 PM"
  if (!dateStr) return '';
  const [y, m, d] = dateStr.split('-');
  if (!y || !m || !d) return dateStr;
  return `${y}/${m}/${d} ${String(hour).padStart(2, '0')}:${String(minute).padStart(2, '0')} ${ampm}`;
}

// ═══════════════════════════════════════════════════
// PARSE DATETIME — RTDB → separate date + hour + minute + AM/PM
// "2025/05/14 03:30 PM" → { date, hour, minute, ampm }
// Also handles old 24h format: "2025/05/14 15:30"
// ═══════════════════════════════════════════════════
function parseRTDBDateTime(dtStr: string): { date: string; hour: string; minute: string; ampm: 'AM' | 'PM' } {
  const empty = { date: '', hour: '12', minute: '00', ampm: 'PM' as const };
  if (!dtStr) return empty;
  const trimmed = dtStr.trim();
  const parts = trimmed.split(' ');
  if (parts.length < 2) return empty;
  const datePart = parts[0];
  const timePart = parts[1];
  const ampmStr = (parts[2] || '').toUpperCase();
  const [y, m, d] = datePart.split('/');
  const [hh, mm] = timePart.split(':');
  if (!y || !m || !d) return empty;
  let hour24 = parseInt(hh, 10);
  // Convert 12h AM/PM → 24h for date input
  if (ampmStr === 'PM' && hour24 !== 12) hour24 += 12;
  if (ampmStr === 'AM' && hour24 === 12) hour24 = 0;
  const dateISO = `${y}-${m}-${d}`;
  // 24h → 12h for display
  const h12 = hour24 % 12 || 12;
  const ampm: 'AM' | 'PM' = hour24 >= 12 ? 'PM' : 'AM';
  // If RTDB already has AM/PM, use it directly for the time fields
  if (ampmStr === 'AM' || ampmStr === 'PM') {
    return { date: dateISO, hour: String(parseInt(hh, 10)).padStart(2, '0'), minute: String(mm).padStart(2, '0'), ampm: ampmStr as 'AM' | 'PM' };
  }
  return { date: dateISO, hour: String(h12).padStart(2, '0'), minute: String(mm).padStart(2, '0'), ampm };
}

export default function CreateTournamentPage() {
  const { user, isLoading: authLoading } = useAuth();

  // ── Mode & Loading ──
  const [mode, setMode] = useState<'create' | 'update'>('create');
  const [loading, setLoading] = useState(false);
  const [configReady, setConfigReady] = useState(false);
  const [rtdbReady, setRtdbReady] = useState(false);

  // ── Form Fields ──
  const [tournamentType, setTournamentType] = useState('');
  const [gameMode, setGameMode] = useState('');
  const [title, setTitle] = useState('');
  const [description, setDescription] = useState('');
  const [bannerUrl, setBannerUrl] = useState('');
  const [dateTime, setDateTime] = useState('');
  // ── AM/PM Time Fields (replaces datetime-local) ──
  const [dateOnly, setDateOnly] = useState('');
  const [timeHour, setTimeHour] = useState('12');
  const [timeMinute, setTimeMinute] = useState('00');
  const [timeAmPm, setTimeAmPm] = useState<'AM' | 'PM'>('PM');
  const [map, setMap] = useState('');
  const [type, setType] = useState('');
  const [slotNumbers, setSlotNumbers] = useState('');
  const [joiningFee, setJoiningFee] = useState('');
  const [referralUseAmount, setReferralUseAmount] = useState('');
  const [perKill, setPerKill] = useState('');
  const [pricePool, setPricePool] = useState('');
  const [roomId, setRoomId] = useState('');
  const [roomPassword, setRoomPassword] = useState('');
  const [videoUrl, setVideoUrl] = useState('');
  const [status, setStatus] = useState('Upcoming');

  // ── Create Mode State ──
  const [generatedId, setGeneratedId] = useState('');

  // ── Update Mode State ──
  const [hostTournaments, setHostTournaments] = useState<Record<string, string[]>>({});
  const [updateType, setUpdateType] = useState('');
  const [updateId, setUpdateId] = useState('');
  const [currentTournamentData, setCurrentTournamentData] = useState<Record<string, any> | null>(null);

  // ── Load tournaments list for update mode ──
  const loadHostTournaments = useCallback(async () => {
    if (!user) return;
    try {
      const q = query(
        collection(db, 'hosts', user.uid, 'myMatches'),
        orderBy('__name__', 'desc')
      );
      const snap = await getDocs(q);
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

      setHostTournaments(grouped);
      return grouped;
    } catch (e: any) {
      toast.error('Failed to load tournaments', { description: e.message });
      return {};
    }
  }, [user]);

  // ── Init ──
  useEffect(() => {
    if (authLoading) return;
    setConfigReady(true);
  }, [user, authLoading]);

  // ── Validate required fields — Kotlin TournamentValidator equivalent ──
  const validateRequired = (): boolean => {
    if (!title.trim()) {
      toast.error('Title is required');
      return false;
    }
    if (!dateOnly) {
      toast.error('Date is required');
      return false;
    }
    return true;
  };

  // ── Clear form — Kotlin clearForm() equivalent ──
  const clearForm = () => {
    setTitle('');
    setDescription('');
    setBannerUrl('');
    setDateTime('');
    setDateOnly('');
    setTimeHour('12');
    setTimeMinute('00');
    setTimeAmPm('PM');
    setSlotNumbers('');
    setJoiningFee('');
    setReferralUseAmount('');
    setPerKill('');
    setPricePool('');
    setRoomId('');
    setRoomPassword('');
    setVideoUrl('');
    setMap('');
    setType('');
    setStatus('Upcoming');
    setGameMode('');
    setTournamentType('');
    setGeneratedId('');
  };

  // ═══════════════════════════════════════════════
  // CREATE MODE — Kotlin generateAndCreateTournament() + saveTournamentData()
  // ═══════════════════════════════════════════════
  const handleCreate = async () => {
    if (!user) {
      toast.error('Not logged in');
      return;
    }
    if (!validateRequired()) return;

    if (!tournamentType) {
      toast.error('Tournament Type is required');
      return;
    }

    setLoading(true);
    toast.info('Generating Tournament ID...');

    try {
      // Step 1: Get all existing IDs from RTDB — Kotlin: getAllTournamentIds()
      const allIdsData = await rtdbGet('AllTournamentsID');
      const existingIds = allIdsData ? Object.keys(allIdsData) : [];

      // Step 2: Generate new ID — Kotlin: TournamentIdGenerator.generateNewTournamentId()
      const newId = existingIds.length > 0
        ? generateNewTournamentId(existingIds)
        : 'EDM_100';
      setGeneratedId(newId);

      // Step 3: Register new ID in RTDB — Kotlin: addNewTournamentId()
      const now = new Date().toLocaleString('en-IN', {
        day: '2-digit', month: '2-digit', year: 'numeric',
        hour: '2-digit', minute: '2-digit', second: '2-digit', hour12: false,
      });
      const idRegistered = await rtdbPut(`AllTournamentsID/${newId}`, {
        createdAt: now,
        createdBy: user.uid,
        tournamentId: newId,
        isActive: true,
      });

      if (!idRegistered) {
        throw new Error('Failed to register tournament ID');
      }

      // Step 4: Build tournament data — Kotlin: saveTournamentData()
      const joiningFeePaisa = rupeesToPaisa(parseFloat(joiningFee) || 0);
      const perKillPaisa = rupeesToPaisa(parseFloat(perKill) || 0);
      const pricePoolPaisa = rupeesToPaisa(parseFloat(pricePool) || 0);


      const formattedDT = formatDateTimeForRTDB(dateOnly, timeHour, timeMinute, timeAmPm);

      const tournamentData: Record<string, any> = {
        Title: title,
        Description: description,
        BannerUrl: bannerUrl,
        DateTime: formattedDT,
        JoinedPlayersCount: 0,
        JoiningFee: joiningFeePaisa,         // ✅ Store PAISA
        ReferralUseAmount: parseInt(referralUseAmount) || 0,
        Map: map,
        Mode: gameMode,
        PerKill: perKillPaisa,              // ✅ Store PAISA
        PricePool: pricePoolPaisa,          // ✅ Store PAISA
        RoomID: roomId,
        RoomPassword: roomPassword,
        SlotNumbers: parseInt(slotNumbers) || 0,
        Status: 'Upcoming',
        Type: type,
        VideoUrl: videoUrl,
        HostUID: user.uid,
        ResultStatus: false,
        PaymentStatus: false,
        CreatedAt: now,
        LastUpdated: now,
      };

      // Step 5: Save Meta — Kotlin: saveTournamentDataWithMap() Meta path
      const metaPath = `Tournaments/TournamentMeta/${tournamentType}/${newId}`;
      const metaData = { ...tournamentData };

      // Step 6: Save Details — BannerUrl nahi, JoinedPlayers empty
      const detailsPath = `Tournaments/TournamentDetails/${tournamentType}/${newId}`;
      const detailsData = { ...tournamentData };
      delete detailsData.BannerUrl;
      detailsData.JoinedPlayers = {};

      const metaSuccess = await rtdbPut(metaPath, metaData);
      if (!metaSuccess) throw new Error('Failed to save tournament meta');

      const detailsSuccess = await rtdbPut(detailsPath, detailsData);
      if (!detailsSuccess) throw new Error('Failed to save tournament details');

      // Step 7: Update TournamentsCount — Kotlin: updateTournamentsCount()
      try {
        const countData = await rtdbGet('Tournaments/TournamentsCount');
        const counts: Record<string, number> = countData || {};
        counts[tournamentType] = (counts[tournamentType] || 0) + 1;
        await rtdbPut('Tournaments/TournamentsCount', counts);
      } catch (e) {
        // count update failed, continuing
      }

      // Step 8: Save reference to Firestore — hosts/{hostId}/myMatches
      await addDoc(collection(db, 'hosts', user.uid, 'myMatches'), {
        tournamentId: newId,
        tournamentType: tournamentType,
      });

      toast.success(`Tournament Created!`, { description: `ID: ${newId}` });
      clearForm();

    } catch (e: any) {
      toast.error('Creation Failed', { description: e.message });
    } finally {
      setLoading(false);
    }
  };

  // ═══════════════════════════════════════════════
  // UPDATE MODE — Kotlin loadTournamentData() + updateTournamentData()
  // ═══════════════════════════════════════════════

  // Mode switch karne pe tournaments load karo — Kotlin: loadAdminTournaments()
  const handleModeSwitch = async (newMode: 'create' | 'update') => {
    setMode(newMode);
    if (newMode === 'update') {
      clearForm();
      setCurrentTournamentData(null);
      setUpdateType('');
      setUpdateId('');
      setLoading(true);
      const grouped = await loadHostTournaments();
      setLoading(false);

      if (Object.keys(grouped).length === 0) {
        toast.error('No tournaments found', { description: 'Create a tournament first' });
        setMode('create');
      }
    } else {
      clearForm();
      setCurrentTournamentData(null);
    }
  };

  // Type select karne pe IDs load karo — Kotlin: loadTournamentIdsForType()
  // When gameMode changes to LoneWolf → auto-lock map to IronCage
  const handleGameModeChange = (value: string) => {
    setGameMode(value);
    if (value === 'LoneWolf') {
      setMap('IronCage');
    }
  };

  const handleUpdateTypeChange = (value: string) => {
    setUpdateType(value);
    setUpdateId('');
    clearForm();
    setCurrentTournamentData(null);
  };

  // Load tournament data from RTDB — Kotlin: loadTournamentData()
  const handleLoadTournament = async () => {
    if (!updateType || updateType === '__placeholder__') {
      toast.error('Select tournament type');
      return;
    }
    if (!updateId || updateId === '__placeholder__') {
      toast.error('Select tournament ID');
      return;
    }

    setLoading(true);
    toast.info('Loading tournament data...');

    try {
      const path = `Tournaments/TournamentMeta/${updateType}/${updateId}`;
      const data = await rtdbGet(path);

      if (!data || data === null) {
        toast.error('Tournament not found in RTDB');
        setLoading(false);
        return;
      }

      setCurrentTournamentData(data);

      // Populate form — Kotlin: populateForm()
      setTitle(data.Title || '');
      setDescription(data.Description || '');
      setBannerUrl(data.BannerUrl || '');

      // DateTime: RTDB se "YYYY/MM/DD HH:MM AM/PM" aata hai, separate fields me convert
      const dtStr = data.DateTime || '';
      if (dtStr.includes('/')) {
        const parsed = parseRTDBDateTime(dtStr);
        setDateOnly(parsed.date);
        setTimeHour(parsed.hour);
        setTimeMinute(parsed.minute);
        setTimeAmPm(parsed.ampm);
      }

      setSlotNumbers(String(data.SlotNumbers || ''));

      // ✅ PAISA → RUPEES for display
      const joiningFeePaisa = data.JoiningFee || 0;
      const perKillPaisa = data.PerKill || 0;
      const pricePoolPaisa = data.PricePool || 0;

      setJoiningFee(String(paisaToRupees(joiningFeePaisa)));
      setPerKill(String(paisaToRupees(perKillPaisa)));
      setPricePool(String(paisaToRupees(pricePoolPaisa)));

      setReferralUseAmount(String(data.ReferralUseAmount || ''));
      setRoomId(data.RoomID || '');
      setRoomPassword(data.RoomPassword || '');
      setVideoUrl(data.VideoUrl || '');

      // Spinners set karo
      setMap(data.Map || '');
      setType(data.Type || '');
      setStatus(data.Status || 'Upcoming');
      setGameMode(data.Mode || '');

      toast.success('Tournament loaded!', { description: `ID: ${updateId}` });

    } catch (e: any) {
      toast.error('Load Failed', { description: e.message });
    } finally {
      setLoading(false);
    }
  };

  // Update tournament — Kotlin: updateTournamentData()
  const handleUpdate = async () => {
    if (!currentTournamentData) {
      toast.error('Load a tournament first');
      return;
    }
    if (!validateRequired()) return;

    setLoading(true);
    toast.info('Updating tournament...');

    try {
      const now = new Date().toLocaleString('en-IN', {
        day: '2-digit', month: '2-digit', year: 'numeric',
        hour: '2-digit', minute: '2-digit', second: '2-digit', hour12: false,
      });

      const formattedDT = formatDateTimeForRTDB(dateOnly, timeHour, timeMinute, timeAmPm);

      // Build updates — include ALL non-empty fields (even 0 values)
      const updates: Record<string, any> = { LastUpdated: now };

      if (title.trim()) updates.Title = title;
      if (description.trim()) updates.Description = description;
      if (bannerUrl.trim()) updates.BannerUrl = bannerUrl;
      if (formattedDT) updates.DateTime = formattedDT;
      if (map) updates.Map = map;
      if (type) updates.Type = type;
      if (status) updates.Status = status;
      if (gameMode) updates.Mode = gameMode;

      // SlotNumbers — allow 0 (user typed a valid number)
      const slots = parseInt(slotNumbers);
      if (!isNaN(slots)) updates.SlotNumbers = slots;

      // ✅ RUPEES → PAISA for storage — allow 0 (Free, no per-kill, no prize)
      const jf = parseFloat(joiningFee);
      if (!isNaN(jf)) {
        updates.JoiningFee = rupeesToPaisa(jf);
      }

      const rua = parseInt(referralUseAmount);
      if (!isNaN(rua)) updates.ReferralUseAmount = rua;

      const pk = parseFloat(perKill);
      if (!isNaN(pk)) {
        updates.PerKill = rupeesToPaisa(pk);
      }

      const pp = parseFloat(pricePool);
      if (!isNaN(pp)) {
        updates.PricePool = rupeesToPaisa(pp);
      }

      if (roomId.trim()) updates.RoomID = roomId;
      if (roomPassword.trim()) updates.RoomPassword = roomPassword;
      if (videoUrl.trim()) updates.VideoUrl = videoUrl;

      if (formattedDT) updates.DateTime = formattedDT;

      // Update BOTH Meta and Details — parallel for speed
      const metaPath = `Tournaments/TournamentMeta/${updateType}/${updateId}`;
      const detailsPath = `Tournaments/TournamentDetails/${updateType}/${updateId}`;
      const detailsUpdates = { ...updates };
      delete detailsUpdates.BannerUrl;

      const [metaSuccess, detailsSuccess] = await Promise.all([
        rtdbPatch(metaPath, updates),
        rtdbPatch(detailsPath, detailsUpdates),
      ]);

      if (!metaSuccess) throw new Error('Meta update failed');
      if (!detailsSuccess) throw new Error('Details update failed');

      // ═══ TournamentsCount — Completed pe minus 1 ═══
      const previousStatus = currentTournamentData?.Status || '';
      if (status === 'Completed' && previousStatus !== 'Completed' && updateType) {
        try {
          const countData = await rtdbGet('Tournaments/TournamentsCount');
          const counts: Record<string, number> = countData || {};
          counts[updateType] = Math.max(0, (counts[updateType] || 0) - 1);
          await rtdbPut('Tournaments/TournamentsCount', counts);
        } catch (countErr) {
          // non-critical — main update already succeeded
        }
      }

      // Refresh current data
      const newData = await rtdbGet(metaPath);
      if (newData) setCurrentTournamentData(newData);

      toast.success('Tournament Updated!', { description: `ID: ${updateId}` });

    } catch (e: any) {
      toast.error('Update Failed', { description: e.message });
    } finally {
      setLoading(false);
    }
  };

  // ── Available IDs for selected update type (top 8 biggest = latest) ──
  const availableIds = useMemo(() => {
    const ids = updateType ? (hostTournaments[updateType] || []) : [];
    return [...ids]
      .sort((a, b) => {
        const numA = parseInt(String(a), 10);
        const numB = parseInt(String(b), 10);
        return (isNaN(numB) ? 0 : numB) - (isNaN(numA) ? 0 : numA);
      })
      .slice(0, 8);
  }, [updateType, hostTournaments]);

  return (
    <div className="min-h-screen">
      <header className="bg-gradient-to-r from-orange-400 to-orange-600 px-4 lg:px-6 py-6 sticky top-0 z-20">
        <div className="max-w-4xl mx-auto">
          <h1 className="text-xl lg:text-2xl font-extrabold text-white flex items-center gap-2">
            <Trophy className="w-6 h-6" />
            Create / Update Tournament
          </h1>
          <p className="text-white/60 text-sm mt-1">Step 2 — Set up tournament with rooms, rules &amp; prizes</p>
          {configReady && (
            <p className="text-white/40 text-[10px] mt-1">
              {rtdbReady ? '✅ RTDB Connected' : '⚠️ Config loaded'}
            </p>
          )}
        </div>
      </header>

      <div className="max-w-4xl mx-auto px-4 lg:px-6 py-6 space-y-5">

        {/* Mode Toggle */}
        <div className="flex items-center gap-4">
          <Label className="text-sm font-bold text-[oklch(0.85,0.04,290)] whitespace-nowrap">Mode:</Label>
          <div className="flex-1 flex rounded-xl bg-[oklch(0.18,0.04,290)] border border-[oklch(0.30,0.06,290)] p-1">
            <button onClick={() => handleModeSwitch('create')}
              className={`flex-1 py-2.5 rounded-lg text-sm font-semibold transition-all ${mode === 'create' ? 'bg-gradient-to-r from-orange-500 to-orange-600 text-white shadow-lg shadow-orange-500/20' : 'text-[oklch(0.55,0.04,290)]'}`}>
              Create Mode
            </button>
            <button onClick={() => handleModeSwitch('update')}
              className={`flex-1 py-2.5 rounded-lg text-sm font-semibold transition-all ${mode === 'update' ? 'bg-gradient-to-r from-blue-500 to-indigo-600 text-white shadow-lg shadow-blue-500/20' : 'text-[oklch(0.55,0.04,290)]'}`}>
              Update Mode
            </button>
          </div>
        </div>

        {/* Update Mode Section — Kotlin: updateModeLayout */}
        {mode === 'update' && (
          <div className="rounded-2xl bg-[oklch(0.18,0.04,290)] border border-blue-500/20 p-4 space-y-4">
            <p className="text-sm font-bold text-blue-400">Select Tournament to Update:</p>

            {/* Tournament Type Dropdown — Kotlin: spinnerUpdateTournamentType */}
            <div className="space-y-2">
              <Label className="text-xs text-[oklch(0.65,0.04,290)]">Tournament Type</Label>
              <Select value={updateType} onValueChange={handleUpdateTypeChange}>
                <SelectTrigger className="bg-[oklch(0.22,0.04,290)] border-[oklch(0.35,0.06,290)] text-white h-12 rounded-xl">
                  <SelectValue placeholder="Select Type" />
                </SelectTrigger>
                <SelectContent>
                  {Object.keys(hostTournaments).length > 0
                    ? Object.keys(hostTournaments).map((t) => (
                        <SelectItem key={t} value={t}>{t}</SelectItem>
                      ))
                    : <SelectItem value="__placeholder__" disabled>No tournaments</SelectItem>
                  }
                </SelectContent>
              </Select>
            </div>

            {/* Tournament ID Dropdown — Kotlin: spinnerUpdateTournamentId */}
            <div className="space-y-2">
              <Label className="text-xs text-[oklch(0.65,0.04,290)]">Tournament ID</Label>
              <Select value={updateId} onValueChange={setUpdateId}>
                <SelectTrigger className="bg-[oklch(0.22,0.04,290)] border-[oklch(0.35,0.06,290)] text-white h-12 rounded-xl">
                  <SelectValue placeholder="Select Tournament ID" />
                </SelectTrigger>
                <SelectContent>
                  {availableIds.length > 0
                    ? availableIds.map((id) => (
                        <SelectItem key={id} value={id}>{id}</SelectItem>
                      ))
                    : <SelectItem value="__placeholder__" disabled>
                        {updateType ? 'No IDs for this type' : 'Select type first'}
                      </SelectItem>
                  }
                </SelectContent>
              </Select>
            </div>

            {/* Load Button — Kotlin: btnLoadTournament */}
            <Button onClick={handleLoadTournament} disabled={loading || !updateId || updateId === '__placeholder__'}
              className="w-full h-12 rounded-xl bg-gradient-to-r from-blue-500 to-indigo-600 text-white font-semibold shadow-lg shadow-blue-500/20 disabled:opacity-40 disabled:cursor-not-allowed">
              {loading ? <div className="w-5 h-5 border-2 border-white/30 border-t-white rounded-full animate-spin" /> :
                <><RefreshCw className="w-4 h-4 mr-2" /> Load Tournament Data</>}
            </Button>
          </div>
        )}

        {/* Common Form */}
        <div className="rounded-2xl bg-[oklch(0.18,0.04,290)] border border-[oklch(0.30,0.06,290)] p-4 lg:p-5 space-y-4">

          {/* Tournament Type (Create only) — Kotlin: spinnerTournamentType */}
          {mode === 'create' && (
            <div className="space-y-2">
              <Label className="text-xs text-[oklch(0.70,0.04,290)] font-semibold">Tournament Type <span className="text-red-400">*</span></Label>
              <Select value={tournamentType} onValueChange={setTournamentType}>
                <SelectTrigger className="bg-[oklch(0.22,0.04,290)] border-[oklch(0.35,0.06,290)] text-white h-12 rounded-xl">
                  <SelectValue placeholder="Select Tournament Type" />
                </SelectTrigger>
                <SelectContent>
                  {TOURNAMENT_TYPES.map((t) => (
                    <SelectItem key={t.value} value={t.value}>{t.label}</SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
          )}

          {/* Game Mode (Create only) — Kotlin: spinnerMode */}
          {mode === 'create' && (
            <div className="space-y-2">
              <Label className="text-xs text-[oklch(0.70,0.04,290)] font-semibold">Game Mode <span className="text-red-400">*</span></Label>
              <Select value={gameMode} onValueChange={handleGameModeChange}>
                <SelectTrigger className="bg-[oklch(0.22,0.04,290)] border-[oklch(0.35,0.06,290)] text-white h-12 rounded-xl">
                  <SelectValue placeholder="Select Game Mode" />
                </SelectTrigger>
                <SelectContent>
                  {GAME_MODES.map((m) => (
                    <SelectItem key={m.value} value={m.value}>{m.label}</SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
          )}

          {/* Tournament ID (auto-generated, Create only) — Kotlin: etTournamentId */}
          {mode === 'create' && (
            <div className="space-y-2">
              <Label className="text-xs text-[oklch(0.70,0.04,290)] font-semibold">Tournament ID</Label>
              <div className="flex items-center bg-[oklch(0.20,0.04,290)] border border-[oklch(0.30,0.06,290)] rounded-xl px-4 h-12">
                <span className="text-sm text-purple-400 font-mono font-bold">{generatedId || 'EDM_???'}</span>
                <span className="text-[10px] text-[oklch(0.40,0.04,290)] ml-auto">Auto-generated</span>
              </div>
            </div>
          )}

          {/* Title */}
          <div className="space-y-2">
            <Label className="text-xs text-[oklch(0.70,0.04,290)] font-semibold">Title <span className="text-red-400">*</span></Label>
            <Input value={title} onChange={(e) => setTitle(e.target.value)} placeholder="Enter Tournament Title"
              className="bg-[oklch(0.22,0.04,290)] border-[oklch(0.35,0.06,290)] text-white placeholder:text-[oklch(0.40,0.04,290)] h-12 rounded-xl" />
          </div>

          {/* Description */}
          <div className="space-y-2">
            <Label className="text-xs text-[oklch(0.70,0.04,290)] font-semibold">Description</Label>
            <Textarea value={description} onChange={(e) => setDescription(e.target.value)} placeholder="Enter Tournament Description" rows={3}
              className="bg-[oklch(0.22,0.04,290)] border-[oklch(0.35,0.06,290)] text-white placeholder:text-[oklch(0.40,0.04,290)] resize-none rounded-xl" />
          </div>

          {/* Banner URL */}
          <div className="space-y-2">
            <Label className="text-xs text-[oklch(0.70,0.04,290)] font-semibold">Banner URL</Label>
            <Input value={bannerUrl} onChange={(e) => setBannerUrl(e.target.value)} placeholder="Enter Banner Image URL"
              className="bg-[oklch(0.22,0.04,290)] border-[oklch(0.35,0.06,290)] text-white placeholder:text-[oklch(0.40,0.04,290)] h-12 rounded-xl" />
          </div>

          {/* Date & Time — separate date + time with AM/PM */}
          <div className="space-y-2">
            <Label className="text-xs text-[oklch(0.70,0.04,290)] font-semibold">Date &amp; Time <span className="text-red-400">*</span></Label>
            <Input type="date" value={dateOnly} onChange={(e) => setDateOnly(e.target.value)}
              className="bg-[oklch(0.22,0.04,290)] border-[oklch(0.35,0.06,290)] text-white h-12 rounded-xl" />
            <div className="grid grid-cols-3 gap-2">
              <Input type="text" inputMode="numeric" maxLength={2}
                value={timeHour}
                onChange={(e) => setTimeHour(e.target.value.replace(/[^0-9]/g, '').slice(0, 2))}
                placeholder="HH"
                className="bg-[oklch(0.22,0.04,290)] border-[oklch(0.35,0.06,290)] text-white h-12 rounded-xl text-center font-mono text-base" />
              <Input type="text" inputMode="numeric" maxLength={2}
                value={timeMinute}
                onChange={(e) => setTimeMinute(e.target.value.replace(/[^0-9]/g, '').slice(0, 2))}
                placeholder="MM"
                className="bg-[oklch(0.22,0.04,290)] border-[oklch(0.35,0.06,290)] text-white h-12 rounded-xl text-center font-mono text-base" />
              <Select value={timeAmPm} onValueChange={(v) => setTimeAmPm(v as 'AM' | 'PM')}>
                <SelectTrigger className="bg-[oklch(0.22,0.04,290)] border-[oklch(0.35,0.06,290)] text-white h-12 rounded-xl text-center">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="AM">AM</SelectItem>
                  <SelectItem value="PM">PM</SelectItem>
                </SelectContent>
              </Select>
            </div>
          </div>

          {/* Map — LoneWolf = IronCage only (locked), others = full list */}
          <div className="space-y-2">
            <Label className="text-xs text-[oklch(0.70,0.04,290)] font-semibold">Map</Label>
            {gameMode === 'LoneWolf' ? (
              <div className="flex items-center bg-[oklch(0.22,0.04,290)] border border-[oklch(0.35,0.06,290)] rounded-xl px-4 h-12">
                <span className="w-2 h-2 rounded-full bg-orange-400 mr-2" />
                <span className="text-sm font-semibold text-orange-400">IronCage</span>
                <span className="text-[10px] text-[oklch(0.40,0.04,290)] ml-auto">Only map for LoneWolf</span>
              </div>
            ) : (
              <Select value={map} onValueChange={setMap}>
                <SelectTrigger className="bg-[oklch(0.22,0.04,290)] border-[oklch(0.35,0.06,290)] text-white h-12 rounded-xl">
                  <SelectValue placeholder="Select Map" />
                </SelectTrigger>
                <SelectContent>
                  {MAPS.map((m) => (
                    <SelectItem key={m.value} value={m.value}>{m.label}</SelectItem>
                  ))}
                </SelectContent>
              </Select>
            )}
          </div>

          {/* Type: Solo/Duo/Squad — Kotlin: spinnerType */}
          <div className="space-y-2">
            <Label className="text-xs text-[oklch(0.70,0.04,290)] font-semibold">Type (Solo / Duo / Squad)</Label>
            <Select value={type} onValueChange={setType}>
              <SelectTrigger className="bg-[oklch(0.22,0.04,290)] border-[oklch(0.35,0.06,290)] text-white h-12 rounded-xl">
                <SelectValue placeholder="Select Type" />
              </SelectTrigger>
              <SelectContent>
                {TYPES.map((t) => (
                  <SelectItem key={t.value} value={t.value}>{t.label}</SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>

          {/* Slot Numbers + Joining Fee */}
          <div className="grid grid-cols-2 gap-3">
            <div className="space-y-2">
              <Label className="text-xs text-[oklch(0.70,0.04,290)] font-semibold">Slot Numbers</Label>
              <Input type="number" value={slotNumbers} onChange={(e) => setSlotNumbers(e.target.value)} placeholder="e.g. 50"
                className="bg-[oklch(0.22,0.04,290)] border-[oklch(0.35,0.06,290)] text-white placeholder:text-[oklch(0.40,0.04,290)] h-12 rounded-xl" />
            </div>
            <div className="space-y-2">
              <Label className="text-xs text-[oklch(0.70,0.04,290)] font-semibold">Joining Fee (Coins) <span className="text-red-400">*</span></Label>
              <Input type="number" step="any" value={joiningFee} onChange={(e) => setJoiningFee(e.target.value)} placeholder="e.g. 30"
                className="bg-[oklch(0.22,0.04,290)] border-[oklch(0.35,0.06,290)] text-white placeholder:text-[oklch(0.40,0.04,290)] h-12 rounded-xl" />
            </div>
          </div>

          {/* Referral Use % + Per Kill */}
          <div className="grid grid-cols-2 gap-3">
            <div className="space-y-2">
              <Label className="text-xs text-[oklch(0.70,0.04,290)] font-semibold">Referral Use (%)</Label>
              <Input type="number" value={referralUseAmount} onChange={(e) => setReferralUseAmount(e.target.value)} placeholder="0 = off"
                className="bg-[oklch(0.22,0.04,290)] border-[oklch(0.35,0.06,290)] text-white placeholder:text-[oklch(0.40,0.04,290)] h-12 rounded-xl" />
            </div>
            <div className="space-y-2">
              <Label className="text-xs text-[oklch(0.70,0.04,290)] font-semibold">Per Kill Reward (Coins)</Label>
              <Input type="number" step="any" value={perKill} onChange={(e) => setPerKill(e.target.value)} placeholder="e.g. 5"
                className="bg-[oklch(0.22,0.04,290)] border-[oklch(0.35,0.06,290)] text-white placeholder:text-[oklch(0.40,0.04,290)] h-12 rounded-xl" />
            </div>
          </div>

          {/* Price Pool */}
          <div className="space-y-2">
            <Label className="text-xs text-[oklch(0.70,0.04,290)] font-semibold">Price Pool (Coins)</Label>
            <Input type="number" step="any" value={pricePool} onChange={(e) => setPricePool(e.target.value)} placeholder="Enter total price pool"
              className="bg-[oklch(0.22,0.04,290)] border-[oklch(0.35,0.06,290)] text-white placeholder:text-[oklch(0.40,0.04,290)] h-12 rounded-xl" />
          </div>

          {/* Room ID + Room Password — Update mode only (host creates room later) */}
          {mode === 'update' && (
            <div className="grid grid-cols-2 gap-3">
              <div className="space-y-2">
                <Label className="text-xs text-[oklch(0.70,0.04,290)] font-semibold">Room ID</Label>
                <Input value={roomId} onChange={(e) => setRoomId(e.target.value)} placeholder="Enter Room ID"
                  className="bg-[oklch(0.22,0.04,290)] border-[oklch(0.35,0.06,290)] text-white placeholder:text-[oklch(0.40,0.04,290)] h-12 rounded-xl" />
              </div>
              <div className="space-y-2">
                <Label className="text-xs text-[oklch(0.70,0.04,290)] font-semibold">Room Password</Label>
                <Input value={roomPassword} onChange={(e) => setRoomPassword(e.target.value)} placeholder="Enter Password"
                  className="bg-[oklch(0.22,0.04,290)] border-[oklch(0.35,0.06,290)] text-white placeholder:text-[oklch(0.40,0.04,290)] h-12 rounded-xl" />
              </div>
            </div>
          )}

          {/* Video URL */}
          <div className="space-y-2">
            <Label className="text-xs text-[oklch(0.70,0.04,290)] font-semibold">Video URL <span className="text-[oklch(0.40,0.04,290)] font-normal">(Optional)</span></Label>
            <Input value={videoUrl} onChange={(e) => setVideoUrl(e.target.value)} placeholder="Enter Video URL"
              className="bg-[oklch(0.22,0.04,290)] border-[oklch(0.35,0.06,290)] text-white placeholder:text-[oklch(0.40,0.04,290)] h-12 rounded-xl" />
          </div>

          {/* Status — Create = only Upcoming, Update = all — Kotlin: spinnerStatus */}
          <div className="space-y-2">
            <Label className="text-xs text-[oklch(0.70,0.04,290)] font-semibold">Status</Label>
            {mode === 'create' ? (
              <div className="flex items-center bg-[oklch(0.22,0.04,290)] border border-[oklch(0.35,0.06,290)] rounded-xl px-4 h-12">
                <span className="w-2 h-2 rounded-full bg-green-400 mr-2" />
                <span className="text-sm font-semibold text-green-400">Upcoming</span>
                <span className="text-[10px] text-[oklch(0.40,0.04,290)] ml-auto">Default for new tournament</span>
              </div>
            ) : currentTournamentData?.Status === 'Completed' ? (
              <div className="flex items-center bg-[oklch(0.22,0.04,290)] border border-[oklch(0.35,0.06,290)] rounded-xl px-4 h-12">
                <span className="w-2 h-2 rounded-full bg-gray-400 mr-2" />
                <span className="text-sm font-semibold text-gray-400">Completed (Locked)</span>
                <span className="text-[10px] text-[oklch(0.40,0.04,290)] ml-auto">Cannot change status</span>
              </div>
            ) : (
              <Select value={status} onValueChange={setStatus}>
                <SelectTrigger className="bg-[oklch(0.22,0.04,290)] border-[oklch(0.35,0.06,290)] text-white h-12 rounded-xl">
                  <SelectValue placeholder="Select Status" />
                </SelectTrigger>
                <SelectContent>
                  {STATUSES.map((s) => (
                    <SelectItem key={s.value} value={s.value}>{s.label}</SelectItem>
                  ))}
                </SelectContent>
              </Select>
            )}
          </div>
        </div>

        {/* Submit — Kotlin: btnCreateTournament / btnUpdateTournament */}
        <Button
          onClick={mode === 'create' ? handleCreate : handleUpdate}
          disabled={loading}
          className={`w-full h-12 rounded-xl text-white font-semibold text-base shadow-lg disabled:opacity-40 disabled:cursor-not-allowed ${
            mode === 'create'
              ? 'bg-gradient-to-r from-orange-500 to-orange-600 shadow-orange-500/20'
              : 'bg-gradient-to-r from-blue-500 to-indigo-600 shadow-blue-500/20'
          }`}
        >
          {loading ? (
            <div className="w-5 h-5 border-2 border-white/30 border-t-white rounded-full animate-spin" />
          ) : mode === 'create' ? (
            <><Save className="w-5 h-5 mr-2" /> Create Tournament</>
          ) : (
            <><ArrowRight className="w-5 h-5 mr-2" /> Update Tournament</>
          )}
        </Button>
      </div>
    </div>
  );
}
