import { Module } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { JwtModule } from '@nestjs/jwt';
import { PassportModule } from '@nestjs/passport';
import type { StringValue } from 'ms';
import { AuthController } from './auth.controller';
import { AuthService } from './auth.service';
import { JwtStrategy } from './jwt.strategy';
import { USER_REPOSITORY } from './infrastructure/persistence/user.repository';
import { TOKEN_SERVICE } from './infrastructure/token.service';
import { PASSWORD_HASHER } from './infrastructure/password-hasher';
import { InMemoryUserRepository } from './infrastructure/persistence/adapters/in-memory-user.repository';
import { JwtTokenService } from './infrastructure/persistence/adapters/jwt-token.service';
import { BcryptPasswordHasher } from './infrastructure/persistence/adapters/bcrypt-password-hasher';

@Module({
  imports: [
    PassportModule,
    JwtModule.registerAsync({
      inject: [ConfigService],
      useFactory: (configService: ConfigService) => ({
        secret: configService.getOrThrow<string>('JWT_SECRET'),
        signOptions: {
          expiresIn: configService.getOrThrow<StringValue>(
            'ACCESS_TOKEN_EXPIRES_IN',
          ),
        },
      }),
    }),
  ],
  controllers: [AuthController],
  providers: [
    AuthService,
    JwtStrategy,
    {
      provide: USER_REPOSITORY,
      useClass: InMemoryUserRepository,
    },
    {
      provide: TOKEN_SERVICE,
      useClass: JwtTokenService,
    },
    {
      provide: PASSWORD_HASHER,
      useClass: BcryptPasswordHasher,
    },
  ],
  exports: [AuthService, USER_REPOSITORY, TOKEN_SERVICE, PASSWORD_HASHER],
})
export class AuthModule {}
