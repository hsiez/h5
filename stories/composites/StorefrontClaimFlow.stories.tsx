import type { Meta, StoryObj } from '@storybook/nextjs-vite';
import { useState } from 'react';
import { StorefrontItem, type StorefrontItemProps } from '../../app/things-for-you/storefront-item';
import { storefrontItemSample } from '../../app/things-for-you/storefront-item-sample';

const phases = ['Available', 'Email entry', 'Ready to submit', 'Sending', 'Error', 'Success'] as const;
type Phase = (typeof phases)[number];

const previewEmail = 'you@example.com';
const phaseProps: Record<Phase, Pick<StorefrontItemProps, 'initialAction' | 'initialSubmission' | 'initialEmail' | 'initialAcknowledged' | 'initialError'>> = {
  Available: { initialAction: null, initialSubmission: 'idle' },
  'Email entry': { initialAction: 'claim', initialSubmission: 'idle' },
  'Ready to submit': { initialAction: 'claim', initialSubmission: 'idle', initialEmail: previewEmail, initialAcknowledged: true },
  Sending: { initialAction: 'claim', initialSubmission: 'loading', initialEmail: previewEmail, initialAcknowledged: true },
  Error: { initialAction: 'claim', initialSubmission: 'error', initialEmail: previewEmail, initialAcknowledged: true, initialError: 'Email is unavailable right now. Please try again later.' },
  Success: { initialAction: 'claim', initialSubmission: 'success', initialEmail: previewEmail, initialAcknowledged: true },
};

function StorefrontClaimFlow({ phase }: { phase: Phase }) {
  const [enteredEmail, setEnteredEmail] = useState('');
  return <StorefrontItem key={phase} {...storefrontItemSample} status="available" {...phaseProps[phase]}
    initialEmail={enteredEmail || phaseProps[phase].initialEmail || ''} onClaimEmailChange={setEnteredEmail} />;
}

const meta = {
  title: 'Composites/Storefront Claim Flow',
  component: StorefrontClaimFlow,
  parameters: {
    layout: 'fullscreen',
    docs: { description: { story: 'Use the Phase control to cycle through the claim flow. An address entered in Email entry carries into the later states. The preview sends no email.' } },
  },
  argTypes: { phase: { control: 'select', options: phases } },
} satisfies Meta<typeof StorefrontClaimFlow>;

export default meta;
type Story = StoryObj<typeof meta>;

export const StateMachine: Story = { args: { phase: 'Available' } };
