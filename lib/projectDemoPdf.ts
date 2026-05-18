import {
  buildPdfBannerHtml,
  buildPdfSheetStyles,
  escapePdfHtml,
  formatPdfMoney,
  getPdfLogoDataUri,
} from '@/lib/pdfBrand';
import { printOrSharePdfHtml } from '@/lib/pdfPrint';

export type ProjectDemoPdfRow = {
  label: string;
  value: string;
  valueClass?: 'gold' | 'num';
  isDescription?: boolean;
};

export type ProjectDemoPdfLabels = {
  docTitle: string;
  heading: string;
  issuedLabel: string;
  colItem: string;
  colValue: string;
  summaryTitle: string;
  previewNote: string;
  brandAlt: string;
  footerLine: string;
};

function buildProjectDemoHtml(options: {
  rows: ProjectDemoPdfRow[];
  issuedAt: Date;
  isRtl: boolean;
  htmlLang: string;
  dateLocale: string;
  labels: ProjectDemoPdfLabels;
  logoDataUri: string;
}): string {
  const { rows, issuedAt, isRtl, htmlLang, dateLocale, labels, logoDataUri } = options;
  const dir = isRtl ? 'rtl' : 'ltr';
  const issuedStr = issuedAt.toLocaleString(dateLocale, {
    dateStyle: 'long',
    timeStyle: 'short',
  });

  const tableRows = rows
    .map((row) => {
      const valueClass = row.valueClass ? ` ${row.valueClass}` : '';
      const rowClass = row.isDescription ? ' class="desc-row"' : '';
      return `
    <tr${rowClass}>
      <td>${escapePdfHtml(row.label)}</td>
      <td${valueClass ? ` class="${valueClass.trim()}"` : ''}>${escapePdfHtml(row.value)}</td>
    </tr>`;
    })
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
        <div><strong>${escapePdfHtml(labels.issuedLabel)}</strong> — ${escapePdfHtml(issuedStr)}</div>
      </div>
      <table>
        <thead>
          <tr>
            <th>${escapePdfHtml(labels.colItem)}</th>
            <th>${escapePdfHtml(labels.colValue)}</th>
          </tr>
        </thead>
        <tbody>
          ${tableRows}
        </tbody>
      </table>
      <div class="summary">
        <p class="summary-title">${escapePdfHtml(labels.summaryTitle)}</p>
        <div class="notice-box">${escapePdfHtml(labels.previewNote)}</div>
      </div>
      <p class="footer-note">${escapePdfHtml(labels.footerLine)}</p>
    </div>
  </div>
</body>
</html>`;
}

export type ProjectDemoPdfInput = {
  title: string;
  location: string;
  description: string;
  expectedReturnPct?: number | null;
  fundingGoal?: number | null;
  minInvestment?: number | null;
  durationMonths?: number | null;
  locale: string;
  numberLocale: string;
  currency: string;
  labels: ProjectDemoPdfLabels & {
    rowProject: string;
    rowLocation: string;
    rowExpectedReturn: string;
    rowFundingGoal: string;
    rowMinInvestment: string;
    rowDuration: string;
    rowDescription: string;
    durationMonthsTemplate: string;
    expectedReturnSuffix: string;
  };
};

function buildDemoRows(input: ProjectDemoPdfInput): ProjectDemoPdfRow[] {
  const { labels, numberLocale, currency } = input;
  const rows: ProjectDemoPdfRow[] = [
    { label: labels.rowProject, value: input.title },
  ];

  if (input.location.trim()) {
    rows.push({ label: labels.rowLocation, value: input.location.trim() });
  }

  if (input.expectedReturnPct != null && Number.isFinite(input.expectedReturnPct)) {
    rows.push({
      label: labels.rowExpectedReturn,
      value: `${input.expectedReturnPct.toLocaleString(numberLocale, { maximumFractionDigits: 2 })}${labels.expectedReturnSuffix}`,
      valueClass: 'gold',
    });
  }

  if (input.fundingGoal != null && Number.isFinite(input.fundingGoal) && input.fundingGoal > 0) {
    rows.push({
      label: labels.rowFundingGoal,
      value: formatPdfMoney(input.fundingGoal, numberLocale, currency),
      valueClass: 'num',
    });
  }

  if (input.minInvestment != null && Number.isFinite(input.minInvestment) && input.minInvestment > 0) {
    rows.push({
      label: labels.rowMinInvestment,
      value: formatPdfMoney(input.minInvestment, numberLocale, currency),
      valueClass: 'num',
    });
  }

  if (input.durationMonths != null && input.durationMonths > 0) {
    rows.push({
      label: labels.rowDuration,
      value: labels.durationMonthsTemplate.replace('{{months}}', String(input.durationMonths)),
    });
  }

  rows.push({
    label: labels.rowDescription,
    value: input.description.trim() || '—',
    isDescription: true,
  });

  return rows;
}

export async function shareProjectDemoPdf(input: ProjectDemoPdfInput): Promise<void> {
  const isRtl = input.locale.startsWith('ar');
  const htmlLang = input.locale.startsWith('ar')
    ? 'ar'
    : input.locale.startsWith('fr')
      ? 'fr'
      : 'en';
  const dateLocale =
    input.locale.startsWith('ar') ? 'ar-DZ' : input.locale.startsWith('fr') ? 'fr-DZ' : 'en-US';

  const logoDataUri = await getPdfLogoDataUri();
  const { docTitle, ...sheetLabels } = input.labels;

  const html = buildProjectDemoHtml({
    rows: buildDemoRows(input),
    issuedAt: new Date(),
    isRtl,
    htmlLang,
    dateLocale,
    labels: {
      docTitle,
      heading: sheetLabels.heading,
      issuedLabel: sheetLabels.issuedLabel,
      colItem: sheetLabels.colItem,
      colValue: sheetLabels.colValue,
      summaryTitle: sheetLabels.summaryTitle,
      previewNote: sheetLabels.previewNote,
      brandAlt: sheetLabels.brandAlt,
      footerLine: sheetLabels.footerLine,
    },
    logoDataUri,
  });

  await printOrSharePdfHtml(html, docTitle);
}
