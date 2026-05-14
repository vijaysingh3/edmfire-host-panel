'use client';

import { useState } from 'react';
import { Button } from '@/components/ui/button';
import { toast } from 'sonner';
import {
  Image as ImageIcon,
  Upload,
  Search,
  RefreshCw,
  Copy,
  X,
  ImagePlus,
} from 'lucide-react';

interface ThumbnailItem {
  id: string;
  title: string;
  url: string;
  uploadedAt: string;
}

const demoThumbnails: ThumbnailItem[] = [
  { id: '1', title: 'BattleRoyal Tournament #EDM_275', url: 'https://cdn.edmfire.com/thumb/edm_275_banner.png', uploadedAt: '12 May 2025' },
  { id: '2', title: 'ClashSquad Night Mode #EDM_276', url: 'https://cdn.edmfire.com/thumb/edm_276_clash.png', uploadedAt: '11 May 2025' },
  { id: '3', title: 'FreeTournaments Special Event', url: 'https://cdn.edmfire.com/thumb/free_event_special.png', uploadedAt: '10 May 2025' },
  { id: '4', title: 'LoneWolf Championship Finals', url: 'https://cdn.edmfire.com/thumb/lone_wolf_finals.png', uploadedAt: '09 May 2025' },
  { id: '5', title: 'Weekend BattleRoyal Mega', url: 'https://cdn.edmfire.com/thumb/weekend_mega_br.png', uploadedAt: '08 May 2025' },
];

export default function ThumbnailPage() {
  const [imageSelected, setImageSelected] = useState(false);
  const [uploading, setUploading] = useState(false);
  const [uploadedUrl, setUploadedUrl] = useState('');
  const [searchQuery, setSearchQuery] = useState('');

  const filtered = demoThumbnails.filter((t) =>
    t.title.toLowerCase().includes(searchQuery.toLowerCase())
  );

  const handlePickImage = () => {
    setImageSelected(true);
    toast.success('Image Selected!');
  };

  const handleUpload = () => {
    if (!imageSelected) return;
    setUploading(true);
    setTimeout(() => {
      setUploading(false);
      setUploadedUrl('https://cdn.edmfire.com/thumb/edm_282_new_upload.png');
      setImageSelected(false);
      toast.success('Thumbnail Uploaded Successfully!');
    }, 2000);
  };

  const handleCopyUrl = (url: string) => {
    navigator.clipboard.writeText(url).catch(() => {});
    toast.success('URL Copied!');
  };

  return (
    <div className="min-h-screen pb-20 lg:pb-6">
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

          {/* Image Preview */}
          <div className={`relative w-full h-44 rounded-xl overflow-hidden ${imageSelected ? 'bg-gradient-to-br from-purple-500/20 to-fuchsia-500/20 border-2 border-dashed border-purple-500/40' : 'bg-[oklch(0.15,0.04,290)] border-2 border-dashed border-[oklch(0.28,0.05,290)]'} flex items-center justify-center`}>
            {imageSelected ? (
              <div className="flex flex-col items-center gap-2">
                <ImagePlus className="w-10 h-10 text-purple-400" />
                <span className="text-xs text-purple-300 font-medium">tournament_banner.png</span>
              </div>
            ) : (
              <div className="flex flex-col items-center gap-2">
                <ImageIcon className="w-10 h-10 text-[oklch(0.28,0.04,290)]" />
                <span className="text-xs text-[oklch(0.40,0.04,290)]">Image preview area</span>
              </div>
            )}
          </div>

          {/* No Image Hint */}
          {!imageSelected && (
            <p className="text-center text-xs text-[oklch(0.45,0.04,290)]">No image selected</p>
          )}

          {/* Pick + Upload Buttons */}
          <div className="grid grid-cols-2 gap-3">
            <Button onClick={handlePickImage}
              className="h-11 rounded-xl bg-gradient-to-r from-blue-500 to-blue-600 text-white font-semibold text-sm shadow-lg shadow-blue-500/20">
              <ImagePlus className="w-4 h-4 mr-2" /> Pick Image
            </Button>
            <Button onClick={handleUpload} disabled={!imageSelected || uploading}
              className="h-11 rounded-xl bg-gradient-to-r from-green-500 to-emerald-600 text-white font-semibold text-sm shadow-lg shadow-green-500/20 disabled:opacity-40 disabled:cursor-not-allowed">
              {uploading ? <div className="w-4 h-4 border-2 border-white/30 border-t-white rounded-full animate-spin" /> : <><Upload className="w-4 h-4 mr-2" /> Upload</>}
            </Button>
          </div>

          {/* Upload Progress */}
          {uploading && (
            <div className="space-y-2">
              <div className="w-full h-1.5 bg-[oklch(0.20,0.04,290)] rounded-full overflow-hidden">
                <div className="h-full bg-gradient-to-r from-green-400 to-emerald-500 rounded-full animate-pulse" style={{ width: '70%' }} />
              </div>
              <p className="text-xs text-center text-green-400">Uploading...</p>
            </div>
          )}

          {/* Recently Uploaded URL */}
          {uploadedUrl && !uploading && (
            <div className="rounded-xl bg-blue-500/10 border border-blue-500/20 p-3.5 space-y-2">
              <p className="text-xs font-bold text-blue-400">Recently Uploaded URL:</p>
              <p className="text-xs text-[oklch(0.60,0.04,290)] break-all leading-relaxed">{uploadedUrl}</p>
              <button onClick={() => handleCopyUrl(uploadedUrl)}
                className="flex items-center gap-1.5 px-3.5 py-1.5 rounded-lg bg-blue-500/20 text-blue-400 text-xs font-semibold hover:bg-blue-500/30 transition-colors">
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
            <button onClick={() => toast.success('Refreshed!')}
              className="w-9 h-9 rounded-lg bg-[oklch(0.18,0.04,290)] border border-[oklch(0.30,0.06,290)] flex items-center justify-center hover:bg-[oklch(0.22,0.04,290)] transition-colors">
              <RefreshCw className="w-4 h-4 text-[oklch(0.55,0.04,290)]" />
            </button>
          </div>

          {/* Search Bar */}
          <div className="flex items-center gap-2.5 bg-[oklch(0.18,0.04,290)] border border-[oklch(0.30,0.06,290)] rounded-xl px-3.5 py-2.5">
            <Search className="w-4 h-4 text-[oklch(0.45,0.04,290)] shrink-0" />
            <input type="text" value={searchQuery} onChange={(e) => setSearchQuery(e.target.value)}
              placeholder="Search by title..." className="flex-1 bg-transparent text-sm text-white placeholder:text-[oklch(0.40,0.04,290)] outline-none" />
            {searchQuery && <button onClick={() => setSearchQuery('')}><X className="w-4 h-4 text-red-400" /></button>}
          </div>

          {/* Thumbnails List */}
          {filtered.length === 0 ? (
            <div className="flex flex-col items-center py-14 space-y-3">
              <ImageIcon className="w-10 h-10 text-[oklch(0.25,0.04,290)]" />
              <p className="text-xs text-[oklch(0.40,0.04,290)]">No thumbnails found</p>
            </div>
          ) : (
            <div className="space-y-3">
              {filtered.map((item) => (
                <div key={item.id} className="rounded-xl bg-[oklch(0.18,0.04,290)] border border-[oklch(0.28,0.05,290)] p-3 space-y-2.5">
                  {/* Thumbnail Preview */}
                  <div className="w-full h-36 rounded-lg bg-[oklch(0.14,0.04,290)] border border-[oklch(0.22,0.05,290)] flex items-center justify-center overflow-hidden">
                    <ImageIcon className="w-12 h-12 text-[oklch(0.25,0.04,290)]" />
                  </div>
                  {/* Title */}
                  <h3 className="text-sm font-bold text-white leading-snug">{item.title}</h3>
                  {/* URL */}
                  <p className="text-[11px] text-[oklch(0.50,0.04,290)] truncate font-mono">{item.url}</p>
                  {/* Date + Copy */}
                  <div className="flex items-center justify-between">
                    <span className="text-[10px] text-[oklch(0.40,0.04,290)]">{item.uploadedAt}</span>
                    <button onClick={() => handleCopyUrl(item.url)}
                      className="flex items-center gap-1 px-3 py-1.5 rounded-lg bg-blue-500/15 text-blue-400 text-[11px] font-semibold hover:bg-blue-500/25 transition-colors active:scale-95">
                      <Copy className="w-3 h-3" /> Copy URL
                    </button>
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
