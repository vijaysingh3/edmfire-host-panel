'use client';

import { useState } from 'react';
import { toast } from 'sonner';
import { Bell, Search, Trophy, Gift, ShieldAlert, Settings, Coins } from 'lucide-react';

const demoNotifications = [
  {
    id: 1,
    title: 'Tournament Created Successfully',
    message: 'Your tournament "Solo Booyah Clash" (BR-2847) has been created and is now live for players to join.',
    type: 'Tournament',
    time: '2 min ago',
    read: false,
    icon: Trophy,
  },
  {
    id: 2,
    title: 'Prize Distributed',
    message: 'Prize for tournament "Squad Showdown" (CS-1923) has been distributed to 12 winners. Total: ₹1,200.',
    type: 'Prize',
    time: '15 min ago',
    read: false,
    icon: Gift,
  },
  {
    id: 3,
    title: 'New Host Application Received',
    message: 'A new host application from "Rahul Kumar" (rahul@gmail.com) is pending review. Check apply panel.',
    type: 'System',
    read: false,
    icon: ShieldAlert,
  },
  {
    id: 4,
    title: 'Refund Processed',
    message: 'Refund of 80% has been processed for 5 players in tournament "Lone Wolf #42" (LW-4210).',
    type: 'Prize',
    time: '1 hour ago',
    read: true,
    icon: Coins,
  },
  {
    id: 5,
    title: 'System Maintenance Notice',
    message: 'EDMFire panel will undergo scheduled maintenance on 20 May 2026 from 2:00 AM to 4:00 AM IST.',
    type: 'System',
    time: '3 hours ago',
    read: true,
    icon: Settings,
  },
];

export default function NotificationPage() {
  const [activeTab, setActiveTab] = useState('All');

  const filtered = activeTab === 'All'
    ? demoNotifications
    : activeTab === 'Unread'
    ? demoNotifications.filter((n) => !n.read)
    : demoNotifications.filter((n) => n.type === activeTab);

  return (
    <div className="min-h-screen pb-20 lg:pb-6">
      {/* header */}
      <header className="bg-gradient-to-r from-red-400 to-red-600 px-4 lg:px-6 py-6 sticky top-0 z-20">
        <div className="max-w-4xl mx-auto">
          <h1 className="text-xl lg:text-2xl font-extrabold text-white flex items-center gap-2">
            <Bell className="w-6 h-6" />
            Alerts
          </h1>
          <p className="text-white/60 text-sm mt-1">
            View notifications and updates
          </p>
        </div>
      </header>

      <div className="max-w-4xl mx-auto px-4 lg:px-6 py-6 space-y-4">
        {/* search bar */}
        <div className="relative">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-[oklch(0.45,0.04,290)]" />
          <div className="w-full h-11 rounded-xl bg-[oklch(0.18,0.04,290)] border border-[oklch(0.30,0.06,290)] flex items-center pl-10 pr-4 text-sm text-[oklch(0.40,0.04,290)]">
            Search alerts...
          </div>
        </div>

        {/* filter tabs */}
        <div className="rounded-2xl bg-[oklch(0.18,0.04,290)] border border-[oklch(0.30,0.06,290)] p-3">
          <div className="flex gap-2 overflow-x-auto scrollbar-none">
            {['All', 'Unread', 'Tournament', 'Prize', 'System'].map((tab) => (
              <button
                key={tab}
                onClick={() => setActiveTab(tab)}
                className={`px-3.5 py-2 rounded-full text-xs font-medium whitespace-nowrap shrink-0 transition-all ${
                  activeTab === tab
                    ? 'bg-red-500/20 text-red-400 border border-red-500/30'
                    : 'bg-[oklch(0.22,0.04,290)] border border-[oklch(0.28,0.05,290)] text-[oklch(0.55,0.04,290)] hover:border-[oklch(0.40,0.06,290)]'
                }`}
              >
                {tab}
              </button>
            ))}
          </div>
        </div>

        {/* notification list */}
        {filtered.length > 0 ? (
          <div className="space-y-2">
            {filtered.map((n) => {
              const Icon = n.icon;
              return (
                <div
                  key={n.id}
                  className={`rounded-xl p-4 border transition-all ${
                    n.read
                      ? 'bg-[oklch(0.16,0.04,290)] border-[oklch(0.25,0.05,290)]'
                      : 'bg-[oklch(0.20,0.04,290)] border-red-500/20'
                  }`}
                >
                  <div className="flex items-start gap-3">
                    <div className={`w-10 h-10 rounded-xl flex items-center justify-center shrink-0 ${
                      n.read ? 'bg-[oklch(0.22,0.04,290)]' : 'bg-red-500/10'
                    }`}>
                      <Icon className={`w-5 h-5 ${n.read ? 'text-[oklch(0.45,0.04,290)]' : 'text-red-400'}`} />
                    </div>
                    <div className="flex-1 min-w-0">
                      <div className="flex items-center justify-between gap-2">
                        <h3 className={`text-sm font-semibold truncate ${n.read ? 'text-[oklch(0.70,0.04,290)]' : 'text-white'}`}>
                          {n.read ? '' : '● '}{n.title}
                        </h3>
                        <span className="text-[10px] text-[oklch(0.40,0.04,290)] whitespace-nowrap">{n.time}</span>
                      </div>
                      <p className="text-xs text-[oklch(0.50,0.04,290)] mt-1 leading-relaxed">
                        {n.message}
                      </p>
                      <span className="inline-block mt-2 px-2 py-0.5 rounded-full text-[10px] font-medium bg-[oklch(0.22,0.04,290)] text-[oklch(0.55,0.04,290)] border border-[oklch(0.28,0.05,290)]">
                        {n.type}
                      </span>
                    </div>
                  </div>
                </div>
              );
            })}
          </div>
        ) : (
          <div className="flex flex-col items-center justify-center py-20 space-y-4">
            <div className="w-20 h-20 rounded-2xl bg-red-500/10 border border-red-500/20 flex items-center justify-center">
              <Bell className="w-10 h-10 text-red-400/60" />
            </div>
            <div className="text-center space-y-1">
              <h3 className="text-base font-semibold text-white">
                No Alerts Yet
              </h3>
              <p className="text-xs text-[oklch(0.45,0.04,290)] max-w-[240px]">
                Notifications and updates will appear here
              </p>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}
