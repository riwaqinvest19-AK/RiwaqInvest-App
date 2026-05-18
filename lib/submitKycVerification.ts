import { type DocumentPickerAsset } from 'expo-document-picker';

import {
  type IdentityDocType,
  uploadIdentityDocument,
  type KycSubmitResult,
} from '@/lib/identityVerificationUpload';
import { uploadVerificationSelfie } from '@/lib/selfieVerificationUpload';
import { supabase } from '@/lib/supabase';

export type KycSubmitPayload = {
  userId: string;
  docType: IdentityDocType | null;
  asset: DocumentPickerAsset | null;
  selfieUri: string | null;
};

export type UnifiedKycResult = KycSubmitResult;

async function markVerificationPending(userId: string): Promise<UnifiedKycResult> {
  const { error } = await supabase
    .from('profiles')
    .update({ verification_status: 'pending' })
    .eq('id', userId);

  if (error) {
    return { ok: false, code: 'PROFILE_UPDATE_FAILED', reason: error.message };
  }
  return { ok: true };
}

/**
 * Submit KYC with **either** identity document **or** selfie (or both).
 */
export async function submitKycVerification(payload: KycSubmitPayload): Promise<UnifiedKycResult> {
  const { userId, docType, asset, selfieUri } = payload;
  const hasDoc = Boolean(docType && asset);
  const hasSelfie = Boolean(selfieUri);

  if (!hasDoc && !hasSelfie) {
    return { ok: false, code: 'INVALID_TYPE', reason: 'MISSING_DOC_OR_SELFIE' };
  }

  if (hasDoc && !docType) {
    return { ok: false, code: 'INVALID_TYPE', reason: 'MISSING_DOC_TYPE' };
  }

  if (hasDoc && docType && asset) {
    const docResult = await uploadIdentityDocument(userId, docType, asset);
    if (!docResult.ok) {
      return docResult;
    }
    if (!hasSelfie) {
      return { ok: true };
    }
  }

  if (hasSelfie && selfieUri) {
    const selfieResult = await uploadVerificationSelfie(userId, selfieUri);
    if (!selfieResult.ok) {
      return selfieResult;
    }
    if (!hasDoc) {
      return markVerificationPending(userId);
    }
  }

  return { ok: true };
}

export function canSubmitKyc(
  docType: IdentityDocType | null,
  asset: DocumentPickerAsset | null,
  selfieUri: string | null,
  submitting: boolean,
): boolean {
  if (submitting) return false;
  const hasDoc = Boolean(docType && asset);
  const hasSelfie = Boolean(selfieUri);
  return hasDoc || hasSelfie;
}
