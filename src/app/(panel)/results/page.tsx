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
  };
}

export default function ResultsPage() {
  const { user } = useAuth();
  const logEndRef = useRef<HTMLDivElement>(null);
  const deleteConfirmRef = useRef<HTMLInputElement>(null);
  const [deleteTarget, setDeleteTarget] = useState<PlayerData | null>(null);
  const [deleteUidInput, setDeleteUidInput] = useState('');

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

  // ── HIGH SENSITIVITY search — handles Unicode, decorative, styled names ──
  // Normalizes: removes invisible chars, decomposes Unicode, strips decorators
  const normalizeStr = (s: string): string => {
    return s
      .normalize('NFKD')                    // decompose ᴺ → N, ᴛ → t, ᴀ → a, etc.
      .replace(/[\u200B-\u200D\uFEFF]/g, '') // zero-width spaces
      .replace(/[\u2060-\u206F]/g, '')       // invisible format chars
      .replace(/[\u00AD\u034F]/g, '')        // soft hyphen, combining grapheme joiner
      .replace(/[ㅤᅠᅟ⠀⠀⣱⣲⣵]/g, '')      // Korean hangul filler, braille patterns
      .replace(/[·•∗⁎★☆⭐※✦✧✩✪✫✬✭✮✯✰✱✲✳✴✵✶✷✸✹✺✻✼✽✾✿❀❁❂❃❄❅❆❇❈❉❊❋]/g, '')
      .replace(/[\u25A0-\u25FF\u2600-\u27BF\u2B50-\u2B55]/g, '') // shapes, arrows
      .replace(/[꧁꧂༺༻ψω∿♢♡♧♤♥♦♩♪♫♬♭♮♯]/g, '')  // decorative borders, symbols
      .replace(/[᭄ꭄᭅꭅ⓿❶❷❸❹❺❻❼❽❾❿⓫⓬⓭⓮⓯⓰⓱⓲⓳⓴⓵⓶⓷⓸⓹⓺⓻⓼⓽⓾]/g, '') // numeric circles
      .replace(/[═╬║╔╗╚╝╠╣╦╩╬─│┌┐└┘├┤┬┴┼]/g, '') // box drawing
      .replace(/[\uE000-\uF8FF]/g, '')       // private use area
      .replace(/[\uFFF0-\uFFFF]/g, '')        // specials
      .replace(/[☝✞✇$#@%&*+=~`'";:,.<>?!\^()\[\]{}|\\\/_\-]/g, '')
      .replace(/\s+/g, '')                    // collapse all spaces
      .toLowerCase();
  };

  const filteredPlayers = (() => {
    if (!searchQuery.trim()) return players;
    const q = searchQuery.trim();
    const lowerQ = q.toLowerCase();
    const normQ = normalizeStr(q);

    const scored = players.map(p => {
      const name = p.inGameName;
      const uid = String(p.inGameUID);
      const lowerName = name.toLowerCase();
      const normName = normalizeStr(name);

      let score = 0;

      // UID exact/partial
      if (uid === q) score = 1000;
      else if (uid.startsWith(q)) score = 950;
      else if (uid.includes(q)) score = 900;

      // Name exact match
      if (lowerName === lowerQ) score = Math.max(score, 850);
      else if (name === q) score = Math.max(score, 860);

      // Name starts with
      if (lowerName.startsWith(lowerQ)) score = Math.max(score, 750);

      // Any word match in name (space separated)
      if (name.split(/[\s_\-]+/).some(w => w.toLowerCase() === lowerQ)) score = Math.max(score, 700);

      // Normalized match (stripped all decorations)
      if (normName === normQ) score = Math.max(score, 600);
      else if (normName.startsWith(normQ)) score = Math.max(score, 550);
      else if (normName.includes(normQ)) score = Math.max(score, 450);

      // Basic stripped match (only letters + digits)
      const basicName = name.replace(/[^A-Za-z0-9]/g, '').toLowerCase();
      const basicQ = lowerQ.replace(/[^a-z0-9]/g, '');
      if (basicName === basicQ) score = Math.max(score, 400);
      else if (basicName.startsWith(basicQ)) score = Math.max(score, 350);
      else if (basicName.includes(basicQ)) score = Math.max(score, 280);

      // Character-level fuzzy: check if query chars appear in order within normalized name
      if (score === 0 && normQ.length >= 2) {
        let qi = 0;
        for (let ni = 0; ni < normName.length && qi < normQ.length; ni++) {
          if (normName[ni] === normQ[qi]) qi++;
        }
        if (qi === normQ.length) score = Math.max(score, 150);
      }

      // Partial: if name contains query as substring in any form
      if (score === 0 && lowerName.includes(lowerQ)) score = Math.max(score, 200);

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
  // FETCH PLAYERS — Kotlin fetchPlayersData()
  // RTDB: Tournaments/TournamentDetails/{type}/{id}/JoinedPlayers
  // Only players where PaymentStatus !== true
  // ═══════════════════════════════════════════════
  const fetchPlayersData = async () => {
    const id = tournamentId.trim();
    setLoading(true);
    try {
      const data = await rtdbGet(getJoinedPlayersPath(tournamentType, id));
      const parsedPlayers: PlayerData[] = [];

      if (data && data !== null && typeof data === 'object') {
        // Check if array format
        if (Array.isArray(data)) {
          data.forEach((playerObj: any, index: number) => {
            if (playerObj && typeof playerObj === 'object') {
              const paymentStatus = playerObj.PaymentStatus === true;
              if (!paymentStatus) {
                parsedPlayers.push(parsePlayerData(playerObj, String(index), tournamentType, id));
              }
            }
          });
        } else {
          // Object format
          for (const [key, value] of Object.entries(data)) {
            const playerObj = value as any;
            if (playerObj && typeof playerObj === 'object') {
              const paymentStatus = playerObj.PaymentStatus === true;
              if (!paymentStatus) {
                parsedPlayers.push(parsePlayerData(playerObj, key, tournamentType, id));
              }
            }
          }
        }
      }

      // Auto-calc coins if PerKill > 0
      if (isAutoCalcEnabled) {
        parsedPlayers.forEach(p => {
          if (!p.isManuallyEdited) {
            p.coinsEarned = p.kills * currentPerKillPaisa;
          }
        });
      }

      setPlayers(parsedPlayers);
      if (parsedPlayers.length === 0) {
        toast.info('No pending players found');
      } else {
        toast.success(`Loaded ${parsedPlayers.length} players`);
      }
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
        fetchPlayersData();
        toast.success(`${player.inGameName} updated!`);
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

        <p className="text-xs font-bold text-yellow-400">
          Players: {searchQuery ? `${filteredPlayers.length} / ${players.length} (filtered)` : players.length}
        </p>

        {/* Player Table */}
        <div className="space-y-1.5">
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
              <div className="grid grid-cols-[minmax(90px,1.2fr)_36px_38px_38px_38px_42px_48px_38px_44px_68px] gap-0.5 min-w-[520px]">
                {['Name', '#', 'K', 'D', 'A', 'Dmg', 'Coins', 'Rank', 'Result', 'Action'].map((h) => (
                  <div key={h} className="text-[8px] font-bold text-[oklch(0.40,0.04,290)] text-center py-1 px-0.5 uppercase tracking-wider">{h}</div>
                ))}
              </div>
              {/* Table Rows */}
              {filteredPlayers.map((player) => (
                <div key={player.playerKey} className="grid grid-cols-[minmax(90px,1.2fr)_36px_38px_38px_38px_42px_48px_38px_44px_68px] gap-0.5 min-w-[520px] bg-[oklch(0.16,0.04,290)] border border-[oklch(0.25,0.05,290)] rounded-lg px-0.5 py-1 items-center hover:border-fuchsia-500/30 transition-colors">
                  {/* Name + Level */}
                  <div className="min-w-0 flex flex-col px-1">
                    <span className="text-[10px] font-bold text-white truncate leading-tight">{player.inGameName}</span>
                    <span className="text-[8px] text-[oklch(0.45,0.04,290)] font-mono leading-tight">{player.inGameUID} · Lv{player.inGameLevel}</span>
                  </div>
                  {/* Slot */}
                  <div className="text-[10px] font-bold text-fuchsia-400 text-center">{player.positionSeat}</div>
                  {/* Kills */}
                  <input type="number" value={player.kills}
                    onChange={(e) => updatePlayerField(player.playerKey, 'kills', Number(e.target.value))}
                    className="w-full bg-[oklch(0.20,0.04,290)] text-[10px] font-bold text-white text-center rounded py-0.5 outline-none focus:ring-1 focus:ring-fuchsia-500/40" />
                  {/* Deaths */}
                  <input type="number" value={player.deaths}
                    onChange={(e) => updatePlayerField(player.playerKey, 'deaths', Number(e.target.value))}
                    className="w-full bg-[oklch(0.20,0.04,290)] text-[10px] font-bold text-teal-400 text-center rounded py-0.5 outline-none focus:ring-1 focus:ring-fuchsia-500/40" />
                  {/* Assists */}
                  <input type="number" value={player.assists}
                    onChange={(e) => updatePlayerField(player.playerKey, 'assists', Number(e.target.value))}
                    className="w-full bg-[oklch(0.20,0.04,290)] text-[10px] font-bold text-white text-center rounded py-0.5 outline-none focus:ring-1 focus:ring-fuchsia-500/40" />
                  {/* Damage */}
                  <input type="number" value={player.damage}
                    onChange={(e) => updatePlayerField(player.playerKey, 'damage', Number(e.target.value))}
                    className="w-full bg-[oklch(0.20,0.04,290)] text-[10px] font-bold text-red-400 text-center rounded py-0.5 outline-none focus:ring-1 focus:ring-fuchsia-500/40" />
                  {/* Coins */}
                  <div className="relative">
                    <input type="number" value={Math.round(paisaToRupees(player.coinsEarned))}
                      onChange={(e) => updatePlayerField(player.playerKey, 'coinsEarned', rupeesToPaisa(Number(e.target.value)))}
                      className="w-full bg-[oklch(0.20,0.04,290)] text-[10px] font-bold text-yellow-400 text-center rounded py-0.5 outline-none focus:ring-1 focus:ring-yellow-500/40 pr-3" />
                    {isAutoCalcEnabled && !player.isManuallyEdited && (
                      <span className="absolute right-0.5 top-1/2 -translate-y-1/2 text-[6px] text-[oklch(0.35,0.04,290)]">A</span>
                    )}
                  </div>
                  {/* Rank */}
                  <input type="number" value={player.rank}
                    onChange={(e) => updatePlayerField(player.playerKey, 'rank', Number(e.target.value))}
                    className="w-full bg-[oklch(0.20,0.04,290)] text-[10px] font-bold text-white text-center rounded py-0.5 outline-none focus:ring-1 focus:ring-fuchsia-500/40" />
                  {/* Result Badge (auto) */}
                  <div className="text-center px-0.5">
                    <span className={`inline-block text-[8px] font-bold px-1.5 py-0.5 rounded-full leading-none ${
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
                  <div className="flex gap-0.5 px-0.5">
                    <button onClick={() => updatePlayer(player)} disabled={updatingPlayer === player.playerKey}
                      className="flex-1 flex items-center justify-center py-1 rounded bg-green-500/20 text-green-400 hover:bg-green-500/30 active:scale-95 transition-all disabled:opacity-30" title="Update">
                      {updatingPlayer === player.playerKey
                        ? <div className="w-2.5 h-2.5 border-2 border-green-400/30 border-t-green-400 rounded-full animate-spin" />
                        : <Save className="w-3 h-3" />}
                    </button>
                    <button onClick={() => handleDeleteClick(player)}
                      className="flex-1 flex items-center justify-center py-1 rounded bg-red-500/20 text-red-400 hover:bg-red-500/30 active:scale-95 transition-all" title="Delete">
                      <Trash2 className="w-2.5 h-2.5" />
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
