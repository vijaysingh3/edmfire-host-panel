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
  Loader2,
  CheckCircle2,
  MapPin,
  Smartphone,
  X,
  Info,
  Check,
  AlertCircle,
  ShieldCheck,
  Copy,
  Ticket,
} from 'lucide-react';
import Image from 'next/image';
import { collection, addDoc, serverTimestamp } from 'firebase/firestore';
import { db } from '@/lib/firebase';

const MAX_IMAGE_SIZE = 5 * 1024 * 1024; // 5MB

const TOTAL_STEPS = 7;

// email regex pattern
const EMAIL_REGEX = /^[a-zA-Z0-9._%+\-]+@[a-zA-Z0-9.\-]+\.[a-zA-Z]{2,}$/;

// Helper: get or create device ID from localStorage
function getOrCreateDeviceId(): string {
  if (typeof window === 'undefined') return '';
  const key = 'edmf_device_id';
  let id = localStorage.getItem(key);
  if (!id) {
    id = 'DEV_' + Date.now().toString(36) + '_' + Math.random().toString(36).substring(2, 10);
    localStorage.setItem(key, id);
  }
  return id;
}

// Helper: detect device info from browser (safe for SSR)
function getDeviceInfo(): { type: string; os: string; browser: string; memory: string; cores: number; screen: string } | null {
  if (typeof navigator === 'undefined') return null;
  const ua = navigator.userAgent;
  let type = 'Desktop PC';
  let os = 'Unknown';
  let browser = 'Unknown';

  // Device type
  if (/Mobile|Android/i.test(ua)) type = 'Android Phone';
  if (/iPhone/i.test(ua)) type = 'iPhone';
  else if (/iPad|Tablet/i.test(ua)) type = 'Tablet';
  else if (/Mobile|Android/i.test(ua)) type = 'Android Phone';
  else if (/Macintosh/i.test(ua) && 'ontouchend' in document) type = 'Laptop';
  else if (/Macintosh|Windows|Linux/i.test(ua)) type = 'Laptop';

  // OS
  if (/Windows/i.test(ua)) os = 'Windows';
  else if (/Mac OS X/i.test(ua)) os = 'macOS';
  else if (/Android\s([\d.]+)/i.test(ua)) os = 'Android ' + (ua.match(/Android\s([\d.]+)/i)?.[1] || '');
  else if (/iPhone OS ([\d_]+)/i.test(ua)) os = 'iOS ' + (ua.match(/iPhone OS ([\d_]+)/i)?.[1]?.replace(/_/g, '.') || '');
  else if (/Linux/i.test(ua)) os = 'Linux';

  // Browser
  if (/Edg/i.test(ua)) browser = 'Microsoft Edge';
  else if (/OPR|Opera/i.test(ua)) browser = 'Opera';
  else if (/Chrome/i.test(ua) && !/Edg|OPR/i.test(ua)) browser = 'Google Chrome';
  else if (/Safari/i.test(ua) && !/Chrome/i.test(ua)) browser = 'Safari';
  else if (/Firefox/i.test(ua)) browser = 'Firefox';

  // RAM (Chrome only)
  const memory = (navigator as any).deviceMemory ? `${(navigator as any).deviceMemory}GB` : '';
  const cores = navigator.hardwareConcurrency || 0;
  const screenRes = `${window.screen.width}x${window.screen.height}`;

  return { type, os, browser, memory, cores, screen: screenRes };
}

// Helper: reverse geocode lat/lng using free Nominatim API
async function reverseGeocode(lat: number, lon: number): Promise<{ state: string; district: string; city: string }> {
  const res = await fetch(`https://nominatim.openstreetmap.org/reverse?format=json&lat=${lat}&lon=${lon}&addressdetails=1&accept-language=en`, {
    headers: { 'User-Agent': 'EDMFire-HostPanel/1.0' }
  });
  const data = await res.json();
  const addr = data.address || {};
  return {
    state: addr.state || '',
    district: addr.state_district || addr.district || addr.county || '',
    city: addr.city || addr.town || addr.village || addr.hamlet || addr.suburb || '',
  };
}

// step labels with descriptions for user guidance
const stepLabels = [
  { icon: '👤', label: 'Personal Info', desc: 'Tell us about yourself' },
  { icon: '📍', label: 'Location', desc: 'Where are you from?' },
  { icon: '🎮', label: 'Gaming Info', desc: 'Your Free Fire journey' },
  { icon: '💻', label: 'Device Info', desc: 'What do you play on?' },
  { icon: '📸', label: 'Verification', desc: 'Upload your photos' },
  { icon: '✍️', label: 'Message', desc: 'Why do you want to join?' },
  { icon: '✅', label: 'Agreement', desc: 'Accept the terms' },
];

interface FormData {
  fullName: string;
  gender: string;
  age: string;
  mobile: string;
  whatsapp: string;
  gmail: string;
  state: string;
  district: string;
  city: string;
  ffNickname: string;
  playingYears: string;
  hostedBefore: string;
  hostingExperience: string;
  gameModes: string;
  currentRank: string;
  devices: string[];
  primaryDevice: string;
  ramSize: string;
  internetQuality: string;
  canScreenRecord: string;
  whyJoin: string;
}

const initialFormData: FormData = {
  fullName: '',
  gender: '',
  age: '',
  mobile: '',
  whatsapp: '',
  gmail: '',
  state: '',
  district: '',
  city: '',
  ffNickname: '',
  playingYears: '',
  hostedBefore: '',
  hostingExperience: '',
  gameModes: '',
  currentRank: '',
  devices: [],
  primaryDevice: '',
  ramSize: '',
  internetQuality: '',
  canScreenRecord: '',
  whyJoin: '',
};

export default function ApplyPage() {
  const [step, setStep] = useState(1);
  const [agreements, setAgreements] = useState([false, false, false]);
  const [formData, setFormData] = useState<FormData>(initialFormData);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [isSubmitted, setIsSubmitted] = useState(false);
  const [isDetectingLocation, setIsDetectingLocation] = useState(false);
  const [isDetectingDevice, setIsDetectingDevice] = useState(false);
  const [ffScreenshot, setFfScreenshot] = useState<File | null>(null);
  const [selfie, setSelfie] = useState<File | null>(null);
  const [ffPreview, setFfPreview] = useState<string | null>(null);
  const [selfiePreview, setSelfiePreview] = useState<string | null>(null);
  const [uploadingImage, setUploadingImage] = useState<string | null>(null);

  // completed steps tracking (green checkmarks)
  const [completedSteps, setCompletedSteps] = useState<Set<number>>(new Set());

  // submit progress stages
  const [submitStage, setSubmitStage] = useState<string>('');

  // tracking token (Firestore doc ID)
  const [trackingToken, setTrackingToken] = useState('');

  const updateField = (field: keyof FormData, value: string | string[]) => {
    setFormData((prev) => ({ ...prev, [field]: value }));
  };

  const toggleDevice = (device: string) => {
    setFormData((prev) => {
      const devices = prev.devices.includes(device)
        ? prev.devices.filter((d) => d !== device)
        : [...prev.devices, device];
      return { ...prev, devices };
    });
  };

  const toggleAgreement = (index: number) => {
    setAgreements((prev) => {
      const updated = [...prev];
      updated[index] = !updated[index];
      return updated;
    });
  };

  const nextStep = () => {
    if (step < TOTAL_STEPS) {
      // mark current step as completed
      setCompletedSteps(prev => new Set(prev).add(step));
      setStep(step + 1);
    }
  };

  const prevStep = () => {
    if (step > 1) setStep(step - 1);
  };

  // step click handler — only allow completed steps or current step
  const handleStepClick = (targetStep: number) => {
    if (completedSteps.has(targetStep) || targetStep === step) {
      setStep(targetStep);
    } else {
      toast.info(`Complete Step ${step} first`, { description: 'Please fill all required fields to proceed.' });
    }
  };

  const validateCurrentStep = (): boolean => {
    switch (step) {
      case 1:
        if (!formData.fullName.trim()) { toast.error('Please enter your Full Name'); return false; }
        if (!formData.gender) { toast.error('Please select Gender'); return false; }
        if (!formData.age || isNaN(Number(formData.age)) || Number(formData.age) < 10 || Number(formData.age) > 99) {
          toast.error('Please enter a valid Age', { description: 'Age must be between 10 and 99.' });
          return false;
        }
        if (!formData.mobile.trim() || formData.mobile.length !== 10) {
          toast.error('Please enter a valid Mobile Number', { description: 'Indian mobile number must be exactly 10 digits.' });
          return false;
        }
        if (!formData.whatsapp.trim() || formData.whatsapp.length !== 10) {
          toast.error('Please enter a valid WhatsApp Number', { description: 'Indian WhatsApp number must be exactly 10 digits.' });
          return false;
        }
        if (!formData.gmail.trim() || !EMAIL_REGEX.test(formData.gmail.trim())) {
          toast.error('Please enter a valid Gmail Address', { description: 'Enter a valid email like you@gmail.com' });
          return false;
        }
        return true;
      case 2:
        if (!formData.state.trim()) { toast.error('Please enter your State'); return false; }
        if (!formData.district.trim()) { toast.error('Please enter your District'); return false; }
        if (!formData.city.trim()) { toast.error('Please enter your City/Town'); return false; }
        return true;
      case 3:
        if (!formData.playingYears) { toast.error('Please select playing experience'); return false; }
        if (!formData.hostedBefore) { toast.error('Please select hosting experience'); return false; }
        if (formData.hostedBefore === 'yes' && !formData.hostingExperience.trim()) {
          toast.error('Please describe your hosting experience');
          return false;
        }
        if (!formData.gameModes) { toast.error('Please select a game mode'); return false; }
        if (!formData.currentRank) { toast.error('Please select your current rank'); return false; }
        return true;
      case 4:
        if (formData.devices.length === 0) { toast.error('Please select at least one device'); return false; }
        if (!formData.primaryDevice.trim()) { toast.error('Please enter your Primary Device Name'); return false; }
        if (!formData.ramSize) { toast.error('Please select RAM size'); return false; }
        if (!formData.internetQuality) { toast.error('Please select internet quality'); return false; }
        if (!formData.canScreenRecord) { toast.error('Please select screen record option'); return false; }
        return true;
      case 5:
        if (!ffScreenshot) { toast.error('Please upload your FF Profile Screenshot'); return false; }
        if (!selfie) { toast.error('Please upload your Selfie'); return false; }
        return true;
      case 6:
        if (!formData.whyJoin.trim()) { toast.error('Please write why you want to become a host'); return false; }
        return true;
      default:
        return true;
    }
  };

  const handleNext = () => {
    if (validateCurrentStep()) {
      nextStep();
    }
  };

  // Helper: image size color indicator
  const getImageSizeColor = (sizeInBytes: number): { color: string; bg: string; label: string } => {
    const mb = sizeInBytes / (1024 * 1024);
    if (mb <= 1.0) return { color: 'text-green-400', bg: 'bg-green-500/80', label: 'Good size' };
    if (mb <= 3.0) return { color: 'text-amber-400', bg: 'bg-amber-500/80', label: 'Medium size' };
    return { color: 'text-red-400', bg: 'bg-red-500/80', label: 'Near limit' };
  };

  // Handle image file selection with size validation
  const handleImageSelect = (type: 'screenshot' | 'selfie') => {
    const input = document.createElement('input');
    input.type = 'file';
    input.accept = 'image/png,image/jpeg,image/webp';
    input.onchange = async (e: any) => {
      const file = e.target.files?.[0];
      if (!file) return;
      if (file.size > MAX_IMAGE_SIZE) {
        toast.error('Image too large!', { description: `Max size is 5MB. Your image is ${(file.size / 1024 / 1024).toFixed(1)}MB. Try compressing or selecting another image.` });
        return;
      }
      const sizeInfo = getImageSizeColor(file.size);
      if (type === 'screenshot') {
        setFfScreenshot(file);
        setFfPreview(URL.createObjectURL(file));
        toast.success('Screenshot selected', { description: `${sizeInfo.label} — ${(file.size / 1024).toFixed(0)}KB (${file.type.split('/')[1].toUpperCase()})` });
      } else {
        setSelfie(file);
        setSelfiePreview(URL.createObjectURL(file));
        toast.success('Selfie selected', { description: `${sizeInfo.label} — ${(file.size / 1024).toFixed(0)}KB (${file.type.split('/')[1].toUpperCase()})` });
      }
    };
    input.click();
  };

  const removeImage = (type: 'screenshot' | 'selfie') => {
    if (type === 'screenshot') {
      setFfScreenshot(null);
      setFfPreview(null);
      toast.info('Screenshot removed', { description: 'You can upload a new one.' });
    } else {
      setSelfie(null);
      setSelfiePreview(null);
      toast.info('Selfie removed', { description: 'You can upload a new one.' });
    }
  };

  // Convert File to base64 string
  const fileToBase64 = (file: File): Promise<string> => {
    return new Promise((resolve, reject) => {
      const reader = new FileReader();
      reader.onload = () => resolve(reader.result as string);
      reader.onerror = reject;
      reader.readAsDataURL(file);
    });
  };

  // Upload images via Cloud Function
  const uploadImagesViaFunction = async (files: { file: File; label: string }[]): Promise<{ label: string; url: string }[]> => {
    const uploadUrl = process.env.NEXT_PUBLIC_IMAGE_UPLOAD_URL;
    if (!uploadUrl) throw new Error('Image upload service not configured');

    const images = [];
    for (const item of files) {
      const base64 = await fileToBase64(item.file);
      images.push({ base64 });
    }

    console.log('📸 [Upload] Sending', images.length, 'image(s) to Cloud Function...');
    const response = await fetch(uploadUrl, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ folder: 'hostRequests', images }),
    });

    if (!response.ok) {
      const errText = await response.text();
      throw new Error(`Upload failed (${response.status}): ${errText}`);
    }

    const result = await response.json();
    console.log('📸 [Upload] Response:', JSON.stringify(result));

    if (!result.success || result.successful === 0) {
      throw new Error('Image upload failed. Please try again.');
    }

    return result.uploaded.map((u: any, i: number) => ({ label: files[i].label, url: u.url }));
  };

  const handleSubmit = async () => {
    if (!agreements.every(Boolean)) {
      toast.error('Please accept all agreements');
      return;
    }

    setIsSubmitting(true);
    console.log('🔥 [Submit] Started — uploading images via Cloud Function...');

    try {
      // Multi-stage submit progress
      setSubmitStage('validating');
      await new Promise(r => setTimeout(r, 600)); // small delay for UI

      setSubmitStage('uploading-1');
      let ffScreenshotUrl = '';
      let selfieUrl = '';

      const filesToUpload: { file: File; label: string }[] = [];
      if (ffScreenshot) filesToUpload.push({ file: ffScreenshot, label: 'screenshot' });
      if (selfie) filesToUpload.push({ file: selfie, label: 'selfie' });

      if (filesToUpload.length > 0) {
        setUploadingImage('uploading');
        const uploaded = await uploadImagesViaFunction(filesToUpload);
        setSubmitStage('uploading-2');
        for (const item of uploaded) {
          if (item.label === 'screenshot') ffScreenshotUrl = item.url;
          if (item.label === 'selfie') selfieUrl = item.url;
        }
        console.log('📸 [Upload] Screenshot URL:', ffScreenshotUrl);
        console.log('📸 [Upload] Selfie URL:', selfieUrl);
        setUploadingImage(null);
      }

      setSubmitStage('saving');
      console.log('🔥 [Submit] Saving to Firestore...');

      const applicationData: Record<string, any> = {
        fullName: formData.fullName.trim(),
        gender: formData.gender,
        age: Number(formData.age),
        mobile: formData.mobile.trim(),
        whatsapp: formData.whatsapp.trim(),
        gmail: formData.gmail.trim().toLowerCase(),
        state: formData.state.trim(),
        district: formData.district.trim(),
        city: formData.city.trim(),
        ffNickname: formData.ffNickname.trim(),
        playingYears: formData.playingYears,
        hostedBefore: formData.hostedBefore,
        hostingExperience: formData.hostingExperience.trim(),
        gameModes: formData.gameModes,
        currentRank: formData.currentRank,
        devices: formData.devices,
        primaryDevice: formData.primaryDevice.trim(),
        ramSize: formData.ramSize,
        internetQuality: formData.internetQuality,
        canScreenRecord: formData.canScreenRecord,
        whyJoin: formData.whyJoin.trim(),
        status: 'pending',
        createdAt: serverTimestamp(),
      };
      if (ffScreenshotUrl) applicationData.ffScreenshotUrl = ffScreenshotUrl;
      if (selfieUrl) applicationData.selfieUrl = selfieUrl;

      // Save device ID for future status tracking
      applicationData.deviceId = getOrCreateDeviceId();

      const docRef = await addDoc(collection(db, 'applications'), applicationData);
      console.log('🔥 [Submit] SUCCESS! Doc ID:', docRef.id);

      // Save tracking token for success screen
      setTrackingToken(docRef.id);

      setSubmitStage('done');
      await new Promise(r => setTimeout(r, 800));

      setIsSubmitted(true);
      setSubmitStage('');
      toast.success('Application Submitted Successfully!', {
        description: 'EDMFire team will review your application soon.',
      });
    } catch (error: any) {
      console.error('🔥 [ERROR] Submission failed:', error);
      setSubmitStage('');
      toast.error('Submission Failed', {
        description: error?.message || 'Something went wrong. Please try again.',
      });
    } finally {
      setIsSubmitting(false);
      setUploadingImage(null);
    }
  };

  const progressPercent = (step / TOTAL_STEPS) * 100;

  const inputClass = "bg-[oklch(0.22,0.04,290)] border-[oklch(0.30,0.06,290)] text-white placeholder:text-[oklch(0.40,0.04,290)]";
  const inputValidClass = "bg-[oklch(0.22,0.04,290)] border-green-500/50 text-white placeholder:text-[oklch(0.40,0.04,290)]";
  const inputInvalidClass = "bg-[oklch(0.22,0.04,290)] border-red-500/50 text-white placeholder:text-[oklch(0.40,0.04,290)]";

  // live validation helpers
  const isPhoneValid = (phone: string) => /^\d{10}$/.test(phone);
  const isEmailValid = (email: string) => EMAIL_REGEX.test(email.trim());
  const isAgeValid = (age: string) => { const n = Number(age); return age !== '' && !isNaN(n) && n >= 10 && n <= 99; };

  // Auto-detect location
  const detectLocation = async () => {
    if (!navigator.geolocation) {
      toast.error('Geolocation not supported by your browser');
      return;
    }
    setIsDetectingLocation(true);
    try {
      const pos = await new Promise<GeolocationPosition>((resolve, reject) => {
        navigator.geolocation.getCurrentPosition(resolve, reject, { enableHighAccuracy: true, timeout: 10000 });
      });
      const { latitude, longitude } = pos.coords;
      console.log('📍 [Location] GPS:', latitude, longitude);
      const location = await reverseGeocode(latitude, longitude);
      console.log('📍 [Location] Reverse geocode:', location);
      if (location.state || location.district || location.city) {
        setFormData(prev => ({
          ...prev,
          state: location.state || prev.state,
          district: location.district || prev.district,
          city: location.city || prev.city,
        }));
        toast.success('Location detected!', { description: `${location.city}, ${location.district}, ${location.state}` });
      } else {
        toast.error('Could not determine your location. Please fill manually.');
      }
    } catch (err: any) {
      console.error('📍 [Location] Error:', err.message);
      if (err.code === 1) {
        toast.error('Location permission denied. Please fill manually.');
      } else if (err.code === 2) {
        toast.error('Location unavailable. Please fill manually.');
      } else if (err.code === 3) {
        toast.error('Location request timed out. Please fill manually.');
      } else {
        toast.error('Failed to detect location. Please fill manually.');
      }
    } finally {
      setIsDetectingLocation(false);
    }
  };

  // Auto-detect device info
  const detectDevice = () => {
    setIsDetectingDevice(true);
    try {
      const info = getDeviceInfo();
      console.log('📱 [Device] Raw info:', info);

      if (!info) {
        toast.error('Device detection not supported in this browser.');
        setIsDetectingDevice(false);
        return;
      }

      // Set device type checkbox
      const detectedDevice = info.type;
      const newDevices = formData.devices.includes(detectedDevice)
        ? formData.devices
        : [...formData.devices, detectedDevice];

      // Build primary device name
      let primaryName = '';
      if (info.type === 'Android Phone') primaryName = info.os;
      else if (info.type === 'iPhone') primaryName = info.os;
      else if (info.type === 'Laptop') primaryName = info.os + ' Laptop';
      else if (info.type === 'Desktop PC') primaryName = info.os + ' PC';
      else if (info.type === 'Tablet') primaryName = info.os + ' Tablet';

      // Map deviceMemory to RAM select value
      let ramValue = '';
      if (info.memory) {
        const gb = parseInt(info.memory);
        if (gb <= 2) ramValue = '2';
        else if (gb === 3) ramValue = '3';
        else if (gb === 4) ramValue = '4';
        else if (gb <= 6) ramValue = '6';
        else if (gb <= 8) ramValue = '8';
        else ramValue = '12+';
      }

      const updates: Partial<FormData> = { devices: newDevices };
      if (primaryName) updates.primaryDevice = primaryName;
      if (ramValue) updates.ramSize = ramValue;

      setFormData(prev => ({ ...prev, ...updates }));

      console.log('📱 [Device] Applied updates:', updates);
      const details = [info.type, info.os, info.browser, info.memory ? `RAM: ${info.memory}` : '', `${info.cores} cores`, info.screen].filter(Boolean).join(' | ');
      toast.success('Device detected!', { description: details });
    } catch (err: any) {
      console.error('📱 [Device] Error:', err);
      toast.error('Could not detect device info.');
    } finally {
      setIsDetectingDevice(false);
    }
  };

  // Helper component: info guide text below fields
  const FieldGuide = ({ text }: { text: string }) => (
    <p className="flex items-center gap-1 text-[10px] text-[oklch(0.50,0.04,290)]">
      <Info className="w-3 h-3 shrink-0" />
      <span>{text}</span>
    </p>
  );

  // Success screen
  if (isSubmitted) {
    return (
      <div className="min-h-screen bg-[oklch(0.12,0.02,290)] flex items-center justify-center px-4">
        <div className="max-w-md w-full text-center space-y-6">
          <div className="w-20 h-20 mx-auto rounded-full bg-green-500/10 border border-green-500/30 flex items-center justify-center">
            <CheckCircle2 className="w-10 h-10 text-green-400" />
          </div>
          <div className="space-y-2">
            <h1 className="text-2xl font-extrabold text-white">Application Submitted!</h1>
            <p className="text-sm text-[oklch(0.60,0.04,290)]">
              Thank you, <span className="text-violet-300 font-semibold">{formData.fullName}</span>! Your host application has been received.
            </p>
            <p className="text-xs text-[oklch(0.50,0.04,290)]">
              EDMFire team will review your application and contact you on WhatsApp within 24-48 hours.
            </p>
          </div>

          {/* Tracking Token Card */}
          {trackingToken && (
            <div className="rounded-xl bg-violet-500/10 border border-violet-500/25 p-4 space-y-2">
              <div className="flex items-center justify-center gap-2">
                <Ticket className="w-4 h-4 text-violet-400" />
                <p className="text-xs font-bold text-violet-300">Your Tracking Token</p>
              </div>
              <div className="flex items-center justify-center gap-2">
                <p className="text-lg font-mono font-extrabold text-white tracking-wider">{trackingToken}</p>
                <button
                  onClick={() => {
                    navigator.clipboard.writeText(trackingToken);
                    toast.success('Copied!');
                  }}
                  className="p-1.5 rounded-lg bg-violet-500/20 hover:bg-violet-500/30 transition-colors"
                >
                  <Copy className="w-3.5 h-3.5 text-violet-300" />
                </button>
              </div>
              <p className="text-[10px] text-[oklch(0.50,0.04,290)]">
                Save this token. You can check your application status later using this token, your phone number, or email.
              </p>
            </div>
          )}

          <div className="flex gap-3">
            <a
              href="/login"
              className="flex-1 h-12 rounded-xl bg-gradient-to-r from-violet-600 to-indigo-700 hover:from-violet-700 hover:to-indigo-800 text-white font-semibold shadow-lg shadow-violet-500/20 flex items-center justify-center"
            >
              Go to Login
            </a>
            <button
              onClick={() => { setIsSubmitted(false); setTrackingToken(''); setFormData(initialFormData); setStep(1); setCompletedSteps(new Set()); setAgreements([false, false, false]); setFfScreenshot(null); setSelfie(null); setFfPreview(null); setSelfiePreview(null); }}
              className="flex-1 h-12 rounded-xl bg-[oklch(0.22,0.04,290)] border border-[oklch(0.30,0.06,290)] text-[oklch(0.70,0.04,290)] font-medium"
            >
              New Application
            </button>
          </div>
        </div>
      </div>
    );
  }

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
        {/* progress bar with green checkmarks */}
        <div className="space-y-2">
          <div className="flex justify-between text-[10px] text-[oklch(0.55,0.04,290)] font-medium">
            <span>Step {step} of {TOTAL_STEPS}</span>
            <span>{Math.round(progressPercent)}%</span>
          </div>
          <div className="h-2.5 rounded-full bg-[oklch(0.20,0.04,290)] overflow-hidden">
            <div
              className="h-full rounded-full bg-gradient-to-r from-green-400 via-violet-500 to-indigo-600 transition-all duration-500"
              style={{ width: `${progressPercent}%` }}
            />
          </div>
        </div>

        {/* step indicators with green checkmarks and disabled future steps */}
        <div className="flex gap-1.5 overflow-x-auto pb-1">
          {stepLabels.map((s, i) => {
            const stepNum = i + 1;
            const isCompleted = completedSteps.has(stepNum);
            const isCurrent = stepNum === step;
            const isFuture = stepNum > step && !isCompleted;
            return (
              <button
                key={i}
                onClick={() => handleStepClick(stepNum)}
                disabled={isFuture}
                className={`flex items-center gap-1.5 px-3 py-1.5 rounded-full text-[10px] font-medium whitespace-nowrap shrink-0 transition-all ${
                  isFuture
                    ? 'bg-[oklch(0.18,0.04,290)] text-[oklch(0.35,0.04,290)] border border-[oklch(0.22,0.05,290)] cursor-not-allowed opacity-50'
                    : isCurrent
                    ? 'bg-violet-500/20 text-violet-300 border border-violet-500/30'
                    : 'bg-green-500/10 text-green-400 border border-green-500/20'
                }`}
              >
                <span className="w-4 h-4 flex items-center justify-center">
                  {isCompleted ? (
                    <Check className="w-3.5 h-3.5 text-green-400" />
                  ) : isFuture ? (
                    <span className="text-[oklch(0.35,0.04,290)]">{s.icon}</span>
                  ) : (
                    <span>{s.icon}</span>
                  )}
                </span>
                <span className="hidden sm:inline">{s.label}</span>
              </button>
            );
          })}
        </div>

        {/* form card */}
        <Card className="bg-[oklch(0.18,0.04,290)] border-[oklch(0.30,0.06,290)]">
          <CardHeader className="pb-3">
            <CardTitle className="text-base text-white flex items-center gap-2">
              <span className="text-lg">{stepLabels[step - 1].icon}</span>
              <div>
                <span>Step {step} — {stepLabels[step - 1].label}</span>
                <p className="text-[10px] text-[oklch(0.55,0.04,290)] font-normal mt-0.5">{stepLabels[step - 1].desc}</p>
              </div>
            </CardTitle>
          </CardHeader>
          <CardContent>
            {/* STEP 1 — Personal Info */}
            {step === 1 && (
              <div className="space-y-4">
                {/* Full Name */}
                <div className="space-y-1.5">
                  <Label className="text-xs text-[oklch(0.70,0.04,290)]">
                    Full Name <span className="text-red-400">*</span>
                  </Label>
                  <Input value={formData.fullName} onChange={(e) => updateField('fullName', e.target.value)} placeholder="Enter your full name" className={inputClass} />
                  <FieldGuide text="Enter your real name as per your ID proof" />
                </div>
                {/* Gender */}
                <div className="space-y-1.5">
                  <Label className="text-xs text-[oklch(0.70,0.04,290)]">
                    Gender <span className="text-red-400">*</span>
                  </Label>
                  <Select value={formData.gender} onValueChange={(v) => updateField('gender', v)}>
                    <SelectTrigger className={inputClass}><SelectValue placeholder="Select gender" /></SelectTrigger>
                    <SelectContent className="bg-[oklch(0.20,0.04,290)] border-[oklch(0.30,0.06,290)]">
                      <SelectItem value="male">Male</SelectItem>
                      <SelectItem value="female">Female</SelectItem>
                      <SelectItem value="other">Other</SelectItem>
                    </SelectContent>
                  </Select>
                  <FieldGuide text="Select your gender identity" />
                </div>
                {/* Age with live validation */}
                <div className="space-y-1.5">
                  <Label className="text-xs text-[oklch(0.70,0.04,290)]">
                    Age <span className="text-red-400">*</span>
                  </Label>
                  <Input
                    type="number"
                    min={10}
                    max={99}
                    value={formData.age}
                    onChange={(e) => updateField('age', e.target.value.replace(/[^0-9]/g, '').slice(0, 2))}
                    placeholder="e.g. 20"
                    className={
                      formData.age === '' ? inputClass
                      : isAgeValid(formData.age) ? inputValidClass
                      : inputInvalidClass
                    }
                  />
                  <div className="flex items-center justify-between">
                    {formData.age !== '' ? (
                      <p className={`text-[10px] flex items-center gap-1 ${
                        isAgeValid(formData.age) ? 'text-green-400' : 'text-red-400'
                      }`}>
                        {isAgeValid(formData.age) ? <Check className="w-3 h-3" /> : <AlertCircle className="w-3 h-3" />}
                        {isAgeValid(formData.age) ? 'Valid age' : 'Age must be 10-99'}
                      </p>
                    ) : (
                      <FieldGuide text="Minimum age: 10, Maximum: 99" />
                    )}
                  </div>
                </div>
                {/* Mobile + WhatsApp with 10-digit tracking */}
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                  <div className="space-y-1.5">
                    <Label className="text-xs text-[oklch(0.70,0.04,290)]">
                      Mobile Number <span className="text-red-400">*</span>
                    </Label>
                    <div className="relative">
                      <Input
                        type="tel"
                        value={formData.mobile}
                        onChange={(e) => updateField('mobile', e.target.value.replace(/[^0-9]/g, '').slice(0, 10))}
                        placeholder="e.g. 9876543210"
                        className={
                          formData.mobile === '' ? inputClass
                          : isPhoneValid(formData.mobile) ? inputValidClass
                          : inputInvalidClass
                        }
                      />
                      {formData.mobile.length > 0 && (
                        <span className={`absolute right-3 top-1/2 -translate-y-1/2 text-[10px] font-mono ${
                          formData.mobile.length === 10 ? 'text-green-400' : formData.mobile.length >= 8 ? 'text-amber-400' : 'text-[oklch(0.45,0.04,290)]'
                        }`}>
                          {formData.mobile.length}/10
                        </span>
                      )}
                    </div>
                    {formData.mobile.length > 0 && (
                      <p className={`text-[10px] flex items-center gap-1 ${
                        isPhoneValid(formData.mobile) ? 'text-green-400' : 'text-amber-400'
                      }`}>
                        {isPhoneValid(formData.mobile) ? <Check className="w-3 h-3" /> : <AlertCircle className="w-3 h-3" />}
                        {isPhoneValid(formData.mobile) ? 'Valid number' : `${10 - formData.mobile.length} more digit${10 - formData.mobile.length > 1 ? 's' : ''} needed`}
                      </p>
                    )}
                  </div>
                  <div className="space-y-1.5">
                    <Label className="text-xs text-[oklch(0.70,0.04,290)]">
                      WhatsApp Number <span className="text-red-400">*</span>
                    </Label>
                    <div className="relative">
                      <Input
                        type="tel"
                        value={formData.whatsapp}
                        onChange={(e) => updateField('whatsapp', e.target.value.replace(/[^0-9]/g, '').slice(0, 10))}
                        placeholder="e.g. 9876543210"
                        className={
                          formData.whatsapp === '' ? inputClass
                          : isPhoneValid(formData.whatsapp) ? inputValidClass
                          : inputInvalidClass
                        }
                      />
                      {formData.whatsapp.length > 0 && (
                        <span className={`absolute right-3 top-1/2 -translate-y-1/2 text-[10px] font-mono ${
                          formData.whatsapp.length === 10 ? 'text-green-400' : formData.whatsapp.length >= 8 ? 'text-amber-400' : 'text-[oklch(0.45,0.04,290)]'
                        }`}>
                          {formData.whatsapp.length}/10
                        </span>
                      )}
                    </div>
                    {formData.whatsapp.length > 0 && (
                      <p className={`text-[10px] flex items-center gap-1 ${
                        isPhoneValid(formData.whatsapp) ? 'text-green-400' : 'text-amber-400'
                      }`}>
                        {isPhoneValid(formData.whatsapp) ? <Check className="w-3 h-3" /> : <AlertCircle className="w-3 h-3" />}
                        {isPhoneValid(formData.whatsapp) ? 'Valid number' : `${10 - formData.whatsapp.length} more digit${10 - formData.whatsapp.length > 1 ? 's' : ''} needed`}
                      </p>
                    )}
                  </div>
                </div>
                <FieldGuide text="Indian mobile numbers must be exactly 10 digits (without +91 or 0)" />
                {/* Email with live validation */}
                <div className="space-y-1.5">
                  <Label className="text-xs text-[oklch(0.70,0.04,290)]">
                    Gmail Address <span className="text-red-400">*</span>
                  </Label>
                  <div className="relative">
                    <Input
                      type="email"
                      value={formData.gmail}
                      onChange={(e) => updateField('gmail', e.target.value)}
                      placeholder="e.g. you@gmail.com"
                      className={
                        formData.gmail.trim() === '' ? inputClass
                        : isEmailValid(formData.gmail) ? inputValidClass
                        : inputInvalidClass
                      }
                    />
                    {formData.gmail.trim().length > 0 && (
                      <span className={`absolute right-3 top-1/2 -translate-y-1/2`}>
                        {isEmailValid(formData.gmail)
                          ? <Check className="w-4 h-4 text-green-400" />
                          : <AlertCircle className="w-4 h-4 text-red-400" />
                        }
                      </span>
                    )}
                  </div>
                  {formData.gmail.trim().length > 0 && (
                    <p className={`text-[10px] flex items-center gap-1 ${
                      isEmailValid(formData.gmail) ? 'text-green-400' : 'text-red-400'
                    }`}>
                      {isEmailValid(formData.gmail) ? 'Valid email format' : 'Enter a valid email (e.g. name@gmail.com)'}
                    </p>
                  )}
                  <FieldGuide text="We will use this email for official communication" />
                </div>
              </div>
            )}

            {/* STEP 2 — Location */}
            {step === 2 && (
              <div className="space-y-4">
                {/* Auto-detect button */}
                <button
                  type="button"
                  onClick={detectLocation}
                  disabled={isDetectingLocation}
                  className="w-full flex items-center justify-center gap-2 px-4 py-3 rounded-xl bg-blue-500/10 border border-blue-500/25 text-blue-300 text-xs font-medium hover:bg-blue-500/20 transition-all disabled:opacity-50 disabled:cursor-not-allowed"
                >
                  {isDetectingLocation ? (
                    <><Loader2 className="w-4 h-4 animate-spin" /> Detecting your location...</>
                  ) : (
                    <><MapPin className="w-4 h-4" /> Auto Detect My Location</>
                  )}
                </button>
                <p className="text-[10px] text-[oklch(0.45,0.04,290)] text-center">Tap the button above to auto-fill your location, or fill manually below</p>
                <div className="space-y-1.5">
                  <Label className="text-xs text-[oklch(0.70,0.04,290)]">
                    State <span className="text-red-400">*</span>
                  </Label>
                  <Input value={formData.state} onChange={(e) => updateField('state', e.target.value)} placeholder=" " className={inputClass} />
                  <FieldGuide text="Enter your state name" />
                </div>
                <div className="space-y-1.5">
                  <Label className="text-xs text-[oklch(0.70,0.04,290)]">
                    District <span className="text-red-400">*</span>
                  </Label>
                  <Input value={formData.district} onChange={(e) => updateField('district', e.target.value)} placeholder=" " className={inputClass} />
                  <FieldGuide text="Enter your district name" />
                </div>
                <div className="space-y-1.5">
                  <Label className="text-xs text-[oklch(0.70,0.04,290)]">
                    Village / Town / City <span className="text-red-400">*</span>
                  </Label>
                  <Input value={formData.city} onChange={(e) => updateField('city', e.target.value)} placeholder=" " className={inputClass} />
                  <FieldGuide text="Enter your village, town or city name" />
                </div>
              </div>
            )}

            {/* STEP 3 — Gaming Info */}
            {step === 3 && (
              <div className="space-y-4">
                <div className="space-y-1.5">
                  <Label className="text-xs text-[oklch(0.70,0.04,290)]">
                    Free Fire Nickname <span className="text-[oklch(0.45,0.04,290)]">(optional)</span>
                  </Label>
                  <Input value={formData.ffNickname} onChange={(e) => updateField('ffNickname', e.target.value)} placeholder="Your in-game name" className={inputClass} />
                  <FieldGuide text="Your Free Fire in-game nickname (optional but helpful)" />
                </div>
                <div className="space-y-1.5">
                  <Label className="text-xs text-[oklch(0.70,0.04,290)]">
                    How Many Years Have You Played Free Fire? <span className="text-red-400">*</span>
                  </Label>
                  <Select value={formData.playingYears} onValueChange={(v) => updateField('playingYears', v)}>
                    <SelectTrigger className={inputClass}><SelectValue placeholder="Select experience" /></SelectTrigger>
                    <SelectContent className="bg-[oklch(0.20,0.04,290)] border-[oklch(0.30,0.06,290)]">
                      <SelectItem value="lt1">Less than 1 Year</SelectItem>
                      <SelectItem value="1-2">1–2 Years</SelectItem>
                      <SelectItem value="3-4">3–4 Years</SelectItem>
                      <SelectItem value="5+">5+ Years</SelectItem>
                    </SelectContent>
                  </Select>
                </div>
                <div className="space-y-1.5">
                  <Label className="text-xs text-[oklch(0.70,0.04,290)]">
                    Have You Hosted Tournaments Before? <span className="text-red-400">*</span>
                  </Label>
                  <Select value={formData.hostedBefore} onValueChange={(v) => updateField('hostedBefore', v)}>
                    <SelectTrigger className={inputClass}><SelectValue placeholder="Select" /></SelectTrigger>
                    <SelectContent className="bg-[oklch(0.20,0.04,290)] border-[oklch(0.30,0.06,290)]">
                      <SelectItem value="yes">Yes</SelectItem>
                      <SelectItem value="no">No</SelectItem>
                    </SelectContent>
                  </Select>
                </div>
                {formData.hostedBefore === 'yes' && (
                  <div className="space-y-1.5">
                    <Label className="text-xs text-[oklch(0.70,0.04,290)]">
                      Explain Your Experience <span className="text-red-400">*</span>
                    </Label>
                    <Textarea value={formData.hostingExperience} onChange={(e) => updateField('hostingExperience', e.target.value)} placeholder="Describe your tournament hosting experience..." rows={4} className={`${inputClass} resize-none`} />
                    <FieldGuide text="Mention platforms, number of tournaments, room sizes etc." />
                  </div>
                )}
                <div className="space-y-1.5">
                  <Label className="text-xs text-[oklch(0.70,0.04,290)]">
                    Which Modes Can You Manage? <span className="text-red-400">*</span>
                  </Label>
                  <Select value={formData.gameModes} onValueChange={(v) => updateField('gameModes', v)}>
                    <SelectTrigger className={inputClass}><SelectValue placeholder="Select mode" /></SelectTrigger>
                    <SelectContent className="bg-[oklch(0.20,0.04,290)] border-[oklch(0.30,0.06,290)]">
                      <SelectItem value="br">Battle Royale</SelectItem>
                      <SelectItem value="cs">Clash Squad</SelectItem>
                      <SelectItem value="lw">Lone Wolf</SelectItem>
                    </SelectContent>
                  </Select>
                  <FieldGuide text="Select the game mode you are most comfortable hosting" />
                </div>
                <div className="space-y-1.5">
                  <Label className="text-xs text-[oklch(0.70,0.04,290)]">
                    Your Current Rank <span className="text-red-400">*</span>
                  </Label>
                  <Select value={formData.currentRank} onValueChange={(v) => updateField('currentRank', v)}>
                    <SelectTrigger className={inputClass}><SelectValue placeholder="Select rank" /></SelectTrigger>
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
                  <FieldGuide text="Your current Free Fire push rank" />
                </div>
              </div>
            )}

            {/* STEP 4 — Device Info */}
            {step === 4 && (
              <div className="space-y-4">
                {/* Auto-detect button */}
                <button
                  type="button"
                  onClick={detectDevice}
                  disabled={isDetectingDevice}
                  className="w-full flex items-center justify-center gap-2 px-4 py-3 rounded-xl bg-emerald-500/10 border border-emerald-500/25 text-emerald-300 text-xs font-medium hover:bg-emerald-500/20 transition-all disabled:opacity-50 disabled:cursor-not-allowed"
                >
                  {isDetectingDevice ? (
                    <><Loader2 className="w-4 h-4 animate-spin" /> Detecting your device...</>
                  ) : (
                    <><Smartphone className="w-4 h-4" /> Auto Detect My Device</>
                  )}
                </button>
                <p className="text-[10px] text-[oklch(0.45,0.04,290)] text-center">Tap to auto-detect your device info, or fill manually below</p>
                <div className="space-y-1.5">
                  <Label className="text-xs text-[oklch(0.70,0.04,290)]">
                    Which Device Do You Use? <span className="text-red-400">*</span> <span className="text-[oklch(0.45,0.04,290)]">(select multiple if applicable)</span>
                  </Label>
                  <div className="grid grid-cols-2 sm:grid-cols-3 gap-2">
                    {['Android Phone', 'iPhone', 'Laptop', 'Desktop PC', 'Tablet'].map((device) => (
                      <button
                        key={device}
                        onClick={() => toggleDevice(device)}
                        className={`px-3 py-2.5 rounded-xl text-xs font-medium transition-all border ${
                          formData.devices.includes(device)
                            ? 'bg-violet-500/20 text-violet-300 border-violet-500/30'
                            : 'bg-[oklch(0.22,0.04,290)] text-[oklch(0.60,0.04,290)] border-[oklch(0.30,0.06,290)] hover:border-[oklch(0.40,0.06,290)]'
                        }`}
                      >
                        {formData.devices.includes(device) && '✓ '}{device}
                      </button>
                    ))}
                  </div>
                  <FieldGuide text="Select all devices you use to play Free Fire" />
                </div>
                <div className="space-y-1.5">
                  <Label className="text-xs text-[oklch(0.70,0.04,290)]">
                    Primary Device Name <span className="text-red-400">*</span>
                  </Label>
                  <Input value={formData.primaryDevice} onChange={(e) => updateField('primaryDevice', e.target.value)} placeholder="e.g. Vivo T2, HP Laptop, ASUS ROG" className={inputClass} />
                  <FieldGuide text="Your main device model name" />
                </div>
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                  <div className="space-y-1.5">
                    <Label className="text-xs text-[oklch(0.70,0.04,290)]">
                      RAM Size <span className="text-red-400">*</span>
                    </Label>
                    <Select value={formData.ramSize} onValueChange={(v) => updateField('ramSize', v)}>
                      <SelectTrigger className={inputClass}><SelectValue placeholder="Select RAM" /></SelectTrigger>
                      <SelectContent className="bg-[oklch(0.20,0.04,290)] border-[oklch(0.30,0.06,290)]">
                        <SelectItem value="2">2GB</SelectItem>
                        <SelectItem value="3">3GB</SelectItem>
                        <SelectItem value="4">4GB</SelectItem>
                        <SelectItem value="6">6GB</SelectItem>
                        <SelectItem value="8">8GB</SelectItem>
                        <SelectItem value="12+">12GB+</SelectItem>
                      </SelectContent>
                    </Select>
                    <FieldGuide text="Go to Settings > About Phone to check RAM" />
                  </div>
                  <div className="space-y-1.5">
                    <Label className="text-xs text-[oklch(0.70,0.04,290)]">
                      Internet Quality <span className="text-red-400">*</span>
                    </Label>
                    <Select value={formData.internetQuality} onValueChange={(v) => updateField('internetQuality', v)}>
                      <SelectTrigger className={inputClass}><SelectValue placeholder="Select quality" /></SelectTrigger>
                      <SelectContent className="bg-[oklch(0.20,0.04,290)] border-[oklch(0.30,0.06,290)]">
                        <SelectItem value="average">Average</SelectItem>
                        <SelectItem value="good">Good</SelectItem>
                        <SelectItem value="excellent">Excellent</SelectItem>
                      </SelectContent>
                    </Select>
                    <FieldGuide text="Average = frequent lag, Good = smooth, Excellent = no lag ever" />
                  </div>
                </div>
                <div className="space-y-1.5">
                  <Label className="text-xs text-[oklch(0.70,0.04,290)]">
                    Can You Screen Record Matches? <span className="text-red-400">*</span>
                  </Label>
                  <Select value={formData.canScreenRecord} onValueChange={(v) => updateField('canScreenRecord', v)}>
                    <SelectTrigger className={inputClass}><SelectValue placeholder="Select" /></SelectTrigger>
                    <SelectContent className="bg-[oklch(0.20,0.04,290)] border-[oklch(0.30,0.06,290)]">
                      <SelectItem value="yes">Yes</SelectItem>
                      <SelectItem value="no">No</SelectItem>
                    </SelectContent>
                  </Select>
                  <FieldGuide text="Required for recording tournament matches as proof" />
                </div>
              </div>
            )}

            {/* STEP 5 — Verification (Image Upload) */}
            {step === 5 && (
              <div className="space-y-4">
                <div className="rounded-xl bg-violet-500/5 border border-violet-500/20 p-3 space-y-1">
                  <p className="text-[10px] text-[oklch(0.60,0.04,290)] font-medium">Upload your Free Fire profile screenshot and a selfie for verification.</p>
                  <p className="text-[10px] text-[oklch(0.50,0.04,290)]">Max image size: 1.5MB. Formats: PNG, JPG, WEBP.</p>
                  <div className="flex gap-3 pt-1">
                    <span className="text-[9px] text-green-400">● &lt; 500KB = Good</span>
                    <span className="text-[9px] text-amber-400">● 500KB-1MB = Medium</span>
                    <span className="text-[9px] text-red-400">● 1-1.5MB = Near limit</span>
                  </div>
                </div>
                {/* FF Screenshot */}
                <div className="space-y-1.5">
                  <Label className="text-xs text-[oklch(0.70,0.04,290)]">
                    Free Fire Profile Screenshot <span className="text-red-400">*</span>
                  </Label>
                  {ffPreview ? (
                    <div className="relative rounded-xl overflow-hidden border border-[oklch(0.30,0.06,290)]">
                      <img src={ffPreview} alt="FF Screenshot" className="w-full h-48 object-cover" />
                      <button
                        type="button"
                        onClick={() => removeImage('screenshot')}
                        className="absolute top-2 right-2 w-7 h-7 rounded-full bg-red-500/80 text-white flex items-center justify-center hover:bg-red-600 transition-colors"
                      >
                        <X className="w-4 h-4" />
                      </button>
                      <div className={`absolute bottom-2 left-2 px-2 py-0.5 rounded ${getImageSizeColor(ffScreenshot!.size).bg} text-[10px] text-white font-medium`}>
                        {(ffScreenshot!.size / 1024).toFixed(0)}KB — {getImageSizeColor(ffScreenshot!.size).label}
                      </div>
                    </div>
                  ) : (
                    <button
                      type="button"
                      onClick={() => handleImageSelect('screenshot')}
                      disabled={uploadingImage === 'screenshot'}
                      className="w-full border-2 border-dashed border-[oklch(0.30,0.06,290)] hover:border-violet-500/40 rounded-xl p-6 flex flex-col items-center gap-2 bg-[oklch(0.20,0.04,290)] transition-all"
                    >
                      {uploadingImage === 'screenshot' ? (
                        <Loader2 className="w-8 h-8 text-violet-400 animate-spin" />
                      ) : (
                        <Upload className="w-8 h-8 text-[oklch(0.45,0.04,290)]" />
                      )}
                      <p className="text-xs text-[oklch(0.55,0.04,290)]">Tap to upload FF Profile Screenshot</p>
                      <p className="text-[10px] text-[oklch(0.40,0.04,290)]">PNG, JPG, WEBP — Max 1.5MB</p>
                    </button>
                  )}
                  <FieldGuide text="Screenshot must show your FF profile with visible ID and name" />
                </div>
                {/* Selfie */}
                <div className="space-y-1.5">
                  <Label className="text-xs text-[oklch(0.70,0.04,290)]">
                    Your Selfie <span className="text-red-400">*</span>
                  </Label>
                  {selfiePreview ? (
                    <div className="relative rounded-xl overflow-hidden border border-[oklch(0.30,0.06,290)]">
                      <img src={selfiePreview} alt="Selfie" className="w-full h-48 object-cover" />
                      <button
                        type="button"
                        onClick={() => removeImage('selfie')}
                        className="absolute top-2 right-2 w-7 h-7 rounded-full bg-red-500/80 text-white flex items-center justify-center hover:bg-red-600 transition-colors"
                      >
                        <X className="w-4 h-4" />
                      </button>
                      <div className={`absolute bottom-2 left-2 px-2 py-0.5 rounded ${getImageSizeColor(selfie!.size).bg} text-[10px] text-white font-medium`}>
                        {(selfie!.size / 1024).toFixed(0)}KB — {getImageSizeColor(selfie!.size).label}
                      </div>
                    </div>
                  ) : (
                    <button
                      type="button"
                      onClick={() => handleImageSelect('selfie')}
                      disabled={uploadingImage === 'selfie'}
                      className="w-full border-2 border-dashed border-[oklch(0.30,0.06,290)] hover:border-violet-500/40 rounded-xl p-6 flex flex-col items-center gap-2 bg-[oklch(0.20,0.04,290)] transition-all"
                    >
                      {uploadingImage === 'selfie' ? (
                        <Loader2 className="w-8 h-8 text-violet-400 animate-spin" />
                      ) : (
                        <Upload className="w-8 h-8 text-[oklch(0.45,0.04,290)]" />
                      )}
                      <p className="text-xs text-[oklch(0.55,0.04,290)]">Tap to upload your Selfie</p>
                      <p className="text-[10px] text-[oklch(0.40,0.04,290)]">PNG, JPG, WEBP — Max 1.5MB</p>
                    </button>
                  )}
                  <FieldGuide text="Clear selfie holding a paper with your FF nickname written on it" />
                </div>
              </div>
            )}

            {/* STEP 6 — Message */}
            {step === 6 && (
              <div className="space-y-4">
                <div className="space-y-1.5">
                  <Label className="text-xs text-[oklch(0.70,0.04,290)]">
                    Why Do You Want To Become Host? <span className="text-red-400">*</span>
                  </Label>
                  <Textarea value={formData.whyJoin} onChange={(e) => updateField('whyJoin', e.target.value)} placeholder="Write in detail why you want to become an EDMFire host..." rows={8} className={`${inputClass} resize-none`} />
                  <div className="flex items-center justify-between">
                    <FieldGuide text="Write at least 2-3 lines explaining your motivation" />
                    <span className={`text-[10px] font-mono ${formData.whyJoin.length >= 50 ? 'text-green-400' : 'text-[oklch(0.45,0.04,290)]'}`}>
                      {formData.whyJoin.length} chars
                    </span>
                  </div>
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
            <Button onClick={prevStep} variant="secondary" className="flex-1 h-12 rounded-xl bg-[oklch(0.22,0.04,290)] border border-[oklch(0.30,0.06,290)] text-[oklch(0.70,0.04,290)]">
              <ChevronLeft className="w-4 h-4 mr-2" />
              Back
            </Button>
          )}
          {step < TOTAL_STEPS && (
            <Button onClick={handleNext} className="flex-1 h-12 rounded-xl bg-gradient-to-r from-violet-600 to-indigo-700 hover:from-violet-700 hover:to-indigo-800 text-white font-semibold shadow-lg shadow-violet-500/20">
              Next
              <ChevronRight className="w-4 h-4 ml-2" />
            </Button>
          )}
          {step === TOTAL_STEPS && (
            <Button onClick={handleSubmit} disabled={isSubmitting} className="flex-1 h-12 rounded-xl bg-gradient-to-r from-green-500 to-emerald-600 hover:from-green-600 hover:to-emerald-700 text-white font-semibold shadow-lg shadow-green-500/20 disabled:opacity-50 disabled:cursor-not-allowed">
              {isSubmitting ? (
                <><Loader2 className="w-4 h-4 mr-2 animate-spin" />Submitting...</>
              ) : (
                <><Send className="w-4 h-4 mr-2" />Submit Application</>
              )}
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

      {/* Multi-stage submit progress overlay */}
      {isSubmitting && submitStage && (
        <div className="fixed inset-0 bg-black/70 backdrop-blur-sm z-50 flex items-center justify-center">
          <div className="bg-[oklch(0.18,0.04,290)] border border-[oklch(0.30,0.06,290)] rounded-2xl p-8 max-w-sm w-full mx-4 space-y-6 text-center">
            <div className="w-16 h-16 mx-auto rounded-full bg-violet-500/10 border border-violet-500/30 flex items-center justify-center">
              {submitStage === 'done' ? (
                <CheckCircle2 className="w-8 h-8 text-green-400" />
              ) : (
                <Loader2 className="w-8 h-8 text-violet-400 animate-spin" />
              )}
            </div>
            <div className="space-y-2">
              <h3 className="text-lg font-bold text-white">
                {submitStage === 'validating' && 'Validating your data...'}
                {submitStage === 'uploading-1' && 'Uploading Screenshot (1/2)...'}
                {submitStage === 'uploading-2' && 'Uploading Selfie (2/2)...'}
                {submitStage === 'saving' && 'Saving to database...'}
                {submitStage === 'done' && 'All Done!'}
              </h3>
              <p className="text-xs text-[oklch(0.55,0.04,290)]">
                {submitStage === 'validating' && 'Checking all fields are correct'}
                {submitStage === 'uploading-1' && 'Please wait while we upload your images'}
                {submitStage === 'uploading-2' && 'Almost there...'}
                {submitStage === 'saving' && 'Sending your application to EDMFire'}
                {submitStage === 'done' && 'Your application has been submitted!'}
              </p>
            </div>
            {/* progress dots */}
            <div className="flex items-center justify-center gap-2">
              {['validating', 'uploading-1', 'uploading-2', 'saving', 'done'].map((stage) => {
                const stageOrder = ['validating', 'uploading-1', 'uploading-2', 'saving', 'done'];
                const currentIdx = stageOrder.indexOf(submitStage);
                const thisIdx = stageOrder.indexOf(stage);
                const isComplete = thisIdx < currentIdx;
                const isCurrent = thisIdx === currentIdx;
                return (
                  <div
                    key={stage}
                    className={`w-2.5 h-2.5 rounded-full transition-all ${
                      isComplete ? 'bg-green-400' : isCurrent ? 'bg-violet-400 animate-pulse' : 'bg-[oklch(0.30,0.06,290)]'
                    }`}
                  />
                );
              })}
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
