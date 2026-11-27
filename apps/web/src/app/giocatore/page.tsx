import { Suspense } from "react";
import { PlayerScreen } from "@/components/PlayerScreen";

export default function PlayerPage() {
  return (
    <Suspense fallback={<p className="py-10 text-mute">Apro il giocatore…</p>}>
      <PlayerScreen />
    </Suspense>
  );
}
