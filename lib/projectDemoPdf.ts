import * as Print from 'expo-print';
import * as Sharing from 'expo-sharing';
import { Platform } from 'react-native';

const HEADER_BLUE = '#004080';
const GOLD = '#C5A048';
const PAGE_BG = '#F4F6F8';

function escapeHtml(s: string): string {
  return s
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;')
    .replace(/'/g, '&#039;');
}

function buildLogoSvg(): string {
  return `
  <svg xmlns="http://www.w3.org/2000/svg" width="112" height="52" viewBox="0 0 112 52" aria-hidden="true">
    <path d="M 12 36 Q 56 6 100 36" fill="none" stroke="${GOLD}" stroke-width="3.5" stroke-linecap="round" />
    <rect x="42" y="38" width="7" height="22" fill="${HEADER_BLUE}" rx="1.5" />
    <rect x="52.5" y="38" width="7" height="30" fill="${HEADER_BLUE}" rx="1.5" />
    <rect x="63" y="38" width="7" height="22" fill="${HEADER_BLUE}" rx="1.5" />
  </svg>`;
}

function buildProjectDemoHtml(options: {
  title: string;
  description: string;
  location: string;
  isRtl: boolean;
  htmlLang: string;
  wordmark: string;
  tagline: string;
  sheetTitle: string;
  previewNote: string;
  locationLabel: string;
}): string {
  const dir = options.isRtl ? 'rtl' : 'ltr';
  const align = options.isRtl ? 'right' : 'left';

  return `<!DOCTYPE html>
<html lang="${escapeHtml(options.htmlLang)}" dir="${dir}">
<head>
  <meta charset="utf-8" />
  <title>${escapeHtml(options.sheetTitle)}</title>
  <style>
    @page { margin: 28mm 22mm; }
    body {
      margin: 0;
      font-family: 'Segoe UI', Tahoma, Arial, sans-serif;
      background: ${PAGE_BG};
      color: #1e293b;
      direction: ${dir};
      text-align: ${align};
    }
    .page {
      max-width: 720px;
      margin: 0 auto;
      background: #fff;
      border-radius: 12px;
      overflow: hidden;
      box-shadow: 0 4px 24px rgba(15, 45, 79, 0.08);
    }
    .header {
      background: linear-gradient(135deg, ${HEADER_BLUE} 0%, #0f2d4f 100%);
      color: #fff;
      padding: 28px 32px;
      text-align: center;
    }
    .wordmark { font-size: 28px; font-weight: 700; margin: 8px 0 0; letter-spacing: 0.02em; }
    .tagline { font-size: 13px; opacity: 0.9; margin: 4px 0 0; }
    .body { padding: 32px; }
    .badge {
      display: inline-block;
      background: #E8EEF4;
      color: ${HEADER_BLUE};
      font-size: 11px;
      font-weight: 600;
      padding: 6px 12px;
      border-radius: 20px;
      margin-bottom: 16px;
    }
    h1 { font-size: 22px; color: ${HEADER_BLUE}; margin: 0 0 12px; line-height: 1.35; }
    .meta { font-size: 13px; color: #64748b; margin-bottom: 20px; }
    .desc { font-size: 14px; line-height: 1.7; color: #334155; }
    .note {
      margin-top: 28px;
      padding: 14px 16px;
      background: #FFFBEB;
      border-${options.isRtl ? 'right' : 'left'}: 4px solid ${GOLD};
      font-size: 12px;
      color: #78350f;
      border-radius: 6px;
    }
  </style>
</head>
<body>
  <div class="page">
    <div class="header">
      ${buildLogoSvg()}
      <p class="wordmark">${escapeHtml(options.wordmark)}</p>
      <p class="tagline">${escapeHtml(options.tagline)}</p>
    </div>
    <div class="body">
      <span class="badge">${escapeHtml(options.sheetTitle)}</span>
      <h1>${escapeHtml(options.title)}</h1>
      ${
        options.location
          ? `<p class="meta"><strong>${escapeHtml(options.locationLabel)}:</strong> ${escapeHtml(options.location)}</p>`
          : ''
      }
      <p class="desc">${escapeHtml(options.description)}</p>
      <p class="note">${escapeHtml(options.previewNote)}</p>
    </div>
  </div>
</body>
</html>`;
}

/** Opens a branded demo project PDF (print / share) for presentations. */
export async function shareProjectDemoPdf(options: {
  title: string;
  description: string;
  location: string;
  locale: string;
  labels: {
    sheetTitle: string;
    previewNote: string;
    locationLabel: string;
    wordmark: string;
    tagline: string;
  };
}): Promise<void> {
  const isRtl = options.locale.startsWith('ar');
  const htmlLang = options.locale.startsWith('ar')
    ? 'ar'
    : options.locale.startsWith('fr')
      ? 'fr'
      : 'en';

  const html = buildProjectDemoHtml({
    title: options.title,
    description: options.description,
    location: options.location,
    isRtl,
    htmlLang,
    ...options.labels,
  });

  if (Platform.OS === 'web') {
    if (typeof window === 'undefined') return;
    const w = window.open('', '_blank');
    if (w == null) return;
    w.document.open();
    w.document.write(html);
    w.document.close();
    w.focus();
    requestAnimationFrame(() => {
      setTimeout(() => w.print(), 300);
    });
    return;
  }

  const { uri } = await Print.printToFileAsync({ html });
  const available = await Sharing.isAvailableAsync();
  if (!available) {
    throw new Error('Sharing is not available on this device.');
  }

  await Sharing.shareAsync(uri, {
    mimeType: 'application/pdf',
    dialogTitle: options.labels.sheetTitle,
    UTI: 'com.adobe.pdf',
  });
}
