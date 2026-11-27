import type { ReactNode } from "react";
import { Gift, Trophy, Zap } from "lucide-react";
import { gifted } from "@/lib/stats";

export function ScoreTrio({ unforced, forced, winners }: { unforced: number; forced: number; winners: number }) {
  const gift = gifted(unforced, forced);
  return (
    <div>
      <div className="grid grid-cols-3 gap-2">
        <Stat icon={<Gift size={16} />} value={unforced} label="Gratuiti" tone="text-clay" />
        <Stat icon={<Zap size={16} />} value={forced} label="Errori" tone="text-coral" />
        <Stat icon={<Trophy size={16} />} value={winners} label="Vincenti" tone="text-lime" />
      </div>
      <p className="mt-2 text-center text-sm font-medium">{gift.line}</p>
    </div>
  );
}

function Stat({ icon, value, label, tone }: { icon: ReactNode; value: number; label: string; tone: string }) {
  return (
    <div className="surface px-2 py-3 text-center">
      <span className={`mx-auto grid h-7 w-7 place-items-center rounded-full bg-white/5 ${tone}`}>{icon}</span>
      <p className={`mt-1 font-display text-4xl font-extrabold leading-none ${tone}`}>{value}</p>
      <p className="mt-1 text-[11px] uppercase tracking-wide text-mute">{label}</p>
    </div>
  );
}
