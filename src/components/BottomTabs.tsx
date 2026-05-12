'use client';

import Link from 'next/link';
import { usePathname } from 'next/navigation';
import { useAuth } from '@/context/AuthContext';
import { LayoutDashboard, Trophy, Bell, Wallet, UserCircle } from 'lucide-react';

const tabs = [
  { href: '/', label: 'Home', icon: LayoutDashboard },
  { href: '/tournaments', label: 'Tourneys', icon: Trophy },
  { href: '/notification', label: 'Alerts', icon: Bell },
  { href: '/wallet', label: 'Wallet', icon: Wallet },
  { href: '/profile', label: 'Profile', icon: UserCircle },
];

export default function BottomTabs() {
  const pathname = usePathname();

  return (
    <nav className="lg:hidden fixed bottom-0 left-0 right-0 z-40 bg-[oklch(0.14,0.03,290)]/95 backdrop-blur-md border-t border-[oklch(0.30,0.06,290)] pb-safe">
      <div className="flex items-center justify-around px-1 py-2">
        {tabs.map((tab) => {
          const isActive = pathname === tab.href;
          return (
            <Link
              key={tab.href}
              href={tab.href}
              className={`flex flex-col items-center gap-1 px-2 py-2 rounded-xl min-w-[56px] transition-all duration-200 ${
                isActive
                  ? 'text-purple-400'
                  : 'text-[oklch(0.55,0.04,290)] active:scale-95'
              }`}
            >
              <div
                className={`p-1.5 rounded-lg transition-all duration-200 ${
                  isActive
                    ? 'bg-purple-500/20 shadow-lg shadow-purple-500/10'
                    : ''
                }`}
              >
                <tab.icon className="w-5 h-5" />
              </div>
              <span className="text-[10px] font-medium">{tab.label}</span>
            </Link>
          );
        })}
      </div>
    </nav>
  );
}
