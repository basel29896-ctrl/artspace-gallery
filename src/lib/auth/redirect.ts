/**
 * Only same-origin relative paths may be used as a post-login destination.
 *
 * An unchecked `next` parameter is an open redirect: an attacker sends
 * /login?next=https://evil.example, the user authenticates for real, and is
 * then handed to a phishing page still trusting the flow they started.
 * Protocol-relative `//evil.example` and backslash variants must be rejected too.
 */
export function safeRedirectPath(next: string | null | undefined, fallback = '/'): string {
  if (!next) return fallback;

  // Reject anything that is not a plain relative path.
  if (!next.startsWith('/')) return fallback;
  if (next.startsWith('//') || next.startsWith('/\\')) return fallback;
  if (next.includes('\\')) return fallback;

  // Control characters can be used to smuggle a scheme past naive checks.
  // eslint-disable-next-line no-control-regex
  if (/[\u0000-\u001f\u007f]/.test(next)) return fallback;

  return next;
}
