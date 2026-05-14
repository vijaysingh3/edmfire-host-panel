'use client';

import Link from 'next/link';
import Image from 'next/image';

interface NavbarProps {
  title: string;
  subtitle?: string;
}

export default function Navbar({ title, subtitle }: NavbarProps) {
  return (
    <header className="sticky top-0 z-20 bg-[oklch(0.12,0.02,290)]/90 backdrop-blur-md border-b border-[oklch(0.30,0.06,290)]">
      <div className="flex items-center gap-3 px-4 lg:px-6 py-4">
        {/* mobile logo */}
        <Link href="/" className="lg:hidden flex items-center gap-2">
          <Image src="/logo.png" alt="EDMFIRE" width={32} height={32} className="rounded-lg" />
        </Link>

        {/* title */}
        <div className="flex-1 min-w-0">
          <h1 className="text-lg font-bold text-[oklch(0.95,0.02,290)] truncate">
            {title}
          </h1>
          {subtitle && (
            <p className="text-xs text-[oklch(0.55,0.04,290)] truncate">
              {subtitle}
            </p>
          )}
        </div>

        {/* desktop subtitle badge */}
        <div className="hidden lg:block">
          <span className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-full text-xs font-medium bg-purple-500/10 text-purple-400 border border-purple-500/20">
            <span className="w-1.5 h-1.5 rounded-full bg-green-400 animate-pulse" />
            Host Panel
          </span>
        </div>
      </div>
    </header>
  );
}
