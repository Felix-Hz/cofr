import {
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

  it("uses the same long-press threshold when touch input is not active yet", () => {
    expect(getTouchDragActivationConstraint(false)).toEqual({
      delay: TOUCH_DRAG_DELAY_MS,
      tolerance: TOUCH_DRAG_TOLERANCE_PX,
    });
  });
});
