import { Share, X } from 'lucide-react';
import { useState } from 'react';
import { useTranslation } from 'react-i18next';
import { dismissInstallHint, shouldShowInstallHint } from '../../shared/infrastructure/webApp';
import styles from './Library.module.css';

/** Web version on iPhone/iPad: how to install it, which also keeps Safari from evicting the library. */
export function InstallHint() {
  const { t } = useTranslation();
  const [visible, setVisible] = useState(shouldShowInstallHint);
  if (!visible) return null;

  const dismiss = () => {
    dismissInstallHint();
    setVisible(false);
  };

  return (
    <section className={styles.notice} aria-labelledby="install-hint-title">
      <div className={styles.noticeHeader}>
        <Share size={20} strokeWidth={2} aria-hidden className={styles.installIcon} />
        <h2 id="install-hint-title">{t('library.installHintTitle')}</h2>
        <button
          type="button"
          className={styles.dismiss}
          aria-label={t('library.dismiss')}
          onClick={dismiss}
        >
          <X size={18} strokeWidth={2.2} aria-hidden />
        </button>
      </div>
      <p className={styles.noticeBody}>{t('library.installHintBody')}</p>
    </section>
  );
}
