import { randomBytes } from 'crypto';
import {
  BadRequestException,
  Injectable,
  UnauthorizedException,
} from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { hashToken } from '../../common/utils/hash-token.util';
import { parseDurationToMs } from '../../common/utils/parse-duration.util';
import { MailQueueService } from '../mail/mail-queue.service';
import { PrismaService } from '../prisma/prisma.service';
import { SafeUser } from './types/auth.types';

@Injectable()
export class EmailVerificationService {
  constructor(
    private readonly prisma: PrismaService,
    private readonly configService: ConfigService,
    private readonly mailQueueService: MailQueueService,
  ) {}

  async createAndSendVerification(user: SafeUser): Promise<void> {
    const rawToken = randomBytes(32).toString('hex');
    const tokenHash = hashToken(rawToken);
    const expiresAt = this.getVerificationExpiryDate();

    await this.prisma.emailVerificationToken.updateMany({
      where: {
        userId: user.id,
        usedAt: null,
      },
      data: {
        usedAt: new Date(),
      },
    });

    await this.prisma.emailVerificationToken.create({
      data: {
        userId: user.id,
        tokenHash,
        expiresAt,
      },
    });

    const verifyUrl = this.buildVerifyUrl(rawToken);

    await this.mailQueueService.enqueueVerificationEmail({
      to: user.email,
      name: user.name,
      verifyUrl,
      expiresIn: this.configService.get<string>('emailVerification.expiresIn')!,
    });
  }

  async verifyEmail(rawToken: string): Promise<SafeUser> {
    const tokenHash = hashToken(rawToken);

    const storedToken = await this.prisma.emailVerificationToken.findUnique({
      where: { tokenHash },
      include: { user: true },
    });

    if (
      !storedToken ||
      storedToken.usedAt ||
      storedToken.expiresAt <= new Date()
    ) {
      throw new UnauthorizedException('Invalid verification token');
    }

    if (storedToken.user.emailVerifiedAt) {
      throw new BadRequestException('Email is already verified');
    }

    const [updatedUser] = await this.prisma.$transaction([
      this.prisma.user.update({
        where: { id: storedToken.userId },
        data: { emailVerifiedAt: new Date() },
      }),
      this.prisma.emailVerificationToken.update({
        where: { id: storedToken.id },
        data: { usedAt: new Date() },
      }),
    ]);

    const { password: _, ...safeUser } = updatedUser;
    return safeUser;
  }

  async resendVerification(email: string): Promise<void> {
    const user = await this.prisma.user.findUnique({ where: { email } });

    if (!user) {
      return;
    }

    if (user.emailVerifiedAt) {
      throw new BadRequestException('Email is already verified');
    }

    const cooldownSeconds = this.configService.get<number>(
      'emailVerification.resendCooldownSeconds',
    )!;
    const cooldownStart = new Date(Date.now() - cooldownSeconds * 1000);

    const recentToken = await this.prisma.emailVerificationToken.findFirst({
      where: {
        userId: user.id,
        createdAt: { gte: cooldownStart },
      },
      orderBy: { createdAt: 'desc' },
    });

    if (recentToken) {
      throw new BadRequestException(
        'Verification email was sent recently. Please try again later.',
      );
    }

    const { password: _, ...safeUser } = user;
    await this.createAndSendVerification(safeUser);
  }

  ensureVerified(user: SafeUser): void {
    if (!user.emailVerifiedAt) {
      throw new UnauthorizedException('Email not verified');
    }
  }

  private buildVerifyUrl(rawToken: string): string {
    const appUrl = this.configService.get<string>('appUrl')!;
    return `${appUrl}/auth/verify-email?token=${rawToken}`;
  }

  private getVerificationExpiryDate(): Date {
    const expiresIn = this.configService.get<string>(
      'emailVerification.expiresIn',
    )!;

    return new Date(Date.now() + parseDurationToMs(expiresIn));
  }
}
