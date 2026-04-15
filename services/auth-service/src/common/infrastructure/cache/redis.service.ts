import {
  Injectable,
  OnApplicationShutdown,
  OnModuleInit,
} from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import Redis from 'ioredis';
import { AppLoggerService } from '../logger/app-logger.service';

@Injectable()
export class RedisService implements OnModuleInit, OnApplicationShutdown {
  private readonly client: Redis;

  constructor(
    private readonly configService: ConfigService,
    private readonly logger: AppLoggerService,
  ) {
    const redisUrl = this.configService.get<string>('REDIS_URL')?.trim();

    this.client = redisUrl
      ? new Redis(redisUrl, {
          lazyConnect: true,
          maxRetriesPerRequest: 1,
        })
      : new Redis({
          host: this.configService.get<string>('REDIS_HOST') ?? '127.0.0.1',
          port: Number(this.configService.get<string>('REDIS_PORT') ?? '6379'),
          password:
            this.configService.get<string>('REDIS_PASSWORD') || undefined,
          db: Number(this.configService.get<string>('REDIS_DB') ?? '0'),
          lazyConnect: true,
          maxRetriesPerRequest: 1,
        });

    this.client.on('error', (error: Error) => {
      this.logger.error(error.message, error.stack, 'Redis');
    });
  }

  async onModuleInit(): Promise<void> {
    await this.client.connect();
    await this.client.ping();
    this.logger.log('Redis connection established', 'Redis');
  }

  async onApplicationShutdown(): Promise<void> {
    await this.client.quit();
  }

  getClient(): Redis {
    return this.client;
  }
}
