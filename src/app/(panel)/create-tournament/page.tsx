'use client';

import { useState } from 'react';
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
import {
  Trophy,
  RefreshCw,
  Save,
  ArrowRight,
} from 'lucide-react';

export default function CreateTournamentPage() {
  const [mode, setMode] = useState<'create' | 'update'>('create');
  const [loading, setLoading] = useState(false);

  const [tournamentType, setTournamentType] = useState('');
  const [gameMode, setGameMode] = useState('');
  const [title, setTitle] = useState('');
  const [description, setDescription] = useState('');
  const [bannerUrl, setBannerUrl] = useState('');
  const [dateTime, setDateTime] = useState('');
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
  const [status, setStatus] = useState('upcoming');

  const handleSubmit = () => {
    if (!tournamentType || !title) {
      toast.error('Tournament Type aur Title zaruri hain');
      return;
    }
    setLoading(true);
    setTimeout(() => {
      setLoading(false);
      toast.success(mode === 'create' ? 'Tournament Created!' : 'Tournament Updated!');
    }, 1200);
  };

  const handleLoad = () => {
    if (!tournamentType) {
      toast.error('Pehle Tournament Type select karo');
      return;
    }
    toast.success('Tournament Data Loaded!');
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
        </div>
      </header>

      <div className="max-w-4xl mx-auto px-4 lg:px-6 py-6 space-y-5">

        {/* Mode Toggle */}
        <div className="flex items-center gap-4">
          <Label className="text-sm font-bold text-[oklch(0.85,0.04,290)] whitespace-nowrap">Mode:</Label>
          <div className="flex-1 flex rounded-xl bg-[oklch(0.18,0.04,290)] border border-[oklch(0.30,0.06,290)] p-1">
            <button onClick={() => { setMode('create'); setStatus('upcoming'); }}
              className={`flex-1 py-2.5 rounded-lg text-sm font-semibold transition-all ${mode === 'create' ? 'bg-gradient-to-r from-orange-500 to-orange-600 text-white shadow-lg shadow-orange-500/20' : 'text-[oklch(0.55,0.04,290)]'}`}>
              Create Mode
            </button>
            <button onClick={() => { setMode('update'); setStatus(''); }}
              className={`flex-1 py-2.5 rounded-lg text-sm font-semibold transition-all ${mode === 'update' ? 'bg-gradient-to-r from-blue-500 to-indigo-600 text-white shadow-lg shadow-blue-500/20' : 'text-[oklch(0.55,0.04,290)]'}`}>
              Update Mode
            </button>
          </div>
        </div>

        {/* Update Mode Section */}
        {mode === 'update' && (
          <div className="rounded-2xl bg-[oklch(0.18,0.04,290)] border border-blue-500/20 p-4 space-y-4">
            <p className="text-sm font-bold text-blue-400">Select Tournament to Update:</p>
            <div className="space-y-2">
              <Label className="text-xs text-[oklch(0.65,0.04,290)]">Tournament Type</Label>
              <Select value={tournamentType} onValueChange={setTournamentType}>
                <SelectTrigger className="bg-[oklch(0.22,0.04,290)] border-[oklch(0.35,0.06,290)] text-white h-12 rounded-xl">
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
            <div className="space-y-2">
              <Label className="text-xs text-[oklch(0.65,0.04,290)]">Tournament ID</Label>
              <Select>
                <SelectTrigger className="bg-[oklch(0.22,0.04,290)] border-[oklch(0.35,0.06,290)] text-white h-12 rounded-xl">
                  <SelectValue placeholder="Select Tournament ID" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="EDM_279">EDM_279</SelectItem>
                  <SelectItem value="EDM_280">EDM_280</SelectItem>
                  <SelectItem value="EDM_281">EDM_281</SelectItem>
                </SelectContent>
              </Select>
            </div>
            <div className="space-y-2">
              <div className="flex items-center gap-2">
                <Label className="text-xs text-[oklch(0.65,0.04,290)]">Or Enter Manually</Label>
                <span className="text-[10px] text-[oklch(0.40,0.04,290)] bg-[oklch(0.25,0.04,290)] px-2 py-0.5 rounded-full">Optional</span>
              </div>
              <Input placeholder="Enter Tournament ID" className="bg-[oklch(0.22,0.04,290)] border-[oklch(0.35,0.06,290)] text-white placeholder:text-[oklch(0.40,0.04,290)] h-12 rounded-xl" />
            </div>
            <Button onClick={handleLoad}
              className="w-full h-12 rounded-xl bg-gradient-to-r from-blue-500 to-indigo-600 text-white font-semibold shadow-lg shadow-blue-500/20">
              <RefreshCw className="w-4 h-4 mr-2" /> Load Tournament Data
            </Button>
          </div>
        )}

        {/* Common Form */}
        <div className="rounded-2xl bg-[oklch(0.18,0.04,290)] border border-[oklch(0.30,0.06,290)] p-4 lg:p-5 space-y-4">

          {/* Tournament Type (Create only) */}
          {mode === 'create' && (
            <div className="space-y-2">
              <Label className="text-xs text-[oklch(0.70,0.04,290)] font-semibold">Tournament Type <span className="text-red-400">*</span></Label>
              <Select value={tournamentType} onValueChange={setTournamentType}>
                <SelectTrigger className="bg-[oklch(0.22,0.04,290)] border-[oklch(0.35,0.06,290)] text-white h-12 rounded-xl">
                  <SelectValue placeholder="Select Tournament Type" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="battle_royale">BattleRoyal</SelectItem>
                  <SelectItem value="clash_squad">ClashSquad</SelectItem>
                  <SelectItem value="lone_wolf">LoneWolf</SelectItem>
                  <SelectItem value="free_tournaments">FreeTournaments</SelectItem>
                </SelectContent>
              </Select>
            </div>
          )}

          {/* Game Mode (Create only) */}
          {mode === 'create' && (
            <div className="space-y-2">
              <Label className="text-xs text-[oklch(0.70,0.04,290)] font-semibold">Game Mode <span className="text-red-400">*</span></Label>
              <Select value={gameMode} onValueChange={setGameMode}>
                <SelectTrigger className="bg-[oklch(0.22,0.04,290)] border-[oklch(0.35,0.06,290)] text-white h-12 rounded-xl">
                  <SelectValue placeholder="Select Game Mode" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="battle_royale">BattleRoyal</SelectItem>
                  <SelectItem value="clash_squad">ClashSquad</SelectItem>
                  <SelectItem value="lone_wolf">LoneWolf</SelectItem>
                </SelectContent>
              </Select>
            </div>
          )}

          {/* Tournament ID (auto, Create only) */}
          {mode === 'create' && (
            <div className="space-y-2">
              <Label className="text-xs text-[oklch(0.70,0.04,290)] font-semibold">Tournament ID</Label>
              <div className="flex items-center bg-[oklch(0.20,0.04,290)] border border-[oklch(0.30,0.06,290)] rounded-xl px-4 h-12">
                <span className="text-sm text-[oklch(0.50,0.04,290)]">EDM_282</span>
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

          {/* Date & Time */}
          <div className="space-y-2">
            <Label className="text-xs text-[oklch(0.70,0.04,290)] font-semibold">Date &amp; Time</Label>
            <Input type="datetime-local" value={dateTime} onChange={(e) => setDateTime(e.target.value)}
              className="bg-[oklch(0.22,0.04,290)] border-[oklch(0.35,0.06,290)] text-white h-12 rounded-xl" />
          </div>

          {/* Map */}
          <div className="space-y-2">
            <Label className="text-xs text-[oklch(0.70,0.04,290)] font-semibold">Map</Label>
            <Select value={map} onValueChange={setMap}>
              <SelectTrigger className="bg-[oklch(0.22,0.04,290)] border-[oklch(0.35,0.06,290)] text-white h-12 rounded-xl">
                <SelectValue placeholder="Select Map" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="bermuda">Bermuda</SelectItem>
                <SelectItem value="purgatory">Purgatory</SelectItem>
                <SelectItem value="kalahari">Kalahari</SelectItem>
                <SelectItem value="alpine">Alpine</SelectItem>
                <SelectItem value="nexterra">Nexterra</SelectItem>
              </SelectContent>
            </Select>
          </div>

          {/* Type: Solo/Duo/Squad */}
          <div className="space-y-2">
            <Label className="text-xs text-[oklch(0.70,0.04,290)] font-semibold">Type (Solo / Duo / Squad)</Label>
            <Select value={type} onValueChange={setType}>
              <SelectTrigger className="bg-[oklch(0.22,0.04,290)] border-[oklch(0.35,0.06,290)] text-white h-12 rounded-xl">
                <SelectValue placeholder="Select Type" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="solo">Solo</SelectItem>
                <SelectItem value="duo">Duo</SelectItem>
                <SelectItem value="squad">Squad</SelectItem>
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
              <Label className="text-xs text-[oklch(0.70,0.04,290)] font-semibold">Joining Fee <span className="text-red-400">*</span></Label>
              <Input type="number" value={joiningFee} onChange={(e) => setJoiningFee(e.target.value)} placeholder="e.g. 30"
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
              <Label className="text-xs text-[oklch(0.70,0.04,290)] font-semibold">Per Kill Reward</Label>
              <Input type="number" value={perKill} onChange={(e) => setPerKill(e.target.value)} placeholder="e.g. 5"
                className="bg-[oklch(0.22,0.04,290)] border-[oklch(0.35,0.06,290)] text-white placeholder:text-[oklch(0.40,0.04,290)] h-12 rounded-xl" />
            </div>
          </div>

          {/* Price Pool */}
          <div className="space-y-2">
            <Label className="text-xs text-[oklch(0.70,0.04,290)] font-semibold">Price Pool</Label>
            <Input type="number" value={pricePool} onChange={(e) => setPricePool(e.target.value)} placeholder="Enter total price pool"
              className="bg-[oklch(0.22,0.04,290)] border-[oklch(0.35,0.06,290)] text-white placeholder:text-[oklch(0.40,0.04,290)] h-12 rounded-xl" />
          </div>

          {/* Room ID + Room Password */}
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

          {/* Video URL */}
          <div className="space-y-2">
            <Label className="text-xs text-[oklch(0.70,0.04,290)] font-semibold">Video URL <span className="text-[oklch(0.40,0.04,290)] font-normal">(Optional)</span></Label>
            <Input value={videoUrl} onChange={(e) => setVideoUrl(e.target.value)} placeholder="Enter Video URL"
              className="bg-[oklch(0.22,0.04,290)] border-[oklch(0.35,0.06,290)] text-white placeholder:text-[oklch(0.40,0.04,290)] h-12 rounded-xl" />
          </div>

          {/* Status — Create = only Upcoming, Update = all */}
          <div className="space-y-2">
            <Label className="text-xs text-[oklch(0.70,0.04,290)] font-semibold">Status</Label>
            {mode === 'create' ? (
              <div className="flex items-center bg-[oklch(0.22,0.04,290)] border border-[oklch(0.35,0.06,290)] rounded-xl px-4 h-12">
                <span className="w-2 h-2 rounded-full bg-green-400 mr-2" />
                <span className="text-sm font-semibold text-green-400">Upcoming</span>
                <span className="text-[10px] text-[oklch(0.40,0.04,290)] ml-auto">Default for new tournament</span>
              </div>
            ) : (
              <Select value={status} onValueChange={setStatus}>
                <SelectTrigger className="bg-[oklch(0.22,0.04,290)] border-[oklch(0.35,0.06,290)] text-white h-12 rounded-xl">
                  <SelectValue placeholder="Select Status" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="upcoming">Upcoming</SelectItem>
                  <SelectItem value="ongoing">Ongoing</SelectItem>
                  <SelectItem value="completed">Completed</SelectItem>
                </SelectContent>
              </Select>
            )}
          </div>
        </div>

        {/* Submit */}
        <Button onClick={handleSubmit} disabled={loading}
          className={`w-full h-12 rounded-xl text-white font-semibold text-base shadow-lg ${mode === 'create' ? 'bg-gradient-to-r from-orange-500 to-orange-600 shadow-orange-500/20' : 'bg-gradient-to-r from-blue-500 to-indigo-600 shadow-blue-500/20'}`}>
          {loading ? <div className="w-5 h-5 border-2 border-white/30 border-t-white rounded-full animate-spin" /> :
            mode === 'create' ? <><Save className="w-5 h-5 mr-2" /> Create Tournament</> : <><ArrowRight className="w-5 h-5 mr-2" /> Update Tournament</>}
        </Button>
      </div>
    </div>
  );
}
