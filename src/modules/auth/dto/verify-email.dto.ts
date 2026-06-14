import { ApiProperty } from '@nestjs/swagger';
import { IsString, MinLength } from 'class-validator';

export class VerifyEmailQueryDto {
  @ApiProperty({
    example: 'a1b2c3d4e5f6...',
    description: 'Email verification token from the verification link',
  })
  @IsString()
  @MinLength(32)
  token: string;
}
