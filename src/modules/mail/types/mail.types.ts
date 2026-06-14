export const EMAIL_QUEUE = 'email';

export const SEND_VERIFICATION_EMAIL_JOB = 'send-verification';

export interface SendVerificationEmailJob {
  to: string;
  name?: string | null;
  verifyUrl: string;
  expiresIn: string;
}
