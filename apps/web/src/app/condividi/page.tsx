import { Suspense } from "react";
import { ShareScreen } from "@/components/ShareScreen";

export default function SharePage() {
  return (
    <Suspense fallback={<p className="py-10 text-mute">Apro il link…</p>}>
      <ShareScreen />
    </Suspense>
  );
}
