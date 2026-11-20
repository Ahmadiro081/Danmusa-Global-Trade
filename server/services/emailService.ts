import { DEFAULT_RESEND_FROM_EMAIL, serverEnv } from '../config/env.ts';

export interface PasswordResetEmailParams {
  to: string;
  resetLink: string;
  recipientName?: string | null;
}

export type EmailDispatchResult =
  | { ok: true; id: string; provider: 'resend'; from: string }
  | {
      ok: false;
      status: number;
      code:
        | 'RESEND_NOT_CONFIGURED'
        | 'RESEND_TESTING_DOMAIN_LIMIT'
        | 'RESEND_AUTH_ERROR'
        | 'RESEND_RATE_LIMITED'
        | 'RESEND_DELIVERY_FAILED';
      error: string;
    };

export interface EmailService {
  isConfigured: () => boolean;
  getFromEmail: () => string;
  sendPasswordResetEmail: (
    params: PasswordResetEmailParams,
  ) => Promise<EmailDispatchResult>;
}

function escapeHtml(input: string): string {
  return input
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;')
    .replace(/'/g, '&#39;');
}

export function buildPasswordResetEmailContent(
  params: PasswordResetEmailParams,
): { subject: string; html: string; text: string } {
  const safeLink = escapeHtml(params.resetLink);
  const greetingName = params.recipientName?.trim()
    ? escapeHtml(params.recipientName.trim())
    : 'Valued Account Holder';

  const subject = 'Reset Your Danmusa Global Trade (DGT) Password';

  const html = `<!DOCTYPE html>
<html lang="en">
<head>
  <meta charset="UTF-8" />
  <meta name="viewport" content="width=device-width, initial-scale=1.0" />
  <title>${subject}</title>
</head>
<body style="margin:0;padding:0;background-color:#F5F7FA;font-family:Inter,-apple-system,BlinkMacSystemFont,'Segoe UI',Roboto,Helvetica,Arial,sans-serif;color:#202B38;">
  <table role="presentation" width="100%" cellspacing="0" cellpadding="0" style="background-color:#F5F7FA;padding:32px 16px;">
    <tr>
      <td align="center">
        <table role="presentation" width="100%" cellspacing="0" cellpadding="0" style="max-width:560px;background-color:#FFFFFF;border:1px solid #E2E8F0;border-radius:12px;overflow:hidden;">
          <tr>
            <td style="background-color:#10243A;padding:24px 32px;border-bottom:3px solid #F4A62A;">
              <p style="margin:0;font-size:11px;font-weight:700;letter-spacing:0.12em;text-transform:uppercase;color:#F4A62A;">
                Danmusa Global Trade (DGT)
              </p>
              <h1 style="margin:6px 0 0;font-size:20px;font-weight:800;line-height:1.3;color:#FFFFFF;">
                Password Reset Request
              </h1>
            </td>
          </tr>
          <tr>
            <td style="padding:32px;">
              <p style="margin:0 0 16px;font-size:15px;line-height:1.6;color:#202B38;">
                Hello ${greetingName},
              </p>
              <p style="margin:0 0 20px;font-size:14px;line-height:1.65;color:#475569;">
                We received a request to reset the password for your Danmusa Global Trade account. Click the secure button below to choose a new password.
              </p>
              <table role="presentation" cellspacing="0" cellpadding="0" style="margin:24px 0;">
                <tr>
                  <td align="center" style="border-radius:8px;background-color:#2563EB;">
                    <a href="${safeLink}" target="_blank" rel="noopener noreferrer" style="display:inline-block;padding:13px 26px;font-size:14px;font-weight:700;color:#FFFFFF;text-decoration:none;border-radius:8px;">
                      Reset Your Password
                    </a>
                  </td>
                </tr>
              </table>
              <p style="margin:0 0 12px;font-size:12px;line-height:1.6;color:#64748B;">
                For your security, this single-use link will expire automatically. If the button above does not open, copy and paste the URL below into your browser:
              </p>
              <p style="margin:0 0 24px;padding:12px;background-color:#F5F7FA;border:1px solid #E2E8F0;border-radius:8px;font-family:ui-monospace,SFMono-Regular,Menlo,Monaco,Consolas,monospace;font-size:11px;line-height:1.5;word-break:break-all;color:#10243A;">
                ${safeLink}
              </p>
              <div style="border-top:1px solid #E2E8F0;padding-top:16px;font-size:12px;line-height:1.6;color:#64748B;">
                <strong style="color:#10243A;">Did not request this reset?</strong><br />
                You can safely ignore this email. Your existing password remains unchanged and no account access has been granted.
              </div>
            </td>
          </tr>
          <tr>
            <td style="background-color:#F8FAFC;padding:18px 32px;border-top:1px solid #E2E8F0;text-align:center;font-size:11px;color:#64748B;">
              Danmusa Global Trade (DGT) &middot; Your Trusted China-to-Nigeria Trade Partner
            </td>
          </tr>
        </table>
      </td>
    </tr>
  </table>
</body>
</html>`;

  const text = [
    'Danmusa Global Trade (DGT) — Password Reset Request',
    '',
    `Hello ${params.recipientName?.trim() || 'Valued Account Holder'},`,
    '',
    'We received a request to reset the password for your Danmusa Global Trade account.',
    'Open the secure single-use link below to set a new password:',
    '',
    params.resetLink,
    '',
    'If you did not request a password reset, you can safely ignore this email.',
    'Your existing password will remain unchanged.',
    '',
    'Danmusa Global Trade (DGT) — Your Trusted China-to-Nigeria Trade Partner',
  ].join('\n');

  return { subject, html, text };
}

function getEffectiveResendApiKey(): string {
  const runtimeKey = (process.env.RESEND_API_KEY ?? serverEnv.resendApiKey).trim();
  if (!runtimeKey || runtimeKey.startsWith('MY_')) {
    return '';
  }
  return runtimeKey;
}

export function getEffectiveResendFromEmail(): string {
  const configured = (
    process.env.RESEND_FROM_EMAIL ?? serverEnv.resendFromEmail
  ).trim();
  return configured || DEFAULT_RESEND_FROM_EMAIL;
}

export function createResendEmailService(
  fetchImpl: typeof fetch = fetch,
): EmailService {
  return {
    isConfigured: () => Boolean(getEffectiveResendApiKey()),
    getFromEmail: () => getEffectiveResendFromEmail(),
    async sendPasswordResetEmail(
      params: PasswordResetEmailParams,
    ): Promise<EmailDispatchResult> {
      const apiKey = getEffectiveResendApiKey();
      if (!apiKey) {
        return {
          ok: false,
          status: 503,
          code: 'RESEND_NOT_CONFIGURED',
          error: 'Resend email delivery is not configured on the server.',
        };
      }

      const from = getEffectiveResendFromEmail();
      const { subject, html, text } = buildPasswordResetEmailContent(params);

      try {
        const response = await fetchImpl('https://api.resend.com/emails', {
          method: 'POST',
          headers: {
            Authorization: `Bearer ${apiKey}`,
            'Content-Type': 'application/json',
          },
          body: JSON.stringify({
            from,
            to: [params.to],
            subject,
            html,
            text,
          }),
        });

        const payload = (await response.json().catch(() => ({}))) as {
          id?: string;
          message?: string;
          name?: string;
        };

        if (response.ok && payload.id) {
          return {
            ok: true,
            id: payload.id,
            provider: 'resend',
            from,
          };
        }

        const msg = payload.message ?? `Resend API error (HTTP ${response.status})`;
        const lowerMsg = msg.toLowerCase();

        if (
          response.status === 403 &&
          (lowerMsg.includes('only send testing emails') ||
            lowerMsg.includes('verify a domain'))
        ) {
          return {
            ok: false,
            status: 403,
            code: 'RESEND_TESTING_DOMAIN_LIMIT',
            error:
              'Resend is currently using the default testing sender (onboarding@resend.dev), which only delivers to your own Resend account email address. Verify a custom domain in Resend and set RESEND_FROM_EMAIL to send password reset emails to all users.',
          };
        }

        if (response.status === 401) {
          return {
            ok: false,
            status: 502,
            code: 'RESEND_AUTH_ERROR',
            error:
              'Email service authentication failed. Verify the server RESEND_API_KEY configuration.',
          };
        }

        if (response.status === 429) {
          return {
            ok: false,
            status: 429,
            code: 'RESEND_RATE_LIMITED',
            error:
              'Email delivery quota temporarily reached. Please wait a few minutes and try again.',
          };
        }

        return {
          ok: false,
          status: 502,
          code: 'RESEND_DELIVERY_FAILED',
          error: 'Unable to dispatch the password reset email right now. Please try again shortly.',
        };
      } catch {
        return {
          ok: false,
          status: 502,
          code: 'RESEND_DELIVERY_FAILED',
          error:
            'Could not reach the email delivery service. Please try again in a moment.',
        };
      }
    },
  };
}

export const defaultEmailService: EmailService = createResendEmailService();
