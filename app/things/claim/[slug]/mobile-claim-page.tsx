'use client';

import inputStyles from '../../../_components/text-input.module.css';
import Image from 'next/image';
import { EmailSentPreview } from '../../../things-for-you/email-sent-preview';
import { EmailSentInstructions } from '../../../things-for-you/email-sent-instructions';
import Link from 'next/link';
import { useEffect, useId, useRef, useState, type FormEvent } from 'react';
import claimStyles from '../../../things-for-you/storefront-item.module.css';
import styles from './mobile-claim-page.module.css';
import frameStyles from '../../../_components/paper-frame.module.css';
import signupStyles from '../../../things-for-you/signup-form.module.css';

const EMAIL_ADDRESS_PATTERN = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;

export function MobileClaimPage({ slug, title, initialState = 'entry', initialEmail = '', action = 'claim' }: { slug?: string; title: string; action?: 'claim' | 'notify'; initialState?: 'entry' | 'sent'; initialEmail?: string }) {
  const [email, setEmail] = useState(initialEmail);
  const [acknowledged, setAcknowledged] = useState(false);
  const [error, setError] = useState('');
  const [state, setState] = useState<'entry' | 'sending' | 'sent'>(initialState);
  const errorId = useId();
  const headingRef = useRef<HTMLHeadingElement>(null);
  const previousState = useRef(state);
  useEffect(() => {
    if (state === 'sent' && previousState.current !== 'sent') headingRef.current?.focus({preventScroll:true});
    previousState.current = state;
  }, [state]);
  const claimReady = EMAIL_ADDRESS_PATTERN.test(email.trim()) && (action === 'notify' || acknowledged);
  const returnHref = slug ? `/things/${encodeURIComponent(slug)}` : '/things?region=things-for-you';

  async function submit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    if (!EMAIL_ADDRESS_PATTERN.test(email.trim())) {
      setError(email.trim() ? 'Enter a valid email address.' : 'Enter your email address.');
      return;
    }
    if (action === 'claim' && !acknowledged) {
      setError('Please acknowledge the no-resale condition.');
      return;
    }

    setState('sending');
    setError('');
    try {
      if (slug) {
        const response = await fetch(`/api/storefront/items/${encodeURIComponent(slug)}/${action === 'notify' ? 'alert' : 'claim'}`, {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ email: email.trim(), acknowledged }),
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
      {state !== 'sent' && <Link className={`${styles.back} ${styles.entryBack} ${frameStyles.frame} ${frameStyles.popover}`} href={returnHref} transitionTypes={['claim-back']} aria-label="Back to item">
        <svg aria-hidden="true" width="20" height="20" viewBox="0 0 20 20" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round"><path d="M12.5 4.5 6 10l6.5 5.5" /></svg>
        <span>Back</span>
      </Link>}
      {state !== 'sent' && <div className={styles.illustration} aria-hidden="true">
        <Image src="/illustrations/coffee-chat-metal-cups-spaced-stipple-420.webp" alt="" width={1536} height={1024} unoptimized priority />
      </div>}
      <section className={`${styles.card} ${claimStyles.claimGlass} ${signupStyles.surface}`} aria-labelledby="claim-title">
        {state === 'sent' && action === 'claim' && <EmailSentPreview email={email} />}
        <h1 ref={headingRef} tabIndex={-1} id="claim-title" className={signupStyles.heading}>{state === 'sent' ? (action === 'notify' ? 'Check your email' : 'Email sent') : (action === 'notify' ? 'Get notified' : 'How to claim')}</h1>
        {state === 'sent' ? <>
          <div className={signupStyles.intro}>{action === 'notify' ? <p>Confirm your email to receive one availability notification. This is not a waitlist.</p> : <EmailSentInstructions email={email} title={title} />}</div>
          <div className={signupStyles.form}><div className={signupStyles.actions}><Link className={`${signupStyles.submit} ${claimStyles.primaryButton}`} href={returnHref} transitionTypes={['claim-back']}><span className={claimStyles.buttonGrain} aria-hidden="true" /><span className={claimStyles.buttonLabel}>Done</span></Link></div></div>
        </> : <>
          <div className={signupStyles.intro}><p>{action === 'notify' ? 'Enter your email for one availability notification if this item opens up again. This is not a waitlist.' : 'Harley wants to trade you this item for a coffee chat. Enter your email and he’ll send a scheduling link.'}</p></div>
          <form className={signupStyles.form} onSubmit={submit} noValidate>
            <div className={signupStyles.inputs}>
              <div className={claimStyles.formField}>
                <label className={styles.visuallyHidden} htmlFor="claim-email">Email address</label>
                <input className={inputStyles.input} id="claim-email" type="email" inputMode="email" autoComplete="email" enterKeyHint="done" value={email} onChange={event => { setEmail(event.target.value); setError(''); }} placeholder="you@example.com" aria-invalid={Boolean(error && error.includes('email'))} aria-describedby={error ? errorId : undefined} disabled={state === 'sending'} />
                {error && <p id={errorId} className={claimStyles.claimMessage} role="status"><span>{error}</span></p>}
              </div>
              {action === 'claim' && <label className={claimStyles.acknowledgement}>
                <input type="checkbox" checked={acknowledged} onChange={event => { setAcknowledged(event.target.checked); setError(''); }} disabled={state === 'sending'} />
                <span>I acknowledge that reselling item will result in 1,000 years of bad luck for my entire bloodline</span>
              </label>}
            </div>
            <div className={signupStyles.actions}>
              <Link className={`${signupStyles.cancel} ${styles.mobileCancel}`} href={returnHref} transitionTypes={['claim-back']} aria-disabled={state === 'sending' || undefined} onNavigate={event => { if (state === 'sending') event.preventDefault(); }}>Cancel</Link>
              <button className={`${signupStyles.submit} ${claimStyles.primaryButton}${state === 'sending' ? ` ${claimStyles.loadingButton}` : ''}`} type="submit" disabled={state === 'sending' || !claimReady}><span className={claimStyles.buttonGrain} aria-hidden="true" />{state === 'sending' && <span className={claimStyles.loadingSheen} aria-hidden="true" />}<span className={claimStyles.buttonLabel}>{state === 'sending' ? 'Sending…' : 'Submit request'}</span></button>
            </div>
          </form>
        </>}
      </section>
    </div>
  </main>;
}
