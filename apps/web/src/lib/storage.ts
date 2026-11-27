import { buildExampleData } from "./examples";
import { DATA_VERSION } from "./types";
import type { AppState, Player } from "./types";

export const STORAGE_KEY = "fondocampo.v1";

export function emptyUserState(): AppState {
  const examples = buildExampleData();
  return {
    version: DATA_VERSION,
    profile: null,
    players: examples.players,
    matches: examples.matches,
    rallies: examples.rallies,
    shots: examples.shots,
    jobs: [],
    apiBaseUrl: "",
  };
}

function isRecord(value: unknown): value is Record<string, unknown> {
  return typeof value === "object" && value !== null;
}

function interruptJobs(state: AppState): AppState {
  return {
    ...state,
    jobs: state.jobs.map((job) =>
      job.status === "processing"
        ? { ...job, status: "interrupted" as const, error: "Analisi interrotta. Il video, se c'è, è ancora sul telefono." }
        : job,
    ),
  };
}

export function mergeWithExamples(state: AppState): AppState {
  const examples = buildExampleData();
  const userPlayers = state.players.filter((player) => !player.example);
  const userMatches = state.matches.filter((match) => !match.example);
  const userMatchIds = new Set(userMatches.map((match) => match.id));
  const exampleMatchIds = new Set(examples.matches.map((match) => match.id));
  const keptExampleMatchIds = new Set(
    state.matches.filter((match) => match.example && exampleMatchIds.has(match.id)).map((match) => match.id),
  );
  const replaceExamples = state.version !== DATA_VERSION || keptExampleMatchIds.size !== exampleMatchIds.size;
  if (!replaceExamples) return interruptJobs({ ...state, version: DATA_VERSION });
  return interruptJobs({
    ...state,
    version: DATA_VERSION,
    players: [...examples.players, ...userPlayers],
    matches: [...examples.matches, ...userMatches],
    rallies: [...examples.rallies, ...state.rallies.filter((rally) => userMatchIds.has(rally.matchId))],
    shots: [...examples.shots, ...state.shots.filter((shot) => userMatchIds.has(shot.matchId))],
  });
}

export function parseState(raw: string | null): AppState {
  if (!raw) return emptyUserState();
  try {
    const parsed = JSON.parse(raw) as unknown;
    if (!isRecord(parsed) || !Array.isArray(parsed.players) || !Array.isArray(parsed.matches)) return emptyUserState();
    return mergeWithExamples(parsed as unknown as AppState);
  } catch {
    return emptyUserState();
  }
}

export function loadState(): AppState {
  if (typeof window === "undefined") return emptyUserState();
  return parseState(window.localStorage.getItem(STORAGE_KEY));
}

export function saveState(state: AppState): void {
  if (typeof window === "undefined") return;
  window.localStorage.setItem(STORAGE_KEY, JSON.stringify(state));
}

export function resetExamples(state: AppState): AppState {
  const examples = buildExampleData();
  const userPlayers: Player[] = state.players.filter((player) => !player.example);
  const userMatches = state.matches.filter((match) => !match.example);
  const userIds = new Set(userMatches.map((match) => match.id));
  return {
    ...state,
    version: DATA_VERSION,
    players: [...examples.players, ...userPlayers],
    matches: [...examples.matches, ...userMatches],
    rallies: [...examples.rallies, ...state.rallies.filter((rally) => userIds.has(rally.matchId))],
    shots: [...examples.shots, ...state.shots.filter((shot) => userIds.has(shot.matchId))],
  };
}

const DB_NAME = "fondocampo";
const STORE = "videos";

function openDb(): Promise<IDBDatabase> {
  return new Promise((resolve, reject) => {
    const request = indexedDB.open(DB_NAME, 1);
    request.onupgradeneeded = () => {
      const db = request.result;
      if (!db.objectStoreNames.contains(STORE)) db.createObjectStore(STORE);
    };
    request.onsuccess = () => resolve(request.result);
    request.onerror = () => reject(request.error);
  });
}

export async function saveVideo(id: string, file: Blob): Promise<void> {
  const db = await openDb();
  await new Promise<void>((resolve, reject) => {
    const tx = db.transaction(STORE, "readwrite");
    tx.objectStore(STORE).put(file, id);
    tx.oncomplete = () => resolve();
    tx.onerror = () => reject(tx.error);
  });
  db.close();
}

export async function loadVideo(id: string): Promise<Blob | null> {
  const db = await openDb();
  const blob = await new Promise<Blob | null>((resolve, reject) => {
    const tx = db.transaction(STORE, "readonly");
    const request = tx.objectStore(STORE).get(id);
    request.onsuccess = () => resolve((request.result as Blob) ?? null);
    request.onerror = () => reject(request.error);
  });
  db.close();
  return blob;
}

export async function deleteVideo(id: string): Promise<void> {
  const db = await openDb();
  await new Promise<void>((resolve, reject) => {
    const tx = db.transaction(STORE, "readwrite");
    tx.objectStore(STORE).delete(id);
    tx.oncomplete = () => resolve();
    tx.onerror = () => reject(tx.error);
  });
  db.close();
}
