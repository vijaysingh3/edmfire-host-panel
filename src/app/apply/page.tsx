'use client';

import { useState } from 'react';
import { Input } from '@/components/ui/input';
import { Button } from '@/components/ui/button';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import { Checkbox } from '@/components/ui/checkbox';
import { toast } from 'sonner';
import {
  ChevronLeft,
  ChevronRight,
  Upload,
  Send,
} from 'lucide-react';
import Image from 'next/image';

const TOTAL_STEPS = 7;

const stepLabels = [
  { icon: '👤', label: 'Personal Info' },
  { icon: '📍', label: 'Location' },
  { icon: '🎮', label: 'Gaming Info' },
  { icon: '💻', label: 'Device Info' },
  { icon: '📸', label: 'Verification' },
  { icon: '✍️', label: 'Message' },
  { icon: '✅', label: 'Agreement' },
];

export default function ApplyPage() {
  const [step, setStep] = useState(1);
  const [agreements, setAgreements] = useState([false, false, false]);
  const [devices, setDevices] = useState<string[]>([]);

  const toggleDevice = (device: string) => {
    setDevices((prev) =>
      prev.includes(device) ? prev.filter((d) => d !== device) : [...prev, device]
    );
  };

  const toggleAgreement = (index: number) => {
    setAgreements((prev) => {
      const updated = [...prev];
      updated[index] = !updated[index];
      return updated;
    });
  };

  const nextStep = () => {
    if (step < TOTAL_STEPS) setStep(step + 1);
  };

  const prevStep = () => {
    if (step > 1) setStep(step - 1);
  };

  const handleSubmit = () => {
    if (!agreements.every(Boolean)) {
      toast.error('Please accept all agreements');
      return;
    }
    toast.success('Application Submitted!', {
      description: 'EDMFire team will review your application soon.',
    });
  };

  const progressPercent = (step / TOTAL_STEPS) * 100;

  return (
    <div className="min-h-screen bg-[oklch(0.12,0.02,290)]">
      {/* header */}
      <header className="bg-gradient-to-r from-violet-700 to-indigo-700 px-4 lg:px-6 py-6 sticky top-0 z-20">
        <div className="max-w-2xl mx-auto text-center">
          <div className="flex items-center justify-center gap-2 mb-1">
            <Image src="/logo.png" alt="EDMFIRE" width={28} height={28} className="rounded-lg" />
            <h1 className="text-2xl font-extrabold text-white tracking-wide">
              EDMFire Host Application
            </h1>
          </div>
          <p className="text-sm text-white/70">
            Become an Official EDMFire Tournament Host
          </p>
        </div>
      </header>

      <div className="max-w-2xl mx-auto px-4 lg:px-6 py-6 space-y-5">
        {/* progress bar */}
        <div className="space-y-2">
          <div className="flex justify-between text-[10px] text-[oklch(0.55,0.04,290)] font-medium">
            <span>Step {step} of {TOTAL_STEPS}</span>
            <span>{Math.round(progressPercent)}%</span>
          </div>
          <div className="h-2 rounded-full bg-[oklch(0.20,0.04,290)] overflow-hidden">
            <div
              className="h-full rounded-full bg-gradient-to-r from-violet-500 to-indigo-600 transition-all duration-500"
              style={{ width: `${progressPercent}%` }}
            />
          </div>
        </div>

        {/* step indicators */}
        <div className="flex gap-1.5 overflow-x-auto pb-1">
          {stepLabels.map((s, i) => (
            <button
              key={i}
              onClick={() => setStep(i + 1)}
              className={`flex items-center gap-1.5 px-3 py-1.5 rounded-full text-[10px] font-medium whitespace-nowrap shrink-0 transition-all ${
                i + 1 === step
                  ? 'bg-violet-500/20 text-violet-300 border border-violet-500/30'
                  : i + 1 < step
                  ? 'bg-green-500/10 text-green-400 border border-green-500/20'
                  : 'bg-[oklch(0.18,0.04,290)] text-[oklch(0.45,0.04,290)] border border-[oklch(0.25,0.05,290)]'
              }`}
            >
              <span>{s.icon}</span>
              <span className="hidden sm:inline">{s.label}</span>
            </button>
          ))}
        </div>

        {/* form card */}
        <Card className="bg-[oklch(0.18,0.04,290)] border-[oklch(0.30,0.06,290)]">
          <CardHeader className="pb-3">
            <CardTitle className="text-base text-white flex items-center gap-2">
              <span className="text-lg">{stepLabels[step - 1].icon}</span>
              Step {step} — {stepLabels[step - 1].label}
            </CardTitle>
          </CardHeader>
          <CardContent>
            {/* STEP 1 — Personal Info */}
            {step === 1 && (
              <div className="space-y-4">
                <div className="space-y-2">
                  <Label className="text-xs text-[oklch(0.70,0.04,290)]">
                    Full Name <span className="text-red-400">*</span>
                  </Label>
                  <Input placeholder="Enter your full name" className="bg-[oklch(0.22,0.04,290)] border-[oklch(0.30,0.06,290)] text-white placeholder:text-[oklch(0.40,0.04,290)]" />
                </div>
                <div className="space-y-2">
                  <Label className="text-xs text-[oklch(0.70,0.04,290)]">
                    Gender <span className="text-red-400">*</span>
                  </Label>
                  <Select>
                    <SelectTrigger className="bg-[oklch(0.22,0.04,290)] border-[oklch(0.30,0.06,290)] text-white">
                      <SelectValue placeholder="Select gender" />
                    </SelectTrigger>
                    <SelectContent className="bg-[oklch(0.20,0.04,290)] border-[oklch(0.30,0.06,290)]">
                      <SelectItem value="male">Male</SelectItem>
                      <SelectItem value="female">Female</SelectItem>
                      <SelectItem value="other">Other</SelectItem>
                    </SelectContent>
                  </Select>
                </div>
                <div className="space-y-2">
                  <Label className="text-xs text-[oklch(0.70,0.04,290)]">
                    Age <span className="text-red-400">*</span>
                  </Label>
                  <Input type="number" placeholder="e.g. 20" className="bg-[oklch(0.22,0.04,290)] border-[oklch(0.30,0.06,290)] text-white placeholder:text-[oklch(0.40,0.04,290)]" />
                </div>
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                  <div className="space-y-2">
                    <Label className="text-xs text-[oklch(0.70,0.04,290)]">
                      Mobile Number <span className="text-red-400">*</span>
                    </Label>
                    <Input type="tel" placeholder="e.g. 9876543210" className="bg-[oklch(0.22,0.04,290)] border-[oklch(0.30,0.06,290)] text-white placeholder:text-[oklch(0.40,0.04,290)]" />
                  </div>
                  <div className="space-y-2">
                    <Label className="text-xs text-[oklch(0.70,0.04,290)]">
                      WhatsApp Number <span className="text-red-400">*</span>
                    </Label>
                    <Input type="tel" placeholder="e.g. 9876543210" className="bg-[oklch(0.22,0.04,290)] border-[oklch(0.30,0.06,290)] text-white placeholder:text-[oklch(0.40,0.04,290)]" />
                  </div>
                </div>
                <div className="space-y-2">
                  <Label className="text-xs text-[oklch(0.70,0.04,290)]">
                    Gmail Address <span className="text-red-400">*</span>
                  </Label>
                  <Input type="email" placeholder="e.g. you@gmail.com" className="bg-[oklch(0.22,0.04,290)] border-[oklch(0.30,0.06,290)] text-white placeholder:text-[oklch(0.40,0.04,290)]" />
                </div>
              </div>
            )}

            {/* STEP 2 — Location */}
            {step === 2 && (
              <div className="space-y-4">
                <div className="space-y-2">
                  <Label className="text-xs text-[oklch(0.70,0.04,290)]">
                    State <span className="text-red-400">*</span>
                  </Label>
                  <Input placeholder="e.g. Maharashtra" className="bg-[oklch(0.22,0.04,290)] border-[oklch(0.30,0.06,290)] text-white placeholder:text-[oklch(0.40,0.04,290)]" />
                </div>
                <div className="space-y-2">
                  <Label className="text-xs text-[oklch(0.70,0.04,290)]">
                    District <span className="text-red-400">*</span>
                  </Label>
                  <Input placeholder="e.g. Pune" className="bg-[oklch(0.22,0.04,290)] border-[oklch(0.30,0.06,290)] text-white placeholder:text-[oklch(0.40,0.04,290)]" />
                </div>
                <div className="space-y-2">
                  <Label className="text-xs text-[oklch(0.70,0.04,290)]">
                    Village / Town / City <span className="text-red-400">*</span>
                  </Label>
                  <Input placeholder="e.g. Shivajinagar" className="bg-[oklch(0.22,0.04,290)] border-[oklch(0.30,0.06,290)] text-white placeholder:text-[oklch(0.40,0.04,290)]" />
                </div>
              </div>
            )}

            {/* STEP 3 — Gaming Info */}
            {step === 3 && (
              <div className="space-y-4">
                <div className="space-y-2">
                  <Label className="text-xs text-[oklch(0.70,0.04,290)]">
                    Free Fire Nickname <span className="text-[oklch(0.45,0.04,290)]">(optional)</span>
                  </Label>
                  <Input placeholder="Your in-game name" className="bg-[oklch(0.22,0.04,290)] border-[oklch(0.30,0.06,290)] text-white placeholder:text-[oklch(0.40,0.04,290)]" />
                </div>
                <div className="space-y-2">
                  <Label className="text-xs text-[oklch(0.70,0.04,290)]">
                    How Many Years Have You Played Free Fire? <span className="text-red-400">*</span>
                  </Label>
                  <Select>
                    <SelectTrigger className="bg-[oklch(0.22,0.04,290)] border-[oklch(0.30,0.06,290)] text-white">
                      <SelectValue placeholder="Select experience" />
                    </SelectTrigger>
                    <SelectContent className="bg-[oklch(0.20,0.04,290)] border-[oklch(0.30,0.06,290)]">
                      <SelectItem value="lt1">Less than 1 Year</SelectItem>
                      <SelectItem value="1-2">1–2 Years</SelectItem>
                      <SelectItem value="3-4">3–4 Years</SelectItem>
                      <SelectItem value="5+">5+ Years</SelectItem>
                    </SelectContent>
                  </Select>
                </div>
                <div className="space-y-2">
                  <Label className="text-xs text-[oklch(0.70,0.04,290)]">
                    Have You Hosted Tournaments Before? <span className="text-red-400">*</span>
                  </Label>
                  <Select>
                    <SelectTrigger className="bg-[oklch(0.22,0.04,290)] border-[oklch(0.30,0.06,290)] text-white">
                      <SelectValue placeholder="Select" />
                    </SelectTrigger>
                    <SelectContent className="bg-[oklch(0.20,0.04,290)] border-[oklch(0.30,0.06,290)]">
                      <SelectItem value="yes">Yes</SelectItem>
                      <SelectItem value="no">No</SelectItem>
                    </SelectContent>
                  </Select>
                </div>
                <div className="space-y-2">
                  <Label className="text-xs text-[oklch(0.70,0.04,290)]">
                    If Yes, Explain Your Experience <span className="text-red-400">*</span>
                  </Label>
                  <Textarea
                    placeholder="Describe your tournament hosting experience..."
                    rows={4}
                    className="bg-[oklch(0.22,0.04,290)] border-[oklch(0.30,0.06,290)] text-white placeholder:text-[oklch(0.40,0.04,290)] resize-none"
                  />
                </div>
                <div className="space-y-2">
                  <Label className="text-xs text-[oklch(0.70,0.04,290)]">
                    Which Modes Can You Manage? <span className="text-red-400">*</span>
                  </Label>
                  <Select>
                    <SelectTrigger className="bg-[oklch(0.22,0.04,290)] border-[oklch(0.30,0.06,290)] text-white">
                      <SelectValue placeholder="Select mode" />
                    </SelectTrigger>
                    <SelectContent className="bg-[oklch(0.20,0.04,290)] border-[oklch(0.30,0.06,290)]">
                      <SelectItem value="br">Battle Royale</SelectItem>
                      <SelectItem value="cs">Clash Squad</SelectItem>
                      <SelectItem value="lw">Lone Wolf</SelectItem>
                    </SelectContent>
                  </Select>
                </div>
                <div className="space-y-2">
                  <Label className="text-xs text-[oklch(0.70,0.04,290)]">
                    Your Current Rank <span className="text-red-400">*</span>
                  </Label>
                  <Select>
                    <SelectTrigger className="bg-[oklch(0.22,0.04,290)] border-[oklch(0.30,0.06,290)] text-white">
                      <SelectValue placeholder="Select rank" />
                    </SelectTrigger>
                    <SelectContent className="bg-[oklch(0.20,0.04,290)] border-[oklch(0.30,0.06,290)]">
                      <SelectItem value="bronze">Bronze</SelectItem>
                      <SelectItem value="silver">Silver</SelectItem>
                      <SelectItem value="gold">Gold</SelectItem>
                      <SelectItem value="platinum">Platinum</SelectItem>
                      <SelectItem value="diamond">Diamond</SelectItem>
                      <SelectItem value="heroic">Heroic</SelectItem>
                      <SelectItem value="grandmaster">Grandmaster</SelectItem>
                    </SelectContent>
                  </Select>
                </div>
              </div>
            )}

            {/* STEP 4 — Device Info */}
            {step === 4 && (
              <div className="space-y-4">
                <div className="space-y-2">
                  <Label className="text-xs text-[oklch(0.70,0.04,290)]">
                    Which Device Do You Use? <span className="text-red-400">*</span>
                  </Label>
                  <div className="grid grid-cols-2 sm:grid-cols-3 gap-2">
                    {['Android Phone', 'iPhone', 'Laptop', 'Desktop PC', 'Tablet'].map((device) => (
                      <button
                        key={device}
                        onClick={() => toggleDevice(device)}
                        className={`px-3 py-2.5 rounded-xl text-xs font-medium transition-all border ${
                          devices.includes(device)
                            ? 'bg-violet-500/20 text-violet-300 border-violet-500/30'
                            : 'bg-[oklch(0.22,0.04,290)] text-[oklch(0.60,0.04,290)] border-[oklch(0.30,0.06,290)] hover:border-[oklch(0.40,0.06,290)]'
                        }`}
                      >
                        {devices.includes(device) && '✓ '}{device}
                      </button>
                    ))}
                  </div>
                </div>
                <div className="space-y-2">
                  <Label className="text-xs text-[oklch(0.70,0.04,290)]">
                    Primary Device Name <span className="text-red-400">*</span>
                  </Label>
                  <Input placeholder="e.g. Vivo T2, HP Laptop, ASUS ROG" className="bg-[oklch(0.22,0.04,290)] border-[oklch(0.30,0.06,290)] text-white placeholder:text-[oklch(0.40,0.04,290)]" />
                </div>
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                  <div className="space-y-2">
                    <Label className="text-xs text-[oklch(0.70,0.04,290)]">
                      RAM Size <span className="text-red-400">*</span>
                    </Label>
                    <Select>
                      <SelectTrigger className="bg-[oklch(0.22,0.04,290)] border-[oklch(0.30,0.06,290)] text-white">
                        <SelectValue placeholder="Select RAM" />
                      </SelectTrigger>
                      <SelectContent className="bg-[oklch(0.20,0.04,290)] border-[oklch(0.30,0.06,290)]">
                        <SelectItem value="2">2GB</SelectItem>
                        <SelectItem value="3">3GB</SelectItem>
                        <SelectItem value="4">4GB</SelectItem>
                        <SelectItem value="6">6GB</SelectItem>
                        <SelectItem value="8">8GB</SelectItem>
                        <SelectItem value="12+">12GB+</SelectItem>
                      </SelectContent>
                    </Select>
                  </div>
                  <div className="space-y-2">
                    <Label className="text-xs text-[oklch(0.70,0.04,290)]">
                      Internet Quality <span className="text-red-400">*</span>
                    </Label>
                    <Select>
                      <SelectTrigger className="bg-[oklch(0.22,0.04,290)] border-[oklch(0.30,0.06,290)] text-white">
                        <SelectValue placeholder="Select quality" />
                      </SelectTrigger>
                      <SelectContent className="bg-[oklch(0.20,0.04,290)] border-[oklch(0.30,0.06,290)]">
                        <SelectItem value="average">Average</SelectItem>
                        <SelectItem value="good">Good</SelectItem>
                        <SelectItem value="excellent">Excellent</SelectItem>
                      </SelectContent>
                    </Select>
                  </div>
                </div>
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                  <div className="space-y-2">
                    <Label className="text-xs text-[oklch(0.70,0.04,290)]">
                      Can You Screen Record Matches? <span className="text-red-400">*</span>
                    </Label>
                    <Select>
                      <SelectTrigger className="bg-[oklch(0.22,0.04,290)] border-[oklch(0.30,0.06,290)] text-white">
                        <SelectValue placeholder="Select" />
                      </SelectTrigger>
                      <SelectContent className="bg-[oklch(0.20,0.04,290)] border-[oklch(0.30,0.06,290)]">
                        <SelectItem value="yes">Yes</SelectItem>
                        <SelectItem value="no">No</SelectItem>
                      </SelectContent>
                    </Select>
                  </div>
                  <div className="space-y-2">
                    <Label className="text-xs text-[oklch(0.70,0.04,290)]">
                      Discord / Telegram Username
                    </Label>
                    <Input placeholder="e.g. @username" className="bg-[oklch(0.22,0.04,290)] border-[oklch(0.30,0.06,290)] text-white placeholder:text-[oklch(0.40,0.04,290)]" />
                  </div>
                </div>
              </div>
            )}

            {/* STEP 5 — Verification */}
            {step === 5 && (
              <div className="space-y-4">
                <div className="space-y-2">
                  <Label className="text-xs text-[oklch(0.70,0.04,290)]">
                    Upload Free Fire Profile Screenshot <span className="text-red-400">*</span>
                  </Label>
                  <div className="border-2 border-dashed border-[oklch(0.30,0.06,290)] rounded-xl p-6 flex flex-col items-center gap-2 hover:border-violet-500/40 transition-colors cursor-pointer bg-[oklch(0.20,0.04,290)]">
                    <Upload className="w-8 h-8 text-[oklch(0.45,0.04,290)]" />
                    <p className="text-xs text-[oklch(0.55,0.04,290)]">
                      Click to upload or drag & drop
                    </p>
                    <p className="text-[10px] text-[oklch(0.40,0.04,290)]">
                      PNG, JPG up to 5MB
                    </p>
                  </div>
                </div>
                <div className="space-y-2">
                  <Label className="text-xs text-[oklch(0.70,0.04,290)]">
                    Upload Your Selfie <span className="text-red-400">*</span>
                  </Label>
                  <div className="border-2 border-dashed border-[oklch(0.30,0.06,290)] rounded-xl p-6 flex flex-col items-center gap-2 hover:border-violet-500/40 transition-colors cursor-pointer bg-[oklch(0.20,0.04,290)]">
                    <Upload className="w-8 h-8 text-[oklch(0.45,0.04,290)]" />
                    <p className="text-xs text-[oklch(0.55,0.04,290)]">
                      Click to upload or drag & drop
                    </p>
                    <p className="text-[10px] text-[oklch(0.40,0.04,290)]">
                      PNG, JPG up to 5MB
                    </p>
                  </div>
                </div>
              </div>
            )}

            {/* STEP 6 — Message */}
            {step === 6 && (
              <div className="space-y-4">
                <div className="space-y-2">
                  <Label className="text-xs text-[oklch(0.70,0.04,290)]">
                    Why Do You Want To Become Host? <span className="text-red-400">*</span>
                  </Label>
                  <Textarea
                    placeholder="Write in detail why you want to become an EDMFire host..."
                    rows={8}
                    className="bg-[oklch(0.22,0.04,290)] border-[oklch(0.30,0.06,290)] text-white placeholder:text-[oklch(0.40,0.04,290)] resize-none"
                  />
                </div>
              </div>
            )}

            {/* STEP 7 — Agreement */}
            {step === 7 && (
              <div className="space-y-5">
                <p className="text-sm text-[oklch(0.70,0.04,290)]">
                  Please read and accept all terms before submitting:
                </p>

                {[
                  'I agree to follow all EDMFire tournament rules.',
                  'I will not misuse host privileges.',
                  'I understand that violating rules may permanently remove my host access.',
                ].map((text, i) => (
                  <div key={i} className="flex items-start gap-3 p-3 rounded-xl bg-[oklch(0.20,0.04,290)] border border-[oklch(0.25,0.05,290)]">
                    <Checkbox
                      checked={agreements[i]}
                      onCheckedChange={() => toggleAgreement(i)}
                      className="mt-0.5 data-[state=checked]:bg-violet-600 data-[state=checked]:border-violet-600"
                    />
                    <p className="text-xs text-[oklch(0.70,0.04,290)] leading-relaxed">
                      {text}
                    </p>
                  </div>
                ))}

                {/* important notes */}
                <div className="rounded-xl bg-yellow-500/5 border border-yellow-500/20 p-4 space-y-2">
                  <p className="text-xs font-semibold text-yellow-400">
                    Important Notes
                  </p>
                  {[
                    'All fields are mandatory.',
                    'Fake information may lead to application rejection.',
                    'Host access will be provided only after verification.',
                    'EDMFire Team can remove host access anytime for rule violations.',
                  ].map((note, i) => (
                    <p key={i} className="text-[10px] text-[oklch(0.55,0.04,290)]">
                      {note}
                    </p>
                  ))}
                </div>
              </div>
            )}
          </CardContent>
        </Card>

        {/* navigation buttons */}
        <div className="flex gap-3">
          {step > 1 && (
            <Button
              onClick={prevStep}
              variant="secondary"
              className="flex-1 h-12 rounded-xl bg-[oklch(0.22,0.04,290)] border border-[oklch(0.30,0.06,290)] text-[oklch(0.70,0.04,290)]"
            >
              <ChevronLeft className="w-4 h-4 mr-2" />
              Back
            </Button>
          )}
          {step < TOTAL_STEPS && (
            <Button
              onClick={nextStep}
              className="flex-1 h-12 rounded-xl bg-gradient-to-r from-violet-600 to-indigo-700 hover:from-violet-700 hover:to-indigo-800 text-white font-semibold shadow-lg shadow-violet-500/20"
            >
              Next
              <ChevronRight className="w-4 h-4 ml-2" />
            </Button>
          )}
          {step === TOTAL_STEPS && (
            <Button
              onClick={handleSubmit}
              className="flex-1 h-12 rounded-xl bg-gradient-to-r from-green-500 to-emerald-600 hover:from-green-600 hover:to-emerald-700 text-white font-semibold shadow-lg shadow-green-500/20"
            >
              <Send className="w-4 h-4 mr-2" />
              Submit Application
            </Button>
          )}
        </div>

        {/* bottom link to login */}
        <div className="text-center py-4">
          <p className="text-xs text-[oklch(0.45,0.04,290)]">
            Already a Host?{' '}
            <a href="/login" className="text-violet-400 hover:text-violet-300 font-medium">
              Login Here
            </a>
          </p>
        </div>
      </div>
    </div>
  );
}
