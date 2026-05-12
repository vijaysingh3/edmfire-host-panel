'use client';

import Link from 'next/link';
import { LucideIcon } from 'lucide-react';

interface ActionCardProps {
  title: string;
  description: string;
  icon: LucideIcon;
  href: string;
  gradient?: string;
}

export default function ActionCard({
  title,
  description,
  icon: Icon,
  href,
  gradient = 'from-purple-600/20 to-fuchsia-600/10',
}: ActionCardProps) {
  return (
    <Link
      href={href}
      className="group relative overflow-hidden rounded-2xl border border-[oklch(0.30,0.06,290)] bg-gradient-to-br from-[oklch(0.18,0.04,290)] to-[oklch(0.20,0.05,290)] p-5 transition-all duration-200 hover:border-purple-500/30 hover:shadow-lg hover:shadow-purple-500/10 active:scale-[0.98]"
    >
      {/* gradient overlay on hover */}
      <div
        className={`absolute inset-0 bg-gradient-to-br ${gradient} opacity-0 group-hover:opacity-100 transition-opacity duration-300`}
      />

      <div className="relative z-10">
        {/* icon */}
        <div className="w-11 h-11 rounded-xl bg-purple-500/15 border border-purple-500/20 flex items-center justify-center mb-4 group-hover:bg-purple-500/25 transition-colors duration-200">
          <Icon className="w-5 h-5 text-purple-400" />
        </div>

        {/* text */}
        <h3 className="text-sm font-semibold text-[oklch(0.95,0.02,290)] mb-1">
          {title}
        </h3>
        <p className="text-xs text-[oklch(0.55,0.04,290)] leading-relaxed">
          {description}
        </p>
      </div>
    </Link>
  );
}
