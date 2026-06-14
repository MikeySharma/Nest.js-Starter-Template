import { Processor, WorkerHost } from '@nestjs/bullmq';
import { Logger } from '@nestjs/common';
import { Job } from 'bullmq';
import { buildVerificationEmail } from './templates/verification.email';
import { MailService } from './mail.service';
import {
  EMAIL_QUEUE,
  SEND_VERIFICATION_EMAIL_JOB,
  SendVerificationEmailJob,
} from './types/mail.types';

@Processor(EMAIL_QUEUE)
export class MailProcessor extends WorkerHost {
  private readonly logger = new Logger(MailProcessor.name);

  constructor(private readonly mailService: MailService) {
    super();
  }

  async process(job: Job<SendVerificationEmailJob>): Promise<void> {
    if (job.name !== SEND_VERIFICATION_EMAIL_JOB) {
      this.logger.warn(`Unknown job name: ${job.name}`);
      return;
    }

    const { to, name, verifyUrl, expiresIn } = job.data;
    const { subject, html, text } = buildVerificationEmail({
      email: to,
      name,
      verifyUrl,
      expiresIn,
    });

    await this.mailService.sendMail({ to, subject, html, text });
  }
}
