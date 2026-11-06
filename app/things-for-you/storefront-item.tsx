'use client';

import { FocusImageGallery } from '../loadout/focus-image-gallery';
import { MobileActionBar } from '../things/mobile-action-bar';
import footerStyles from '../things/mobile-action-bar.module.css';
import inputStyles from '../_components/text-input.module.css';
import Image from 'next/image';
import { CLAIM_ILLUSTRATION, usePreloadClaimIllustration } from './preload-claim-illustration';
import { EmailSentPreview } from './email-sent-preview';
import { EmailSentInstructions } from './email-sent-instructions';
import Link from 'next/link';
import { useRouter } from 'next/navigation';
import { useEffect, useId, useRef, useState, type FormEvent } from 'react';
import { createPortal, flushSync } from 'react-dom';
import { PaperFrame } from '../_components/paper-frame';
import { OverflowFade } from '../_components/overflow-fade';
import { InlineReference } from '../loadout/inline-reference';
import type { ReviewText } from '../loadout/reviews';
import { StorefrontStatusBadge } from './storefront-status-badge';
import entityStyles from '../_components/inline-entity-trigger.module.css';
import styles from './storefront-item.module.css';
import signupStyles from './signup-form.module.css';

export type StorefrontItemStatus = 'available' | 'pending' | 'reserved' | 'claimed';
export type StorefrontButtonVariant = 'layered' | 'overlay';
type Action = 'claim' | 'notify';
type Submission = 'idle' | 'loading' | 'success' | 'error';
const EMAIL_ADDRESS_PATTERN = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;

export type StorefrontItemProps = {
  embedded?: boolean;
  externalMobileActions?: boolean;
  factsAboveStory?: boolean;
  status: StorefrontItemStatus;
  buttonVariant?: StorefrontButtonVariant;
  title: string;
  story: string;
  storyParts?: ReviewText[][];
  reason: string;
  photos: { src: string; alt: string }[];
  size: string;
  condition: string;
  measurements: { label: string; value: string }[];
  owner?: { name: string; photo?: { src: string; alt: string }; coffeeStory: string };
  slug?: string;
  initialAction?: Action | null;
  initialSubmission?: Submission;
  initialEmail?: string;
  initialAcknowledged?: boolean;
  initialError?: string;
  onClaimEmailChange?: (email: string) => void;
};

export function StorefrontItemFacts({ size, condition, measurements, leadingSeparator = false }: Pick<StorefrontItemProps, 'size' | 'condition' | 'measurements'> & { leadingSeparator?: boolean }) {
  const measurementsId = useId();
  const [measurementsOpen, setMeasurementsOpen] = useState(false);
  const displaySize = size.trim();
  const displayCondition = condition.trim();
  const sizeCodes: Record<string, string> = { small: 'S', medium: 'M', large: 'L', 'extra small': 'XS', 'extra large': 'XL' };
  const normalizedSize = displaySize.replace(/^size\s+/i, '');
  const sizeKey = normalizedSize.toLowerCase();
  const compactSize = (Object.hasOwn(sizeCodes, sizeKey) ? sizeCodes[sizeKey] : "")
    || (/^(?:XXS|XS|S|M|L|XL|XXL|XXXL|\d{1,3}(?:[.,]\d)?)$/i.test(normalizedSize) ? normalizedSize.toUpperCase() : '');
  const sizeLabel = compactSize || displaySize;
  const hasSize = !!displaySize || measurements.length > 0;
  const separator = <span className={styles.detailSeparator} aria-hidden="true">·</span>;

  return <>
    {leadingSeparator && (hasSize || displayCondition) ? separator : null}
    <dl className={styles.factsList}>
    {hasSize && <div><dt className={styles.visuallyHidden}>Size</dt><dd className={styles.detailValue} data-size-circle={compactSize ? true : undefined}>
      {measurements.length > 0 ? <div className={styles.measurementsEntity} onKeyDown={event => {
        if (event.key === 'Escape' && measurementsOpen) {
          event.stopPropagation();
          setMeasurementsOpen(false);
        }
      }}>
        <button type="button" className={entityStyles.trigger}
          aria-expanded={measurementsOpen} aria-controls={measurementsId} onClick={() => setMeasurementsOpen(open => !open)}>
          {sizeLabel ? <>{sizeLabel}<span className={styles.visuallyHidden}>. View measurements</span></> : 'Measurements'}
          {!compactSize && <svg aria-hidden="true" viewBox="0 0 12 12" fill="none" stroke="currentColor"><path d="m2 4 4 4 4-4" /></svg>}
        </button>
        <PaperFrame elevation="popover" className={styles.measurementsPopover}>
          <dl id={measurementsId} className={styles.measurementsList}>
            {measurements.map(({ label, value }) => <div key={label}><dt>{label}</dt><dd>{value}</dd></div>)}
          </dl>
        </PaperFrame>
      </div> : sizeLabel}
    </dd></div>}
    {displayCondition && <div><dt className={styles.visuallyHidden}>Condition</dt><dd className={styles.detailValue}>{displayCondition}</dd></div>}
    </dl>
  </>;
}

export function StorefrontItem({
  embedded = false, externalMobileActions = false, factsAboveStory = false, status, buttonVariant = 'layered', title, story, storyParts, reason, photos, size, condition, measurements, owner, slug,
  initialAction = null, initialSubmission = 'idle', initialEmail = '', initialAcknowledged = false, initialError = '', onClaimEmailChange,
}: StorefrontItemProps) {
  usePreloadClaimIllustration(photos[0]?.src);
  const router = useRouter();
  const [photoIndex, setPhotoIndex] = useState(0);
  const itemRoot = useRef<HTMLDivElement>(null);
  const [portalRoot, setPortalRoot] = useState<HTMLElement | null>(null);
  useEffect(() => {
    const frame = window.requestAnimationFrame(() => {
      // Keep the footer in the focused layer's stacking and keyboard scope.
      const layer = itemRoot.current?.closest('[data-item-layer]');
      setPortalRoot(layer?.querySelector<HTMLElement>('[data-item-footer]') ?? document.body);
    });
    return () => window.cancelAnimationFrame(frame);
  }, []);
  const [action, setAction] = useState<Action | null>(initialAction);
  const [submission, setSubmission] = useState<Submission>(initialSubmission);
  const [email, setEmail] = useState(initialEmail);
  const [emailValid, setEmailValid] = useState(EMAIL_ADDRESS_PATTERN.test(initialEmail));
  const [acknowledged, setAcknowledged] = useState(initialAcknowledged);
  const [formError, setFormError] = useState(initialError);
  const [liveStatus, setLiveStatus] = useState(status);
  const claimDialogRef = useRef<HTMLDialogElement>(null);
  const dialogBodyRef = useRef<HTMLDivElement>(null);
  const dialogHeadingRef = useRef<HTMLHeadingElement>(null);
  const transitioningRef = useRef(false);
  const emailId = useId();
  const claimMessageId = useId();
  const dialogTitleId = useId();
  const dialogDescriptionId = useId();
  const ownerId = useId();
  const photo = photos[photoIndex];
  useEffect(() => {
    if (!slug) return;
    let active = true;
    async function refreshStatus() {
      if (document.visibilityState === 'hidden') return;
      try {
        const response = await fetch('/api/storefront/items', { cache: 'no-store' });
        if (!response.ok) return;
        const body: { items?: { slug: string; status: StorefrontItemStatus }[] } = await response.json();
        const current = body.items?.find(item => item.slug === slug);
        if (active && current) setLiveStatus(current.status);
      } catch { /* Keep the last known status while offline. */ }
    }
    void refreshStatus();
    window.addEventListener('focus', refreshStatus);
    document.addEventListener('visibilitychange', refreshStatus);
    const timer = window.setInterval(refreshStatus, 10_000);
    return () => {
      active = false;
      window.removeEventListener('focus', refreshStatus);
      document.removeEventListener('visibilitychange', refreshStatus);
      window.clearInterval(timer);
    };
  }, [slug]);

  const currentStatus = slug ? liveStatus : status;
  const expectedAction = currentStatus === 'available' ? 'claim' : currentStatus === 'pending' || currentStatus === 'reserved' ? 'notify' : null;
  const activeAction = action === expectedAction ? action : null;
  const claimReady = emailValid && (activeAction === 'notify' || acknowledged);
  const primaryButtonClassName = `${styles.primaryButton}${buttonVariant === 'overlay' ? ` ${styles.originalButton}` : ''}`;

  useEffect(() => {
    const dialog = claimDialogRef.current;
    if (!dialog) return;
    if (activeAction && !dialog.open) {
      dialog.showModal();
      dialog.scrollTop = 0;
      dialogHeadingRef.current?.focus({ preventScroll: true });
    }
    if (!activeAction && dialog.open) dialog.close();
  }, [activeAction, submission]);

  useEffect(() => {
    if (!activeAction) return;
    const dialog = claimDialogRef.current;
    if (!dialog) return;

    const scrollY = window.scrollY;
    const html = document.documentElement;
    const body = document.body;
    const previous = {
      htmlOverflow: html.style.overflow,
      bodyOverflow: body.style.overflow,
      bodyPosition: body.style.position,
      bodyTop: body.style.top,
      bodyWidth: body.style.width,
    };
    html.style.overflow = 'hidden';
    body.style.overflow = 'hidden';
    body.style.position = 'fixed';
    body.style.top = `-${scrollY}px`;
    body.style.width = '100%';

    return () => {
      html.style.overflow = previous.htmlOverflow;
      body.style.overflow = previous.bodyOverflow;
      body.style.position = previous.bodyPosition;
      body.style.top = previous.bodyTop;
      body.style.width = previous.bodyWidth;
      window.scrollTo(0, scrollY);
    };
  }, [activeAction]);

  useEffect(() => {
    if (activeAction === 'claim' && submission === 'success' && !transitioningRef.current) dialogHeadingRef.current?.focus();
  }, [activeAction, submission]);

  function open(nextAction: Action) {
    if (nextAction === 'claim' && slug && window.matchMedia('(max-width: 700px)').matches) {
      router.push(`/things/claim/${encodeURIComponent(slug)}`, { transitionTypes: ['claim-forward'] });
      return;
    }
    setSubmission('idle');
    setFormError('');
    setEmail('');
    if (nextAction === 'claim') onClaimEmailChange?.('');
    setEmailValid(false);
    setAcknowledged(false);
    setAction(nextAction);
  }

  function cancel() {
    setAction(null);
    setSubmission('idle');
    setFormError('');
    setAcknowledged(false);
  }

  async function showClaimSuccess() {
    const dialog = claimDialogRef.current;
    const body = dialogBodyRef.current;
    if (!dialog?.open || !body || window.matchMedia('(prefers-reduced-motion: reduce)').matches || !body.animate) {
      setSubmission('success');
      return;
    }

    transitioningRef.current = true;
    body.inert = true;
    try {
      const fadeOut = body.animate([{ opacity: 1 }, { opacity: 0 }], { duration: 140, easing: 'ease-out', fill: 'forwards' });
      await fadeOut.finished;
      body.style.opacity = '0';
      fadeOut.cancel();
      flushSync(() => setSubmission('success'));
      // The new content determines the dialog height; no measured height is held or animated.
      const fadeIn = body.animate([{ opacity: 0 }, { opacity: 1 }], { duration: 140, easing: 'ease-out', fill: 'forwards' });
      await fadeIn.finished;
      fadeIn.cancel();
    } finally {
      body.style.opacity = '';
      body.inert = false;
      transitioningRef.current = false;
      dialogHeadingRef.current?.focus();
    }
  }

  async function submit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    {
      const emailInput = event.currentTarget.querySelector<HTMLInputElement>('input[type="email"]');
      if (!email.trim()) { setFormError('Enter your email address.'); return; }
      if (!emailInput?.validity.valid) { setFormError('Enter a valid email address.'); return; }
      if (activeAction === 'claim' && !acknowledged) { setFormError('Please acknowledge the no-resale condition.'); return; }
    }
    setSubmission('loading');
    setFormError('');
    if (!slug) {
      await new Promise(resolve => window.setTimeout(resolve, 700));
      if (activeAction === 'claim') await showClaimSuccess();
      else setSubmission('success');
      return;
    }
    try {
      const endpoint = activeAction === 'claim' ? 'claim' : 'alert';
      const response = await fetch(`/api/storefront/items/${encodeURIComponent(slug)}/${endpoint}`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ email, acknowledged }),
      });
      const body = await response.json();
      if (!response.ok) throw new Error(body.error || 'Please try again.');
      if (activeAction === 'claim') await showClaimSuccess();
      else setSubmission('success');
      if (activeAction !== 'claim') setEmail('');
    } catch (cause) {
      setFormError(cause instanceof Error ? cause.message : 'Please try again.');
      setSubmission('error');
    }
  }

  const introduction = (storyParts?.length || story || reason) && <div className={styles.introduction}>
            {storyParts?.length ? storyParts.map((paragraph, index) => <p key={index}>
              {index === 0 && <em className={styles.storyLeadIn}>I&apos;m forfeiting{' '}</em>}
              {paragraph.map((part, partIndex) => typeof part === 'string' ? <span key={partIndex}>{part}</span> : <InlineReference key={partIndex} text={part.text} entity={part.entity} />)}
            </p>) : story && <p><em className={styles.storyLeadIn}>I&apos;m forfeiting{' '}</em>{story}</p>}
            {reason && <p>{reason}</p>}
          </div>;

  const metadataRow = <div className={styles.detailsRow}>
    <StorefrontStatusBadge status={currentStatus} />
    <StorefrontItemFacts size={size} condition={condition} measurements={measurements} leadingSeparator />
  </div>;

  return <div ref={itemRoot} className={embedded ? styles.embedded : styles.page} data-mobile-claim={embedded && currentStatus === 'available' && slug ? 'true' : undefined} data-facts-above-story={factsAboveStory ? 'true' : undefined} data-status={currentStatus}>
    <article className={embedded ? undefined : styles.item}>
      {!embedded && <h1>{title}</h1>}
      <div className={embedded ? undefined : styles.columns}>
        {!embedded && <div className={styles.gallery}>
          <div className={styles.photo}>
            {photo ? <Image src={photo.src} alt={photo.alt} fill sizes="(max-width: 760px) 100vw, 52vw" className={styles.image} unoptimized={photo.src.startsWith('https://') || photo.src.startsWith('/api/catalog/media?')} priority />
              : <span className={styles.photoEmpty}>Photograph coming soon</span>}
            <FocusImageGallery standalone title={title} photos={photos} selectedIndex={photoIndex} onSelect={setPhotoIndex} />
          </div>
        </div>
}
        <div className={styles.content}>
          {factsAboveStory && (size || condition || measurements?.length) ? (
            <div className={styles.articleFacts}>
              <StorefrontItemFacts size={size} condition={condition} measurements={measurements} />
            </div>
          ) : null}

          {embedded ? <OverflowFade className={styles.storyScroll} label="About this item">{introduction}</OverflowFade> : introduction}

          <section className={styles.claiming} data-footer-action={externalMobileActions && (currentStatus === 'reserved' || currentStatus === 'pending') ? 'true' : undefined} data-embedded={embedded ? 'true' : undefined} aria-label="Adoption details">
            <section className={styles.availability} aria-label="Shopping details">
              {metadataRow}
              <div className={styles.purchaseRow}>
                <section className={styles.actionRow} aria-label="Item status and action" aria-live="polite">
                {currentStatus === 'claimed' ? <p className={styles.claimedText}>
                  Passed on to{' '}
                  {owner ? <span className={styles.ownerEntity}>
                    <button type="button" className={entityStyles.trigger} aria-describedby={ownerId} aria-label={`About ${owner.name}`}>
                      <svg aria-hidden="true" viewBox="0 0 16 16" fill="none" stroke="currentColor" strokeWidth="1.4" strokeLinecap="round" strokeLinejoin="round"><rect x="1.7" y="2.2" width="12.6" height="11.6" rx="1.4" /><circle cx="5.4" cy="5.9" r="1.1" /><path d="m2.4 11.5 3.1-3 2.2 2 2.2-2.2 3.4 3.4" /></svg>
                      {owner.name}
                    </button>
                    <span className={styles.ownerCard} id={ownerId} role="tooltip">
                      <span className={styles.ownerPhoto}>
                        {owner.photo ? <Image src={owner.photo.src} alt={owner.photo.alt} fill sizes="300px" unoptimized={owner.photo.src.startsWith('https://') || owner.photo.src.startsWith('/api/catalog/media?')} /> : <span>Meetup photo goes here</span>}
                      </span>
                      <span className={styles.ownerCardText}>{owner.coffeeStory}</span>
                    </span>
                  </span> : 'its new owner'} after coffee and a story.
                </p> : <button className={primaryButtonClassName} type="button" onClick={() => open(currentStatus === 'available' ? 'claim' : 'notify')}>
                  {buttonVariant === 'layered' && <span className={styles.buttonGrain} aria-hidden="true" />}
                  <span className={styles.buttonLabel}>{currentStatus === 'available' ? 'Claim for 1 coffee' : 'Notify me'}</span>
                </button>}
              </section>
              </div>
            </section>
          </section>

        </div>
      </div>
    </article>
    {embedded && !externalMobileActions && currentStatus === 'available' && slug && portalRoot && createPortal(<MobileActionBar label="Item actions"><div className={footerStyles.row} data-action-row>
      <Link className={`${primaryButtonClassName} ${footerStyles.action}`} data-footer-action href={`/things/claim/${encodeURIComponent(slug)}`} transitionTypes={['claim-forward']}>
        {buttonVariant === 'layered' && <span className={styles.buttonGrain} aria-hidden="true" />}
        <span className={styles.buttonLabel}>Claim for 1 coffee</span>
      </Link>
    </div></MobileActionBar>, portalRoot)}
    <dialog ref={claimDialogRef} className={styles.claimDialog} data-state={submission === 'success' ? 'success' : 'entry'} aria-labelledby={dialogTitleId} aria-describedby={dialogDescriptionId}
      onCancel={event => { if (submission === 'loading') event.preventDefault(); }}
      onClose={() => {
        // Success dismissal must release the same scroll lock as cancellation.
        if (submission === 'success') setAction(null);
        else cancel();
      }}>
      <button className={styles.mobileDialogClose} type="button" aria-label="Close" onClick={cancel} disabled={submission === 'loading'}>
        <svg aria-hidden="true" width="20" height="20" viewBox="0 0 20 20" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round">
          <path d="M4 4 16 16M16 4 4 16" />
        </svg>
      </button>
      <div ref={dialogBodyRef} className={styles.dialogBody}>
      {submission === 'success' && activeAction === 'claim' ? <EmailSentPreview email={email} /> : <div className={styles.dialogIllustration} aria-hidden="true">
        <Image src={CLAIM_ILLUSTRATION} alt="" width={1536} height={1024} unoptimized />
      </div>}
      <div className={`${styles.dialogContent} ${styles.claimGlass} ${signupStyles.surface}`}>
      <h2 className={signupStyles.heading} id={dialogTitleId} ref={dialogHeadingRef} tabIndex={-1}>{activeAction === 'notify' ? (submission === 'success' ? 'Check your email' : 'Item is reserved') : (submission === 'success' ? 'Email sent' : 'How to claim')}</h2>
      <div id={dialogDescriptionId} className={signupStyles.intro}>
        {activeAction === 'notify' ? <p>{submission === 'success' ? 'Confirm your email to receive one availability notification.' : 'If the item becomes available again, we’ll notify you'}</p> : submission === 'success'
          ? <EmailSentInstructions email={email} title={title} />
          : <p>Harley wants to trade you this item for a coffee chat. Enter your email and he’ll send a scheduling link.</p>}
      </div>
      {submission === 'success' ? <div className={signupStyles.form}><div className={signupStyles.actions}>
        <button className={`${primaryButtonClassName} ${signupStyles.submit}`} type="button" onClick={() => claimDialogRef.current?.close()}>
          {buttonVariant === 'layered' && <span className={styles.buttonGrain} aria-hidden="true" />}
          <span className={styles.buttonLabel}>Done</span>
        </button>
      </div></div> : <form className={signupStyles.form} onSubmit={submit} noValidate>
        <div className={signupStyles.inputs}>
        <div className={styles.formField}>
          <p id={claimMessageId} className={styles.claimMessage} aria-live="polite" hidden={!(formError || (submission === 'error' && initialError))}>{(formError || (submission === 'error' && initialError)) && <span>{formError || initialError}</span>}</p>
          <input className={inputStyles.input} id={emailId} type="email" aria-label="Email address" aria-describedby={claimMessageId} aria-invalid={formError === 'Enter your email address.' || formError === 'Enter a valid email address.'} autoComplete="email" value={email} onChange={event => { setEmail(event.target.value); onClaimEmailChange?.(event.target.value); setEmailValid(event.target.validity.valid && Boolean(event.target.value.trim())); setFormError(''); }}
            placeholder="you@example.com" pattern={EMAIL_ADDRESS_PATTERN.source} disabled={submission === 'loading'} required />
        </div>
        {activeAction === 'claim' && <label className={styles.acknowledgement}>
          <input type="checkbox" checked={acknowledged} onChange={event => { setAcknowledged(event.target.checked); setFormError(''); }} disabled={submission === 'loading'} required />
          <span>I acknowledge that reselling item will result in 1,000 years of bad luck for my entire bloodline</span>
        </label>}
        </div>
        <div className={signupStyles.actions}>
          <button className={signupStyles.cancel} type="button" onClick={cancel} disabled={submission === 'loading'}>Cancel</button>
          <button className={`${primaryButtonClassName} ${signupStyles.submit}${submission === 'loading' ? ` ${styles.loadingButton}` : ''}`} type="submit" disabled={submission === 'loading' || !claimReady}>
            {buttonVariant === 'layered' && <span className={styles.buttonGrain} aria-hidden="true" />}
            {submission === 'loading' && <span className={styles.loadingSheen} aria-hidden="true" />}
            <span className={styles.buttonLabel}>{submission === 'loading' ? 'Sending…' : <><span className={styles.desktopSubmitLabel}>Submit</span><span className={styles.mobileSubmitLabel}>Submit request</span></>}</span>
          </button>
        </div>
      </form>}
      </div>
      </div>
    </dialog>
  </div>;
}
