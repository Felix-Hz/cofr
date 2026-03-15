import { useId } from "react";

interface TooltipProps {
  content: string;
  position?: "top" | "bottom";
  children: React.ReactNode;
}

export default function Tooltip({ content, position = "top", children }: TooltipProps) {
  const id = useId();

  return (
    <div className="relative group inline-flex">
      <div aria-describedby={id}>{children}</div>
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
