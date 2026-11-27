"use client";

import dynamic from "next/dynamic";

export interface ChartRow {
  label: string;
  errors: number;
  winnerPct: number | null;
}

const Inner = dynamic(() => import("./TrendChartsInner"), {
  ssr: false,
  loading: () => <div className="h-52 rounded-3xl bg-pine" />,
});

export function TrendCharts({ rows }: { rows: ChartRow[] }) {
  if (rows.length < 2) {
    return <p className="text-sm text-mute">Servono almeno due partite per vedere l&apos;andamento.</p>;
  }
  return <Inner rows={rows} />;
}
