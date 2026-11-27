import { drills, reasonLabel, shotLabel, strengthCopy } from "./i18n";
import { isError, matchesForPlayer, playerShots, summarize } from "./stats";
import type { ErrorReason, Match, Shot, ShotType } from "./types";

export interface AdviceItem {
  key: string;
  title: string;
  explanation: string;
  drill: string;
  success: string;
  count: number;
  t: number | null;
  shotId: string | null;
}

export interface StrengthItem {
  key: string;
  title: string;
  text: string;
  t: number | null;
  shotId: string | null;
}

export interface AdviceReport {
  primary: AdviceItem | null;
  secondary: AdviceItem[];
  strengths: StrengthItem[];
}

function drillFor(type: ShotType, reason: ErrorReason) {
  return drills[`${type}|${reason}`] ?? drills[reason] ?? drills.default;
}

function clusterTitle(type: ShotType, reason: ErrorReason, share: number): string {
  const copy = drillFor(type, reason);
  if (type === "unclassified") return drills[reason]?.title ?? copy.title;
  if (share >= 0.45 && drills[`${type}|${reason}`]) return copy.title;
  if (share >= 0.45) return `${shotLabel[type]}: ${reasonLabel[reason].toLowerCase()}`;
  return copy.title;
}

export function buildAdvice(shots: Shot[], playerId: string): AdviceReport {
  const mine = playerShots(shots, playerId);
  const errors = mine.filter((shot) => isError(shot.outcome) && shot.errorReason);
  const groups = new Map<ErrorReason, Shot[]>();
  for (const shot of errors) {
    const reason = shot.errorReason as ErrorReason;
    groups.set(reason, [...(groups.get(reason) ?? []), shot]);
  }
  const ordered = [...groups.entries()].sort((a, b) => b[1].length - a[1].length);
  const items: AdviceItem[] = ordered.map(([reason, list]) => {
    const byType = new Map<ShotType, Shot[]>();
    for (const shot of list) byType.set(shot.type, [...(byType.get(shot.type) ?? []), shot]);
    const top = [...byType.entries()].sort((a, b) => b[1].length - a[1].length)[0];
    const share = top ? top[1].length / list.length : 0;
    const type = top?.[0] ?? "forehand";
    const copy = drillFor(type, reason);
    const example = [...list].sort((a, b) => b.confidence - a.confidence)[0];
    const typeNames = [...byType.entries()]
      .sort((a, b) => b[1].length - a[1].length)
      .slice(0, 2)
      .map(([kind, rows]) => `${rows.length} ${shotLabel[kind].toLowerCase()}`)
      .join(" e ");
    return {
      key: reason,
      title: clusterTitle(type, reason, share),
      explanation: `${copy.explanation} In questa partita: ${list.length} errori${typeNames ? `, soprattutto ${typeNames}` : ""}.`,
      drill: copy.drill,
      success: copy.success,
      count: list.length,
      t: example?.tImpact ?? null,
      shotId: example?.id ?? null,
    };
  });

  const summary = summarize(mine);
  const strengths: StrengthItem[] = summary.byType
    .filter((row) => row.total >= 4 && row.winnerRate != null && row.winnerRate >= 0.25 && (row.errorRate ?? 1) <= 0.25)
    .sort((a, b) => (b.winnerRate ?? 0) - (a.winnerRate ?? 0))
    .slice(0, 3)
    .map((row) => {
      const copy = strengthCopy[row.type] ?? strengthCopy.default;
      const sample = mine.find((shot) => shot.type === row.type && shot.outcome === "winner");
      return {
        key: row.type,
        title: copy.title,
        text: `${copy.text} ${row.winners} vincenti su ${row.total} ${shotLabel[row.type].toLowerCase()}.`,
        t: sample?.tImpact ?? null,
        shotId: sample?.id ?? null,
      };
    });

  return {
    primary: items[0] ?? null,
    secondary: items.slice(1, 4),
    strengths,
  };
}

export type PriorityStatus = "in_corso" | "migliorato" | "peggiorato" | "non_osservato";

export interface PriorityHistoryItem {
  matchId: string;
  date: string;
  title: string;
  status: PriorityStatus;
  detail: string;
}

export function priorityHistory(matches: Match[], shots: Shot[], playerId: string): PriorityHistoryItem[] {
  const ordered = matchesForPlayer(matches, shots, playerId);
  return ordered.map((match, index) => {
    const advice = buildAdvice(playerShots(shots, playerId, match.id), playerId);
    if (!advice.primary) {
      return {
        matchId: match.id,
        date: match.date,
        title: "Nessuna priorità",
        status: "non_osservato" as const,
        detail: "Non ci sono abbastanza errori classificati.",
      };
    }
    const next = ordered[index + 1];
    if (!next) {
      return {
        matchId: match.id,
        date: match.date,
        title: advice.primary.title,
        status: "in_corso" as const,
        detail: "È la priorità dell'ultima partita.",
      };
    }
    const nextErrors = playerShots(shots, playerId, next.id).filter(
      (shot) => isError(shot.outcome) && shot.errorReason === advice.primary?.key,
    );
    const nextShots = playerShots(shots, playerId, next.id).filter((shot) => shot.type !== "unclassified");
    if (nextShots.length < 8) {
      return {
        matchId: match.id,
        date: match.date,
        title: advice.primary.title,
        status: "non_osservato" as const,
        detail: "Nella partita successiva non è osservato chiaramente.",
      };
    }
    const currentRate = advice.primary.count / Math.max(1, playerShots(shots, playerId, match.id).length);
    const nextRate = nextErrors.length / nextShots.length;
    const diff = nextRate - currentRate;
    const status: PriorityStatus = Math.abs(diff) < 0.02 ? "in_corso" : diff < 0 ? "migliorato" : "peggiorato";
    return {
      matchId: match.id,
      date: match.date,
      title: advice.primary.title,
      status,
      detail:
        status === "migliorato"
          ? "Nella partita dopo questo errore pesa meno."
          : status === "peggiorato"
            ? "Nella partita dopo questo errore pesa di più."
            : "Nella partita dopo il livello è simile.",
    };
  });
}
