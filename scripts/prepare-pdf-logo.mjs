/**
 * Optimized logo for PDF HTML (smaller bundle, faster print).
 * Run: node scripts/prepare-pdf-logo.mjs
 */
import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import sharp from 'sharp';

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const root = path.join(__dirname, '..');
const src = path.join(root, 'assets/images/logo-riwaq.png');
const out = path.join(root, 'assets/images/logo-riwaq-pdf.png');

const buf = await sharp(src)
  .flatten({ background: { r: 255, g: 255, b: 255 } })
  .resize(360, null, { fit: 'inside', background: { r: 255, g: 255, b: 255 } })
  .png({ compressionLevel: 9, quality: 90 })
  .toBuffer();

await fs.promises.writeFile(out, buf);
console.log(`Wrote ${out} (${buf.length} bytes)`);
