/**
 * Apple splash screen link tags for all supported iOS device sizes.
 * Render inside <head> in root.tsx.
 */
const SPLASH_SCREENS = [
  { w: 440, h: 956, r: 3, px: "1320x2868" },
  { w: 402, h: 874, r: 3, px: "1206x2622" },
  { w: 430, h: 932, r: 3, px: "1290x2796" },
  { w: 393, h: 852, r: 3, px: "1179x2556" },
  { w: 428, h: 926, r: 3, px: "1284x2778" },
  { w: 390, h: 844, r: 3, px: "1170x2532" },
  { w: 375, h: 667, r: 2, px: "750x1334" },
  { w: 360, h: 780, r: 3, px: "1080x2340" },
  { w: 1032, h: 1376, r: 2, px: "2064x2752" },
  { w: 834, h: 1194, r: 2, px: "1668x2388" },
  { w: 820, h: 1180, r: 2, px: "1640x2360" },
  { w: 744, h: 1133, r: 2, px: "1488x2266" },
] as const;

export default function AppleSplashLinks() {
  return (
    <>
      {SPLASH_SCREENS.map(({ w, h, r, px }) => (
        <link
          key={px}
          rel="apple-touch-startup-image"
          href={`/splash/apple-splash-${px}.png`}
          media={`(device-width: ${w}px) and (device-height: ${h}px) and (-webkit-device-pixel-ratio: ${r}) and (orientation: portrait)`}
        />
      ))}
    </>
  );
}
