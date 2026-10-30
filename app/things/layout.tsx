import { ViewTransition } from 'react';

export default function ThingsLayout({ children }: Readonly<{ children: React.ReactNode }>) {
  return <ViewTransition
    enter={{ 'claim-forward': 'claim-forward', 'claim-back': 'claim-back', default: 'none' }}
    exit={{ 'claim-forward': 'claim-forward', 'claim-back': 'claim-back', default: 'none' }}
    default="none"
  >{children}</ViewTransition>;
}
