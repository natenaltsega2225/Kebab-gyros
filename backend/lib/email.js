import nodemailer from 'nodemailer';
function transporter() {
  if (!process.env.SMTP_HOST || !process.env.SMTP_USER || !process.env.SMTP_PASSWORD) {
    throw new Error('SMTP is not configured');
  }
  return nodemailer.createTransport({
    host: process.env.SMTP_HOST,
    port: Number(process.env.SMTP_PORT || 587),
    secure: String(process.env.SMTP_SECURE).toLowerCase() === 'true',
    auth: { user: process.env.SMTP_USER, pass: process.env.SMTP_PASSWORD }
  });
}
export async function sendTemporaryCredentials({ email, username, temporaryPassword }) {
  await transporter().sendMail({
    from: process.env.SMTP_FROM,
    to: email,
    subject: 'Your Kebab Gyros admin account',
    text: `Your username is ${username}. Your temporary password is ${temporaryPassword}. Sign in and change your password immediately.`,
    html: `<p>Your admin account is ready.</p><p><strong>Username:</strong> ${username}</p><p><strong>Temporary password:</strong> ${temporaryPassword}</p><p>You must change this password at first sign-in.</p>`
  });
}
export async function sendPasswordReset({ email, username, resetUrl }) {
  await transporter().sendMail({
    from: process.env.SMTP_FROM,
    to: email,
    subject: 'Reset your Kebab Gyros admin password',
    text: `Hello ${username}, reset your password using this link: ${resetUrl}`,
    html: `<p>Hello ${username},</p><p>Use this one-time link to reset your password:</p><p><a href="${resetUrl}">${resetUrl}</a></p><p>This link expires soon and can be used once.</p>`
  });
}
