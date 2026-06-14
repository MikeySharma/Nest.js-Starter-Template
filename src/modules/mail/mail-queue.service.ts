import { InjectQueue } from '@nestjs/bullmq';
import { Injectable } from '@nestjs/common';
import { Queue } from 'bullmq';
import {
  EMAIL_QUEUE,
  SEND_VERIFICATION_EMAIL_JOB,
  SendVerificationEmailJob,
} from './types/mail.types';

@Injectable()
export class MailQueueService {
  constructor(
    @InjectQueue(EMAIL_QUEUE) private readonly emailQueue: Queue,
  ) {}

  async enqueueVerificationEmail(
    data: SendVerificationEmailJob,
  ): Promise<void> {
    await this.emailQueue.add(SEND_VERIFICATION_EMAIL_JOB, data);
  }
}
