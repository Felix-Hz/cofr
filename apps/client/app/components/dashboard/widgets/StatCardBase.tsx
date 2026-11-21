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
  // State is told by the figure's sign and the footnote's words, never by tinting the label
  const iconTone = tone === "accent" ? "text-accent" : "text-content-tertiary";

  return (
    <div className="flex h-full min-h-0 flex-col justify-between overflow-hidden px-4 py-3.5">
      <div className="label flex items-center gap-2 leading-none">
        <span className={cn("inline-flex h-4 w-4 items-center justify-center", iconTone)}>
          {icon}
        </span>
        {label}
      </div>
      <div className="mt-2.5 flex min-w-0 items-end justify-between gap-2">
        <div className="min-w-0 truncate text-[clamp(1.7rem,2.1vw,2.15rem)] font-semibold leading-none tracking-[-0.01em] tabular-nums text-content-primary">
          {value}
        </div>
        {trailing}
      </div>
      {footnote && (
        <p className="mt-1.5 truncate text-[12px] leading-tight text-content-tertiary">
          {footnote}
        </p>
      )}
    </div>
  );
}
