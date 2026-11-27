"use client";

import { Pencil, Share2 } from "lucide-react";
import { useMemo, useState } from "react";
import { buildAdvice } from "@/lib/advice";
import { downloadText, shotsToCsv } from "@/lib/csv";
import { appPath, cx, formatDelta, formatPct, formatTime } from "@/lib/format";
import { causeLabel, it, outcomeLabel, reasonLabel, shotLabel, situationLabel, sportLabel } from "@/lib/i18n";
import { encodeShare } from "@/lib/share";
import { isError, pairStats, playerShots, quarters, serveStats, summarize } from "@/lib/stats";
import type { ErrorCause, ErrorReason, Match, Player, Rally, Shot, ShotOutcome, ShotType } from "@/lib/types";
import { Banner, Button, Card, ExampleMark, Select, SourceMark } from "../ui";
import { CourtMap } from "./CourtMap";
import { VideoStage } from "./VideoStage";

type Filter = "all" | "errors" | "winners" | "unclassified";

export function ReportView({
  match,
  shots,
  rallies,
  players,
  readOnly = false,
  onCorrect,
  onFocus,
  videoUrl = null,
}: {
  match: Match;
  shots: Shot[];
  rallies: Rally[];
  players: Player[];
  readOnly?: boolean;
  onCorrect?: (shot: Shot) => void;
  onFocus?: (playerId: string) => void;
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
  const seekRef = useState<{ fn: (time: number) => void }>({ fn: () => undefined })[0];

  const visible = mine.filter((shot) => {
    if (typeFilter !== "all" && shot.type !== typeFilter) return false;
    if (filter === "errors") return isError(shot.outcome);
    if (filter === "winners") return shot.outcome === "winner";
    if (filter === "unclassified") return shot.type === "unclassified" || shot.outcome === "unclassified";
    return true;
  });
  const rallyList = rallies.filter((rally) => rally.matchId === match.id).sort((a, b) => a.number - b.number);

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
    <div className="space-y-4 py-4">
      <header>
        <div className="flex flex-wrap items-center gap-2">
          <SourceMark source={match.source} example={match.example} />
          <span className="text-xs uppercase tracking-wide text-mute">{sportLabel[match.sport]}</span>
        </div>
        <h1 className="mt-2 font-display text-3xl font-bold leading-tight">{player?.name ?? "Giocatore"}</h1>
        <p className="mt-1 text-sm text-mute">
          {match.place} · {match.score || "risultato non indicato"} · {match.opponents || "avversari non indicati"}
        </p>
        {match.partner && <p className="text-sm text-mute">Compagno: {match.partner}</p>}
      </header>

      {match.example ? <Banner>{it.exampleBanner}</Banner> : <Banner tone="clay">{it.heuristicBanner} {match.confidenceNote}</Banner>}
      {match.limitNote && <Banner tone="sand">{match.limitNote}</Banner>}
      {notice && <Banner tone="sand">{notice}</Banner>}

      <VideoStage
        match={match}
        shots={mine}
        videoUrl={videoUrl}
        onReady={(fn) => {
          seekRef.fn = fn;
        }}
        onPrev={() => stepRally(-1)}
        onNext={() => stepRally(1)}
      />

      <div className="grid grid-cols-2 gap-2">
        <Tile label="Errori" value={String(summary.errors)} hint={`${summary.unforced} non forzati · ${summary.forced} forzati`} tone="coral" />
        <Tile label="Colpi buoni" value={String(summary.good)} hint="Vincenti chiusi da te" tone="lime" />
        <Tile label="% errori" value={formatPct(summary.errorRate)} hint={summary.errorRate == null ? "Pochi colpi classificati" : `Su ${summary.classified} colpi classificati`} />
        <Tile label="% vincenti" value={formatPct(summary.winnerRate)} hint={`${summary.neutrals} neutri · ${summary.unclassified} non classificati`} />
      </div>

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

      <Card>
        <h2 className="font-display text-xl font-bold">Tipi di errore</h2>
        {summary.byReason.length === 0 ? (
          <p className="mt-2 text-sm text-mute">{it.unobserved}. Non ci sono errori con un motivo.</p>
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
      </Card>

      <Card className="border-lime/40">
        <p className="text-xs font-bold uppercase tracking-[0.16em] text-lime">Priorità principale</p>
        {advice.primary ? (
          <AdviceCard item={advice.primary} onJump={jump} prominent />
        ) : (
          <p className="mt-2 text-sm text-mute">Non osservato chiaramente: non ci sono errori classificati da cui ricavare un consiglio.</p>
        )}
      </Card>
      {advice.secondary.length > 0 && (
        <div className="space-y-2">
          <h2 className="font-display text-xl font-bold">Anche questo</h2>
          {advice.secondary.map((item) => (
            <Card key={item.key}>
              <AdviceCard item={item} onJump={jump} />
            </Card>
          ))}
        </div>
      )}

      <Card>
        <h2 className="font-display text-xl font-bold">Cosa fai bene</h2>
        {advice.strengths.length === 0 ? (
          <p className="mt-2 text-sm text-mute">{it.unobserved}. Servono almeno 4 colpi dello stesso tipo, con vincenti e pochi errori.</p>
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
      </Card>

      <Card>
        <h2 className="font-display text-xl font-bold">Mappa del campo</h2>
        <div className="mt-3">
          <CourtMap sport={match.sport} shots={mine} selectedId={selected} />
        </div>
      </Card>

      {match.sport === "tennis" && (
        <Card>
          <h2 className="font-display text-xl font-bold">Servizio e risposta</h2>
          {serve.observed ? (
            <ul className="mt-3 space-y-1 text-sm">
              <li>Prime in campo: {formatPct(serve.firstInPct)}</li>
              <li>Seconde in campo: {formatPct(serve.secondInPct)}</li>
              <li>Punti vinti al servizio: {formatPct(serve.pointsWonOnServePct)}</li>
              <li>Punti vinti in risposta: {formatPct(serve.pointsWonOnReturnPct)}</li>
              <li>Doppi falli: {serve.doubleFaults}</li>
            </ul>
          ) : (
            <p className="mt-2 text-sm text-mute">{it.unobserved}. Servono almeno quattro prime di servizio.</p>
          )}
        </Card>
      )}

      {match.sport === "padel" && (
        <Card>
          <h2 className="font-display text-xl font-bold">Lato e coppia</h2>
          <p className="mt-2 text-sm text-mute">
            Lato seguito: {match.side === "left" ? "sinistra" : match.side === "right" ? "destra" : "non indicato"}. Compagno nel
            report: {pair.partnerShots} colpi, {pair.partnerWinners} vincenti, {pair.partnerErrors} errori.
            {pair.partnerShots < 3 ? " Il gioco del compagno non è osservato chiaramente." : ""}
          </p>
        </Card>
      )}

      <Card>
        <h2 className="font-display text-xl font-bold">Nel corso della partita</h2>
        <ul className="mt-3 space-y-2">
          {blocks.map((block) => (
            <li key={block.label} className="flex items-center justify-between text-sm">
              <span>{block.label}</span>
              <span className="text-mute">
                {block.shots === 0 ? it.unobserved : `${block.errors} errori · ${block.winners} vincenti`}
              </span>
            </li>
          ))}
        </ul>
      </Card>

      <div className="no-print flex gap-2 overflow-x-auto pb-1">
        {(
          [
            ["all", "Tutti"],
            ["errors", "Solo errori"],
            ["winners", "Vincenti"],
            ["unclassified", "Non classificati"],
          ] as const
        ).map(([id, label]) => (
          <button
            key={id}
            type="button"
            onClick={() => setFilter(id)}
            className={cx("min-h-11 shrink-0 rounded-full px-3 text-sm", filter === id ? "bg-lime font-semibold text-ink" : "bg-white/5")}
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
            <article className={cx("rounded-3xl border px-3 py-3", selected === shot.id ? "border-lime" : "border-white/10 bg-card/80")}>
              <div className="flex items-start justify-between gap-2">
                <button type="button" className="min-h-11 text-left" onClick={() => { setSelected(shot.id); jump(shot.tImpact); }}>
                  <span className="font-display text-lg font-bold text-lime">{formatTime(shot.tImpact)}</span>
                  <span className="mt-1 block text-sm">
                    {shotLabel[shot.type]} · {outcomeLabel[shot.outcome]}
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
                {shot.errorCause ? `Causa probabile: ${causeLabel[shot.errorCause]}. ` : ""}
                {shot.situation ? `${situationLabel[shot.situation]}. ` : ""}
                {shot.manuallyCorrected ? "Confermato da te. " : `Confidenza ${Math.round(shot.confidence * 100)}%. `}
                {shot.example && <ExampleMark className="ml-1" />}
              </p>
              {shot.note && <p className="mt-1 text-xs text-mute">{shot.note}</p>}
            </article>
          </li>
        ))}
        {visible.length === 0 && <li className="text-sm text-mute">Nessun colpo con questo filtro.</li>}
      </ul>

      {match.unclassifiedSegments.length > 0 && (
        <Card>
          <h2 className="font-display text-xl font-bold">Non classificato</h2>
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
        </Card>
      )}

      <div className="no-print flex flex-wrap gap-2">
        <Button type="button" onClick={share}>
          <Share2 size={16} /> Condividi
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
      <p className="text-xs text-mute">{it.privacy} Il PDF usa la stampa del telefono: in Safari scegli «Salva PDF».</p>

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

function Tile({ label, value, hint, tone = "sand" }: { label: string; value: string; hint: string; tone?: "sand" | "lime" | "coral" }) {
  const color = tone === "lime" ? "text-lime" : tone === "coral" ? "text-coral" : "text-sand";
  return (
    <div className="rounded-3xl border border-white/10 bg-pine p-3">
      <p className="text-xs uppercase tracking-wide text-mute">{label}</p>
      <p className={cx("font-display text-3xl font-bold", color)}>{value}</p>
      <p className="text-xs text-mute">{hint}</p>
    </div>
  );
}

function AdviceCard({
  item,
  onJump,
  prominent = false,
}: {
  item: { title: string; explanation: string; drill: string; success: string; count: number; t: number | null };
  onJump: (time: number | null) => void;
  prominent?: boolean;
}) {
  return (
    <div className={prominent ? "mt-2" : ""}>
      <h3 className="font-display text-2xl font-bold">{item.title}</h3>
      <p className="mt-2 text-sm leading-relaxed text-sand/90">{item.explanation}</p>
      <p className="mt-3 text-sm"><strong>Esercizio. </strong>{item.drill}</p>
      <p className="mt-1 text-sm text-mute"><strong className="text-sand">Fatto quando: </strong>{item.success}</p>
      {item.t != null && (
        <button type="button" className="mt-2 min-h-11 text-sm font-semibold text-lime" onClick={() => onJump(item.t)}>
          Guarda il punto alle {formatTime(item.t)}
        </button>
      )}
    </div>
  );
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
  const [reason, setReason] = useState<ErrorReason>(shot.errorReason ?? "net");
  const [cause, setCause] = useState<ErrorCause>(shot.errorCause ?? "technique");
  const [playerId, setPlayerId] = useState(shot.playerId);
  const error = outcome === "unforced_error" || outcome === "forced_error";

  return (
    <div className="no-print fixed inset-0 z-30 flex items-end bg-black/60" role="dialog" aria-modal="true" aria-label="Correggi colpo">
      <form
        className="max-h-[85dvh] w-full space-y-3 overflow-auto rounded-t-3xl bg-pine p-4"
        style={{ paddingBottom: "calc(1rem + env(safe-area-inset-bottom))" }}
        onSubmit={(event) => {
          event.preventDefault();
          onSave({
            ...shot,
            type,
            outcome,
            errorReason: error ? reason : null,
            errorCause: error ? cause : null,
            playerId,
            manuallyCorrected: true,
            confidence: 1,
            example: shot.example,
          });
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
        <label className="block text-sm">Esito
          <Select value={outcome} onChange={(event) => setOutcome(event.target.value as ShotOutcome)} className="mt-1">
            {Object.keys(outcomeLabel).map((key) => (
              <option key={key} value={key}>{outcomeLabel[key as ShotOutcome]}</option>
            ))}
          </Select>
        </label>
        {error && (
          <>
            <label className="block text-sm">Motivo
              <Select value={reason} onChange={(event) => setReason(event.target.value as ErrorReason)} className="mt-1">
                {Object.keys(reasonLabel).map((key) => (
                  <option key={key} value={key}>{reasonLabel[key as ErrorReason]}</option>
                ))}
              </Select>
            </label>
            <label className="block text-sm">Causa probabile
              <Select value={cause} onChange={(event) => setCause(event.target.value as ErrorCause)} className="mt-1">
                {Object.keys(causeLabel).map((key) => (
                  <option key={key} value={key}>{causeLabel[key as ErrorCause]}</option>
                ))}
              </Select>
            </label>
          </>
        )}
        <label className="block text-sm">Giocatore
          <Select value={playerId} onChange={(event) => setPlayerId(event.target.value)} className="mt-1">
            {players.map((item) => (
              <option key={item.id} value={item.id}>{item.name}</option>
            ))}
          </Select>
        </label>
        <Button type="submit" className="w-full">Salva e ricalcola</Button>
        <p className="text-xs text-mute">La correzione resta segnata e entra nell&apos;export, pronta se un giorno servirà per addestrare un modello. Qui non parte nessun addestramento.</p>
      </form>
    </div>
  );
}
