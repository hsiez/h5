import { describe, expect, it } from 'vitest';
import { createHmac } from 'node:crypto';
import { verifyCalSignature } from '../lib/storefront/cal-signature';

describe('Cal webhook authentication', () => {
  it('accepts only the HMAC of the unmodified raw body', () => {
    const raw='{"triggerEvent":"BOOKING_REQUESTED"}';
    const signature=createHmac('sha256','test-secret').update(raw).digest('hex');
    expect(verifyCalSignature(raw,signature,'test-secret')).toBe(true);
    expect(verifyCalSignature(raw,null,'test-secret')).toBe(false);
    expect(verifyCalSignature(raw+' ',signature,'test-secret')).toBe(false);
    expect(verifyCalSignature(raw,signature,'different-secret')).toBe(false);
  });
});
