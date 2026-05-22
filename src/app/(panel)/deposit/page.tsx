'use client';

import { useState, useRef } from 'react';
import { QRCodeCanvas } from 'qrcode.react';
import { Input } from '@/components/ui/input';
import { Button } from '@/components/ui/button';
import { useAuth } from '@/context/AuthContext';
import { toast } from 'sonner';
import {
  Wallet,
  QrCode,
  Download,
  Shield,
  Loader2,
  CheckCircle2,
  XCircle,
  IndianRupee,
  Info,
} from 'lucide-react';

// ═══════════════════════════════════════════════════
// BharatPe UPI — from Vercel env or fallback
// ═══════════════════════════════════════════════════
const BHARATPE_UPI = process.env.NEXT_PUBLIC_BHARATPE_UPI || 'BHARATPE.8I0D0O8Q5N01315@fbpe';

export default function DepositPage() {
  const { user } = useAuth();
  const qrDivRef = useRef<HTMLDivElement>(null);

  // ── State ──
  const [amount, setAmount] = useState('');
  const [upiString, setUpiString] = useState('');
  const [qrVisible, setQrVisible] = useState(false);
  const [utr, setUtr] = useState('');
  const [verifying, setVerifying] = useState(false);
  const [result, setResult] = useState<{
    success: boolean;
    message: string;
    amount?: number;
    bonusCoins?: number;
    totalCoins?: number;
    transactionId?: string;
  } | null>(null);

  // ═══════════════════════════════════════════════════
  // STEP 1 — Generate QR from amount
  // ═══════════════════════════════════════════════════
  const handleGenerateQR = () => {
    const amt = parseFloat(amount);
    if (!amt || amt <= 0) {
      toast.error('Enter a valid amount');
      return;
    }

    const url = `upi://pay?pa=${BHARATPE_UPI}&pn=EDMFire&am=${amt}&tn=HostDeposit&cu=INR`;
    setUpiString(url);
    setQrVisible(true);
    setResult(null);
    setUtr('');
    toast.success('QR Generated! Scan and pay');
  };

  // ═══════════════════════════════════════════════════
  // STEP 2 — Download QR as PNG
  // ═══════════════════════════════════════════════════
  const handleDownloadQR = () => {
    const canvas = qrDivRef.current?.querySelector('canvas');
    if (!canvas) {
      toast.error('QR not ready');
      return;
    }

    const dataUrl = canvas.toDataURL('image/png');
    const link = document.createElement('a');
    link.download = `EDMFire_Deposit_${amount}.png`;
    link.href = dataUrl;
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
    toast.success('QR Downloaded!');
  };

  // ═══════════════════════════════════════════════════
  // STEP 3 — Verify UTR via backend
  // ═══════════════════════════════════════════════════
  const handleVerifyUTR = async () => {
    const cleaned = utr.replace(/[^0-9]/g, '');
    if (cleaned.length !== 12) {
      toast.error('Enter valid 12-digit UTR');
      return;
    }
    if (!user) {
      toast.error('Not logged in');
      return;
    }

    setVerifying(true);
    setResult(null);

    try {
      const idToken = await user.getIdToken();
      const res = await fetch('/api/verify-deposit', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${idToken}`,
        },
        body: JSON.stringify({ uid: user.uid, utr: cleaned }),
      });

      const data = await res.json();

      if (data.success) {
        setResult({
          success: true,
          message: `Rs.${data.amount} deposited! +${data.bonusCoins} bonus = ${data.totalCoins} Coins`,
          amount: data.amount,
          bonusCoins: data.bonusCoins,
          totalCoins: data.totalCoins,
          transactionId: data.transactionId,
        });
        toast.success('Payment Verified! Coins added to wallet.');
      } else {
        setResult({
          success: false,
          message: data.message || 'Verification failed',
        });
        toast.error('Verification Failed', { description: data.message });
      }
    } catch (e: any) {
      setResult({ success: false, message: 'Network error. Try again.' });
      toast.error('Error', { description: e.message });
    } finally {
      setVerifying(false);
    }
  };

  // ═══════════════════════════════════════════════════
  // UI
  // ═══════════════════════════════════════════════════
  return (
    <div className="min-h-screen pb-20 lg:pb-6">
      {/* Header */}
      <header className="bg-gradient-to-r from-green-500 to-emerald-600 px-4 lg:px-6 py-6 sticky top-0 z-20">
        <div className="max-w-4xl mx-auto">
          <h1 className="text-xl lg:text-2xl font-extrabold text-white flex items-center gap-2">
            <Wallet className="w-6 h-6" />
            Deposit Coins
          </h1>
          <p className="text-white/60 text-sm mt-1">Add coins to your host wallet via UPI</p>
        </div>
      </header>

      <div className="max-w-4xl mx-auto px-4 lg:px-6 py-6 space-y-5">

        {/* ── How It Works ── */}
        <div className="rounded-2xl bg-[oklch(0.18,0.04,290)] border border-[oklch(0.30,0.06,290)] p-4">
          <div className="flex items-center gap-2 mb-3">
            <Info className="w-4 h-4 text-green-400" />
            <p className="text-xs font-bold text-[oklch(0.70,0.04,290)]">How It Works</p>
          </div>
          <div className="grid grid-cols-1 gap-2">
            {[
              { step: '1', text: 'Enter amount and generate QR code' },
              { step: '2', text: 'Download QR, scan from any UPI app and pay' },
              { step: '3', text: 'Enter 12-digit bank UTR and verify' },
            ].map((item) => (
              <div key={item.step} className="flex items-start gap-3">
                <div className="w-6 h-6 rounded-full bg-green-500/20 flex items-center justify-center shrink-0 mt-0.5">
                  <span className="text-[10px] font-bold text-green-400">{item.step}</span>
                </div>
                <p className="text-xs text-[oklch(0.55,0.04,290)] leading-relaxed">{item.text}</p>
              </div>
            ))}
          </div>
        </div>

        {/* ═══ Step 1 — Amount Input ═══ */}
        <div className="rounded-2xl bg-[oklch(0.18,0.04,290)] border border-[oklch(0.30,0.06,290)] p-4 lg:p-5 space-y-4">
          <div className="flex items-center gap-2">
            <div className="w-8 h-8 rounded-lg bg-green-500/20 flex items-center justify-center">
              <IndianRupee className="w-4 h-4 text-green-400" />
            </div>
            <p className="text-sm font-bold text-[oklch(0.70,0.04,290)]">Step 1 — Enter Amount</p>
          </div>

          <div className="space-y-2">
            <Input
              type="number"
              step="any"
              min="1"
              value={amount}
              onChange={(e) => setAmount(e.target.value)}
              placeholder="Enter amount (e.g. 50, 100, 199)"
              className="bg-[oklch(0.22,0.04,290)] border-[oklch(0.35,0.06,290)] text-white placeholder:text-[oklch(0.40,0.04,290)] h-12 rounded-xl text-lg font-mono"
            />
            <p className="text-[10px] text-[oklch(0.40,0.04,290)]">Minimum Rs.25 — Bonus auto-calculated on verification</p>
          </div>

          {/* Quick Amount Buttons */}
          <div className="flex flex-wrap gap-2">
            {[25, 50, 99, 199, 501, 1001].map((val) => (
              <button
                key={val}
                onClick={() => setAmount(String(val))}
                className={`px-3 py-1.5 rounded-lg text-xs font-semibold transition-all ${
                  amount === String(val)
                    ? 'bg-green-500/20 text-green-400 border border-green-500/30'
                    : 'bg-[oklch(0.22,0.04,290)] border border-[oklch(0.30,0.06,290)] text-[oklch(0.55,0.04,290)] hover:border-[oklch(0.40,0.06,290)]'
                }`}
              >
                Rs.{val}
              </button>
            ))}
          </div>

          <Button
            onClick={handleGenerateQR}
            disabled={!amount || parseFloat(amount) <= 0}
            className="w-full h-12 rounded-xl bg-gradient-to-r from-green-500 to-emerald-600 text-white font-semibold shadow-lg shadow-green-500/20 disabled:opacity-40 disabled:cursor-not-allowed"
          >
            <QrCode className="w-5 h-5 mr-2" />
            Generate QR Code
          </Button>
        </div>

        {/* ═══ Step 2 — QR Display ═══ */}
        {qrVisible && upiString && (
          <div className="rounded-2xl bg-[oklch(0.18,0.04,290)] border border-green-500/20 p-4 lg:p-5 space-y-4">
            <div className="flex items-center gap-2">
              <div className="w-8 h-8 rounded-lg bg-green-500/20 flex items-center justify-center">
                <QrCode className="w-4 h-4 text-green-400" />
              </div>
              <p className="text-sm font-bold text-[oklch(0.70,0.04,290)]">Step 2 — Scan & Pay</p>
            </div>

            {/* QR Code */}
            <div ref={qrDivRef} className="flex justify-center">
              <div className="bg-white rounded-2xl p-4 inline-block shadow-lg shadow-black/20">
                <QRCodeCanvas
                  value={upiString}
                  size={220}
                  bgColor="#ffffff"
                  fgColor="#000000"
                  level="M"
                  includeMargin={false}
                />
              </div>
            </div>

            {/* Amount + UPI info */}
            <div className="text-center space-y-1">
              <p className="text-white font-extrabold text-2xl">Rs.{amount}</p>
              <p className="text-[10px] text-[oklch(0.45,0.04,290)] font-mono truncate max-w-[280px] mx-auto">
                {BHARATPE_UPI}
              </p>
            </div>

            {/* Download Button */}
            <Button
              onClick={handleDownloadQR}
              className="w-full h-12 rounded-xl bg-[oklch(0.22,0.04,290)] border border-[oklch(0.35,0.06,290)] text-white font-semibold hover:bg-[oklch(0.26,0.04,290)] transition-colors"
            >
              <Download className="w-5 h-5 mr-2" />
              Download QR
            </Button>
          </div>
        )}

        {/* ═══ Step 3 — UTR Verification ═══ */}
        {qrVisible && (
          <div className="rounded-2xl bg-[oklch(0.18,0.04,290)] border border-[oklch(0.30,0.06,290)] p-4 lg:p-5 space-y-4">
            <div className="flex items-center gap-2">
              <div className="w-8 h-8 rounded-lg bg-green-500/20 flex items-center justify-center">
                <Shield className="w-4 h-4 text-green-400" />
              </div>
              <p className="text-sm font-bold text-[oklch(0.70,0.04,290)]">Step 3 — Verify Payment</p>
            </div>

            <div className="space-y-2">
              <Input
                type="text"
                inputMode="numeric"
                maxLength={12}
                value={utr}
                onChange={(e) => setUtr(e.target.value.replace(/[^0-9]/g, '').slice(0, 12))}
                placeholder="Enter 12-digit UTR from bank"
                className="bg-[oklch(0.22,0.04,290)] border-[oklch(0.35,0.06,290)] text-white placeholder:text-[oklch(0.40,0.04,290)] h-12 rounded-xl text-center font-mono text-base tracking-widest"
              />
              <p className="text-[10px] text-[oklch(0.40,0.04,290)]">Enter the 12-digit UTR from your bank payment receipt</p>
            </div>

            <Button
              onClick={handleVerifyUTR}
              disabled={utr.length !== 12 || verifying}
              className="w-full h-12 rounded-xl bg-gradient-to-r from-green-500 to-emerald-600 text-white font-semibold shadow-lg shadow-green-500/20 disabled:opacity-40 disabled:cursor-not-allowed"
            >
              {verifying ? (
                <><Loader2 className="w-5 h-5 mr-2 animate-spin" /> Verifying UTR...</>
              ) : (
                <><Shield className="w-5 h-5 mr-2" /> Verify Payment</>
              )}
            </Button>
          </div>
        )}

        {/* ═══ Result ═══ */}
        {result && (
          <div className={`rounded-2xl border p-4 lg:p-5 space-y-3 ${
            result.success
              ? 'bg-green-500/10 border-green-500/30'
              : 'bg-red-500/10 border-red-500/30'
          }`}>
            <div className="flex items-center gap-2">
              {result.success
                ? <CheckCircle2 className="w-6 h-6 text-green-400" />
                : <XCircle className="w-6 h-6 text-red-400" />
              }
              <p className={`font-bold text-sm ${result.success ? 'text-green-400' : 'text-red-400'}`}>
                {result.success ? 'Payment Verified!' : 'Verification Failed'}
              </p>
            </div>
            <p className="text-sm text-white/80">{result.message}</p>
            {result.success && result.transactionId && (
              <p className="text-[10px] text-[oklch(0.45,0.04,290)] font-mono">
                Transaction ID: {result.transactionId}
              </p>
            )}
          </div>
        )}

      </div>
    </div>
  );
}
