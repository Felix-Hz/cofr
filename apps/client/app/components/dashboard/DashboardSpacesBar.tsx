import type { KeyboardEvent } from "react";
import type { DashboardSpace } from "~/lib/schemas";
import { cn } from "~/lib/utils";

const SPACE_NAME_MAX_LENGTH = 32;

export function DashboardSpacesBar({
  spaces,
  activeSpaceId,
  isEditMode,
  onSelectSpace,
  onPrevSpace,
  onNextSpace,
  onRenameActiveSpace,
  onAddSpace,
  onSetDefaultSpace,
  onRequestDeleteActiveSpace,
}: {
  spaces: DashboardSpace[];
  activeSpaceId: string | null;
  isEditMode: boolean;
  onSelectSpace: (id: string) => void;
  onPrevSpace: () => void;
  onNextSpace: () => void;
  onRenameActiveSpace: (name: string) => void;
  onAddSpace: () => void;
  onSetDefaultSpace: () => void;
  onRequestDeleteActiveSpace: () => void;
}) {
  const activeSpace = spaces.find((space) => space.id === activeSpaceId) ?? spaces[0] ?? null;

  if (!activeSpace) return null;

  const handleSpaceKeyDown = (event: KeyboardEvent<HTMLButtonElement>, isActive: boolean) => {
    if (!isEditMode || !isActive || spaces.length <= 1) return;
    if (event.key !== "Delete" && event.key !== "Backspace") return;
    event.preventDefault();
    onRequestDeleteActiveSpace();
  };

  if (!isEditMode) {
    return (
      <section className="dashboard-ambient relative overflow-hidden rounded-[var(--radius-lg)] border border-edge-default bg-surface-primary px-3 py-2 shadow-[0_20px_60px_-42px_rgba(15,23,42,0.3)]">
        <div className="flex items-center gap-3">
          {spaces.length > 1 && (
            <div className="flex items-center gap-1">
              <button
                type="button"
                onClick={onPrevSpace}
                className="inline-flex h-8 w-8 items-center justify-center rounded-sm border border-edge-default bg-surface-elevated text-content-secondary transition-colors hover:bg-surface-hover hover:text-content-primary"
                aria-label="Previous space"
              >
                <svg className="h-3.5 w-3.5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path
                    strokeLinecap="round"
                    strokeLinejoin="round"
                    strokeWidth={2}
                    d="M15 19l-7-7 7-7"
                  />
                </svg>
              </button>
              <button
                type="button"
                onClick={onNextSpace}
                className="inline-flex h-8 w-8 items-center justify-center rounded-sm border border-edge-default bg-surface-elevated text-content-secondary transition-colors hover:bg-surface-hover hover:text-content-primary"
                aria-label="Next space"
              >
                <svg className="h-3.5 w-3.5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path
                    strokeLinecap="round"
                    strokeLinejoin="round"
                    strokeWidth={2}
                    d="M9 5l7 7-7 7"
                  />
                </svg>
              </button>
            </div>
          )}

          <div className="min-w-0">
            <div className="text-[10px] font-semibold uppercase tracking-[0.22em] text-content-tertiary">
              Space
            </div>
            <div
              className="max-w-[12rem] truncate text-sm font-semibold text-content-heading"
              title={activeSpace.name}
            >
              {activeSpace.name}
            </div>
          </div>
        </div>
      </section>
    );
  }

  return (
    <section className="dashboard-ambient relative overflow-hidden rounded-[var(--radius-lg)] border border-edge-default bg-surface-primary px-4 py-3 shadow-[0_20px_60px_-42px_rgba(15,23,42,0.3)] sm:px-5">
      <div className="flex flex-col gap-3">
        <div className="flex items-center gap-2 overflow-x-auto pb-1">
          {spaces.map((space) => {
            const isActive = space.id === activeSpaceId;
            return (
              <button
                key={space.id}
                type="button"
                onClick={() => onSelectSpace(space.id)}
                onKeyDown={(event) => handleSpaceKeyDown(event, isActive)}
                className={cn(
                  "inline-flex h-9 shrink-0 items-center gap-2 rounded-md border px-3.5 text-sm font-medium transition-[background-color,color,border-color] duration-200",
                  isActive
                    ? "border-accent/25 bg-surface-primary text-content-primary shadow-[inset_0_0_0_1px_color-mix(in_srgb,var(--accent)_12%,transparent)]"
                    : "border-edge-default bg-surface-elevated text-content-secondary hover:bg-surface-hover hover:text-content-primary",
                )}
              >
                <span className="max-w-[11rem] truncate" title={space.name}>
                  {space.name || "Untitled space"}
                </span>
                {space.is_default && (
                  <span
                    className={cn(
                      "rounded-sm px-2 py-0.5 text-[10px] font-semibold uppercase tracking-[0.18em]",
                      isActive
                        ? "bg-accent-soft-bg text-accent-soft-text"
                        : "bg-accent-soft-bg text-accent-soft-text",
                    )}
                  >
                    Default
                  </span>
                )}
              </button>
            );
          })}

          <button
            type="button"
            onClick={onAddSpace}
            className="inline-flex h-9 shrink-0 items-center gap-2 rounded-md border border-dashed border-edge-strong px-3.5 text-sm font-medium text-content-secondary transition-[background-color,color,border-color] duration-200 hover:bg-surface-hover hover:text-content-primary"
          >
            <svg
              className="h-4 w-4"
              fill="none"
              stroke="currentColor"
              strokeWidth={2.25}
              viewBox="0 0 24 24"
            >
              <path strokeLinecap="round" strokeLinejoin="round" d="M12 4v16m8-8H4" />
            </svg>
            Add space
          </button>
        </div>

        <div className="rounded-[var(--radius-md)] border border-edge-default bg-surface-elevated/80 px-4 py-3">
          <div className="flex items-center justify-between gap-3">
            <div className="text-[11px] font-semibold uppercase tracking-[0.22em] text-content-tertiary">
              Space settings
            </div>
            <div className="text-[11px] text-content-tertiary">
              {activeSpace.name.length}/{SPACE_NAME_MAX_LENGTH}
            </div>
          </div>

          <div className="mt-2 grid gap-3 sm:grid-cols-[minmax(0,1fr)_auto] sm:items-center">
            <div className="min-w-0">
              <input
                value={activeSpace.name}
                onChange={(event) => onRenameActiveSpace(event.target.value)}
                maxLength={SPACE_NAME_MAX_LENGTH}
                placeholder="Space name"
                className="h-10 w-full rounded-md border border-edge-default bg-surface-primary px-3 text-sm font-medium text-content-primary outline-none transition-colors focus:border-accent"
              />
            </div>

            <div className="flex flex-wrap items-center gap-2 sm:justify-end">
              <button
                type="button"
                onClick={onSetDefaultSpace}
                disabled={activeSpace.is_default}
                className="inline-flex h-10 items-center rounded-md border border-edge-default bg-surface-primary px-4 text-sm font-medium text-content-primary transition-colors hover:bg-surface-hover disabled:cursor-not-allowed disabled:opacity-50"
              >
                {activeSpace.is_default ? "Default space" : "Make default"}
              </button>
              <button
                type="button"
                onClick={onRequestDeleteActiveSpace}
                disabled={spaces.length <= 1}
                className="inline-flex h-10 items-center rounded-md border border-negative-text/20 bg-negative-bg px-4 text-sm font-medium text-negative-text transition-colors hover:bg-negative-btn/15 disabled:cursor-not-allowed disabled:opacity-50"
              >
                Delete space
              </button>
            </div>
          </div>
        </div>
      </div>
    </section>
  );
}
