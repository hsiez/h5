import type { Meta, StoryObj } from '@storybook/nextjs-vite';
import { useState } from 'react';
import { StorefrontItem } from '../../app/things-for-you/storefront-item';
import { MobileClaimPage } from '../../app/things/claim/[slug]/mobile-claim-page';
import { NotifyFooterForm } from '../../app/things/notify-footer-form';
import footerStyles from '../../app/things/item-navigation.module.css';
import { storefrontItemSample } from '../../app/things-for-you/storefront-item-sample';

const meta: Meta<typeof StorefrontItem> = {
  title: 'Composites/Storefront Item',
  component: StorefrontItem,
  parameters: { layout: 'fullscreen' },
  render: args => <StorefrontItem key={`${args.status}-${args.initialAction}-${args.initialSubmission}`} {...args} />,
  argTypes: {
    status: { control: 'select', options: ['available', 'pending', 'reserved', 'claimed'] },
    initialAction: { control: 'select', options: [null, 'claim', 'notify'] },
    initialSubmission: { control: 'select', options: ['idle', 'loading', 'success', 'error'] },
  },
};

export default meta;
type Story = StoryObj<typeof StorefrontItem>;

const item = storefrontItemSample;

function NotifyFooterPreview() {
  const [open, setOpen] = useState(true);
  return <main style={{ minHeight: '100svh', background: '#f4f4f1', padding: 24 }}>
    <p>Reserved item · notification footer preview</p>
    <nav className={footerStyles.navigation} data-notify-open={open || undefined} aria-label="Item navigation">
      {open ? <NotifyFooterForm slug="storybook-preview-only" onClose={() => setOpen(false)} /> : <button type="button" onClick={() => setOpen(true)}>Notify me</button>}
    </nav>
  </main>;
}

export const Available: Story = { args: { ...item, status: 'available' } };
export const WithInlineStory: Story = { args: { ...item, status: 'available', storyParts: [['this cap because it deserves to be worn more often.']], story: 'This cap deserves to be worn more often.' } };
export const ClaimEmailInput: Story = { args: { ...Available.args, initialAction: 'claim' } };
export const MobileClaimBaseline: Story = { args: { ...ClaimEmailInput.args }, render: args => <MobileClaimPage title={args.title} />, parameters: { docs: { description: { story: 'Standalone claim page, shown with a simulated submit. View at mobile width.' } } } };
export const MobileNotifyBaseline: Story = { args: { ...item, status: 'pending' }, render: args => <MobileClaimPage title={args.title} action="notify" />, parameters: { docs: { description: { story: 'Standalone notification page with Cancel beside Submit request. Uses a simulated submit and sends no email.' } } } };
export const MobileNotifyFooter: Story = { args: { ...item, status: 'reserved' }, render: () => <NotifyFooterPreview />, parameters: { docs: { description: { story: 'The actual mobile notify footer with shared form styles. Uses a nonexistent preview item; no email is sent. View at mobile width.' } } } };
export const SendingClaimEmail: Story = { args: { ...ClaimEmailInput.args, initialSubmission: 'loading' } };
export const ClaimEmailSent: Story = { args: { ...ClaimEmailInput.args, initialSubmission: 'success', initialEmail: 'you@example.com' } };
export const ClaimEmailError: Story = { args: { ...ClaimEmailInput.args, initialSubmission: 'error' } };
export const Pending: Story = { args: { ...item, status: 'pending' } };
export const NotifyEmailInput: Story = { args: { ...Pending.args, initialAction: 'notify' } };
export const Reserved: Story = { args: { ...item, status: 'reserved' } };
export const Claimed: Story = { args: { ...item, status: 'claimed' } };

export const MobileEmailSent: Story = {
  args: { ...ClaimEmailInput.args },
  render: args => <MobileClaimPage title={args.title} initialState="sent" initialEmail="you@gmail.com" />,
  parameters: { docs: { description: { story: 'Email sent confirmation with an inbox search link and copyable subject. Sends no email.' } } },
};
