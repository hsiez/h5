'use client';
import inputStyles from '../_components/text-input.module.css';
import { useId, useRef, useState, type FormEvent } from 'react';
import buttonStyles from '../things-for-you/storefront-item.module.css';
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
  return <section className={styles.notifyForm} aria-labelledby={`${id}-title`} onKeyDown={event => {
    if (event.key === 'Escape') { event.stopPropagation(); if (state !== 'sending') onClose(); }
  }}>
    <h2 ref={heading} tabIndex={-1} id={`${id}-title`}>{state === 'saved' ? 'Notification saved' : 'Item is reserved'}</h2>
    <p>{state === 'saved' ? 'We’ll email you once if it becomes available again.' : 'If the item becomes available again, we’ll notify you'}</p>
    {state === 'saved' ? <div className={styles.row}><button type="button" className={`${buttonStyles.primaryButton} ${styles.claim}`} onClick={onClose}><span className={buttonStyles.buttonGrain} aria-hidden="true" /><span className={buttonStyles.buttonLabel}>Done</span></button></div> : <form onSubmit={submit}>
      <input className={inputStyles.input} id={`${id}-email`} aria-label="Email address" type="email" autoComplete="email" inputMode="email" placeholder="you@example.com" required value={email} onChange={event => setEmail(event.target.value)} disabled={state === 'sending'} aria-describedby={error ? `${id}-error` : undefined} />
      {error && <p id={`${id}-error`} role="alert">{error}</p>}
      <div className={styles.row}>
        <button type="button" className={styles.notifyCancel} onClick={onClose} disabled={state === 'sending'}>Cancel</button>
        <button type="submit" className={`${buttonStyles.primaryButton} ${styles.claim}`} disabled={state === 'sending' || !email.trim()}><span className={buttonStyles.buttonGrain} aria-hidden="true" /><span className={buttonStyles.buttonLabel}>{state === 'sending' ? 'Saving…' : 'Submit'}</span></button>
      </div>
    </form>}
  </section>;
}
