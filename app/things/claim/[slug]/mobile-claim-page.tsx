'use client';

import Image from 'next/image';
import { EmailSentPreview } from '../../../things-for-you/email-sent-preview';
import { EmailSentInstructions } from '../../../things-for-you/email-sent-instructions';
import Link from 'next/link';
import { useId, useState, type FormEvent } from 'react';
import claimStyles from '../../../things-for-you/storefront-item.module.css';
import styles from './mobile-claim-page.module.css';
import frameStyles from '../../../_components/paper-frame.module.css';

const EMAIL_ADDRESS_PATTERN = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;

export function MobileClaimPage({ slug, title, initialState = 'entry', initialEmail = '' }: { slug?: string; title: string; initialState?: 'entry' | 'sent'; initialEmail?: string }) {
  const [email, setEmail] = useState(initialEmail);
  const [acknowledged, setAcknowledged] = useState(false);
  const [error, setError] = useState('');
  const [state, setState] = useState<'entry' | 'sending' | 'sent'>(initialState);
  const errorId = useId();
  const claimReady = EMAIL_ADDRESS_PATTERN.test(email.trim()) && acknowledged;
  const returnHref = slug ? `/things?region=things-for-you&item=${encodeURIComponent(slug)}` : '/things?region=things-for-you';

  async function submit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    if (!EMAIL_ADDRESS_PATTERN.test(email.trim())) {
      setError(email.trim() ? 'Enter a valid email address.' : 'Enter your email address.');
      return;
    }
    if (!acknowledged) {
      setError('Please acknowledge the no-resale condition.');
      return;
    }

    setState('sending');
    setError('');
    try {
      if (slug) {
        const response = await fetch(`/api/storefront/items/${encodeURIComponent(slug)}/claim`, {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ email: email.trim() }),
        });
        const result: { error?: string } = await response.json();
        if (!response.ok) throw new Error(result.error || 'Please try again.');
      } else {
        await new Promise(resolve => window.setTimeout(resolve, 500));
      }
      setState('sent');
      window.scrollTo({ top: 0, behavior: 'instant' });
    } catch (cause) {
      setError(cause instanceof Error ? cause.message : 'Please try again.');
      setState('entry');
    }
  }

  return <main className={styles.page} data-things-page data-claim-page>
    <div className={styles.shell}>
      {state !== 'sent' && <Link className={`${styles.back} ${frameStyles.frame} ${frameStyles.popover}`} href={returnHref} transitionTypes={['claim-back']} aria-label="Back to item">
        <svg aria-hidden="true" width="20" height="20" viewBox="0 0 20 20" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round"><path d="M12.5 4.5 6 10l6.5 5.5" /></svg>
        <span>Back</span>
      </Link>}
      {state !== 'sent' && <div className={styles.illustration} aria-hidden="true">
        <Image src="/illustrations/coffee-chat-metal-cups-spaced-stipple-420.webp" alt="" width={1536} height={1024} unoptimized priority />
      </div>}
      <section className={`${styles.card} ${claimStyles.claimGlass}`} aria-labelledby="claim-title">
        {state === 'sent' && <EmailSentPreview email={email} />}
        <h1 id="claim-title" className={claimStyles.claimTitle}>{state === 'sent' ? 'Email sent' : 'How to claim'}</h1>
        {state === 'sent' ? <>
          <EmailSentInstructions email={email} title={title} />
          <Link className={`${styles.submit} ${claimStyles.primaryButton}`} href={returnHref} transitionTypes={['claim-back']}><span className={claimStyles.buttonGrain} aria-hidden="true" /><span className={claimStyles.buttonLabel}>Done</span></Link>
        </> : <>
          <div className={`${styles.intro} ${claimStyles.dialogIntro}`}><p>Harley wants to trade you this item for a coffee chat. Enter your email and he’ll send a scheduling link.</p></div>
          <form className={`${styles.form} ${claimStyles.claimForm}`} onSubmit={submit} noValidate>
            <div className={styles.inputs}>
              <div className={claimStyles.formField}>
                <label className={styles.visuallyHidden} htmlFor="claim-email">Email address</label>
                <input id="claim-email" type="email" inputMode="email" autoComplete="email" enterKeyHint="done" value={email} onChange={event => { setEmail(event.target.value); setError(''); }} onKeyDown={event => { if (event.key === 'Enter') { event.preventDefault(); event.currentTarget.blur(); } }} placeholder="you@example.com" aria-invalid={Boolean(error && error.includes('email'))} aria-describedby={error ? errorId : undefined} disabled={state === 'sending'} />
                {error && <p id={errorId} className={claimStyles.claimMessage} role="status"><span>{error}</span></p>}
              </div>
              <label className={claimStyles.acknowledgement}>
                <input type="checkbox" checked={acknowledged} onChange={event => { setAcknowledged(event.target.checked); setError(''); }} disabled={state === 'sending'} />
                <span>I acknowledge that reselling item will result in 1,000 years of bad luck for my entire bloodline</span>
              </label>
            </div>
            <div className={claimStyles.dialogActions}>
              <button className={`${styles.submit} ${claimStyles.primaryButton}${state === 'sending' ? ` ${claimStyles.loadingButton}` : ''}`} type="submit" disabled={state === 'sending' || !claimReady}><span className={claimStyles.buttonGrain} aria-hidden="true" />{state === 'sending' && <span className={claimStyles.loadingSheen} aria-hidden="true" />}<span className={claimStyles.buttonLabel}>{state === 'sending' ? 'Sending…' : 'Submit request'}</span></button>
            </div>
          </form>
        </>}
      </section>
    </div>
  </main>;
}
