import { markdownToEmailHtml } from "@/lib/markdown-email";
import { graphFetch, requireGraphSenderUpn } from "@/lib/microsoft-graph";

function escapeHtml(s: string): string {
  return s
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;");
}

async function sendMailViaGraph(opts: {
  to: string[];
  subject: string;
  text: string;
  html: string;
}): Promise<void> {
  const sender = requireGraphSenderUpn();
  const response = await graphFetch(
    `/users/${encodeURIComponent(sender)}/sendMail`,
    {
      method: "POST",
      body: JSON.stringify({
        message: {
          subject: opts.subject,
          body: { contentType: "HTML", content: opts.html },
          toRecipients: opts.to.map((address) => ({
            emailAddress: { address },
          })),
        },
        saveToSentItems: true,
      }),
    }
  );
  if (!response.ok) {
    const text = await response.text().catch(() => "");
    throw new Error(`Graph Mail.Send failed (${response.status}): ${text}`);
  }
}

export async function sendEmaileeViaGraph(opts: {
  to: string[];
  markdown: string;
  agentName: string;
}): Promise<void> {
  const html = markdownToEmailHtml(opts.markdown);
  await sendMailViaGraph({
    to: opts.to,
    subject: `NewsAgent Intelligence Report: ${opts.agentName}`,
    text: opts.markdown,
    html,
  });
}

export async function sendReviewerViaGraph(opts: {
  to: string[];
  agentName: string;
  markdown: string;
  approveUrl: string;
  emaileeCount: number;
}): Promise<void> {
  const recipientNote =
    opts.emaileeCount === 1
      ? "1 recipient"
      : `${opts.emaileeCount} recipients (including distribution groups)`;

  const html = `
<!DOCTYPE html>
<html lang="en">
<head><meta charset="utf-8"></head>
<body style="font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif; line-height: 1.6; color: #1e293b; max-width: 640px; margin: 0 auto; padding: 24px;">
  <p style="font-size: 15px;">A new intelligence report for <strong>${escapeHtml(opts.agentName)}</strong> is ready for your review.</p>
  <p style="font-size: 14px; color: #475569;">If it looks accurate, approve to send to <strong>${recipientNote}</strong>. Outlook and Microsoft 365 distribution group addresses are supported.</p>
  <p style="margin: 28px 0;">
    <a href="${escapeHtml(opts.approveUrl)}" style="display: inline-block; background: #2563eb; color: #fff; text-decoration: none; padding: 12px 24px; border-radius: 8px; font-weight: 600;">Approve &amp; send to emailees</a>
  </p>
  <hr style="border: none; border-top: 1px solid #e2e8f0; margin: 24px 0;" />
  <div style="font-size: 14px;">${markdownToEmailHtml(opts.markdown)}</div>
</body>
</html>`;

  const text = [
    `Review required: ${opts.agentName}`,
    "",
    `Approve to send to ${recipientNote}:`,
    opts.approveUrl,
    "",
    "---",
    opts.markdown,
  ].join("\n");

  await sendMailViaGraph({
    to: opts.to,
    subject: `[Review required] ${opts.agentName}`,
    text,
    html,
  });
}
