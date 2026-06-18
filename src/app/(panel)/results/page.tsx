'use client';

import { useState, useEffect, useRef } from 'react';
import { Input } from '@/components/ui/input';
import { Button } from '@/components/ui/button';
import { Label } from '@/components/ui/label';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import { toast } from 'sonner';
import { useAuth } from '@/context/AuthContext';
import { rtdbGet, rtdbPut, rtdbPatch, rtdbDelete } from '@/lib/rtdb';
import {
  Target,
  Search,
  RefreshCw,
  RotateCcw,
  X,
  Info,
  Save,
  Trash2,
} from 'lucide-react';

// ═══════════════════════════════════════════════════
// CONSTANTS — Kotlin tournamentTypes array equivalent
// ═══════════════════════════════════════════════════
const TOURNAMENT_TYPES = [
  { value: 'BattleRoyal', label: 'BattleRoyal' },
  { value: 'ClashSquad', label: 'ClashSquad' },
  { value: 'FreeTournaments', label: 'FreeTournaments' },
  { value: 'LoneWolf', label: 'LoneWolf' },
];

const TOURNAMENT_ID_PREFIX = 'EDM_';
const PAISA_PER_RUPEE = 100;

// ═══════════════════════════════════════════════════
// TYPES — Kotlin PlayerInfoModel equivalent
// ═══════════════════════════════════════════════════
interface PlayerData {
  playerKey: string;
  tournamentType: string;
  tournamentId: string;
  inGameName: string;
  inGameLevel: number;
  inGameUID: string;
  positionSeat: number;
  userId: string;
  joinTime: number;
  kills: number;
  deaths: number;
  assists: number;
  damage: number;
  coinsEarned: number;  // PAISA me store hota hai
  rank: number;
  result: string;       // win / lose / top10 / dq
  isManuallyEdited: boolean;
  isSaved: boolean;       // PaymentStatus already true in RTDB
}

// ═══════════════════════════════════════════════════
// PAISA ↔ RUPEES — Kotlin Bank Method equivalent
// ═══════════════════════════════════════════════════
function paisaToRupees(paisa: number): number {
  return paisa / PAISA_PER_RUPEE;
}

function rupeesToPaisa(rupees: number): number {
  return Math.round(rupees * PAISA_PER_RUPEE);
}

function formatRupees(rupees: number): string {
  if (rupees % 1 === 0) return rupees.toFixed(0);
  return rupees.toFixed(2).replace(/0+$/, '').replace(/\.$/, '');
}

// ═══════════════════════════════════════════════════
// RTDB PATH HELPERS — Kotlin path methods equivalent
// ═══════════════════════════════════════════════════
function getMetaPath(type: string, id: string) {
  return `Tournaments/TournamentMeta/${type}/${id}`;
}
function getDetailsPath(type: string, id: string) {
  return `Tournaments/TournamentDetails/${type}/${id}`;
}
function getJoinedPlayersPath(type: string, id: string) {
  return `Tournaments/TournamentDetails/${type}/${id}/JoinedPlayers`;
}
function getWinnerListPath(type: string, id: string) {
  return `Tournaments/TournamentDetails/${type}/${id}/WinnerList`;
}
function getRemovedUsersPath(type: string, id: string) {
  return `Tournaments/TournamentDetails/${type}/${id}/RemovedUsers`;
}

// ═══════════════════════════════════════════════════
// SAFE JSON HELPERS — Kotlin getString/getInt/getBoolean/getLong
// ═══════════════════════════════════════════════════
function safeStr(obj: any, key: string): string {
  return (obj && obj[key] != null) ? String(obj[key]) : '';
}
function safeInt(obj: any, key: string, def = 0): number {
  return (obj && obj[key] != null) ? Number(obj[key]) || def : def;
}

// ═══════════════════════════════════════════════════
// PARSE PLAYER — supports both Array & Object RTDB formats
// ═══════════════════════════════════════════════════
function parsePlayerData(playerObj: any, playerKey: string, currentType: string, currentId: string): PlayerData {
  return {
    playerKey,
    tournamentType: currentType,
    tournamentId: currentId,
    inGameName: safeStr(playerObj, 'InGameName'),
    inGameLevel: safeInt(playerObj, 'InGameLevel'),
    inGameUID: String(safeInt(playerObj, 'InGameUID')),
    positionSeat: safeInt(playerObj, 'PositionSeat'),
    userId: safeStr(playerObj, 'userId'),
    joinTime: safeInt(playerObj, 'JoinTime'),
    kills: safeInt(playerObj, 'Kills'),
    deaths: safeInt(playerObj, 'Deaths'),
    assists: safeInt(playerObj, 'Assists'),
    damage: safeInt(playerObj, 'Damage'),
    coinsEarned: safeInt(playerObj, 'CoinsEarned'),
    rank: safeInt(playerObj, 'Rank'),
    result: '',
    isManuallyEdited: false,
    isSaved: false,
  };
}

// ═══════════════════════════════════════════════════════════════
// UNICODE GAMING NAME NORMALIZER — module-level constant
// Converts fancy Unicode gaming names → plain Latin for search
// ═══════════════════════════════════════════════════════════════
const SPECIAL_CHAR_MAP: Record<string, string> = {
  // ── Phonetic Extensions (U+0250-U+02AF) ──
  'ɐ':'a','ɑ':'a','ɒ':'a','ɓ':'b','ʙ':'b','ɔ':'o','ɕ':'c',
  'ɖ':'d','ɗ':'d','ə':'e','ɘ':'e','ɛ':'e','ɜ':'e','ɞ':'e',
  'ɟ':'j','ɡ':'g','ɢ':'g','ɦ':'h','ɧ':'h','ʜ':'h','ɪ':'i',
  'ɨ':'i','и':'n','ʞ':'k','ɭ':'l','ɱ':'m','ɴ':'n',
  'ɵ':'o','ɶ':'oe','ɸ':'f','ɹ':'r','ɺ':'r','ɻ':'r','ʁ':'r','ʀ':'r',
  'ʂ':'s','ʃ':'s','ƭ':'t','ʈ':'t','ʉ':'u','ʊ':'u','ʋ':'v',
  'ʍ':'w','ʎ':'y','ʏ':'y','ʐ':'z','ʑ':'z','ʒ':'z','ʓ':'z',
  'ʇ':'t','ɥ':'y','ʛ':'g','ʝ':'j',
  'ɬ':'l','ʟ':'l','ɲ':'n','ɳ':'n','ŋ':'ng',
  'œ':'oe',
  // ── Modifier Letter Small Capitals (U+1D00-U+1D7F) — NFKD does NOT decompose these ──
  'ᴀ':'a','ᴁ':'ae','ᴂ':'ae','ᴃ':'b','ᴄ':'c','ᴅ':'d','ᴇ':'e',
  'ᴈ':'e','ᴉ':'i','ᴊ':'j','ᴋ':'k','ᴌ':'l','ᴍ':'m','ᴎ':'n',
  'ᴏ':'o','ᴐ':'o','ᴘ':'p','ᴙ':'r','ᴚ':'r','ᴛ':'t','ᴜ':'u',
  'ᴠ':'v','ᴡ':'w','ʏ':'y','ᴢ':'z','ᴑ':'o','ᴒ':'o','ᴓ':'o',
  // ── Other modifier / decorative ──
  'Ͳ':'s','ʩ':'sh',
  'Ƭ':'t','ꀤ':'i','ᑎ':'n','ⵊ':'j','⁄':'',
  'ܔ':'',
  // ── Superscript letters (U+1D48-U+1DBF) ──
  'ᵃ':'a','ᵇ':'b','ᶜ':'c','ᵈ':'d','ᵉ':'e','ᶠ':'f','ᵍ':'g',
  'ʰ':'h','ⁱ':'i','ʲ':'j','ᵏ':'k','ˡ':'l','ᵐ':'m','ⁿ':'n',
  'ᵒ':'o','ᵖ':'p','ʳ':'r','ˢ':'s','ᵗ':'t','ᵘ':'u','ᵛ':'v',
  'ʷ':'w','ˣ':'x','ʸ':'y','ᶻ':'z','ᶝ':'e','ᶞ':'e',
  'ᶟ':'e','ᶡ':'g','ᶢ':'g','ᶣ':'g','ᶤ':'i','ᶥ':'i',
  'ᶦ':'i','ᶧ':'i','ᶨ':'k','ᶪ':'l','ᶫ':'l','ᶬ':'m','ᶭ':'m',
  'ᶮ':'n','ᶯ':'n','ᶰ':'n','ᶱ':'o','ᶲ':'o','ᶳ':'s','ᶴ':'s',
  'ᶵ':'u','ᶶ':'u','ᶷ':'v','ᶸ':'v','ᶹ':'v','ᶺ':'w','ᶻ':'z',
  'ᶼ':'z','ᶽ':'z','ᶾ':'z',
  // ── Superscript / Subscript digits ──
  '⁰':'0','¹':'1','²':'2','³':'3','⁴':'4','⁵':'5','⁶':'6','⁷':'7','⁸':'8','⁹':'9',
  '₀':'0','₁':'1','₂':'2','₃':'3','₄':'4','₅':'5','₆':'6','₇':'7','₈':'8','₉':'9',
  // ── Currency → Latin ──
  '¥':'y','€':'e','$':'s','₹':'r','£':'l','¢':'c',
  '₦':'n','₲':'g','₱':'p','₩':'w','₭':'k','₮':'t',
  // ── Cherokee (used decoratively in BGMI/FreeFire names) ──
  'Ꭰ':'d','Ꭱ':'e','Ꭲ':'i','Ꭳ':'o','Ꭴ':'u','Ꭵ':'v','Ꭶ':'g','Ꭷ':'o',
  'Ꭸ':'h','Ꭹ':'y','Ꭺ':'a','Ꭻ':'j','Ꭼ':'e','Ꭽ':'a','Ꭾ':'p','Ꭿ':'h',
  'Ꮀ':'h','Ꮁ':'h','Ꮂ':'i','Ꮃ':'l','Ꮄ':'d','Ꮅ':'l','Ꮆ':'m','Ꮇ':'m',
  'Ꮈ':'n','Ꮉ':'n','Ꮊ':'h','Ꮋ':'h','Ꮌ':'w','Ꮍ':'w','Ꮎ':'n','Ꮏ':'n',
  'Ꮐ':'g','Ꮑ':'n','Ꮒ':'h','Ꮓ':'z','Ꮔ':'h','Ꮕ':'l','Ꮖ':'t','Ꮗ':'w',
  'Ꮘ':'q','Ꮙ':'v','Ꮚ':'v','Ꮛ':'e','Ꮜ':'s','Ꮝ':'s','Ꮞ':'s','Ꮟ':'s',
  'Ꮠ':'d','Ꮡ':'d','Ꮢ':'r','Ꮣ':'d','Ꮤ':'t','Ꮥ':'t','Ꮦ':'d','Ꮧ':'i',
  'Ꮨ':'i','Ꮩ':'o','Ꮪ':'o','Ꮫ':'o','Ꮬ':'u','Ꮭ':'u','Ꮮ':'l','Ꮯ':'l',
  'Ꮰ':'a','Ꮱ':'a','Ꮲ':'a','Ꮳ':'k','Ꮴ':'k','Ꮵ':'g','Ꮶ':'g','Ꮷ':'g',
  'Ꮸ':'b','Ꮹ':'b','Ꮺ':'b','Ꮻ':'l','Ꮼ':'l','Ꮽ':'m','Ꮾ':'m','Ꮿ':'y',
  'Ᏸ':'y','Ᏹ':'y','Ᏺ':'w','Ᏻ':'w','Ᏼ':'b',
  // ── Greek letters used as Latin ──
  'Α':'a','Β':'b','Γ':'g','Δ':'a','Ε':'e','Ζ':'z','Η':'h','Θ':'o',
  'Ι':'i','Κ':'k','Λ':'a','Μ':'m','Ν':'n','Ξ':'x','Ο':'o','Π':'p',
  'Ρ':'r','Σ':'e','Τ':'t','Υ':'y','Φ':'f','Χ':'x','Ψ':'ps','Ω':'o',
  'α':'a','β':'b','γ':'g','δ':'a','ε':'e','ζ':'z','η':'h','θ':'o',
  'ι':'i','κ':'k','λ':'a','μ':'m','ν':'n','ξ':'x','ο':'o','π':'p',
  'ρ':'r','σ':'e','ς':'s','τ':'t','υ':'y','φ':'f','χ':'x','ψ':'ps','ω':'o',
  // ── Cyrillic that look like Latin ──
  'А':'a','В':'b','С':'c','Е':'e','Н':'h','К':'k','М':'m',
  'О':'o','Р':'p','Т':'t','У':'y','Х':'x','а':'a','в':'b','с':'c',
  'е':'e','н':'h','к':'k','м':'m','о':'o','р':'p','т':'t','у':'y','х':'x',
  // ── Tai Tham / Tai Le / Batak / other SE Asian (decorative) ──
  'ᥫ':'','᭡':'','ꫝ':'h','ꪜ':'j','ᮘ':'a','ᥲ':'a','ᥱ':'a','ᥳ':'i',
  // ── Arabic-Indic / Lao digits ──
  '٠':'0','١':'1','٢':'2','٣':'3','٤':'4','٥':'5','٦':'6','٧':'7','٨':'8','٩':'9',
  '໐':'0','໑':'1','໒':'2','໓':'3','໔':'4','໕':'5','໖':'6','໗':'7','໘':'8','໙':'9',
  // ── Number forms ──
  '½':'','⅓':'','⅔':'','¼':'','¾':'','Ⅼ':'l','Ⅷ':'viii','Ⅵ':'vi','ⅳ':'iv',
  // ── Special single chars ──
  '乂':'x','×':'x','Ï':'i','Ē':'e','Ë':'e','Ä':'a','Ö':'o','Ü':'u',
  'Σ':'e','Λ':'a','κ':'k','Ψ':'ps','Ω':'w','Δ':'a','Φ':'f',
  // ── Tifinagh / other exotic symbols ──
  'ﾠ':'','❂':'','☂':'','☄':'','☃':'','♞':'','♤':'','✇':'','✿':'',
  '⸙':'','⸻':'','⸼':'','‿':'','╰':'','╯':'','┊':'',
  // ── Zigzag / decorative Latin Extended ──
  'ẋ':'x','ꜱ':'s','ꜰ':'f','💲':'b',
  // ── Hangul syllables commonly used as decoration ──
  '모':'','ㄱ':'','ㄲ':'','ㄴ':'','ㄷ':'','ㄹ':'','ㅁ':'','ㅂ':'','ㅅ':'',
  'ㅇ':'','ㅈ':'','ㅊ':'','ㅋ':'','ㅌ':'','ㅍ':'','ㅎ':'',
};

// Regex that strips entire decorative Unicode blocks (after individual mapping)
// These blocks are commonly used in BGMI/FreeFire gaming names for decoration
// ⚠️ Only BMP ranges (U+0000-U+FFFF) — supplementary plane ranges break JS regex
//    without the 'u' flag (\u10300 parses as \u1030 + "0", matching ASCII 0-F!)
//    Supplementary chars are handled by Step 6 (non-Latin strip) anyway.
const DECORATIVE_BLOCK_REGEX = [
  '[\u3164\u1160\u115F]',                    // Hangul filler / invisible
  '[\u2800-\u28FF]',                           // Braille
  '[\u1100-\u11FF]',                           // Hangul Jamo
  '[\uA960-\uA97F]',                           // Hangul Jamo Extended-A
  '[\uAC00-\uD7AF]',                           // Hangul Syllables
  '[\u1950-\u197F]',                           // Tai Le (decorative vowels like ᥫ)
  '[\u1A20-\u1AAF]',                           // Tai Tham
  '[\u1B00-\u1B7F]',                           // Balinese (decorative like ᭡)
  '[\u1B80-\u1BBF]',                           // Sundanese
  '[\u1BC0-\u1BFF]',                           // Batak
  '[\uAA00-\uAA5F]',                           // Cham
  '[\uAA80-\uAADF]',                           // Tai Viet
  '[\uA4D0-\uA4FF]',                           // Lisu
  '[\uA900-\uA92F]',                           // Kayah Li
  '[\uA930-\uA95F]',                           // Rejang
  '[\uA980-\uA9DF]',                           // Javanese
  '[\u18A0-\u18FF]',                           // Canadian Aboriginal (decorative)
  '[\u2C00-\u2C5F]',                           // Glagolitic
  '[\u2C80-\u2CFF]',                           // Coptic
  '[\u2D80-\u2DDF]',                           // Ethiopic Extended
  '[\u16A0-\u16FF]',                           // Runic (decorative)
  '[\u1700-\u171F]',                           // Tagalog
  '[\u1720-\u173F]',                           // Hanunoo
  '[\u1740-\u175F]',                           // Buhid
  '[\u1760-\u177F]',                           // Tagbanwa
].join('|');

// Hindi/Indic to Latin mapping (for Hindi gaming names)
const HINDI_TO_LATIN: Record<string, string> = {
  'अ':'a','आ':'aa','इ':'i','ई':'ee','उ':'u','ऊ':'oo','ऋ':'ri','ए':'e','ऐ':'ai',
  'ओ':'o','औ':'au','अं':'an','अः':'ah','क':'k','ख':'kh','ग':'g','घ':'gh','ङ':'ng',
  'च':'ch','छ':'chh','ज':'j','झ':'jh','ञ':'ny','ट':'t','ठ':'th','ड':'d','ढ':'dh',
  'ण':'n','त':'t','थ':'th','द':'d','ध':'dh','न':'n','प':'p','फ':'f','ब':'b',
  'भ':'bh','म':'m','य':'y','र':'r','ल':'l','व':'v','श':'sh','ष':'sh','स':'s','ह':'h',
  'ळ':'l','क्ष':'ksh','ज्ञ':'gy','ॠ':'ri','ृ':'ri','ी':'i','ा':'a','ि':'i','ु':'u',
  'ू':'u','े':'e','ो':'o','ौ':'au','ं':'n','ः':'h','्':'',
  '०':'0','१':'1','२':'2','३':'3','४':'4','५':'5','६':'6','७':'7','८':'8','९':'9',
  'ஜ':'j','க':'k','ர':'r','ன':'n','ள':'l',
  'ನ':'n','ಟ':'t','ಭ':'bh','ಯ':'y','ಂ':'n','ಕ':'k','ರ':'r','ಜ':'j','ಳ':'l',
};

const normalizeStr = (s: string): string => {
  // Step 1: NFKD decomposition (full-width Ａ→A, circled ⓐ→a, etc.)
  let result = s.normalize('NFKD');

  // Step 2: Map special Unicode → Latin via lookup (using Array.from for proper code point handling)
  result = Array.from(result).map(ch => {
    const mapped = SPECIAL_CHAR_MAP[ch];
    return mapped !== undefined ? mapped : ch;
  }).join('');

  // Step 3: Strip combining diacritical marks (◌̈ ◌́ ◌̀ ◌̄ ◌̃ etc.)
  result = result.replace(/[\u0300-\u036F]/g, '');

  // Step 4: Strip invisible / zero-width / format characters
  result = result.replace(/[\u200B-\u200D\uFEFF]/g, '');       // zero-width spaces
  result = result.replace(/[\u2060-\u206F]/g, '');               // invisible format chars
  result = result.replace(/[\u00AD\u034F]/g, '');                // soft hyphen, CGJ
  result = result.replace(/[\u200E-\u200F]/g, '');               // LRM/RLM marks
  result = result.replace(/[\u202A-\u202E]/g, '');               // embedding controls

  // Step 5: Strip entire decorative Unicode blocks (Tai Le, Balinese, Hangul, etc.)
  result = result.replace(new RegExp(DECORATIVE_BLOCK_REGEX, 'g'), '');

  // Step 6: Strip all remaining non-Latin-non-digit characters
  result = result.replace(/[^a-zA-Z0-9\u0900-\u097F\u0980-\u09FF\u0A80-\u0AFF\u0B00-\u0B7F]/g, '');

  // Step 7: Devanagari/Hindi/Indic → Latin
  result = result.replace(/[\u0900-\u097F\u0980-\u09FF\u0A80-\u0AFF\u0B00-\u0B7F]/g, (ch) => HINDI_TO_LATIN[ch] || '');

  // Step 8: Collapse spaces, lowercase
  result = result.replace(/\s+/g, '').toLowerCase();

  return result;
};

export default function ResultsPage() {
  const { user } = useAuth();
  const logEndRef = useRef<HTMLDivElement>(null);
  const deleteConfirmRef = useRef<HTMLInputElement>(null);
  const [deleteTarget, setDeleteTarget] = useState<PlayerData | null>(null);
  const [deleteUidInput, setDeleteUidInput] = useState('');
  const [showSaveAllDialog, setShowSaveAllDialog] = useState(false);
  const [savingAll, setSavingAll] = useState(false);

  // ── Config state ──
  const [configReady, setConfigReady] = useState(false);

  // ── Tournament state ──
  const [tournamentType, setTournamentType] = useState('');
  const [tournamentId, setTournamentId] = useState(TOURNAMENT_ID_PREFIX);
  const [tournamentIdsMap, setTournamentIdsMap] = useState<Record<string, string[]>>({});
  const [isTournamentValid, setIsTournamentValid] = useState(false);
  const [currentPerKillPaisa, setCurrentPerKillPaisa] = useState(0);
  const [isAutoCalcEnabled, setIsAutoCalcEnabled] = useState(false);
  const [tournamentMode, setTournamentMode] = useState('');
  const [prizePool, setPrizePool] = useState(0);
  const [joinedPlayersCount, setJoinedPlayersCount] = useState(0);

  // ── Result toggle — Kotlin switchResult equivalent ──
  const [resultPublished, setResultPublished] = useState(false);
  const [resultLoading, setResultLoading] = useState(false);
  const [showResultToggle, setShowResultToggle] = useState(false);

  // ── Loading ──
  const [loading, setLoading] = useState(false);
  const [updatingPlayer, setUpdatingPlayer] = useState<string | null>(null);
  const [searchQuery, setSearchQuery] = useState('');

  // ── Players data ──
  const [players, setPlayers] = useState<PlayerData[]>([]);
  const [showRevertBtn, setShowRevertBtn] = useState(false);
  const [pendingCount, setPendingCount] = useState(0);

  const filteredPlayers = (() => {
    if (!searchQuery.trim()) return players;
    const q = searchQuery.trim();
    const lowerQ = q.toLowerCase();
    const normQ = normalizeStr(q);
    const basicQ = lowerQ.replace(/[^a-z0-9]/g, '');

    // Multi-word support: "raja smart" → check each word individually + combined
    const queryWords = q.trim().split(/\s+/).filter(w => w.length > 0);
    const normWords = queryWords.map(w => normalizeStr(w));
    const basicWords = queryWords.map(w => w.toLowerCase().replace(/[^a-z0-9]/g, ''));

    const scored = players.map(p => {
      const name = p.inGameName;
      const uid = String(p.inGameUID);
      const lowerName = name.toLowerCase();
      const normName = normalizeStr(name);
      const basicName = name.replace(/[^A-Za-z0-9]/g, '').toLowerCase();

      let score = 0;

      // ── UID exact/partial ──
      if (uid === q) score = 1000;
      else if (uid.startsWith(q)) score = 950;
      else if (uid.includes(q)) score = 900;

      // ── Name exact match (raw) ──
      if (name === q) score = Math.max(score, 860);
      else if (lowerName === lowerQ) score = Math.max(score, 850);

      // ── Name starts with (raw) ──
      if (lowerName.startsWith(lowerQ)) score = Math.max(score, 750);

      // ── Normalized exact / prefix / contains ──
      if (normName === normQ) score = Math.max(score, 700);
      else if (normName.startsWith(normQ)) score = Math.max(score, 650);
      else if (normName.includes(normQ)) score = Math.max(score, 550);

      // ── Basic stripped match ──
      if (basicName === basicQ) score = Math.max(score, 500);
      else if (basicName.startsWith(basicQ)) score = Math.max(score, 450);
      else if (basicName.includes(basicQ)) score = Math.max(score, 380);

      // ── Word-level: each query word matches independently ──
      if (queryWords.length > 1) {
        const allMatch = queryWords.every(w => {
          const lw = w.toLowerCase();
          const nw = normalizeStr(w);
          return lowerName.includes(lw) || normName.includes(nw);
        });
        if (allMatch) score = Math.max(score, 600);
      }

      // ── Any word in name matches full query ──
      if (normName.split(/\d+/).some(w => w === normQ)) score = Math.max(score, 520);

      // ── Character-level subsequence fuzzy (ordered chars in normalized name) ──
      if (score === 0 && normQ.length >= 2) {
        let qi = 0;
        for (let ni = 0; ni < normName.length && qi < normQ.length; ni++) {
          if (normName[ni] === normQ[qi]) qi++;
        }
        if (qi === normQ.length) score = Math.max(score, 200);
      }

      // ── Subsequence fuzzy on basic (raw letters only) ──
      if (score === 0 && basicQ.length >= 2) {
        let qi = 0;
        for (let ni = 0; ni < basicName.length && qi < basicQ.length; ni++) {
          if (basicName[ni] === basicQ[qi]) qi++;
        }
        if (qi === basicQ.length) score = Math.max(score, 160);
      }

      // ── Raw partial fallback ──
      if (score === 0 && lowerName.includes(lowerQ)) score = Math.max(score, 120);

      return { player: p, score };
    }).filter(s => s.score > 0).sort((a, b) => b.score - a.score);
    return scored.map(s => s.player);
  })();

  // ═══════════════════════════════════════════════
  // INIT — Kotlin initRemoteConfigAndLoad()
  // ═══════════════════════════════════════════════
  useEffect(() => {
    const init = async () => {
      setLoading(true);
      setConfigReady(true);
      loadTournamentIds();
    };
    init();
  }, []);

  // ── Tournament ID filter — only EDM_ + digits ──
  const handleTournamentIdChange = (value: string) => {
    if (!value.startsWith(TOURNAMENT_ID_PREFIX)) {
      setTournamentId(value === '' ? TOURNAMENT_ID_PREFIX : `${TOURNAMENT_ID_PREFIX}${value.replace(/[^0-9]/g, '')}`);
      return;
    }
    const afterPrefix = value.slice(TOURNAMENT_ID_PREFIX.length);
    setTournamentId(`${TOURNAMENT_ID_PREFIX}${afterPrefix.replace(/[^0-9]/g, '')}`);
  };

  const handleTypeChange = (value: string) => {
    setTournamentType(value);
    resetTournamentState();
  };

  // ═══════════════════════════════════════════════
  // RESET — Kotlin resetTournamentState()
  // ═══════════════════════════════════════════════
  const resetTournamentState = () => {
    setIsTournamentValid(false);
    setCurrentPerKillPaisa(0);
    setIsAutoCalcEnabled(false);
    setTournamentMode('');
    setPrizePool(0);
    setJoinedPlayersCount(0);
    setPlayers([]);
    setShowResultToggle(false);
    setShowRevertBtn(false);
    setResultPublished(false);
    setSearchQuery('');
  };

  // ═══════════════════════════════════════════════
  // LOAD TOURNAMENT IDs — Kotlin loadTournamentIds()
  // RTDB: Tournaments/TournamentMeta → all type IDs
  // ═══════════════════════════════════════════════
  const loadTournamentIds = async () => {
    try {
      const data = await rtdbGet('Tournaments/TournamentMeta');
      if (!data || data === null) {
        setLoading(false);
        return;
      }
      const idMap: Record<string, string[]> = {};
      for (const type of TOURNAMENT_TYPES) {
        const ids: string[] = [];
        if (data[type.value]) {
          const typeObj = data[type.value];
          for (const id of Object.keys(typeObj)) {
            ids.push(id);
          }
        }
        // Newest first — EDM_999 before EDM_001
        ids.sort((a, b) => {
          const numA = parseInt(a.replace(/\D/g, '')) || 0;
          const numB = parseInt(b.replace(/\D/g, '')) || 0;
          return numB - numA;
        });
        idMap[type.value] = ids;
      }
      setTournamentIdsMap(idMap);
      setLoading(false);
    } catch (e: any) {
      toast.error('Failed to load tournaments');
      setLoading(false);
    }
  };

  // ═══════════════════════════════════════════════
  // REFRESH — Kotlin validateAndLoadTournament()
  // ═══════════════════════════════════════════════
  const handleRefresh = async () => {
    if (!configReady) {
      toast.error('Config not ready. Wait.');
      return;
    }
    if (!user) {
      toast.error('Not logged in');
      return;
    }
    const id = tournamentId.trim();
    if (!id || id === TOURNAMENT_ID_PREFIX) {
      toast.error('Please enter Tournament ID');
      return;
    }
    if (!tournamentType) {
      toast.error('Please select Tournament Type');
      return;
    }

    const availableIds = tournamentIdsMap[tournamentType] || [];
    if (!availableIds.includes(id)) {
      toast.error(`Tournament '${id}' not found in ${tournamentType}`);
      resetTournamentState();
      return;
    }

    // ═══ HostUID Check — sirf apni tournament ═══
    try {
      const detailsData = await rtdbGet(`Tournaments/TournamentDetails/${tournamentType}/${id}`);
      if (detailsData) {
        const hostUID = detailsData.HostUID || detailsData.hostUID || '';
        if (hostUID !== user.uid) {
          toast.error('ACCESS DENIED: This tournament belongs to another host');
          resetTournamentState();
          return;
        }
      }
    } catch {
      // Meta exists but details might not — allow continue
    }

    setIsTournamentValid(true);
    fetchTournamentInfo();
    loadResultStatus();
  };

  // ═══════════════════════════════════════════════
  // FETCH TOURNAMENT INFO — Kotlin fetchTournamentInfo()
  // RTDB: Tournaments/TournamentMeta/{type}/{id}
  // ═══════════════════════════════════════════════
  const fetchTournamentInfo = async () => {
    const id = tournamentId.trim();
    try {
      const data = await rtdbGet(getMetaPath(tournamentType, id));
      if (data && data !== null) {
        const mode = safeStr(data, 'Mode');
        const pool = safeInt(data, 'PricePool');
        const joined = safeInt(data, 'JoinedPlayersCount');
        const perKill = safeInt(data, 'PerKill');

        setTournamentMode(mode);
        setPrizePool(pool);
        setJoinedPlayersCount(joined);
        setCurrentPerKillPaisa(perKill);
        setIsAutoCalcEnabled(perKill > 0);
      }
      fetchPlayersData();
    } catch (e: any) {
      fetchPlayersData();
    }
  };

  // ═══════════════════════════════════════════════
  // LOAD RESULT STATUS — Kotlin loadResultStatus()
  // RTDB: Tournaments/TournamentDetails/{type}/{id}/ResultStatus
  // ═══════════════════════════════════════════════
  const loadResultStatus = async () => {
    const id = tournamentId.trim();
    setResultLoading(true);
    try {
      const data = await rtdbGet(`${getDetailsPath(tournamentType, id)}/ResultStatus`);
      if (data !== null && data !== undefined && typeof data === 'string') {
        const status = data === 'true';
        setResultPublished(status);
        setShowResultToggle(true);
      } else {
        setShowResultToggle(false);
      }
    } catch (e: any) {
      setShowResultToggle(false);
    } finally {
      setResultLoading(false);
    }
  };

  // ═══════════════════════════════════════════════
  // FETCH PLAYERS — Load ALL players (saved + pending)
  // ═══════════════════════════════════════════════
  const fetchPlayersData = async () => {
    const id = tournamentId.trim();
    setLoading(true);
    try {
      const data = await rtdbGet(getJoinedPlayersPath(tournamentType, id));
      const parsedPlayers: PlayerData[] = [];
      let pending = 0;

      if (data && data !== null && typeof data === 'object') {
        const parse = (playerObj: any, key: string) => {
          if (playerObj && typeof playerObj === 'object') {
            const p = parsePlayerData(playerObj, key, tournamentType, id);
            const isSaved = playerObj.PaymentStatus === true;
            p.isSaved = isSaved;
            if (isSaved) {
              p.result = safeStr(playerObj, 'Result');
            }
            if (!isSaved) pending++;
            parsedPlayers.push(p);
          }
        };
        if (Array.isArray(data)) {
          data.forEach((playerObj: any, index: number) => parse(playerObj, String(index)));
        } else {
          for (const [key, value] of Object.entries(data)) parse(value as any, key);
        }
      }

      // Auto-calc coins if PerKill > 0 (only for pending players)
      if (isAutoCalcEnabled) {
        parsedPlayers.forEach(p => {
          if (!p.isManuallyEdited && !p.isSaved) {
            p.coinsEarned = p.kills * currentPerKillPaisa;
          }
        });
      }

      // Sort: pending first (newest joined first), then saved
      parsedPlayers.sort((a, b) => {
        if (a.isSaved !== b.isSaved) return a.isSaved ? 1 : -1;
        return (b.joinTime || 0) - (a.joinTime || 0);
      });

      setPlayers(parsedPlayers);
      setPendingCount(pending);
      toast.success(`Loaded ${parsedPlayers.length} players (${pending} pending)`);
      checkAndUpdateRevertButton();
    } catch (e: any) {
      toast.error(`Failed to fetch players: ${e.message}`);
    } finally {
      setLoading(false);
    }
  };

  // ═══════════════════════════════════════════════
  // CHECK REVERT BUTTON — Kotlin checkAndUpdateRevertButton()
  // ═══════════════════════════════════════════════
  const checkAndUpdateRevertButton = async () => {
    try {
      const data = await rtdbGet(getJoinedPlayersPath(tournamentType, tournamentId.trim()));
      let hasTrue = false;
      if (data && typeof data === 'object') {
        const checkObj = (obj: any) => {
          if (obj && typeof obj === 'object' && obj.PaymentStatus === true) hasTrue = true;
        };
        if (Array.isArray(data)) data.forEach(checkObj);
        else Object.values(data).forEach(checkObj);
      }
      setShowRevertBtn(hasTrue);
    } catch {
      setShowRevertBtn(false);
    }
  };

  // ═══════════════════════════════════════════════
  // REVERT ALL — Kotlin revertAllPlayers()
  // Step 1: Check tournament PaymentStatus
  // Step 2: DELETE WinnerList
  // Step 3: PATCH all JoinedPlayers PaymentStatus = false
  // ═══════════════════════════════════════════════
  const handleRevert = async () => {
    const confirmed = window.confirm(
      '⚠️ WARNING: This will reset ALL players\' PaymentStatus back to false.\n\n' +
      'This means all updated players will need to be updated again.\n\n' +
      'Are you sure you want to proceed?'
    );
    if (!confirmed) return;

    const id = tournamentId.trim();
    setLoading(true);

    try {
      // Step 1: Check tournament PaymentStatus
      const paymentData = await rtdbGet(`${getDetailsPath(tournamentType, id)}/PaymentStatus`);
      const isPaymentDone = paymentData === 'true' || paymentData === true;
      if (isPaymentDone) {
        toast.error('Cannot revert: Tournament payment already done (PaymentStatus = true)');
        setLoading(false);
        return;
      }

      // Step 2: DELETE WinnerList
      await rtdbDelete(getWinnerListPath(tournamentType, id));

      // Step 3: PATCH all JoinedPlayers PaymentStatus = false
      const data = await rtdbGet(getJoinedPlayersPath(tournamentType, id));
      if (!data || data === null) {
        toast.info('No players to revert');
        setLoading(false);
        return;
      }

      const updates: Array<{ key: string; path: string }> = [];

      if (Array.isArray(data)) {
        data.forEach((playerObj: any, index: number) => {
          if (playerObj && typeof playerObj === 'object' && playerObj.PaymentStatus === true) {
            playerObj.PaymentStatus = false;
            updates.push({ key: String(index), path: `${getJoinedPlayersPath(tournamentType, id)}/${index}` });
            // PATCH with the updated object (we mutate PaymentStatus)
          }
        });
      } else {
        for (const [key, value] of Object.entries(data)) {
          const playerObj = value as any;
          if (playerObj && typeof playerObj === 'object' && playerObj.PaymentStatus === true) {
            updates.push({ key, path: `${getJoinedPlayersPath(tournamentType, id)}/${key}` });
          }
        }
      }

      if (updates.length === 0) {
        toast.info('No players to revert (no PaymentStatus=true found)');
        setLoading(false);
        return;
      }

      // PATCH each player
      let completed = 0;
      for (const { path } of updates) {
        await rtdbPatch(path, { PaymentStatus: false });
        completed++;
      }

      toast.success(`Revert complete! ${completed} players reset + WinnerList cleared`);
      fetchPlayersData();
      loadResultStatus();
    } catch (e: any) {
      toast.error(`Revert failed: ${e.message}`);
    } finally {
      setLoading(false);
    }
  };

  // ═══════════════════════════════════════════════
  // UPDATE PLAYER — Kotlin updatePlayerData()
  // PATCH JoinedPlayers/{key} + update WinnerList
  // ═══════════════════════════════════════════════
  const updatePlayer = async (player: PlayerData) => {
    setUpdatingPlayer(player.playerKey);

    try {
      // Auto-calc coins if enabled and not manually edited
      if (isAutoCalcEnabled && !player.isManuallyEdited) {
        player.coinsEarned = player.kills * currentPerKillPaisa;
      }

      const playerData = {
        InGameName: player.inGameName,
        InGameLevel: player.inGameLevel,
        InGameUID: player.inGameUID,
        PositionSeat: player.positionSeat,
        userId: player.userId,
        JoinTime: player.joinTime,
        Kills: player.kills,
        Deaths: player.deaths,
        Assists: player.assists,
        Damage: player.damage,
        CoinsEarned: player.coinsEarned,
        Rank: player.rank,
        Result: player.result,
        PaymentStatus: true,
      };

      const fullPath = `${getJoinedPlayersPath(tournamentType, tournamentId.trim())}/${player.playerKey}`;
      const success = await rtdbPatch(fullPath, playerData);

      if (success) {
        // Update WinnerList
        await updateWinnerList(player);
        // Mark as saved locally without full reload
        setPlayers(prev => prev.map(p => p.playerKey === player.playerKey ? { ...p, isSaved: true } : p));
        setPendingCount(prev => Math.max(0, prev - 1));
        checkAndUpdateRevertButton();
        toast.success(`${player.inGameName} saved!`);
      } else {
        toast.error('Failed to update player');
      }
    } catch (e: any) {
      toast.error(`Update failed: ${e.message}`);
    } finally {
      setUpdatingPlayer(null);
    }
  };

  // ═══════════════════════════════════════════════
  // SAVE ALL — save all pending players at once
  // ═══════════════════════════════════════════════
  const hasAnyResultField = (p: PlayerData): boolean => {
    return (
      p.kills > 0 ||
      p.deaths > 0 ||
      p.assists > 0 ||
      p.damage > 0 ||
      p.coinsEarned > 0 ||
      p.rank > 0 ||
      (p.result && p.result !== '' && p.result !== 'lose')
    );
  };

  const handleSaveAll = async () => {
    setShowSaveAllDialog(false);
    setSavingAll(true);
    const pending = players.filter(p => !p.isSaved && hasAnyResultField(p));
    let saved = 0;
    for (const player of pending) {
      try {
        if (isAutoCalcEnabled && !player.isManuallyEdited) {
          player.coinsEarned = player.kills * currentPerKillPaisa;
        }
        const pd = {
          InGameName: player.inGameName, InGameLevel: player.inGameLevel,
          InGameUID: player.inGameUID, PositionSeat: player.positionSeat,
          userId: player.userId, JoinTime: player.joinTime,
          Kills: player.kills, Deaths: player.deaths, Assists: player.assists,
          Damage: player.damage, CoinsEarned: player.coinsEarned,
          Rank: player.rank, Result: player.result, PaymentStatus: true,
        };
        const fp = `${getJoinedPlayersPath(tournamentType, tournamentId.trim())}/${player.playerKey}`;
        const ok = await rtdbPatch(fp, pd);
        if (ok) { await updateWinnerList(player); saved++; }
      } catch { /* skip */ }
    }
    setSavingAll(false);
    toast.success(`Saved ${saved}/${pending.length} players`);
    fetchPlayersData();
  };

  // ═══════════════════════════════════════════════
  // UPDATE WINNER LIST — Kotlin updateWinnerList()
  // ═══════════════════════════════════════════════
  const updateWinnerList = async (player: PlayerData) => {
    const winnerListPath = getWinnerListPath(tournamentType, tournamentId.trim());
    const winnerData = {
      userId: player.userId,
      winnings: player.coinsEarned,
      rank: player.rank,
      result: player.result,
      PaymentStatus: false,
      InGameName: player.inGameName,
      InGameLevel: player.inGameLevel,
      InGameUID: player.inGameUID,
    };

    try {
      const existing = await rtdbGet(winnerListPath);
      let existingKey: string | null = null;

      if (existing && typeof existing === 'object') {
        if (Array.isArray(existing)) {
          existing.forEach((item: any, index: number) => {
            if (item && item.userId === player.userId) existingKey = String(index);
          });
        } else {
          for (const [key, value] of Object.entries(existing)) {
            const obj = value as any;
            if (obj && obj.userId === player.userId) existingKey = key;
          }
        }
      }

      if (existingKey !== null) {
        await rtdbPatch(`${winnerListPath}/${existingKey}`, winnerData);
      } else {
        // Find next key
        let nextKey = 1;
        if (existing && typeof existing === 'object') {
          if (Array.isArray(existing)) {
            let foundNull = false;
            for (let i = 0; i < existing.length; i++) {
              if (existing[i] === null || existing[i] === undefined) {
                nextKey = i;
                foundNull = true;
                break;
              }
            }
            if (!foundNull) nextKey = existing.length;
          } else {
            const keys = Object.keys(existing).map(Number).filter(n => !isNaN(n));
            nextKey = (keys.length > 0 ? Math.max(...keys) : 0) + 1;
          }
        }
        await rtdbPut(`${winnerListPath}/${nextKey}`, winnerData);
      }
    } catch (e: any) {
    }
  };

  // ═══════════════════════════════════════════════
  // DELETE PLAYER — Kotlin deletePlayerAndMoveToRemoved()
  // DELETE from JoinedPlayers + PUT to RemovedUsers
  // ═══════════════════════════════════════════════
  const handleDeleteClick = (player: PlayerData) => {
    setDeleteTarget(player);
    setDeleteUidInput('');
  };

  const handleDeleteConfirm = async () => {
    if (!deleteTarget || !isTournamentValid) return;
    if (deleteUidInput.trim() !== deleteTarget.inGameUID) {
      toast.error('Incorrect UID!');
      return;
    }

    setLoading(true);
    const player = deleteTarget;
    setDeleteTarget(null);

    try {
      const joinedPath = getJoinedPlayersPath(tournamentType, tournamentId.trim());
      const removedPath = getRemovedUsersPath(tournamentType, tournamentId.trim());

      // Delete from JoinedPlayers
      const delSuccess = await rtdbDelete(`${joinedPath}/${player.playerKey}`);
      if (delSuccess) {
        // Move to RemovedUsers
        const removedData = {
          playerKey: player.playerKey,
          inGameName: player.inGameName,
          inGameUID: player.inGameUID,
          userId: player.userId,
          removedAt: Date.now(),
          removedBy: 'admin',
        };
        await rtdbPut(`${removedPath}/${player.playerKey}`, removedData);
        toast.success('Player removed');
        fetchPlayersData();
      } else {
        toast.error('Failed to delete player');
      }
    } catch (e: any) {
      toast.error(`Delete failed: ${e.message}`);
    } finally {
      setLoading(false);
    }
  };

  // ═══════════════════════════════════════════════
  // RESULT TOGGLE — Kotlin updateResultStatus()
  // PUT to RTDB: TournamentDetails/{type}/{id}/ResultStatus
  // ═══════════════════════════════════════════════
  const handleResultToggle = async (newStatus: boolean) => {
    if (resultLoading || !isTournamentValid) {
      toast.error('Select a valid tournament first');
      return;
    }

    const statusText = newStatus ? 'PUBLISH' : 'UNPUBLISH';
    const message = newStatus
      ? 'Publish result?\n\nPlayers will see results.\nCoins will be distributed.'
      : 'Unpublish result?\n\nPlayers will NOT see results.';

    if (!window.confirm(`${statusText} Result?\n\n${message}`)) {
      return;
    }

    setResultLoading(true);
    setLoading(true);
    try {
      const resultPath = `${getDetailsPath(tournamentType, tournamentId.trim())}/ResultStatus`;
      const success = await rtdbPut(resultPath, String(newStatus));
      if (success) {
        setResultPublished(newStatus);
        toast.success(`Result status: ${newStatus ? 'Published' : 'Not Published'}`);
      } else {
        toast.error('Failed to update result status');
      }
    } catch (e: any) {
      toast.error(`Failed: ${e.message}`);
    } finally {
      setResultLoading(false);
      setLoading(false);
    }
  };

  // ── Update player field — with manual edit tracking for CoinsEarned ──
  const updatePlayerField = (playerKey: string, field: keyof PlayerData, value: any) => {
    setPlayers(prev => prev.map(p => {
      if (p.playerKey !== playerKey) return p;
      const updated = { ...p, [field]: value };
      // Track manual edit on coins
      if (field === 'coinsEarned') {
        updated.isManuallyEdited = true;
        // Auto Result: Coins > 0 → win, Coins 0/empty → lose
        updated.result = (updated.coinsEarned > 0) ? 'win' : 'lose';
      }
      // Auto-calc coins on kill change
      if (field === 'kills' && isAutoCalcEnabled && !updated.isManuallyEdited) {
        updated.coinsEarned = (value as number) * currentPerKillPaisa;
        // Auto Result after auto-calc coins
        updated.result = (updated.coinsEarned > 0) ? 'win' : 'lose';
      }
      return updated;
    }));
  };

  // ── PerKill info display ──
  const perKillRupees = paisaToRupees(currentPerKillPaisa);

  return (
    <div className="min-h-screen pb-20 lg:pb-6">
      {/* Header */}
      <header className="bg-gradient-to-r from-fuchsia-500 to-violet-700 px-4 lg:px-6 py-6 sticky top-0 z-20">
        <div className="max-w-4xl mx-auto">
          <h1 className="text-xl lg:text-2xl font-extrabold text-white flex items-center gap-2">
            <Target className="w-6 h-6" /> Tournament Players Management
          </h1>
          <p className="text-white/60 text-sm mt-1">Step 4 — Enter match results, scores &amp; winner details</p>
        </div>
      </header>

      <div className="max-w-4xl mx-auto px-4 lg:px-6 py-6 space-y-4">

        {/* Tournament Type + ID */}
        <div className="grid grid-cols-2 gap-3">
          <div className="space-y-1.5">
            <Label className="text-[11px] text-[oklch(0.70,0.04,290)] font-semibold">Tournament Type</Label>
            <Select value={tournamentType} onValueChange={handleTypeChange}>
              <SelectTrigger className="bg-[oklch(0.22,0.04,290)] border-[oklch(0.35,0.06,290)] text-white h-10 rounded-xl text-sm">
                <SelectValue placeholder="Select Type" />
              </SelectTrigger>
              <SelectContent>
                {TOURNAMENT_TYPES.map((t) => (
                  <SelectItem key={t.value} value={t.value}>{t.label}</SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>
          <div className="space-y-1.5">
            <Label className="text-[11px] text-[oklch(0.70,0.04,290)] font-semibold">Tournament ID</Label>
            <Input value={tournamentId} onChange={(e) => handleTournamentIdChange(e.target.value)} placeholder="EDM_"
              className="bg-[oklch(0.22,0.04,290)] border-[oklch(0.35,0.06,290)] text-white placeholder:text-[oklch(0.40,0.04,290)] h-10 rounded-xl text-sm text-center font-mono" />
          </div>
        </div>

        {/* Tournament Info — show after refresh */}
        {isTournamentValid && (
          <div className="rounded-xl bg-[oklch(0.18,0.04,290)] border border-fuchsia-500/20 p-3 flex items-center gap-2.5 flex-wrap">
            <div className="w-8 h-8 rounded-lg bg-fuchsia-500/15 flex items-center justify-center shrink-0">
              <Info className="w-4 h-4 text-fuchsia-400" />
            </div>
            <div className="flex-1 min-w-0 flex flex-wrap gap-x-4 gap-y-1">
              <p className="text-[10px] text-[oklch(0.55,0.04,290)]">Mode: <span className="text-fuchsia-400 font-bold">{tournamentMode || 'N/A'}</span></p>
              <p className="text-[10px] text-[oklch(0.55,0.04,290)]">PrizePool: <span className="text-yellow-400 font-bold">{formatRupees(paisaToRupees(prizePool))} Coins</span></p>
              <p className="text-[10px] text-[oklch(0.55,0.04,290)]">Joined: <span className="text-green-400 font-bold">{joinedPlayersCount}</span></p>
              <p className="text-[10px] text-[oklch(0.55,0.04,290)]">PerKill: <span className="text-cyan-400 font-bold">{formatRupees(perKillRupees)} Coins</span> <span className="text-[oklch(0.40,0.04,290)]">{isAutoCalcEnabled ? '(auto)' : '(manual)'}</span></p>
            </div>
          </div>
        )}

        {/* Result Toggle — Kotlin switchResult equivalent */}
        {isTournamentValid && (
          <div className="rounded-xl bg-[oklch(0.18,0.04,290)] border border-[oklch(0.30,0.06,290)] p-3 flex items-center gap-2.5">
            <div className="w-8 h-8 rounded-lg bg-yellow-500/15 flex items-center justify-center shrink-0">
              <Info className="w-4 h-4 text-yellow-400" />
            </div>
            <div className="flex-1 min-w-0">
              <p className="text-xs font-semibold text-white">Result Status</p>
              <p className={`text-[10px] mt-0.5 ${resultPublished ? 'text-green-400' : 'text-red-400'}`}>
                {resultPublished ? 'Result: Published' : 'Result: Not Published'}
              </p>
            </div>
            <button onClick={() => handleResultToggle(!resultPublished)} disabled={resultLoading}
              className={`relative w-11 h-6 rounded-full transition-colors shrink-0 ${resultPublished ? 'bg-green-500' : 'bg-[oklch(0.30,0.06,290)]'}`}>
              <div className={`absolute top-0.5 w-5 h-5 rounded-full bg-white shadow transition-transform ${resultPublished ? 'left-5' : 'left-0.5'}`} />
            </button>
          </div>
        )}

        {/* Refresh + Revert */}
        <div className="grid grid-cols-2 gap-2.5">
          <Button onClick={handleRefresh} disabled={loading}
            className="h-10 rounded-xl bg-gradient-to-r from-blue-500 to-blue-600 text-white font-semibold text-xs shadow-lg shadow-blue-500/20 disabled:opacity-40">
            {loading ? <div className="w-3.5 h-3.5 border-2 border-white/30 border-t-white rounded-full animate-spin mr-1.5" /> :
              <RefreshCw className="w-3.5 h-3.5 mr-1.5" />} Refresh
          </Button>
          {showRevertBtn && (
            <Button onClick={handleRevert} disabled={loading}
              className="h-10 rounded-xl bg-gradient-to-r from-red-500 to-red-600 text-white font-semibold text-xs shadow-lg shadow-red-500/20 disabled:opacity-40">
              <RotateCcw className="w-3.5 h-3.5 mr-1.5" /> Revert All
            </Button>
          )}
        </div>

        {/* Search — Kotlin scored search equivalent */}
        <div className="flex items-center gap-2 bg-[oklch(0.18,0.04,290)] border border-[oklch(0.30,0.06,290)] rounded-xl px-3 py-2">
          <Search className="w-3.5 h-3.5 text-yellow-400 shrink-0" />
          <input type="text" value={searchQuery} onChange={(e) => setSearchQuery(e.target.value)}
            placeholder="Search by Name or UID..." className="flex-1 bg-transparent text-xs text-white placeholder:text-[oklch(0.40,0.04,290)] outline-none" />
          {searchQuery && <button onClick={() => setSearchQuery('')}><X className="w-3.5 h-3.5 text-red-400" /></button>}
        </div>

        <div className="flex items-center justify-between">
          <p className="text-xs font-bold text-yellow-400">
            Players: {players.length} {pendingCount > 0 ? <span className="text-fuchsia-400">({pendingCount} pending)</span> : <span className="text-green-400">(all saved)</span>}
            {searchQuery && <span className="text-[oklch(0.45,0.04,290)]"> · {filteredPlayers.length} shown</span>}
          </p>
          {pendingCount > 0 && (
            <button onClick={() => setShowSaveAllDialog(true)} disabled={loading || savingAll}
              className="flex items-center gap-1 px-3 py-1.5 rounded-lg bg-gradient-to-r from-fuchsia-500 to-violet-600 text-white font-semibold text-[10px] shadow-lg shadow-fuchsia-500/20 active:scale-95 transition-transform disabled:opacity-40">
              {savingAll ? <div className="w-3 h-3 border-2 border-white/30 border-t-white rounded-full animate-spin" /> : <Save className="w-3 h-3" />}
              Save All
            </button>
          )}
        </div>

        {/* Player Table */}
        <div className="space-y-2">
          {filteredPlayers.length === 0 && !loading ? (
            <div className="flex flex-col items-center py-10 space-y-2">
              <Target className="w-8 h-8 text-[oklch(0.30,0.04,290)]" />
              <p className="text-[11px] text-[oklch(0.40,0.04,290)]">
                {isTournamentValid ? 'No pending players found' : 'Select a tournament and click Refresh'}
              </p>
            </div>
          ) : (
            <div className="overflow-x-auto -mx-1 px-1">
              {/* Table Header */}
              <div className={`grid gap-1 ${tournamentMode === 'BattleRoyal' ? 'grid-cols-[minmax(120px,1.3fr)_40px_56px_72px_56px_52px_76px] min-w-[520px]' : 'grid-cols-[minmax(120px,1.3fr)_40px_56px_44px_44px_50px_72px_56px_52px_76px] min-w-[660px]'}`}>
                {tournamentMode === 'BattleRoyal'
                  ? ['Name', '#', 'K', 'Coins', 'Rank', 'Result', 'Action'].map((h) => (
                      <div key={h} className="text-[11px] font-bold text-[oklch(0.50,0.04,290)] text-center py-1.5 px-0.5 uppercase tracking-wider">{h}</div>
                    ))
                  : ['Name', '#', 'K', 'D', 'A', 'Dmg', 'Coins', 'Rank', 'Result', 'Action'].map((h) => (
                      <div key={h} className="text-[11px] font-bold text-[oklch(0.50,0.04,290)] text-center py-1.5 px-0.5 uppercase tracking-wider">{h}</div>
                    ))
                }
              </div>
              {/* Table Rows */}
              {filteredPlayers.map((player) => (
                <div key={player.playerKey} className={`grid gap-1 items-center border rounded-xl px-1 py-2 hover:border-fuchsia-500/30 transition-colors ${player.isSaved ? 'bg-green-500/5 border-green-500/20' : 'bg-[oklch(0.16,0.04,290)] border-[oklch(0.25,0.05,290)]'} ${tournamentMode === 'BattleRoyal' ? 'grid-cols-[minmax(120px,1.3fr)_40px_56px_72px_56px_52px_76px] min-w-[520px]' : 'grid-cols-[minmax(120px,1.3fr)_40px_56px_44px_44px_50px_72px_56px_52px_76px] min-w-[660px]'}`}>
                  {/* Name + Level */}
                  <div className="min-w-0 flex flex-col px-1">
                    <div className="flex items-center gap-1.5">
                      {player.isSaved && <span className="w-2 h-2 rounded-full bg-green-400 shrink-0"></span>}
                      <span className={`text-sm font-bold truncate leading-tight ${player.isSaved ? 'text-green-300/60' : 'text-white'}`}>{player.inGameName}</span>
                    </div>
                    <span className="text-[10px] text-[oklch(0.50,0.04,290)] font-mono leading-tight mt-0.5">{player.inGameUID} · Lv{player.inGameLevel}</span>
                  </div>
                  {/* Slot */}
                  <div className="text-sm font-bold text-fuchsia-400 text-center">{player.positionSeat}</div>
                  {/* Kills + +/- */}
                  <div className="flex items-center gap-0.5">
                    <button onClick={() => updatePlayerField(player.playerKey, 'kills', player.kills - 1)} className="w-5 h-7 flex items-center justify-center rounded-l bg-[oklch(0.20,0.04,290)] text-xs text-red-400/70 hover:bg-red-500/20 active:bg-red-500/30 select-none">−</button>
                    <input type="number" value={player.kills}
                      onChange={(e) => updatePlayerField(player.playerKey, 'kills', Number(e.target.value))}
                      className="w-full bg-[oklch(0.20,0.04,290)] text-xs font-bold text-white text-center py-1 outline-none [appearance:textfield] [&::-webkit-outer-spin-button]:appearance-none [&::-webkit-inner-spin-button]:appearance-none" />
                    <button onClick={() => updatePlayerField(player.playerKey, 'kills', player.kills + 1)} className="w-5 h-7 flex items-center justify-center rounded-r bg-[oklch(0.20,0.04,290)] text-xs text-green-400/70 hover:bg-green-500/20 active:bg-green-500/30 select-none">+</button>
                  </div>
                  {/* Deaths — hidden in BattleRoyal */}
                  {tournamentMode !== 'BattleRoyal' && (
                    <input type="number" value={player.deaths}
                      onChange={(e) => updatePlayerField(player.playerKey, 'deaths', Number(e.target.value))}
                      className="w-full bg-[oklch(0.20,0.04,290)] text-xs font-bold text-teal-400 text-center rounded py-1 outline-none focus:ring-1 focus:ring-fuchsia-500/40 [appearance:textfield] [&::-webkit-outer-spin-button]:appearance-none [&::-webkit-inner-spin-button]:appearance-none" />
                  )}
                  {/* Assists — hidden in BattleRoyal */}
                  {tournamentMode !== 'BattleRoyal' && (
                    <input type="number" value={player.assists}
                      onChange={(e) => updatePlayerField(player.playerKey, 'assists', Number(e.target.value))}
                      className="w-full bg-[oklch(0.20,0.04,290)] text-xs font-bold text-white text-center rounded py-1 outline-none focus:ring-1 focus:ring-fuchsia-500/40 [appearance:textfield] [&::-webkit-outer-spin-button]:appearance-none [&::-webkit-inner-spin-button]:appearance-none" />
                  )}
                  {/* Damage — hidden in BattleRoyal */}
                  {tournamentMode !== 'BattleRoyal' && (
                    <input type="number" value={player.damage}
                      onChange={(e) => updatePlayerField(player.playerKey, 'damage', Number(e.target.value))}
                      className="w-full bg-[oklch(0.20,0.04,290)] text-xs font-bold text-red-400 text-center rounded py-1 outline-none focus:ring-1 focus:ring-fuchsia-500/40 [appearance:textfield] [&::-webkit-outer-spin-button]:appearance-none [&::-webkit-inner-spin-button]:appearance-none" />
                  )}
                  {/* Coins + +/- */}
                  <div className="flex items-center gap-0.5">
                    <button onClick={() => updatePlayerField(player.playerKey, 'coinsEarned', Math.max(0, player.coinsEarned - 100))}
                      className="w-5 h-7 flex items-center justify-center rounded-l bg-[oklch(0.20,0.04,290)] text-xs text-red-400/70 hover:bg-red-500/20 active:bg-red-500/30 select-none">−</button>
                    <input type="number" value={Math.round(paisaToRupees(player.coinsEarned))}
                      onChange={(e) => updatePlayerField(player.playerKey, 'coinsEarned', rupeesToPaisa(Number(e.target.value)))}
                      className="w-full bg-[oklch(0.20,0.04,290)] text-xs font-bold text-yellow-400 text-center py-1 outline-none [appearance:textfield] [&::-webkit-outer-spin-button]:appearance-none [&::-webkit-inner-spin-button]:appearance-none" />
                    <button onClick={() => updatePlayerField(player.playerKey, 'coinsEarned', player.coinsEarned + 100)}
                      className="w-5 h-7 flex items-center justify-center rounded-r bg-[oklch(0.20,0.04,290)] text-xs text-green-400/70 hover:bg-green-500/20 active:bg-green-500/30 select-none">+</button>
                  </div>
                  {/* Rank + +/- */}
                  <div className="flex items-center gap-0.5">
                    <button onClick={() => updatePlayerField(player.playerKey, 'rank', Math.max(0, player.rank - 1))}
                      className="w-5 h-7 flex items-center justify-center rounded-l bg-[oklch(0.20,0.04,290)] text-xs text-red-400/70 hover:bg-red-500/20 active:bg-red-500/30 select-none">−</button>
                    <input type="number" value={player.rank}
                      onChange={(e) => updatePlayerField(player.playerKey, 'rank', Number(e.target.value))}
                      className="w-full bg-[oklch(0.20,0.04,290)] text-xs font-bold text-white text-center py-1 outline-none [appearance:textfield] [&::-webkit-outer-spin-button]:appearance-none [&::-webkit-inner-spin-button]:appearance-none" />
                    <button onClick={() => updatePlayerField(player.playerKey, 'rank', player.rank + 1)}
                      className="w-5 h-7 flex items-center justify-center rounded-r bg-[oklch(0.20,0.04,290)] text-xs text-green-400/70 hover:bg-green-500/20 active:bg-green-500/30 select-none">+</button>
                  </div>
                  {/* Result Badge (auto) */}
                  <div className="text-center px-0.5">
                    <span className={`inline-block text-[10px] font-bold px-2 py-1 rounded-full leading-none ${
                      player.result === 'win' ? 'bg-green-500/20 text-green-400' :
                      player.result === 'lose' ? 'bg-red-500/20 text-red-400' :
                      player.result === 'top10' ? 'bg-blue-500/20 text-blue-400' :
                      player.result === 'dq' ? 'bg-orange-500/20 text-orange-400' :
                      'bg-[oklch(0.25,0.04,290)] text-[oklch(0.45,0.04,290)]'
                    }`}>
                      {player.result === 'win' ? 'WIN' : player.result === 'lose' ? 'LOSS' : player.result === 'top10' ? 'T10' : player.result === 'dq' ? 'DQ' : '—'}
                    </span>
                  </div>
                  {/* Actions */}
                  <div className="flex gap-1 px-0.5">
                    <button onClick={() => updatePlayer(player)} disabled={updatingPlayer === player.playerKey}
                      className="flex-1 flex items-center justify-center py-1.5 rounded-lg bg-green-500/20 text-green-400 hover:bg-green-500/30 active:scale-95 transition-all disabled:opacity-30" title="Update">
                      {updatingPlayer === player.playerKey
                        ? <div className="w-3 h-3 border-2 border-green-400/30 border-t-green-400 rounded-full animate-spin" />
                        : <Save className="w-3.5 h-3.5" />}
                    </button>
                    <button onClick={() => handleDeleteClick(player)}
                      className="flex-1 flex items-center justify-center py-1.5 rounded-lg bg-red-500/20 text-red-400 hover:bg-red-500/30 active:scale-95 transition-all" title="Delete">
                      <Trash2 className="w-3.5 h-3.5" />
                    </button>
                  </div>
                </div>
              ))}
            </div>
          )}

          {/* Loading spinner */}
          {loading && (
            <div className="flex items-center justify-center py-6">
              <div className="w-5 h-5 border-2 border-fuchsia-500/30 border-t-fuchsia-500 rounded-full animate-spin" />
            </div>
          )}
        </div>
      </div>

      {/* Save All Confirmation Dialog */}
      {showSaveAllDialog && (
        <div className="fixed inset-0 bg-black/60 backdrop-blur-sm flex items-center justify-center z-50 p-4">
          <div className="bg-[oklch(0.18,0.04,290)] border border-[oklch(0.30,0.06,290)] rounded-2xl p-5 max-w-xs w-full space-y-4">
            <div className="text-center">
              <p className="text-sm font-bold text-fuchsia-400">Save All Players</p>
              <p className="text-[11px] text-[oklch(0.60,0.04,290)] mt-2 leading-relaxed">Make sure all info is correct.<br />ReCheck if not.</p>
              <p className="text-[10px] text-yellow-400 mt-1.5 font-mono">{pendingCount} players will be saved</p>
            </div>
            <div className="grid grid-cols-2 gap-2">
              <button onClick={() => setShowSaveAllDialog(false)}
                className="py-2.5 rounded-xl bg-[oklch(0.22,0.04,290)] border border-[oklch(0.30,0.06,290)] text-[oklch(0.60,0.04,290)] text-xs font-semibold">
                NO
              </button>
              <button onClick={handleSaveAll}
                className="py-2.5 rounded-xl bg-gradient-to-r from-fuchsia-500 to-violet-600 text-white text-xs font-bold shadow-lg shadow-fuchsia-500/20">
                YES
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Delete Confirmation Dialog */}
      {deleteTarget && (
        <div className="fixed inset-0 bg-black/60 backdrop-blur-sm flex items-center justify-center z-50 p-4">
          <div className="bg-[oklch(0.18,0.04,290)] border border-[oklch(0.30,0.06,290)] rounded-2xl p-5 max-w-sm w-full space-y-4">
            <div className="text-center">
              <p className="text-base font-bold text-red-400">Delete Player</p>
              <p className="text-xs text-[oklch(0.60,0.04,290)] mt-1">{deleteTarget.inGameName}</p>
              <p className="text-[10px] text-[oklch(0.45,0.04,290)] font-mono">UID: {deleteTarget.inGameUID}</p>
            </div>
            <div>
              <p className="text-xs text-[oklch(0.55,0.04,290)]">Enter UID to confirm:</p>
              <Input value={deleteUidInput} onChange={(e) => setDeleteUidInput(e.target.value)}
                placeholder="Enter Player UID" type="number"
                className="bg-[oklch(0.22,0.04,290)] border-[oklch(0.35,0.06,290)] text-white placeholder:text-[oklch(0.40,0.04,290)] h-10 rounded-xl text-sm text-center font-mono mt-1.5" />
            </div>
            <div className="grid grid-cols-2 gap-2">
              <button onClick={() => setDeleteTarget(null)}
                className="py-2.5 rounded-xl bg-[oklch(0.22,0.04,290)] border border-[oklch(0.30,0.06,290)] text-[oklch(0.60,0.04,290)] text-xs font-semibold">
                CANCEL
              </button>
              <button onClick={handleDeleteConfirm}
                className="py-2.5 rounded-xl bg-gradient-to-r from-red-500 to-red-600 text-white text-xs font-bold shadow-lg shadow-red-500/20">
                DELETE
              </button>
            </div>
          </div>
        </div>
      )}

      <div ref={logEndRef} />
    </div>
  );
}
