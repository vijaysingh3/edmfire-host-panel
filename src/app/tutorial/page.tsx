'use client';

import Link from 'next/link';
import Image from 'next/image';
import {
  ArrowRight,
  Upload,
  Trophy,
  Bell,
  Target,
  Gift,
  RotateCcw,
  Wallet,
  Settings,
  ChevronDown,
  QrCode,
  Shield,
  IndianRupee,
  Search,
  RefreshCw,
  Save,
  Send,
  Trash2,
  Lock,
  CheckCircle2,
  Info,
  AlertTriangle,
  XCircle,
  Copy,
  Download,
  CreditCard,
  Users,
} from 'lucide-react';
import { useState } from 'react';

// ═══════════════════════════════════════════════════
// EDMFIRE HOST PANEL — COMPLETE TUTORIAL (HINDI)
// ═══════════════════════════════════════════════════

const steps = [
  {
    id: 1,
    title: 'Upload Thumbnail',
    subtitle: 'Tournament ka banner image upload karo',
    icon: <Upload className="w-5 h-5" />,
    color: 'from-violet-500 to-purple-700',
    borderColor: 'border-violet-500/30',
    bgColor: 'bg-violet-500/10',
    textColor: 'text-violet-400',
    page: '/thumbnail',
    content: [
      {
        type: 'text' as const,
        value: 'Sabse pehle tournament ka banner image (thumbnail) upload karna hota hai. Ye image tournament ke cover ke liye use hoti hai.',
      },
      {
        type: 'arrow' as const,
        value: '"Pick Image" button pe click karo → Gallary se ek image select karo (PNG, JPG ya WEBP — max 5MB)',
      },
      {
        type: 'arrow' as const,
        value: 'Image preview dikhega → "Upload" button pe click karo',
      },
      {
        type: 'arrow' as const,
        value: 'Upload ke baad image ka URL mil jayega → "Copy URL" button se copy karo',
      },
      {
        type: 'tip' as const,
        value: 'Ye copied URL Step 2 (Create Tournament) me Banner URL field me paste hoga.',
      },
      {
        type: 'text' as const,
        value: 'Neeche scroll karne pe saari uploaded thumbnails ki list dikhti hai — kisi bhi ka URL dobara copy kar sakte ho.',
      },
    ],
  },
  {
    id: 2,
    title: 'Create / Update Tournament',
    subtitle: 'Naya tournament banao ya purana edit karo',
    icon: <Trophy className="w-5 h-5" />,
    color: 'from-orange-400 to-orange-600',
    borderColor: 'border-orange-500/30',
    bgColor: 'bg-orange-500/10',
    textColor: 'text-orange-400',
    page: '/create-tournament',
    content: [
      {
        type: 'heading' as const,
        value: 'CREATE MODE — Naya Tournament Banana:',
      },
      {
        type: 'arrow' as const,
        value: '"Create Mode" select karo (default)',
      },
      {
        type: 'arrow' as const,
        value: 'Tournament Type choose karo → BattleRoyal / ClashSquad / LoneWolf / FreeTournaments',
      },
      {
        type: 'arrow' as const,
        value: 'Game Mode choose karo → BattleRoyal / ClashSquad / LoneWolf',
      },
      {
        type: 'arrow' as const,
        value: 'Tournament ID auto-generate hoga (EDM_XXX format) — isko manually change mat karo',
      },
      {
        type: 'arrow' as const,
        value: 'Title* → Tournament ka naam likho (required)',
      },
      {
        type: 'arrow' as const,
        value: 'Description → Tournament ki detail likho (optional)',
      },
      {
        type: 'arrow' as const,
        value: 'Banner URL → Step 1 me copy kiya hua URL yahan paste karo',
      },
      {
        type: 'arrow' as const,
        value: 'Date & Time → Date select karo → Hour (1-12) → Minute (00-59) → AM/PM select karo',
      },
      {
        type: 'arrow' as const,
        value: 'Map → Bermuda / Purgatory / Kalahari / Alpine / Nexterra choose karo (LoneWolf me IronCage auto-lock hota hai)',
      },
      {
        type: 'arrow' as const,
        value: 'Type → Solo / Duo / Squad',
      },
      {
        type: 'arrow' as const,
        value: 'Slot Numbers → Kitne players join kar sakte hain (e.g. 50, 100)',
      },
      {
        type: 'arrow' as const,
        value: 'Joining Fee (Coins)* → Entry fee khaasna hai to Coins me likho (required)',
      },
      {
        type: 'arrow' as const,
        value: 'Per Kill Reward (Coins) → Har kill pe kitne Coins milenge (e.g. 5)',
      },
      {
        type: 'arrow' as const,
        value: 'Price Pool (Coins) → Total prize pool khaasna hai to likho',
      },
      {
        type: 'arrow' as const,
        value: 'Video URL (Optional) → YouTube ya koi video link da sakte ho',
      },
      {
        type: 'arrow' as const,
        value: 'Status → Create mode me hamesha "Upcoming" hota hai (auto-set)',
      },
      {
        type: 'arrow' as const,
        value: '"Create Tournament" button pe click karo → Tournament ban jayega!',
      },
      {
        type: 'heading' as const,
        value: 'UPDATE MODE — Purana Tournament Edit Karna:',
      },
      {
        type: 'arrow' as const,
        value: '"Update Mode" click karo → Apne tournaments ka list load hoga',
      },
      {
        type: 'arrow' as const,
        value: 'Tournament Type dropdown se type select karo',
      },
      {
        type: 'arrow' as const,
        value: 'Tournament ID me sirf numbers type karo (EDM_ prefix auto lag jayega) → Preview me full ID dikhega',
      },
      {
        type: 'arrow' as const,
        value: '"Load Tournament Data" click karo → Saare fields auto-fill ho jayenge',
      },
      {
        type: 'warn' as const,
        value: 'HostUID Protection: Sirf aapke UID wale tournaments hi load honge. Dusre host ki tournament me "Access Denied" dikhega.',
      },
      {
        type: 'arrow' as const,
        value: 'Jo fields change karne hain wo edit karo → Update mode me Room ID aur Room Password bhi add kar sakte ho',
      },
      {
        type: 'arrow' as const,
        value: '"Update Tournament" button pe click karo → Changes save ho jayenge',
      },
    ],
  },
  {
    id: 3,
    title: 'Send Notification',
    subtitle: 'Joined players ko match ki info bhejo',
    icon: <Bell className="w-5 h-5" />,
    color: 'from-yellow-400 to-amber-600',
    borderColor: 'border-yellow-500/30',
    bgColor: 'bg-yellow-500/10',
    textColor: 'text-yellow-400',
    page: '/send-notification',
    content: [
      {
        type: 'text' as const,
        value: 'Tournament ke joined players ko FCM push notification bhejo — Room ID, Password, Map, Time jaisi info ke liye.',
      },
      {
        type: 'arrow' as const,
        value: 'Tournament Type select karo',
      },
      {
        type: 'arrow' as const,
        value: 'Tournament ID type karo (EDM_ prefix auto)',
      },
      {
        type: 'arrow' as const,
        value: '"REFRESH" click karo → Tournament ka title aur joined players count check hoga',
      },
      {
        type: 'warn' as const,
        value: 'Sirf apni tournament me hi notification bhej sakte ho (HostUID check hota hai).',
      },
      {
        type: 'arrow' as const,
        value: 'Notification Title likho → e.g. "Room ID & Password" ya "Match Starting"',
      },
      {
        type: 'arrow' as const,
        value: 'Notification Body likho → e.g. "Room ID: 12345 | Password: abc | Map: Bermuda"',
      },
      {
        type: 'arrow' as const,
        value: '"SEND" click karo → Confirm dialog → Ok → Notification sabhi joined players ko chali jayegi!',
      },
      {
        type: 'tip' as const,
        value: 'Activity Log toggle karke notification ka full log dekh sakte ho — kitne sent, kitne failed.',
      },
    ],
  },
  {
    id: 4,
    title: 'Update Result',
    subtitle: 'Match ke results — Kills, Rank, Coins update karo',
    icon: <Target className="w-5 h-5" />,
    color: 'from-fuchsia-500 to-violet-700',
    borderColor: 'border-fuchsia-500/30',
    bgColor: 'bg-fuchsia-500/10',
    textColor: 'text-fuchsia-400',
    page: '/results',
    content: [
      {
        type: 'text' as const,
        value: 'Match khatam hone ke baad har player ka result update karna hota hai — Kills, Deaths, Rank, Coins.',
      },
      {
        type: 'arrow' as const,
        value: 'Tournament Type select karo',
      },
      {
        type: 'arrow' as const,
        value: 'Tournament ID type karo → "REFRESH" click karo',
      },
      {
        type: 'arrow' as const,
        value: 'Tournament info dikhega → Mode, PrizePool, Joined Players count, PerKill rate',
      },
      {
        type: 'arrow' as const,
        value: 'Saare pending players ki list dikhegi → Har player ke liye:',
      },
      {
        type: 'arrow' as const,
        value: '  → Player ka Name + Level + Slot Number (locked, change nahi hoga)',
      },
      {
        type: 'arrow' as const,
        value: '  → UID dikhega (locked)',
      },
      {
        type: 'arrow' as const,
        value: '  → Kills, Deaths, Assists, Damage — yeh edit karo numbers type karke',
      },
      {
        type: 'arrow' as const,
        value: '  → Coins Earned — Agar PerKill set hai to auto-calculate hoga, ya manually edit karo',
      },
      {
        type: 'arrow' as const,
        value: '  → Rank (1st, 2nd, 3rd...) aur Result (win/lose/top10) select karo',
      },
      {
        type: 'arrow' as const,
        value: '"Update" (green button) click karo → Player result save + WinnerList me add ho jayega',
      },
      {
        type: 'tip' as const,
        value: 'Search bar me player ka naam ya UID type karo → Instantly filter hoga. Special characters wale names bhi search hote hain.',
      },
      {
        type: 'heading' as const,
        value: 'Result Status Toggle:',
      },
      {
        type: 'arrow' as const,
        value: 'Result Status toggle ON karo → "Publish" → Players ko results dikhne lagenge',
      },
      {
        type: 'arrow' as const,
        value: 'Result Status toggle OFF karo → "Unpublish" → Players ko results nahi dikhenge',
      },
      {
        type: 'heading' as const,
        value: 'Revert All (Sab Reset):',
      },
      {
        type: 'arrow' as const,
        value: '"Revert All" button dikhega agar koi player update ho chuka hai',
      },
      {
        type: 'arrow' as const,
        value: 'Click karo → Confirm → Sabhi players ka PaymentStatus = false ho jayega + WinnerList clear ho jayega',
      },
      {
        type: 'warn' as const,
        value: 'Revert sirf tab kaam karega jab tournament ka PaymentStatus = false ho. Agar payment ho chuki hai to revert nahi hoga.',
      },
    ],
  },
  {
    id: 5,
    title: 'Prize Distribution',
    subtitle: 'Winners ko unka prize Coins distribute karo',
    icon: <Gift className="w-5 h-5" />,
    color: 'from-yellow-400 to-amber-600',
    borderColor: 'border-yellow-500/30',
    bgColor: 'bg-yellow-500/10',
    textColor: 'text-yellow-400',
    page: '/prize',
    content: [
      {
        type: 'text' as const,
        value: 'Jab results update ho jayein aur WinnerList ready ho → Prize Distribution se winners ko Coins bhejo.',
      },
      {
        type: 'arrow' as const,
        value: 'Page open hote hi saare tournament types load honge automatically',
      },
      {
        type: 'arrow' as const,
        value: 'Tournament Type dropdown se type select karo → Us type ke pending tournaments dikheynge',
      },
      {
        type: 'arrow' as const,
        value: 'Tournament ID select karo (jo pending payment hai — PaymentStatus = false)',
      },
      {
        type: 'arrow' as const,
        value: 'Top me "Host Wallet Balance" live dikhega → Realtime update hota hai',
      },
      {
        type: 'arrow' as const,
        value: '"DISTRIBUTE" button click karo → System auto-validate karega:',
      },
      {
        type: 'arrow' as const,
        value: '  → Tournament "Completed" hona chahiye',
      },
      {
        type: 'arrow' as const,
        value: '  → WinnerList me winners hone chahiye (Step 4 me add kiye ho)',
      },
      {
        type: 'arrow' as const,
        value: '  → Wallet me balance sufficient hona chahiye',
      },
      {
        type: 'warn' as const,
        value: 'Agar wallet me balance kam hai → Red toast dikhega: "Insufficient Balance! You have X Coins but need Y Coins. Short by Z Coins." → Pehle Deposit karo.',
      },
      {
        type: 'arrow' as const,
        value: 'Sab validate hone pe → Auto winners ko Coins credit ho jayenge → Wallet balance deduct hoga',
      },
      {
        type: 'tip' as const,
        value: 'Activity Log open karke pura distribution log dekh sakte ho — Total Winners, Processed, Failed, Total Distributed amount.',
      },
      {
        type: 'tip' as const,
        value: 'Distribution ke baad auto-refresh hota hai — Updated list dikhega. Agar kuch fail hua to dobara DISTRIBUTE click karke retry kar sakte ho.',
      },
    ],
  },
  {
    id: 6,
    title: 'Refund Coins',
    subtitle: 'Players ko joining fee refund karo',
    icon: <RotateCcw className="w-5 h-5" />,
    color: 'from-cyan-500 to-teal-700',
    borderColor: 'border-cyan-500/30',
    bgColor: 'bg-cyan-500/10',
    textColor: 'text-cyan-400',
    page: '/refund-coins',
    content: [
      {
        type: 'text' as const,
        value: 'Kabhi kabhi tournament cancel hota hai ya kisi player ko refund karna padta hai — is page se single player ko refund karo.',
      },
      {
        type: 'arrow' as const,
        value: 'Tournament Type select karo',
      },
      {
        type: 'arrow' as const,
        value: 'Tournament ID select karo',
      },
      {
        type: 'arrow' as const,
        value: '"REFRESH & LOAD PLAYERS" click karo → Joined players ki list dikhegi',
      },
      {
        type: 'arrow' as const,
        value: 'Jis player ko refund karna hai → Uspe click karo',
      },
      {
        type: 'arrow' as const,
        value: 'Refund Percentage set karo — Slider ya Custom input (1% se 100%)',
      },
      {
        type: 'arrow' as const,
        value: '"PROCEED REFUND" click karo',
      },
      {
        type: 'arrow' as const,
        value: 'Confirmation dialog → Player name, refund amount, percentage dikhayega',
      },
      {
        type: 'arrow' as const,
        value: '"YES, REFUND" click karo → Firebase Function call hoga → Player ko Coins credit ho jayenge',
      },
      {
        type: 'warn' as const,
        value: 'Refund process irreversible hai — Ek baar refund ho gaya to wapas nahi ho sakta!',
      },
      {
        type: 'warn' as const,
        value: 'Wallet me sufficient balance hona chahiye warna "Insufficient Balance" error aayega.',
      },
    ],
  },
  {
    id: 7,
    title: 'Deposit Coins',
    subtitle: 'UPI se wallet me Coins add karo',
    icon: <IndianRupee className="w-5 h-5" />,
    color: 'from-green-500 to-emerald-600',
    borderColor: 'border-green-500/30',
    bgColor: 'bg-green-500/10',
    textColor: 'text-green-400',
    page: '/deposit',
    content: [
      {
        type: 'text' as const,
        value: 'Prize Distribution aur Refund ke liye wallet me Coins chahiye — UPI payment se Coins add karo.',
      },
      {
        type: 'heading' as const,
        value: 'Step 1 — Amount Enter karo:',
      },
      {
        type: 'arrow' as const,
        value: 'Amount input me paisa type karo (e.g. 50, 100, 199) ya Quick Buttons se select karo',
      },
      {
        type: 'arrow' as const,
        value: '"Generate QR Code" click karo → QR code dikhega',
      },
      {
        type: 'heading' as const,
        value: 'Step 2 — Scan & Pay:',
      },
      {
        type: 'arrow' as const,
        value: 'QR scan karo kisi bhi UPI app se (PhonePe, GPay, Paytm)',
      },
      {
        type: 'arrow' as const,
        value: 'Ya "Download QR" button se QR download karke share karo',
      },
      {
        type: 'heading' as const,
        value: 'Step 3 — UTR Verify karo:',
      },
      {
        type: 'arrow' as const,
        value: 'Payment ke baad bank app me 12-digit UTR milega (Transaction Reference)',
      },
      {
        type: 'arrow' as const,
        value: 'UTR input me 12 digits type karo',
      },
      {
        type: 'arrow' as const,
        value: '"Verify Payment" click karo → System verify karega',
      },
      {
        type: 'arrow' as const,
        value: 'Success → Coins wallet me add ho jayenge + Bonus Coins bhi milenge!',
      },
      {
        type: 'tip' as const,
        value: 'Minimum Rs.25 deposit hai. Bonus auto-calculate hota hai verification pe.',
      },
    ],
  },
  {
    id: 8,
    title: 'Wallet',
    subtitle: 'Balance, transactions aur withdrawal',
    icon: <Wallet className="w-5 h-5" />,
    color: 'from-cyan-500 to-teal-700',
    borderColor: 'border-cyan-500/30',
    bgColor: 'bg-cyan-500/10',
    textColor: 'text-cyan-400',
    page: '/wallet',
    content: [
      {
        type: 'text' as const,
        value: 'Wallet page pe aapka total balance, saari transactions, aur deposit/withdrawal ke options hain.',
      },
      {
        type: 'heading' as const,
        value: 'Top Section:',
      },
      {
        type: 'arrow' as const,
        value: 'Total Balance dikhega (realtime — live update hota hai)',
      },
      {
        type: 'arrow' as const,
        value: '"Withdrawal" button → Coins withdraw karne ke liye',
      },
      {
        type: 'arrow' as const,
        value: '"Deposit" button → Coins add karne ke liye (Deposit page pe jaayega)',
      },
      {
        type: 'heading' as const,
        value: 'Stats:',
      },
      {
        type: 'arrow' as const,
        value: 'Deposited, Entry Fees, Prize Paid, Refunded, Withdrawn — total amounts dikhte hain',
      },
      {
        type: 'heading' as const,
        value: 'Transaction History:',
      },
      {
        type: 'arrow' as const,
        value: 'Filter Tabs → All / Deposit / Entry Fee / Prize Dist. / Refund / Withdrawal',
      },
      {
        type: 'arrow' as const,
        value: 'Har transaction pe click karke detail view dekh sakte ho (full info)',
      },
      {
        type: 'arrow' as const,
        value: 'Newest transactions pehle dikhte hain (Time ke anusar sorted)',
      },
    ],
  },
];

// ═══════════════════════════════════════════════════
// FLOW DIAGRAM
// ═══════════════════════════════════════════════════
const flowSteps = [
  { num: 1, label: 'Thumbnail Upload', color: 'bg-violet-500' },
  { num: 2, label: 'Create Tournament', color: 'bg-orange-500' },
  { num: 3, label: 'Send Notification', color: 'bg-yellow-500' },
  { num: 4, label: 'Update Result', color: 'bg-fuchsia-500' },
  { num: 5, label: 'Prize Distribution', color: 'bg-amber-500' },
  { num: 6, label: 'Refund (if needed)', color: 'bg-cyan-500' },
  { num: 7, label: 'Completed', color: 'bg-green-500' },
];

export default function TutorialPage() {
  const [expandedStep, setExpandedStep] = useState<number | null>(1);
  const [showFlow, setShowFlow] = useState(true);

  return (
    <div className="min-h-screen bg-[oklch(0.10,0.02,290)]">
      {/* Header */}
      <header className="bg-gradient-to-r from-violet-700 via-purple-700 to-indigo-700 px-4 lg:px-6 py-8 sticky top-0 z-20 shadow-2xl shadow-purple-900/30">
        <div className="max-w-3xl mx-auto">
          <div className="flex items-center gap-3">
            <Link href="/" className="w-10 h-10 rounded-xl bg-white/10 flex items-center justify-center hover:bg-white/20 transition-colors">
              <Image src="/logo.png" alt="EDMFIRE" width={28} height={28} className="rounded-lg" />
            </Link>
            <div>
              <h1 className="text-2xl lg:text-3xl font-extrabold text-white tracking-wide">
                EDMFIRE HOST PANEL
              </h1>
              <p className="text-white/60 text-sm mt-0.5">Complete Tutorial — Hindi Guide</p>
            </div>
          </div>
        </div>
      </header>

      <div className="max-w-3xl mx-auto px-4 lg:px-6 py-6 space-y-6">

        {/* Intro */}
        <div className="rounded-2xl bg-gradient-to-br from-violet-500/10 to-purple-600/5 border border-purple-500/20 p-5">
          <p className="text-sm text-[oklch(0.70,0.04,290)] leading-relaxed">
            Ye tutorial EDMFIRE Host Panel ka pura guide hai. Neeche tournament host karne ka <span className="text-white font-bold">step-by-step process</span> diya hua hai.
            Har step ko click karke detail me padho. Arrows follow karo — tournament easily host ho jayega!
          </p>
        </div>

        {/* Flow Diagram */}
        <div className="rounded-2xl bg-[oklch(0.14,0.03,290)] border border-[oklch(0.25,0.05,290)] p-4 lg:p-5">
          <button
            onClick={() => setShowFlow(!showFlow)}
            className="flex items-center justify-between w-full"
          >
            <div className="flex items-center gap-2">
              <Info className="w-4 h-4 text-purple-400" />
              <span className="text-sm font-bold text-white">Tournament Flow (Step by Step)</span>
            </div>
            <ChevronDown className={`w-4 h-4 text-[oklch(0.50,0.04,290)] transition-transform duration-300 ${showFlow ? 'rotate-180' : ''}`} />
          </button>

          {showFlow && (
            <div className="mt-4 space-y-2">
              {flowSteps.map((step, idx) => (
                <div key={step.num} className="flex items-center gap-3">
                  <div className={`w-8 h-8 rounded-full ${step.color} flex items-center justify-center shrink-0 shadow-lg`}>
                    <span className="text-[11px] font-extrabold text-white">{step.num}</span>
                  </div>
                  <div className="flex-1 min-w-0">
                    <p className="text-xs font-semibold text-white truncate">{step.label}</p>
                  </div>
                  {idx < flowSteps.length - 1 && (
                    <ArrowRight className="w-3 h-3 text-[oklch(0.35,0.04,290)] shrink-0" />
                  )}
                </div>
              ))}
            </div>
          )}
        </div>

        {/* Important Notes */}
        <div className="rounded-2xl bg-red-500/5 border border-red-500/15 p-4 space-y-2">
          <div className="flex items-center gap-2">
            <AlertTriangle className="w-4 h-4 text-red-400" />
            <span className="text-sm font-bold text-red-400">Important Notes</span>
          </div>
          <div className="space-y-1.5 text-xs text-[oklch(0.60,0.04,290)] leading-relaxed">
            <p>→ Har page me <span className="text-red-400 font-semibold">HostUID Protection</span> hai — koi dusra host aapki tournament me access nahi kar sakta.</p>
            <p>→ Saare amounts <span className="text-green-400 font-semibold">Coins</span> me hain (paisa directly nahi dikhta).</p>
            <p>→ Wallet balance <span className="text-cyan-400 font-semibold">realtime</span> update hota hai.</p>
            <p>→ Prize Distribution ke liye wallet me <span className="text-yellow-400 font-semibold">sufficient balance</span> hona zaroori hai.</p>
          </div>
        </div>

        {/* Steps */}
        <div className="space-y-3">
          <h2 className="text-lg font-extrabold text-white">All Steps — Detail Guide</h2>
          {steps.map((step) => {
            const isOpen = expandedStep === step.id;
            return (
              <div
                key={step.id}
                className={`rounded-2xl border ${isOpen ? step.borderColor : 'border-[oklch(0.25,0.05,290)]'} overflow-hidden transition-all duration-300`}
              >
                {/* Step Header */}
                <button
                  onClick={() => setExpandedStep(isOpen ? null : step.id)}
                  className={`w-full flex items-center gap-3 px-4 py-3.5 text-left transition-colors ${isOpen ? step.bgColor : 'hover:bg-[oklch(0.14,0.03,290)]'}`}
                >
                  <div className={`w-9 h-9 rounded-xl bg-gradient-to-br ${step.color} flex items-center justify-center shrink-0 shadow-lg`}>
                    {step.icon}
                  </div>
                  <div className="flex-1 min-w-0">
                    <div className="flex items-center gap-2">
                      <span className="text-[10px] font-bold text-[oklch(0.45,0.04,290)]">STEP {step.id}</span>
                      {isOpen && (
                        <Link href={step.page} className="text-[10px] text-cyan-400 hover:underline" onClick={(e) => e.stopPropagation()}>
                          Open Page →
                        </Link>
                      )}
                    </div>
                    <p className={`text-sm font-bold ${isOpen ? 'text-white' : 'text-[oklch(0.70,0.04,290)]'} leading-tight mt-0.5`}>
                      {step.title}
                    </p>
                    {!isOpen && (
                      <p className="text-[10px] text-[oklch(0.45,0.04,290)] mt-0.5">{step.subtitle}</p>
                    )}
                  </div>
                  <ChevronDown className={`w-4 h-4 text-[oklch(0.40,0.04,290)] shrink-0 transition-transform duration-300 ${isOpen ? 'rotate-180' : ''}`} />
                </button>

                {/* Step Content */}
                {isOpen && (
                  <div className="px-4 pb-4 pt-1 space-y-2.5">
                    <div className="h-px bg-[oklch(0.25,0.05,290)] mb-2" />
                    {step.content.map((item, idx) => {
                      if (item.type === 'heading') {
                        return (
                          <div key={idx} className="pt-2">
                            <p className="text-xs font-bold text-white mt-1">{item.value}</p>
                          </div>
                        );
                      }
                      if (item.type === 'arrow') {
                        return (
                          <div key={idx} className="flex items-start gap-2.5">
                            <ArrowRight className={`w-3.5 h-3.5 ${step.textColor} shrink-0 mt-0.5`} />
                            <p className="text-xs text-[oklch(0.60,0.04,290)] leading-relaxed">{item.value}</p>
                          </div>
                        );
                      }
                      if (item.type === 'tip') {
                        return (
                          <div key={idx} className="flex items-start gap-2.5 bg-green-500/5 border border-green-500/10 rounded-lg px-3 py-2">
                            <CheckCircle2 className="w-3.5 h-3.5 text-green-400 shrink-0 mt-0.5" />
                            <p className="text-xs text-green-300/80 leading-relaxed">{item.value}</p>
                          </div>
                        );
                      }
                      if (item.type === 'warn') {
                        return (
                          <div key={idx} className="flex items-start gap-2.5 bg-red-500/5 border border-red-500/10 rounded-lg px-3 py-2">
                            <XCircle className="w-3.5 h-3.5 text-red-400 shrink-0 mt-0.5" />
                            <p className="text-xs text-red-300/80 leading-relaxed">{item.value}</p>
                          </div>
                        );
                      }
                      // text
                      return (
                        <p key={idx} className="text-xs text-[oklch(0.60,0.04,290)] leading-relaxed">{item.value}</p>
                      );
                    })}
                  </div>
                )}
              </div>
            );
          })}
        </div>

        {/* Completion */}
        <div className="rounded-2xl bg-gradient-to-r from-green-500 to-emerald-600 p-5 text-center shadow-lg shadow-green-500/20">
          <p className="text-2xl font-extrabold text-white">✅ PROCESS COMPLETE!</p>
          <p className="text-sm text-white/70 mt-1">
            Step 1 se 7 tak follow karo → Tournament successfully host ho jayega!
          </p>
          <Link
            href="/"
            className="inline-flex items-center gap-2 mt-3 px-5 py-2.5 rounded-xl bg-white/15 hover:bg-white/25 transition-colors text-white font-semibold text-sm"
          >
            Host Panel Dashboard pe jaayein →
          </Link>
        </div>

        {/* Footer */}
        <div className="text-center py-4">
          <p className="text-[10px] text-[oklch(0.30,0.04,290)]">
            EDMFIRE Host Panel Tutorial — v1.0
          </p>
        </div>
      </div>
    </div>
  );
}
