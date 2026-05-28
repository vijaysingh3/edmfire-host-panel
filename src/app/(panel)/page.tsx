'use client';

import { useMemo } from 'react';
import Link from 'next/link';
import Image from 'next/image';
import { useAuth } from '@/context/AuthContext';

// Indian time (IST) ke anusar greeting return karta hai
function getIndianGreeting(name?: string): string {
  const now = new Date();
  // IST offset: UTC + 5:30 = 330 minutes
  const istTime = new Date(now.toLocaleString('en-US', { timeZone: 'Asia/Kolkata' }));
  const hour = istTime.getHours();

  const firstName = name ? name.split(' ')[0] : 'Host';
  const suffix = hour < 12 ? 'Good Morning' : hour < 17 ? 'Good Afternoon' : hour < 21 ? 'Good Evening' : 'Good Night';
  return `${suffix}, ${firstName}!`;
}

const steps = [
  {
    title: 'Upload Thumbnail',
    color: 'from-violet-500 to-purple-700',
    icon: '🖼️',
    href: '/thumbnail',
  },
  {
    title: 'Create Tournament',
    color: 'from-orange-400 to-orange-600',
    icon: '🏆',
    href: '/create-tournament',
  },
  {
    title: 'Notify Players',
    color: 'from-red-400 to-red-600',
    icon: '🔔',
    href: '/send-notification',
  },
  {
    title: 'Update Result',
    color: 'from-fuchsia-500 to-violet-700',
    icon: '🎯',
    href: '/results',
  },
  {
    title: 'Prize Distribution',
    color: 'from-yellow-400 to-amber-600',
    icon: '🎁',
    href: '/prize',
  },
  {
    title: 'Refund Coins',
    color: 'from-cyan-500 to-teal-700',
    icon: '💰',
    href: '/refund-coins',
  },
  {
    title: 'Other Settings',
    color: 'from-slate-400 to-slate-600',
    icon: '⚡',
    href: '/settings',
  },
];

export default function Dashboard() {
  const { hostData } = useAuth();

  // Indian time ke anusar greeting — memoize taaki har render pe na call ho
  const greeting = useMemo(() => getIndianGreeting(hostData?.fullName), [hostData?.fullName]);

  return (
    <div className="min-h-screen">
      {/* custom header for dashboard */}
      <header className="bg-gradient-to-r from-violet-700 to-indigo-700 px-4 lg:px-6 py-5 sticky top-0 z-20">
        <div className="max-w-4xl mx-auto flex items-center justify-between">
          <div>
            <div className="flex items-center gap-2">
              <Image src="/logo.png" alt="EDMFIRE" width={34} height={34} className="rounded-lg" />
              <h1 className="text-2xl font-extrabold text-white tracking-wide">
                EDMFIRE
              </h1>
            </div>
            <p className="text-sm text-white/70 mt-0.5">Host Panel Dashboard</p>
          </div>
          <Link href="/profile" className="text-center cursor-pointer hover:scale-105 active:scale-95 transition-transform">
            {/* host profile image ya default avatar */}
            {hostData?.selfieUrl ? (
              <img
                src={hostData.selfieUrl}
                alt={hostData.fullName || 'Host'}
                className="w-11 h-11 rounded-full object-cover backdrop-blur-sm border-2 border-white/30 shadow-lg"
              />
            ) : (
              <div className="w-11 h-11 rounded-full bg-white/20 flex items-center justify-center text-xl backdrop-blur-sm border-2 border-white/30">
                👤
              </div>
            )}
            <p className="text-xs mt-1 font-semibold text-white/90 truncate max-w-[80px]">
              {hostData?.fullName?.split(' ')[0] || 'Host'}
            </p>
          </Link>
        </div>
      </header>

      <div className="max-w-4xl mx-auto px-4 lg:px-6 py-6 space-y-6">
        {/* time-based greeting section */}
        <div>
          <h2 className="text-2xl lg:text-3xl font-bold text-white">
            {greeting}
          </h2>
          <p className="text-[oklch(0.55,0.04,290)] mt-1">
            Follow the steps below to manage your tournaments
          </p>
        </div>

        {/* tutorial button */}
        <a
          href="https://host.edmfire.in/tutorial"
          target="_blank"
          rel="noopener noreferrer"
          className="flex items-center gap-3 bg-gradient-to-r from-indigo-600 to-violet-600 hover:from-indigo-500 hover:to-violet-500 rounded-xl px-5 py-3.5 text-white shadow-lg hover:scale-[1.02] active:scale-[0.98] transition-all duration-200 cursor-pointer w-fit"
        >
          <span className="text-2xl">📖</span>
          <div>
            <p className="font-bold text-sm lg:text-base">Host Tutorial Guide</p>
            <p className="text-[11px] text-white/70">Sabhi steps ka Hindi guide — Click karke padhein</p>
          </div>
          <svg xmlns="http://www.w3.org/2000/svg" className="w-5 h-5 ml-1 text-white/60" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
            <path strokeLinecap="round" strokeLinejoin="round" d="M10 6H6a2 2 0 00-2 2v10a2 2 0 002 2h10a2 2 0 002-2v-4M14 4h6m0 0v6m0-6L10 14" />
          </svg>
        </a>

        {/* step-by-step grid */}
        <div className="grid grid-cols-2 md:grid-cols-3 gap-3 lg:gap-4">
          {steps.map((step, index) => (
            <Link key={index} href={step.href}>
              <div
                className={`bg-gradient-to-br ${step.color} rounded-2xl p-4 lg:p-5 text-white shadow-lg min-h-[130px] lg:min-h-[140px] flex flex-col justify-between hover:scale-[1.03] active:scale-[0.98] transition-all duration-200 cursor-pointer`}
              >
                <div className="text-3xl lg:text-4xl">{step.icon}</div>
                <div>
                  <p className="text-[10px] lg:text-xs opacity-75 font-medium">
                    Step {index + 1}
                  </p>
                  <h3 className="font-bold text-sm lg:text-base leading-tight mt-0.5">
                    {step.title}
                  </h3>
                </div>
              </div>
            </Link>
          ))}
        </div>

        {/* completion box */}
        <div className="bg-gradient-to-r from-green-500 to-emerald-600 rounded-2xl p-5 text-white shadow-lg text-center">
          <p className="text-sm font-medium opacity-90">Final Process</p>
          <h2 className="text-2xl font-extrabold mt-1">
            ✅ COMPLETED
          </h2>
        </div>
      </div>
    </div>
  );
}
