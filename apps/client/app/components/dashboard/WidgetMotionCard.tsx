import { motion } from "motion/react";
import { memo, type ReactNode } from "react";
import { springs } from "~/lib/dashboard/motion-config";
import { cn } from "~/lib/utils";

export const WidgetMotionCard = memo(function WidgetMotionCard({
  children,
  isEditMode,
  isDragging,
  className,
}: {
  children: ReactNode;
  isEditMode: boolean;
  isDragging: boolean;
  className?: string;
}) {
  return (
    <motion.div
      layout
      transition={isDragging ? springs.lift : springs.layout}
      className={cn(
        "widget-surface relative h-full w-full overflow-hidden",
        isEditMode && "widget-edit-mode",
        isDragging && "widget-dragging",
        className,
      )}
    >
      {children}
    </motion.div>
  );
});
