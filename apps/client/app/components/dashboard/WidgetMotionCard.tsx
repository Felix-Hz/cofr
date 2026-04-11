import { motion } from "motion/react";
import type { ReactNode } from "react";
import { springs } from "~/lib/dashboard/motion-config";
import { cn } from "~/lib/utils";

export function WidgetMotionCard({
  children,
  isEditMode,
  isDragging,
  isHero,
  className,
}: {
  children: ReactNode;
  isEditMode: boolean;
  isDragging: boolean;
  isHero?: boolean;
  className?: string;
}) {
  return (
    <motion.div
      layout
      transition={isDragging ? springs.lift : springs.layout}
      className={cn(
        "widget-surface relative h-full w-full overflow-hidden",
        isHero && "widget-surface--hero",
        isEditMode && "widget-edit-mode",
        isDragging && "widget-dragging",
        className,
      )}
    >
      {children}
    </motion.div>
  );
}
