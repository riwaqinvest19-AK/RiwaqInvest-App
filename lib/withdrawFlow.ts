import type { TFunction } from 'i18next';

import { showAppAlert, showAppChoiceAlert } from '@/lib/showAppAlert';

/** Demo flow: choose withdraw type, then show bank-linking coming-soon notice. */
export function showWithdrawFlow(t: TFunction) {
  const showComingSoon = () => {
    showAppAlert(t('portfolio.withdrawComingSoonTitle'), t('portfolio.withdrawComingSoonMessage'));
  };

  showAppChoiceAlert(
    t('portfolio.withdrawTitle'),
    t('portfolio.withdrawChooseMessage'),
    [
      { label: t('portfolio.withdrawProfitsOnly'), onPress: showComingSoon },
      { label: t('portfolio.withdrawFullBalance'), onPress: showComingSoon },
    ],
    t('common.cancel'),
  );
}
