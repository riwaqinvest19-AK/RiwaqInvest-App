import * as DocumentPicker from 'expo-document-picker';
import * as FileSystem from 'expo-file-system/legacy';
import { Platform } from 'react-native';

import { supabase } from '@/lib/supabase';

export const KYC_MAX_BYTES = 10 * 1024 * 1024;

const ALLOWED_MIME = new Set([
  'image/jpeg',
  'image/png',
  'image/webp',
  'application/pdf',
]);

export type IdentityDocType = 'national_id' | 'drivers_license' | 'passport';

function extensionFromNameOrUri(fileName?: string | null, uri?: string | null): string | undefined {
  const fromName = fileName?.split('.').pop()?.toLowerCase();
  if (fromName && fromName.length <= 6 && /^[a-z0-9]+$/.test(fromName)) {
    return fromName;
  }
  const path = uri?.split(/[?#]/)[0];
  const fromUri = path?.includes('.') ? path.split('.').pop()?.toLowerCase() : undefined;
  return fromUri ?? fromName;
}

/** Normalize picker/OS quirks (missing mime, image/jpg, octet-stream + extension). */
export function normalizeKycMime(
  mime: string | undefined | null,
  fileName?: string | null,
  uriHint?: string | null,
): string | null {
  let m = (mime ?? '').trim().toLowerCase();
  if (m === 'image/jpg' || m === 'image/pjpeg' || m === 'image/x-jpeg') {
    m = 'image/jpeg';
  }

  if (m && ALLOWED_MIME.has(m)) {
    return m;
  }

  const ext = extensionFromNameOrUri(fileName, uriHint);
  if (ext === 'jpg' || ext === 'jpeg') return 'image/jpeg';
  if (ext === 'png') return 'image/png';
  if (ext === 'webp') return 'image/webp';
  if (ext === 'pdf') return 'application/pdf';

  if (!m || m === 'application/octet-stream') {
    return null;
  }

  return ALLOWED_MIME.has(m) ? m : null;
}

export function isAllowedKycMime(mime: string | undefined | null): boolean {
  if (!mime) return false;
  const n = normalizeKycMime(mime, undefined);
  return n !== null;
}

/** Prefer full asset so we can infer type when the OS omits `mimeType`. */
export function isKycAssetAllowed(asset: DocumentPicker.DocumentPickerAsset): boolean {
  return normalizeKycMime(asset.mimeType, asset.name, asset.uri) !== null;
}

function extForMime(mime: string): string {
  const m = mime.toLowerCase();
  if (m === 'image/jpeg') return '.jpg';
  if (m === 'image/png') return '.png';
  if (m === 'image/webp') return '.webp';
  if (m === 'application/pdf') return '.pdf';
  return '';
}

function asArrayBuffer(ab: ArrayBufferLike): ArrayBuffer {
  if (ab instanceof ArrayBuffer) return ab;
  const view = new Uint8Array(ab);
  return view.slice().buffer;
}

function decodeBase64ToUint8Array(base64: string): Uint8Array {
  const atobFn = globalThis.atob;
  if (typeof atobFn !== 'function') {
    throw new Error('atob is not available');
  }
  const binaryString = atobFn(base64);
  const len = binaryString.length;
  const bytes = new Uint8Array(len);
  for (let i = 0; i < len; i++) {
    bytes[i] = binaryString.charCodeAt(i);
  }
  return bytes;
}

async function readNativeUriAsArrayBuffer(uri: string): Promise<ArrayBuffer> {
  let readUri = uri;
  const needsCacheCopy =
    (Platform.OS === 'android' && uri.startsWith('content://')) ||
    (Platform.OS === 'ios' && !uri.startsWith('file://'));
  if (needsCacheCopy && FileSystem.cacheDirectory) {
    const dest = `${FileSystem.cacheDirectory}kyc_${Date.now()}.bin`;
    try {
      await FileSystem.copyAsync({ from: uri, to: dest });
      readUri = dest;
    } catch (e) {
      console.warn('[KYC] copy content uri to cache failed, trying direct read', e);
    }
  }

  const readAsBase64 = async (u: string) => {
    const base64 = await FileSystem.readAsStringAsync(u, {
      encoding: FileSystem.EncodingType.Base64,
    });
    const bytes = decodeBase64ToUint8Array(base64);
    return asArrayBuffer(bytes.buffer.slice(bytes.byteOffset, bytes.byteOffset + bytes.byteLength));
  };

  try {
    const buf = await readAsBase64(readUri);
    if (readUri !== uri) {
      void FileSystem.deleteAsync(readUri, { idempotent: true });
    }
    return buf;
  } catch (e) {
    console.warn('[KYC] readAsString base64 failed, trying fetch', e);
    if (readUri !== uri) {
      void FileSystem.deleteAsync(readUri, { idempotent: true }).catch(() => {});
    }
  }

  if (readUri !== uri) {
    try {
      return await readAsBase64(uri);
    } catch {
      // fall through to fetch(uri)
    }
  }

  const res = await fetch(uri);
  if (!res.ok) {
    throw new Error(`Failed to read file (${res.status})`);
  }
  const buf = await res.arrayBuffer();
  return asArrayBuffer(buf);
}

/** Read picked document as bytes for Supabase Storage upload. */
export async function readKycAssetAsArrayBuffer(
  asset: DocumentPicker.DocumentPickerAsset,
): Promise<{ buffer: ArrayBuffer; contentType: string }> {
  const canonical = normalizeKycMime(asset.mimeType, asset.name, asset.uri);
  const declaredMime =
    canonical ?? ((asset.mimeType ?? '').toLowerCase() || 'application/octet-stream');

  if (Platform.OS === 'web') {
    if (asset.file) {
      const buf = await asset.file.arrayBuffer();
      return { buffer: asArrayBuffer(buf), contentType: asset.file.type || declaredMime };
    }
    if (asset.base64) {
      const bytes = decodeBase64ToUint8Array(asset.base64);
      return {
        buffer: asArrayBuffer(bytes.buffer.slice(bytes.byteOffset, bytes.byteOffset + bytes.byteLength)),
        contentType: declaredMime,
      };
    }
    const res = await fetch(asset.uri);
    const blob = await res.blob();
    const buf = await blob.arrayBuffer();
    return { buffer: asArrayBuffer(buf), contentType: blob.type || declaredMime };
  }

  const buffer = await readNativeUriAsArrayBuffer(asset.uri);
  return { buffer, contentType: canonical ?? declaredMime };
}

export type KycSubmitErrorCode =
  | 'FILE_TOO_LARGE'
  | 'INVALID_TYPE'
  | 'UPLOAD_FAILED'
  | 'PROFILE_UPDATE_FAILED'
  | 'NOT_AUTHENTICATED';

export type KycSubmitResult =
  | { ok: true }
  | { ok: false; code: KycSubmitErrorCode; reason?: string };

export async function uploadIdentityDocument(
  userId: string,
  docType: IdentityDocType,
  asset: DocumentPicker.DocumentPickerAsset,
): Promise<KycSubmitResult> {
  const canonicalMime = normalizeKycMime(asset.mimeType, asset.name, asset.uri);
  if (!canonicalMime) {
    return { ok: false, code: 'INVALID_TYPE' };
  }

  const ext = extForMime(canonicalMime);
  if (!ext) {
    return { ok: false, code: 'INVALID_TYPE' };
  }

  if (typeof asset.size === 'number' && asset.size > KYC_MAX_BYTES) {
    return { ok: false, code: 'FILE_TOO_LARGE' };
  }

  let buffer: ArrayBuffer;
  try {
    const read = await readKycAssetAsArrayBuffer(asset);
    buffer = read.buffer;
  } catch (e) {
    console.warn('[KYC] read file failed', e);
    return { ok: false, code: 'UPLOAD_FAILED', reason: 'FILE_READ_FAILED' };
  }

  if (buffer.byteLength > KYC_MAX_BYTES) {
    return { ok: false, code: 'FILE_TOO_LARGE' };
  }

  const objectPath = `${userId}/${Date.now()}_${docType}${ext}`;
  const body = new Uint8Array(buffer);

  const { error: uploadError } = await supabase.storage
    .from('identity-verifications')
    .upload(objectPath, body, {
      contentType: canonicalMime,
      upsert: true,
    });

  if (uploadError) {
    console.warn('[KYC] storage upload', uploadError.message, uploadError);
    return { ok: false, code: 'UPLOAD_FAILED', reason: uploadError.message ?? 'STORAGE_UPLOAD_FAILED' };
  }

  const { error: profileError } = await supabase
    .from('profiles')
    .update({ verification_status: 'pending', identity_document_path: objectPath })
    .eq('id', userId);

  if (profileError) {
    const msg = (profileError.message ?? '').toLowerCase();
    const maybeMissingPathColumn =
      msg.includes('identity_document_path') ||
      msg.includes('column') && msg.includes('profiles') ||
      msg.includes('schema cache');
    if (maybeMissingPathColumn) {
      const { error: retryError } = await supabase
        .from('profiles')
        .update({ verification_status: 'pending' })
        .eq('id', userId);
      if (retryError) {
        console.warn('[KYC] profile update (retry without path)', retryError.message);
        return {
          ok: false,
          code: 'PROFILE_UPDATE_FAILED',
          reason: retryError.message ?? 'PROFILE_UPDATE_RETRY_FAILED',
        };
      }
    } else {
      console.warn('[KYC] profile verification_status', profileError.message);
      return { ok: false, code: 'PROFILE_UPDATE_FAILED', reason: profileError.message ?? 'PROFILE_UPDATE_FAILED' };
    }
  }

  return { ok: true };
}
