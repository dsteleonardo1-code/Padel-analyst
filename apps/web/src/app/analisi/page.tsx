import { Suspense } from "react";
import { AnalysisScreen } from "@/components/AnalysisScreen";

export default function AnalysisPage() {
  return (
    <Suspense fallback={<p className="py-10 text-mute">Apro l&apos;analisi…</p>}>
      <AnalysisScreen />
    </Suspense>
  );
}
