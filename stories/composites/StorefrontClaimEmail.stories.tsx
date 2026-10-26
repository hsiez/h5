import type { Meta, StoryObj } from '@storybook/nextjs-vite';
import { claimEmail } from '../../lib/storefront/claim-email-template';

const sampleImage = new URL('../../db/assets/catalog/hat.png', import.meta.url).href;
const logo = new URL('../../public/brand/h5-email-logo.png', import.meta.url).href;

function StorefrontClaimEmail({ title, imageUrl }: { title: string; imageUrl: string }) {
  const message = claimEmail({
    title,
    imageUrl,
    logoUrl: logo,
    schedulingUrl: 'https://h5.codes/api/storefront/claim-link/sample-preview-link',
  });

  return <div style={{ minHeight: '100vh', padding: '32px 16px', background: '#e9e9e6', fontFamily: 'Arial, sans-serif' }}>
    <div style={{ maxWidth: 640, margin: '0 auto' }}>
      <p style={{ margin: '0 0 8px', fontSize: 13, color: '#666' }}>Subject: {message.subject}</p>
      <iframe title="Claim email preview" srcDoc={message.html} style={{ display: 'block', width: '100%', height: 900, border: 0, background: '#fff' }} />
    </div>
  </div>;
}

const meta = {
  title: 'Composites/Storefront Claim Email',
  component: StorefrontClaimEmail,
  parameters: { layout: 'fullscreen', docs: { description: { story: 'Preview only. The scheduling button uses a sample link and sends no email.' } } },
  args: { title: 'Prototype cap', imageUrl: sampleImage },
  argTypes: { title: { control: 'text' }, imageUrl: { control: 'text' } },
} satisfies Meta<typeof StorefrontClaimEmail>;

export default meta;
type Story = StoryObj<typeof meta>;
export const FirstDraft: Story = {};
