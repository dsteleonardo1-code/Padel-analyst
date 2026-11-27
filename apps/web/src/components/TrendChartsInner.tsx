"use client";

import { Bar, BarChart, CartesianGrid, Line, LineChart, ResponsiveContainer, Tooltip, XAxis, YAxis } from "recharts";
import type { ChartRow } from "./TrendCharts";

export default function TrendChartsInner({ rows }: { rows: ChartRow[] }) {
  const data = rows.map((row) => ({
    ...row,
    winnerPct: row.winnerPct == null ? null : Math.round(row.winnerPct * 100),
  }));
  return (
    <div className="space-y-4">
      <div className="h-52 rounded-3xl bg-pine p-2">
        <p className="px-2 pt-1 text-xs uppercase tracking-wide text-mute">Errori per partita</p>
        <ResponsiveContainer width="100%" height="86%">
          <BarChart data={data}>
            <CartesianGrid stroke="rgba(244,239,228,0.08)" vertical={false} />
            <XAxis dataKey="label" tick={{ fill: "#a8b6ad", fontSize: 11 }} />
            <YAxis allowDecimals={false} tick={{ fill: "#a8b6ad", fontSize: 11 }} width={28} />
            <Tooltip contentStyle={{ background: "#10241c", border: "1px solid rgba(255,255,255,0.1)", borderRadius: 12 }} />
            <Bar dataKey="errors" name="Errori" fill="#ff5d6c" radius={6} />
          </BarChart>
        </ResponsiveContainer>
      </div>
      <div className="h-52 rounded-3xl bg-pine p-2">
        <p className="px-2 pt-1 text-xs uppercase tracking-wide text-mute">% vincenti</p>
        <ResponsiveContainer width="100%" height="86%">
          <LineChart data={data}>
            <CartesianGrid stroke="rgba(244,239,228,0.08)" vertical={false} />
            <XAxis dataKey="label" tick={{ fill: "#a8b6ad", fontSize: 11 }} />
            <YAxis tick={{ fill: "#a8b6ad", fontSize: 11 }} width={28} unit="%" />
            <Tooltip contentStyle={{ background: "#10241c", border: "1px solid rgba(255,255,255,0.1)", borderRadius: 12 }} />
            <Line type="monotone" dataKey="winnerPct" name="Vincenti %" stroke="#d6ff3f" strokeWidth={2} dot={{ r: 4 }} connectNulls={false} />
          </LineChart>
        </ResponsiveContainer>
      </div>
    </div>
  );
}
