import type { ReactNode } from "react";
import { cn } from "~/lib/utils";

export function StatCardBase({
  label,
  value,
  trailing,
  icon,
  tone = "neutral",
  footnote,
}: {
  label: string;
  value: ReactNode;
  trailing?: ReactNode;
  icon: ReactNode;
  tone?: "neutral" | "positive" | "negative" | "accent";
  footnote?: ReactNode;
}) {
  const toneStyles = {
    neutral: "text-content-tertiary",
    positive: "text-positive-text-strong/80",
    negative: "text-negative-text/80",
    accent: "text-accent-soft-text/80",
  }[tone];

  return (
    <div className="flex h-full min-h-0 flex-col justify-between overflow-hidden px-4 py-3.5">
      <div
        className={cn(
          "flex items-center gap-2 text-[11px] font-medium uppercase tracking-[0.16em] leading-none",
          toneStyles,
        )}
      >
        <span className="inline-flex h-4 w-4 items-center justify-center">{icon}</span>
        {label}
      </div>
      <div className="mt-2.5 flex min-w-0 items-end justify-between gap-2">
        <div className="min-w-0 truncate text-[clamp(1.7rem,2.1vw,2.15rem)] font-bold leading-none tabular-nums text-content-primary">
          {value}
        </div>
        {trailing}
      </div>
      {footnote && (
        <p className="mt-1.5 truncate text-[10px] leading-none text-content-tertiary">{footnote}</p>
      )}
    </div>
  );
}
