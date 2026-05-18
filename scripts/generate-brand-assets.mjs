/**
 * Generates Expo app icon, adaptive icon, splash, and favicon from logo-riwaq.png.
 * Logo is scaled ~30% smaller inside a squircle plate with generous padding.
 * Run: node scripts/generate-brand-assets.mjs
 */
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import sharp from 'sharp';

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const root = path.join(__dirname, '..');
const src = path.join(root, 'assets/images/logo-riwaq.png');
const outDir = path.join(root, 'assets/images');

const WHITE = { r: 255, g: 255, b: 255 };

/** Flatten + fit logo on transparent buffer. */
async function logoBuffer(maxSide) {
  return sharp(src)
    .flatten({ background: WHITE })
    .resize(maxSide, maxSide, { fit: 'contain', background: WHITE })
    .flatten({ background: WHITE })
    .removeAlpha()
    .png()
    .toBuffer();
}

/** White squircle plate with centered logo (system-style icon). */
async function squircleAppIcon(canvasSize) {
  const outerPad = Math.round(canvasSize * 0.1);
  const plateSize = canvasSize - outerPad * 2;
  const squircleRx = Math.round(plateSize * 0.24);
  const logoMax = Math.round(plateSize * 0.56);

  const logo = await logoBuffer(logoMax);
  const logoMeta = await sharp(logo).metadata();
  const lw = logoMeta.width ?? logoMax;
  const lh = logoMeta.height ?? logoMax;
  const ox = Math.round((plateSize - lw) / 2);
  const oy = Math.round((plateSize - lh) / 2);

  const plateSvg = `
    <svg width="${plateSize}" height="${plateSize}" xmlns="http://www.w3.org/2000/svg">
      <rect x="0" y="0" width="${plateSize}" height="${plateSize}" rx="${squircleRx}" ry="${squircleRx}" fill="white"/>
    </svg>`;

  const plate = await sharp(Buffer.from(plateSvg))
    .png()
    .composite([{ input: logo, left: ox, top: oy }])
    .toBuffer();

  const canvasSvg = `
    <svg width="${canvasSize}" height="${canvasSize}" xmlns="http://www.w3.org/2000/svg">
      <rect width="${canvasSize}" height="${canvasSize}" fill="white"/>
    </svg>`;

  return sharp(Buffer.from(canvasSvg))
    .composite([{ input: plate, left: outerPad, top: outerPad }])
    .flatten({ background: WHITE })
    .removeAlpha()
    .png()
    .toBuffer();
}

async function main() {
  const prepared = path.join(outDir, '.logo-prepared.png');
  await sharp(src)
    .flatten({ background: WHITE })
    .trim({ threshold: 12 })
    .resize(1024, null, { fit: 'inside', background: WHITE })
    .flatten({ background: WHITE })
    .removeAlpha()
    .png()
    .toFile(prepared);
  await sharp(prepared).toFile(src);

  const iconSize = 1024;
  const iconPng = await squircleAppIcon(iconSize);

  await sharp(iconPng).toFile(path.join(outDir, 'icon.png'));
  await sharp(iconPng).toFile(path.join(outDir, 'adaptive-icon.png'));

  const splashW = 1284;
  const splashLogoW = Math.round(splashW * 0.48);
  const splashLogo = await sharp(src)
    .flatten({ background: WHITE })
    .resize(splashLogoW, null, { fit: 'inside', background: WHITE })
    .flatten({ background: WHITE })
    .removeAlpha()
    .png()
    .toBuffer();

  const splashLogoMeta = await sharp(splashLogo).metadata();
  const splashH = Math.max(splashLogoMeta.height ?? 400, 400);

  await sharp({
    create: {
      width: splashW,
      height: splashH,
      channels: 3,
      background: WHITE,
    },
  })
    .composite([{ input: splashLogo, gravity: 'centre' }])
    .flatten({ background: WHITE })
    .removeAlpha()
    .png()
    .toFile(path.join(outDir, 'splash-icon.png'));

  await sharp(await squircleAppIcon(48)).toFile(path.join(outDir, 'favicon.png'));

  console.log('Brand assets written to assets/images/');
}

main().catch((err) => {
  console.error(err);
  process.exit(1);
});
