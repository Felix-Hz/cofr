import type { ReactNode } from "react";
import { cn } from "~/lib/utils";

/**
 * Shared shell for all single-metric stat widgets. Keeps typography,
 * padding, and iconography consistent so composing them feels coherent.
 */
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
    <div className="flex h-full flex-col justify-between p-5">
      <div
        className={cn(
          "flex items-center gap-2 text-xs font-medium uppercase tracking-wider",
          toneStyles,
        )}
      >
        <span className="inline-flex h-4 w-4 items-center justify-center">{icon}</span>
        {label}
      </div>
      <div className="mt-3 flex items-end justify-between gap-3">
        <div className="text-2xl font-bold tabular-nums text-content-primary">{value}</div>
        {trailing}
      </div>
      {footnote && <p className="mt-2 text-[11px] text-content-tertiary">{footnote}</p>}
    </div>
  );
}
