import { useId } from "react";
import { cn } from "~/lib/utils";

interface TooltipProps {
  content: string;
  position?: "top" | "bottom";
  className?: string;
  children: React.ReactNode;
}

export default function Tooltip({ content, position = "top", className, children }: TooltipProps) {
  const id = useId();

  return (
    <div className={cn("relative group inline-flex", className)}>
      <div aria-describedby={id} className="flex h-full min-w-0 flex-1">
        {children}
      </div>
      <span
        id={id}
        role="tooltip"
        className={`invisible group-hover:visible opacity-0 group-hover:opacity-100 transition-opacity delay-200 absolute left-1/2 -translate-x-1/2 px-2 py-1 text-[10px] font-medium text-content-heading bg-surface-elevated border border-edge-strong rounded whitespace-nowrap z-50 pointer-events-none shadow-lg ${
          position === "top" ? "bottom-full mb-1.5" : "top-full mt-1.5"
        }`}
      >
        {content}
      </span>
    </div>
  );
}
