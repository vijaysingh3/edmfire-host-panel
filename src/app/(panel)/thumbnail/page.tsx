'use client';

import { useState, useEffect, useRef } from 'react';
import { Button } from '@/components/ui/button';
import { toast } from 'sonner';
import { useAuth } from '@/context/AuthContext';
// Cloud Function URL from Vercel ENV (no Remote Config)
const UNIVERSAL_IMAGE_UPLOADER_URL = process.env.NEXT_PUBLIC_UNIVERSAL_IMAGE_UPLOADER_URL || '';
import {
  collection,
  query,
  orderBy,
  getDocs,
  addDoc,
  Timestamp,
} from 'firebase/firestore';
import { db } from '@/lib/firebase';
import {
  Image as ImageIcon,
  Upload,
  Search,
  RefreshCw,
  Copy,
  X,
  ImagePlus,
  Trash2,
} from 'lucide-react';

// ── Thumbnail model — Kotlin ThumbnailModel jaisa ──
interface ThumbnailItem {
  id: string;
  title: string;
  url: string;
  uploadedAt: string;
}

// ── Helper: File ko Base64 me convert ──
function fileToBase64(file: File): Promise<string> {
  return new Promise((resolve, reject) => {
    const reader = new FileReader();
    reader.onload = () => resolve(reader.result as string);
    reader.onerror = reject;
    reader.readAsDataURL(file);
  });
}

export default function ThumbnailPage() {
  const { user, isLoading: authLoading } = useAuth();
  const fileInputRef = useRef<HTMLInputElement>(null);

  // ── State ──
  const [selectedFile, setSelectedFile] = useState<File | null>(null);
  const [previewUrl, setPreviewUrl] = useState<string | null>(null);
  const [uploading, setUploading] = useState(false);
  const [uploadedUrl, setUploadedUrl] = useState('');
  const [uploadedFileName, setUploadedFileName] = useState('');
  const [searchQuery, setSearchQuery] = useState('');
  const [thumbnails, setThumbnails] = useState<ThumbnailItem[]>([]);
  const [loadingList, setLoadingList] = useState(true);
  const [uploaderUrl, setUploaderUrl] = useState('');
  const [refreshing, setRefreshing] = useState(false);

  // ── Init: Remote Config fetch + thumbnails load ──
  useEffect(() => {
    if (authLoading) return;
    init();
  }, [user, authLoading]);

  const init = async () => {
    const url = UNIVERSAL_IMAGE_UPLOADER_URL;
    setUploaderUrl(url);

    if (!url) {
      toast.error('Config Error', { description: 'NEXT_PUBLIC_UNIVERSAL_IMAGE_UPLOADER_URL is empty in Vercel ENV' });
    }

    // Thumbnails fetch
    if (user) {
      fetchAllThumbnails();
    }
  };

  // ── Firestore se saare thumbnails fetch karo ──
  // Kotlin: fetchAllThumbnails() — Hosts/{userId}/myThumbnails, orderBy uploadedAt DESC
  const fetchAllThumbnails = async () => {
    if (!user) return;
    setLoadingList(true);
    try {
      const q = query(
        collection(db, 'hosts', user.uid, 'myThumbnails'),
        orderBy('uploadedAt', 'desc')
      );
      const snap = await getDocs(q);
      const list: ThumbnailItem[] = [];

      snap.forEach((doc) => {
        const d = doc.data();
        if (d.url) {
          list.push({
            id: doc.id,
            title: d.title || d.fileName || '',
            url: d.url,
            uploadedAt: d.uploadedAt?.toDate?.()?.toLocaleDateString('en-IN', {
              day: 'numeric',
              month: 'short',
              year: 'numeric',
            }) || '',
          });
        }
      });

      setThumbnails(list);
    } catch (e: any) {
      toast.error('Failed to load thumbnails', { description: e.message });
    } finally {
      setLoadingList(false);
    }
  };

  // ── Image picker — hidden file input trigger ──
  const handlePickImage = () => {
    fileInputRef.current?.click();
  };

  // ── File change handler — Kotlin me onActivityResult tha ──
  const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    // Format validation
    if (!['image/jpeg', 'image/png', 'image/webp'].includes(file.type)) {
      toast.error('Invalid format', { description: 'Only PNG, JPG, WEBP allowed' });
      return;
    }

    // Size validation (5MB max)
    if (file.size > 5 * 1024 * 1024) {
      toast.error('File too large', { description: `Max 5MB. Your file is ${(file.size / 1024 / 1024).toFixed(1)}MB` });
      return;
    }

    setSelectedFile(file);
    setPreviewUrl(URL.createObjectURL(file));
    setUploadedUrl('');
    toast.success('Image Selected!');
  };

  // ── Selected image remove karo ──
  const handleRemoveImage = () => {
    setSelectedFile(null);
    if (previewUrl) URL.revokeObjectURL(previewUrl);
    setPreviewUrl(null);
  };

  // ── Upload image to Cloud Function — Kotlin me uploadImage() tha ──
  const handleUpload = async () => {
    if (!selectedFile || !user) return;

    if (!uploaderUrl) {
      toast.error('Config not loaded', { description: 'Upload URL not available. Check RemoteConfig.' });
      return;
    }

    setUploading(true);
    setUploadedUrl('');

    try {
      // Bitmap → Base64 (Kotlin me Bitmap.CompressFormat.JPEG, 85 quality)
      const base64 = await fileToBase64(selectedFile);

      // Request body — Kotlin me JSONObject bana tha same format me
      const requestBody = {
        folder: `hosts/${user.uid}`,
        images: [{ base64 }],
      };

      const response = await fetch(uploaderUrl, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(requestBody),
      });

      if (!response.ok) {
        const errText = await response.text();
        throw new Error(`Upload failed (${response.status}): ${errText}`);
      }

      const result = await response.json();
      const isSuccess = result.success === true;

      if (!isSuccess) {
        throw new Error(result.error || 'Upload failed');
      }

      // Response parse — Kotlin me responseJson.optJSONArray("uploaded") tha
      const uploaded = result.uploaded?.[0];
      const url = uploaded?.url || '';
      const fileName = uploaded?.fileName || '';

      if (url) {
        // ✅ Firestore me save — Kotlin me saveThumbnailToFirestore() tha
        // Path: hosts/{hostId}/myThumbnails
        await addDoc(collection(db, 'hosts', user.uid, 'myThumbnails'), {
          fileName,
          url,
          uploadedAt: Timestamp.now(),
          title: selectedFile.name,
        });

        setUploadedUrl(url);
        setUploadedFileName(fileName);
        toast.success('Thumbnail Uploaded!', { description: 'Saved to Cloud Storage + Firestore' });

        // List refresh — Kotlin me bhi fetchAllThumbnails() call hota tha save ke baad
        fetchAllThumbnails();
      }

      // Form reset — Kotlin me bhi same reset hota tha
      setSelectedFile(null);
      if (previewUrl) URL.revokeObjectURL(previewUrl);
      setPreviewUrl(null);

    } catch (e: any) {
      toast.error('Upload Failed', { description: e.message });
    } finally {
      setUploading(false);
    }
  };

  // ── URL copy — Kotlin me ClipboardManager tha ──
  const handleCopyUrl = (url: string) => {
    navigator.clipboard.writeText(url).catch(() => {});
    toast.success('URL Copied!');
  };

  // ── Refresh button — Kotlin me bhi same tha ──
  const handleRefresh = async () => {
    setRefreshing(true);
    setSearchQuery('');
    await fetchAllThumbnails();
    setRefreshing(false);
    toast.success('Refreshed!');
  };

  // ── Search filter — Kotlin me adapter.filter() tha ──
  const filtered = thumbnails.filter((t) =>
    t.title.toLowerCase().includes(searchQuery.toLowerCase())
  );

  return (
    <div className="min-h-screen pb-20 lg:pb-6">
      {/* Hidden file input — Kotlin me ACTION_PICK Intent tha */}
      <input
        ref={fileInputRef}
        type="file"
        accept="image/png,image/jpeg,image/webp"
        className="hidden"
        onChange={handleFileChange}
      />

      {/* Header */}
      <header className="bg-gradient-to-r from-violet-500 to-purple-700 px-4 lg:px-6 py-6 sticky top-0 z-20">
        <div className="max-w-4xl mx-auto">
          <h1 className="text-xl lg:text-2xl font-extrabold text-white flex items-center gap-2">
            <ImageIcon className="w-6 h-6" />
            Upload Thumbnail
          </h1>
          <p className="text-white/60 text-sm mt-1">Step 1 — Upload tournament banner &amp; cover images</p>
        </div>
      </header>

      <div className="max-w-4xl mx-auto px-4 lg:px-6 py-6 space-y-5">

        {/* Upload Section Card */}
        <div className="rounded-2xl bg-[oklch(0.18,0.04,290)] border border-[oklch(0.30,0.06,290)] p-4 lg:p-5 space-y-4">
          <h2 className="text-base font-bold text-blue-400">Upload Thumbnail</h2>

          {/* Image Preview — real image preview ya placeholder */}
          <div
            className={`relative w-full h-44 rounded-xl overflow-hidden ${
              previewUrl
                ? 'bg-[oklch(0.15,0.04,290)] border-2 border-purple-500/40'
                : 'bg-[oklch(0.15,0.04,290)] border-2 border-dashed border-[oklch(0.28,0.05,290)]'
            } flex items-center justify-center`}
          >
            {previewUrl ? (
              <div className="relative w-full h-full group">
                {/* Actual image preview */}
                <img
                  src={previewUrl}
                  alt="Selected thumbnail"
                  className="w-full h-full object-contain"
                />
                {/* Remove button on hover */}
                <button
                  onClick={handleRemoveImage}
                  className="absolute top-2 right-2 w-7 h-7 rounded-full bg-black/60 flex items-center justify-center opacity-0 group-hover:opacity-100 transition-opacity"
                >
                  <X className="w-4 h-4 text-white" />
                </button>
                {/* File name badge */}
                <div className="absolute bottom-2 left-2 px-2 py-1 rounded-lg bg-black/60 backdrop-blur-sm">
                  <span className="text-[10px] text-purple-300 font-medium">
                    {selectedFile?.name || 'image'}
                  </span>
                </div>
              </div>
            ) : (
              <div className="flex flex-col items-center gap-2">
                <ImageIcon className="w-10 h-10 text-[oklch(0.28,0.04,290)]" />
                <span className="text-xs text-[oklch(0.40,0.04,290)]">Image preview area</span>
              </div>
            )}
          </div>

          {/* No Image Hint — Kotlin me tvNoImageHint tha */}
          {!previewUrl && (
            <p className="text-center text-xs text-[oklch(0.45,0.04,290)]">No image selected</p>
          )}

          {/* Pick + Upload Buttons */}
          <div className="grid grid-cols-2 gap-3">
            <Button
              onClick={handlePickImage}
              disabled={uploading}
              className="h-11 rounded-xl bg-gradient-to-r from-blue-500 to-blue-600 text-white font-semibold text-sm shadow-lg shadow-blue-500/20"
            >
              <ImagePlus className="w-4 h-4 mr-2" /> Pick Image
            </Button>
            <Button
              onClick={handleUpload}
              disabled={!previewUrl || uploading}
              className="h-11 rounded-xl bg-gradient-to-r from-green-500 to-emerald-600 text-white font-semibold text-sm shadow-lg shadow-green-500/20 disabled:opacity-40 disabled:cursor-not-allowed"
            >
              {uploading ? (
                <div className="w-4 h-4 border-2 border-white/30 border-t-white rounded-full animate-spin" />
              ) : (
                <>
                  <Upload className="w-4 h-4 mr-2" /> Upload
                </>
              )}
            </Button>
          </div>

          {/* Upload Progress — Kotlin me progressUpload + tvUploadStatus tha */}
          {uploading && (
            <div className="space-y-2">
              <div className="w-full h-1.5 bg-[oklch(0.20,0.04,290)] rounded-full overflow-hidden">
                <div className="h-full bg-gradient-to-r from-green-400 to-emerald-500 rounded-full animate-pulse" style={{ width: '70%' }} />
              </div>
              <p className="text-xs text-center text-blue-400">Uploading...</p>
            </div>
          )}

          {/* Recently Uploaded URL — Kotlin me layoutRecentUrl + tvRecentUrl tha */}
          {uploadedUrl && !uploading && (
            <div className="rounded-xl bg-blue-500/10 border border-blue-500/20 p-3.5 space-y-2">
              <p className="text-xs font-bold text-blue-400">Recently Uploaded URL:</p>
              <p className="text-xs text-[oklch(0.60,0.04,290)] break-all leading-relaxed">{uploadedUrl}</p>
              <button
                onClick={() => handleCopyUrl(uploadedUrl)}
                className="flex items-center gap-1.5 px-3.5 py-1.5 rounded-lg bg-blue-500/20 text-blue-400 text-xs font-semibold hover:bg-blue-500/30 transition-colors"
              >
                <Copy className="w-3 h-3" /> Copy URL
              </button>
            </div>
          )}
        </div>

        {/* All Uploaded Thumbnails Section — Firestore data */}
        <div className="space-y-3">
          {/* Header Row */}
          <div className="flex items-center justify-between">
            <h2 className="text-sm font-bold text-green-400">All Uploaded Thumbnails</h2>
            <button
              onClick={handleRefresh}
              disabled={refreshing}
              className="w-9 h-9 rounded-lg bg-[oklch(0.18,0.04,290)] border border-[oklch(0.30,0.06,290)] flex items-center justify-center hover:bg-[oklch(0.22,0.04,290)] transition-colors disabled:opacity-50"
            >
              <RefreshCw className={`w-4 h-4 text-[oklch(0.55,0.04,290)] ${refreshing ? 'animate-spin' : ''}`} />
            </button>
          </div>

          {/* Search Bar — Kotlin me etSearch + TextWatcher tha */}
          <div className="flex items-center gap-2.5 bg-[oklch(0.18,0.04,290)] border border-[oklch(0.30,0.06,290)] rounded-xl px-3.5 py-2.5">
            <Search className="w-4 h-4 text-[oklch(0.45,0.04,290)] shrink-0" />
            <input
              type="text"
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              placeholder="Search by title..."
              className="flex-1 bg-transparent text-sm text-white placeholder:text-[oklch(0.40,0.04,290)] outline-none"
            />
            {searchQuery && (
              <button onClick={() => setSearchQuery('')}>
                <X className="w-4 h-4 text-red-400" />
              </button>
            )}
          </div>

          {/* Thumbnails List — Kotlin me RecyclerView + ThumbnailAdapter tha */}
          {loadingList ? (
            /* Loading state */
            <div className="flex flex-col items-center py-14 space-y-3">
              <div className="w-6 h-6 border-2 border-purple-500/30 border-t-purple-500 rounded-full animate-spin" />
              <p className="text-xs text-[oklch(0.45,0.04,290)]">Loading thumbnails...</p>
            </div>
          ) : filtered.length === 0 ? (
            /* Empty state — Kotlin me tvNoData tha */
            <div className="flex flex-col items-center py-14 space-y-3">
              <ImageIcon className="w-10 h-10 text-[oklch(0.25,0.04,290)]" />
              <p className="text-xs text-[oklch(0.40,0.04,290)]">
                {searchQuery ? `No results for "${searchQuery}"` : 'No thumbnails uploaded yet'}
              </p>
            </div>
          ) : (
            <div className="space-y-3">
              {filtered.map((item) => (
                <div
                  key={item.id}
                  className="rounded-xl bg-[oklch(0.18,0.04,290)] border border-[oklch(0.28,0.05,290)] p-3 space-y-2.5"
                >
                  {/* Thumbnail Preview — real image */}
                  <div className="w-full h-36 rounded-lg bg-[oklch(0.14,0.04,290)] border border-[oklch(0.22,0.05,290)] flex items-center justify-center overflow-hidden">
                    {item.url ? (
                      <img
                        src={item.url}
                        alt={item.title}
                        className="w-full h-full object-cover"
                      />
                    ) : (
                      <ImageIcon className="w-12 h-12 text-[oklch(0.25,0.04,290)]" />
                    )}
                  </div>
                  {/* Title */}
                  <h3 className="text-sm font-bold text-white leading-snug">{item.title || 'Untitled'}</h3>
                  {/* URL */}
                  <p className="text-[11px] text-[oklch(0.50,0.04,290)] truncate font-mono">{item.url}</p>
                  {/* Date + Copy */}
                  <div className="flex items-center justify-between">
                    <span className="text-[10px] text-[oklch(0.40,0.04,290)]">{item.uploadedAt}</span>
                    <button
                      onClick={() => handleCopyUrl(item.url)}
                      className="flex items-center gap-1 px-3 py-1.5 rounded-lg bg-blue-500/15 text-blue-400 text-[11px] font-semibold hover:bg-blue-500/25 transition-colors active:scale-95"
                    >
                      <Copy className="w-3 h-3" /> Copy URL
                    </button>
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>

        {/* Config status indicator */}
        <div className="text-center py-3">
          <p className="text-[10px] text-[oklch(0.35,0.04,290)]">
            {uploaderUrl ? '✅ Remote Config connected' : '⚠️ Config loading...'}
          </p>
        </div>
      </div>
    </div>
  );
}
