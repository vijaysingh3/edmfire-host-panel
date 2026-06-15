'use client';

import { useState, useEffect, useCallback } from 'react';
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
  Copy,
  X,
  Layers,
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

// ═══════════════════════════════════════════════════
// ADD MINUTES TO DATETIME — for bulk creation time shifting
// Takes date/hour/minute/ampm + minutesToAdd → shifted { date, hour, minute, ampm }
// ═══════════════════════════════════════════════════
function addMinutesToDateTime(
  dateStr: string,
  hour: string,
  minute: string,
  ampm: string,
  minutesToAdd: number
): { date: string; hour: string; minute: string; ampm: 'AM' | 'PM' } {
  // Parse to JS Date
  let hour24 = parseInt(hour, 10) || 12;
  if (ampm.toUpperCase() === 'PM' && hour24 !== 12) hour24 += 12;
  if (ampm.toUpperCase() === 'AM' && hour24 === 12) hour24 = 0;

  const [y, m, d] = dateStr.split('-');
  const dateObj = new Date(
    parseInt(y, 10),
    parseInt(m, 10) - 1,
    parseInt(d, 10),
    hour24,
    parseInt(minute, 10) || 0,
    0
  );

  // Add minutes
  dateObj.setTime(dateObj.getTime() + minutesToAdd * 60000);

  // Convert back to fields
  const newYear = dateObj.getFullYear();
  const newMonth = String(dateObj.getMonth() + 1).padStart(2, '0');
  const newDay = String(dateObj.getDate()).padStart(2, '0');
  const newHour24 = dateObj.getHours();
  const newMin = dateObj.getMinutes();

  const h12 = newHour24 % 12 || 12;
  const newAmpm: 'AM' | 'PM' = newHour24 >= 12 ? 'PM' : 'AM';

  return {
    date: `${newYear}-${newMonth}-${newDay}`,
    hour: String(h12).padStart(2, '0'),
    minute: String(newMin).padStart(2, '0'),
    ampm: newAmpm,
  };
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

  // ── Protection (Free Tournaments only) ──
  const [protection, setProtection] = useState('');
  const [protectedTournamentId, setProtectedTournamentId] = useState('');

  // ── Create Mode State ──
  const [generatedId, setGeneratedId] = useState('');

  // ── Update Mode State ──
  const [hostTournaments, setHostTournaments] = useState<Record<string, string[]>>({});
  const [updateType, setUpdateType] = useState('');
  const [updateId, setUpdateId] = useState('');
  const [currentTournamentData, setCurrentTournamentData] = useState<Record<string, any> | null>(null);

  // ── Multi-Create Dialog State ──
  const [showMultiDialog, setShowMultiDialog] = useState(false);
  const [multiCount, setMultiCount] = useState('5');
  const [multiGapMinutes, setMultiGapMinutes] = useState('30');
  const [multiStartDate, setMultiStartDate] = useState('');
  const [multiStartHour, setMultiStartHour] = useState('12');
  const [multiStartMinute, setMultiStartMinute] = useState('00');
  const [multiStartAmPm, setMultiStartAmPm] = useState<'AM' | 'PM'>('PM');
  const [multiProgress, setMultiProgress] = useState(0);
  const [multiCreatedIds, setMultiCreatedIds] = useState<string[]>([]);

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
    setProtection('');
    setProtectedTournamentId('');
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
        Protection: (tournamentType === 'FreeTournaments' && protection) ? protection : 'disable',
        ProtectedTournamentId: (tournamentType === 'FreeTournaments' && protection === 'enable') ? protectedTournamentId.trim() : '',
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
  // BULK CREATE — Create Multiple Tournaments
  // ═══════════════════════════════════════════════
  const handleMultiCreate = async () => {
    if (!user) {
      toast.error('Not logged in');
      return;
    }
    if (!validateRequired()) return;

    if (!tournamentType) {
      toast.error('Tournament Type is required');
      return;
    }

    const count = parseInt(multiCount) || 0;
    const gapMinutes = parseInt(multiGapMinutes) || 0;

    if (count < 2 || count > 50) {
      toast.error('Number of tournaments must be between 2 and 50');
      return;
    }
    if (gapMinutes < 1) {
      toast.error('Time gap must be at least 1 minute');
      return;
    }
    if (!multiStartDate) {
      toast.error('Starting date is required');
      return;
    }

    setMultiProgress(0);
    setMultiCreatedIds([]);
    setLoading(true);

    const createdIds: string[] = [];

    try {
      // Get all existing IDs once at the start
      const allIdsData = await rtdbGet('AllTournamentsID');
      let existingIds = allIdsData ? Object.keys(allIdsData) : [];

      // Pre-build the common tournament data (same for all, except DateTime)
      const joiningFeePaisa = rupeesToPaisa(parseFloat(joiningFee) || 0);
      const perKillPaisa = rupeesToPaisa(parseFloat(perKill) || 0);
      const pricePoolPaisa = rupeesToPaisa(parseFloat(pricePool) || 0);

      for (let i = 0; i < count; i++) {
        // Generate new ID using the latest existing IDs (updated each iteration)
        const newId = existingIds.length > 0
          ? generateNewTournamentId(existingIds)
          : `EDM_${100 + i}`;
        existingIds.push(newId); // Add so next iteration generates next ID

        // Calculate shifted datetime
        const shifted = addMinutesToDateTime(multiStartDate, multiStartHour, multiStartMinute, multiStartAmPm, i * gapMinutes);
        const formattedDT = formatDateTimeForRTDB(shifted.date, shifted.hour, shifted.minute, shifted.ampm);

        const now = new Date().toLocaleString('en-IN', {
          day: '2-digit', month: '2-digit', year: 'numeric',
          hour: '2-digit', minute: '2-digit', second: '2-digit', hour12: false,
        });

        // Register ID in RTDB
        const idRegistered = await rtdbPut(`AllTournamentsID/${newId}`, {
          createdAt: now,
          createdBy: user.uid,
          tournamentId: newId,
          isActive: true,
        });
        if (!idRegistered) {
          throw new Error(`Failed to register tournament ID: ${newId}`);
        }

        // Build tournament data
        const tournamentData: Record<string, any> = {
          Title: title,
          Description: description,
          BannerUrl: bannerUrl,
          DateTime: formattedDT,
          JoinedPlayersCount: 0,
          JoiningFee: joiningFeePaisa,
          ReferralUseAmount: parseInt(referralUseAmount) || 0,
          Map: map,
          Mode: gameMode,
          PerKill: perKillPaisa,
          PricePool: pricePoolPaisa,
          RoomID: roomId,
          RoomPassword: roomPassword,
          SlotNumbers: parseInt(slotNumbers) || 0,
          Status: 'Upcoming',
          Type: type,
          VideoUrl: videoUrl,
          HostUID: user.uid,
          ResultStatus: false,
          PaymentStatus: false,
          Protection: (tournamentType === 'FreeTournaments' && protection) ? protection : 'disable',
          ProtectedTournamentId: (tournamentType === 'FreeTournaments' && protection === 'enable') ? protectedTournamentId.trim() : '',
          CreatedAt: now,
          LastUpdated: now,
        };

        // Save Meta
        const metaPath = `Tournaments/TournamentMeta/${tournamentType}/${newId}`;
        const metaData = { ...tournamentData };

        // Save Details
        const detailsPath = `Tournaments/TournamentDetails/${tournamentType}/${newId}`;
        const detailsData = { ...tournamentData };
        delete detailsData.BannerUrl;
        detailsData.JoinedPlayers = {};

        const metaSuccess = await rtdbPut(metaPath, metaData);
        if (!metaSuccess) throw new Error(`Failed to save tournament meta: ${newId}`);

        const detailsSuccess = await rtdbPut(detailsPath, detailsData);
        if (!detailsSuccess) throw new Error(`Failed to save tournament details: ${newId}`);

        // Save reference to Firestore
        await addDoc(collection(db, 'hosts', user.uid, 'myMatches'), {
          tournamentId: newId,
          tournamentType: tournamentType,
        });

        createdIds.push(newId);
        setMultiProgress(i + 1);
        setMultiCreatedIds([...createdIds]);
      }

      // Update TournamentsCount in one go
      try {
        const countData = await rtdbGet('Tournaments/TournamentsCount');
        const counts: Record<string, number> = countData || {};
        counts[tournamentType] = (counts[tournamentType] || 0) + count;
        await rtdbPut('Tournaments/TournamentsCount', counts);
      } catch (e) {
        // count update failed, non-critical
      }

      toast.success(`${count} Tournaments Created!`, { description: `IDs: ${createdIds.join(', ')}` });

    } catch (e: any) {
      toast.error('Bulk Creation Failed', { description: e.message });
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
    if (!updateType) {
      toast.error('Select tournament type');
      return;
    }
    if (!updateId) {
      toast.error('Enter tournament ID');
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

      // ── Security: Check host ownership ──
      if (data.HostUID && data.HostUID !== user?.uid) {
        toast.error('Access Denied', { description: 'This tournament belongs to another host.' });
        setLoading(false);
        setUpdateId('');
        setCurrentTournamentData(null);
        clearForm();
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

    // ── Security: Re-check host ownership before update ──
    if (currentTournamentData.HostUID && currentTournamentData.HostUID !== user?.uid) {
      toast.error('Access Denied', { description: 'This tournament belongs to another host.' });
      setCurrentTournamentData(null);
      clearForm();
      setUpdateId('');
      return;
    }

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

            {/* Tournament ID — Manual Input with EDM_ prefix */}
            <div className="space-y-2">
              <Label className="text-xs text-[oklch(0.65,0.04,290)]">Tournament ID</Label>
              <div className="relative">
                <span className="absolute left-3.5 top-1/2 -translate-y-1/2 text-sm font-mono font-bold text-[oklch(0.55,0.04,290)] pointer-events-none select-none">EDM_</span>
                <Input
                  type="text"
                  inputMode="numeric"
                  value={updateId.startsWith('EDM_') ? updateId.slice(4) : updateId}
                  onChange={(e) => {
                    const numbers = e.target.value.replace(/[^0-9]/g, '');
                    setUpdateId(numbers ? `EDM_${numbers}` : '');
                  }}
                  placeholder="Enter numbers only"
                  className="bg-[oklch(0.22,0.04,290)] border-[oklch(0.35,0.06,290)] text-white placeholder:text-[oklch(0.40,0.04,290)] h-12 rounded-xl pl-14 font-mono text-base tracking-wider"
                />
              </div>
              {updateId && (
                <p className="text-[10px] text-[oklch(0.50,0.04,290)] font-mono">Preview: <span className="text-cyan-400">{updateId}</span></p>
              )}
            </div>

            {/* Load Button — Kotlin: btnLoadTournament */}
            <Button onClick={handleLoadTournament} disabled={loading || !updateId}
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

          {/* Protection — ONLY for FreeTournaments (Create only) */}
          {mode === 'create' && tournamentType === 'FreeTournaments' && (
            <div className="space-y-2">
              <Label className="text-xs text-[oklch(0.70,0.04,290)] font-semibold">Protection</Label>
              <Select value={protection} onValueChange={(v) => {
                setProtection(v);
                if (v !== 'enable') setProtectedTournamentId('');
              }}>
                <SelectTrigger className="bg-[oklch(0.22,0.04,290)] border-[oklch(0.35,0.06,290)] text-white h-12 rounded-xl">
                  <SelectValue placeholder="Select Protection" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="disable">Disable</SelectItem>
                  <SelectItem value="enable">Enable</SelectItem>
                </SelectContent>
              </Select>
            </div>
          )}

          {/* Protected Tournament ID — ONLY when Protection = Enable */}
          {mode === 'create' && tournamentType === 'FreeTournaments' && protection === 'enable' && (
            <div className="space-y-2">
              <Label className="text-xs text-[oklch(0.70,0.04,290)] font-semibold">Protected Tournament ID <span className="text-red-400">*</span></Label>
              <Input
                value={protectedTournamentId}
                onChange={(e) => setProtectedTournamentId(e.target.value)}
                placeholder="Enter Tournament ID"
                className="bg-[oklch(0.22,0.04,290)] border-[oklch(0.35,0.06,290)] text-white placeholder:text-[oklch(0.40,0.04,290)] h-12 rounded-xl"
              />
              <p className="text-[10px] text-amber-400/80">Protection enabled — this tournament will be linked to the entered ID</p>
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

        {/* Create Multiple Tournaments — Create mode only */}
        {mode === 'create' && (
          <Button
            onClick={() => {
              // Pre-fill dialog with current form date/time
              setMultiStartDate(dateOnly);
              setMultiStartHour(timeHour);
              setMultiStartMinute(timeMinute);
              setMultiStartAmPm(timeAmPm);
              setMultiProgress(0);
              setMultiCreatedIds([]);
              setShowMultiDialog(true);
            }}
            disabled={loading}
            variant="outline"
            className="w-full h-12 rounded-xl text-orange-400 border-orange-500/40 font-semibold text-base hover:bg-orange-500/10 disabled:opacity-40 disabled:cursor-not-allowed"
          >
            <Layers className="w-5 h-5 mr-2" /> Create Multiple Tournaments
          </Button>
        )}
      </div>

      {/* ═══════════════════════════════════════════════ */}
      {/* MULTI-CREATE DIALOG                          */}
      {/* ═══════════════════════════════════════════════ */}
      {showMultiDialog && (
        <div
          className="fixed inset-0 bg-black/60 z-50 flex items-center justify-center p-4"
          onClick={(e) => {
            if (e.target === e.currentTarget) setShowMultiDialog(false);
          }}
        >
          <div className="bg-[oklch(0.16,0.04,290)] border border-[oklch(0.30,0.06,290)] rounded-2xl w-full max-w-md p-5 space-y-4 shadow-2xl relative">
            {/* Close button */}
            <button
              onClick={() => setShowMultiDialog(false)}
              className="absolute top-3 right-3 w-8 h-8 rounded-lg bg-[oklch(0.22,0.04,290)] border border-[oklch(0.35,0.06,290)] flex items-center justify-center text-[oklch(0.60,0.04,290)] hover:text-white hover:bg-[oklch(0.30,0.06,290)] transition-colors"
            >
              <X className="w-4 h-4" />
            </button>

            <h2 className="text-lg font-bold text-white flex items-center gap-2">
              <Layers className="w-5 h-5 text-orange-400" />
              Create Multiple Tournaments
            </h2>
            <p className="text-xs text-[oklch(0.55,0.04,290)]">
              Same form data, different times. Each tournament gets a unique ID and shifted start time.
            </p>

            {/* Number of Tournaments */}
            <div className="space-y-1.5">
              <Label className="text-xs text-[oklch(0.70,0.04,290)] font-semibold">Number of Tournaments</Label>
              <Input
                type="number"
                min={2}
                max={50}
                value={multiCount}
                onChange={(e) => setMultiCount(e.target.value.replace(/[^0-9]/g, '').slice(0, 2))}
                placeholder="2–50"
                className="bg-[oklch(0.22,0.04,290)] border-[oklch(0.35,0.06,290)] text-white placeholder:text-[oklch(0.40,0.04,290)] h-11 rounded-xl"
                disabled={loading}
              />
            </div>

            {/* Time Gap */}
            <div className="space-y-1.5">
              <Label className="text-xs text-[oklch(0.70,0.04,290)] font-semibold">Time Gap (minutes)</Label>
              <Input
                type="number"
                min={1}
                value={multiGapMinutes}
                onChange={(e) => setMultiGapMinutes(e.target.value.replace(/[^0-9]/g, ''))}
                placeholder="e.g. 30"
                className="bg-[oklch(0.22,0.04,290)] border-[oklch(0.35,0.06,290)] text-white placeholder:text-[oklch(0.40,0.04,290)] h-11 rounded-xl"
                disabled={loading}
              />
            </div>

            {/* Starting Time — Date + Hour + Minute + AM/PM */}
            <div className="space-y-1.5">
              <Label className="text-xs text-[oklch(0.70,0.04,290)] font-semibold">Starting Time</Label>
              <Input
                type="date"
                value={multiStartDate}
                onChange={(e) => setMultiStartDate(e.target.value)}
                className="bg-[oklch(0.22,0.04,290)] border-[oklch(0.35,0.06,290)] text-white h-11 rounded-xl"
                disabled={loading}
              />
              <div className="grid grid-cols-3 gap-2">
                <Input
                  type="text"
                  inputMode="numeric"
                  maxLength={2}
                  value={multiStartHour}
                  onChange={(e) => setMultiStartHour(e.target.value.replace(/[^0-9]/g, '').slice(0, 2))}
                  placeholder="HH"
                  className="bg-[oklch(0.22,0.04,290)] border-[oklch(0.35,0.06,290)] text-white h-11 rounded-xl text-center font-mono text-base"
                  disabled={loading}
                />
                <Input
                  type="text"
                  inputMode="numeric"
                  maxLength={2}
                  value={multiStartMinute}
                  onChange={(e) => setMultiStartMinute(e.target.value.replace(/[^0-9]/g, '').slice(0, 2))}
                  placeholder="MM"
                  className="bg-[oklch(0.22,0.04,290)] border-[oklch(0.35,0.06,290)] text-white h-11 rounded-xl text-center font-mono text-base"
                  disabled={loading}
                />
                <Select value={multiStartAmPm} onValueChange={(v) => setMultiStartAmPm(v as 'AM' | 'PM')} disabled={loading}>
                  <SelectTrigger className="bg-[oklch(0.22,0.04,290)] border-[oklch(0.35,0.06,290)] text-white h-11 rounded-xl text-center">
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="AM">AM</SelectItem>
                    <SelectItem value="PM">PM</SelectItem>
                  </SelectContent>
                </Select>
              </div>
            </div>

            {/* Progress Display */}
            {(loading && multiProgress > 0) || multiCreatedIds.length > 0 ? (
              <div className="space-y-2">
                <div className="flex items-center justify-between">
                  <span className="text-xs text-[oklch(0.70,0.04,290)] font-semibold">
                    {loading
                      ? `Creating ${multiProgress} of ${parseInt(multiCount) || '?'}...`
                      : multiCreatedIds.length > 0
                        ? `Done — ${multiCreatedIds.length} created`
                        : ''}
                  </span>
                  {loading && (
                    <div className="w-4 h-4 border-2 border-orange-400/30 border-t-orange-400 rounded-full animate-spin" />
                  )}
                </div>
                {/* Progress bar */}
                {loading && (parseInt(multiCount) || 0) > 0 && (
                  <div className="w-full h-2 bg-[oklch(0.22,0.04,290)] rounded-full overflow-hidden">
                    <div
                      className="h-full bg-gradient-to-r from-orange-500 to-orange-400 rounded-full transition-all duration-300"
                      style={{ width: `${(multiProgress / (parseInt(multiCount) || 1)) * 100}%` }}
                    />
                  </div>
                )}
                {/* Created IDs list */}
                {multiCreatedIds.length > 0 && (
                  <div className="max-h-40 overflow-y-auto rounded-xl bg-[oklch(0.20,0.04,290)] border border-[oklch(0.30,0.06,290)] p-2 space-y-1">
                    {multiCreatedIds.map((id, idx) => (
                      <div
                        key={id}
                        className="flex items-center justify-between px-2 py-1 rounded-lg bg-[oklch(0.24,0.04,290)]"
                      >
                        <span className="text-xs font-mono text-purple-400 font-bold">{id}</span>
                        <button
                          onClick={() => {
                            navigator.clipboard.writeText(id);
                            toast.success('Copied!', { description: id });
                          }}
                          className="text-[oklch(0.50,0.04,290)] hover:text-white transition-colors"
                        >
                          <Copy className="w-3.5 h-3.5" />
                        </button>
                      </div>
                    ))}
                  </div>
                )}
              </div>
            ) : null}

            {/* Start Creating Button */}
            <Button
              onClick={handleMultiCreate}
              disabled={loading}
              className="w-full h-11 rounded-xl bg-gradient-to-r from-orange-500 to-orange-600 text-white font-semibold shadow-lg shadow-orange-500/20 disabled:opacity-40 disabled:cursor-not-allowed"
            >
              {loading ? (
                <>
                  <div className="w-4 h-4 border-2 border-white/30 border-t-white rounded-full animate-spin mr-2" />
                  Creating {multiProgress} of {multiCount}...
                </>
              ) : (
                <>
                  <Layers className="w-4 h-4 mr-2" />
                  Start Creating
                </>
              )}
            </Button>

            {/* Copy All IDs button — only show after completion */}
            {!loading && multiCreatedIds.length > 1 && (
              <Button
                onClick={() => {
                  navigator.clipboard.writeText(multiCreatedIds.join('\n'));
                  toast.success('All IDs copied!');
                }}
                variant="outline"
                className="w-full h-10 rounded-xl text-[oklch(0.70,0.04,290)] border-[oklch(0.35,0.06,290)] font-medium text-sm hover:bg-[oklch(0.25,0.04,290)]"
              >
                <Copy className="w-3.5 h-3.5 mr-2" /> Copy All IDs
              </Button>
            )}
          </div>
        </div>
      )}
    </div>
  );
}