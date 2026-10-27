import type { Meta, StoryObj } from '@storybook/nextjs-vite';
import { useState } from 'react';
import { PaperFrame } from '../../app/_components/paper-frame';
import styles from './storefront-gallery-indicator.module.css';

type Direction = 'quiet' | 'framed' | 'button' | 'dots';

const directions: { id: Direction; name: string; description: string }[] = [
  { id: 'quiet', name: 'Quiet dots', description: 'Keep the current circular arrows; replace the count with dots.' },
  { id: 'framed', name: 'Popup frame', description: 'Framed dots below the image. Click either half of the photo to move through it.' },
  { id: 'button', name: 'Button surface', description: 'Use the layered charcoal treatment from the claim button for the active position.' },
  { id: 'dots', name: 'Dots only', description: 'Let the dots handle navigation, with no arrows.' },
];

function IndicatorPreview({ direction }: { direction: Direction }) {
  const [index, setIndex] = useState(0);
  const count = 3;
  const dots = <div className={styles.dots} role="group" aria-label="Choose item photo">
    {Array.from({ length: count }, (_, dot) => <button key={dot} type="button"
      className={styles.dot} aria-label={`Show photo ${dot + 1}`} aria-current={index === dot ? 'true' : undefined}
      onClick={() => setIndex(dot)} />)}
  </div>;

  return <div className={styles.preview}>
    <div className={styles.photo} aria-live="polite">
      <span className={styles.photoNumber}>0{index + 1}</span>
      <span className={styles.photoCaption}>Item photo {index + 1} of {count}</span>
      {direction === 'framed' && <div className={styles.photoZones}>
        <button type="button" aria-label="Previous photo" onClick={() => setIndex((index + count - 1) % count)} />
        <button type="button" aria-label="Next photo" onClick={() => setIndex((index + 1) % count)} />
      </div>}
    </div>
    <div className={`${styles.controls} ${styles[direction]}`} aria-label="Item photos">
      {direction !== 'dots' && direction !== 'framed' && <button className={styles.arrow} type="button" aria-label="Previous photo" onClick={() => setIndex((index + count - 1) % count)}>←</button>}
      {direction === 'framed'
        ? <PaperFrame className={styles.dotFrame} elevation="popover">{dots}</PaperFrame>
        : dots}
      {direction !== 'dots' && direction !== 'framed' && <button className={styles.arrow} type="button" aria-label="Next photo" onClick={() => setIndex((index + 1) % count)}>→</button>}
    </div>
  </div>;
}

function Gallery({ direction }: { direction?: Direction }) {
  return <main className={styles.gallery}>
    <h1>Item photo indicators</h1>
    <p className={styles.intro}>Four ways to replace “1 / 2” with dots. Use the arrows or dots to try each state.</p>
    <div className={styles.grid}>
      {directions.filter(option => !direction || option.id === direction).map(option => <section className={styles.option} key={option.id}>
        <div className={styles.heading}><h2>{option.name}</h2><p>{option.description}</p></div>
        <IndicatorPreview direction={option.id} />
      </section>)}
    </div>
  </main>;
}

const meta = {
  title: 'Composites/Storefront Gallery Indicator',
  component: Gallery,
  parameters: { layout: 'fullscreen' },
  argTypes: { direction: { control: 'select', options: [undefined, ...directions.map(option => option.id)] } },
} satisfies Meta<typeof Gallery>;

export default meta;
type Story = StoryObj<typeof meta>;

export const AllDirections: Story = {};
export const QuietDots: Story = { args: { direction: 'quiet' } };
export const PopupFrame: Story = { args: { direction: 'framed' } };
export const ButtonSurface: Story = { args: { direction: 'button' } };
export const DotsOnly: Story = { args: { direction: 'dots' } };
