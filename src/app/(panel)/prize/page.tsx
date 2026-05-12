'use client';

import { useState } from 'react';
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
import {
  Gift,
  RefreshCw,
  Send,
  Terminal,
} from 'lucide-react';

const demoLogs = [
  '[08:45:01] Connecting to server...',
  '[08:45:02] Connected successfully.',
  '[08:45:02] Fetching tournament EDM_279 data...',
  '[08:45:03] Tournament found: Battle Royale - EDM_279',
  '[08:45:03] Total players: 48 / 50 slots',
  '[08:45:04] Calculating prize pool: 1,500 coins',
  '[08:45:04] Per Kill Reward: 5 coins',
  '[08:45:05] Processing rank #1: ShadowKiller (8 kills) -> +130 coins',
  '[08:45:05] Processing rank #2: ProSniper_X (6 kills) -> +80 coins',
  '[08:45:06] Processing rank #3: DarkPhoenix99 (5 kills) -> +55 coins',
  '[08:45:06] Processing rank #4: NightWolf (4 kills) -> +40 coins',
  '[08:45:07] Processing rank #5: AceGamer_01 (3 kills) -> +30 coins',
  '[08:45:07] Processing rank #6-48: Distributing kill rewards...',
  '[08:45:10] Player BlazeMaster (2 kills) -> +10 coins',
  '[08:45:11] Player ViperShot (1 kill) -> +5 coins',
  '[08:45:12] Player IronFist777 (0 kills) -> +0 coins',
  '[08:45:15] All distributions completed.',
  '[08:45:15] Total distributed: 1,350 coins',
  '[08:45:15] Remaining: 150 coins (host commission)',
  '[08:45:16] Prize distribution for EDM_279 completed successfully!',
];

export default function PrizePage() {
  const [tournamentType, setTournamentType] = useState('');
  const [tournamentId, setTournamentId] = useState('');
  const [distributing, setDistributing] = useState(false);
  const [logs, setLogs] = useState<string[]>(demoLogs);
  const [showLog, setShowLog] = useState(true);

  const handleRefresh = () => {
    setLogs([]);
    setShowLog(false);
    toast.success('Data Refreshed!');
  };

  const handleStartDistribution = () => {
    if (!tournamentType || !tournamentId) {
      toast.error('Tournament Type aur ID dono chahiye');
      return;
    }
    setShowLog(true);
    setDistributing(true);
    setLogs([]);

    let i = 0;
    const interval = setInterval(() => {
      if (i < demoLogs.length) {
        setLogs((prev) => [...prev, demoLogs[i]]);
        i++;
      } else {
        clearInterval(interval);
        setDistributing(false);
        toast.success('Prize Distribution Completed!');
      }
    }, 400);
  };

  return (
    <div className="min-h-screen">
      <header className="bg-gradient-to-r from-yellow-400 to-amber-600 px-4 lg:px-6 py-6 sticky top-0 z-20">
        <div className="max-w-4xl mx-auto">
          <h1 className="text-xl lg:text-2xl font-extrabold text-white flex items-center gap-2">
            <Gift className="w-6 h-6" /> Prize Distribution
          </h1>
          <p className="text-white/60 text-sm mt-1">Step 5 — Distribute prizes &amp; winnings to winners</p>
        </div>
      </header>

      <div className="max-w-4xl mx-auto px-4 lg:px-6 py-6 space-y-4">

        {/* Tournament Type + ID */}
        <div className="grid grid-cols-2 gap-3">
          <div className="space-y-1.5">
            <Label className="text-[11px] text-[oklch(0.70,0.04,290)] font-semibold">Tournament Type</Label>
            <Select value={tournamentType} onValueChange={setTournamentType}>
              <SelectTrigger className="bg-[oklch(0.22,0.04,290)] border-[oklch(0.35,0.06,290)] text-white h-10 rounded-xl text-sm">
                <SelectValue placeholder="Select Type" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="battle_royale">BattleRoyal</SelectItem>
                <SelectItem value="clash_squad">ClashSquad</SelectItem>
                <SelectItem value="lone_wolf">LoneWolf</SelectItem>
                <SelectItem value="free_tournaments">FreeTournaments</SelectItem>
              </SelectContent>
            </Select>
          </div>
          <div className="space-y-1.5">
            <Label className="text-[11px] text-[oklch(0.70,0.04,290)] font-semibold">Tournament ID</Label>
            <Input value={tournamentId} onChange={(e) => setTournamentId(e.target.value)} placeholder="Tournament ID"
              className="bg-[oklch(0.22,0.04,290)] border-[oklch(0.35,0.06,290)] text-white placeholder:text-[oklch(0.40,0.04,290)] h-10 rounded-xl text-sm text-center" />
          </div>
        </div>

        {/* Buttons */}
        <div className="grid grid-cols-2 gap-3">
          <Button onClick={handleRefresh}
            className="h-11 rounded-xl bg-gradient-to-r from-blue-500 to-blue-600 text-white font-bold text-sm shadow-lg shadow-blue-500/20">
            <RefreshCw className="w-4 h-4 mr-2" /> Refresh Data
          </Button>
          <Button onClick={handleStartDistribution} disabled={distributing}
            className="h-11 rounded-xl bg-gradient-to-r from-green-500 to-emerald-600 text-white font-bold text-sm shadow-lg shadow-green-500/20">
            {distributing ? <><div className="w-4 h-4 border-2 border-white/30 border-t-white rounded-full animate-spin mr-2" />Sending...</> :
              <><Send className="w-4 h-4 mr-2" /> Start Distribution</>}
          </Button>
        </div>

        {/* Log Viewer */}
        <div className="rounded-2xl bg-[oklch(0.14,0.03,290)] border border-[oklch(0.30,0.06,290)] overflow-hidden">
          {/* Log Header */}
          <div className="flex items-center gap-2 px-3.5 py-2.5 bg-[oklch(0.12,0.02,290)] border-b border-[oklch(0.28,0.05,290)]">
            <Terminal className="w-3.5 h-3.5 text-yellow-400" />
            <span className="text-[11px] font-semibold text-[oklch(0.70,0.04,290)]">Logcat</span>
            {distributing && <div className="w-2 h-2 rounded-full bg-green-400 animate-pulse ml-1" />}
            {!distributing && logs.length > 0 && <span className="text-[10px] text-green-400 ml-auto">completed</span>}
          </div>

          {/* Log Content */}
          <div className="p-3 h-[350px] lg:h-[450px] overflow-y-auto scrollbar-none">
            {logs.length === 0 ? (
              <p className="text-[11px] text-[oklch(0.35,0.04,290)] font-mono">Waiting...</p>
            ) : (
              <div className="space-y-0.5">
                {logs.map((log, i) => (
                  <p key={i}
                    className={`text-[11px] font-mono leading-relaxed ${
                      log.includes('success') ? 'text-green-400' :
                      log.includes('Error') || log.includes('error') ? 'text-red-400' :
                      log.includes('Processing') ? 'text-cyan-400' :
                      log.includes('distributed') || log.includes('Remaining') ? 'text-yellow-400' :
                      'text-[oklch(0.55,0.04,290)]'
                    }`}>
                    {log}
                  </p>
                ))}
                {distributing && <span className="inline-block w-1.5 h-3 bg-yellow-400 animate-pulse ml-1" />}
              </div>
            )}
          </div>
        </div>
      </div>
    </div>
  );
}
