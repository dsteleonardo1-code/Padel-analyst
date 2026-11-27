import type { Match, Player, Rally, Shot, UserProfile } from "./types";

export interface ApiReport {
  match: Match;
  rallies: Rally[];
  shots: Shot[];
  players: Player[];
}

async function request<T>(base: string, path: string, token: string | null, init?: RequestInit): Promise<T> {
  const headers = new Headers(init?.headers);
  if (token) headers.set("Authorization", `Bearer ${token}`);
  if (init?.body && !(init.body instanceof FormData) && !headers.has("Content-Type")) {
    headers.set("Content-Type", "application/json");
  }
  const response = await fetch(`${base.replace(/\/$/, "")}${path}`, { ...init, headers });
  if (!response.ok) {
    const text = await response.text();
    throw new Error(text || `Errore ${response.status}`);
  }
  return response.json() as Promise<T>;
}

export async function openSession(base: string, profile: UserProfile): Promise<string> {
  const data = await request<{ token: string }>(base, "/v1/session", null, {
    method: "POST",
    body: JSON.stringify({ name: profile.name, email: profile.email, role: profile.role }),
  });
  return data.token;
}

export async function pushPlayer(base: string, token: string, player: Player): Promise<Player> {
  return request<Player>(base, "/v1/players", token, { method: "POST", body: JSON.stringify(player) });
}

export async function pushMatch(base: string, token: string, match: Match): Promise<Match> {
  return request<Match>(base, "/v1/matches", token, { method: "POST", body: JSON.stringify(match) });
}

export async function uploadVideo(base: string, token: string, matchId: string, file: Blob): Promise<void> {
  const body = new FormData();
  body.set("file", file, "partita.mp4");
  await request(base, `/v1/matches/${matchId}/video`, token, { method: "POST", body });
}

export async function startAnalysis(base: string, token: string, matchId: string): Promise<string> {
  const data = await request<{ jobId: string }>(base, `/v1/matches/${matchId}/analyze`, token, { method: "POST" });
  return data.jobId;
}

export async function readJob(base: string, token: string, jobId: string): Promise<{ status: string; progress: number; log: string[]; error: string }> {
  return request(base, `/v1/jobs/${jobId}`, token);
}

export async function readReport(base: string, token: string, matchId: string): Promise<ApiReport> {
  return request<ApiReport>(base, `/v1/matches/${matchId}/report`, token);
}
