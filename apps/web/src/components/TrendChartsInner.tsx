"use client";

import { Bar, BarChart, CartesianGrid, Line, LineChart, ResponsiveContainer, Tooltip, XAxis, YAxis } from "recharts";
import type { ChartRow } from "./TrendCharts";

export default function TrendChartsInner({ rows }: { rows: ChartRow[] }) {
  return (
    <div className="space-y-3">
      <div className="h-52 rounded-3xl bg-pine p-2">
        <ResponsiveContainer width="100%" height="100%">
          <BarChart data={rows}>
            <CartesianGrid stroke="rgba(244,239,228,0.08)" vertical={false} />
            <XAxis dataKey="label" tick={{ fill: "#a8b6ad", fontSize: 11 }} />
            <YAxis allowDecimals={false} tick={{ fill: "#a8b6ad", fontSize: 11 }} width={28} />
            <Tooltip contentStyle={{ background: "#10241c", border: "1px solid rgba(255,255,255,0.1)", borderRadius: 12 }} />
            <Bar dataKey="free" name="Gratuiti" fill="#ff7a45" radius={4} />
            <Bar dataKey="errors" name="Errori" fill="#ff5d6c" radius={4} />
            <Bar dataKey="winners" name="Vincenti" fill="#d6ff3f" radius={4} />
          </BarChart>
        </ResponsiveContainer>
      </div>
      <div className="h-40 rounded-3xl bg-pine p-2">
        <p className="px-2 text-[11px] uppercase tracking-wide text-mute">Game regalati</p>
        <ResponsiveContainer width="100%" height="82%">
          <LineChart data={rows}>
            <CartesianGrid stroke="rgba(244,239,228,0.08)" vertical={false} />
            <XAxis dataKey="label" tick={{ fill: "#a8b6ad", fontSize: 11 }} />
            <YAxis allowDecimals={false} tick={{ fill: "#a8b6ad", fontSize: 11 }} width={28} />
            <Tooltip contentStyle={{ background: "#10241c", border: "1px solid rgba(255,255,255,0.1)", borderRadius: 12 }} />
            <Line type="monotone" dataKey="games" name="Game" stroke="#f4efe4" strokeWidth={2} dot={{ r: 4 }} />
          </LineChart>
        </ResponsiveContainer>
      </div>
    </div>
  );
}
