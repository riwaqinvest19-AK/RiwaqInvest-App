/**
 * Upload Riwaq Invest APK to Supabase Storage (app-releases bucket).
 *
 * Usage (service role key via env — never commit the key):
 *   $env:SUPABASE_SERVICE_ROLE_KEY="..." ; node scripts/upload-app-release.mjs
 */
import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import { createClient } from '@supabase/supabase-js';
import * as tus from 'tus-js-client';

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const root = path.join(__dirname, '..');

const SUPABASE_URL = process.env.EXPO_PUBLIC_SUPABASE_URL ?? 'https://sytjinxtkjebvmgadkki.supabase.co';
const PROJECT_REF = new URL(SUPABASE_URL).hostname.split('.')[0];
const SERVICE_ROLE_KEY = process.env.SUPABASE_SERVICE_ROLE_KEY;
const BUCKET = 'app-releases';
const FILE_NAME = 'RiwaqInvest_v1.0.1.apk';
const EXPO_APK_URL = 'https://expo.dev/artifacts/eas/9oe8v1HmKaiEX5TJzD6Fn.apk';
const LOCAL_APK = path.join(root, FILE_NAME);
const TEMP_APK = path.join(root, '.tmp-upload.apk');
const CHUNK_SIZE = 6 * 1024 * 1024;

if (!SERVICE_ROLE_KEY) {
  console.error('Missing SUPABASE_SERVICE_ROLE_KEY environment variable.');
  process.exit(1);
}

const supabase = createClient(SUPABASE_URL, SERVICE_ROLE_KEY, {
  auth: { persistSession: false, autoRefreshToken: false },
});

async function ensureBucket() {
  const { data: buckets, error: listError } = await supabase.storage.listBuckets();
  if (listError) throw new Error(`listBuckets: ${listError.message}`);

  if (buckets?.some((b) => b.name === BUCKET || b.id === BUCKET)) {
    console.log(`Bucket "${BUCKET}" already exists.`);
    return;
  }

  const { error: createError } = await supabase.storage.createBucket(BUCKET, {
    public: true,
    allowedMimeTypes: ['application/vnd.android.package-archive', 'application/octet-stream'],
  });
  if (createError) throw new Error(`createBucket: ${createError.message}`);
  console.log(`Created public bucket "${BUCKET}".`);
}

async function resolveApkPath() {
  if (fs.existsSync(LOCAL_APK)) {
    console.log(`Using local APK: ${LOCAL_APK}`);
    return LOCAL_APK;
  }

  console.log('Downloading APK from Expo…');
  const res = await fetch(EXPO_APK_URL);
  if (!res.ok) throw new Error(`Download failed: HTTP ${res.status}`);
  const buf = Buffer.from(await res.arrayBuffer());
  await fs.promises.writeFile(TEMP_APK, buf);
  console.log(`Downloaded ${(buf.length / 1024 / 1024).toFixed(1)} MB`);
  return TEMP_APK;
}

function uploadWithTus(apkPath) {
  return new Promise((resolve, reject) => {
    const file = fs.createReadStream(apkPath);
    const { size } = fs.statSync(apkPath);

    const upload = new tus.Upload(file, {
      endpoint: `https://${PROJECT_REF}.storage.supabase.co/storage/v1/upload/resumable`,
      retryDelays: [0, 3000, 5000, 10000, 20000],
      headers: {
        apikey: SERVICE_ROLE_KEY,
        authorization: `Bearer ${SERVICE_ROLE_KEY}`,
        'x-upsert': 'true',
      },
      uploadDataDuringCreation: true,
      removeFingerprintOnSuccess: true,
      chunkSize: CHUNK_SIZE,
      metadata: {
        bucketName: BUCKET,
        objectName: FILE_NAME,
        contentType: 'application/vnd.android.package-archive',
        cacheControl: '3600',
      },
      uploadSize: size,
      onError: (error) => reject(error),
      onProgress: (bytesUploaded, bytesTotal) => {
        const pct = ((bytesUploaded / bytesTotal) * 100).toFixed(1);
        process.stdout.write(`\rUploading… ${pct}%`);
      },
      onSuccess: () => {
        process.stdout.write('\n');
        resolve();
      },
    });

    upload.findPreviousUploads().then((previous) => {
      if (previous.length) upload.resumeFromPreviousUpload(previous[0]);
      upload.start();
    });
  });
}

async function uploadApk(apkPath) {
  const { size } = fs.statSync(apkPath);
  console.log(`Uploading ${(size / 1024 / 1024).toFixed(1)} MB via TUS…`);

  if (size <= CHUNK_SIZE) {
    const body = await fs.promises.readFile(apkPath);
    const { error } = await supabase.storage.from(BUCKET).upload(FILE_NAME, body, {
      contentType: 'application/vnd.android.package-archive',
      upsert: true,
    });
    if (error) throw new Error(`upload: ${error.message}`);
  } else {
    await uploadWithTus(apkPath);
  }

  const { data } = supabase.storage.from(BUCKET).getPublicUrl(FILE_NAME);
  return data.publicUrl;
}

try {
  await ensureBucket();
  const apkPath = await resolveApkPath();
  const publicUrl = await uploadApk(apkPath);
  console.log('\nUpload successful.');
  console.log(`Public URL: ${publicUrl}`);
} catch (err) {
  const msg = err.message ?? String(err);
  console.error('\nUpload failed:', msg);
  if (msg.includes('maximum allowed size')) {
    console.error(
      '\nThe APK (~110 MB) exceeds Supabase Storage global limit (50 MB on Free plan).\n' +
        'Increase it in Dashboard → Storage → Settings → Global file size limit (Pro: up to 500 GB),\n' +
        'then re-run this script.',
    );
  }
  process.exit(1);
} finally {
  if (fs.existsSync(TEMP_APK)) {
    await fs.promises.unlink(TEMP_APK).catch(() => {});
  }
}
