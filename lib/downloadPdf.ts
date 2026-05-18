import * as WebBrowser from 'expo-web-browser';
import { Linking, Platform } from 'react-native';

/** Override via EXPO_PUBLIC_FALLBACK_PROJECT_PDF_URL; default is a small public PDF (W3C sample). */
export const FALLBACK_PUBLIC_PROJECT_PDF_URL =
  (typeof process !== 'undefined' && process.env.EXPO_PUBLIC_FALLBACK_PROJECT_PDF_URL?.trim()) ||
  'https://www.w3.org/WAI/WCAG21/Techniques/pdf/img/table-word.pdf';

export type DownloadAndSharePdfResult = 'opened_in_browser';

export class PdfDownloadError extends Error {
  readonly httpStatus?: number;
  readonly sourceUrl: string;

  constructor(message: string, sourceUrl: string, httpStatus?: number, cause?: unknown) {
    super(message);
    this.name = 'PdfDownloadError';
    this.sourceUrl = sourceUrl;
    this.httpStatus = httpStatus;
    if (cause !== undefined && (this as Error & { cause?: unknown }).cause === undefined) {
      (this as Error & { cause?: unknown }).cause = cause;
    }
  }
}

/**
 * Turns stored DB values into a single absolute http(s) URL.
 * Handles accidental Markdown paste like `[https://a/x](https://a/x)` which otherwise
 * gets interpreted as a same-origin path on web (e.g. localhost:8081/[https://...]).
 */
export function normalizeDocumentUrl(raw: string): string {
  const s = raw.trim();
  if (!s) return '';

  // Markdown link: ...](https://host/path)
  const md = /\]\(\s*(https?:\/\/[^)\s]+)\s*\)/i.exec(s);
  if (md?.[1]) return stripTrailingJunk(md[1]);

  // Starts with http(s) — take first token only
  const leading = s.match(/^(https?:\/\/\S+)/i);
  if (leading?.[1]) return stripTrailingJunk(leading[1]);

  // First http(s) substring anywhere in noisy input
  const anywhere = s.match(/https?:\/\/[^\s\[\]'"`<>]+/i);
  if (anywhere?.[0]) return stripTrailingJunk(anywhere[0]);

  return stripTrailingJunk(s);
}

function stripTrailingJunk(url: string): string {
  return url.replace(/[.,;)\]}>'"`]+$/u, '');
}

function isAbsoluteHttpUrl(url: string): boolean {
  try {
    const u = new URL(url);
    return u.protocol === 'http:' || u.protocol === 'https:';
  } catch {
    return false;
  }
}

/**
 * Opens a remote document URL: in-app browser on native, new tab on web.
 * Does not use expo-router for external document URLs.
 */
export async function downloadAndSharePdf(options: {
  url: string;
  /** Kept for call-site compatibility; unused (no local file). */
  localFileName: string;
  /** Kept for call-site compatibility; unused. */
  shareDialogTitle: string;
}): Promise<DownloadAndSharePdfResult> {
  const cleanUrl = normalizeDocumentUrl(options.url);
  if (!cleanUrl) {
    throw new PdfDownloadError('Empty URL', cleanUrl);
  }
  if (!isAbsoluteHttpUrl(cleanUrl)) {
    throw new PdfDownloadError('URL must be a valid http(s) address', cleanUrl);
  }

  if (Platform.OS === 'web') {
    if (typeof window === 'undefined') {
      throw new PdfDownloadError('Window unavailable', cleanUrl);
    }
    const win = window.open(cleanUrl, '_blank', 'noopener,noreferrer');
    if (win == null) {
      console.error('[RiwaqInvest] document: window.open blocked or failed', { cleanUrl });
      throw new PdfDownloadError('Could not open document. Check popup settings.', cleanUrl);
    }
    return 'opened_in_browser';
  }

  try {
    await WebBrowser.openBrowserAsync(cleanUrl);
  } catch (e) {
    console.error('[RiwaqInvest] WebBrowser.openBrowserAsync failed', {
      cleanUrl,
      error: e,
      message: e instanceof Error ? e.message : String(e),
    });
    // Fallback: system browser (avoids Custom Tabs / SFSafari issues with some storage URLs).
    try {
      await Linking.openURL(cleanUrl);
      return 'opened_in_browser';
    } catch (e2) {
      console.error('[RiwaqInvest] Linking.openURL fallback failed', {
        cleanUrl,
        error: e2,
      });
    }
    throw new PdfDownloadError(
      e instanceof Error ? e.message : String(e),
      cleanUrl,
      undefined,
      e,
    );
  }

  return 'opened_in_browser';
}
