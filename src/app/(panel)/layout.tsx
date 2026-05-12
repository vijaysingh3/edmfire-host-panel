'use client';

import { useAuth } from '@/context/AuthContext';
import { useRouter } from 'next/navigation';
import { useEffect, createContext, useContext, useState, ReactNode } from 'react';
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
  const { isAuthenticated } = useAuth();
  const router = useRouter();
  const [collapsed, setCollapsed] = useState(false);

  useEffect(() => {
    if (!isAuthenticated) {
      router.push('/login');
    }
  }, [isAuthenticated, router]);

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
