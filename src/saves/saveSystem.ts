import {
  MatchSummary,
  PersistentSaveData,
} from '../types/football';
import { cloneDefaultSettings } from '../settings/settingsStore';

const DB_NAME = 'classic_football_13_db';
const DB_VERSION = 1;
const STORE_NAME = 'saves';
const SAVE_KEY = 'primary_profile';
const LS_KEY = 'pcf13_save_v1';

export function createInitialSaveData(): PersistentSaveData {
  return {
    version: 1,
    lastMode: null,
    settings: cloneDefaultSettings(),
    customTeams: {},
    matchHistory: [],
    activeTournament: null,
    activeLeague: null,
    activeCareer: null,
    activeLegend: null,
    trainingMedals: {},
    records: {
      matchesPlayed: 0,
      wins: 0,
      draws: 0,
      losses: 0,
      goalsScored: 0,
      goalsConceded: 0,
      cleanSheets: 0,
      tournamentsWon: 0,
      leaguesWon: 0,
      biggestWinMargin: 0,
      biggestWinLabel: '—',
    },
  };
}

function openDB(): Promise<IDBDatabase | null> {
  if (typeof indexedDB === 'undefined') return Promise.resolve(null);
  return new Promise((resolve) => {
    try {
      const req = indexedDB.open(DB_NAME, DB_VERSION);
      req.onupgradeneeded = () => {
        const db = req.result;
        if (!db.objectStoreNames.contains(STORE_NAME)) {
          db.createObjectStore(STORE_NAME);
        }
      };
      req.onsuccess = () => resolve(req.result);
      req.onerror = () => resolve(null);
    } catch {
      resolve(null);
    }
  });
}

export async function loadSaveData(): Promise<PersistentSaveData> {
  const fallback = createInitialSaveData();

  try {
    const db = await openDB();
    if (db) {
      const result = await new Promise<PersistentSaveData | null>((resolve) => {
        const tx = db.transaction(STORE_NAME, 'readonly');
        const store = tx.objectStore(STORE_NAME);
        const req = store.get(SAVE_KEY);
        req.onsuccess = () => resolve((req.result as PersistentSaveData) ?? null);
        req.onerror = () => resolve(null);
      });
      if (result && typeof result === 'object' && result.version === 1) {
        return mergeWithDefaults(result);
      }
    }
  } catch {
    // Fallback to localStorage below
  }

  try {
    if (typeof localStorage !== 'undefined') {
      const raw = localStorage.getItem(LS_KEY);
      if (raw) {
        const parsed = JSON.parse(raw) as PersistentSaveData;
        if (parsed && parsed.version === 1) {
          return mergeWithDefaults(parsed);
        }
      }
    }
  } catch {
    // Ignore corrupted localStorage
  }

  return fallback;
}

function mergeWithDefaults(data: Partial<PersistentSaveData>): PersistentSaveData {
  const base = createInitialSaveData();
  return {
    ...base,
    ...data,
    settings: {
      ...base.settings,
      ...(data.settings ?? {}),
      keyBindings: {
        ...base.settings.keyBindings,
        ...(data.settings?.keyBindings ?? {}),
      },
    },
    records: {
      ...base.records,
      ...(data.records ?? {}),
    },
    customTeams: data.customTeams ?? {},
    matchHistory: Array.isArray(data.matchHistory) ? data.matchHistory : [],
    activeLegend: data.activeLegend ?? null,
    trainingMedals: data.trainingMedals ?? {},
  };
}

export async function persistSaveData(data: PersistentSaveData): Promise<void> {
  const payload = JSON.parse(JSON.stringify(data)) as PersistentSaveData;

  try {
    if (typeof localStorage !== 'undefined') {
      localStorage.setItem(LS_KEY, JSON.stringify(payload));
    }
  } catch {
    // Storage quota exceeded or restricted
  }

  try {
    const db = await openDB();
    if (db) {
      await new Promise<void>((resolve) => {
        const tx = db.transaction(STORE_NAME, 'readwrite');
        const store = tx.objectStore(STORE_NAME);
        const req = store.put(payload, SAVE_KEY);
        req.onsuccess = () => resolve();
        req.onerror = () => resolve();
      });
    }
  } catch {
    // Fallback already written to localStorage
  }
}

export async function clearAllSaveData(): Promise<PersistentSaveData> {
  const fresh = createInitialSaveData();
  try {
    if (typeof localStorage !== 'undefined') {
      localStorage.removeItem(LS_KEY);
    }
    const db = await openDB();
    if (db) {
      await new Promise<void>((resolve) => {
        const tx = db.transaction(STORE_NAME, 'readwrite');
        tx.objectStore(STORE_NAME).delete(SAVE_KEY);
        tx.oncomplete = () => resolve();
        tx.onerror = () => resolve();
      });
    }
  } catch {
    // Ignore
  }
  return fresh;
}

export function applyMatchSummaryToSave(
  save: PersistentSaveData,
  summary: MatchSummary
): PersistentSaveData {
  const next = mergeWithDefaults(save);
  next.matchHistory = [summary, ...next.matchHistory].slice(0, 50);

  if (summary.trainingResult && summary.trainingResult.medal !== 'none') {
    const rank = { none: 0, bronze: 1, silver: 2, gold: 3 } as const;
    const prevMedal = next.trainingMedals?.[summary.trainingResult.drill] ?? 'none';
    if (rank[summary.trainingResult.medal] > rank[prevMedal]) {
      next.trainingMedals = {
        ...(next.trainingMedals ?? {}),
        [summary.trainingResult.drill]: summary.trainingResult.medal,
      };
    }
  }

  if (summary.mode !== 'training' && summary.mode !== 'practice') {
    next.records.matchesPlayed++;
    next.records.goalsScored += summary.homeGoals;
    next.records.goalsConceded += summary.awayGoals;
    if (summary.awayGoals === 0) next.records.cleanSheets++;

    const homeWon =
      summary.homeGoals > summary.awayGoals ||
      (summary.homeGoals === summary.awayGoals &&
        summary.penalties &&
        summary.penalties.home > summary.penalties.away);
    const draw = summary.homeGoals === summary.awayGoals && !summary.penalties;

    if (homeWon) {
      next.records.wins++;
      const margin = summary.homeGoals - summary.awayGoals;
      if (margin > next.records.biggestWinMargin) {
        next.records.biggestWinMargin = margin;
        next.records.biggestWinLabel = `${summary.homeShortCode} ${summary.homeGoals}-${summary.awayGoals} ${summary.awayShortCode}`;
      }
    } else if (draw) {
      next.records.draws++;
    } else {
      next.records.losses++;
    }
  }

  return next;
}

export function validateImportedSave(rawJson: string): PersistentSaveData | null {
  try {
    const parsed = JSON.parse(rawJson) as Partial<PersistentSaveData>;
    if (!parsed || typeof parsed !== 'object' || parsed.version !== 1) {
      return null;
    }
    return mergeWithDefaults(parsed);
  } catch {
    return null;
  }
}
