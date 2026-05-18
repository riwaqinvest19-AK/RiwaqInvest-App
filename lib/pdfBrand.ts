import { Asset } from 'expo-asset';
import * as FileSystem from 'expo-file-system';
import { Platform } from 'react-native';

export const PDF_HEADER_BLUE = '#004080';
export const PDF_GOLD = '#C5A048';
export const PDF_PAGE_BG = '#F4F6F8';

const PDF_LOGO = require('@/assets/images/logo-riwaq-pdf.png');

let logoDataUriCache: string | null = null;

export function escapePdfHtml(s: string): string {
  return s
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;')
    .replace(/'/g, '&#039;');
}

export function formatPdfMoney(n: number, numberLocale: string, currency: string): string {
  const formatted = Number.isFinite(n) ? Math.round(n).toLocaleString(numberLocale) : '0';
  return `${formatted} ${currency}`;
}

/** Loads app logo as data URI for inline HTML (print / expo-print). */
export async function getPdfLogoDataUri(): Promise<string> {
  if (logoDataUriCache) return logoDataUriCache;

  const asset = Asset.fromModule(PDF_LOGO);
  if (!asset.downloaded) {
    await asset.downloadAsync();
  }
  const uri = asset.localUri ?? asset.uri;

  if (Platform.OS === 'web') {
    const res = await fetch(uri);
    const blob = await res.blob();
    logoDataUriCache = await new Promise<string>((resolve, reject) => {
      const reader = new FileReader();
      reader.onloadend = () => resolve(reader.result as string);
      reader.onerror = () => reject(reader.error ?? new Error('Failed to read logo'));
      reader.readAsDataURL(blob);
    });
    return logoDataUriCache;
  }

  const base64 = await FileSystem.readAsStringAsync(uri, {
    encoding: FileSystem.EncodingType.Base64,
  });
  logoDataUriCache = `data:image/png;base64,${base64}`;
  return logoDataUriCache;
}

export function buildPdfSheetStyles(options: { isRtl: boolean }): string {
  const textAlign = options.isRtl ? 'right' : 'left';
  return `
    * { box-sizing: border-box; }
    body {
      font-family: 'Cairo', 'Segoe UI', Tahoma, sans-serif;
      background: ${PDF_PAGE_BG};
      color: #0f172a;
      margin: 0;
      padding: 28px;
      -webkit-print-color-adjust: exact;
      print-color-adjust: exact;
    }
    .sheet {
      max-width: 720px;
      margin: 0 auto;
      background: #fff;
      border-radius: 16px;
      overflow: hidden;
      box-shadow: 0 4px 24px rgba(15, 23, 42, 0.08);
      border: 1px solid #e2e8f0;
    }
    .banner {
      background: linear-gradient(135deg, ${PDF_HEADER_BLUE} 0%, #003060 100%);
      color: #fff;
      padding: 22px 28px 18px;
      text-align: center;
    }
    .brand-row {
      display: flex;
      flex-direction: column;
      align-items: center;
      gap: 8px;
    }
  .logo-wrap {
      background: #fff;
      border-radius: 14px;
      padding: 10px 16px;
      display: inline-flex;
      align-items: center;
      justify-content: center;
      box-shadow: 0 2px 12px rgba(0, 0, 0, 0.12);
    }
    .brand-logo {
      display: block;
      height: 64px;
      width: auto;
      max-width: 220px;
      object-fit: contain;
    }
    .heading {
      margin: 16px 0 0;
      font-size: 18px;
      font-weight: 700;
      color: #fff;
    }
    .body { padding: 22px 28px 28px; }
    .meta {
      display: flex;
      flex-direction: column;
      gap: 10px;
      margin-bottom: 20px;
      font-size: 14px;
      color: #334155;
    }
    .meta strong { color: ${PDF_HEADER_BLUE}; }
    table {
      width: 100%;
      border-collapse: collapse;
      border-radius: 12px;
      overflow: hidden;
      border: 1px solid #e2e8f0;
    }
    thead th {
      background: ${PDF_HEADER_BLUE};
      color: #fff;
      font-weight: 600;
      font-size: 12px;
      padding: 12px 14px;
      text-align: ${textAlign};
    }
    thead th:last-child,
    thead th:nth-child(2) {
      text-align: end;
      direction: ltr;
    }
    tbody tr:nth-child(even) { background: #f8fafc; }
    tbody td {
      padding: 12px 14px;
      border-bottom: 1px solid #e2e8f0;
      font-size: 13px;
      color: #0f172a;
      vertical-align: top;
    }
    tbody td:first-child {
      font-weight: 600;
      color: ${PDF_HEADER_BLUE};
      width: 38%;
      text-align: ${textAlign};
    }
    tbody td:last-child {
      text-align: ${textAlign};
      line-height: 1.55;
    }
    tbody td.num {
      direction: ltr;
      unicode-bidi: embed;
      text-align: end;
      font-weight: 600;
    }
    tbody td.gold { color: ${PDF_GOLD}; font-weight: 600; }
    tbody tr.desc-row td:last-child { white-space: pre-wrap; }
    .summary {
      margin-top: 20px;
      padding: 16px 18px;
      background: linear-gradient(180deg, #f8fafc 0%, #f1f5f9 100%);
      border-radius: 12px;
      border: 1px solid #e2e8f0;
    }
    .summary-title {
      font-size: 14px;
      font-weight: 700;
      color: ${PDF_HEADER_BLUE};
      margin: 0 0 10px;
    }
    .summary-row {
      display: flex;
      justify-content: space-between;
      align-items: baseline;
      gap: 16px;
      padding: 8px 0;
      font-size: 13px;
      color: #334155;
      border-bottom: 1px solid #e2e8f0;
    }
    .summary-row:last-of-type { border-bottom: none; padding-bottom: 0; }
    .summary-label { flex: 1; min-width: 0; }
    .summary-val {
      font-weight: 600;
      color: #0f172a;
      direction: ltr;
      unicode-bidi: embed;
      text-align: end;
      white-space: nowrap;
    }
    .summary-val.gold { color: ${PDF_GOLD}; }
    .summary-val.emphasis { font-size: 14px; font-weight: 700; color: ${PDF_HEADER_BLUE}; }
    .notice-box {
      margin-top: 16px;
      padding: 14px 16px;
      background: #fffbeb;
      border-radius: 10px;
      border: 1px solid #fde68a;
      font-size: 12px;
      line-height: 1.65;
      color: #78350f;
      text-align: ${textAlign};
    }
    .footer-note {
      margin-top: 20px;
      font-size: 11px;
      color: #94a3b8;
      text-align: center;
    }
  `;
}

export function buildPdfBannerHtml(logoDataUri: string, heading: string, altText: string): string {
  return `
    <div class="banner">
      <div class="brand-row">
        <div class="logo-wrap">
          <img class="brand-logo" src="${logoDataUri}" alt="${escapePdfHtml(altText)}" />
        </div>
      </div>
      <p class="heading">${escapePdfHtml(heading)}</p>
    </div>`;
}
