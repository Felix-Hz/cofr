import { useEffect } from "react";

function isEditableTarget(target: EventTarget | null): boolean {
  const element = target as HTMLElement | null;
  return !!element?.closest("input, textarea, select, [contenteditable='true']");
}

export function useModalKeyboardShortcuts({
  isOpen,
  onEscape,
  onEnter,
  disableEscape = false,
  disableEnter = false,
  allowEnterFromEditable = false,
}: {
  isOpen: boolean;
  onEscape?: () => void;
  onEnter?: () => void;
  disableEscape?: boolean;
  disableEnter?: boolean;
  allowEnterFromEditable?: boolean;
}) {
  useEffect(() => {
    if (!isOpen) return;

    const handleKeyDown = (event: KeyboardEvent) => {
      if (event.key === "Escape" && onEscape && !disableEscape) {
        event.preventDefault();
        onEscape();
        return;
      }

      if (event.key === "Enter" && onEnter && !disableEnter) {
        if (!allowEnterFromEditable && isEditableTarget(event.target)) return;
        event.preventDefault();
        onEnter();
      }
    };

    window.addEventListener("keydown", handleKeyDown);
    return () => window.removeEventListener("keydown", handleKeyDown);
  }, [allowEnterFromEditable, disableEnter, disableEscape, isOpen, onEnter, onEscape]);
}
