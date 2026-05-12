'use client';

import { useState } from 'react';
import { toast } from 'sonner';
import { Bell, Search } from 'lucide-react';

export default function NotificationPage() {
  const [activeTab, setActiveTab] = useState('All');

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

        {/* empty state */}
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
      </div>
    </div>
  );
}
