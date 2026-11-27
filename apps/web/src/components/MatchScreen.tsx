"use client";

import Link from "next/link";
import { useSearchParams } from "next/navigation";
import { useEffect, useState } from "react";
import { demoVideo } from "@/lib/demo";
import { appPath } from "@/lib/format";
import { deleteVideo, loadVideo } from "@/lib/storage";
import { ReportView } from "./report/ReportView";
import { useStore } from "./Store";
import { Button } from "./ui";

export function MatchScreen() {
  const params = useSearchParams();
  const id = params.get("id") ?? "";
  const { state, updateShot, setFocus, deleteMatch } = useStore();
  const match = state.matches.find((item) => item.id === id);
  const [videoUrl, setVideoUrl] = useState<string | null>(null);

  useEffect(() => {
    if (!match || match.example) return;
    let active = true;
    let url = "";
    loadVideo(match.id)
      .then((blob) => {
        if (!active || !blob) return;
        url = URL.createObjectURL(blob);
        setVideoUrl(url);
      })
      .catch(() => undefined);
    return () => {
      active = false;
      if (url) URL.revokeObjectURL(url);
    };
  }, [match?.id, match?.example]);

  if (!match) {
    return (
      <div className="py-10">
        <p className="font-display text-2xl font-bold">Partita non trovata</p>
        <p className="mt-2 text-sm text-mute">Se era solo su un altro telefono, quel report non è qui.</p>
        <Link href="/" className="mt-4 inline-flex min-h-11 items-center font-semibold text-lime">Torna alle partite</Link>
      </div>
    );
  }

  return (
    <>
      <ReportView
        match={match}
        shots={state.shots}
        rallies={state.rallies}
        players={state.players}
        videoUrl={match.example ? demoVideo(match.sport).src : videoUrl}
        onCorrect={updateShot}
        onFocus={(playerId) => setFocus(match.id, playerId)}
      />
      {!match.example && (
        <Button
          type="button"
          variant="danger"
          className="mb-6"
          onClick={() => {
            deleteMatch(match.id);
            deleteVideo(match.id).catch(() => undefined);
            window.location.href = appPath("/");
          }}
        >
          Elimina questa partita
        </Button>
      )}
    </>
  );
}
