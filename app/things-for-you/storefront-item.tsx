'use client';

import Image from 'next/image';
import { useState, type FormEvent } from 'react';
import styles from './things-for-you.module.css';

type Item = {
  slug: string;
  title: string;
  description: string;
  size_label: string | null;
  condition_note: string | null;
  measurements: Record<string, string>;
  status: 'available' | 'pending' | 'reserved' | 'claimed';
  image: string | null;
  image_alt: string | null;
};

export function StorefrontItem({ item }: { item: Item }) {
  const [email, setEmail] = useState('');
  const [busy, setBusy] = useState(false);
  const [message, setMessage] = useState('');
  const [error, setError] = useState('');
  const available = item.status === 'available';
  const alertable = item.status === 'pending' || item.status === 'reserved';

  async function submit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setBusy(true);
    setError('');
    setMessage('');
    try {
      const action = available ? 'claim' : 'alert';
      const response = await fetch(`/api/storefront/items/${encodeURIComponent(item.slug)}/${action}`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ email }),
      });
      const body = await response.json();
      if (!response.ok) throw new Error(body.error || 'Please try again.');
      setMessage(available
        ? 'Check your email for a link to choose a time and suggest a public place.'
        : 'You’ll get an email if this item becomes available again.');
      setEmail('');
    } catch (cause) {
      setError(cause instanceof Error ? cause.message : 'Please try again.');
    } finally {
      setBusy(false);
    }
  }

  const measurements = Object.entries(item.measurements || {});

  return <article className={styles.item}>
    <h2>{item.title}</h2>
    <div className={styles.columns}>
      <div className={styles.media}>
        {item.image ? <Image src={item.image} alt={item.image_alt || item.title} fill sizes="(max-width: 720px) 90vw, 45vw" className={styles.image} />
          : <span className={styles.imagePlaceholder}>Photograph coming soon</span>}
      </div>
      <div className={styles.details}>
        <p className={styles.description}>{item.description}</p>
        <dl className={styles.facts}>
          <div><dt>Price</dt><dd>A coffee and a story</dd></div>
          {item.size_label && <div><dt>Size</dt><dd>{item.size_label}</dd></div>}
          {item.condition_note && <div><dt>Condition</dt><dd>{item.condition_note}</dd></div>}
          {measurements.map(([label, value]) => <div key={label}><dt>{label}</dt><dd>{value}</dd></div>)}
        </dl>
        {available || alertable ? <form className={styles.form} onSubmit={submit}>
          <label htmlFor={`email-${item.slug}`}>{available ? 'Your email' : 'Get an availability email'}</label>
          <div className={styles.formRow}>
            <input id={`email-${item.slug}`} type="email" autoComplete="email" required value={email}
              onChange={event => setEmail(event.target.value)} placeholder="you@example.com" disabled={busy} />
            <button type="submit" disabled={busy}>{busy ? 'Sending…' : available ? 'Claim' : 'Notify me'}</button>
          </div>
          <p className={styles.formHint}>{available
            ? 'We’ll email a private link. You’ll choose a time and public Seattle meeting place on Cal.com.'
            : 'This is an alert, not a waitlist or a reservation.'}</p>
        </form> : <p className={styles.claimed}>Claimed</p>}
        {message && <p className={styles.feedback} role="status">{message}</p>}
        {error && <p className={styles.error} role="alert">{error}</p>}
      </div>
    </div>
  </article>;
}
