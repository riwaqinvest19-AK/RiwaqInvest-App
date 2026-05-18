import * as Print from 'expo-print';
import * as Sharing from 'expo-sharing';
import { Platform } from 'react-native';

const HEADER_BLUE = '#004080';
const GOLD = '#C5A048';
const PAGE_BG = '#F4F6F8';

export type ReturnsStatementRow = {
  projectTitle: string;
  invested: number;
  gain: number;
};

export type ReturnsStatementLabels = {
  /** Share sheet / print job title */
  docTitle: string;
  heading: string;
  investorLabel: string;
  issuedLabel: string;
  colProject: string;
  colInvested: string;
  colProfit: string;
  emptyMessage: string;
  wordmark: string;
  tagline: string;
  summaryTitle: string;
  summaryLabelInvested: string;
  summaryLabelProfit: string;
  summaryLabelCurrent: string;
};

function escapeHtml(s: string): string {
  return s
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;')
    .replace(/'/g, '&#039;');
}

function formatMoney(n: number, numberLocale: string, currency: string): string {
  const formatted = Number.isFinite(n) ? Math.round(n).toLocaleString(numberLocale) : '0';
  return `${formatted} ${currency}`;
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

function buildReturnsStatementHtml(options: {
  rows: ReturnsStatementRow[];
  investorName: string;
  issuedAt: Date;
  isRtl: boolean;
  htmlLang: string;
  numberLocale: string;
  dateLocale: string;
  currency: string;
  labels: ReturnsStatementLabels;
}): string {
  const {
    rows,
    investorName,
    issuedAt,
    isRtl,
    htmlLang,
    numberLocale,
    dateLocale,
    currency,
    labels,
  } = options;

  const dir = isRtl ? 'rtl' : 'ltr';
  const textAlign = isRtl ? 'right' : 'left';
  const issuedStr = issuedAt.toLocaleString(dateLocale, {
    dateStyle: 'long',
    timeStyle: 'short',
  });

  const totalInvested = rows.reduce(
    (s, r) => s + (Number.isFinite(r.invested) ? r.invested : 0),
    0,
  );
  const totalGain = rows.reduce((s, r) => s + (Number.isFinite(r.gain) ? r.gain : 0), 0);
  const totalCurrent = totalInvested + totalGain;

  const tableRows =
    rows.length === 0
      ? `<tr><td colspan="3" style="padding:16px;text-align:center;color:#64748b;font-size:13px;">${escapeHtml(labels.emptyMessage)}</td></tr>`
      : rows
          .map(
            (r) => `
    <tr>
      <td style="padding:12px 14px;border-bottom:1px solid #e2e8f0;font-size:13px;color:#0f172a;${textAlign === 'right' ? 'text-align:right' : 'text-align:left'}">${escapeHtml(r.projectTitle)}</td>
      <td style="padding:12px 14px;border-bottom:1px solid #e2e8f0;font-size:13px;color:#0f172a;direction:ltr;unicode-bidi:embed;text-align:end">${escapeHtml(formatMoney(r.invested, numberLocale, currency))}</td>
      <td style="padding:12px 14px;border-bottom:1px solid #e2e8f0;font-size:13px;font-weight:600;color:${GOLD};direction:ltr;unicode-bidi:embed;text-align:end">${escapeHtml(formatMoney(r.gain, numberLocale, currency))}</td>
    </tr>`,
          )
          .join('');

  return `<!DOCTYPE html>
<html lang="${escapeHtml(htmlLang)}" dir="${dir}">
<head>
  <meta charset="utf-8" />
  <meta name="viewport" content="width=device-width, initial-scale=1" />
  <title>${escapeHtml(labels.docTitle)}</title>
  <link rel="preconnect" href="https://fonts.googleapis.com" />
  <link rel="preconnect" href="https://fonts.gstatic.com" crossorigin />
  <link href="https://fonts.googleapis.com/css2?family=Cairo:wght@400;600;700&display=swap" rel="stylesheet" />
  <style>
    * { box-sizing: border-box; }
    body {
      font-family: 'Cairo', 'Segoe UI', Tahoma, sans-serif;
      background: ${PAGE_BG};
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
      background: linear-gradient(135deg, ${HEADER_BLUE} 0%, #003060 100%);
      color: #fff;
      padding: 24px 28px 20px;
      text-align: center;
    }
    .brand-row {
      display: flex;
      flex-direction: column;
      align-items: center;
      gap: 4px;
    }
    .wordmark {
      font-size: 26px;
      font-weight: 700;
      letter-spacing: 0.02em;
      margin: 0;
      color: #fff;
    }
    .tagline {
      font-size: 11px;
      font-weight: 700;
      letter-spacing: 0.35em;
      margin: 0;
      color: ${GOLD};
    }
    .heading {
      margin: 20px 0 0;
      font-size: 18px;
      font-weight: 700;
      color: #fff;
      opacity: 0.95;
    }
    .body {
      padding: 22px 28px 28px;
    }
    .meta {
      display: flex;
      flex-direction: column;
      gap: 10px;
      margin-bottom: 20px;
      font-size: 14px;
      color: #334155;
    }
    .meta strong { color: ${HEADER_BLUE}; }
    table {
      width: 100%;
      border-collapse: collapse;
      border-radius: 12px;
      overflow: hidden;
      border: 1px solid #e2e8f0;
    }
    thead th {
      background: ${HEADER_BLUE};
      color: #fff;
      font-weight: 600;
      font-size: 12px;
      padding: 12px 14px;
      text-align: ${textAlign};
    }
    thead th:nth-child(2),
    thead th:nth-child(3) {
      text-align: end;
      direction: ltr;
    }
    tbody tr:nth-child(even) { background: #f8fafc; }
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
      color: ${HEADER_BLUE};
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
    .summary-val.gold { color: ${GOLD}; }
    .summary-val.emphasis { font-size: 14px; font-weight: 700; color: ${HEADER_BLUE}; }
    .footer-note {
      margin-top: 20px;
      font-size: 11px;
      color: #94a3b8;
      text-align: center;
    }
  </style>
</head>
<body>
  <div class="sheet">
    <div class="banner">
      <div class="brand-row">
        ${buildLogoSvg()}
        <p class="wordmark">${escapeHtml(labels.wordmark)}</p>
        <p class="tagline">${escapeHtml(labels.tagline)}</p>
      </div>
      <p class="heading">${escapeHtml(labels.heading)}</p>
    </div>
    <div class="body">
      <div class="meta">
        <div><strong>${escapeHtml(labels.investorLabel)}</strong> — ${escapeHtml(investorName)}</div>
        <div><strong>${escapeHtml(labels.issuedLabel)}</strong> — ${escapeHtml(issuedStr)}</div>
      </div>
      <table>
        <thead>
          <tr>
            <th>${escapeHtml(labels.colProject)}</th>
            <th>${escapeHtml(labels.colInvested)}</th>
            <th>${escapeHtml(labels.colProfit)}</th>
          </tr>
        </thead>
        <tbody>
          ${tableRows}
        </tbody>
      </table>
      <div class="summary">
        <p class="summary-title">${escapeHtml(labels.summaryTitle)}</p>
        <div class="summary-row">
          <span class="summary-label">${escapeHtml(labels.summaryLabelInvested)}</span>
          <span class="summary-val">${escapeHtml(formatMoney(totalInvested, numberLocale, currency))}</span>
        </div>
        <div class="summary-row">
          <span class="summary-label">${escapeHtml(labels.summaryLabelProfit)}</span>
          <span class="summary-val gold">${escapeHtml(formatMoney(totalGain, numberLocale, currency))}</span>
        </div>
        <div class="summary-row">
          <span class="summary-label">${escapeHtml(labels.summaryLabelCurrent)}</span>
          <span class="summary-val emphasis">${escapeHtml(formatMoney(totalCurrent, numberLocale, currency))}</span>
        </div>
      </div>
      <p class="footer-note">${escapeHtml(labels.docTitle)} — ${escapeHtml(labels.wordmark)} ${escapeHtml(labels.tagline)}</p>
    </div>
  </div>
</body>
</html>`;
}

/**
 * Builds HTML, renders to PDF with expo-print (iOS/Android), then opens the system share sheet.
 * On web, opens a print dialog (user can save as PDF); sharing a file is not available in browsers.
 */
export async function shareReturnsStatementPdf(options: {
  investorName: string;
  rows: ReturnsStatementRow[];
  locale: string;
  numberLocale: string;
  currency: string;
  labels: ReturnsStatementLabels;
}): Promise<void> {
  const isRtl = options.locale.startsWith('ar');
  const htmlLang = options.locale.startsWith('ar')
    ? 'ar'
    : options.locale.startsWith('fr')
      ? 'fr'
      : 'en';
  const dateLocale =
    options.locale.startsWith('ar') ? 'ar-DZ' : options.locale.startsWith('fr') ? 'fr-DZ' : 'en-US';

  const html = buildReturnsStatementHtml({
    rows: options.rows,
    investorName: options.investorName,
    issuedAt: new Date(),
    isRtl,
    htmlLang,
    numberLocale: options.numberLocale,
    dateLocale,
    currency: options.currency,
    labels: options.labels,
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
      setTimeout(() => {
        w.print();
      }, 300);
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
    dialogTitle: options.labels.docTitle,
    UTI: 'com.adobe.pdf',
  });
}
