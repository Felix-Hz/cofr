import type { Transition } from "motion/react";

export const EASE_OUT_EXPO: [number, number, number, number] = [0.16, 1, 0.3, 1];

export const springs = {
  layout: { type: "spring", stiffness: 320, damping: 32, mass: 0.9 } satisfies Transition,
  lift: { type: "spring", stiffness: 500, damping: 38, mass: 0.6 } satisfies Transition,
  drawer: { type: "spring", stiffness: 380, damping: 40, mass: 0.9 } satisfies Transition,
  toolbar: { type: "spring", stiffness: 420, damping: 36, mass: 0.8 } satisfies Transition,
} as const;

export const durations = {
  quick: 0.2,
  medium: 0.32,
} as const;
