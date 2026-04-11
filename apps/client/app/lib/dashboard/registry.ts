import type { ComponentType } from "react";
import type { DashboardWidget, WidgetType } from "../schemas";
import { WIDGET_TYPE_DEFS, type WidgetCategory } from "./widget-defs";

export type WidgetSizeConstraint = {
  minColSpan: number;
  maxColSpan: number;
  minRowSpan: number;
  maxRowSpan: number;
  defaultColSpan: number;
  defaultRowSpan: number;
};

export type WidgetMeta = {
  type: WidgetType;
  title: string;
  description: string;
  category: WidgetCategory;
  icon: string;
  size: WidgetSizeConstraint;
  supportsFilterOverride: boolean;
};

export type WidgetRenderProps = {
  widget: DashboardWidget;
  isEditMode: boolean;
};

export type WidgetDefinition = WidgetMeta & {
  Component: ComponentType<WidgetRenderProps>;
};

const size = (
  col: number,
  row: number,
  opts?: Partial<WidgetSizeConstraint>,
): WidgetSizeConstraint => ({
  minColSpan: opts?.minColSpan ?? Math.max(3, Math.min(col, 6)),
  maxColSpan: opts?.maxColSpan ?? 12,
  minRowSpan: opts?.minRowSpan ?? 1,
  maxRowSpan: opts?.maxRowSpan ?? 6,
  defaultColSpan: col,
  defaultRowSpan: row,
});

export const WIDGET_ORDER: readonly WidgetType[] = WIDGET_TYPE_DEFS.map((def) => def.type);

export const WIDGET_META: Record<WidgetType, WidgetMeta> = Object.fromEntries(
  WIDGET_TYPE_DEFS.map((def) => [
    def.type,
    {
      ...def,
      size: size(def.size.col, def.size.row, def.size),
    },
  ]),
) as Record<WidgetType, WidgetMeta>;

type Registry = Record<WidgetType, WidgetDefinition>;

let registryInternal: Registry | null = null;

export function registerWidgets(
  components: Record<WidgetType, ComponentType<WidgetRenderProps>>,
): Registry {
  const entries = WIDGET_ORDER.map((type) => {
    const meta = WIDGET_META[type];
    const Component = components[type];
    if (!Component) {
      throw new Error(`Widget registry missing component for type "${type}"`);
    }
    return [type, { ...meta, Component }] as const;
  });
  registryInternal = Object.fromEntries(entries) as Registry;
  return registryInternal;
}

export function getRegistry(): Registry {
  if (!registryInternal) {
    throw new Error(
      "Dashboard widget registry not initialised. Call registerWidgets() before use.",
    );
  }
  return registryInternal;
}

export function clampWidgetSize(
  type: WidgetType,
  colSpan: number,
  rowSpan: number,
): { colSpan: number; rowSpan: number } {
  const { size: c } = WIDGET_META[type];
  return {
    colSpan: Math.min(c.maxColSpan, Math.max(c.minColSpan, colSpan)),
    rowSpan: Math.min(c.maxRowSpan, Math.max(c.minRowSpan, rowSpan)),
  };
}
