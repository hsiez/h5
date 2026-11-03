'use client';
import inputStyles from '../_components/text-input.module.css';
import { useId, useRef, useState, type FormEvent } from 'react';
import buttonStyles from '../things-for-you/storefront-item.module.css';
import signupStyles from '../things-for-you/signup-form.module.css';
import styles from './item-navigation.module.css';

export function NotifyFooterForm({ slug, onClose }: { slug: string; onClose: () => void }) {
  const id = useId();
  const [email, setEmail] = useState('');
  const [state, setState] = useState<'entry' | 'sending' | 'saved'>('entry');
  const [error, setError] = useState('');
  const busy = useRef(false);
  const heading = useRef<HTMLHeadingElement>(null);
  async function submit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    if (busy.current) return;
    busy.current = true;
    setState('sending');
    setError('');
    try {
      const response = await fetch(`/api/storefront/items/${encodeURIComponent(slug)}/alert`, {
        method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ email: email.trim() }),
      });
      const result = await response.json();
      if (!response.ok) throw new Error(result.error || 'Could not save your notification. Please try again.');
      setState('saved');
      requestAnimationFrame(() => heading.current?.focus({ preventScroll: true }));
    } catch (cause) {
      setError(cause instanceof Error ? cause.message : 'Please try again.');
      setState('entry');
    } finally { busy.current = false; }
  }
  return <section className={`${styles.notifyForm} ${signupStyles.surface}`} aria-labelledby={`${id}-title`} onKeyDown={event => {
    if (event.key === 'Escape') { event.stopPropagation(); if (state !== 'sending') onClose(); }
  }}>
    <h2 className={signupStyles.heading} ref={heading} tabIndex={-1} id={`${id}-title`}>{state === 'saved' ? 'Check your email' : 'Item is reserved'}</h2>
    <div className={signupStyles.intro}><p>{state === 'saved' ? 'Confirm your email to receive one availability notification.' : 'If the item becomes available again, we’ll notify you'}</p></div>
    {state === 'saved' ? <div className={signupStyles.form}><div className={signupStyles.actions}><button type="button" className={`${buttonStyles.primaryButton} ${signupStyles.submit}`} onClick={onClose}><span className={buttonStyles.buttonGrain} aria-hidden="true" /><span className={buttonStyles.buttonLabel}>Done</span></button></div></div> : <form className={signupStyles.form} onSubmit={submit}>
      <div className={signupStyles.inputs}>
      <input className={inputStyles.input} id={`${id}-email`} aria-label="Email address" type="email" autoComplete="email" inputMode="email" placeholder="you@example.com" required value={email} onChange={event => setEmail(event.target.value)} disabled={state === 'sending'} aria-describedby={error ? `${id}-error` : undefined} />
      {error && <p className={signupStyles.message} id={`${id}-error`} role="alert">{error}</p>}
      </div>
      <div className={signupStyles.actions}>
        <button type="button" className={signupStyles.cancel} onClick={onClose} disabled={state === 'sending'}>Cancel</button>
        <button type="submit" className={`${buttonStyles.primaryButton} ${signupStyles.submit}${state === 'sending' ? ` ${buttonStyles.loadingButton}` : ''}`} disabled={state === 'sending' || !email.trim()}><span className={buttonStyles.buttonGrain} aria-hidden="true" /><span className={buttonStyles.buttonLabel}>{state === 'sending' ? 'Saving…' : 'Submit'}</span></button>
      </div>
    </form>}
  </section>;
}
