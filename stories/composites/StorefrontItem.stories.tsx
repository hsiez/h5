import type { Meta, StoryObj } from '@storybook/nextjs-vite';
import { StorefrontItem } from '../../app/things-for-you/storefront-item';
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

export const Available: Story = { args: { ...item, status: 'available' } };
export const ClaimEmailInput: Story = { args: { ...Available.args, initialAction: 'claim' } };
export const SendingClaimEmail: Story = { args: { ...ClaimEmailInput.args, initialSubmission: 'loading' } };
export const ClaimEmailSent: Story = { args: { ...ClaimEmailInput.args, initialSubmission: 'success' } };
export const ClaimEmailError: Story = { args: { ...ClaimEmailInput.args, initialSubmission: 'error' } };
export const Pending: Story = { args: { ...item, status: 'pending' } };
export const NotifyEmailInput: Story = { args: { ...Pending.args, initialAction: 'notify' } };
export const Reserved: Story = { args: { ...item, status: 'reserved' } };
export const Claimed: Story = { args: { ...item, status: 'claimed' } };
