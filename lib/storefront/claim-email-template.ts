type ClaimEmailInput = {
  title: string;
  imageUrl: string | null;
  logoUrl: string;
  schedulingUrl: string;
};

function escapeHtml(value: string) {
  return value.replace(/[&<>"']/g, char => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' })[char]!);
}

export function claimEmail(input: ClaimEmailInput) {
  const title = escapeHtml(input.title);
  const headingTitle = escapeHtml(input.title.toLowerCase());
  const schedulingUrl = escapeHtml(input.schedulingUrl);
  const subject = `Let's get you this ${input.title.toLowerCase()}`;
  const image = input.imageUrl
    ? `<tr><td align="center" style="padding:24px 24px 36px;"><img src="${escapeHtml(input.imageUrl)}" alt="${title}" width="360" style="display:block;width:100%;max-width:360px;height:auto;border:0;" /></td></tr>`
    : '';

  const html = `<!doctype html>
<html lang="en"><head><meta charset="utf-8"><meta name="viewport" content="width=device-width,initial-scale=1"><title>${title}</title></head>
<body style="margin:0;padding:0;background:#ffffff;color:#222222;font-family:Arial,Helvetica,sans-serif;">
  <div style="display:none;font-size:1px;line-height:1px;color:#ffffff;max-height:0;max-width:0;opacity:0;overflow:hidden;">Harley is waiting for a coffee chat.</div>
  <table role="presentation" cellpadding="0" cellspacing="0" border="0" width="100%" style="border-collapse:collapse;background:#ffffff;"><tr><td align="center" style="padding:32px 16px 48px;">
    <table role="presentation" cellpadding="0" cellspacing="0" border="0" width="100%" style="border-collapse:collapse;max-width:560px;">
      <tr><td align="left" style="padding:14px 0;"><img src="${escapeHtml(input.logoUrl)}" alt="h5" width="56" height="21" style="display:block;width:56px;height:21px;border:0;" /></td></tr>
      <tr><td style="background:#f4f4f1;border-radius:12px;">
        <table role="presentation" cellpadding="0" cellspacing="0" border="0" width="100%" style="border-collapse:collapse;">
          <tr><td align="left" style="padding:24px 24px 0;font-family:Georgia,'Times New Roman',serif;font-size:36px;line-height:1.15;font-weight:normal;letter-spacing:-.03em;">Let's get you this<br>${headingTitle}</td></tr>
          ${image}
        </table>
      </td></tr>
      <tr><td align="left" style="padding:32px 24px 0;font-family:Georgia,'Times New Roman',serif;font-size:24px;line-height:1.3;">Harley is waiting for a coffee chat.</td></tr>
      <tr><td align="left" style="padding:12px 24px 0;"><a href="${schedulingUrl}" style="display:inline-block;padding:15px 24px;border:1px solid #202020;border-radius:7px;background-color:#383838;background-image:linear-gradient(145deg,#242424,#505050);box-shadow:inset 0 1px 0 rgba(255,255,255,.3),inset 0 -1px 1px rgba(0,0,0,.22),0 2px 3px rgba(20,20,20,.12),0 8px 14px -8px rgba(20,20,20,.28);color:#ffffff;font-family:Arial,Helvetica,sans-serif;font-size:15px;font-weight:500;line-height:1.2;text-decoration:none;text-shadow:0 1px 1px rgba(0,0,0,.25);">Schedule</a></td></tr>
      <tr><td align="left" style="padding:20px 24px 0;color:#777777;font-size:12px;line-height:1.5;">This personal link expires in 48 hours. A booking request does not guarantee the item.</td></tr>
    </table>
  </td></tr></table>
</body></html>`;

  const text = `Let's get you this ${input.title.toLowerCase()}\n\nHarley is waiting for a coffee chat.\n\nSchedule: ${input.schedulingUrl}\n\nThis personal link expires in 48 hours. A booking request does not guarantee the item.`;
  return { subject, html, text };
}
