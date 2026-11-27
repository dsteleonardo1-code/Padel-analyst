import { outcomeLabel, reasonLabel, shotLabel } from "./i18n";
import type { Player, Shot } from "./types";

export function shotsToCsv(shots: Shot[], players: Player[]): string {
  const names = new Map(players.map((player) => [player.id, player.name]));
  const header = [
    "id",
    "tempo_secondi",
    "giocatore",
    "colpo",
    "esito",
    "motivo_errore",
    "causa",
    "confidenza",
    "corretto_a_mano",
    "esempio",
    "impatto_x",
    "impatto_y",
    "atterraggio_x",
    "atterraggio_y",
  ];
  const lines = shots.map((shot) =>
    [
      shot.id,
      shot.tImpact.toFixed(1),
      names.get(shot.playerId) ?? shot.playerId,
      shotLabel[shot.type],
      outcomeLabel[shot.outcome],
      shot.errorReason ? reasonLabel[shot.errorReason] : "",
      shot.errorCause ?? "",
      shot.confidence.toFixed(2),
      shot.manuallyCorrected ? "sì" : "no",
      shot.example ? "sì" : "no",
      shot.impactX.toFixed(3),
      shot.impactY.toFixed(3),
      shot.landX.toFixed(3),
      shot.landY.toFixed(3),
    ]
      .map((cell) => `"${String(cell).replaceAll('"', '""')}"`)
      .join(","),
  );
  return `\uFEFF${header.join(",")}\n${lines.join("\n")}`;
}

export function downloadText(filename: string, content: string, type = "text/csv;charset=utf-8"): void {
  const blob = new Blob([content], { type });
  const url = URL.createObjectURL(blob);
  const link = document.createElement("a");
  link.href = url;
  link.download = filename;
  link.click();
  URL.revokeObjectURL(url);
}
