import type { Viewport } from 'next';
import { ViewTransition } from 'react';
import { HistoryTrace } from './history-trace';
// Allow decorative page content beneath translucent browser chrome.
export const viewport: Viewport = { viewportFit: 'cover' };

export default function ThingsLayout({ children, item }: Readonly<{ children: React.ReactNode; item: React.ReactNode }>) {
  return <ViewTransition
    enter={{ 'claim-forward': 'claim-forward', 'claim-back': 'claim-back', default: 'none' }}
    exit={{ 'claim-forward': 'claim-forward', 'claim-back': 'claim-back', default: 'none' }}
    default="none"
  ><div data-things-background>{children}</div>{item}<HistoryTrace /></ViewTransition>;
}
