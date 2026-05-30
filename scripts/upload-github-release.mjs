/**
 * Upload Riwaq Invest APK to GitHub Releases (permanent download link).
 *
 * Usage (GitHub token via env — never commit the token):
 *   $env:GH_TOKEN="ghp_..." ; node scripts/upload-github-release.mjs
 *
 * Or after `gh auth login`:
 *   gh release create v1.0.1 RiwaqInvest_v1.0.1.apk --repo riwaqinvest19-AK/RiwaqInvest-App --title "Riwaq Invest v1.0.1" --notes "Android APK v1.0.1"
 */
import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const root = path.join(__dirname, '..');

const REPO = 'riwaqinvest19-AK/RiwaqInvest-App';
const TAG = 'v1.0.1';
const RELEASE_TITLE = 'Riwaq Invest v1.0.1';
const RELEASE_NOTES =
  'Android APK for Riwaq Invest v1.0.1 — permanent download link for distribution.';
const FILE_NAME = 'RiwaqInvest_v1.0.1.apk';
const LOCAL_APK = path.join(root, FILE_NAME);
const TEMP_APK = path.join(root, '.tmp-upload.apk');
const EXPO_APK_URL = 'https://expo.dev/artifacts/eas/9oe8v1HmKaiEX5TJzD6Fn.apk';

const TOKEN = process.env.GH_TOKEN ?? process.env.GITHUB_TOKEN;

function authHeaders(extra = {}) {
  if (!TOKEN) {
    console.error('Missing GH_TOKEN or GITHUB_TOKEN environment variable.');
    console.error('Create a token at: https://github.com/settings/tokens (scope: repo)');
    process.exit(1);
  }
  return {
    Authorization: `Bearer ${TOKEN}`,
    Accept: 'application/vnd.github+json',
    'X-GitHub-Api-Version': '2022-11-28',
    'User-Agent': 'RiwaqInvest-upload-script',
    ...extra,
  };
}

async function ghFetch(url, options = {}) {
  const res = await fetch(url, options);
  const text = await res.text();
  let json = null;
  try {
    json = text ? JSON.parse(text) : null;
  } catch {
    json = null;
  }
  if (!res.ok) {
    const msg = json?.message ?? text ?? res.statusText;
    throw new Error(`GitHub API ${res.status}: ${msg}`);
  }
  return json;
}

async function resolveApkPath() {
  if (fs.existsSync(LOCAL_APK)) {
    console.log(`Using local APK: ${LOCAL_APK}`);
    return LOCAL_APK;
  }
  if (fs.existsSync(TEMP_APK)) {
    console.log(`Using temp APK: ${TEMP_APK}`);
    return TEMP_APK;
  }

  console.log('Downloading APK from Expo…');
  const res = await fetch(EXPO_APK_URL);
  if (!res.ok) throw new Error(`Download failed: HTTP ${res.status}`);
  const buf = Buffer.from(await res.arrayBuffer());
  await fs.promises.writeFile(TEMP_APK, buf);
  console.log(`Downloaded ${(buf.length / 1024 / 1024).toFixed(1)} MB`);
  return TEMP_APK;
}

async function getOrCreateRelease() {
  const existing = await ghFetch(`https://api.github.com/repos/${REPO}/releases/tags/${TAG}`, {
    headers: authHeaders(),
  }).catch(() => null);

  if (existing?.id) {
    console.log(`Release "${TAG}" already exists (id ${existing.id}).`);
    return existing;
  }

  console.log(`Creating release "${TAG}"…`);
  return ghFetch(`https://api.github.com/repos/${REPO}/releases`, {
    method: 'POST',
    headers: authHeaders({ 'Content-Type': 'application/json' }),
    body: JSON.stringify({
      tag_name: TAG,
      name: RELEASE_TITLE,
      body: RELEASE_NOTES,
      draft: false,
      prerelease: false,
    }),
  });
}

async function uploadAsset(release, apkPath) {
  const existing = release.assets?.find((a) => a.name === FILE_NAME);
  if (existing) {
    console.log(`Deleting previous asset "${FILE_NAME}"…`);
    await ghFetch(`https://api.github.com/repos/${REPO}/releases/assets/${existing.id}`, {
      method: 'DELETE',
      headers: authHeaders(),
    });
  }

  const body = await fs.promises.readFile(apkPath);
  const uploadUrl = release.upload_url.replace('{?name,label}', `?name=${encodeURIComponent(FILE_NAME)}`);

  console.log(`Uploading ${(body.length / 1024 / 1024).toFixed(1)} MB to GitHub Releases…`);
  const asset = await ghFetch(uploadUrl, {
    method: 'POST',
    headers: authHeaders({
      'Content-Type': 'application/vnd.android.package-archive',
      'Content-Length': String(body.length),
    }),
    body,
  });

  return asset.browser_download_url;
}

try {
  const apkPath = await resolveApkPath();
  const release = await getOrCreateRelease();
  const directUrl = await uploadAsset(release, apkPath);

  console.log('\nUpload successful.');
  console.log(`Direct asset link:\n${directUrl}`);
  console.log('\nSet in Netlify → Environment variables:');
  console.log(`EXPO_PUBLIC_ANDROID_APK_URL=${directUrl}`);
} catch (err) {
  console.error('\nUpload failed:', err.message ?? err);
  process.exit(1);
}
