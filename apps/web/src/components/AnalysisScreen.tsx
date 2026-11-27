"use client";

import { useSearchParams } from "next/navigation";
import { Wizard } from "./Wizard";

export function AnalysisScreen() {
  const params = useSearchParams();
  return <Wizard resumeId={params.get("riprendi") ?? undefined} />;
}
