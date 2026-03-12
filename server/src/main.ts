import { BadRequestException, ValidationPipe } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { NestFactory } from '@nestjs/core';
import { NestExpressApplication } from '@nestjs/platform-express';
import cookieParser from 'cookie-parser';
import type { Request, Response } from 'express';
import { existsSync, mkdirSync } from 'node:fs';
import { join } from 'node:path';
import { AppModule } from './app.module';
import { HttpExceptionFilter } from './common/infrastructure/filters/http-exception.filter';
import { AppLoggerService } from './common/infrastructure/logger/app-logger.service';

const validationMessages: Record<string, string> = {
  INVALID_EMAIL: 'Invalid email address',
  USERNAME_REQUIRED: 'Username is required',
  USERNAME_TOO_LONG: 'Username must be at most 20 characters',
  USERNAME_INVALID_FORMAT: 'Username can only contain letters and numbers',
  PASSWORD_TOO_SHORT: 'Password must be at least 8 characters',
  PASSWORD_TOO_LONG: 'Password must be at most 72 characters',
  SIGNATURE_TOO_LONG: 'Signature must be at most 200 characters',
  SIGNATURE_INVALID_FORMAT: 'Signature must not contain HTML tags',
};

type ValidationIssue = {
  constraints?: Record<string, string>;
  children?: ValidationIssue[];
};

function getFirstConstraintMessage(errors: ValidationIssue[]): string | null {
  for (const error of errors) {
    const firstConstraint = error.constraints
      ? Object.values(error.constraints)[0]
      : undefined;

    if (firstConstraint) {
      return firstConstraint;
    }

    if (error.children && error.children.length > 0) {
      const nestedConstraint = getFirstConstraintMessage(error.children);
      if (nestedConstraint) {
        return nestedConstraint;
      }
    }
  }

  return null;
}

async function bootstrap() {
  const app = await NestFactory.create<NestExpressApplication>(AppModule);
  const configService = app.get(ConfigService);
  const logger = app.get(AppLoggerService);

  app.enableCors({
    origin: configService.getOrThrow<string>('CLIENT_URL'),
    credentials: true,
  });

  app.use(cookieParser());

  // Logging middleware
  app.use((request: Request, response: Response, next: () => void) => {
    const startedAt = Date.now();
    const { method, originalUrl } = request;

    logger.log(`incoming ${method} ${originalUrl}`, 'HTTP');

    response.on('finish', () => {
      const durationMs = Date.now() - startedAt;
      logger.log(
        `done ${method} ${originalUrl} ${response.statusCode} ${durationMs}ms`,
        'HTTP',
      );
    });

    next();
  });

  // Before going to Controller, validate here
  // whitelist -> remove unnecessary fields
  // forbidNonWhitelisted -> throw error if there are unnecessary fields
  // transform -> transform data to the type we want
  // return error in the custom format { error: string, message: string } instead of the default one
  app.useGlobalPipes(
    new ValidationPipe({
      whitelist: true,
      forbidNonWhitelisted: true,
      transform: true,
      exceptionFactory: (errors): BadRequestException => {
        const validationErrors = errors as ValidationIssue[];
        const errorCode =
          getFirstConstraintMessage(validationErrors) ?? 'UNKNOWN_ERROR';

        return new BadRequestException({
          error: errorCode,
          message: validationMessages[errorCode] ?? 'Validation failed',
        });
      },
    }),
  );

  // Handle exceptions in a unified way
  app.useGlobalFilters(new HttpExceptionFilter());

  // Serve uploaded files
  const uploadDir = join(process.cwd(), 'uploads');
  if (!existsSync(uploadDir)) {
    mkdirSync(uploadDir, { recursive: true });
  }
  app.useStaticAssets(uploadDir, { prefix: '/uploads' });

  await app.listen(Number(configService.getOrThrow<string>('PORT')));
}

void bootstrap();
