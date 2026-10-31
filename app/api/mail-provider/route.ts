import { resolveMx } from 'node:dns/promises';

export const runtime = 'nodejs';

export async function GET(request: Request) {
  const domain = new URL(request.url).searchParams.get('domain')?.toLowerCase() ?? '';
  if (!/^(?:[a-z0-9](?:[a-z0-9-]{0,61}[a-z0-9])?\.)+[a-z]{2,63}$/.test(domain)) {
    return Response.json({ provider: null }, { status: 400 });
  }
  try {
    const hosts = (await resolveMx(domain)).map(record => record.exchange.toLowerCase());
    const matches = (suffix: string) => hosts.some(host => host === suffix || host.endsWith(`.${suffix}`));
    const provider = matches('google.com') || matches('googlemail.com')
      ? { name: 'Gmail', url: 'https://mail.google.com/mail/u/0/' }
      : matches('protection.outlook.com') || matches('olc.protection.outlook.com')
        ? { name: 'Outlook', url: 'https://outlook.office.com/mail/' }
        : matches('icloud.com') ? { name: 'iCloud Mail', url: 'https://www.icloud.com/mail/' }
          : matches('yahoodns.net') ? { name: 'Yahoo Mail', url: 'https://mail.yahoo.com/' }
            : matches('protonmail.ch') || matches('protonmail.com') ? { name: 'Proton Mail', url: 'https://mail.proton.me/' }
              : null;
    return Response.json({ provider });
  } catch {
    return Response.json({ provider: null });
  }
}
