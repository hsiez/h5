import type { StorefrontItemProps } from './storefront-item';

export const storefrontItemSample = {
  title: 'Prototype cap',
  story: 'I got this cap while working at Reforge. It reminds me of a team I loved and the kind of work I want to keep doing.',
  reason: 'I reach for a different cap now, so I would rather pass this one on to someone who will wear it. Tell me what you are making over coffee.',
  photos: [
    { src: '/api/catalog/media?pathname=catalog%2F0491b12e-1261-42a3-917d-915cb06d8f79-JwYdhSMzT7AN4pRh8kwl1GhTypAUBO.png', alt: 'Black Prototype cap, front view' },
    { src: '/api/catalog/media?pathname=catalog%2Fa10806a5-3ccc-4ad4-aeaf-897cdded03b4-nTjjUHjdgBjdbVRF5opDnQoB7hCkEA.png', alt: 'Illustrated study of the Prototype cap' },
  ],
  size: 'One size; adjustable strap',
  condition: 'Worn, with some fading',
  measurements: [
    { label: 'Brim', value: '2.75 in' },
    { label: 'Crown', value: '6 in' },
  ],
  owner: {
    name: 'Alex',
    coffeeStory: 'We met for coffee in Seattle and talked about the things we are each making. This is sample copy for the claimed state.',
  },
} satisfies Omit<StorefrontItemProps, 'status' | 'initialAction' | 'initialSubmission'>;
