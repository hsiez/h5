import { storefrontEmailLayout } from './email-layout';

type ClaimEmailInput = {
  title: string;
  imageUrl: string | null;
  schedulingUrl: string;
  cancelUrl: string;
};

export function claimEmail(input: ClaimEmailInput) {
  return {
    subject: `Finish claiming this ${input.title.toLowerCase()}`,
    ...storefrontEmailLayout({
      title: input.title,
      imageUrl: input.imageUrl,
      heading: 'One coffee away',
      prompt: `Schedule a coffee chat to finish claiming this ${input.title.toLowerCase()}.`,
      actionLabel: 'Schedule coffee',
      actionUrl: input.schedulingUrl,
      footer: 'This personal link expires in one hour. A booking request does not guarantee the item.',
      footerLink: { label: 'Cancel your request', url: input.cancelUrl },
    }),
  };
}
