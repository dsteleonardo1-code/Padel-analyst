import type { ButtonHTMLAttributes, ReactNode, SelectHTMLAttributes } from "react";
import { cx } from "@/lib/format";
import { it } from "@/lib/i18n";
import type { AnalysisSource } from "@/lib/types";

export function Button({
  variant = "primary",
  className,
  ...props
}: ButtonHTMLAttributes<HTMLButtonElement> & { variant?: "primary" | "sand" | "ghost" | "danger" }) {
  const styles = {
    primary: "bg-lime text-ink hover:brightness-105",
    sand: "bg-sand text-ink",
    ghost: "border border-white/15 bg-white/5 text-sand",
    danger: "bg-coral text-white",
  }[variant];
  return (
    <button
      className={cx(
        "inline-flex min-h-11 items-center justify-center gap-2 rounded-full px-4 py-2 text-sm font-semibold transition disabled:opacity-40",
        styles,
        className,
      )}
      {...props}
    />
  );
}

export function TextField({
  label,
  value,
  onChange,
  type = "text",
  placeholder,
}: {
  label: string;
  value: string;
  onChange: (value: string) => void;
  type?: string;
  placeholder?: string;
}) {
  return (
    <label className="block">
      <span className="mb-1.5 block text-sm text-mute">{label}</span>
      <input
        type={type}
        value={value}
        placeholder={placeholder}
        onChange={(event) => onChange(event.target.value)}
        className="min-h-11 w-full rounded-2xl border border-white/10 bg-ink/60 px-3 text-sand outline-none"
      />
    </label>
  );
}

export function SelectField({
  label,
  value,
  onChange,
  children,
}: {
  label: string;
  value: string;
  onChange: (value: string) => void;
  children: ReactNode;
}) {
  return (
    <label className="block">
      <span className="mb-1.5 block text-sm text-mute">{label}</span>
      <select
        value={value}
        onChange={(event) => onChange(event.target.value)}
        className="min-h-11 w-full rounded-2xl border border-white/10 bg-ink/60 px-3 text-sand outline-none"
      >
        {children}
      </select>
    </label>
  );
}

export function Select(props: SelectHTMLAttributes<HTMLSelectElement>) {
  return (
    <select
      {...props}
      className={cx(
        "min-h-11 w-full rounded-2xl border border-white/10 bg-ink/60 px-3 text-sand outline-none",
        props.className,
      )}
    />
  );
}

export function ExampleMark({ className }: { className?: string }) {
  return (
    <span className={cx("rounded-full border border-lime/50 bg-lime/15 px-2 py-0.5 text-[11px] font-bold tracking-wide text-lime", className)}>
      {it.example}
    </span>
  );
}

export function SourceMark({ source, example }: { source: AnalysisSource; example: boolean }) {
  if (example) return <ExampleMark />;
  if (source === "browser_heuristic") {
    return <span className="rounded-full border border-clay/50 bg-clay/15 px-2 py-0.5 text-[11px] font-bold text-clay">{it.estimate}</span>;
  }
  return <span className="rounded-full border border-tide/50 bg-tide/15 px-2 py-0.5 text-[11px] font-bold text-tide">{it.local}</span>;
}

export function Card({ children, className }: { children: ReactNode; className?: string }) {
  return <section className={cx("rounded-3xl border border-white/10 bg-card/90 p-4 shadow-card print-surface", className)}>{children}</section>;
}

export function Banner({ tone = "lime", children }: { tone?: "lime" | "clay" | "sand"; children: ReactNode }) {
  const styles = {
    lime: "border-lime/30 bg-lime/10 text-sand",
    clay: "border-clay/40 bg-clay/10 text-sand",
    sand: "border-white/15 bg-white/5 text-sand",
  }[tone];
  return <p className={cx("rounded-2xl border px-3 py-2 text-sm leading-relaxed", styles)}>{children}</p>;
}
