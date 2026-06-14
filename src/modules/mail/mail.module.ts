import { BullModule } from '@nestjs/bullmq';
import { Module } from '@nestjs/common';
import { MailProcessor } from './mail.processor';
import { MailQueueService } from './mail-queue.service';
import { MailService } from './mail.service';
import { EMAIL_QUEUE } from './types/mail.types';

@Module({
  imports: [
    BullModule.registerQueue({
      name: EMAIL_QUEUE,
      defaultJobOptions: {
        attempts: 5,
        backoff: {
          type: 'exponential',
          delay: 5000,
        },
        removeOnComplete: true,
        removeOnFail: false,
      },
    }),
  ],
  providers: [MailService, MailProcessor, MailQueueService],
  exports: [MailQueueService],
})
export class MailModule {}
