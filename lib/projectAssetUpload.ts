import * as DocumentPicker from 'expo-document-picker';

import {
  KYC_MAX_BYTES,
  normalizeKycMime,
  readKycAssetAsArrayBuffer,
} from '@/lib/identityVerificationUpload';
import { supabase } from '@/lib/supabase';

export const PROJECT_ASSETS_BUCKET = 'project-assets';

const BUCKET = PROJECT_ASSETS_BUCKET;

/** Object path inside `project-assets` from a public (or signed) object URL, or null if not our bucket. */
export function objectPathFromProjectAssetsPublicUrl(url: string | null | undefined): string | null {
  if (!url?.trim()) return null;
  const u = url.trim();
  const markers = ['/object/public/project-assets/', '/object/sign/project-assets/'] as const;
  for (const m of markers) {
    const i = u.indexOf(m);
    if (i !== -1) {
      const rest = u.slice(i + m.length).split('?')[0];
      try {
        return decodeURIComponent(rest);
      } catch {
        return rest;
      }
    }
  }
  return null;
}

/** Best-effort removal (RLS: only objects under the signed-in admin uid prefix are deletable). */
export async function removeProjectAssetObject(path: string | null | undefined): Promise<void> {
  if (!path?.trim()) return;
  const { error } = await supabase.storage.from(BUCKET).remove([path.trim()]);
  if (error) {
    console.warn('[project-assets] remove failed', path, error.message);
  }
}

function sanitizeFileStem(name: string): string {
  const stem = (name.split('.').slice(0, -1).join('.') || name).trim();
  const safe = stem
    .replace(/[^a-zA-Z0-9_\-]+/g, '_')
    .replace(/_+/g, '_')
    .replace(/^_+|_+$/g, '');
  return safe || 'file';
}

function extForMime(mime: string): string {
  const m = mime.toLowerCase();
  if (m === 'image/jpeg') return '.jpg';
  if (m === 'image/png') return '.png';
  if (m === 'image/webp') return '.webp';
  if (m === 'application/pdf') return '.pdf';
  return '';
}

export type ProjectAssetUploadResult =
  | { ok: true; url: string; path: string }
  | { ok: false; code: 'FILE_TOO_LARGE' | 'INVALID_TYPE' | 'UPLOAD_FAILED'; reason?: string };

async function uploadToProjectBucket(params: {
  userId: string;
  subfolder: string;
  asset: DocumentPicker.DocumentPickerAsset;
  allowedMime: Set<string>;
}): Promise<ProjectAssetUploadResult> {
  const { userId, subfolder, asset, allowedMime } = params;

  const canonical = normalizeKycMime(asset.mimeType, asset.name, asset.uri);
  if (!canonical || !allowedMime.has(canonical)) {
    return { ok: false, code: 'INVALID_TYPE' };
  }

  const ext = extForMime(canonical);
  if (!ext) return { ok: false, code: 'INVALID_TYPE' };

  if (typeof asset.size === 'number' && asset.size > KYC_MAX_BYTES) {
    return { ok: false, code: 'FILE_TOO_LARGE' };
  }

  let buffer: ArrayBuffer;
  try {
    const read = await readKycAssetAsArrayBuffer(asset);
    buffer = read.buffer;
  } catch (e) {
    console.warn('[project-assets] read file failed', e);
    return { ok: false, code: 'UPLOAD_FAILED', reason: 'FILE_READ_FAILED' };
  }

  if (buffer.byteLength > KYC_MAX_BYTES) {
    return { ok: false, code: 'FILE_TOO_LARGE' };
  }

  const stem = sanitizeFileStem(asset.name ?? 'upload');
  const objectPath = `${userId}/${subfolder}/${Date.now()}_${stem}${ext}`;
  const body = new Uint8Array(buffer);

  const { error: uploadError } = await supabase.storage.from(BUCKET).upload(objectPath, body, {
    contentType: canonical,
    upsert: true,
  });

  if (uploadError) {
    console.warn('[project-assets] storage upload', uploadError.message, uploadError);
    return { ok: false, code: 'UPLOAD_FAILED', reason: uploadError.message ?? 'STORAGE_UPLOAD_FAILED' };
  }

  const { data } = supabase.storage.from(BUCKET).getPublicUrl(objectPath);
  const url = data?.publicUrl;
  if (!url) {
    return { ok: false, code: 'UPLOAD_FAILED', reason: 'PUBLIC_URL_FAILED' };
  }

  return { ok: true, url, path: objectPath };
}

const COVER_MIMES = new Set(['image/jpeg', 'image/png', 'image/webp']);
const PDF_MIMES = new Set(['application/pdf']);

export function uploadProjectCoverImage(params: {
  userId: string;
  asset: DocumentPicker.DocumentPickerAsset;
}): Promise<ProjectAssetUploadResult> {
  return uploadToProjectBucket({
    userId: params.userId,
    subfolder: 'covers',
    asset: params.asset,
    allowedMime: COVER_MIMES,
  });
}

export function uploadProjectLegalPdf(params: {
  userId: string;
  asset: DocumentPicker.DocumentPickerAsset;
}): Promise<ProjectAssetUploadResult> {
  return uploadToProjectBucket({
    userId: params.userId,
    subfolder: 'legal',
    asset: params.asset,
    allowedMime: PDF_MIMES,
  });
}
