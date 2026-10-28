type ClaimEmailInput = {
  title: string;
  imageUrl: string | null;
  schedulingUrl: string;
  cancelUrl: string;
};

function escapeHtml(value: string) {
  return value.replace(/[&<>"']/g, char => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' })[char]!);
}

export function claimEmail(input: ClaimEmailInput) {
  const title = escapeHtml(input.title);
  const schedulingUrl = escapeHtml(input.schedulingUrl);
  const cancelUrl = escapeHtml(input.cancelUrl);
  const subject = `Finish claiming this ${input.title.toLowerCase()}`;
  const claimPrompt = `Schedule a coffee chat to finish claiming this ${input.title.toLowerCase()}.`;
  const visibleClaimPrompt = escapeHtml(claimPrompt).replace(/(\S+) (\S+\.)$/, '$1&nbsp;$2');
  const image = input.imageUrl
    ? `<tr><td align="center" bgcolor="#f4f4f1" style="padding:48px 16px 44px;background-color:#f4f4f1;"><img src="${escapeHtml(input.imageUrl)}" alt="${title}" width="460" style="display:block;width:100%;max-width:460px;height:auto;border:0;" /></td></tr>`
    : '';

  const html = `<!doctype html>
<html lang="en"><head><meta charset="utf-8"><meta name="viewport" content="width=device-width,initial-scale=1"><title>${title}</title></head>
<body style="margin:0;padding:0;background:#ffffff;color:#222222;font-family:Arial,Helvetica,sans-serif;">
  <div style="display:none;font-size:1px;line-height:1px;color:#ffffff;max-height:0;max-width:0;opacity:0;overflow:hidden;">${escapeHtml(claimPrompt)}</div>
  <table role="presentation" cellpadding="0" cellspacing="0" border="0" width="100%" bgcolor="#ffffff" style="border-collapse:collapse;background:#ffffff;"><tr><td align="center" style="padding:32px 16px 48px;">
    <table role="presentation" cellpadding="0" cellspacing="0" border="0" width="100%" style="border-collapse:collapse;max-width:560px;">
      <tr><td bgcolor="#f4f4f1" style="background:#f4f4f1;border-radius:12px;">
        <table role="presentation" cellpadding="0" cellspacing="0" border="0" width="100%" style="border-collapse:collapse;">
          <tr><td align="left" bgcolor="#f4f4f1" style="padding:24px 24px 0;background-color:#f4f4f1;color:#222222;font-family:Georgia,'Times New Roman',serif;font-size:36px;line-height:1.15;font-weight:normal;letter-spacing:-.03em;">One coffee away</td></tr>
          ${image}
        </table>
      </td></tr>
      <tr><td align="left" bgcolor="#ffffff" style="padding:32px 24px 0;background-color:#ffffff;color:#222222;font-family:Georgia,'Times New Roman',serif;font-size:20px;font-weight:normal;line-height:1.3;">${visibleClaimPrompt}</td></tr>
      <tr><td align="left" style="padding:24px 24px 0;">
        <table role="presentation" cellpadding="0" cellspacing="0" border="0" style="border-collapse:separate;border:1px solid #1e1e1e;border-radius:8px;">
          <tr><td bgcolor="#424242" style="background-color:#424242;border-top:2px solid #777777;border-left:1px solid #626262;border-right:1px solid #292929;border-bottom:2px solid #262626;border-radius:6px;">
            <a href="${schedulingUrl}" style="display:block;padding:12px 23px;color:#ffffff;font-family:Arial,Helvetica,sans-serif;font-size:15px;font-weight:600;line-height:20px;text-decoration:none;">Schedule coffee</a>
          </td></tr>
        </table>
      </td></tr>
      <tr><td style="padding:44px 24px 0;"><table role="presentation" cellpadding="0" cellspacing="0" border="0" width="100%"><tr><td height="1" bgcolor="#dededb" style="height:1px;font-size:1px;line-height:1px;background-color:#dededb;">&nbsp;</td></tr></table></td></tr>
      <tr><td align="left" style="padding:32px 24px 0;color:#767676;font-size:12px;line-height:1.5;">This personal link expires in 48 hours. A booking request does not guarantee the item. <a href="${cancelUrl}" style="color:#767676;text-decoration:underline;white-space:nowrap;">Cancel your request</a>.</td></tr>
    </table>
  </td></tr></table>
</body></html>`;

  const text = `One coffee away\n\n${claimPrompt}\n\nSchedule coffee: ${input.schedulingUrl}\n\nThis personal link expires in 48 hours. A booking request does not guarantee the item.\n\nCancel your request: ${input.cancelUrl}`;
  return { subject, html, text };
}
