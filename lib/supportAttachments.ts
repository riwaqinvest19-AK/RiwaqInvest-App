import * as DocumentPicker from 'expo-document-picker';

import { normalizeKycMime, readKycAssetAsArrayBuffer } from '@/lib/identityVerificationUpload';
import { supabase } from '@/lib/supabase';

export const SUPPORT_ATTACHMENT_MAX_BYTES = 5 * 1024 * 1024;

type SupportMime = 'image/jpeg' | 'image/png' | 'application/pdf';

function extForMime(mime: SupportMime): string {
  if (mime === 'image/jpeg') return '.jpg';
  if (mime === 'image/png') return '.png';
  if (mime === 'application/pdf') return '.pdf';
  return '';
}

function sanitizeFileStem(name: string): string {
  const stem = (name.split('.').slice(0, -1).join('.') || name).trim();
  const safe = stem
    .replace(/[^a-zA-Z0-9_\-]+/g, '_')
    .replace(/_+/g, '_')
    .replace(/^_+|_+$/g, '');
  return safe || 'attachment';
}

export type SupportUploadResult =
  | { ok: true; url: string; path: string; contentType: SupportMime }
  | { ok: false; code: 'FILE_TOO_LARGE' | 'INVALID_TYPE' | 'UPLOAD_FAILED'; reason?: string };

export async function uploadSupportAttachment(params: {
  userId: string;
  ticketId: string;
  asset: DocumentPicker.DocumentPickerAsset;
}): Promise<SupportUploadResult> {
  const { userId, ticketId, asset } = params;

  const canonical = normalizeKycMime(asset.mimeType, asset.name, asset.uri);
  if (canonical !== 'image/jpeg' && canonical !== 'image/png' && canonical !== 'application/pdf') {
    return { ok: false, code: 'INVALID_TYPE' };
  }

  if (typeof asset.size === 'number' && asset.size > SUPPORT_ATTACHMENT_MAX_BYTES) {
    return { ok: false, code: 'FILE_TOO_LARGE' };
  }

  let buffer: ArrayBuffer;
  try {
    const read = await readKycAssetAsArrayBuffer(asset);
    buffer = read.buffer;
  } catch (e) {
    console.warn('[support] read attachment failed', e);
    return { ok: false, code: 'UPLOAD_FAILED', reason: 'FILE_READ_FAILED' };
  }

  if (buffer.byteLength > SUPPORT_ATTACHMENT_MAX_BYTES) {
    return { ok: false, code: 'FILE_TOO_LARGE' };
  }

  const ext = extForMime(canonical);
  if (!ext) return { ok: false, code: 'INVALID_TYPE' };

  const nameStem = sanitizeFileStem(asset.name ?? 'attachment');
  const objectPath = `${userId}/${ticketId}/${Date.now()}_${nameStem}${ext}`;

  const body = new Uint8Array(buffer);
  const { error: uploadError } = await supabase.storage.from('support-attachments').upload(objectPath, body, {
    contentType: canonical,
    upsert: true,
  });

  if (uploadError) {
    console.warn('[support] storage upload', uploadError.message, uploadError);
    return { ok: false, code: 'UPLOAD_FAILED', reason: uploadError.message ?? 'STORAGE_UPLOAD_FAILED' };
  }

  const { data } = supabase.storage.from('support-attachments').getPublicUrl(objectPath);
  const url = data?.publicUrl;
  if (!url) {
    return { ok: false, code: 'UPLOAD_FAILED', reason: 'PUBLIC_URL_FAILED' };
  }

  return { ok: true, url, path: objectPath, contentType: canonical };
}
