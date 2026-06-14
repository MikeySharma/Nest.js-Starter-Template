import { User } from '@prisma/client';

export type SafeUser = Omit<User, 'password'>;

export interface AccessJwtPayload {
  sub: string;
  email: string;
  role: string;
  type: 'access';
}

export interface RefreshJwtPayload {
  sub: string;
  email: string;
  role: string;
  type: 'refresh';
  jti: string;
}

export interface TokenPairResponse {
  user: SafeUser;
  access_token: string;
  refresh_token: string;
}

export interface RegisterResponse {
  user: SafeUser;
  message: string;
}
