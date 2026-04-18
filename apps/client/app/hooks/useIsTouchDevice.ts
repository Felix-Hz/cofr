import { useEffect, useState } from "react";

function detectTouchDevice() {
  if (typeof window === "undefined") return false;
  return (
    window.matchMedia("(pointer: coarse)").matches ||
    window.matchMedia("(any-pointer: coarse)").matches ||
    (navigator.maxTouchPoints ?? 0) > 0
  );
}

export function useIsTouchDevice() {
  const [isTouchDevice, setIsTouchDevice] = useState(detectTouchDevice);

  useEffect(() => {
    const coarsePointerQuery = window.matchMedia("(pointer: coarse)");
    const anyCoarsePointerQuery = window.matchMedia("(any-pointer: coarse)");
    const sync = () => setIsTouchDevice(detectTouchDevice());
    sync();
    coarsePointerQuery.addEventListener("change", sync);
    anyCoarsePointerQuery.addEventListener("change", sync);
    return () => {
      coarsePointerQuery.removeEventListener("change", sync);
      anyCoarsePointerQuery.removeEventListener("change", sync);
    };
  }, []);

  return isTouchDevice;
}
