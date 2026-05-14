'use client';

import { useAuth } from '@/context/AuthContext';
import { useRouter } from 'next/navigation';
import { useEffect, createContext, useContext, useState, ReactNode } from 'react';
import { Loader2 } from 'lucide-react';
import Sidebar from '@/components/Sidebar';
import BottomTabs from '@/components/BottomTabs';

// sidebar collapse state shared with layout
interface SidebarContextType {
  collapsed: boolean;
  setCollapsed: (v: boolean) => void;
}

export const SidebarContext = createContext<SidebarContextType>({
  collapsed: false,
  setCollapsed: () => {},
});

export function useSidebar() {
  return useContext(SidebarContext);
}

export default function PanelLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  const { isAuthenticated, isLoading } = useAuth();
  const router = useRouter();
  const [collapsed, setCollapsed] = useState(false);

  useEffect(() => {
    if (!isLoading && !isAuthenticated) {
      router.push('/login');
    }
  }, [isAuthenticated, isLoading, router]);

  // Firebase Auth state check ho raha hai — loading screen
  if (isLoading) {
    return (
      <div className="min-h-screen bg-[oklch(0.12,0.02,290)] flex items-center justify-center">
        <div className="text-center space-y-4">
          <Loader2 className="w-8 h-8 text-violet-400 animate-spin mx-auto" />
          <p className="text-sm text-[oklch(0.55,0.04,290)]">Verifying your account...</p>
        </div>
      </div>
    );
  }

  if (!isAuthenticated) {
    return null;
  }

  return (
    <SidebarContext.Provider value={{ collapsed, setCollapsed }}>
      <Sidebar />
      <div
        className={`min-h-screen flex flex-col transition-all duration-300 ${
          collapsed ? 'lg:pl-[72px]' : 'lg:pl-64'
        }`}
      >
        <main className="flex-1 pb-20 lg:pb-6">
          {children}
        </main>
      </div>
      <BottomTabs />
    </SidebarContext.Provider>
  );
}
