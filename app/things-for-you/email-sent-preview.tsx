import styles from './storefront-item.module.css';
export function EmailSentPreview({ email }: { email: string }) { return (<div className={styles.emailPreview} role="group" aria-label="Email preview">
        <div className={styles.previewHeader}>
          <span className={styles.previewAvatar} aria-hidden="true">H</span>
          <div className={styles.previewIdentity}>
            <div className={styles.previewSender}><strong>hey@h5.codes</strong></div>
            <div className={styles.previewRecipient}>to <strong>{email}</strong></div>
          </div>
        </div>
        <div className={styles.previewContent}>
          <strong className={styles.previewSubject}>Finish claiming</strong>
          <div className={styles.previewSkeleton} aria-hidden="true"><span /><span /><span /></div>
        </div>
      </div>); }
