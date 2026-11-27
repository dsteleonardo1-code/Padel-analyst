"use client";

import { useSearchParams } from "next/navigation";
import { useEffect, useState } from "react";
import { decodeShare, type SharePayload } from "@/lib/share";
import { ReportView } from "./report/ReportView";
import { useStore } from "./Store";
import { Banner } from "./ui";

export function ShareScreen() {
  const params = useSearchParams();
  const packed = params.get("p");
  const [payload, setPayload] = useState<SharePayload | null>(null);
  const [error, setError] = useState("");

  useEffect(() => {
    if (!packed) {
      setError("Manca il contenuto del link.");
      return;
    }
    decodeShare(packed)
      .then(setPayload)
      .catch(() => setError("Questo link non si apre. Chiedi di inviarlo di nuovo."));
  }, [packed]);

  if (error) return <p className="py-10 text-mute">{error}</p>;
  if (!payload) return <p className="py-10 text-mute">Apro il report condiviso…</p>;

  return (
    <div>
      <Banner>Link di sola lettura. Il video non è incluso: vedi la ricostruzione dei colpi.</Banner>
      <ReportView
        match={payload.match}
        shots={payload.shots}
        rallies={payload.rallies}
        players={payload.players}
        readOnly
      />
    </div>
  );
}
