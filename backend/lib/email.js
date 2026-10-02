import nodemailer from 'nodemailer';

const BRAND = 'Kebab Gyros';

function transporter() {
  if (!process.env.SMTP_HOST || !process.env.SMTP_USER || !process.env.SMTP_PASSWORD) throw new Error('SMTP is not configured');
  return nodemailer.createTransport({ host: process.env.SMTP_HOST, port: Number(process.env.SMTP_PORT || 587), secure: String(process.env.SMTP_SECURE).toLowerCase() === 'true', auth: { user: process.env.SMTP_USER, pass: process.env.SMTP_PASSWORD } });
}

function escapeHtml(value) {
  return String(value).replace(/[&<>"']/g, (character) => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' })[character]);
}

function emailLayout({ heading, greeting, instructions, actionUrl, actionLabel, details, footer }) {
  return `<!doctype html><html><body style="margin:0;padding:0;background:#eef2f1;font-family:Arial,Helvetica,sans-serif;color:#19313a"><table role="presentation" width="100%" cellspacing="0" cellpadding="0" border="0" style="background:#eef2f1"><tr><td align="center" style="padding:24px 12px"><table role="presentation" width="100%" cellspacing="0" cellpadding="0" border="0" style="max-width:560px;background:#ffffff;border:1px solid #d7e0de;border-radius:12px;overflow:hidden"><tr><td style="padding:22px 28px;background:#062b3a;color:#ffffff;font-size:22px;font-weight:700">${BRAND}</td></tr><tr><td style="padding:28px"><h1 style="margin:0 0 16px;color:#062b3a;font-size:24px;line-height:1.3">${escapeHtml(heading)}</h1><p style="margin:0 0 14px;font-size:16px;line-height:1.55">${escapeHtml(greeting)}</p><p style="margin:0 0 20px;font-size:16px;line-height:1.55">${escapeHtml(instructions)}</p>${details}<table role="presentation" cellspacing="0" cellpadding="0" border="0" style="margin:0 0 22px"><tr><td style="border-radius:6px;background:#087fa3"><a href="${escapeHtml(actionUrl)}" style="display:inline-block;padding:12px 18px;color:#ffffff;font-size:16px;font-weight:700;text-decoration:none">${escapeHtml(actionLabel)}</a></td></tr></table><p style="margin:0;color:#52656a;font-size:13px;line-height:1.5">${escapeHtml(footer)}</p></td></tr><tr><td style="padding:16px 28px;border-top:1px solid #d7e0de;color:#52656a;font-size:12px;line-height:1.5">If you did not expect this email, contact your Kebab Gyros administrator. Do not share credentials or reset links.</td></tr></table></td></tr></table></body></html>`;
}

function appUrl() { return `${(process.env.ADMIN_APP_URL || 'http://localhost:3000').replace(/\/$/, '')}/admin`; }
function passwordSetupUrl() { return `${(process.env.ADMIN_APP_URL || 'http://localhost:3000').replace(/\/$/, '')}/admin/set-password`; }

export function resetTokenExpiryMinutes() {
  const minutes = Number(process.env.RESET_TOKEN_MINUTES || 30);
  return Number.isFinite(minutes) && minutes > 0 ? Math.floor(minutes) : 30;
}

export async function sendTemporaryCredentials({ email, username, temporaryPassword }) {
  const details = `<table role="presentation" width="100%" cellspacing="0" cellpadding="0" border="0" style="margin:0 0 22px;border:1px solid #d7e0de;background:#f7faf9"><tr><td style="padding:14px;font-size:14px;line-height:1.6"><strong>Username:</strong> ${escapeHtml(username)}<br><strong>Temporary password:</strong> ${escapeHtml(temporaryPassword)}</td></tr></table>`;
  await transporter().sendMail({
    from: process.env.SMTP_FROM, to: email, subject: 'Your Kebab Gyros admin account',
    text: `Hello ${username},\n\nYour Kebab Gyros admin account is ready.\nUsername: ${username}\nTemporary password: ${temporaryPassword}\n\nSet your password at ${passwordSetupUrl()}.\n\nDo not share these credentials.`,
    html: emailLayout({ heading: 'Your admin account is ready', greeting: `Hello ${username},`, instructions: 'Use the temporary credentials below to set your password. You will be required to change it before accessing admin tools.', actionUrl: passwordSetupUrl(), actionLabel: 'Set your password', details, footer: 'For your security, set a new password before accessing the admin portal.' }),
  });
}

export async function sendPasswordReset({ email, username, resetUrl, expiresInMinutes = resetTokenExpiryMinutes() }) {
  await transporter().sendMail({
    from: process.env.SMTP_FROM, to: email, subject: 'Reset your Kebab Gyros admin password',
    text: `Hello ${username},\n\nUse this one-time link to reset your Kebab Gyros admin password:\n${resetUrl}\n\nThis link expires in ${expiresInMinutes} minutes and can be used once. Existing sessions will be revoked after a successful reset.\n\nIf you did not request this, you can ignore this email.`,
    html: emailLayout({ heading: 'Reset your password', greeting: `Hello ${username},`, instructions: 'Use the one-time link below to choose a new password.', actionUrl: resetUrl, actionLabel: 'Reset password', details: '', footer: `This link expires in ${expiresInMinutes} minutes and can be used once. Existing sessions will be revoked after a successful reset.` }),
  });
}
