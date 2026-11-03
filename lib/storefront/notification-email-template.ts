import { storefrontEmailLayout } from './email-layout';

type NotificationEmailInput = {
  title: string;
  imageUrl: string | null;
  verificationUrl: string;
};

export function notificationConfirmationEmail(input: NotificationEmailInput) {
  return {
    subject: 'Confirm your availability notification',
    ...storefrontEmailLayout({
      title: input.title,
      imageUrl: input.imageUrl,
      heading: 'Get notified',
      prompt: `Verify your email to receive an alert if ${input.title} becomes available again.`,
      actionLabel: 'Verify email',
      actionUrl: input.verificationUrl,
      footer: 'This link expires in one hour. This is not a waitlist or a reservation. Ignore this email if you did not request it.',
    }),
  };
}
