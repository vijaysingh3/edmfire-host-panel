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
  Bell,
  RefreshCw,
  Send,
  Terminal,
  Trash2,
} from 'lucide-react';

const demoLogs = [
  '[09:00:01] Initializing notification service...',
  '[09:00:02] Service ready. Connected to FCM.',
  '[09:00:03] Tournament loaded: BattleRoyal — EDM_279',
  '[09:00:03] Total joined players: 48',
  '[09:00:04] Composing notification...',
  '[09:00:04] Title: Room Id or Pass. Released.',
  '[09:00:04] Body: You have only 5 minutes time.',
  '[09:00:05] Send Via: FCM (Firebase Cloud Messaging)',
  '[09:00:06] Sending to: ShadowKiller (UID: 987654321)... SUCCESS',
  '[09:00:07] Sending to: ProSniper_X (UID: 123456789)... SUCCESS',
  '[09:00:08] Sending to: DarkPhoenix99 (UID: 456789123)... SUCCESS',
  '[09:00:09] Sending to: NightWolf (UID: 789123456)... SUCCESS',
  '[09:00:10] Sending to: AceGamer_01 (UID: 321654987)... SUCCESS',
  '[09:00:11] Sending to: BlazeMaster (UID: 654987321)... FAILED — Device offline',
  '[09:00:12] Sending to: ViperShot (UID: 159357258)... SUCCESS',
  '[09:00:13] Sending to: IronFist777 (UID: 951753456)... SUCCESS',
  '[09:00:15] Batch 1 complete: 7/8 sent successfully.',
  '[09:00:16] Retrying failed: BlazeMaster... SUCCESS (retry)',
  '[09:00:18] ═══════════════════════════════════',
  '[09:00:18] All notifications sent: 8/8',
  '[09:00:18] Total time: 14 seconds',
  '[09:00:19] Notification broadcast completed successfully!',
];

export default function SendNotificationPage() {
  const [tournamentType, setTournamentType] = useState('');
  const [tournamentId, setTournamentId] = useState('EDM_');
  const [sendVia, setSendVia] = useState('');
  const [notifTitle, setNotifTitle] = useState('Room Id or Pass. Released.');
  const [notifBody, setNotifBody] = useState('You have only 5 minutes time.');
  const [sending, setSending] = useState(false);
  const [logs, setLogs] = useState<string[]>(demoLogs);
  const [logVisible, setLogVisible] = useState(true);

  const handleClearLog = () => {
    setLogs([]);
    setLogVisible(false);
    toast.success('Log Cleared!');
  };

  const handleRefresh = () => {
    setLogs([]);
    setLogVisible(false);
    toast.success('Data Refreshed!');
  };

  const handleSend = () => {
    if (!tournamentType || !tournamentId || !sendVia) {
      toast.error('Tournament Type, ID aur Send Via sab chahiye');
      return;
    }
    if (!notifTitle.trim() || !notifBody.trim()) {
      toast.error('Notification Title aur Body zaruri hain');
      return;
    }

    setLogVisible(true);
    setSending(true);
    setLogs([]);

    let i = 0;
    const interval = setInterval(() => {
      if (i < demoLogs.length) {
        setLogs((prev) => [...prev, demoLogs[i]]);
        i++;
      } else {
        clearInterval(interval);
        setSending(false);
        toast.success('All Notifications Sent!');
      }
    }, 350);
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
            <Input value={tournamentId} onChange={(e) => setTournamentId(e.target.value)} placeholder="EDM_"
              className="bg-[oklch(0.22,0.04,290)] border-[oklch(0.35,0.06,290)] text-white placeholder:text-[oklch(0.40,0.04,290)] h-10 rounded-xl text-sm text-center" />
          </div>
        </div>

        {/* Send Via */}
        <div className="space-y-1.5">
          <Label className="text-[11px] text-[oklch(0.70,0.04,290)] font-semibold">Send Via</Label>
          <Select value={sendVia} onValueChange={setSendVia}>
            <SelectTrigger className="bg-[oklch(0.22,0.04,290)] border-[oklch(0.35,0.06,290)] text-white h-10 rounded-xl text-sm">
              <SelectValue placeholder="Select Method" />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="fcm">FCM (Firebase Cloud Messaging)</SelectItem>
              <SelectItem value="in_app">In-App Notification</SelectItem>
              <SelectItem value="both">Both FCM + In-App</SelectItem>
            </SelectContent>
          </Select>
        </div>

        {/* REFRESH + SEND Buttons */}
        <div className="grid grid-cols-2 gap-3">
          <Button onClick={handleRefresh}
            className="h-11 rounded-xl bg-gradient-to-r from-blue-500 to-blue-600 text-white font-bold text-sm shadow-lg shadow-blue-500/20">
            <RefreshCw className="w-4 h-4 mr-2" /> REFRESH
          </Button>
          <Button onClick={handleSend} disabled={sending}
            className="h-11 rounded-xl bg-gradient-to-r from-green-500 to-emerald-600 text-white font-bold text-sm shadow-lg shadow-green-500/20">
            {sending ? <><div className="w-4 h-4 border-2 border-white/30 border-t-white rounded-full animate-spin mr-2" />Sending...</> :
              <><Send className="w-4 h-4 mr-2" /> SEND</>}
          </Button>
        </div>

        {/* Notification Title */}
        <div className="space-y-1.5">
          <Label className="text-[11px] text-[oklch(0.70,0.04,290)] font-semibold">Notification Title</Label>
          <Input value={notifTitle} onChange={(e) => setNotifTitle(e.target.value)} placeholder="Enter notification title"
            className="bg-[oklch(0.22,0.04,290)] border-[oklch(0.35,0.06,290)] text-white placeholder:text-[oklch(0.40,0.04,290)] h-10 rounded-xl text-sm" />
        </div>

        {/* Notification Body */}
        <div className="space-y-1.5">
          <Label className="text-[11px] text-[oklch(0.70,0.04,290)] font-semibold">Notification Body</Label>
          <Input value={notifBody} onChange={(e) => setNotifBody(e.target.value)} placeholder="Enter notification body"
            className="bg-[oklch(0.22,0.04,290)] border-[oklch(0.35,0.06,290)] text-white placeholder:text-[oklch(0.40,0.04,290)] h-10 rounded-xl text-sm" />
        </div>

        {/* Log Viewer Header */}
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-2">
            <Terminal className="w-4 h-4 text-yellow-400" />
            <span className="text-sm font-bold text-yellow-400">Activity Log</span>
          </div>
          <button onClick={handleClearLog}
            className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg bg-gradient-to-r from-red-500 to-orange-500 text-white text-[11px] font-bold shadow-lg shadow-red-500/20 active:scale-95 transition-transform">
            <Trash2 className="w-3 h-3" /> CLEAR
          </button>
        </div>

        {/* Log Viewer */}
        <div className="rounded-2xl bg-[oklch(0.12,0.02,290)] border border-[oklch(0.28,0.05,290)] overflow-hidden">
          <div className="p-3 h-[320px] lg:h-[400px] overflow-y-auto scrollbar-none">
            {logs.length === 0 ? (
              <p className="text-[11px] text-[oklch(0.35,0.04,290)] font-mono">[--:--:--] Ready to send notifications...</p>
            ) : (
              <div className="space-y-0.5">
                {logs.map((log, i) => (
                  <p key={i}
                    className={`text-[11px] font-mono leading-relaxed ${
                      log.includes('SUCCESS') ? 'text-green-400' :
                      log.includes('FAILED') ? 'text-red-400' :
                      log.includes('completed successfully') || log.includes('═') ? 'text-green-400' :
                      log.includes('Sending to') ? 'text-cyan-400' :
                      log.includes('Retry') || log.includes('Retrying') ? 'text-yellow-400' :
                      log.includes('Total') ? 'text-yellow-400' :
                      'text-[oklch(0.55,0.04,290)]'
                    }`}>
                    {log}
                  </p>
                ))}
                {sending && <span className="inline-block w-1.5 h-3 bg-yellow-400 animate-pulse ml-1" />}
              </div>
            )}
          </div>
        </div>
      </div>
    </div>
  );
}
