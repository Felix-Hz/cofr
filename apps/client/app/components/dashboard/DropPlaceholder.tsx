import { widgetGridStyle } from "~/lib/dashboard/grid";
import type { DashboardWidget } from "~/lib/schemas";

export function DropPlaceholder({ widget }: { widget: DashboardWidget }) {
  return <div className="drop-placeholder" style={widgetGridStyle(widget)} />;
}
