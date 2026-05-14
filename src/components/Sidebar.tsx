'use client';

import Link from 'next/link';
import { usePathname } from 'next/navigation';
import { useAuth } from '@/context/AuthContext';
import { useSidebar } from '@/app/(panel)/layout';
import {
  LayoutDashboard,
  Trophy,
  Bell,
  Wallet,
  UserCircle,
  LogOut,
  PanelLeftClose,
  PanelLeftOpen,
} from 'lucide-react';
import Image from 'next/image';

const navItems = [
  { href: '/', label: 'Dashboard', icon: LayoutDashboard },
  { href: '/tournaments', label: 'Tournaments', icon: Trophy },
  { href: '/notification', label: 'Notifications', icon: Bell },
  { href: '/wallet', label: 'Wallet', icon: Wallet },
  { href: '/profile', label: 'Profile', icon: UserCircle },
];

export default function Sidebar() {
  const pathname = usePathname();
  const { logout } = useAuth();
  const { collapsed, setCollapsed } = useSidebar();

  return (
    <aside
      className={`hidden lg:flex lg:flex-col lg:fixed lg:inset-y-0 lg:left-0 bg-[oklch(0.14,0.03,290)] border-r border-[oklch(0.30,0.06,290)] z-30 transition-all duration-300 ${
        collapsed ? 'lg:w-[72px]' : 'lg:w-64'
      }`}
    >
      {/* logo area */}
      <div className={`flex items-center ${collapsed ? 'justify-center' : 'gap-3'} px-4 py-5 border-b border-[oklch(0.30,0.06,290)]`}>
        <Image src="/logo.png" alt="EDMFIRE" width={36} height={36} className="rounded-lg shrink-0" />
        {!collapsed && (
          <span className="text-lg font-bold bg-gradient-to-r from-purple-400 to-fuchsia-400 bg-clip-text text-transparent whitespace-nowrap">
            EDMFire
          </span>
        )}
      </div>
      <nav className="flex-1 px-3 py-4 space-y-1">
        {navItems.map((item) => {
          const isActive = pathname === item.href;
          return (
            <Link
              key={item.href}
              href={item.href}
              title={collapsed ? item.label : undefined}
              className={`flex items-center ${collapsed ? 'justify-center' : 'gap-3'} px-3 py-3 rounded-xl text-sm font-medium transition-all duration-200 ${
                isActive
                  ? 'bg-gradient-to-r from-purple-600/30 to-fuchsia-600/20 text-purple-300 shadow-lg shadow-purple-500/10 border border-purple-500/20'
                  : 'text-[oklch(0.65,0.04,290)] hover:bg-[oklch(0.25,0.06,290)] hover:text-[oklch(0.90,0.02,290)]'
              }`}
            >
              <item.icon className={`w-5 h-5 shrink-0 ${isActive ? 'text-purple-400' : ''}`} />
              {!collapsed && <span className="whitespace-nowrap">{item.label}</span>}
            </Link>
          );
        })}
      </nav>

      {/* bottom section: toggle + logout */}
      <div className="px-3 py-4 border-t border-[oklch(0.30,0.06,290)] space-y-2">
        {/* toggle button */}
        <button
          onClick={() => setCollapsed(!collapsed)}
          title={collapsed ? 'Expand Sidebar' : 'Collapse Sidebar'}
          className={`flex items-center ${collapsed ? 'justify-center' : 'gap-3'} w-full px-3 py-3 rounded-xl text-sm font-medium text-[oklch(0.55,0.04,290)] hover:bg-[oklch(0.25,0.06,290)] hover:text-[oklch(0.90,0.02,290)] transition-all duration-200`}
        >
          {collapsed ? (
            <PanelLeftOpen className="w-5 h-5 shrink-0" />
          ) : (
            <>
              <PanelLeftClose className="w-5 h-5 shrink-0" />
              <span className="whitespace-nowrap">Collapse</span>
            </>
          )}
        </button>

        {/* logout button */}
        <button
          onClick={logout}
          title={collapsed ? 'Logout' : undefined}
          className={`flex items-center ${collapsed ? 'justify-center' : 'gap-3'} w-full px-3 py-3 rounded-xl text-sm font-medium text-red-400/70 hover:bg-red-500/10 hover:text-red-400 transition-all duration-200`}
        >
          <LogOut className="w-5 h-5 shrink-0" />
          {!collapsed && <span className="whitespace-nowrap">Logout</span>}
        </button>

        {/* version text */}
        {!collapsed && (
          <p className="text-[10px] text-[oklch(0.40,0.04,290)] px-3 pt-1">
            Host Panel v1.0
          </p>
        )}
      </div>
    </aside>
  );
}
