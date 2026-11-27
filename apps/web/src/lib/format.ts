export function cx(...parts: Array<string | false | null | undefined>): string {
  return parts.filter(Boolean).join(" ");
}

export function formatTime(sec: number): string {
  if (!Number.isFinite(sec) || sec < 0) sec = 0;
  const s = Math.floor(sec % 60);
  const m = Math.floor(sec / 60);
  return `${m}:${s.toString().padStart(2, "0")}`;
}

export function formatDate(iso: string): string {
  const [y, m, d] = iso.split("-");
  if (!y || !m || !d) return iso;
  return `${d}/${m}/${y}`;
}

export function formatPct(value: number | null): string {
  if (value == null || Number.isNaN(value)) return "Non osservato chiaramente";
  return `${Math.round(value * 100)}%`;
}

export function formatDelta(pct: number | null): string {
  if (pct == null || Number.isNaN(pct)) return "—";
  const rounded = Math.abs(pct) < 10 ? Math.round(pct * 10) / 10 : Math.round(pct);
  const sign = rounded > 0 ? "+" : "";
  return `${sign}${rounded}%`;
}

export function uid(prefix: string): string {
  return `${prefix}-${Math.random().toString(36).slice(2, 8)}${Date.now().toString(36).slice(-3)}`;
}

export function appPath(pathname: string, params?: Record<string, string>): string {
  const base = process.env.NEXT_PUBLIC_BASE_PATH || "";
  const path = pathname.endsWith("/") ? pathname : `${pathname}/`;
  const query = params ? `?${new URLSearchParams(params).toString()}` : "";
  return `${base}${path}${query}`;
}
