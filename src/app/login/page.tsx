'use client';

import { useState } from 'react';
import { useRouter } from 'next/navigation';
import { useAuth } from '@/context/AuthContext';
import { Input } from '@/components/ui/input';
import { Button } from '@/components/ui/button';
import { Label } from '@/components/ui/label';
import { Mail, Lock, Eye, EyeOff } from 'lucide-react';
import Image from 'next/image';
import { toast } from 'sonner';

export default function LoginPage() {
  const { login, isLoading } = useAuth();
  const router = useRouter();
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [showPassword, setShowPassword] = useState(false);
  const [loading, setLoading] = useState(false);

  const handleLogin = async () => {
    // basic validation
    if (!email.trim() || !password.trim()) {
      toast.error('Email and Password are required');
      return;
    }
    setLoading(true);
    const error = await login(email.trim(), password);
    if (error) {
      toast.error('Login Failed', { description: error });
      setLoading(false);
    } else {
      toast.success('Welcome back!', { description: 'Redirecting to dashboard...' });
      router.push('/');
    }
  };

  return (
    <div className="min-h-screen bg-[oklch(0.12,0.02,290)] flex items-center justify-center p-4">
      {/* background glow */}
      <div className="fixed inset-0 overflow-hidden pointer-events-none">
        <div className="absolute top-[-200px] left-[-100px] w-[400px] h-[400px] rounded-full bg-purple-600/10 blur-[120px]" />
        <div className="absolute bottom-[-200px] right-[-100px] w-[400px] h-[400px] rounded-full bg-fuchsia-600/10 blur-[120px]" />
      </div>

      <div className="w-full max-w-sm relative z-10">
        {/* logo */}
        <div className="text-center mb-8">
          <Image src="/logo.png" alt="EDMFIRE" width={72} height={72} className="mx-auto mb-4 rounded-2xl" />
          <h1 className="text-3xl font-extrabold text-white tracking-wide">
            EDMFIRE
          </h1>
          <p className="text-sm text-[oklch(0.55,0.04,290)] mt-1">
            Host Panel Login
          </p>
        </div>

        {/* login card */}
        <div className="rounded-3xl bg-[oklch(0.18,0.04,290)] border border-[oklch(0.30,0.06,290)] p-6 shadow-2xl">
          <div className="space-y-5">
            {/* email field */}
            <div className="space-y-2">
              <Label className="text-xs text-[oklch(0.70,0.04,290)] font-medium">
                Email Address
              </Label>
              <div className="relative">
                <Mail className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-[oklch(0.45,0.04,290)]" />
                <Input
                  type="email"
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                  placeholder="host@edmfire.com"
                  className="pl-10 h-12 rounded-xl bg-[oklch(0.22,0.04,290)] border-[oklch(0.30,0.06,290)] text-white placeholder:text-[oklch(0.40,0.04,290)] focus:border-purple-500 focus:ring-purple-500/20"
                  disabled={loading || isLoading}
                />
              </div>
            </div>

            {/* password field */}
            <div className="space-y-2">
              <Label className="text-xs text-[oklch(0.70,0.04,290)] font-medium">
                Password
              </Label>
              <div className="relative">
                <Lock className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-[oklch(0.45,0.04,290)]" />
                <Input
                  type={showPassword ? 'text' : 'password'}
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  placeholder="Enter your password"
                  className="pl-10 pr-10 h-12 rounded-xl bg-[oklch(0.22,0.04,290)] border-[oklch(0.30,0.06,290)] text-white placeholder:text-[oklch(0.40,0.04,290)] focus:border-purple-500 focus:ring-purple-500/20"
                  onKeyDown={(e) => e.key === 'Enter' && handleLogin()}
                  disabled={loading || isLoading}
                />
                <button
                  type="button"
                  onClick={() => setShowPassword(!showPassword)}
                  className="absolute right-3 top-1/2 -translate-y-1/2 text-[oklch(0.45,0.04,290)] hover:text-[oklch(0.70,0.04,290)] transition-colors"
                >
                  {showPassword ? (
                    <EyeOff className="w-4 h-4" />
                  ) : (
                    <Eye className="w-4 h-4" />
                  )}
                </button>
              </div>
            </div>

            {/* login button */}
            <Button
              onClick={handleLogin}
              disabled={loading || isLoading}
              className="w-full h-12 rounded-xl bg-gradient-to-r from-violet-600 to-indigo-700 hover:from-violet-700 hover:to-indigo-800 text-white font-semibold text-sm shadow-lg shadow-purple-500/20 transition-all duration-200"
            >
              {loading || isLoading ? (
                <div className="w-5 h-5 border-2 border-white/30 border-t-white rounded-full animate-spin" />
              ) : (
                'Login'
              )}
            </Button>
          </div>
        </div>

        {/* bottom text */}
        <p className="text-center text-[10px] text-[oklch(0.35,0.04,290)] mt-6">
          EDMFire Host Panel v2.0 — Firebase Auth Enabled
        </p>
      </div>
    </div>
  );
}
