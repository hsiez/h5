import type { Meta, StoryObj } from '@storybook/nextjs-vite';
import { claimEmail } from '../../lib/storefront/claim-email-template';

const sampleImage = new URL('../../db/assets/catalog/hat.png', import.meta.url).href;
const leatherJacketImage = new URL('../assets/american-eagle-leather-jacket-email.jpg', import.meta.url).href;
function StorefrontClaimEmail({ title, imageUrl, phoneWidth = false }: { title: string; imageUrl: string; phoneWidth?: boolean }) {
  const message = claimEmail({
    title,
    imageUrl,
    schedulingUrl: 'https://h5.codes/api/storefront/claim-link/sample-preview-link',
    cancelUrl: 'https://h5.codes/api/storefront/cancel/sample-preview-link',
  });

  return <div style={{ minHeight: '100vh', padding: '32px 16px', background: '#e9e9e6', fontFamily: 'Arial, sans-serif' }}>
    <div style={{ maxWidth: phoneWidth ? 390 : 640, margin: '0 auto' }}>
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
export const LeatherJacket: Story = { args: { title: 'Leather Jacket', imageUrl: leatherJacketImage } };
export const LeatherJacketRevision: Story = { args: { title: 'Leather Jacket', imageUrl: leatherJacketImage } };
export const LeatherJacketRevisionPhone: Story = { args: { title: 'Leather Jacket', imageUrl: leatherJacketImage, phoneWidth: true } };
