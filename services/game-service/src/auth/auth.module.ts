import { Module } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { JwtModule } from '@nestjs/jwt';
import { PassportModule } from '@nestjs/passport';
import { TypeOrmModule } from '@nestjs/typeorm';
import type { StringValue } from 'ms';
import { AuthController } from './auth.controller';
import { AuthGrpcController } from './auth.grpc.controller';
import { AuthService } from './auth.service';
import { JwtStrategy } from './jwt.strategy';
import { USER_REPOSITORY } from './infrastructure/persistence/user.repository';
import { TOKEN_REPOSITORY } from './infrastructure/security/token.repository';
import { PASSWORD_HASHER_REPOSITORY } from './infrastructure/security/password-hasher.repository';
import { UserEntity } from './infrastructure/persistence/relational/entities/user.entity';
import { PostgresUserRepository } from './infrastructure/persistence/relational/repositories/postgres-user.repository';
import { BcryptPasswordHasherRepository } from './infrastructure/security/repositories/bcrypt-password-hasher.repository';
import { JwtTokenRepository } from './infrastructure/security/repositories/jwt-token.repository';

@Module({
  imports: [
    PassportModule,
    TypeOrmModule.forFeature([UserEntity]),
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
  controllers: [AuthController, AuthGrpcController],
  providers: [
    AuthService,
    JwtStrategy,
    {
      provide: USER_REPOSITORY,
      useClass: PostgresUserRepository,
    },
    {
      provide: TOKEN_REPOSITORY,
      useClass: JwtTokenRepository,
    },
    {
      provide: PASSWORD_HASHER_REPOSITORY,
      useClass: BcryptPasswordHasherRepository,
    },
  ],
  exports: [
    AuthService,
    USER_REPOSITORY,
    TOKEN_REPOSITORY,
    PASSWORD_HASHER_REPOSITORY,
  ],
})
export class AuthModule {}
