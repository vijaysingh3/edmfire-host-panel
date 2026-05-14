'use client';

import { useAuth } from '@/context/AuthContext';
import {
  LogOut,
  Shield,
  Edit3,
  ChevronRight,
  Bell,
  Lock,
  HelpCircle,
  Info,
  MapPin,
  UserCircle,
  Gamepad2,
  Smartphone,
} from 'lucide-react';

// rank label mapping
const rankLabels: Record<string, string> = {
  bronze: 'Bronze',
  silver: 'Silver',
  gold: 'Gold',
  platinum: 'Platinum',
  diamond: 'Diamond',
  heroic: 'Heroic',
  grandmaster: 'Grandmaster',
};

// game mode label mapping
const modeLabels: Record<string, string> = {
  br: 'Battle Royale',
  cs: 'Clash Squad',
  lw: 'Lone Wolf',
};

// playing years label mapping
const yearsLabels: Record<string, string> = {
  lt1: 'Less than 1 Year',
  '1-2': '1-2 Years',
  '3-4': '3-4 Years',
  '5+': '5+ Years',
};

export default function ProfilePage() {
  const { logout, hostData } = useAuth();

  if (!hostData) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <p className="text-sm text-[oklch(0.55,0.04,290)]">Loading profile...</p>
      </div>
    );
  }

  const menuItems = [
    { icon: Edit3, label: 'Edit Profile', desc: 'Update your name and details', color: 'text-violet-400 bg-violet-500/15' },
    { icon: Bell, label: 'Notification Settings', desc: 'Manage alert preferences', color: 'text-blue-400 bg-blue-500/15' },
    { icon: Lock, label: 'Change Password', desc: 'Update your login password', color: 'text-orange-400 bg-orange-500/15' },
    { icon: Shield, label: 'Privacy & Security', desc: 'Manage your account security', color: 'text-green-400 bg-green-500/15' },
    { icon: HelpCircle, label: 'Help & Support', desc: 'Get help from EDMFire team', color: 'text-cyan-400 bg-cyan-500/15' },
    { icon: Info, label: 'About', desc: 'App version and info', color: 'text-[oklch(0.60,0.04,290)] bg-[oklch(0.25,0.05,290)]' },
  ];

  return (
    <div className="min-h-screen">
      {/* header */}
      <header className="bg-gradient-to-r from-violet-700 to-indigo-700 px-4 lg:px-6 py-6 sticky top-0 z-20">
        <div className="max-w-4xl mx-auto">
          <h1 className="text-xl lg:text-2xl font-extrabold text-white flex items-center gap-2">
            <UserCircle className="w-6 h-6" />
            Profile
          </h1>
          <p className="text-white/60 text-sm mt-1">
            Manage your account and settings
          </p>
        </div>
      </header>

      <div className="max-w-4xl mx-auto px-4 lg:px-6 py-6 space-y-5">
        {/* profile card with DP */}
        <div className="flex items-center gap-4 p-5 rounded-2xl bg-[oklch(0.18,0.04,290)] border border-[oklch(0.30,0.06,290)]">
          {/* DP — selfie ya default */}
          {hostData.selfieUrl ? (
            <img
              src={hostData.selfieUrl}
              alt="Profile"
              className="w-16 h-16 rounded-2xl object-cover shrink-0 shadow-lg shadow-purple-500/20 border-2 border-violet-500/30"
            />
          ) : (
            <div className="w-16 h-16 rounded-2xl bg-gradient-to-br from-violet-500 to-fuchsia-600 flex items-center justify-center text-white text-2xl shrink-0 shadow-lg shadow-purple-500/20">
              👤
            </div>
          )}
          <div className="flex-1 min-w-0">
            <h2 className="text-lg font-bold text-white truncate">
              {hostData.fullName || 'Host'}
            </h2>
            <p className="text-xs text-[oklch(0.55,0.04,290)] mt-0.5 truncate">
              {hostData.gmail || 'No email'}
            </p>
            <div className="flex items-center gap-3 mt-1.5">
              <div className="flex items-center gap-1.5">
                <Shield className="w-3 h-3 text-green-400" />
                <span className="text-[10px] font-medium text-green-400">
                  Verified Host
                </span>
              </div>
              {hostData.currentRank && (
                <span className="text-[10px] font-medium text-violet-400">
                  {rankLabels[hostData.currentRank] || hostData.currentRank}
                </span>
              )}
            </div>
          </div>
        </div>

        {/* Personal Info section */}
        <div className="rounded-2xl bg-[oklch(0.18,0.04,290)] border border-[oklch(0.30,0.06,290)] p-5 space-y-4">
          <h3 className="text-sm font-bold text-white flex items-center gap-2">
            <UserCircle className="w-4 h-4 text-violet-400" />
            Personal Info
          </h3>
          <div className="grid grid-cols-2 gap-4">
            <InfoItem label="Full Name" value={hostData.fullName} />
            <InfoItem label="Gender" value={hostData.gender} />
            <InfoItem label="Age" value={hostData.age ? String(hostData.age) : ''} />
            <InfoItem label="Mobile" value={hostData.mobile ? String(hostData.mobile) : ''} />
            <InfoItem label="WhatsApp" value={hostData.whatsapp ? String(hostData.whatsapp) : ''} />
            <InfoItem label="Email" value={hostData.gmail} />
          </div>
        </div>

        {/* Location section */}
        <div className="rounded-2xl bg-[oklch(0.18,0.04,290)] border border-[oklch(0.30,0.06,290)] p-5 space-y-4">
          <h3 className="text-sm font-bold text-white flex items-center gap-2">
            <MapPin className="w-4 h-4 text-blue-400" />
            Location
          </h3>
          <div className="grid grid-cols-3 gap-4">
            <InfoItem label="State" value={hostData.state} />
            <InfoItem label="District" value={hostData.district} />
            <InfoItem label="City" value={hostData.city} />
          </div>
        </div>

        {/* Gaming Info section */}
        <div className="rounded-2xl bg-[oklch(0.18,0.04,290)] border border-[oklch(0.30,0.06,290)] p-5 space-y-4">
          <h3 className="text-sm font-bold text-white flex items-center gap-2">
            <Gamepad2 className="w-4 h-4 text-emerald-400" />
            Gaming Info
          </h3>
          <div className="grid grid-cols-2 gap-4">
            <InfoItem label="FF Nickname" value={hostData.ffNickname} />
            <InfoItem
              label="Current Rank"
              value={hostData.currentRank ? (rankLabels[hostData.currentRank] || hostData.currentRank) : ''}
            />
            <InfoItem
              label="Game Mode"
              value={hostData.gameModes ? (modeLabels[hostData.gameModes] || hostData.gameModes) : ''}
            />
            <InfoItem
              label="Experience"
              value={hostData.playingYears ? (yearsLabels[hostData.playingYears] || hostData.playingYears) : ''}
            />
          </div>
        </div>

        {/* menu items */}
        <div className="space-y-2">
          {menuItems.map((item) => (
            <div
              key={item.label}
              className="flex items-center gap-4 p-4 rounded-xl bg-[oklch(0.18,0.04,290)] border border-[oklch(0.30,0.06,290)] hover:border-[oklch(0.40,0.06,290)] transition-colors cursor-pointer active:scale-[0.99]"
            >
              <div className={`w-10 h-10 rounded-xl ${item.color} flex items-center justify-center shrink-0`}>
                <item.icon className="w-5 h-5" />
              </div>
              <div className="flex-1 min-w-0">
                <p className="text-sm font-medium text-white">{item.label}</p>
                <p className="text-[10px] text-[oklch(0.45,0.04,290)] mt-0.5">
                  {item.desc}
                </p>
              </div>
              <ChevronRight className="w-4 h-4 text-[oklch(0.35,0.04,290)] shrink-0" />
            </div>
          ))}
        </div>

        {/* logout button */}
        <button
          onClick={logout}
          className="w-full flex items-center justify-center gap-3 p-4 rounded-xl bg-red-500/10 border border-red-500/20 text-red-400 hover:bg-red-500/20 active:scale-[0.99] transition-all"
        >
          <LogOut className="w-5 h-5" />
          <span className="text-sm font-semibold">Logout</span>
        </button>

        {/* version info */}
        <div className="text-center py-4">
          <p className="text-[10px] text-[oklch(0.35,0.04,290)]">
            EDMFire Host Panel v2.0 — Firebase Auth
          </p>
        </div>
      </div>
    </div>
  );
}

// reusable info item component
function InfoItem({ label, value }: { label: string; value?: string | number | null }) {
  return (
    <div className="space-y-1">
      <p className="text-[10px] text-[oklch(0.45,0.04,290)]">{label}</p>
      <p className="text-sm text-white font-medium truncate">
        {value || '-'}
      </p>
    </div>
  );
}
