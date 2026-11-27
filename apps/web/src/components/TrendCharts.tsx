"use client";

import dynamic from "next/dynamic";

export interface ChartRow {
  label: string;
  free: number;
  errors: number;
  winners: number;
  games: number;
}

const Inner = dynamic(() => import("./TrendChartsInner"), {
  ssr: false,
  loading: () => <div className="h-52 rounded-3xl bg-pine" />,
});

export function TrendCharts({ rows }: { rows: ChartRow[] }) {
  if (rows.length < 2) return null;
  return <Inner rows={rows} />;
}
