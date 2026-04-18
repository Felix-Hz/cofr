import {
  DEFAULT_TOUCH_DRAG_DELAY_MS,
  getTouchDragActivationConstraint,
  TOUCH_DRAG_DELAY_MS,
  TOUCH_DRAG_TOLERANCE_PX,
} from "./DashboardGrid";

describe("getTouchDragActivationConstraint", () => {
  it("uses the stricter long-press delay on touch-capable devices", () => {
    expect(getTouchDragActivationConstraint(true)).toEqual({
      delay: TOUCH_DRAG_DELAY_MS,
      tolerance: TOUCH_DRAG_TOLERANCE_PX,
    });
  });

  it("preserves the existing touch delay for non-touch environments", () => {
    expect(getTouchDragActivationConstraint(false)).toEqual({
      delay: DEFAULT_TOUCH_DRAG_DELAY_MS,
      tolerance: TOUCH_DRAG_TOLERANCE_PX,
    });
  });
});
