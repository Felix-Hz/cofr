/**
 * Generate iOS splash screen images for all device sizes.
 * Run: bun scripts/generate-splash.ts
 *
 * Each image is a #0B1220 background with the cofr logo centered.
 */

import { readFileSync } from "node:fs";
import { join } from "node:path";
import sharp from "sharp";

const BG_COLOR = { r: 11, g: 18, b: 32, alpha: 1 }; // #0B1220

// Device matrix: [width, height, deviceWidth, deviceHeight, pixelRatio, label]
const DEVICES: [number, number, number, number, number, string][] = [
  [1320, 2868, 440, 956, 3, "iPhone 16 Pro Max"],
  [1206, 2622, 402, 874, 3, "iPhone 16 Pro"],
  [1290, 2796, 430, 932, 3, "iPhone 16 Plus / 15 Plus / 14 Pro Max"],
  [1179, 2556, 393, 852, 3, "iPhone 16 / 15 / 15 Pro / 14 Pro"],
  [1284, 2778, 428, 926, 3, "iPhone 14 Plus / 13 Pro Max"],
  [1170, 2532, 390, 844, 3, "iPhone 14 / 13 / 13 Pro"],
  [750, 1334, 375, 667, 2, "iPhone SE 3rd gen"],
  [1080, 2340, 360, 780, 3, "iPhone 12 mini / 13 mini"],
  [2064, 2752, 1032, 1376, 2, "iPad Pro 13 inch"],
  [1668, 2388, 834, 1194, 2, "iPad Pro 11 inch"],
  [1640, 2360, 820, 1180, 2, "iPad Air / 10th gen"],
  [1488, 2266, 744, 1133, 2, "iPad mini 6th gen"],
];

const OUTPUT_DIR = join(import.meta.dir, "../public/splash");
const LOGO_PATH = join(import.meta.dir, "../public/logo.png");

async function generateSplash() {
  const logoBuffer = readFileSync(LOGO_PATH);

  // Get logo metadata for sizing
  const logoMeta = await sharp(logoBuffer).metadata();
  if (!logoMeta.width || !logoMeta.height) {
    throw new Error("Could not read logo dimensions");
  }

  for (const [width, height, _dw, _dh, _pr, label] of DEVICES) {
    // Logo size: ~15% of the smaller dimension, capped
    const logoSize = Math.round(Math.min(width, height) * 0.15);

    // Match the CSS dark-mode treatment: invert(1) hue-rotate(180deg) brightness(1.2)
    // negate inverts all channels, then hue:180 restores original hues
    const resizedLogo = await sharp(logoBuffer)
      .resize(logoSize, logoSize, { fit: "inside" })
      .negate({ alpha: false })
      .modulate({ brightness: 1.2, hue: 180 })
      .toBuffer();

    const resizedMeta = await sharp(resizedLogo).metadata();
    const logoW = resizedMeta.width!;
    const logoH = resizedMeta.height!;

    const filename = `apple-splash-${width}x${height}.png`;

    await sharp({
      create: {
        width,
        height,
        channels: 4,
        background: BG_COLOR,
      },
    })
      .composite([
        {
          input: resizedLogo,
          left: Math.round((width - logoW) / 2),
          top: Math.round((height - logoH) / 2),
        },
      ])
      .png()
      .toFile(join(OUTPUT_DIR, filename));

    console.log(`  ${filename} (${label})`);
  }

  console.log(`\nGenerated ${DEVICES.length} splash images in public/splash/`);
}

generateSplash().catch((err) => {
  console.error("Failed to generate splash screens:", err);
  process.exit(1);
});
