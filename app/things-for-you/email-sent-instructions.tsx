 'use client';
import { useEffect, useState } from 'react';
import styles from '../things/claim/[slug]/mobile-claim-page.module.css';
export function EmailSentInstructions({ email, title }: { email: string; title: string }) {
  const [subjectCopied, setSubjectCopied] = useState(false);
  const emailSubject = `Finish claiming this ${title.toLowerCase()}`;
  const [provider, setProvider] = useState<{ name: string; url: string } | null>(null);
  useEffect(() => {
    const controller = new AbortController();
    const domain = email.trim().split('@')[1];
    if (domain) fetch(`/api/mail-provider?domain=${encodeURIComponent(domain)}`, { signal: controller.signal })
      .then(response => response.json()).then(result => setProvider(result.provider)).catch(() => {});
    return () => controller.abort();
  }, [email]);
  const providerHref = provider?.name === 'Gmail'
    ? `https://mail.google.com/mail/u/?authuser=${encodeURIComponent(email.trim())}#search/${encodeURIComponent(`in:anywhere subject:"${emailSubject}"`)}`
    : provider?.url;
  return (
          <div className={styles.subjectSearch}>
            <p>Search your inbox for <button type="button" className={styles.copySubject} onClick={async () => {
              try { await navigator.clipboard.writeText('Finish claiming'); setSubjectCopied(true); }
              catch { setSubjectCopied(false); }
            }} aria-label="Copy email search: Finish claiming">
              <span>“Finish claiming”</span><span className={styles.visuallyHidden} aria-live="polite">{subjectCopied ? 'Copied' : ''}</span>
            </button>. {provider && <a className={styles.emailLink} href={providerHref} target="_blank" rel="noopener noreferrer">Open email</a>}</p>
          </div>
  );
}
