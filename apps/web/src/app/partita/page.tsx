import { Suspense } from "react";
import { MatchScreen } from "@/components/MatchScreen";

export default function MatchPage() {
  return (
    <Suspense fallback={<p className="py-10 text-mute">Apro la partita…</p>}>
      <MatchScreen />
    </Suspense>
  );
}
