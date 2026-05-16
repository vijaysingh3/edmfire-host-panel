'use client';

import { useState, useEffect } from 'react';
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
import { auth } from '@/lib/firebase';
import {
  Bell,
  ChevronDown,
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

const TOURNAMENT_ID_PREFIX = 'EDM_';

// ═══════════════════════════════════════════════════
// LOG TYPES — Kotlin LogType enum equivalent
// ═══════════════════════════════════════════════════
type LogType = 'INFO' | 'SUCCESS' | 'WARNING' | 'ERROR';

interface LogEntry {
  message: string;
  type: LogType;
  time: string;
}

// Current time formatter — Kotlin getCurrentTime()
function getCurrentTime(): string {
  return new Date().toLocaleTimeString('en-IN', {
    hour: '2-digit',
    minute: '2-digit',
    second: '2-digit',
    hour12: false,
  });
}

export default function SendNotificationPage() {
  const { user, isLoading: authLoading } = useAuth();
  const [logOpen, setLogOpen] = useState(false);

  // ── State ──
  const [tournamentType, setTournamentType] = useState('');
  const [tournamentId, setTournamentId] = useState(TOURNAMENT_ID_PREFIX);
  const [notifTitle, setNotifTitle] = useState('');
  const [notifBody, setNotifBody] = useState('');
  const [sending, setSending] = useState(false);
  const [refreshing, setRefreshing] = useState(false);

  // ── Log state — Kotlin tvResponse/appendToLog equivalent ──
  const [logs, setLogs] = useState<LogEntry[]>([]);

  // ── Tournament cache — Kotlin TournamentCache (30 sec) ──
  const [cachedTitle, setCachedTitle] = useState('');
  const [cachedPlayerCount, setCachedPlayerCount] = useState(0);
  const [lastFetchTime, setLastFetchTime] = useState(0);
  const CACHE_DURATION = 30000;

  // ── Init: Remote Config — Kotlin setupRemoteConfig() ──
  useEffect(() => {
    if (authLoading) return;
    const init = async () => {
      appendLog('Fetching Remote Config...', 'INFO');
      await fetchRemoteConfig();

      const rtdbUrl = getRemoteString(RC_KEYS.RTDB_URL);
      const rtdbSecret = getRemoteString(RC_KEYS.RTDB_SECRET);
      const notifyUrl = getRemoteString(RC_KEYS.NOTIFY_JOINED_PLAYERS);

      appendLog('Remote Config fetched', 'SUCCESS');
      appendLog(`Database URL: ${rtdbUrl ? 'Received' : 'EMPTY'}`, rtdbUrl ? 'INFO' : 'WARNING');
      appendLog(`DB Secret: ${rtdbSecret ? 'Received' : 'EMPTY'}`, rtdbSecret ? 'INFO' : 'WARNING');
      appendLog(`Function URL: ${notifyUrl ? 'Received' : 'EMPTY'}`, notifyUrl ? 'INFO' : 'WARNING');

      if (!rtdbUrl || !rtdbSecret) {
        appendLog('Warning: RTDB config missing — tournament info won\'t load', 'WARNING');
      }
      if (!notifyUrl) {
        appendLog('Warning: Function URL missing — notifications won\'t send', 'WARNING');
      }
    };
    init();
  }, [user, authLoading]);

  // ── Append to log — Kotlin appendToLog() with colored SpannableString ──
  const appendLog = (message: string, type: LogType = 'INFO') => {
    setLogs((prev) => [...prev, { message, type, time: getCurrentTime() }]);
  };

  // ── Clear log — Kotlin btnClearLog ──
  const handleClearLog = () => {
    setLogs([]);
    appendLog('Log cleared', 'INFO');
  };

  // ── Tournament ID field — only EDM_ + digits allowed (Kotlin TextWatcher) ──
  const handleTournamentIdChange = (value: string) => {
    if (!value.startsWith(TOURNAMENT_ID_PREFIX)) {
      const fixed = value === '' ? TOURNAMENT_ID_PREFIX : `${TOURNAMENT_ID_PREFIX}${value.replace(/[^0-9]/g, '')}`;
      setTournamentId(fixed);
      return;
    }
    // Allow only digits after prefix
    const afterPrefix = value.slice(TOURNAMENT_ID_PREFIX.length);
    const digitsOnly = afterPrefix.replace(/[^0-9]/g, '');
    setTournamentId(`${TOURNAMENT_ID_PREFIX}${digitsOnly}`);
  };

  // ── Clear cache when type/id changes — Kotlin clearCache() ──
  const clearCache = () => {
    setLastFetchTime(0);
  };

  const handleTypeChange = (value: string) => {
    setTournamentType(value);
    appendLog(`Selected: ${value}`, 'INFO');
    clearCache();
  };

  // ═══════════════════════════════════════════════
  // REFRESH — Kotlin refreshTournamentData()
  // Reads RTDB: Tournaments/TournamentDetails/{type}/{id}
  // ═══════════════════════════════════════════════
  const handleRefresh = async () => {
    const id = tournamentId.trim();
    if (!id || id === TOURNAMENT_ID_PREFIX) {
      appendLog('Tournament ID required', 'ERROR');
      return;
    }
    if (!tournamentType) {
      appendLog('Tournament Type required', 'ERROR');
      return;
    }

    const rtdbUrl = getRemoteString(RC_KEYS.RTDB_URL);
    const rtdbSecret = getRemoteString(RC_KEYS.RTDB_SECRET);
    if (!rtdbUrl || !rtdbSecret) {
      appendLog('RTDB config missing — fetch Remote Config first', 'ERROR');
      return;
    }

    // Cache check — Kotlin: 30 sec duplicate read mat karo
    const now = Date.now();
    if (lastFetchTime && now - lastFetchTime < CACHE_DURATION) {
      appendLog(`Title: ${cachedTitle}`, 'SUCCESS');
      appendLog(`Players joined: ${cachedPlayerCount}`, 'SUCCESS');
      return;
    }

    setRefreshing(true);
    appendLog(`Checking: ${tournamentType}/${id}`, 'INFO');

    try {
      // Kotlin path: Tournaments/TournamentDetails/{type}/{id}
      const data = await rtdbGet(`Tournaments/TournamentDetails/${tournamentType}/${id}`);

      if (!data || data === null) {
        appendLog('Tournament not found', 'ERROR');
        setRefreshing(false);
        return;
      }

      const title = data.Title || 'N/A';
      const playerCount = data.JoinedPlayersCount || 0;

      setCachedTitle(title);
      setCachedPlayerCount(playerCount);
      setLastFetchTime(Date.now());

      appendLog(`Title: ${title}`, 'SUCCESS');
      appendLog(`Players joined: ${playerCount}`, 'SUCCESS');

    } catch (e: any) {
      appendLog(`DB Error: ${e.message}`, 'ERROR');
    } finally {
      setRefreshing(false);
    }
  };

  // ═══════════════════════════════════════════════
  // SEND — Kotlin sendNotifications() + callFirebaseFunction()
  // POST to Firebase Cloud Function with Bearer token
  // ═══════════════════════════════════════════════
  const handleSend = async () => {
    const id = tournamentId.trim();
    if (!id || id === TOURNAMENT_ID_PREFIX) {
      appendLog('Tournament ID required', 'ERROR');
      return;
    }
    if (!tournamentType) {
      appendLog('Tournament Type required', 'ERROR');
      return;
    }
    if (!notifTitle.trim() || !notifBody.trim()) {
      appendLog('FCM requires title & body', 'ERROR');
      return;
    }

    const funUrl = getRemoteString(RC_KEYS.NOTIFY_JOINED_PLAYERS);
    if (!funUrl) {
      appendLog('Function URL missing — check Remote Config', 'ERROR');
      return;
    }

    const playerCount = cachedPlayerCount;

    // Confirmation — Kotlin AlertDialog
    const confirmed = window.confirm(
      `Send FCM to ${playerCount} players\nTournament: ${id}`
    );
    if (!confirmed) {
      appendLog('Cancelled', 'INFO');
      return;
    }

    setSending(true);
    appendLog('========================================', 'INFO');
    appendLog('Sending FCM via Firebase Function', 'INFO');
    appendLog(`Tournament: ${tournamentType}/${id}`, 'INFO');

    try {
      // Build request body — Kotlin jsonRequest
      const requestBody = {
        tournamentType,
        tournamentId: id,
        title: notifTitle.trim(),
        body: notifBody.trim(),
      };

      // Firebase ID Token — Kotlin: user.getIdToken(false).await()
      let idToken = '';
      try {
        if (user) {
          const tokenResult = await user.getIdToken();
          idToken = tokenResult;
        }
      } catch (e) {
        console.warn('ID token fetch failed, sending without auth header');
      }

      // Call Firebase Function — Kotlin: callFirebaseFunction()
      const headers: Record<string, string> = {
        'Content-Type': 'application/json',
      };
      if (idToken) {
        headers['Authorization'] = `Bearer ${idToken}`;
      }

      console.log('📤 [Notify] Calling Firebase Function:', funUrl);
      const response = await fetch(funUrl, {
        method: 'POST',
        headers,
        body: JSON.stringify(requestBody),
      });

      const responseText = await response.text();

      if (response.ok) {
        try {
          const jsonResponse = JSON.parse(responseText);
          const success = jsonResponse.success === true;
          const summary = jsonResponse.summary;

          if (success && summary) {
            const total = summary.totalUsersFound || 0;
            const sent = summary.successfulNotifications || 0;
            const failed = summary.failedNotifications || 0;

            appendLog('FCM sent successfully!', 'SUCCESS');
            appendLog(`Total: ${total} | Sent: ${sent} | Failed: ${failed}`, 'SUCCESS');
            appendLog('========================================', 'INFO');

            if (sent > 0) {
              toast.success(`${sent} notifications sent!`);
            }
          } else {
            appendLog(`Failed: ${jsonResponse.error || 'Unknown'}`, 'ERROR');
          }
        } catch (e) {
          // Raw response parse fail — still show it
          appendLog(`Sent (raw): ${responseText.slice(0, 100)}`, 'SUCCESS');
          toast.success('Notification request sent');
        }
      } else {
        appendLog(`Request failed: HTTP ${response.status} — ${responseText.slice(0, 100)}`, 'ERROR');
        toast.error('Send Failed');
      }
    } catch (e: any) {
      appendLog(`Error: ${e.message}`, 'ERROR');
      toast.error('Send Failed', { description: e.message });
    } finally {
      setSending(false);
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

  return (
    <div className="min-h-screen pb-20 lg:pb-6">
      {/* Header */}
      <header className="bg-gradient-to-r from-yellow-400 to-amber-600 px-4 lg:px-6 py-6 sticky top-0 z-20">
        <div className="max-w-4xl mx-auto">
          <h1 className="text-xl lg:text-2xl font-extrabold text-white flex items-center gap-2">
            <Bell className="w-6 h-6" />
            Send Tournament Notifications
          </h1>
          <p className="text-white/60 text-sm mt-1">Step 3 — Notify joined players about match details</p>
        </div>
      </header>

      <div className="max-w-4xl mx-auto px-4 lg:px-6 py-6 space-y-4">

        {/* Tournament Type + ID */}
        <div className="grid grid-cols-2 gap-3">
          <div className="space-y-1.5">
            <Label className="text-[11px] text-[oklch(0.70,0.04,290)] font-semibold">Tournament Type</Label>
            <Select value={tournamentType} onValueChange={handleTypeChange}>
              <SelectTrigger className="bg-[oklch(0.22,0.04,290)] border-[oklch(0.35,0.06,290)] text-white h-10 rounded-xl text-sm">
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
              onChange={(e) => handleTournamentIdChange(e.target.value)}
              placeholder="EDM_"
              className="bg-[oklch(0.22,0.04,290)] border-[oklch(0.35,0.06,290)] text-white placeholder:text-[oklch(0.40,0.04,290)] h-10 rounded-xl text-sm text-center font-mono"
            />
          </div>
        </div>

        {/* REFRESH + SEND Buttons — Kotlin btnRefreshData + btnStartSending */}
        <div className="grid grid-cols-2 gap-3">
          <Button onClick={handleRefresh} disabled={refreshing || sending}
            className="h-11 rounded-xl bg-gradient-to-r from-blue-500 to-blue-600 text-white font-bold text-sm shadow-lg shadow-blue-500/20 disabled:opacity-40">
            {refreshing ? <div className="w-4 h-4 border-2 border-white/30 border-t-white rounded-full animate-spin mr-2" /> :
              <RefreshCw className="w-4 h-4 mr-2" />} REFRESH
          </Button>
          <Button onClick={handleSend} disabled={sending || refreshing}
            className="h-11 rounded-xl bg-gradient-to-r from-green-500 to-emerald-600 text-white font-bold text-sm shadow-lg shadow-green-500/20 disabled:opacity-40">
            {sending ? <div className="w-4 h-4 border-2 border-white/30 border-t-white rounded-full animate-spin mr-2" /> :
              <Send className="w-4 h-4 mr-2" />} SEND
          </Button>
        </div>

        {/* Notification Title — Kotlin etInputTittle */}
        <div className="space-y-1.5">
          <Label className="text-[11px] text-[oklch(0.70,0.04,290)] font-semibold">Notification Title</Label>
          <Input value={notifTitle} onChange={(e) => setNotifTitle(e.target.value)} placeholder="Enter notification title"
            className="bg-[oklch(0.22,0.04,290)] border-[oklch(0.35,0.06,290)] text-white placeholder:text-[oklch(0.40,0.04,290)] h-10 rounded-xl text-sm" />
        </div>

        {/* Notification Body — Kotlin etInputBody */}
        <div className="space-y-1.5">
          <Label className="text-[11px] text-[oklch(0.70,0.04,290)] font-semibold">Notification Body</Label>
          <Input value={notifBody} onChange={(e) => setNotifBody(e.target.value)} placeholder="Enter notification body"
            className="bg-[oklch(0.22,0.04,290)] border-[oklch(0.35,0.06,290)] text-white placeholder:text-[oklch(0.40,0.04,290)] h-10 rounded-xl text-sm" />
        </div>

        {/* Log Viewer Toggle (default closed) */}
        <div className="flex items-center justify-between">
          <button onClick={() => setLogOpen(!logOpen)}
            className="flex items-center gap-2 transition-colors">
            <Terminal className="w-4 h-4 text-yellow-400" />
            <span className="text-sm font-bold text-yellow-400">Activity Log ({logs.length})</span>
            <ChevronDown className={`w-4 h-4 text-yellow-400 transition-transform duration-300 ${logOpen ? 'rotate-180' : ''}`} />
          </button>
          {logOpen && (
            <button onClick={handleClearLog}
              className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg bg-gradient-to-r from-red-500 to-orange-500 text-white text-[11px] font-bold shadow-lg shadow-red-500/20 active:scale-95 transition-transform">
              <Trash2 className="w-3 h-3" /> CLEAR
            </button>
          )}
        </div>

        {/* Log Viewer — Kotlin tvResponse + scrollViewResponse (toggle, default closed) */}
        {logOpen && (
          <div className="rounded-2xl bg-[oklch(0.12,0.02,290)] border border-[oklch(0.28,0.05,290)] overflow-hidden">
            <div className="p-3 h-[320px] lg:h-[400px] overflow-y-auto scrollbar-none">
              {logs.length === 0 ? (
                <p className="text-[11px] text-[oklch(0.35,0.04,290)] font-mono">[--:--:--] Ready to send notifications...</p>
              ) : (
                <div className="space-y-0.5">
                  {logs.map((log, i) => (
                    <p key={i} className={`text-[11px] font-mono leading-relaxed ${getLogColor(log.type)}`}>
                      [{log.time}] {log.message}
                    </p>
                  ))}
                  {sending && <span className="inline-block w-1.5 h-3 bg-yellow-400 animate-pulse ml-1" />}
                </div>
              )}
            </div>
          </div>
        )}
      </div>
    </div>
  );
}
