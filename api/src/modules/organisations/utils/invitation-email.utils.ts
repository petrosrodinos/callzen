import { OrgRole } from 'generated/prisma';

export const escapeHtml = (value: string): string =>
  value.replace(
    /[&<>"']/g,
    (char) =>
      ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' })[
        char
      ] as string,
  );

const ROLE_LABELS: Record<OrgRole, string> = {
  OWNER: 'an owner',
  ADMIN: 'an admin',
  MEMBER: 'a member',
};

interface InvitationEmailInput {
  inviterName: string;
  organisationName: string;
  role: OrgRole;
  url: string;
}

// Values must already be HTML-escaped by the caller (the URL is built from a hex token and the configured app URL).
export const renderInvitationEmail = ({
  inviterName,
  organisationName,
  role,
  url,
}: InvitationEmailInput): string => `<!doctype html>
<html lang="en">
  <body style="margin:0;padding:24px;background:#f8fafc;font-family:'Segoe UI',Roboto,Arial,sans-serif;color:#111827;">
    <div style="max-width:560px;margin:auto;background:#ffffff;border-radius:12px;overflow:hidden;box-shadow:0 4px 12px rgba(0,0,0,0.08);">
      <div style="background:#4f46e5;color:#ffffff;padding:20px 28px;font-size:20px;font-weight:600;">CallZen</div>
      <div style="padding:28px;">
        <h1 style="margin:0 0 12px;font-size:20px;">You're invited to ${organisationName}</h1>
        <p style="margin:0 0 20px;line-height:1.55;">${inviterName} invited you to join <strong>${organisationName}</strong> on CallZen as ${ROLE_LABELS[role]}.</p>
        <p style="margin:0 0 24px;"><a href="${url}" style="background:#4f46e5;color:#ffffff;text-decoration:none;padding:12px 22px;border-radius:8px;font-weight:600;display:inline-block;">Accept invitation</a></p>
        <p style="margin:0;font-size:13px;color:#6b7280;line-height:1.5;">This link expires in 7 days. If the button doesn't work, paste this address into your browser:<br />${url}</p>
      </div>
    </div>
  </body>
</html>`;
