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
  Target,
  Search,
  RefreshCw,
  RotateCcw,
  X,
  Info,
  Save,
  Trash2,
  Lock,
} from 'lucide-react';

interface PlayerData {
  id: string;
  name: string;
  uid: string;
  level: number;
  seatNo: number;
  kills: number;
  deaths: number;
  assists: number;
  damage: number;
  coinsEarned: number;
  rank: string;
  result: string;
}

const initialPlayers: PlayerData[] = [
  { id: '1', name: 'ShadowKiller', uid: '987654321', level: 45, seatNo: 1, kills: 8, deaths: 1, assists: 2, damage: 1250, coinsEarned: 0, rank: '1', result: '' },
  { id: '2', name: 'ProSniper_X', uid: '123456789', level: 52, seatNo: 2, kills: 6, deaths: 2, assists: 3, damage: 980, coinsEarned: 0, rank: '2', result: '' },
  { id: '3', name: 'DarkPhoenix99', uid: '456789123', level: 38, seatNo: 3, kills: 5, deaths: 1, assists: 1, damage: 870, coinsEarned: 0, rank: '3', result: '' },
  { id: '4', name: 'NightWolf', uid: '789123456', level: 41, seatNo: 4, kills: 4, deaths: 3, assists: 0, damage: 720, coinsEarned: 0, rank: '4', result: '' },
  { id: '5', name: 'AceGamer_01', uid: '321654987', level: 33, seatNo: 5, kills: 3, deaths: 2, assists: 2, damage: 600, coinsEarned: 0, rank: '5', result: '' },
  { id: '6', name: 'BlazeMaster', uid: '654987321', level: 29, seatNo: 6, kills: 2, deaths: 4, assists: 1, damage: 450, coinsEarned: 0, rank: '6', result: '' },
];

export default function ResultsPage() {
  const [tournamentType, setTournamentType] = useState('');
  const [tournamentId, setTournamentId] = useState('');
  const [resultPublished, setResultPublished] = useState(false);
  const [searchQuery, setSearchQuery] = useState('');
  const [players, setPlayers] = useState<PlayerData[]>(initialPlayers);

  const filteredPlayers = players.filter(
    (p) => p.name.toLowerCase().includes(searchQuery.toLowerCase()) || p.uid.includes(searchQuery)
  );

  const updatePlayer = (id: string, field: keyof PlayerData, value: string | number) => {
    setPlayers((prev) => prev.map((p) => (p.id === id ? { ...p, [field]: value } : p)));
  };

  const handleRefresh = () => toast.success('Players Refreshed!');
  const handleRevert = () => { setPlayers(initialPlayers); toast.success('All data reverted!'); };
  const handlePlayerUpdate = (id: string) => toast.success('Player Updated!');
  const handlePlayerDelete = (id: string) => { setPlayers((prev) => prev.filter((p) => p.id !== id)); toast.success('Player Deleted!'); };

  return (
    <div className="min-h-screen">
      <header className="bg-gradient-to-r from-fuchsia-500 to-violet-700 px-4 lg:px-6 py-6 sticky top-0 z-20">
        <div className="max-w-4xl mx-auto">
          <h1 className="text-xl lg:text-2xl font-extrabold text-white flex items-center gap-2">
            <Target className="w-6 h-6" /> Tournament Players Management
          </h1>
          <p className="text-white/60 text-sm mt-1">Step 4 — Enter match results, scores &amp; winner details</p>
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

        {/* Result Toggle */}
        <div className="rounded-xl bg-[oklch(0.18,0.04,290)] border border-[oklch(0.30,0.06,290)] p-3 flex items-center gap-2.5">
          <div className="w-8 h-8 rounded-lg bg-yellow-500/15 flex items-center justify-center shrink-0">
            <Info className="w-4 h-4 text-yellow-400" />
          </div>
          <div className="flex-1 min-w-0">
            <p className="text-xs font-semibold text-white">Result Status</p>
            <p className={`text-[10px] mt-0.5 ${resultPublished ? 'text-green-400' : 'text-red-400'}`}>
              {resultPublished ? 'Published' : 'Not Published'}
            </p>
          </div>
          <button onClick={() => setResultPublished(!resultPublished)}
            className={`relative w-11 h-6 rounded-full transition-colors shrink-0 ${resultPublished ? 'bg-green-500' : 'bg-[oklch(0.30,0.06,290)]'}`}>
            <div className={`absolute top-0.5 w-5 h-5 rounded-full bg-white shadow transition-transform ${resultPublished ? 'left-5' : 'left-0.5'}`} />
          </button>
        </div>

        {/* Refresh + Revert */}
        <div className="grid grid-cols-2 gap-2.5">
          <Button onClick={handleRefresh} className="h-10 rounded-xl bg-gradient-to-r from-blue-500 to-blue-600 text-white font-semibold text-xs shadow-lg shadow-blue-500/20">
            <RefreshCw className="w-3.5 h-3.5 mr-1.5" /> Refresh
          </Button>
          <Button onClick={handleRevert} className="h-10 rounded-xl bg-gradient-to-r from-red-500 to-red-600 text-white font-semibold text-xs shadow-lg shadow-red-500/20">
            <RotateCcw className="w-3.5 h-3.5 mr-1.5" /> Revert All
          </Button>
        </div>

        {/* Search */}
        <div className="flex items-center gap-2 bg-[oklch(0.18,0.04,290)] border border-[oklch(0.30,0.06,290)] rounded-xl px-3 py-2">
          <Search className="w-3.5 h-3.5 text-yellow-400 shrink-0" />
          <input type="text" value={searchQuery} onChange={(e) => setSearchQuery(e.target.value)}
            placeholder="Search by Name or UID..." className="flex-1 bg-transparent text-xs text-white placeholder:text-[oklch(0.40,0.04,290)] outline-none" />
          {searchQuery && <button onClick={() => setSearchQuery('')}><X className="w-3.5 h-3.5 text-red-400" /></button>}
        </div>

        <p className="text-xs font-bold text-yellow-400">Players: {filteredPlayers.length}</p>

        {/* Player Cards */}
        <div className="space-y-2.5">
          {filteredPlayers.length === 0 ? (
            <div className="flex flex-col items-center py-16 space-y-3">
              <Target className="w-10 h-10 text-[oklch(0.30,0.04,290)]" />
              <p className="text-xs text-[oklch(0.40,0.04,290)]">No players found</p>
            </div>
          ) : filteredPlayers.map((player) => (
            <div key={player.id} className="rounded-xl bg-[oklch(0.18,0.04,290)] border border-[oklch(0.28,0.05,290)] p-3 space-y-2">

              {/* Row 1: LOCKED — Name + Level + SlotNo */}
              <div className="flex items-center gap-1.5 bg-[oklch(0.22,0.04,290)] rounded-lg px-2.5 py-2">
                <Lock className="w-3 h-3 text-[oklch(0.40,0.04,290)] shrink-0" />
                <span className="text-xs font-bold text-white truncate min-w-0">{player.name}</span>
                <span className="text-[10px] text-[oklch(0.45,0.04,290)] shrink-0">Lv</span>
                <span className="text-[11px] font-bold text-yellow-400 shrink-0">{player.level}</span>
                <span className="ml-auto text-[10px] text-[oklch(0.45,0.04,290)] shrink-0">Slot</span>
                <span className="text-[11px] font-bold text-fuchsia-400 bg-fuchsia-500/10 px-1.5 py-0.5 rounded shrink-0">{player.seatNo}</span>
              </div>

              {/* Row 2: LOCKED — UID */}
              <div className="flex items-center gap-1.5 bg-[oklch(0.20,0.04,290)] rounded-lg px-2.5 py-1.5">
                <Lock className="w-2.5 h-2.5 text-[oklch(0.35,0.04,290)] shrink-0" />
                <span className="text-[10px] text-[oklch(0.45,0.04,290)] shrink-0">UID:</span>
                <span className="text-[11px] text-[oklch(0.60,0.04,290)] font-mono">{player.uid}</span>
              </div>

              {/* Row 3: EDITABLE — Kills + Deaths + Assists + Damage (compact grid) */}
              <div className="grid grid-cols-4 gap-1.5">
                {[
                  { label: 'Kills', field: 'kills' as const, color: 'text-white' },
                  { label: 'Death', field: 'deaths' as const, color: 'text-teal-400' },
                  { label: 'Elim.', field: 'assists' as const, color: 'text-white' },
                  { label: 'Dmg', field: 'damage' as const, color: 'text-red-400' },
                ].map((item) => (
                  <div key={item.field} className="bg-[oklch(0.20,0.04,290)] rounded-lg px-1.5 py-1.5 text-center">
                    <p className="text-[9px] text-[oklch(0.45,0.04,290)] leading-none">{item.label}</p>
                    <input type="number" value={player[item.field]}
                      onChange={(e) => updatePlayer(player.id, item.field, Number(e.target.value))}
                      className={`w-full bg-transparent text-xs font-bold ${item.color} text-center outline-none mt-0.5 -mb-px`} />
                  </div>
                ))}
              </div>

              {/* Row 4: EDITABLE — Coins Earned + Rank + Result */}
              <div className="grid grid-cols-3 gap-1.5">
                <div className="bg-[oklch(0.20,0.04,290)] rounded-lg px-1.5 py-1.5 text-center">
                  <p className="text-[9px] text-[oklch(0.45,0.04,290)] leading-none">Coins</p>
                  <input type="number" value={player.coinsEarned}
                    onChange={(e) => updatePlayer(player.id, 'coinsEarned', Number(e.target.value))}
                    className="w-full bg-transparent text-xs font-bold text-yellow-400 text-center outline-none mt-0.5 -mb-px" />
                </div>
                <div className="bg-[oklch(0.20,0.04,290)] rounded-lg px-1.5 py-1.5 text-center">
                  <p className="text-[9px] text-[oklch(0.45,0.04,290)] leading-none">Rank</p>
                  <input type="text" value={player.rank}
                    onChange={(e) => updatePlayer(player.id, 'rank', e.target.value)}
                    className="w-full bg-transparent text-xs font-bold text-white text-center outline-none mt-0.5 -mb-px" />
                </div>
                <div className="bg-[oklch(0.20,0.04,290)] rounded-lg px-1.5 py-1.5">
                  <p className="text-[9px] text-[oklch(0.45,0.04,290)] text-center leading-none">Result</p>
                  <Select value={player.result} onValueChange={(v) => updatePlayer(player.id, 'result', v)}>
                    <SelectTrigger className="bg-transparent border border-[oklch(0.30,0.06,290)] text-white h-7 rounded-md text-[10px] px-1.5 mt-0.5">
                      <SelectValue placeholder="Select" />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="win">Win</SelectItem>
                      <SelectItem value="lose">Lose</SelectItem>
                      <SelectItem value="top10">Top 10</SelectItem>
                      <SelectItem value="dq">DQ</SelectItem>
                    </SelectContent>
                  </Select>
                </div>
              </div>

              {/* Action Buttons */}
              <div className="grid grid-cols-2 gap-2">
                <button onClick={() => handlePlayerUpdate(player.id)}
                  className="flex items-center justify-center gap-1.5 py-2 rounded-lg bg-gradient-to-r from-green-500 to-emerald-600 text-white font-semibold text-xs shadow-lg shadow-green-500/15 active:scale-[0.98] transition-transform">
                  <Save className="w-3 h-3" /> Update
                </button>
                <button onClick={() => handlePlayerDelete(player.id)}
                  className="flex items-center justify-center gap-1.5 py-2 rounded-lg bg-gradient-to-r from-red-500 to-red-600 text-white font-semibold text-xs shadow-lg shadow-red-500/15 active:scale-[0.98] transition-transform">
                  <Trash2 className="w-3 h-3" /> Delete
                </button>
              </div>
            </div>
          ))}
        </div>
      </div>
    </div>
  );
}
