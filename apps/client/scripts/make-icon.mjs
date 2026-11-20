// Renders every cofr brand asset from one 16x16 pixel grid: a treasure chest with its lid lifted, coins
// floating in the gap and a twinkle above, paper on a cobalt tile (the Cloak design system).
// Run after changing the grid:  node scripts/make-icon.mjs   (or bun)
//
// Raster sizes are whole-number multiples of 16 and scaled nearest-neighbour, so every grid pixel stays a
// crisp square. Uses only node:zlib; no image library.

import { mkdirSync, writeFileSync } from "node:fs";
import { deflateSync } from "node:zlib";

const PUBLIC = new URL("../public/", import.meta.url);

const INK = [0x1d, 0x3e, 0xa8];
const PAPER = [0xfa, 0xfa, 0xf8];
const SPLASH_BG = [0x0b, 0x12, 0x20]; // #0B1220, the app's dark background

// biome-ignore format: one row per line, so the mark reads as a picture
const GRID = [
  "................",
  "...........#....",
  ".........##.##..",
  "...#.......#....",
  "................",
  "...##########...",
  "..############..",
  "................",
  "...##..##..##...",
  "................",
  "..############..",
  "..############..",
  "..#####..#####..",
  "..#####..#####..",
  "..############..",
  "................",
];

if (GRID.length !== 16 || GRID.some((row) => row.length !== 16))
  throw new Error("the grid must be 16x16");

const lit = (x, y) => GRID[y][x] === "#";

// iOS splash sizes: [width, height]. The mark is about 15% of the shorter side, centred.
const SPLASHES = [
  [1320, 2868], // iPhone 16 Pro Max
  [1206, 2622], // iPhone 16 Pro
  [1290, 2796], // iPhone 16 Plus / 15 Plus / 14 Pro Max
  [1179, 2556], // iPhone 16 / 15 / 15 Pro / 14 Pro
  [1284, 2778], // iPhone 14 Plus / 13 Pro Max
  [1170, 2532], // iPhone 14 / 13 / 13 Pro
  [750, 1334], // iPhone SE 3rd gen
  [1080, 2340], // iPhone 12 mini / 13 mini
  [2064, 2752], // iPad Pro 13 inch
  [1668, 2388], // iPad Pro 11 inch
  [1640, 2360], // iPad Air / 10th gen
  [1488, 2266], // iPad mini 6th gen
];

// ── PNG ──

const CRC_TABLE = Array.from({ length: 256 }, (_, n) => {
  let c = n;
  for (let k = 0; k < 8; k++) c = c & 1 ? 0xedb88320 ^ (c >>> 1) : c >>> 1;
  return c >>> 0;
});

function crc32(buf) {
  let c = 0xffffffff;
  for (const b of buf) c = CRC_TABLE[(c ^ b) & 0xff] ^ (c >>> 8);
  return (c ^ 0xffffffff) >>> 0;
}

function chunk(type, data) {
  const len = Buffer.alloc(4);
  len.writeUInt32BE(data.length);
  const body = Buffer.concat([Buffer.from(type, "ascii"), data]);
  const crc = Buffer.alloc(4);
  crc.writeUInt32BE(crc32(body));
  return Buffer.concat([len, body, crc]);
}

/** 8-bit RGB PNG. `pixel(x, y)` returns [r, g, b]. */
function png(width, height, pixel) {
  const raw = Buffer.alloc((width * 3 + 1) * height);
  let o = 0;
  for (let y = 0; y < height; y++) {
    raw[o++] = 0; // filter: none
    for (let x = 0; x < width; x++) {
      const [r, g, b] = pixel(x, y);
      raw[o++] = r;
      raw[o++] = g;
      raw[o++] = b;
    }
  }
  const ihdr = Buffer.alloc(13);
  ihdr.writeUInt32BE(width, 0);
  ihdr.writeUInt32BE(height, 4);
  ihdr[8] = 8; // bit depth
  ihdr[9] = 2; // colour type: RGB
  const signature = Buffer.from([0x89, 0x50, 0x4e, 0x47, 0x0d, 0x0a, 0x1a, 0x0a]);
  return Buffer.concat([
    signature,
    chunk("IHDR", ihdr),
    chunk("IDAT", deflateSync(raw, { level: 9 })),
    chunk("IEND", Buffer.alloc(0)),
  ]);
}

/** The tile at `scale` pixels per grid cell, inset by `pad` cobalt pixels on each side. */
function tile(scale, pad = 0) {
  const size = 16 * scale + pad * 2;
  return png(size, size, (x, y) => {
    const gx = Math.floor((x - pad) / scale);
    const gy = Math.floor((y - pad) / scale);
    return gx >= 0 && gx < 16 && gy >= 0 && gy < 16 && lit(gx, gy) ? PAPER : INK;
  });
}

function splash(width, height) {
  const scale = Math.max(1, Math.floor((Math.min(width, height) * 0.15) / 16));
  const size = 16 * scale;
  const left = Math.round((width - size) / 2);
  const top = Math.round((height - size) / 2);
  return png(width, height, (x, y) => {
    const gx = Math.floor((x - left) / scale);
    const gy = Math.floor((y - top) / scale);
    if (gx < 0 || gx >= 16 || gy < 0 || gy >= 16) return SPLASH_BG;
    return lit(gx, gy) ? PAPER : INK;
  });
}

/** ICO holding PNG images. */
function ico(images) {
  const header = Buffer.alloc(6);
  header.writeUInt16LE(1, 2); // type: icon
  header.writeUInt16LE(images.length, 4);
  let offset = 6 + 16 * images.length;
  const entries = images.map(({ size, data }) => {
    const e = Buffer.alloc(16);
    e[0] = size >= 256 ? 0 : size;
    e[1] = size >= 256 ? 0 : size;
    e.writeUInt16LE(1, 4); // colour planes
    e.writeUInt16LE(32, 6); // bits per pixel
    e.writeUInt32LE(data.length, 8);
    e.writeUInt32LE(offset, 12);
    offset += data.length;
    return e;
  });
  return Buffer.concat([header, ...entries, ...images.map((i) => i.data)]);
}

function svg() {
  let path = "";
  GRID.forEach((row, y) => {
    for (const run of row.matchAll(/#+/g))
      path += `M${run.index} ${y}h${run[0].length}v1h-${run[0].length}z`;
  });
  const hex = (c) => `#${c.map((v) => v.toString(16).padStart(2, "0")).join("")}`;
  return (
    '<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 16 16" shape-rendering="crispEdges">' +
    `<title>cofr</title><rect width="16" height="16" fill="${hex(INK)}"/><path fill="${hex(PAPER)}" d="${path}"/></svg>\n`
  );
}

// ── Write ──

const out = (name, data) => {
  writeFileSync(new URL(name, PUBLIC), data);
  console.log(`  ${name}`);
};

out("icon.svg", svg());
out("favicon.ico", ico([16, 32, 48].map((size) => ({ size, data: tile(size / 16) }))));
out("apple-touch-icon.png", tile(11, 2)); // 180 x 180: 11x plus a 2 px cobalt edge
out("pwa-192x192.png", tile(12));
out("pwa-512x512.png", tile(32));
out("logo.png", tile(12)); // shown at 28 to 48 CSS px; 192 px keeps it sharp on high-density screens

mkdirSync(new URL("splash/", PUBLIC), { recursive: true });
for (const [w, h] of SPLASHES) out(`splash/apple-splash-${w}x${h}.png`, splash(w, h));
