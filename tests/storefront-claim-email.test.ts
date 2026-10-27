import { describe, expect, it } from 'vitest';
import { claimEmail } from '../lib/storefront/claim-email-template';
import { absoluteEmailPhotoUrl, absolutePhotoUrl, availabilityAlertEmail } from '../lib/storefront/email';

describe('claim email', () => {
  it('uses the personal scheduling link and safely renders item details in HTML and plain text', () => {
    const message = claimEmail({
      title: 'Cap & <co.>',
      imageUrl: 'https://h5.codes/api/catalog/media?pathname=catalog%2Fphoto.webp&size=large',
      logoUrl: 'https://h5.codes/brand/h5-email-logo.png',
      schedulingUrl: 'https://h5.codes/api/storefront/claim-link/personal?item=cap&source=email',
    });

    expect(message.subject).toBe("Let's get you this cap & <co.>");
    expect(message.html).toContain("Let's get you this<br>cap &amp; &lt;co.&gt;</td>");
    expect(message.html).toContain('alt="Cap &amp; &lt;co.&gt;"');
    expect(message.html).toContain('src="https://h5.codes/brand/h5-email-logo.png" alt="h5"');
    expect(message.html).toContain('href="https://h5.codes/api/storefront/claim-link/personal?item=cap&amp;source=email"');
    expect(message.html).not.toContain('https://cal.com/');
    expect(message.text).toContain('https://h5.codes/api/storefront/claim-link/personal?item=cap&source=email');
  });
});

describe('claim email photo URL', () => {
  it('serves a private catalog photo through the catalog media endpoint', () => {
    const pathname = 'catalog/0491b12e-1261-42a3-917d-915cb06d8f79-JwYdhSMzT7AN4pRh8kwl1GhTypAUBO.png';
    expect(absolutePhotoUrl(pathname, new URL('https://h5.codes'))).toBe(
      `https://h5.codes/api/catalog/media?pathname=${encodeURIComponent(pathname)}`,
    );
    expect(absolutePhotoUrl(`/api/catalog/media?pathname=${encodeURIComponent(pathname)}`, new URL('https://h5.codes'))).toBe(
      `https://h5.codes/api/catalog/media?pathname=${encodeURIComponent(pathname)}`,
    );
    expect(absolutePhotoUrl('//other.example/photo.png', new URL('https://h5.codes'))).toBeNull();
    expect(absoluteEmailPhotoUrl(pathname, new URL('https://h5.codes'))).toBe(
      `https://h5.codes/api/catalog/media?pathname=${encodeURIComponent(pathname)}&email=1`,
    );
  });
});

describe('availability alert plain text', () => {
  it('separates the claim link and unsubscribe link with real paragraph breaks', () => {
    const link = 'https://h5.codes/api/storefront/claim-link/personal';
    const message = availabilityAlertEmail('Cap', link, 'https://h5.codes/unsubscribe');
    expect(message.text).toContain(`${link}\n\nThe link expires`);
    expect(message.text).toContain('item.\n\nStop availability alerts');
    expect(message.text).not.toContain('\\n');
  });
});
