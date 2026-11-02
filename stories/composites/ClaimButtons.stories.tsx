import type { Meta, StoryObj } from '@storybook/nextjs-vite';
import buttons from '../../app/things-for-you/storefront-item.module.css';
import frame from '../../app/_components/paper-frame.module.css';
import footer from '../../app/things/item-navigation.module.css';
import styles from './claim-buttons.module.css';

function ClaimButtons() {
  return <main className={styles.page}>
    <h1>Claim and notification buttons</h1>
    <p>Same 44px height and 16px radius as the mobile footer.</p>
    {(['primary', 'secondary', 'paper'] as const).map(variant => <section key={variant}>
      <h2>{variant === 'primary' ? 'Primary · current Claim' : variant === 'secondary' ? 'Secondary · existing flat outline' : 'Secondary · paper-style exploration'}</h2>
      <div className={footer.row}>
        <button type="button" className={`${frame.frame} ${frame.popover} ${styles.back}`}><span aria-hidden="true">‹</span> Back</button>
        <button type="button" className={`${variant === 'primary' ? buttons.primaryButton : variant === 'secondary' ? buttons.secondaryButton : `${frame.frame} ${frame.popover} ${styles.paper}`} ${footer.claim}`}>
          {variant === 'primary' && <span className={buttons.buttonGrain} aria-hidden="true" />}
          <span className={buttons.buttonLabel}>{variant === 'primary' ? 'Claim for 1 coffee' : 'Notify me'}</span>
        </button>
      </div>
    </section>)}
  </main>;
}
const meta = { title: 'Composites/Claim Buttons', component: ClaimButtons, parameters: { layout: 'fullscreen' } } satisfies Meta<typeof ClaimButtons>;
export default meta;
type Story = StoryObj<typeof meta>;
export const Comparison: Story = {};
