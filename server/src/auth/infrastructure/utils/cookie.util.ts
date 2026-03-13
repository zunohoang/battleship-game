import type { Response } from 'express';
import type { ConfigService } from '@nestjs/config';

type CookieSameSite = 'lax' | 'strict' | 'none';

function parseBoolean(value: string): boolean {
  return value.toLowerCase() === 'true';
}

export function getRefreshCookieName(configService: ConfigService): string {
  return configService.getOrThrow<string>('REFRESH_TOKEN_COOKIE_NAME');
}

function getCookieOptions(configService: ConfigService) {
  const maxAgeText = configService.getOrThrow<string>(
    'REFRESH_TOKEN_COOKIE_MAX_AGE_MS',
  );
  const maxAge = Number(maxAgeText);
  if (!Number.isFinite(maxAge) || maxAge <= 0) {
    throw new Error(
      'REFRESH_TOKEN_COOKIE_MAX_AGE_MS must be a positive number',
    );
  }

  const secure = parseBoolean(
    configService.getOrThrow<string>('COOKIE_SECURE'),
  );

  const sameSite = configService
    .getOrThrow<string>('COOKIE_SAME_SITE')
    .toLowerCase() as CookieSameSite;

  if (!['lax', 'strict', 'none'].includes(sameSite)) {
    throw new Error('COOKIE_SAME_SITE must be one of: lax, strict, none');
  }

  const path = configService.getOrThrow<string>('COOKIE_PATH');
  const domain = configService.get<string>('COOKIE_DOMAIN');

  return {
    httpOnly: true,
    secure,
    sameSite,
    path,
    maxAge,
    domain,
  } as const;
}

export function setRefreshCookie(
  res: Response,
  token: string,
  configService: ConfigService,
): void {
  res.cookie(
    getRefreshCookieName(configService),
    token,
    getCookieOptions(configService),
  );
}

export function clearRefreshCookie(
  res: Response,
  configService: ConfigService,
): void {
  const options = getCookieOptions(configService);
  res.clearCookie(getRefreshCookieName(configService), {
    httpOnly: true,
    secure: options.secure,
    sameSite: options.sameSite,
    path: options.path,
    domain: options.domain,
  });
}
