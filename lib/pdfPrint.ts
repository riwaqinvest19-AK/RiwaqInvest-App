import * as Print from 'expo-print';
import * as Sharing from 'expo-sharing';
import { Platform } from 'react-native';

/** Web: print dialog. Native: PDF file + share sheet. */
export async function printOrSharePdfHtml(html: string, dialogTitle: string): Promise<void> {
  if (Platform.OS === 'web') {
    if (typeof window === 'undefined') return;
    const w = window.open('', '_blank');
    if (w == null) return;
    w.document.open();
    w.document.write(html);
    w.document.close();
    w.focus();
    requestAnimationFrame(() => {
      setTimeout(() => w.print(), 350);
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
    dialogTitle,
    UTI: 'com.adobe.pdf',
  });
}
