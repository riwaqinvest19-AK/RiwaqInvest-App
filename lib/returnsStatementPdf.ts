import {
  buildPdfBannerHtml,
  buildPdfSheetStyles,
  escapePdfHtml,
  formatPdfMoney,
  getPdfLogoDataUri,
} from '@/lib/pdfBrand';
import { printOrSharePdfHtml } from '@/lib/pdfPrint';

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
  brandAlt: string;
  footerLine: string;
  summaryTitle: string;
  summaryLabelInvested: string;
  summaryLabelProfit: string;
  summaryLabelCurrent: string;
};

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
  logoDataUri: string;
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
    logoDataUri,
  } = options;

  const dir = isRtl ? 'rtl' : 'ltr';
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
      ? `<tr><td colspan="3" style="padding:16px;text-align:center;color:#64748b;font-size:13px;">${escapePdfHtml(labels.emptyMessage)}</td></tr>`
      : rows
          .map(
            (r) => `
    <tr>
      <td>${escapePdfHtml(r.projectTitle)}</td>
      <td class="num">${escapePdfHtml(formatPdfMoney(r.invested, numberLocale, currency))}</td>
      <td class="num gold">${escapePdfHtml(formatPdfMoney(r.gain, numberLocale, currency))}</td>
    </tr>`,
          )
          .join('');

  return `<!DOCTYPE html>
<html lang="${escapePdfHtml(htmlLang)}" dir="${dir}">
<head>
  <meta charset="utf-8" />
  <meta name="viewport" content="width=device-width, initial-scale=1" />
  <title>${escapePdfHtml(labels.docTitle)}</title>
  <link rel="preconnect" href="https://fonts.googleapis.com" />
  <link rel="preconnect" href="https://fonts.gstatic.com" crossorigin />
  <link href="https://fonts.googleapis.com/css2?family=Cairo:wght@400;600;700&display=swap" rel="stylesheet" />
  <style>${buildPdfSheetStyles({ isRtl })}</style>
</head>
<body>
  <div class="sheet">
    ${buildPdfBannerHtml(logoDataUri, labels.heading, labels.brandAlt)}
    <div class="body">
      <div class="meta">
        <div><strong>${escapePdfHtml(labels.investorLabel)}</strong> — ${escapePdfHtml(investorName)}</div>
        <div><strong>${escapePdfHtml(labels.issuedLabel)}</strong> — ${escapePdfHtml(issuedStr)}</div>
      </div>
      <table>
        <thead>
          <tr>
            <th>${escapePdfHtml(labels.colProject)}</th>
            <th>${escapePdfHtml(labels.colInvested)}</th>
            <th>${escapePdfHtml(labels.colProfit)}</th>
          </tr>
        </thead>
        <tbody>
          ${tableRows}
        </tbody>
      </table>
      <div class="summary">
        <p class="summary-title">${escapePdfHtml(labels.summaryTitle)}</p>
        <div class="summary-row">
          <span class="summary-label">${escapePdfHtml(labels.summaryLabelInvested)}</span>
          <span class="summary-val">${escapePdfHtml(formatPdfMoney(totalInvested, numberLocale, currency))}</span>
        </div>
        <div class="summary-row">
          <span class="summary-label">${escapePdfHtml(labels.summaryLabelProfit)}</span>
          <span class="summary-val gold">${escapePdfHtml(formatPdfMoney(totalGain, numberLocale, currency))}</span>
        </div>
        <div class="summary-row">
          <span class="summary-label">${escapePdfHtml(labels.summaryLabelCurrent)}</span>
          <span class="summary-val emphasis">${escapePdfHtml(formatPdfMoney(totalCurrent, numberLocale, currency))}</span>
        </div>
      </div>
      <p class="footer-note">${escapePdfHtml(labels.footerLine)}</div>
    </div>
  </div>
</body>
</html>`;
}

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

  const logoDataUri = await getPdfLogoDataUri();
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
    logoDataUri,
  });

  await printOrSharePdfHtml(html, options.labels.docTitle);
}
