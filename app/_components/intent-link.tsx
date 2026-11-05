'use client';

import Link from 'next/link';
import { useState, type ComponentProps } from 'react';

// Next.js's documented hover-prefetch pattern, also enabled by keyboard focus.
export function IntentLink(props: Omit<ComponentProps<typeof Link>, 'prefetch'>) {
  const [active, setActive] = useState(false);
  return <Link {...props} prefetch={active ? null : false}
    onMouseEnter={event => { setActive(true); props.onMouseEnter?.(event); }}
    onFocus={event => { setActive(true); props.onFocus?.(event); }} />;
}
