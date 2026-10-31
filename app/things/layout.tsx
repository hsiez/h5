import { ViewTransition } from 'react';
import { ThingsMotion } from '../loadout/things-motion';
export default function ThingsLayout({ children }: Readonly<{ children: React.ReactNode }>) {
  return <ThingsMotion><ViewTransition
    enter={{ 'claim-forward': 'claim-forward', 'claim-back': 'claim-back', default: 'none' }}
    exit={{ 'claim-forward': 'claim-forward', 'claim-back': 'claim-back', default: 'none' }}
    default="none"
  >{children}</ViewTransition></ThingsMotion>;
}
