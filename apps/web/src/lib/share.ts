import type { Match, Player, Rally, Shot } from "./types";

export interface SharePayload {
  match: Match;
  rallies: Rally[];
  shots: Shot[];
  players: Player[];
}

interface ShortShot {
  i: string;
  r: string;
  p: string;
  tm: 1 | 2;
  t: number;
  ty: Shot["type"];
  b: Shot["bodySide"];
  ix: number;
  iy: number;
  lx: number;
  ly: number;
  h: number;
  o: Shot["outcome"];
  er: Shot["errorReason"];
  ec: Shot["errorCause"];
  si: Shot["situation"];
  c: number;
  m: 0 | 1;
  sv: 1 | 2 | null;
  ex: 0 | 1;
  n?: string;
}

function round3(value: number): number {
  return Math.round(value * 1000) / 1000;
}

function minify(payload: SharePayload) {
  return {
    v: 1,
    m: payload.match,
    ry: payload.rallies,
    pl: payload.players,
    s: payload.shots.map<ShortShot>((shot) => ({
      i: shot.id,
      r: shot.rallyId,
      p: shot.playerId,
      tm: shot.team,
      t: Math.round(shot.tImpact * 10) / 10,
      ty: shot.type,
      b: shot.bodySide,
      ix: round3(shot.impactX),
      iy: round3(shot.impactY),
      lx: round3(shot.landX),
      ly: round3(shot.landY),
      h: shot.impactHeight,
      o: shot.outcome,
      er: shot.errorReason,
      ec: shot.errorCause,
      si: shot.situation,
      c: shot.confidence,
      m: shot.manuallyCorrected ? 1 : 0,
      sv: shot.serveNumber,
      ex: shot.example ? 1 : 0,
      ...(shot.note ? { n: shot.note } : {}),
    })),
  };
}

function restore(raw: ReturnType<typeof minify>): SharePayload {
  return {
    match: raw.m,
    rallies: raw.ry,
    players: raw.pl,
    shots: raw.s.map((shot) => ({
      id: shot.i,
      rallyId: shot.r,
      matchId: raw.m.id,
      playerId: shot.p,
      team: shot.tm,
      tImpact: shot.t,
      type: shot.ty,
      bodySide: shot.b,
      impactX: shot.ix,
      impactY: shot.iy,
      landX: shot.lx,
      landY: shot.ly,
      impactHeight: shot.h,
      outcome: shot.o,
      errorReason: shot.er,
      errorCause: shot.ec,
      situation: shot.si,
      confidence: shot.c,
      manuallyCorrected: shot.m === 1,
      serveNumber: shot.sv,
      example: shot.ex === 1,
      note: shot.n ?? "",
    })),
  };
}

function toBase64Url(bytes: Uint8Array): string {
  let binary = "";
  const size = 0x8000;
  for (let index = 0; index < bytes.length; index += size) {
    binary += String.fromCharCode(...bytes.subarray(index, index + size));
  }
  return btoa(binary).replace(/\+/g, "-").replace(/\//g, "_").replace(/=+$/g, "");
}

function fromBase64Url(value: string): Uint8Array {
  const padded = value.replace(/-/g, "+").replace(/_/g, "/") + "===".slice((value.length + 3) % 4);
  if (typeof Buffer !== "undefined") return new Uint8Array(Buffer.from(padded, "base64"));
  const binary = atob(padded);
  const bytes = new Uint8Array(binary.length);
  for (let i = 0; i < binary.length; i++) bytes[i] = binary.charCodeAt(i);
  return bytes;
}

export async function encodeShare(payload: SharePayload): Promise<string> {
  const json = JSON.stringify(minify(payload));
  const stream = new Blob([json]).stream().pipeThrough(new CompressionStream("deflate-raw"));
  const bytes = new Uint8Array(await new Response(stream).arrayBuffer());
  return toBase64Url(bytes);
}

function blobFromBytes(bytes: Uint8Array): Blob {
  const copy = new ArrayBuffer(bytes.byteLength);
  new Uint8Array(copy).set(bytes);
  return new Blob([copy]);
}

export async function decodeShare(value: string): Promise<SharePayload> {
  const bytes = fromBase64Url(value);
  const stream = blobFromBytes(bytes).stream().pipeThrough(new DecompressionStream("deflate-raw"));
  const raw = JSON.parse(await new Response(stream).text()) as ReturnType<typeof minify>;
  if (raw.v !== 1 || !raw.m?.id) throw new Error("Link non valido");
  return restore(raw);
}
