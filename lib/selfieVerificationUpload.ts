import * as FileSystem from 'expo-file-system/legacy';
import { Platform } from 'react-native';

import { supabase } from '@/lib/supabase';

const BUCKET = 'verification_selfies';
const MAX_BYTES = 5 * 1024 * 1024;

export type SelfieUploadResult =
  | { ok: true; path: string }
  | { ok: false; code: 'READ_FAILED' | 'UPLOAD_FAILED' | 'PROFILE_UPDATE_FAILED'; reason?: string };

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

function ensureArrayBuffer(input: ArrayBufferLike): ArrayBuffer {
  const view = new Uint8Array(input as unknown as ArrayBuffer);
  return view.slice().buffer;
}

async function readUriAsJpegBuffer(uri: string): Promise<ArrayBuffer> {
  if (Platform.OS === 'web') {
    const res = await fetch(uri);
    const buf = await res.arrayBuffer();
    if (buf.byteLength > MAX_BYTES) {
      throw new Error('FILE_TOO_LARGE');
    }
    return ensureArrayBuffer(buf);
  }

  const base64 = await FileSystem.readAsStringAsync(uri, {
    encoding: FileSystem.EncodingType.Base64,
  });
  const bytes = decodeBase64ToUint8Array(base64);
  const buf = bytes.buffer.slice(bytes.byteOffset, bytes.byteOffset + bytes.byteLength);
  if (buf.byteLength > MAX_BYTES) {
    throw new Error('FILE_TOO_LARGE');
  }
  return ensureArrayBuffer(buf);
}

/**
 * Upload a front-camera image from a local file URI into
 * `verification_selfies/{userId}/verification_selfies/selfie.jpg` (upsert).
 * Path must match storage RLS (`…/verification_selfies/%` under the user folder).
 */
export async function uploadVerificationSelfie(userId: string, localImageUri: string): Promise<SelfieUploadResult> {
  const lower = localImageUri.toLowerCase();
  const contentType = lower.includes('.png') ? 'image/png' : 'image/jpeg';
  const objectPath = `${userId}/verification_selfies/selfie.jpg`;

  let buffer: ArrayBuffer;
  try {
    buffer = await readUriAsJpegBuffer(localImageUri);
  } catch (e) {
    console.warn('[selfie] read failed', e);
    return { ok: false, code: 'READ_FAILED', reason: e instanceof Error ? e.message : String(e) };
  }

  const body = new Uint8Array(buffer);
  const { error: uploadError } = await supabase.storage.from(BUCKET).upload(objectPath, body, {
    contentType,
    upsert: true,
  });

  if (uploadError) {
    const msg = uploadError.message ?? '';
    console.warn('[selfie] upload', msg);
    const rlsHint =
      msg.toLowerCase().includes('row-level security') || msg.toLowerCase().includes('not allowed')
        ? 'Storage RLS rejected the upload. Apply latest Supabase migrations (verification_selfies policies).'
        : msg;
    return { ok: false, code: 'UPLOAD_FAILED', reason: rlsHint };
  }

  const { error: profileError } = await supabase
    .from('profiles')
    // @ts-expect-error — column added in migration; Supabase generated types may lag
    .update({ verification_selfie_path: objectPath })
    .eq('id', userId);

  if (profileError) {
    const msg = (profileError.message ?? '').toLowerCase();
    const missingCol =
      msg.includes('verification_selfie_path') ||
      (msg.includes('column') && msg.includes('profiles')) ||
      msg.includes('schema cache');
    if (missingCol) {
      return { ok: true, path: objectPath };
    }
    console.warn('[selfie] profile update', profileError.message);
    return { ok: false, code: 'PROFILE_UPDATE_FAILED', reason: profileError.message };
  }

  return { ok: true, path: objectPath };
}
