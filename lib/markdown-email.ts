import { marked } from "marked";

marked.setOptions({ gfm: true, breaks: true });

const EMAIL_CSS = `
  body { font-family: -apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, Helvetica, Arial, sans-serif; font-size: 15px; line-height: 1.6; color: #1e293b; margin: 0; padding: 0; background: #f8fafc; }
  .wrap { max-width: 640px; margin: 0 auto; padding: 24px 16px; }
  .card { background: #ffffff; border: 1px solid #e2e8f0; border-radius: 8px; padding: 24px 28px; }
  h1 { font-size: 1.35rem; margin: 0 0 1rem; color: #0f172a; }
  h2 { font-size: 1.15rem; margin: 1.5rem 0 0.75rem; color: #0f172a; border-bottom: 1px solid #e2e8f0; padding-bottom: 0.35rem; }
  h3 { font-size: 1rem; margin: 1.25rem 0 0.5rem; color: #334155; }
  p { margin: 0 0 0.85rem; }
  ul, ol { margin: 0 0 1rem; padding-left: 1.35rem; }
  li { margin: 0.25rem 0; }
  a { color: #2563eb; text-decoration: underline; }
  code { font-size: 0.9em; background: #f1f5f9; padding: 0.15em 0.35em; border-radius: 4px; }
  pre { background: #f1f5f9; padding: 12px 14px; border-radius: 6px; overflow-x: auto; font-size: 13px; }
  blockquote { margin: 0 0 1rem; padding-left: 1rem; border-left: 3px solid #cbd5e1; color: #475569; }
  hr { border: none; border-top: 1px solid #e2e8f0; margin: 1.5rem 0; }
`;

/** Render report markdown as a styled HTML email body (inline CSS for mail clients). */
export function markdownToEmailHtml(markdown: string): string {
  const body = marked.parse(markdown, { async: false }) as string;
  return `<!DOCTYPE html>
<html lang="en">
<head><meta charset="utf-8"><meta name="viewport" content="width=device-width"><style>${EMAIL_CSS}</style></head>
<body>
  <div class="wrap"><div class="card">${body}</div></div>
</body>
</html>`;
}
