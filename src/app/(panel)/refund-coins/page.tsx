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
  RotateCcw,
  RefreshCw,
  X,
  Users,
} from 'lucide-react';

interface RefundPlayer {
  id: string;
  name: string;
  uid: string;
  seatNo: number;
  joiningFee: number;
}

const demoPlayers: RefundPlayer[] = [
  { id: '1', name: 'ShadowKiller', uid: '987654321', seatNo: 1, joiningFee: 30 },
  { id: '2', name: 'ProSniper_X', uid: '123456789', seatNo: 2, joiningFee: 30 },
  { id: '3', name: 'DarkPhoenix99', uid: '456789123', seatNo: 3, joiningFee: 30 },
  { id: '4', name: 'NightWolf', uid: '789123456', seatNo: 4, joiningFee: 30 },
  { id: '5', name: 'AceGamer_01', uid: '321654987', seatNo: 5, joiningFee: 50 },
  { id: '6', name: 'BlazeMaster', uid: '654987321', seatNo: 6, joiningFee: 50 },
  { id: '7', name: 'ViperShot', uid: '159357258', seatNo: 7, joiningFee: 50 },
  { id: '8', name: 'IronFist777', uid: '951753456', seatNo: 8, joiningFee: 50 },
];

export default function RefundCoinsPage() {
  const [tournamentType, setTournamentType] = useState('');
  const [tournamentId, setTournamentId] = useState('');
  const [players, setPlayers] = useState<RefundPlayer[]>([]);
  const [loaded, setLoaded] = useState(false);
  const [joiningFee, setJoiningFee] = useState(0);

  // Dialog state
  const [dialogOpen, setDialogOpen] = useState(false);
  const [selectedPlayer, setSelectedPlayer] = useState<RefundPlayer | null>(null);
  const [refundPercent, setRefundPercent] = useState(100);
  const [customPercent, setCustomPercent] = useState('100');

  const handleLoadPlayers = () => {
    if (!tournamentType || !tournamentId) {
      toast.error('Tournament Type aur ID dono chahiye');
      return;
    }
    setPlayers(demoPlayers);
    setJoiningFee(30);
    setLoaded(true);
    toast.success('Players Loaded!');
  };

  const openRefundDialog = (player: RefundPlayer) => {
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

  const refundAmount = selectedPlayer ? Math.floor((selectedPlayer.joiningFee * refundPercent) / 100) : 0;

  const handleRefundConfirm = () => {
    if (!selectedPlayer) return;
    toast.success(`${selectedPlayer.name} ko ${refundAmount} coins refund!`);
    setDialogOpen(false);
  };

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
            <Input value={tournamentId} onChange={(e) => setTournamentId(e.target.value)} placeholder="Enter tournament ID"
              className="bg-[oklch(0.22,0.04,290)] border-[oklch(0.35,0.06,290)] text-white placeholder:text-[oklch(0.40,0.04,290)] h-10 rounded-xl text-sm text-center" />
          </div>
        </div>

        {/* Load Players Button */}
        <Button onClick={handleLoadPlayers}
          className="w-full h-11 rounded-xl bg-gradient-to-r from-blue-500 to-blue-600 text-white font-bold text-sm shadow-lg shadow-blue-500/20">
          <RefreshCw className="w-4 h-4 mr-2" /> Load Players
        </Button>

        {/* Tournament Info */}
        {loaded && (
          <div className="rounded-xl bg-[oklch(0.18,0.04,290)] border border-[oklch(0.30,0.06,290)] p-3 flex items-center justify-between">
            <div className="flex items-center gap-2">
              <Users className="w-4 h-4 text-green-400" />
              <span className="text-xs text-[oklch(0.60,0.04,290)]">Joining Fee: <span className="font-bold text-green-400">{joiningFee}</span></span>
            </div>
            <span className="text-xs text-[oklch(0.60,0.04,290)]">Players: <span className="font-bold text-white">{players.length}</span></span>
          </div>
        )}

        {/* Player Cards */}
        {loaded && (
          <div className="space-y-2.5">
            <p className="text-xs font-bold text-green-400">Players: {players.length}</p>

            {players.map((player) => (
              <button key={player.id} onClick={() => openRefundDialog(player)}
                className="w-full text-left rounded-xl bg-[oklch(0.18,0.04,290)] border border-[oklch(0.28,0.05,290)] p-4 hover:border-green-500/30 transition-colors active:scale-[0.99]">

                {/* Row 1: Name + Seat */}
                <div className="flex items-center gap-2">
                  <span className="text-sm font-bold text-white truncate flex-1">{player.name}</span>
                  <span className="text-xs font-bold text-white bg-[oklch(0.28,0.06,290)] px-2 py-0.5 rounded shrink-0">
                    Seat: {player.seatNo}
                  </span>
                </div>

                {/* Row 2: UID */}
                <p className="text-[11px] text-[oklch(0.50,0.04,290)] mt-1.5 font-mono">User ID: {player.uid}</p>

                {/* Row 3: Fee + Refund */}
                <div className="flex items-center justify-between mt-2">
                  <span className="text-xs font-bold text-green-400">Fee: {player.joiningFee} coins</span>
                  <span className="text-[11px] text-orange-400">Refund: {player.joiningFee} coins (100%)</span>
                </div>
              </button>
            ))}
          </div>
        )}

        {/* Empty State */}
        {!loaded && (
          <div className="flex flex-col items-center py-16 space-y-3">
            <RotateCcw className="w-10 h-10 text-[oklch(0.25,0.04,290)]" />
            <p className="text-xs text-[oklch(0.40,0.04,290)]">Load players to start refunding</p>
          </div>
        )}
      </div>

      {/* ═══ Refund Slider Dialog ═══ */}
      {dialogOpen && selectedPlayer && (
        <div className="fixed inset-0 z-50 flex items-end lg:items-center justify-center" onClick={() => setDialogOpen(false)}>
          {/* Backdrop */}
          <div className="absolute inset-0 bg-black/60 backdrop-blur-sm" />

          {/* Dialog */}
          <div className="relative w-full max-w-md mx-4 mb-4 lg:mb-0 rounded-2xl bg-[oklch(0.16,0.04,290)] border border-[oklch(0.30,0.06,290)] p-5 space-y-4 shadow-2xl"
            onClick={(e) => e.stopPropagation()}>

            {/* Close Button */}
            <button onClick={() => setDialogOpen(false)}
              className="absolute top-3 right-3 w-8 h-8 rounded-lg bg-[oklch(0.22,0.04,290)] flex items-center justify-center hover:bg-[oklch(0.28,0.06,290)] transition-colors">
              <X className="w-4 h-4 text-[oklch(0.55,0.04,290)]" />
            </button>

            {/* Player Name */}
            <h3 className="text-base font-bold text-blue-400">{selectedPlayer.name}</h3>

            {/* Joining Fee */}
            <p className="text-sm text-[oklch(0.60,0.04,290)]">Joining Fee: <span className="font-bold text-white">{selectedPlayer.joiningFee} coins</span></p>

            {/* Divider */}
            <div className="h-px bg-[oklch(0.28,0.05,290)]" />

            {/* Refund Percentage Label */}
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

            {/* Custom % Input */}
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

            {/* Divider */}
            <div className="h-px bg-[oklch(0.28,0.05,290)]" />

            {/* Refund % Display */}
            <p className="text-base font-bold text-green-400">Refund: {refundPercent}%</p>

            {/* Refund Amount Display */}
            <p className="text-sm text-orange-400 font-medium">Amount: {refundAmount} coins</p>

            {/* Confirm Button */}
            <Button onClick={handleRefundConfirm}
              className="w-full h-11 rounded-xl bg-gradient-to-r from-green-500 to-emerald-600 text-white font-bold text-sm shadow-lg shadow-green-500/20">
              Confirm Refund — {refundAmount} coins
            </Button>
          </div>
        </div>
      )}
    </div>
  );
}
