'use client';

import { useEffect } from 'react';
import { toast } from 'sonner';
import { Construction } from 'lucide-react';

interface ComingSoonPageProps {
  title: string;
  description: string;
  step: number;
  color: string;
  icon: string;
}

export default function ComingSoonPage({
  title,
  description,
  step,
  color,
  icon,
}: ComingSoonPageProps) {
  useEffect(() => {
    const timer = setTimeout(() => {
      toast.info(`${title} — Coming Soon!`, {
        description: 'This page is under development. Stay tuned!',
      });
    }, 500);
    return () => clearTimeout(timer);
  }, [title]);

  return (
    <div className="min-h-screen">
      {/* header with gradient matching step color */}
      <header className={`bg-gradient-to-r ${color} px-4 lg:px-6 py-6 sticky top-0 z-20`}>
        <div className="max-w-4xl mx-auto">
          <p className="text-white/70 text-xs font-medium">Step {step}</p>
          <h1 className="text-xl lg:text-2xl font-extrabold text-white mt-1">
            {icon} {title}
          </h1>
          <p className="text-white/60 text-sm mt-1">{description}</p>
        </div>
      </header>

      {/* coming soon content */}
      <div className="max-w-4xl mx-auto px-4 lg:px-6 py-12">
        <div className="flex flex-col items-center justify-center text-center space-y-6 py-16">
          {/* icon */}
          <div className="w-24 h-24 rounded-3xl bg-[oklch(0.20,0.04,290)] border border-[oklch(0.30,0.06,290)] flex items-center justify-center shadow-2xl">
            <span className="text-5xl">{icon}</span>
          </div>

          {/* title */}
          <div className="space-y-2">
            <h2 className="text-2xl lg:text-3xl font-bold text-white">
              {title}
            </h2>
            <p className="text-[oklch(0.55,0.04,290)] text-sm max-w-sm">
              {description}
            </p>
          </div>

          {/* coming soon badge */}
          <div className="inline-flex items-center gap-2 px-6 py-3 rounded-2xl bg-[oklch(0.20,0.04,290)] border border-[oklch(0.30,0.06,290)] shadow-lg">
            <Construction className="w-5 h-5 text-yellow-400 animate-pulse" />
            <span className="text-sm font-semibold text-white">
              Coming Soon
            </span>
          </div>

          {/* info text */}
          <p className="text-[oklch(0.40,0.04,290)] text-xs max-w-xs leading-relaxed">
            This page is currently under development.
            We are working on it and will be available soon.
          </p>
        </div>
      </div>
    </div>
  );
}
