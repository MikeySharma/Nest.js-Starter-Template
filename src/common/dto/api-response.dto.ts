import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';
import { Role } from '@prisma/client';

export class UserResponseDto {
  @ApiProperty({ example: 'clxyz123abc' })
  id: string;

  @ApiProperty({ example: 'user@example.com' })
  email: string;

  @ApiPropertyOptional({ example: 'John Doe' })
  name?: string;

  @ApiProperty({ enum: Role, example: Role.USER })
  role: Role;

  @ApiPropertyOptional({ example: '2026-06-14T12:00:00.000Z' })
  emailVerifiedAt?: Date | null;

  @ApiProperty({ example: '2026-06-14T12:00:00.000Z' })
  createdAt: Date;

  @ApiProperty({ example: '2026-06-14T12:00:00.000Z' })
  updatedAt: Date;
}

export class AuthResponseDto {
  @ApiProperty({ type: UserResponseDto })
  user: UserResponseDto;
}

export class RegisterResponseDto {
  @ApiProperty({ type: UserResponseDto })
  user: UserResponseDto;

  @ApiProperty({
    example:
      'Registration successful. Please check your email to verify your account.',
  })
  message: string;
}

export class HealthResponseDto {
  @ApiProperty({ example: 'ok' })
  status: string;

  @ApiProperty({ example: 'NestJS + Prisma boilerplate is running' })
  message: string;
}
