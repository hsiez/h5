import type { PaperResult } from "./types";

const FONT_STACK =
  '-apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, sans-serif';
const SERIF_STACK = 'Georgia, "Times New Roman", serif';
const BG = "#ffffff";
const TEXT_PRIMARY = "#141414";
const TEXT_SECONDARY = "#4f4f4f";
const TEXT_TERTIARY = "#707070";
const ACCENT = "#2563eb";
const BORDER = "rgba(20, 20, 20, 0.08)";
const SURFACE_MUTED = "#fafafa";

function layout(body: string, preheader: string): string {
  return `<!DOCTYPE html>
<html lang="en">
<head>
  <meta charset="utf-8" />
  <meta name="viewport" content="width=device-width, initial-scale=1" />
  <meta name="color-scheme" content="light" />
  <meta name="supported-color-schemes" content="light" />
  <title>Calm Papers</title>
</head>
<body style="margin:0;padding:0;background:${BG};font-family:${FONT_STACK};color:${TEXT_PRIMARY};-webkit-font-smoothing:antialiased;">
  <span style="display:none;font-size:1px;color:${BG};max-height:0;overflow:hidden;mso-hide:all;">${preheader}${"&#847; &zwnj; ".repeat(40)}</span>
  <table role="presentation" width="100%" cellpadding="0" cellspacing="0" style="background:${BG};">
    <tr>
      <td align="center" style="padding:48px 24px;">
        <table role="presentation" width="100%" cellpadding="0" cellspacing="0" style="max-width:560px;">
          ${body}
        </table>
      </td>
    </tr>
  </table>
</body>
</html>`;
}

export function confirmationEmail(confirmUrl: string): { html: string; text: string } {
  const html = layout(
    `<tr>
      <td style="padding-bottom:32px;">
        <p style="margin:0;font-family:${SERIF_STACK};font-size:24px;font-weight:600;color:${TEXT_PRIMARY};">
          Calm Papers
        </p>
      </td>
    </tr>
    <tr>
      <td style="padding-bottom:24px;">
        <p style="margin:0;font-size:16px;line-height:1.5;color:${TEXT_PRIMARY};">
          Confirm your email to start receiving daily summaries of the top research papers on HuggingFace.
        </p>
      </td>
    </tr>
    <tr>
      <td style="padding-bottom:32px;">
        <a href="${confirmUrl}" style="display:inline-block;padding:12px 24px;background:${ACCENT};color:#ffffff;font-size:14px;font-weight:500;text-decoration:none;border-radius:8px;">
          Confirm subscription
        </a>
      </td>
    </tr>
    <tr>
      <td>
        <p style="margin:0;font-size:14px;line-height:1.5;color:${TEXT_TERTIARY};">
          If you didn't sign up, you can safely ignore this email.
        </p>
      </td>
    </tr>`,
    "Confirm your Calm Papers subscription"
  );

  const text = `Calm Papers\n\nConfirm your email to start receiving daily paper summaries.\n\n${confirmUrl}\n\nIf you didn't sign up, ignore this email.`;

  return { html, text };
}

function paperRow(paper: PaperResult, siteUrl: string, date: string): string {
  const authorsText = paper.authors.length > 3
    ? paper.authors.slice(0, 3).join(", ") + ` +${paper.authors.length - 3}`
    : paper.authors.join(", ");

  const abstractSnippet = paper.abstract.length > 200
    ? paper.abstract.slice(0, 200).trimEnd() + "…"
    : paper.abstract;

  const paperUrl = `${siteUrl}/papers/${date}`;

  return `<tr>
    <td style="padding:24px;background:${SURFACE_MUTED};border-radius:8px;border:1px solid ${BORDER};">
      <p style="margin:0 0 4px;font-family:${SERIF_STACK};font-size:18px;font-weight:600;line-height:1.4;color:${TEXT_PRIMARY};">
        <a href="${paperUrl}" style="color:${TEXT_PRIMARY};text-decoration:none;">${escapeHtml(paper.title)}</a>
      </p>
      <p style="margin:0 0 12px;font-family:${SERIF_STACK};font-size:14px;color:${TEXT_TERTIARY};">
        ${escapeHtml(authorsText)}
      </p>
      <p style="margin:0;font-size:14px;line-height:1.6;color:${TEXT_SECONDARY};">
        ${escapeHtml(abstractSnippet)}
      </p>
    </td>
  </tr>`;
}

export function digestEmail(
  papers: PaperResult[],
  date: string,
  siteUrl: string,
  unsubscribeUrl: string
): { html: string; text: string } {
  const formattedDate = formatDate(date);
  const paperRows = papers
    .map((p) => paperRow(p, siteUrl, date))
    .join('<tr><td style="height:16px;"></td></tr>');

  const html = layout(
    `<tr>
      <td style="padding-bottom:8px;">
        <p style="margin:0;font-family:${SERIF_STACK};font-size:24px;font-weight:600;color:${TEXT_PRIMARY};">
          Calm Papers
        </p>
      </td>
    </tr>
    <tr>
      <td style="padding-bottom:32px;">
        <p style="margin:0;font-size:14px;color:${TEXT_TERTIARY};">
          ${formattedDate} · Top 5 research papers on 🤗
        </p>
      </td>
    </tr>
    ${paperRows}
    <tr><td style="height:32px;"></td></tr>
    <tr>
      <td align="center">
        <a href="${siteUrl}/papers/${date}" style="display:inline-block;padding:12px 24px;background:${ACCENT};color:#ffffff;font-size:14px;font-weight:500;text-decoration:none;border-radius:8px;">
          Read on site
        </a>
      </td>
    </tr>
    <tr><td style="height:48px;"></td></tr>
    <tr>
      <td style="border-top:1px solid ${BORDER};padding-top:24px;">
        <p style="margin:0;font-size:14px;color:${TEXT_TERTIARY};text-align:center;">
          <a href="${unsubscribeUrl}" style="color:${TEXT_TERTIARY};text-decoration:underline;">Unsubscribe</a>
        </p>
      </td>
    </tr>`,
    papers.map((p) => p.title).join(" · ")
  );

  const paperTexts = papers
    .map(
      (p, i) =>
        `${i + 1}. ${p.title}\n   ${p.authors.slice(0, 3).join(", ")}\n   ${p.abstract.slice(0, 150).trimEnd()}…`
    )
    .join("\n\n");

  const text = `Calm Papers — ${formattedDate}\n\n${paperTexts}\n\nRead on site: ${siteUrl}/papers/${date}\n\nUnsubscribe: ${unsubscribeUrl}`;

  return { html, text };
}

function escapeHtml(s: string): string {
  return s
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;");
}

function formatDate(dateStr: string): string {
  const [year, month, day] = dateStr.split("-").map(Number);
  const d = new Date(year, month - 1, day);
  return d.toLocaleDateString("en-US", {
    weekday: "long",
    month: "long",
    day: "numeric",
    year: "numeric",
  });
}
