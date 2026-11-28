"use client";

import { ImageDown, Pencil, Share2 } from "lucide-react";
import { useMemo, useState } from "react";
import { buildAdvice } from "@/lib/advice";
import { buildTaggedShot, matchRating, placeZone, previousSheet, sheetDelta, shotName, summarizeMatch, topPriorities } from "@/lib/analyst";
import { summarizeTrack } from "@/lib/physical";
import { sampleVideo } from "@/lib/sampleVideo";
import { demoVideo } from "@/lib/demo";
import { downloadText, shotsToCsv } from "@/lib/csv";
import { appPath, cx, formatPct, formatTime, uid } from "@/lib/format";
import { causeLabel, it, outcomeLabel, reasonLabel, shotLabel, situationLabel, sportLabel } from "@/lib/i18n";
import { encodeShare } from "@/lib/share";
import { isError, pairStats, playerShots, quarters, serveStats, summarize } from "@/lib/stats";
import type { CourtCalibration, CourtZone, ErrorCause, ErrorReason, IntensityStrip, Match, PhysicalReport, Player, PointPhase, Rally, Shot, ShotOutcome, ShotType, UserClip } from "@/lib/types";
import { ScoreTrio } from "../ScoreTrio";
import { Banner, Button, ExampleMark, Fold, Select, SourceMark } from "../ui";
import { AnalystBoard } from "./AnalystBoard";
import { ClipRail } from "./ClipRail";
import { CourtMap } from "./CourtMap";
import { FieldTools } from "./FieldTools";
import { HeatStrip } from "./HeatStrip";
import { ShotTimeline } from "./ShotTimeline";
import { TagBar } from "./TagBar";
import { VideoStage } from "./VideoStage";

type Filter = "all" | "free" | "errors" | "winners" | "other";

export function ReportView({
  match,
  shots,
  rallies,
  players,
  readOnly = false,
  onCorrect,
  onFocus,
  onSaveToProfile,
  onTag,
  history = [],
  clips = [],
  calibration = null,
  physical = null,
  strip = null,
  onSaveClip,
  onDeleteClip,
  onToggleClip,
  onSaveCalibration,
  onSavePhysical,
  onSaveStrip,
  videoUrl = null,
}: {
  match: Match;
  shots: Shot[];
  rallies: Rally[];
  players: Player[];
  readOnly?: boolean;
  onCorrect?: (shot: Shot) => void;
  onFocus?: (playerId: string) => void;
  onSaveToProfile?: () => void;
  onTag?: (shot: Shot, rally: Rally | null) => void;
  history?: Match[];
  clips?: UserClip[];
  calibration?: CourtCalibration | null;
  physical?: PhysicalReport | null;
  strip?: IntensityStrip | null;
  onSaveClip?: (clip: UserClip) => void;
  onDeleteClip?: (id: string) => void;
  onToggleClip?: (id: string) => void;
  onSaveCalibration?: (calibration: CourtCalibration) => void;
  onSavePhysical?: (report: PhysicalReport) => void;
  onSaveStrip?: (strip: IntensityStrip) => void;
  videoUrl?: string | null;
}) {
  const focusId = match.focusPlayerId;
  const mine = useMemo(() => playerShots(shots, focusId, match.id).sort((a, b) => a.tImpact - b.tImpact), [shots, focusId, match.id]);
  const summary = summarize(mine);
  const advice = buildAdvice(mine, focusId);
  const serve = serveStats(shots, rallies, focusId, match.id);
  const pair = pairStats(shots, focusId, match.id);
  const blocks = quarters(mine, match.durationSec);
  const player = players.find((item) => item.id === focusId);
  const others = [...new Set(shots.filter((shot) => shot.matchId === match.id).map((shot) => shot.playerId))];
  const [filter, setFilter] = useState<Filter>("all");
  const [typeFilter, setTypeFilter] = useState<ShotType | "all">("all");
  const [selected, setSelected] = useState<string | null>(null);
  const [editing, setEditing] = useState<Shot | null>(null);
  const [notice, setNotice] = useState("");
  const [clock, setClock] = useState(0);
  const [tapMode, setTapMode] = useState<"corners" | "player" | null>(null);
  const [corners, setCorners] = useState(calibration?.corners ?? []);
  const [busy, setBusy] = useState(false);
  const [progress, setProgress] = useState(0);
  const prior = previousSheet(history, match);
  const delta = prior ? sheetDelta(summary, summarizeMatch(shots, prior.focusPlayerId, prior.id)) : null;
  const priorities = topPriorities(mine, focusId);
  const rating = matchRating(mine);
  const seekRef = useState<{ fn: (time: number) => void }>({ fn: () => undefined })[0];
  const playback = videoUrl || (match.example ? demoVideo(match.sport).src : null);

  const visible = mine.filter((shot) => {
    if (typeFilter !== "all" && shot.type !== typeFilter) return false;
    if (filter === "free") return shot.outcome === "unforced_error";
    if (filter === "errors") return shot.outcome === "forced_error";
    if (filter === "winners") return shot.outcome === "winner";
    if (filter === "other") return shot.outcome === "neutral" || shot.outcome === "unclassified" || shot.type === "unclassified";
    return true;
  });
  const rallyList = rallies.filter((rally) => rally.matchId === match.id).sort((a, b) => a.number - b.number);

  function onFrameTap(point: { x: number; y: number }) {
    if (tapMode === "corners") {
      const next = [...corners, point];
      setCorners(next);
      if (next.length >= 4) {
        onSaveCalibration?.({ matchId: match.id, corners: next.slice(0, 4), player: calibration?.player ?? null });
        setTapMode(null);
      }
      return;
    }
    if (tapMode === "player") {
      onSaveCalibration?.({ matchId: match.id, corners: calibration?.corners?.length === 4 ? calibration.corners : corners, player: point });
      setTapMode(null);
    }
  }

  async function runSample(physicalPass: boolean) {
    if (!playback) return;
    setBusy(true);
    setProgress(0);
    const chosen = clips.filter((clip) => clip.selected);
    const span = match.durationSec || 30;
    const ranges = physicalPass && chosen.length
      ? chosen.map((clip) => ({ t0: clip.t0, t1: clip.t1 }))
      : [{ t0: 0, t1: physicalPass ? Math.min(span, 12) : Math.min(span, 90) }];
    const step = physicalPass ? 0.8 : Math.max(1, Math.min(span, 90) / 40);
    const video = document.querySelector("#stage video");
    if (!(video instanceof HTMLVideoElement) || !video.videoWidth) {
      onSavePhysical?.({
        matchId: match.id,
        distanceM: null,
        maxSpeedMps: null,
        sprints: null,
        steps: null,
        jumps: null,
        lock: 0,
        samples: 0,
        note: "Il video non ha un fotogramma leggibile. Numeri lasciati vuoti.",
      });
      setBusy(false);
      return;
    }
    try {
      const result = await sampleVideo({
        video,
        ranges,
        step,
        corners: physicalPass ? calibration?.corners ?? null : null,
        player: physicalPass ? calibration?.player ?? null : null,
        onProgress: setProgress,
      });
      onSaveStrip?.({ matchId: match.id, points: result.intensity });
      if (physicalPass) {
        const summary = summarizeTrack(result.samples);
        const scope = chosen.length ? "Calcolo sulle clip scelte." : "Calcolo sui primi 12 secondi.";
        const locked = result.samples.filter((sample) => sample.locked).length;
        onSavePhysical?.({
          matchId: match.id,
          distanceM: summary?.distanceM ?? null,
          maxSpeedMps: summary?.maxSpeedMps ?? null,
          sprints: summary?.sprints ?? null,
          steps: summary?.steps ?? null,
          jumps: summary?.jumps ?? null,
          lock: summary?.lock ?? (result.samples.length ? locked / result.samples.length : 0),
          samples: summary?.samples ?? result.samples.length,
          note: `${summary?.note ?? `Tracciamento insufficiente (${locked}/${result.samples.length}). Numeri lasciati vuoti.`} ${scope}`,
        });
      }
    } catch {
      if (physicalPass) {
        onSavePhysical?.({
          matchId: match.id,
          distanceM: null,
          maxSpeedMps: null,
          sprints: null,
          steps: null,
          jumps: null,
          lock: 0,
          samples: 0,
          note: "Calcolo interrotto. Numeri lasciati vuoti.",
        });
      }
    } finally {
      setBusy(false);
    }
  }

  function jump(time: number | null) {
    if (time == null) return;
    seekRef.fn(Math.max(0, time - 0.6));
    document.getElementById("stage")?.scrollIntoView({ behavior: "smooth", block: "start" });
  }

  function stepRally(direction: 1 | -1) {
    if (!rallyList.length) return;
    const current = rallyList.findIndex((rally) => rally.tStart <= (selected ? mine.find((shot) => shot.id === selected)?.tImpact ?? 0 : 0) && rally.tEnd >= (selected ? mine.find((shot) => shot.id === selected)?.tImpact ?? 0 : 0));
    const next = rallyList[Math.min(rallyList.length - 1, Math.max(0, (current < 0 ? 0 : current) + direction))];
    if (next) jump(next.tStart);
  }

  async function share() {
    try {
      const url = readOnly || match.example
        ? `${window.location.origin}${appPath("/partita", { id: match.id })}`
        : `${window.location.origin}${appPath("/condividi", {
            p: await encodeShare({
              match: { ...match, videoUrl: "" },
              rallies: rallyList,
              shots: shots.filter((shot) => shot.matchId === match.id),
              players: players.filter((item) => others.includes(item.id) || item.id === focusId),
            }),
          })}`;
      if (navigator.share) await navigator.share({ title: "Fondocampo", text: "Report partita", url });
      else {
        await navigator.clipboard.writeText(url);
        setNotice("Link copiato. Chi lo apre vede il report, non il video.");
      }
    } catch (error) {
      if (error instanceof DOMException && error.name === "AbortError") return;
      setNotice("Non sono riuscito a creare il link. Puoi esportare il CSV.");
    }
  }

  return (
    <div className="space-y-4 py-3">
      <VideoStage
        match={match}
        shots={mine}
        videoUrl={playback}
        onReady={(fn) => {
          seekRef.fn = fn;
        }}
        onTime={setClock}
        onPrev={() => stepRally(-1)}
        onNext={() => stepRally(1)}
        tapLabel={tapMode === "corners" ? `Angolo ${corners.length + 1} di 4` : tapMode === "player" ? "Tocca il giocatore" : null}
        onTap={tapMode ? onFrameTap : undefined}
      />
      <ShotTimeline shots={mine} duration={match.durationSec} time={clock} onSeek={jump} />
      <HeatStrip
        points={strip?.points ?? []}
        shots={mine}
        duration={match.durationSec}
        time={clock}
        onSeek={jump}
        busy={busy}
        onBuild={() => runSample(false)}
      />
      {!readOnly && onTag && (
        <TagBar
          time={clock}
          onStamp={(stamp) => {
            const cover = rallyList.find((rally) => clock >= rally.tStart && clock <= rally.tEnd);
            const rally: Rally = cover ?? {
              id: uid("r"),
              matchId: match.id,
              number: rallyList.length + 1,
              tStart: Math.max(0, clock - 0.4),
              tEnd: clock + 1.5,
              winnerTeam: null,
              serverTeam: stamp.type === "serve" ? 1 : null,
            };
            onTag(
              buildTaggedShot({
                id: uid("s"),
                matchId: match.id,
                rallyId: rally.id,
                playerId: focusId,
                time: clock,
                example: match.example,
                ...stamp,
              }),
              cover ? null : rally,
            );
            setNotice(`Segnato ${formatTime(clock)}`);
          }}
        />
      )}
      <section className="share-card rise space-y-4 p-5">
        <div className="flex items-start justify-between gap-3">
          <div>
            <h1 className="font-display text-4xl font-extrabold leading-none tracking-tight">{player?.name ?? "Giocatore"}</h1>
            <p className="mt-2 text-sm text-mute">{match.score || sportLabel[match.sport]}</p>
          </div>
          <div className="text-right">
            <p className="font-display text-5xl font-extrabold leading-none text-lime">{rating ? rating.score : "—"}</p>
            <SourceMark source={match.source} example={match.example} hand={match.confidenceNote.includes("colpi segnati a mano")} />
          </div>
        </div>
        <ScoreTrio unforced={summary.unforced} forced={summary.forced} winners={summary.winners} />
        <p className="text-center text-xs text-mute">{rating ? rating.line : "Indice dopo 4 colpi classificati."}</p>
        {(match.limitNote || match.confidenceNote) && (
          <details className="text-xs text-mute">
            <summary className="min-h-11 cursor-pointer text-lime">Fonte</summary>
            {match.confidenceNote && <p className="mt-1 text-clay">{match.confidenceNote}</p>}
            {match.limitNote && <p className="mt-1 leading-relaxed">{match.limitNote}</p>}
          </details>
        )}
      </section>
      {notice && <Banner tone="sand">{notice}</Banner>}
      <AnalystBoard
        match={match}
        shots={mine}
        rallies={rallyList}
        playerId={focusId}
        priorities={priorities}
        delta={delta ? { errors: delta.errors, winners: delta.winners } : null}
        onJump={jump}
      />
      {!readOnly && onSaveToProfile && !match.saved && (
        <Button type="button" className="w-full" onClick={onSaveToProfile}>Salva nel mio profilo</Button>
      )}
      {match.saved && <p className="text-center text-sm text-lime">Nel tuo profilo</p>}
      <FieldTools
        time={clock}
        clips={clips}
        calibration={calibration}
        report={physical}
        busy={busy}
        progress={progress}
        onMarkIn={() => undefined}
        onSaveClip={(t0, t1) => onSaveClip?.({ id: uid("c"), matchId: match.id, t0, t1, selected: true })}
        onDeleteClip={(id) => onDeleteClip?.(id)}
        onToggleClip={(id) => onToggleClip?.(id)}
        onPlay={(t0) => jump(t0)}
        onStartCorners={() => { setCorners([]); setTapMode("corners"); }}
        onStartPlayer={() => setTapMode("player")}
        onRun={() => runSample(true)}
      />
      <ClipRail shots={mine} videoUrl={playback} example={match.example} rallies={rallyList} />

      {others.length > 1 && onFocus && (
        <label className="block text-sm">
          <span className="mb-1 block text-mute">Giocatore seguito</span>
          <Select value={focusId} onChange={(event) => onFocus(event.target.value)}>
            {others.map((id) => (
              <option key={id} value={id}>
                {players.find((item) => item.id === id)?.name ?? id}
              </option>
            ))}
          </Select>
        </label>
      )}

      <Fold title="Perché">
        {summary.byReason.length === 0 ? (
          <p className="text-sm text-mute">{it.unobserved}</p>
        ) : (
          <ul className="mt-3 flex flex-wrap gap-2">
            {summary.byReason.map((row) => (
              <li key={row.reason} className="rounded-full bg-coral/15 px-3 py-2 text-sm">
                {reasonLabel[row.reason]} <strong>{row.count}</strong>
              </li>
            ))}
          </ul>
        )}
        <div className="mt-4 space-y-3">
          {summary.byType.map((row) => (
            <div key={row.type}>
              <div className="flex items-baseline justify-between gap-3 text-sm">
                <span>{shotLabel[row.type]}</span>
                <span className="text-mute">
                  {row.errors} errori su {row.total}
                  {row.errorRate == null ? " · tasso non osservato chiaramente" : ` · ${formatPct(row.errorRate)}`}
                </span>
              </div>
              <div className="mt-1 h-2 rounded-full bg-white/10">
                <div className="h-2 rounded-full bg-coral" style={{ width: `${row.total ? (row.errors / row.total) * 100 : 0}%` }} />
              </div>
            </div>
          ))}
        </div>
      </Fold>

      <Fold title="Cosa fai bene">
        {advice.strengths.length === 0 ? (
          <p className="text-sm text-mute">{it.unobserved}</p>
        ) : (
          <ul className="mt-3 space-y-3">
            {advice.strengths.map((item) => (
              <li key={item.key}>
                <p className="font-semibold">{item.title}</p>
                <p className="text-sm text-mute">{item.text}</p>
                {item.t != null && (
                  <button type="button" className="mt-1 min-h-11 text-sm font-semibold text-lime" onClick={() => jump(item.t)}>
                    Rivedi {formatTime(item.t)}
                  </button>
                )}
              </li>
            ))}
          </ul>
        )}
      </Fold>

      <Fold title="Mappa">
        <CourtMap sport={match.sport} shots={mine} selectedId={selected} />
      </Fold>

      {match.sport === "tennis" && (
        <Fold title="Servizio">
          {serve.observed ? (
            <ul className="mt-3 space-y-1 text-sm">
              <li>Prime in campo: {formatPct(serve.firstInPct)}</li>
              <li>Seconde in campo: {formatPct(serve.secondInPct)}</li>
              <li>Punti vinti al servizio: {formatPct(serve.pointsWonOnServePct)}</li>
              <li>Punti vinti in risposta: {formatPct(serve.pointsWonOnReturnPct)}</li>
              <li>Doppi falli: {serve.doubleFaults}</li>
            </ul>
          ) : (
            <p className="text-sm text-mute">{it.unobserved}</p>
          )}
        </Fold>
      )}

      {match.sport === "padel" && (
        <Fold title="Coppia">
          <p className="text-sm">
            {match.side === "left" ? "Sinistra" : "Destra"} · compagno {pair.partnerWinners} vincenti, {pair.partnerErrors} errori
          </p>
        </Fold>
      )}

      <Fold title="Nel tempo">
        <ul className="space-y-2">
          {blocks.map((block) => (
            <li key={block.label} className="flex items-center justify-between text-sm">
              <span>{block.label}</span>
              <span className="text-mute">
                {block.shots === 0 ? "—" : `${block.unforced} gratuiti · ${block.forced} errori · ${block.winners} vincenti`}
              </span>
            </li>
          ))}
        </ul>
      </Fold>

      <div className="no-print flex gap-2 overflow-x-auto pb-1">
        {(
          [
            ["all", "Tutti"],
            ["free", "Gratuiti"],
            ["errors", "Errori"],
            ["winners", "Vincenti"],
            ["other", "Altri"],
          ] as const
        ).map(([id, label]) => (
          <button
            key={id}
            type="button"
            onClick={() => setFilter(id)}
            className={cx("chip shrink-0", filter === id ? "bg-lime text-ink" : "bg-white/5")}
          >
            {label}
          </button>
        ))}
      </div>
      <Select value={typeFilter} onChange={(event) => setTypeFilter(event.target.value as ShotType | "all")}>
        <option value="all">Tutti i colpi</option>
        {summary.byType.map((row) => (
          <option key={row.type} value={row.type}>
            {shotLabel[row.type]}
          </option>
        ))}
      </Select>

      <ul className="space-y-2">
        {visible.map((shot) => (
          <li key={shot.id}>
            <article className={cx("surface px-3 py-3", selected === shot.id ? "ring-2 ring-lime" : "")}>
              <div className="flex items-start justify-between gap-2">
                <button type="button" className="min-h-11 text-left" onClick={() => { setSelected(shot.id); jump(shot.tImpact); }}>
                  <span className="font-display text-lg font-bold text-lime">{formatTime(shot.tImpact)}</span>
                  <span className="mt-1 block text-sm">
                    {shotName(shot)} · {outcomeLabel[shot.outcome]}
                    {shot.errorReason ? ` · ${reasonLabel[shot.errorReason]}` : ""}
                  </span>
                </button>
                {!readOnly && (
                  <button type="button" className="grid h-11 w-11 place-items-center rounded-full bg-white/5" onClick={() => setEditing(shot)} aria-label="Correggi colpo">
                    <Pencil size={16} />
                  </button>
                )}
              </div>
              <p className="text-xs text-mute">
                {shot.errorCause ? causeLabel[shot.errorCause] : ""}
                {shot.pressured ? " · pressione" : ""}
                {shot.manuallyCorrected ? " · a mano" : ` · ${Math.round(shot.confidence * 100)}%`}
                {shot.example ? " · ESEMPIO" : ""}
              </p>
            </article>
          </li>
        ))}
        {visible.length === 0 && <li className="text-sm text-mute">Nessun colpo con questo filtro.</li>}
      </ul>

      {match.unclassifiedSegments.length > 0 && (
        <Fold title="Non classificato">
          <ul className="mt-2 space-y-2 text-sm">
            {match.unclassifiedSegments.map((segment) => (
              <li key={`${segment.t0}-${segment.note}`}>
                <button type="button" className="min-h-11 text-left text-lime" onClick={() => jump(segment.t0)}>
                  {formatTime(segment.t0)}–{formatTime(segment.t1)}
                </button>
                <p className="text-mute">{segment.note}</p>
              </li>
            ))}
          </ul>
        </Fold>
      )}

      <div className="no-print flex flex-wrap gap-2">
        <Button type="button" onClick={share}>
          <Share2 size={16} /> Link
        </Button>
        <Button type="button" variant="sand" onClick={() => shareImage({
          name: player?.name ?? "Giocatore",
          score: match.score || sportLabel[match.sport],
          unforced: summary.unforced,
          forced: summary.forced,
          winners: summary.winners,
          rating: rating?.score ?? null,
          line: rating?.line ?? "Pochi colpi classificati",
          example: match.example,
          manual: match.confidenceNote.includes("colpi segnati a mano"),
          extra: physical
            ? [
                physical.distanceM != null ? `Distanza ${physical.distanceM} m` : "Distanza —",
                physical.maxSpeedMps != null ? `Velocità ${(physical.maxSpeedMps * 3.6).toFixed(1)} km/h` : "Velocità —",
                physical.sprints != null ? `Scatti ${physical.sprints}` : "Scatti —",
                "STIMA",
              ]
            : ["Fisica non calcolata"],
        }).then((shared) => setNotice(shared ? "Scheda condivisa." : "Immagine salvata.")).catch(() => setNotice("Immagine non creata."))}>
          <ImageDown size={16} /> Immagine
        </Button>
        <Button
          type="button"
          variant="ghost"
          onClick={() => downloadText(`fondocampo-${match.id}.csv`, shotsToCsv(shots.filter((shot) => shot.matchId === match.id), players))}
        >
          Esporta CSV
        </Button>
        <Button type="button" variant="sand" onClick={() => window.print()}>
          Esporta PDF
        </Button>
      </div>
      <p className="text-xs text-mute">PDF: stampa del telefono. Il link non include il video.</p>

      {editing && onCorrect && (
        <EditSheet
          shot={editing}
          players={players.filter((item) => others.includes(item.id))}
          onClose={() => setEditing(null)}
          onSave={(shot) => {
            onCorrect(shot);
            setEditing(null);
            setNotice("Correzione salvata. Le statistiche sono già ricalcolate.");
          }}
        />
      )}
    </div>
  );
}

async function shareImage(card: {
  name: string;
  score: string;
  unforced: number;
  forced: number;
  winners: number;
  rating: number | null;
  line: string;
  example: boolean;
  manual: boolean;
  extra?: string[];
}): Promise<boolean> {
  const canvas = document.createElement("canvas");
  canvas.width = 1080;
  canvas.height = 1350;
  const ctx = canvas.getContext("2d");
  if (!ctx) throw new Error("canvas");
  ctx.fillStyle = "#07110e";
  ctx.fillRect(0, 0, 1080, 1350);
  ctx.fillStyle = "#d6ff3f";
  ctx.font = "700 42px sans-serif";
  ctx.fillText("FONDOCAMPO", 72, 140);
  ctx.fillStyle = "#f4efe4";
  ctx.font = "800 92px sans-serif";
  ctx.fillText(card.name.slice(0, 22), 72, 280);
  ctx.fillStyle = "#a8b6ad";
  ctx.font = "500 36px sans-serif";
  ctx.fillText(card.score, 72, 350);
  ctx.fillStyle = "#d6ff3f";
  ctx.font = "800 180px sans-serif";
  ctx.fillText(card.rating == null ? "—" : String(card.rating), 72, 580);
  ctx.fillStyle = "#f4efe4";
  ctx.font = "500 36px sans-serif";
  wrap(ctx, card.line, 72, 660, 920, 48);
  const cells = [
    ["Gratuiti", String(card.unforced), "#ff7a45"],
    ["Errori", String(card.forced), "#ff5d6c"],
    ["Vincenti", String(card.winners), "#d6ff3f"],
  ];
  cells.forEach((cell, index) => {
    const x = 72 + index * 320;
    ctx.fillStyle = "#10241c";
    roundRect(ctx, x, 860, 290, 220, 36);
    ctx.fillStyle = cell[2];
    ctx.font = "800 96px sans-serif";
    ctx.fillText(cell[1], x + 28, 1000);
    ctx.font = "600 28px sans-serif";
    ctx.fillText(cell[0], x + 28, 1050);
  });
  ctx.fillStyle = "#d6ff3f";
  ctx.font = "700 28px sans-serif";
  const marks = [card.example ? "ESEMPIO" : "", card.manual ? "TAG MANUALE" : ""].filter(Boolean).join("  ·  ");
  if (marks) ctx.fillText(marks, 72, 1180);
  ctx.fillStyle = "#f4efe4";
  ctx.font = "600 32px sans-serif";
  (card.extra ?? []).slice(0, 4).forEach((line, index) => ctx.fillText(line, 72, 1240 + index * 40));
  const blob = await new Promise<Blob | null>((resolve) => canvas.toBlob(resolve, "image/png"));
  if (!blob) throw new Error("png");
  const file = new File([blob], "fondocampo.png", { type: "image/png" });
  if (navigator.canShare?.({ files: [file] })) {
    await navigator.share({ files: [file], title: card.name });
    return true;
  }
  const url = URL.createObjectURL(blob);
  const link = document.createElement("a");
  link.href = url;
  link.download = "fondocampo.png";
  link.click();
  URL.revokeObjectURL(url);
  return false;
}

function roundRect(ctx: CanvasRenderingContext2D, x: number, y: number, w: number, h: number, r: number) {
  ctx.beginPath();
  ctx.moveTo(x + r, y);
  ctx.arcTo(x + w, y, x + w, y + h, r);
  ctx.arcTo(x + w, y + h, x, y + h, r);
  ctx.arcTo(x, y + h, x, y, r);
  ctx.arcTo(x, y, x + w, y, r);
  ctx.closePath();
  ctx.fill();
}

function wrap(ctx: CanvasRenderingContext2D, text: string, x: number, y: number, max: number, line: number) {
  const words = text.split(" ");
  let row = "";
  let top = y;
  for (const word of words) {
    const next = row ? `${row} ${word}` : word;
    if (ctx.measureText(next).width > max) {
      ctx.fillText(row, x, top);
      row = word;
      top += line;
    } else row = next;
  }
  if (row) ctx.fillText(row, x, top);
}

function EditSheet({
  shot,
  players,
  onClose,
  onSave,
}: {
  shot: Shot;
  players: Player[];
  onClose: () => void;
  onSave: (shot: Shot) => void;
}) {
  const [type, setType] = useState<ShotType>(shot.type);
  const [outcome, setOutcome] = useState<ShotOutcome>(shot.outcome);
  const [reason, setReason] = useState<ErrorReason | "">(shot.errorReason ?? "");
  const [cause, setCause] = useState<ErrorCause | "">(shot.errorCause ?? "");
  const [zone, setZone] = useState<CourtZone | "">(shot.zone ?? "");
  const [pressured, setPressured] = useState(shot.pressured === true);
  const [phase, setPhase] = useState<PointPhase | "">(shot.phase ?? "");
  const [playerId, setPlayerId] = useState(shot.playerId);
  const error = outcome === "unforced_error" || outcome === "forced_error";

  return (
    <div className="no-print fixed inset-0 z-30 flex items-end bg-black/60" role="dialog" aria-modal="true" aria-label="Correggi colpo">
      <form
        className="max-h-[85dvh] w-full space-y-3 overflow-auto rounded-t-3xl bg-pine p-4"
        style={{ paddingBottom: "calc(1rem + env(safe-area-inset-bottom))" }}
        onSubmit={(event) => {
          event.preventDefault();
          const next: Shot = {
            ...shot,
            type,
            outcome,
            errorReason: error && reason ? reason : null,
            errorCause: error && cause ? cause : null,
            pressured,
            phase: phase || null,
            playerId,
            manuallyCorrected: true,
            confidence: 1,
            example: shot.example,
          };
          onSave(zone ? placeZone(next, zone) : next);
        }}
      >
        <div className="flex items-center justify-between">
          <h2 className="font-display text-xl font-bold">Correggi {formatTime(shot.tImpact)}</h2>
          <button type="button" className="min-h-11 px-2" onClick={onClose}>
            Chiudi
          </button>
        </div>
        <label className="block text-sm">Colpo
          <Select value={type} onChange={(event) => setType(event.target.value as ShotType)} className="mt-1">
            {Object.keys(shotLabel).map((key) => (
              <option key={key} value={key}>{shotLabel[key as ShotType]}</option>
            ))}
          </Select>
        </label>
        <div className="grid grid-cols-3 gap-2">
          {(
            [
              ["unforced_error", "Gratuito"],
              ["forced_error", "Errore"],
              ["winner", "Vincente"],
            ] as const
          ).map(([value, label]) => (
            <button
              key={value}
              type="button"
              onClick={() => setOutcome(value)}
              className={`min-h-16 rounded-2xl px-2 text-sm font-semibold ${outcome === value ? "bg-lime text-ink" : "bg-white/5"}`}
            >
              {label}
            </button>
          ))}
        </div>
        {error && (
          <>
            <label className="block text-sm">Motivo
              <Select value={reason} onChange={(event) => setReason(event.target.value as ErrorReason | "")} className="mt-1">
                <option value="">Non indicato</option>
                {Object.keys(reasonLabel).map((key) => (
                  <option key={key} value={key}>{reasonLabel[key as ErrorReason]}</option>
                ))}
              </Select>
            </label>
            <label className="block text-sm">Causa
              <Select value={cause} onChange={(event) => setCause(event.target.value as ErrorCause | "")} className="mt-1">
                <option value="">Non indicata</option>
                {Object.keys(causeLabel).map((key) => (
                  <option key={key} value={key}>{causeLabel[key as ErrorCause]}</option>
                ))}
              </Select>
            </label>
          </>
        )}
        <div className="grid grid-cols-4 gap-2">
          {(
            [
              ["baseline", "Fondo"],
              ["transition", "Mezzo"],
              ["net", "Rete"],
              ["wall", "Parete"],
            ] as const
          ).map(([value, label]) => (
            <button key={value} type="button" onClick={() => setZone(value)} className={`min-h-11 rounded-2xl text-sm font-semibold ${zone === value ? "bg-lime text-ink" : "bg-white/5"}`}>
              {label}
            </button>
          ))}
        </div>
        <div className="flex gap-2">
          <button type="button" onClick={() => setPressured((value) => !value)} className={`min-h-11 rounded-full px-3 text-sm font-semibold ${pressured ? "bg-lime text-ink" : "bg-white/5"}`}>Pressione</button>
          <button type="button" onClick={() => setPhase((value) => (value === "start" ? "" : "start"))} className={`min-h-11 rounded-full px-3 text-sm font-semibold ${phase === "start" ? "bg-lime text-ink" : "bg-white/5"}`}>Inizio</button>
          <button type="button" onClick={() => setPhase((value) => (value === "end" ? "" : "end"))} className={`min-h-11 rounded-full px-3 text-sm font-semibold ${phase === "end" ? "bg-lime text-ink" : "bg-white/5"}`}>Fine</button>
        </div>
        <label className="block text-sm">Giocatore
          <Select value={playerId} onChange={(event) => setPlayerId(event.target.value)} className="mt-1">
            {players.map((item) => (
              <option key={item.id} value={item.id}>{item.name}</option>
            ))}
          </Select>
        </label>
        <Button type="submit" className="w-full">Salva</Button>
      </form>
    </div>
  );
}
