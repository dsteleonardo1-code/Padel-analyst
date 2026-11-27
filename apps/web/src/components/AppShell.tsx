"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { useEffect } from "react";
import { GitCompare, House, UserRound, Users, Video } from "lucide-react";
import { it } from "@/lib/i18n";
import { useStore } from "./Store";

const links = [
  { href: "/", label: it.nav.home, icon: House },
  { href: "/analisi", label: it.nav.analyze, icon: Video },
  { href: "/giocatori", label: it.nav.players, icon: Users },
  { href: "/confronto", label: it.nav.compare, icon: GitCompare },
  { href: "/profilo", label: it.nav.profile, icon: UserRound },
];

function normalize(path: string): string {
  if (path.length > 1 && path.endsWith("/")) return path.slice(0, -1);
  return path || "/";
}

export function AppShell({ children }: { children: React.ReactNode }) {
  const pathname = normalize(usePathname() || "/");
  const { ready } = useStore();

  useEffect(() => {
    if (process.env.NODE_ENV !== "production" || !("serviceWorker" in navigator)) return;
    const base = process.env.NEXT_PUBLIC_BASE_PATH || "";
    navigator.serviceWorker.register(`${base}/sw.js`, { scope: `${base}/` }).catch(() => undefined);
  }, []);

  return (
    <div className="mx-auto min-h-dvh max-w-lg">
      <header className="safe-top no-print sticky top-0 z-20 flex items-center justify-between border-b border-white/5 bg-ink/75 px-4 py-3 backdrop-blur-md">
        <Link href="/" className="flex items-center gap-2">
          <span className="grid h-9 w-9 place-items-center rounded-2xl bg-lime font-display text-lg font-extrabold text-ink shadow-glow">F</span>
          <span>
            <span className="block font-display text-lg font-bold leading-none tracking-tight">{it.appName}</span>
            <span className="text-[10px] uppercase tracking-[0.22em] text-mute">Padel · Tennis</span>
          </span>
        </Link>
        <Link href="/profilo" className="press min-h-11 rounded-full border border-white/10 bg-white/5 px-3 py-2 text-sm text-sand">
          {it.nav.profile}
        </Link>
      </header>
      <main className="safe-page px-4">{ready ? children : <p className="py-16 text-center text-mute">Apro Fondocampo…</p>}</main>
      <nav className="no-print fixed inset-x-0 bottom-0 z-20 border-t border-white/10 bg-ink/90 backdrop-blur-md">
        <ul
          className="mx-auto flex max-w-lg justify-between px-2 pt-1"
          style={{ paddingBottom: "calc(0.35rem + env(safe-area-inset-bottom))" }}
        >
          {links.map((link) => {
            const active = normalize(link.href) === pathname;
            const Icon = link.icon;
            return (
              <li key={link.href} className="flex-1">
                <Link
                  href={link.href}
                  className={`press flex min-h-11 flex-col items-center justify-center gap-0.5 rounded-2xl text-[11px] ${active ? "text-lime" : "text-mute"}`}
                >
                  <Icon size={18} aria-hidden className={active ? "drop-shadow-[0_0_6px_rgba(214,255,63,0.7)]" : undefined} />
                  {link.label}
                </Link>
              </li>
            );
          })}
        </ul>
      </nav>
    </div>
  );
}
