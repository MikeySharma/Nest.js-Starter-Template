import { JwtService } from '@nestjs/jwt';
import type { Response } from 'express';

export const ACCESS_TOKEN_COOKIE = 'access_token';
export const REFRESH_TOKEN_COOKIE = 'refresh_token';

const cookieOptions = {
  httpOnly: true,
  secure: process.env.NODE_ENV === 'production',
  sameSite: 'lax' as const,
  path: '/',
};

function getMaxAgeFromToken(jwtService: JwtService, token: string): number {
  const decoded = jwtService.decode(token) as { exp?: number } | null;

  if (!decoded?.exp) {
    return 0;
  }

  return Math.max(0, decoded.exp * 1000 - Date.now());
}

export function setAuthCookies(
  res: Response,
  jwtService: JwtService,
  accessToken: string,
  refreshToken: string,
): void {
  res.cookie(ACCESS_TOKEN_COOKIE, accessToken, {
    ...cookieOptions,
    maxAge: getMaxAgeFromToken(jwtService, accessToken),
  });

  res.cookie(REFRESH_TOKEN_COOKIE, refreshToken, {
    ...cookieOptions,
    maxAge: getMaxAgeFromToken(jwtService, refreshToken),
  });
}

export function clearAuthCookies(res: Response): void {
  res.clearCookie(ACCESS_TOKEN_COOKIE, { path: '/' });
  res.clearCookie(REFRESH_TOKEN_COOKIE, { path: '/' });
}
