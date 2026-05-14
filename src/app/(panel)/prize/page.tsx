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
import { rtdbGet } from '@/lib/rtdb';
import {
  Gift,
  RefreshCw,
  Send,
  Terminal,
  Trash2,
} from 'lucide-react';

// ═══════════════════════════════════════════════════
// CONSTANTS — Kotlin tournamentTypes array equivalent
// ═══════════════════════════════════════════════════
const TOURNAMENT_TYPES = [
  { value: 'BattleRoyal', label: 'BattleRoyal' },
  { value: 'ClashSquad', label: 'ClashSquad' },
  { value: 'FreeTournaments', label: 'FreeTournaments' },
  { value: 'LoneWolf', label: 'LoneWolf' },
];

// ═══════════════════════════════════════════════════
// TYPES — Kotlin TournamentInfo data class equivalent
// ═══════════════════════════════════════════════════
interface TournamentInfo {
  id: string;
  title: string;
  status: string;
  hostUID: string;
  paymentStatus: boolean;
  winnerCount: number;
  paidWinners: number;
}

// ═══════════════════════════════════════════════════
// LOG TYPES — Kotlin appendResponse() color mapping
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

export default function PrizePage() {
  const { user, isLoading: authLoading } = useAuth();
  const logEndRef = useRef<HTMLDivElement>(null);

  // ── UI State — Kotlin spinnerTournamentType, etTournamentId ──
  const [tournamentType, setTournamentType] = useState('');
  const [tournamentId, setTournamentId] = useState('');
  const [typeEnabled, setTypeEnabled] = useState(false);
  const [idEnabled, setIdEnabled] = useState(false);

  // ── Loading states — Kotlin progressBar, isDataLoading, isDistributionInProgress ──
  const [configLoading, setConfigLoading] = useState(true);
  const [dataLoading, setDataLoading] = useState(false);
  const [distributing, setDistributing] = useState(false);

  // ── Log state — Kotlin tvResponse ──
  const [logs, setLogs] = useState<LogEntry[]>([]);

  // ── Tournament data — Kotlin tournamentInfoMap, filteredTournaments ──
  const tournamentInfoMap = useRef<Record<string, TournamentInfo[]>>({});
  const [filteredTournaments, setFilteredTournaments] = useState<TournamentInfo[]>([]);

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
      const funUrl = getRemoteString(RC_KEYS.FUN_PRICE_DISTRIBUTION);

      appendLog('Remote Config fetched', 'SUCCESS');
      appendLog(`Database URL: ${rtdbUrl ? 'Received (' + rtdbUrl.length + ' chars)' : 'EMPTY'}`, rtdbUrl ? 'INFO' : 'WARNING');
      appendLog(`Function URL: ${funUrl ? 'Received' : 'EMPTY'}`, funUrl ? 'INFO' : 'WARNING');

      if (!rtdbUrl) {
        appendLog('Warning: Database URL missing — tournament list won\'t load', 'ERROR');
        toast.warning('Database URL missing from Remote Config');
      }
      if (!funUrl) {
        appendLog('Warning: Function URL missing — distribution won\'t work', 'ERROR');
        toast.warning('Function URL missing from Remote Config');
      }

      setConfigLoading(false);

      if (rtdbUrl) {
        loadAllTournamentTypes();
      }
    };
    init();
  }, [user, authLoading]);

  // Auto-scroll log to bottom
  useEffect(() => {
    logEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  }, [logs]);

  // ── Append to log — Kotlin appendResponse() with colored SpannableString ──
  const appendLog = (message: string, type: LogType = 'INFO') => {
    setLogs((prev) => [...prev, { message, type, time: getCurrentTime() }]);
  };

  // ── Clear log — Kotlin clearLogs() ──
  const handleClearLog = () => {
    setLogs([]);
    appendLog('Logs cleared', 'SUCCESS');
  };

  // ═══════════════════════════════════════════════════
  // LOAD ALL TOURNAMENT TYPES — Kotlin loadTournamentIds()
  // Initial load: sab 4 types ka data ek saath fetch
  // ═══════════════════════════════════════════════════
  const loadAllTournamentTypes = async () => {
    if (dataLoading) {
      appendLog('Data already loading, please wait...', 'ERROR');
      return;
    }

    const rtdbUrl = getRemoteString(RC_KEYS.RTDB_URL);
    if (!rtdbUrl) {
      appendLog('Database URL not loaded, retry', 'ERROR');
      return;
    }

    const currentUserId = user?.uid || '';
    if (!currentUserId) {
      appendLog('User not logged in! Please login first.', 'ERROR');
      toast.error('Please login first');
      return;
    }

    setDataLoading(true);
    tournamentInfoMap.current = {};
    appendLog('\n=== LOADING TOURNAMENT DATA ===', 'INFO');
    appendLog(`Current User UID: ${currentUserId}`, 'INFO');

    let completedQueries = 0;
    const totalQueries = TOURNAMENT_TYPES.length;

    for (const type of TOURNAMENT_TYPES) {
      try {
        // Kotlin: $cleanBase/Tournaments/TournamentDetails/$type.json
        const data = await rtdbGet(`Tournaments/TournamentDetails/${type.value}`);
        parseTournamentType(type.value, data, currentUserId);
      } catch (e: any) {
        appendLog(`Failed to load ${type.value}: ${e.message}`, 'ERROR');
        console.error(`[PrizeDist] Failed ${type.value}:`, e);
      }
      completedQueries++;
    }

    // All queries done
    setDataLoading(false);
    setTypeEnabled(true);

    let totalAdmin = 0;
    for (const list of Object.values(tournamentInfoMap.current)) {
      totalAdmin += list.length;
    }

    appendLog('\n=== LOADING COMPLETE ===', 'INFO');
    appendLog(`Total admin tournaments pending payment: ${totalAdmin}`, 'SUCCESS');

    if (totalAdmin === 0) {
      appendLog('No tournaments found where you are the Host with PaymentStatus = false!', 'ERROR');
      appendLog('Make sure:', 'ERROR');
      appendLog('   1. Tournament has \'HostUID\' field with your UID', 'ERROR');
      appendLog('   2. Tournament \'PaymentStatus\' is false (not paid yet)', 'ERROR');
    }

    // Initial load: first type select karo
    updateTournamentList(TOURNAMENT_TYPES[0].value);
    appendLog('Tournament data load complete', 'SUCCESS');
  };

  // ═══════════════════════════════════════════════════
  // PARSE — Kotlin parseTournamentType()
  // Filter: HostUID === currentUserId AND PaymentStatus === false
  // ═══════════════════════════════════════════════════
  const parseTournamentType = (type: string, data: any, currentUserId: string) => {
    const tournamentList: TournamentInfo[] = [];

    if (!data || data === null || typeof data !== 'object') {
      tournamentInfoMap.current[type] = tournamentList;
      appendLog(`${type}: 0 admin tournaments`);
      return;
    }

    for (const [tournamentId, entryVal] of Object.entries(data)) {
      if (!entryVal || typeof entryVal !== 'object') continue;
      const tObj = entryVal as Record<string, any>;

      try {
        // HostUID — try both cases (Kotlin: getStringField with HostUID/hostUID)
        let hostUID = tObj['HostUID'] || tObj['hostUID'] || '';

        // Sirf admin ke apne tournaments jinka PaymentStatus = false
        if (hostUID !== currentUserId || !hostUID) continue;

        const paymentStatus = tObj['PaymentStatus'] === true;
        if (paymentStatus) continue;

        const title = tObj['Title'] || 'No Title';
        const status = tObj['Status'] || 'Unknown';

        // WinnerList nested parsing — Kotlin: JsonObject iteration
        let winnerCount = 0;
        let paidWinners = 0;
        const winnerList = tObj['WinnerList'];
        if (winnerList && typeof winnerList === 'object') {
          for (const [winnerKey, winnerVal] of Object.entries(winnerList)) {
            if (!winnerVal || typeof winnerVal !== 'object') {
              winnerCount++;
              continue;
            }
            winnerCount++;
            if ((winnerVal as Record<string, any>)['PaymentStatus'] === true) {
              paidWinners++;
            }
          }
        }

        tournamentList.push({
          id: tournamentId,
          title,
          status,
          hostUID,
          paymentStatus,
          winnerCount,
          paidWinners,
        });
      } catch (e) {
        console.warn(`[PrizeDist] Skip bad tournament ${tournamentId}:`, e);
      }
    }

    tournamentInfoMap.current[type] = tournamentList;
    appendLog(`${type}: ${tournamentList.length} admin tournaments (PaymentStatus = false)`);
  };

  // ═══════════════════════════════════════════════════
  // UPDATE LIST — Kotlin updateTournamentList()
  // Spinner change hone par filtered list update
  // ═══════════════════════════════════════════════════
  const updateTournamentList = (selectedType: string) => {
    const list = tournamentInfoMap.current[selectedType] || [];
    setFilteredTournaments(list);

    appendLog(`\nAvailable tournaments for ${selectedType} (PaymentStatus = false):`, 'INFO');
    appendLog(`Total available: ${list.length}`, 'INFO');

    if (list.length === 0) {
      appendLog(`   No tournaments available! You are not the Host of any pending payment tournament in ${selectedType}`, 'ERROR');
      setTournamentId('');
      setIdEnabled(false);
    } else {
      for (const t of list) {
        const unpaid = t.winnerCount - t.paidWinners;
        appendLog(`   ${t.id} - ${t.title.slice(0, 40)}...`, 'INFO');
        appendLog(`      Status: ${t.status} | Winners: ${t.winnerCount} | Paid: ${t.paidWinners} | Pending: ${unpaid}`, 'INFO');
      }
      setIdEnabled(true);
      setTournamentId(list[0].id);
    }
  };

  // ═══════════════════════════════════════════════════
  // REFRESH — Kotlin refreshSelectedTournamentType()
  // Sirf selected type ka data refresh (1 query vs 4 = 75% billing save)
  // ═══════════════════════════════════════════════════
  const handleRefresh = async () => {
    if (dataLoading) {
      appendLog('Data already loading, please wait...', 'ERROR');
      return;
    }

    if (!tournamentType) {
      appendLog('Select a tournament type first', 'ERROR');
      return;
    }

    const rtdbUrl = getRemoteString(RC_KEYS.RTDB_URL);
    if (!rtdbUrl) {
      appendLog('Database URL not loaded, retry', 'ERROR');
      return;
    }

    const currentUserId = user?.uid || '';
    if (!currentUserId) {
      appendLog('User not logged in!', 'ERROR');
      toast.error('Please login first');
      return;
    }

    // Pahle current selection yaad rakho
    const previousTournamentId = tournamentId.trim();

    // Logs clear karo
    setLogs([]);
    appendLog('Logs cleared', 'SUCCESS');

    setDataLoading(true);
    appendLog(`\n=== REFRESHING: ${tournamentType} ===`, 'INFO');

    try {
      const data = await rtdbGet(`Tournaments/TournamentDetails/${tournamentType}`);
      parseTournamentType(tournamentType, data, currentUserId);

      setDataLoading(false);
      setTypeEnabled(true);

      const typeList = tournamentInfoMap.current[tournamentType] || [];

      appendLog(`\n=== REFRESH COMPLETE ===`, 'INFO');
      appendLog(`${tournamentType}: ${typeList.length} admin tournaments (PaymentStatus = false)`, 'SUCCESS');

      if (typeList.length === 0) {
        appendLog(`No pending tournaments found in ${tournamentType}`, 'ERROR');
      }

      // Update list with restore
      updateTournamentListWithRestore(tournamentType, previousTournamentId);
    } catch (e: any) {
      appendLog(`Failed to refresh ${tournamentType}: ${e.message}`, 'ERROR');
      setDataLoading(false);
    }
  };

  // ═══════════════════════════════════════════════════
  // UPDATE WITH RESTORE — Kotlin updateTournamentListWithRestore()
  // Previous tournament ID yaad rakho — refresh ke baad restore
  // ═══════════════════════════════════════════════════
  const updateTournamentListWithRestore = (selectedType: string, previousId: string) => {
    const list = tournamentInfoMap.current[selectedType] || [];
    setFilteredTournaments(list);

    appendLog(`\nAvailable tournaments for ${selectedType} (PaymentStatus = false):`, 'INFO');
    appendLog(`Total available: ${list.length}`, 'INFO');

    if (list.length === 0) {
      appendLog(`   No tournaments available!`, 'ERROR');
      setTournamentId('');
      setIdEnabled(false);
    } else {
      for (const t of list) {
        const unpaid = t.winnerCount - t.paidWinners;
        appendLog(`   ${t.id} - ${t.title.slice(0, 40)}...`, 'INFO');
        appendLog(`      Status: ${t.status} | Winners: ${t.winnerCount} | Paid: ${t.paidWinners} | Pending: ${unpaid}`, 'INFO');
      }
      setIdEnabled(true);

      // Previous ID restore karo agar possible ho
      if (previousId) {
        const stillExists = list.some((t) => t.id === previousId);
        if (stillExists) {
          setTournamentId(previousId);
          appendLog(`Restored tournament ID: ${previousId}`, 'SUCCESS');
        } else {
          setTournamentId(list[0].id);
          appendLog(`Previous ID '${previousId}' no longer available — set to ${list[0].id}`, 'WARNING');
        }
      } else {
        setTournamentId(list[0].id);
      }
    }
  };

  // ── Type change handler — Kotlin onItemSelected ──
  const handleTypeChange = (value: string) => {
    setTournamentType(value);
    appendLog(`Selected tournament type: ${value}`, 'INFO');
    updateTournamentList(value);
  };

  // ═══════════════════════════════════════════════════
  // VALIDATE & DISTRIBUTE — Kotlin validateAndStartDistribution() + startDistribution()
  // ═══════════════════════════════════════════════════
  const handleStartDistribution = async () => {
    if (distributing) {
      appendLog('Distribution already in progress, please wait...', 'ERROR');
      return;
    }

    const id = tournamentId.trim();
    const currentUserId = user?.uid || '';

    appendLog('\n=== VALIDATION STARTED ===', 'INFO');
    appendLog(`Selected Tournament Type: ${tournamentType || 'NONE'}`, 'INFO');
    appendLog(`Entered Tournament ID: ${id || 'EMPTY'}`, 'INFO');

    if (!id) {
      appendLog('Tournament ID is empty', 'ERROR');
      toast.error('Please enter Tournament ID');
      return;
    }
    if (!tournamentType) {
      appendLog('Tournament Type not selected', 'ERROR');
      toast.error('Select Tournament Type');
      return;
    }
    if (!currentUserId) {
      appendLog('User not logged in!', 'ERROR');
      toast.error('Please login first');
      return;
    }

    const tournament = filteredTournaments.find((t) => t.id === id);

    if (!tournament) {
      const availableIds = filteredTournaments.map((t) => t.id).join(', ');
      if (filteredTournaments.length === 0) {
        appendLog(`You are not the Host of any pending payment tournament in ${tournamentType}.`, 'ERROR');
        appendLog(`Make sure your tournament has 'HostUID' with value: ${currentUserId}`, 'ERROR');
        appendLog(`And 'PaymentStatus' is false`, 'ERROR');
      } else {
        appendLog(`Tournament ID '${id}' not found in your admin list.`, 'ERROR');
        appendLog(`Available (PaymentStatus=false): ${availableIds}`, 'INFO');
      }
      toast.error('Tournament not found');
      return;
    }

    appendLog(`Tournament found: ${tournament.title}`, 'SUCCESS');
    appendLog(`Tournament Status: ${tournament.status}`, 'SUCCESS');
    appendLog(`PaymentStatus: ${tournament.paymentStatus}`, 'SUCCESS');
    const pending = tournament.winnerCount - tournament.paidWinners;
    appendLog(`Winner Stats - Total: ${tournament.winnerCount}, Paid: ${tournament.paidWinners}, Pending: ${pending}`, 'INFO');

    if (tournament.status !== 'Completed') {
      appendLog(`Tournament status is '${tournament.status}', not 'Completed'`, 'ERROR');
      toast.error('Tournament must be Completed to distribute winnings');
      return;
    }
    if (tournament.paymentStatus) {
      appendLog('Tournament PaymentStatus is already true! Already paid.', 'ERROR');
      toast.error('Tournament already paid!');
      return;
    }

    // Function URL check
    const funUrl = getRemoteString(RC_KEYS.FUN_PRICE_DISTRIBUTION);
    if (!funUrl) {
      appendLog('Firebase Function URL is empty! Check RemoteConfig: Fun_pricedistribution', 'ERROR');
      toast.error('Configuration error: Function URL missing');
      return;
    }

    appendLog('\nVALIDATION PASSED!', 'SUCCESS');
    appendLog(`Tournament: ${tournament.title}`, 'INFO');
    appendLog(`ID: ${id}`, 'INFO');
    appendLog(`Total Winners to pay: ${pending}`, 'INFO');
    appendLog(`Function URL: ${funUrl.slice(0, 50)}...`, 'INFO');

    // ── Start Distribution — Kotlin startDistribution() ──
    setDistributing(true);
    appendLog('\n=== STARTING DISTRIBUTION ===', 'INFO');
    appendLog('Calling Firebase Function: price-distribution...', 'INFO');

    try {
      // Request body — Kotlin: only tournamentType + tournamentId
      const requestBody = {
        tournamentType,
        tournamentId: id,
      };

      // Firebase ID Token — Kotlin: user.getIdToken(false).await()
      let idToken = '';
      try {
        if (user) {
          idToken = await user.getIdToken();
          appendLog('Auth token attached to request', 'SUCCESS');
        }
      } catch (e) {
        appendLog('Warning: Auth token fetch failed — sending without token', 'WARNING');
      }

      // Call Firebase Function — Kotlin: callDistributionFunction()
      const headers: Record<string, string> = {
        'Content-Type': 'application/json',
      };
      if (idToken) {
        headers['Authorization'] = `Bearer ${idToken}`;
      }

      console.log('[PrizeDist] Calling:', funUrl);
      const response = await fetch(funUrl, {
        method: 'POST',
        headers,
        body: JSON.stringify(requestBody),
      });

      const responseCode = response.status;
      let responseBody = '';
      try {
        responseBody = await response.text();
      } catch {
        responseBody = 'No response body';
      }

      // Response code handling — Kotlin when(responseCode)
      if (responseCode === 200) {
        appendLog('Response Code: 200 OK', 'SUCCESS');
      } else if (responseCode === 401) {
        appendLog('Response Code: 401 Unauthorized — Firebase Auth token invalid', 'ERROR');
      } else if (responseCode === 403) {
        appendLog('Response Code: 403 Forbidden — Permission denied', 'ERROR');
      } else if (responseCode === 404) {
        appendLog('Response Code: 404 Not Found — Function URL check karo', 'ERROR');
      } else if (responseCode === 500) {
        appendLog('Response Code: 500 Internal Server Error — Function mein error', 'ERROR');
      } else {
        appendLog(`Response Code: ${responseCode}`, responseCode >= 200 && responseCode < 300 ? 'SUCCESS' : 'ERROR');
      }

      // Parse response — Kotlin handleDistributionResponse()
      handleDistributionResponse(responseBody);

    } catch (e: any) {
      appendLog(`Error: ${e.message}`, 'ERROR');
      toast.error('Distribution failed', { description: e.message });
    } finally {
      setDistributing(false);
    }
  };

  // ═══════════════════════════════════════════════════
  // HANDLE RESPONSE — Kotlin handleDistributionResponse()
  // Parse Function response, show results with paisa→rupees conversion
  // ═══════════════════════════════════════════════════
  const handleDistributionResponse = (responseBody: string) => {
    try {
      const json = JSON.parse(responseBody);

      appendLog('\n=== DISTRIBUTION RESULT ===', 'INFO');

      // Already processed check
      const alreadyProcessed = json.alreadyProcessed === true;
      if (alreadyProcessed) {
        appendLog('Tournament already processed!', 'ERROR');
        toast.error('Tournament already paid!');
        return;
      }

      const success = json.success === true;
      const message = json.message || 'No message provided';

      // Auth error check
      if (message.toLowerCase().includes('unauthorized') || message.toLowerCase().includes('authentication')) {
        appendLog('Authentication Failed! Firebase Auth token rejected', 'ERROR');
        toast.error('Authentication failed. Re-login and try.');
        return;
      }

      appendLog(`Success: ${success}`, success ? 'SUCCESS' : 'ERROR');
      appendLog(`Message: ${message}`, success ? 'SUCCESS' : 'ERROR');

      // Tournament info from Function
      if (json.tournamentType) appendLog(`Tournament Type: ${json.tournamentType}`, 'INFO');
      if (json.tournamentId) appendLog(`Tournament ID: ${json.tournamentId}`, 'INFO');

      // Summary stats
      const totalWinners = json.totalWinners ?? -1;
      const processedWinners = json.processedWinners ?? -1;
      const failedWinners = json.failedWinners ?? -1;

      if (totalWinners >= 0) appendLog(`Total Winners: ${totalWinners}`, 'SUCCESS');
      if (processedWinners >= 0) appendLog(`Processed: ${processedWinners}`, 'SUCCESS');
      if (failedWinners >= 0) appendLog(`Failed: ${failedWinners}`, failedWinners > 0 ? 'ERROR' : 'SUCCESS');

      // Individual results — PAISA → RUPEES + "Coins" suffix (Kotlin: Bank Method)
      if (json.results && Array.isArray(json.results)) {
        let successCount = 0;
        let failCount = 0;
        let totalWinningsPaisa = 0;

        appendLog(`\nWinner Details (${json.results.length} entries):`, 'SUCCESS');

        for (const result of json.results) {
          const userId = result.userId || 'N/A';
          const userSuccess = result.success === true;
          const winningsPaisa = result.winnings || 0;
          const rank = result.rank || 0;

          // Bank Method: PAISA → RUPEES conversion
          const winningsRupees = winningsPaisa / 100;

          if (userSuccess) {
            successCount++;
            totalWinningsPaisa += winningsPaisa;
          } else {
            failCount++;
          }

          appendLog(
            `\nRank ${rank}: ${userId} - ${userSuccess ? `Credited ₹${winningsRupees} Coins` : 'Failed'}`,
            userSuccess ? 'SUCCESS' : 'ERROR'
          );
        }

        // Total distribution summary — RUPEES mein
        const totalRupees = totalWinningsPaisa / 100;
        appendLog('\nSUMMARY:', 'SUCCESS');
        appendLog(`   Successful: ${successCount}`, 'SUCCESS');
        appendLog(`   Failed: ${failCount}`, failCount > 0 ? 'ERROR' : 'SUCCESS');
        appendLog(`   Total Distributed: ₹${totalRupees} Coins`, 'SUCCESS');
      }

      // Success ke baad selected type refresh — 1 query only (billing save)
      if (success && tournamentType) {
        appendLog(`\nRefreshing ${tournamentType} after distribution...`, 'INFO');
        const previousId = tournamentId.trim();
        // Trigger refresh in background
        refreshAfterDistribution(tournamentType, previousId);
      }

      toast[success ? 'success' : 'error'](success ? 'Distribution completed' : 'Distribution failed');

    } catch (e: any) {
      appendLog(`Error parsing response: ${e.message}`, 'ERROR');
      appendLog(`Raw response: ${responseBody.slice(0, 500)}`, 'ERROR');
    }
  };

  // ═══════════════════════════════════════════════════
  // REFRESH AFTER DISTRIBUTION — same as Kotlin logic
  // Success ke baad sirf selected type refresh
  // ═══════════════════════════════════════════════════
  const refreshAfterDistribution = async (selectedType: string, previousId: string) => {
    try {
      const currentUserId = user?.uid || '';
      if (!currentUserId) return;

      const data = await rtdbGet(`Tournaments/TournamentDetails/${selectedType}`);
      parseTournamentType(selectedType, data, currentUserId);

      const typeList = tournamentInfoMap.current[selectedType] || [];
      appendLog(`\n=== REFRESH COMPLETE ===`, 'INFO');
      appendLog(`${selectedType}: ${typeList.length} admin tournaments (PaymentStatus = false)`, 'SUCCESS');
      updateTournamentListWithRestore(selectedType, previousId);
    } catch (e: any) {
      appendLog(`Refresh failed: ${e.message}`, 'ERROR');
    }
  };

  // ── Log color — Kotlin ForegroundColorSpan equivalent ──
  const getLogColor = (type: LogType): string => {
    switch (type) {
      case 'SUCCESS': return 'text-green-400';
      case 'WARNING': return 'text-orange-400';
      case 'ERROR': return 'text-red-400';
      default: return 'text-[oklch(0.55,0.04,290)]';
    }
  };

  // ── Loading state — Kotlin progressBar ──
  const isLoading = configLoading || dataLoading || distributing;

  return (
    <div className="min-h-screen pb-20 lg:pb-6">
      {/* Header */}
      <header className="bg-gradient-to-r from-yellow-400 to-amber-600 px-4 lg:px-6 py-6 sticky top-0 z-20">
        <div className="max-w-4xl mx-auto">
          <h1 className="text-xl lg:text-2xl font-extrabold text-white flex items-center gap-2">
            <Gift className="w-6 h-6" /> Prize Distribution
          </h1>
          <p className="text-white/60 text-sm mt-1">Step 5 — Distribute prizes &amp; winnings to winners</p>
        </div>
      </header>

      <div className="max-w-4xl mx-auto px-4 lg:px-6 py-6 space-y-4">

        {/* Tournament Type + ID — Kotlin spinnerTournamentType + etTournamentId */}
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

        {/* Buttons — Kotlin btnRefreshData + btnStartSending */}
        <div className="grid grid-cols-2 gap-3">
          <Button onClick={handleRefresh} disabled={isLoading}
            className="h-11 rounded-xl bg-gradient-to-r from-blue-500 to-blue-600 text-white font-bold text-sm shadow-lg shadow-blue-500/20 disabled:opacity-40">
            {dataLoading ? <div className="w-4 h-4 border-2 border-white/30 border-t-white rounded-full animate-spin mr-2" /> :
              <RefreshCw className="w-4 h-4 mr-2" />} REFRESH
          </Button>
          <Button onClick={handleStartDistribution} disabled={isLoading}
            className="h-11 rounded-xl bg-gradient-to-r from-green-500 to-emerald-600 text-white font-bold text-sm shadow-lg shadow-green-500/20 disabled:opacity-40">
            {distributing ? <><div className="w-4 h-4 border-2 border-white/30 border-t-white rounded-full animate-spin mr-2" />Sending...</> :
              <><Send className="w-4 h-4 mr-2" /> DISTRIBUTE</>}
          </Button>
        </div>

        {/* Log Viewer Header */}
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-2">
            <Terminal className="w-4 h-4 text-yellow-400" />
            <span className="text-sm font-bold text-yellow-400">Activity Log</span>
            {isLoading && <div className="w-2 h-2 rounded-full bg-green-400 animate-pulse ml-1" />}
          </div>
          <button onClick={handleClearLog}
            className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg bg-gradient-to-r from-red-500 to-orange-500 text-white text-[11px] font-bold shadow-lg shadow-red-500/20 active:scale-95 transition-transform">
            <Trash2 className="w-3 h-3" /> CLEAR
          </button>
        </div>

        {/* Log Viewer — Kotlin tvResponse + scrollViewResponse */}
        <div className="rounded-2xl bg-[oklch(0.12,0.02,290)] border border-[oklch(0.28,0.05,290)] overflow-hidden">
          <div className="p-3 h-[320px] lg:h-[400px] overflow-y-auto scrollbar-none">
            {logs.length === 0 ? (
              <p className="text-[11px] text-[oklch(0.35,0.04,290)] font-mono">
                {configLoading ? 'Loading configuration...' : '[--:--:--] Ready to distribute prizes...'}
              </p>
            ) : (
              <div className="space-y-0.5">
                {logs.map((log, i) => (
                  <p key={i} className={`text-[11px] font-mono leading-relaxed ${getLogColor(log.type)}`}>
                    [{log.time}] {log.message}
                  </p>
                ))}
                {isLoading && <span className="inline-block w-1.5 h-3 bg-yellow-400 animate-pulse ml-1" />}
              </div>
            )}
            <div ref={logEndRef} />
          </div>
        </div>
      </div>
    </div>
  );
}
