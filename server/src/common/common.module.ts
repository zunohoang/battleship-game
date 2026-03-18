import { Global, Module } from '@nestjs/common';
import { RedisService } from './infrastructure/cache/redis.service';
import { AppLoggerService } from './infrastructure/logger/app-logger.service';

@Global()
@Module({
  providers: [AppLoggerService, RedisService],
  exports: [AppLoggerService, RedisService],
})
export class CommonModule {}
