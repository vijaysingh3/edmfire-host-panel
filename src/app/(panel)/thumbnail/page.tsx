'use client';

import { useState, useEffect, useRef } from 'react';
import { Button } from '@/components/ui/button';
import { toast } from 'sonner';
import { useAuth } from '@/context/AuthContext';
import {
  collection,
  doc,
  query,
  orderBy,
  getDocs,
  addDoc,
  updateDoc,
  deleteDoc,
  Timestamp,
} from 'firebase/firestore';
import { db, storage } from '@/lib/firebase';
import { ref, uploadBytes, getDownloadURL, deleteObject } from 'firebase/storage';
import {
  Image as ImageIcon,
  Upload,
  Search,
  RefreshCw,
  Copy,
  X,
  ImagePlus,
  Trash2,
  Pencil,
  Check,
  AlertTriangle,
} from 'lucide-react';

// ── Thumbnail model ──
interface ThumbnailItem {
  id: string;
  title: string;
  fileName: string;
  url: string;
  uploadedAt: string;
}

export default function ThumbnailPage() {
  const { user, isLoading: authLoading } = useAuth();
  const fileInputRef = useRef<HTMLInputElement>(null);

  // ── State ──
  const [selectedFile, setSelectedFile] = useState<File | null>(null);
  const [customTitle, setCustomTitle] = useState('');
  const [previewUrl, setPreviewUrl] = useState<string | null>(null);
  const [uploading, setUploading] = useState(false);
  const [uploadedUrl, setUploadedUrl] = useState('');
  const [searchQuery, setSearchQuery] = useState('');
  const [thumbnails, setThumbnails] = useState<ThumbnailItem[]>([]);
  const [loadingList, setLoadingList] = useState(true);
  const [refreshing, setRefreshing] = useState(false);

  // ── Rename state ──
  const [editingId, setEditingId] = useState<string | null>(null);
  const [editTitle, setEditTitle] = useState('');
  const [savingTitle, setSavingTitle] = useState(false);

  // ── Delete state ──
  const [deletingId, setDeletingId] = useState<string | null>(null);

  // ── Init: thumbnails load ──
  useEffect(() => {
    if (authLoading) return;
    if (user) {
      fetchAllThumbnails();
    }
  }, [user, authLoading]);

  // ── Firestore se saare thumbnails fetch karo ──
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

      snap.forEach((d) => {
        const data = d.data();
        if (data.url) {
          list.push({
            id: d.id,
            title: data.title || data.fileName || '',
            fileName: data.fileName || '',
            url: data.url,
            uploadedAt: data.uploadedAt?.toDate?.()?.toLocaleDateString('en-IN', {
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

  // ── Image picker ──
  const handlePickImage = () => {
    fileInputRef.current?.click();
  };

  // ── File change handler ──
  const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    if (!['image/jpeg', 'image/png', 'image/webp'].includes(file.type)) {
      toast.error('Invalid format', { description: 'Only PNG, JPG, WEBP allowed' });
      return;
    }

    if (file.size > 5 * 1024 * 1024) {
      toast.error('File too large', { description: `Max 5MB. Your file is ${(file.size / 1024 / 1024).toFixed(1)}MB` });
      return;
    }

    setSelectedFile(file);
    setPreviewUrl(URL.createObjectURL(file));
    setUploadedUrl('');
    // Auto-fill custom title from filename (without extension)
    const nameWithoutExt = file.name.replace(/\.[^/.]+$/, '');
    setCustomTitle(nameWithoutExt);
    toast.success('Image Selected!');
  };

  // ── Selected image remove karo ──
  const handleRemoveImage = () => {
    setSelectedFile(null);
    setCustomTitle('');
    if (previewUrl) URL.revokeObjectURL(previewUrl);
    setPreviewUrl(null);
  };

  // ── Upload image directly to Firebase Storage ──
  const handleUpload = async () => {
    if (!selectedFile || !user) return;

    setUploading(true);
    setUploadedUrl('');

    try {
      const finalTitle = customTitle.trim() || selectedFile.name.replace(/\.[^/.]+$/, '');
      const fileName = `${Date.now()}_${selectedFile.name}`;
      const storageRef = ref(storage, `hosts/${user.uid}/thumbnails/${fileName}`);

      await uploadBytes(storageRef, selectedFile);
      const url = await getDownloadURL(storageRef);

      // Firestore me save — custom title ke saath
      await addDoc(collection(db, 'hosts', user.uid, 'myThumbnails'), {
        fileName,
        url,
        uploadedAt: Timestamp.now(),
        title: finalTitle,
      });

      setUploadedUrl(url);
      toast.success('Thumbnail Uploaded!', { description: `Saved as "${finalTitle}"` });

      fetchAllThumbnails();

      // Form reset
      setSelectedFile(null);
      setCustomTitle('');
      if (previewUrl) URL.revokeObjectURL(previewUrl);
      setPreviewUrl(null);

    } catch (e: any) {
      toast.error('Upload Failed', { description: e.message });
    } finally {
      setUploading(false);
    }
  };

  // ── Rename thumbnail — Firestore me title update ──
  const handleRename = async (id: string) => {
    if (!user || !editTitle.trim()) return;
    setSavingTitle(true);
    try {
      await updateDoc(doc(db, 'hosts', user.uid, 'myThumbnails', id), {
        title: editTitle.trim(),
      });
      setEditingId(null);
      setEditTitle('');
      toast.success('Renamed!', { description: `Title updated to "${editTitle.trim()}"` });
      fetchAllThumbnails();
    } catch (e: any) {
      toast.error('Rename Failed', { description: e.message });
    } finally {
      setSavingTitle(false);
    }
  };

  // ── Start rename editing ──
  const startEdit = (item: ThumbnailItem) => {
    setEditingId(item.id);
    setEditTitle(item.title);
  };

  // ── Cancel rename ──
  const cancelEdit = () => {
    setEditingId(null);
    setEditTitle('');
  };

  // ── Delete thumbnail — Firestore doc + Storage file dono ──
  const handleDelete = async (item: ThumbnailItem) => {
    if (!user) return;
    setDeletingId(item.id);
    try {
      // 1. Firestore doc delete
      await deleteDoc(doc(db, 'hosts', user.uid, 'myThumbnails', item.id));

      // 2. Storage se file delete (fileName available hai to)
      if (item.fileName) {
        try {
          const storageRef = ref(storage, `hosts/${user.uid}/thumbnails/${item.fileName}`);
          await deleteObject(storageRef);
        } catch {
          // Storage file already deleted ya not found — ignore
        }
      }

      toast.success('Deleted!', { description: `"${item.title}" removed` });
      fetchAllThumbnails();
    } catch (e: any) {
      toast.error('Delete Failed', { description: e.message });
    } finally {
      setDeletingId(null);
    }
  };

  // ── URL copy ──
  const handleCopyUrl = (url: string) => {
    navigator.clipboard.writeText(url).catch(() => {});
    toast.success('URL Copied!');
  };

  // ── Refresh ──
  const handleRefresh = async () => {
    setRefreshing(true);
    setSearchQuery('');
    await fetchAllThumbnails();
    setRefreshing(false);
    toast.success('Refreshed!');
  };

  // ── Search filter ──
  const filtered = thumbnails.filter((t) =>
    t.title.toLowerCase().includes(searchQuery.toLowerCase())
  );

  return (
    <div className="min-h-screen pb-20 lg:pb-6">
      {/* Hidden file input */}
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

        {/* ⚠️ Red Warning — YouTube Thumbnail Size */}
        <div className="rounded-xl bg-red-500/10 border border-red-500/30 px-4 py-3.5 flex items-start gap-3">
          <AlertTriangle className="w-5 h-5 text-red-400 shrink-0 mt-0.5" />
          <div>
            <p className="text-sm font-bold text-red-400">Recommended Thumbnail Size</p>
            <p className="text-xs text-red-300/80 mt-1">
              YouTube Thumbnail Ratio — <span className="font-bold">1280 x 720 px (16:9)</span> — Min 640px width. Is ratio me upload karo tournament banner best dikhega.
            </p>
          </div>
        </div>

        {/* Upload Section Card */}
        <div className="rounded-2xl bg-[oklch(0.18,0.04,290)] border border-[oklch(0.30,0.06,290)] p-4 lg:p-5 space-y-4">
          <h2 className="text-base font-bold text-blue-400">Upload Thumbnail</h2>

          {/* Image Preview */}
          <div
            className={`relative w-full h-44 rounded-xl overflow-hidden ${
              previewUrl
                ? 'bg-[oklch(0.15,0.04,290)] border-2 border-purple-500/40'
                : 'bg-[oklch(0.15,0.04,290)] border-2 border-dashed border-[oklch(0.28,0.05,290)]'
            } flex items-center justify-center`}
          >
            {previewUrl ? (
              <div className="relative w-full h-full group">
                <img
                  src={previewUrl}
                  alt="Selected thumbnail"
                  className="w-full h-full object-contain"
                />
                <button
                  onClick={handleRemoveImage}
                  className="absolute top-2 right-2 w-7 h-7 rounded-full bg-black/60 flex items-center justify-center opacity-0 group-hover:opacity-100 transition-opacity"
                >
                  <X className="w-4 h-4 text-white" />
                </button>
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

          {/* No Image Hint */}
          {!previewUrl && (
            <p className="text-center text-xs text-[oklch(0.45,0.04,290)]">No image selected</p>
          )}

          {/* Custom Title Input — Rename at upload time */}
          {previewUrl && (
            <div className="space-y-1.5">
              <label className="text-xs font-semibold text-[oklch(0.55,0.04,290)]">Thumbnail Name (easy to search later)</label>
              <input
                type="text"
                value={customTitle}
                onChange={(e) => setCustomTitle(e.target.value)}
                placeholder="e.g. My Tournament Banner"
                className="w-full h-10 rounded-lg bg-[oklch(0.14,0.04,290)] border border-[oklch(0.28,0.05,290)] px-3 text-sm text-white placeholder:text-[oklch(0.35,0.04,290)] outline-none focus:border-purple-500/50 transition-colors"
              />
            </div>
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

          {/* Upload Progress */}
          {uploading && (
            <div className="space-y-2">
              <div className="w-full h-1.5 bg-[oklch(0.20,0.04,290)] rounded-full overflow-hidden">
                <div className="h-full bg-gradient-to-r from-green-400 to-emerald-500 rounded-full animate-pulse" style={{ width: '70%' }} />
              </div>
              <p className="text-xs text-center text-blue-400">Uploading...</p>
            </div>
          )}

          {/* Recently Uploaded URL */}
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

        {/* All Uploaded Thumbnails Section */}
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

          {/* Search Bar */}
          <div className="flex items-center gap-2.5 bg-[oklch(0.18,0.04,290)] border border-[oklch(0.30,0.06,290)] rounded-xl px-3.5 py-2.5">
            <Search className="w-4 h-4 text-[oklch(0.45,0.04,290)] shrink-0" />
            <input
              type="text"
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              placeholder="Search by name..."
              className="flex-1 bg-transparent text-sm text-white placeholder:text-[oklch(0.40,0.04,290)] outline-none"
            />
            {searchQuery && (
              <button onClick={() => setSearchQuery('')}>
                <X className="w-4 h-4 text-red-400" />
              </button>
            )}
          </div>

          {/* Thumbnails List */}
          {loadingList ? (
            <div className="flex flex-col items-center py-14 space-y-3">
              <div className="w-6 h-6 border-2 border-purple-500/30 border-t-purple-500 rounded-full animate-spin" />
              <p className="text-xs text-[oklch(0.45,0.04,290)]">Loading thumbnails...</p>
            </div>
          ) : filtered.length === 0 ? (
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
                  {/* Thumbnail Preview */}
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

                  {/* Title — show input if editing, else show text */}
                  {editingId === item.id ? (
                    <div className="flex items-center gap-2">
                      <input
                        type="text"
                        value={editTitle}
                        onChange={(e) => setEditTitle(e.target.value)}
                        onKeyDown={(e) => {
                          if (e.key === 'Enter') handleRename(item.id);
                          if (e.key === 'Escape') cancelEdit();
                        }}
                        className="flex-1 h-8 rounded-lg bg-[oklch(0.14,0.04,290)] border border-purple-500/40 px-2.5 text-sm text-white outline-none focus:border-purple-400 transition-colors"
                        autoFocus
                      />
                      <button
                        onClick={() => handleRename(item.id)}
                        disabled={savingTitle || !editTitle.trim()}
                        className="w-8 h-8 rounded-lg bg-green-500/20 flex items-center justify-center text-green-400 hover:bg-green-500/30 transition-colors disabled:opacity-40"
                      >
                        {savingTitle ? (
                          <div className="w-3.5 h-3.5 border-2 border-green-400/30 border-t-green-400 rounded-full animate-spin" />
                        ) : (
                          <Check className="w-4 h-4" />
                        )}
                      </button>
                      <button
                        onClick={cancelEdit}
                        className="w-8 h-8 rounded-lg bg-red-500/20 flex items-center justify-center text-red-400 hover:bg-red-500/30 transition-colors"
                      >
                        <X className="w-4 h-4" />
                      </button>
                    </div>
                  ) : (
                    <h3 className="text-sm font-bold text-white leading-snug">{item.title || 'Untitled'}</h3>
                  )}

                  {/* URL */}
                  <p className="text-[11px] text-[oklch(0.50,0.04,290)] truncate font-mono">{item.url}</p>

                  {/* Date + Actions */}
                  <div className="flex items-center justify-between">
                    <span className="text-[10px] text-[oklch(0.40,0.04,290)]">{item.uploadedAt}</span>
                    <div className="flex items-center gap-1.5">
                      {/* Rename button */}
                      {editingId !== item.id && (
                        <button
                          onClick={() => startEdit(item)}
                          className="flex items-center gap-1 px-2.5 py-1.5 rounded-lg bg-amber-500/15 text-amber-400 text-[11px] font-semibold hover:bg-amber-500/25 transition-colors active:scale-95"
                        >
                          <Pencil className="w-3 h-3" /> Rename
                        </button>
                      )}
                      {/* Copy button */}
                      <button
                        onClick={() => handleCopyUrl(item.url)}
                        className="flex items-center gap-1 px-2.5 py-1.5 rounded-lg bg-blue-500/15 text-blue-400 text-[11px] font-semibold hover:bg-blue-500/25 transition-colors active:scale-95"
                      >
                        <Copy className="w-3 h-3" /> Copy
                      </button>
                      {/* Delete button */}
                      <button
                        onClick={() => handleDelete(item)}
                        disabled={deletingId === item.id}
                        className="flex items-center gap-1 px-2.5 py-1.5 rounded-lg bg-red-500/15 text-red-400 text-[11px] font-semibold hover:bg-red-500/25 transition-colors active:scale-95 disabled:opacity-40"
                      >
                        {deletingId === item.id ? (
                          <div className="w-3.5 h-3.5 border-2 border-red-400/30 border-t-red-400 rounded-full animate-spin" />
                        ) : (
                          <Trash2 className="w-3 h-3" />
                        )}
                        Delete
                      </button>
                    </div>
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>

      </div>
    </div>
  );
}
