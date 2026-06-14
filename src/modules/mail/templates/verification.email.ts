export interface VerificationEmailParams {
  name?: string | null;
  email: string;
  verifyUrl: string;
  expiresIn: string;
}

export function buildVerificationEmail({
  name,
  email,
  verifyUrl,
  expiresIn,
}: VerificationEmailParams): { subject: string; html: string; text: string } {
  const greeting = name?.trim() ? `Hi ${name},` : 'Hi,';

  const html = `<!DOCTYPE html>
<html lang="en">
<head>
  <meta charset="UTF-8" />
  <title>Verify your email</title>
</head>
<body style="font-family: Arial, sans-serif; line-height: 1.6; color: #111827; max-width: 560px; margin: 0 auto; padding: 24px;">
  <h1 style="font-size: 24px; margin-bottom: 16px;">Verify your email</h1>
  <p>${greeting}</p>
  <p>Thanks for signing up for Unlocked. Please confirm your email address to activate your account.</p>
  <p style="margin: 32px 0;">
    <a href="${verifyUrl}" style="background: #2563eb; color: #ffffff; padding: 12px 20px; text-decoration: none; border-radius: 6px; display: inline-block;">
      Verify email
    </a>
  </p>
  <p>If the button does not work, copy and paste this link into your browser:</p>
  <p style="word-break: break-all;"><a href="${verifyUrl}">${verifyUrl}</a></p>
  <p style="color: #6b7280; font-size: 14px;">This link expires in ${expiresIn}.</p>
  <p style="color: #6b7280; font-size: 14px;">If you did not create an account, you can ignore this email.</p>
</body>
</html>`;

  const text = `${greeting}

Thanks for signing up for Unlocked. Verify your email address by visiting:
${verifyUrl}

This link expires in ${expiresIn}.

If you did not create an account, you can ignore this email.`;

  return {
    subject: 'Verify your email — Unlocked',
    html,
    text,
  };
}
