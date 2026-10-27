'use client';

import { useRef, useState } from 'react';
import { InlineReference } from '../loadout/inline-reference';
import type { ItemReview, ReviewText } from '../loadout/reviews';
import reviewStyles from '../loadout/loadout.module.css';
import storefrontStyles from '../things-for-you/storefront-item.module.css';
import type { Photo } from '@/lib/catalog/types';
import styles from './review-editor.module.css';

export type RefEntry = { key: string; value: Exclude<ReviewText, string> };
export type ReviewForm = { enabled: boolean; about: string; pros: string; cons: string; refs: RefEntry[] };
type Section = 'about' | 'pros' | 'cons';
const sections: { key: Section; label: string }[] = [
  { key: 'about', label: 'I acquired' },
  { key: 'pros', label: 'I love' },
  { key: 'cons', label: 'Only notes' },
];
const marker = (key: string) => `[[${key}]]`;

export function fromReview(review: ItemReview | null): ReviewForm {
  const refs: RefEntry[] = [];
  const encode = (parts: ReviewText[]) => parts.map(part => {
    if (typeof part === 'string') return part;
    const key = `ref${refs.length + 1}`;
    refs.push({ key, value: part });
    return marker(key);
  }).join('');
  return {
    enabled: !!review,
    about: review?.about.map(encode).join('\n\n') || '',
    pros: review?.pros.map(part => typeof part === 'string' ? part : encode(part)).join('\n\n') || '',
    cons: review?.cons.map(part => typeof part === 'string' ? part : encode(part)).join('\n\n') || '',
    refs,
  };
}

export function toReview(form: ReviewForm, title: string, storefront = false): ItemReview | null {
  if (!form.enabled) return null;
  const parse = (text: string): ReviewText[] => text.split(/(\[\[[a-z0-9]+\]\])/g).filter(Boolean).map(part => {
    if (!part.startsWith('[[')) return part;
    const ref = form.refs.find(entry => entry.key === part.slice(2, -2));
    if (!ref) throw new Error(`Unknown reference ${part}`);
    return ref.value;
  });
  const paragraphs = (text: string) => text.split(/\n\s*\n/).filter(part => part.trim()).map(parse);
  return { title, about: paragraphs(form.about), pros: storefront ? [] : paragraphs(form.pros), cons: storefront ? [] : paragraphs(form.cons) };
}

export function plainReviewText(text: string, refs: RefEntry[]) {
  return text.replace(/\[\[([a-z0-9]+)\]\]/g, (token, key: string) => refs.find(ref => ref.key === key)?.value.text ?? token);
}

function ReviewPreview({ text, refs, leadIn, storefront = false, singleParagraph = false }: { text: string; refs: RefEntry[]; leadIn: string; storefront?: boolean; singleParagraph?: boolean }) {
  const paragraphs = (singleParagraph ? text.replace(/\n\s*\n/g, ' ') : text).split(/\n\s*\n/).filter(part => part.trim());
  if (!paragraphs.length) return <p className={styles.emptyPreview}>Your writing will appear here.</p>;
  return <div className={`${styles.previewText} ${storefront ? storefrontStyles.introduction : reviewStyles.detailSection}`}>{paragraphs.map((paragraph, index) =>
    <p key={index}>{index === 0 && <em className={storefront ? storefrontStyles.storyLeadIn : reviewStyles.reviewLeadIn}>{leadIn}{' '}</em>}{paragraph.split(/(\[\[[a-z0-9]+\]\])/g).filter(Boolean).map((part, partIndex) => {
      const ref = part.startsWith('[[') ? refs.find(entry => marker(entry.key) === part) : undefined;
      const ready = ref && (ref.value.entity.kind === 'location'
        ? !!ref.value.entity.name.trim()
        : !!ref.value.entity.src && !!ref.value.entity.alt.trim());
      return ready ? <InlineReference key={partIndex} text={ref.value.text} entity={ref.value.entity} />
        : <span key={partIndex}>{ref?.value.text || part}</span>;
    })}</p>
  )}</div>;
}

export function ReviewEditor({ value, onChange, photos, storefront = false }: { value: ReviewForm; onChange: (value: ReviewForm) => void; photos: Photo[]; storefront?: boolean }) {
  const [activeSection, setActiveSection] = useState<Section>('about');
  const [editingRef, setEditingRef] = useState<string | null>(null);
  const editors = useRef<Record<Section, HTMLTextAreaElement | null>>({ about: null, pros: null, cons: null });
  const nextRef = useRef(0);
  const visibleSections = storefront ? [{ key: 'about' as const, label: 'I am forfeiting' }] : sections;

  function add(kind: 'location' | 'image', section: Section) {
    const editor = editors.current[section];
    const start = editor?.selectionStart ?? value[section].length;
    const end = editor?.selectionEnd ?? start;
    const selected = value[section].slice(start, end).trim();
    const label = selected || (kind === 'location' ? 'Place' : 'Photo');
    const key = `ref${Date.now().toString(36)}${(nextRef.current++).toString(36)}`;
    const entry: RefEntry = {
      key,
      value: {
        text: label,
        entity: kind === 'location'
          ? { kind, name: selected || '', city: '', latitude: 47.6062, longitude: -122.3321, zoom: 14 }
          : { kind, src: photos[0]?.src || '', alt: photos[0]?.alt || '', caption: '', width: 1200, height: 1200 },
      },
    };
    const token = marker(key);
    onChange({ ...value, refs: [...value.refs, entry], [section]: value[section].slice(0, start) + token + value[section].slice(end) });
    setActiveSection(section);
    setEditingRef(key);
    requestAnimationFrame(() => {
      editor?.focus();
      editor?.setSelectionRange(start + token.length, start + token.length);
    });
  }

  function edit(key: string, entry: RefEntry) {
    onChange({ ...value, refs: value.refs.map(ref => ref.key === key ? entry : ref) });
  }

  function remove(ref: RefEntry) {
    const replace = (text: string) => text.replaceAll(marker(ref.key), ref.value.text);
    onChange({ ...value, refs: value.refs.filter(entry => entry.key !== ref.key), about: replace(value.about), pros: replace(value.pros), cons: replace(value.cons) });
    setEditingRef(null);
  }

  return <fieldset className={styles.reviewEditor}>
    <legend>Review</legend>
    {!storefront && <label className="check"><input type="checkbox" checked={value.enabled} onChange={event => onChange({ ...value, enabled: event.target.checked })} />Include a review</label>}
    {(storefront || value.enabled) && <>
      <p className={styles.help}>Write naturally and separate paragraphs with a blank line. Select a word or phrase, then attach a photo or place to give it a hover preview.</p>
      {visibleSections.map(({ key, label }) => <section className={styles.section} key={key}>
        <div className={styles.sectionHeader}><h3>{label}</h3><span>{value[key].trim().length} characters</span></div>
        <div className={styles.editorBar} aria-label={`${label} editing tools`}>
          <button type="button" onClick={() => add('image', key)}>+ Image hover</button>
          <button type="button" onClick={() => add('location', key)}>+ Place hover</button>
        </div>
        <label className={styles.textLabel}><span className={styles.visuallyHidden}>{label} text</span>
          <textarea ref={element => { editors.current[key] = element; }} rows={6} value={value[key]} onFocus={() => setActiveSection(key)} onChange={event => onChange({ ...value, [key]: event.target.value })} placeholder={`Write what follows “${label}…”`} />
        </label>
        <div className={styles.preview} aria-label={`${label} preview`}><span className={styles.previewLabel}>Preview · hover or tap a reference</span><ReviewPreview text={value[key]} refs={value.refs} leadIn={key === 'cons' ? 'Only notes:' : label} storefront={storefront} singleParagraph={!storefront && key !== 'about'} /></div>
      </section>)}
      {value.refs.length > 0 && <section className={styles.references} aria-label="Hover references">
        <h3>Hover references</h3><p>These details appear when someone hovers or taps highlighted text.</p>
        {value.refs.map(ref => {
          const entity = ref.value.entity;
          const isOpen = editingRef === ref.key;
          return <div className={styles.reference} key={ref.key}>
            <button type="button" className={styles.referenceToggle} aria-expanded={isOpen} onClick={() => setEditingRef(isOpen ? null : ref.key)}><span>{entity.kind === 'image' ? 'Image' : 'Place'} · {ref.value.text}</span><span>{isOpen ? '−' : '+'}</span></button>
            {isOpen && <div className={styles.referenceFields}>
              <label>Highlighted text<input value={ref.value.text} onChange={event => edit(ref.key, { ...ref, value: { ...ref.value, text: event.target.value } })} /></label>
              {entity.kind === 'image' ? <>
                <label>Image<select value={entity.src} onChange={event => {
                  const photo = photos.find(photo => photo.src === event.target.value);
                  edit(ref.key, { ...ref, value: { ...ref.value, entity: { ...entity, src: event.target.value, alt: photo?.alt || entity.alt } } });
                }}><option value="">Choose an uploaded image</option>{!photos.some(photo => photo.src === entity.src) && entity.src && <option value={entity.src}>Existing reference image</option>}{photos.map((photo, index) => <option key={photo.src} value={photo.src}>{photo.alt || `Photo ${index + 1}`}</option>)}</select></label>
                <label>Image description<input value={entity.alt} onChange={event => edit(ref.key, { ...ref, value: { ...ref.value, entity: { ...entity, alt: event.target.value } } })} /></label>
                <label>Caption<input value={entity.caption} onChange={event => edit(ref.key, { ...ref, value: { ...ref.value, entity: { ...entity, caption: event.target.value } } })} /></label>
              </> : <>
                <label>Place name<input value={entity.name} onChange={event => edit(ref.key, { ...ref, value: { ...ref.value, entity: { ...entity, name: event.target.value } } })} /></label>
                <label>City, country<input value={entity.city} onChange={event => edit(ref.key, { ...ref, value: { ...ref.value, entity: { ...entity, city: event.target.value } } })} /></label>
                <div className={styles.coordinates}>{(['latitude', 'longitude', 'zoom'] as const).map(field => <label key={field}>{field}<input type="number" step="any" value={entity[field]} onChange={event => edit(ref.key, { ...ref, value: { ...ref.value, entity: { ...entity, [field]: Number(event.target.value) } } })} /></label>)}</div>
              </>}
              <button type="button" onClick={() => remove(ref)}>Remove hover, keep text</button>
            </div>}
          </div>;
        })}
      </section>}
      <span className={styles.visuallyHidden}>Current section: {activeSection}</span>
    </>}
  </fieldset>;
}
