import { UserEntity } from '../auth/infrastructure/persistence/relational/entities/user.entity';
import type { DataSourceOptions } from 'typeorm';

type EnvReader = (key: string) => string | undefined;

function getRequiredEnv(readEnv: EnvReader, key: string): string {
  const value = readEnv(key);
  if (!value) {
    throw new Error(`${key} environment variable is required`);
  }

  return value;
}

export function getDatabaseConfig(readEnv: EnvReader): DataSourceOptions {
  const databaseUrl = readEnv('DATABASE_URL');
  const synchronize = readEnv('DB_SYNCHRONIZE') === 'true';
  const logging = readEnv('DB_LOGGING') === 'true';

  const baseConfig: DataSourceOptions = {
    type: 'postgres',
    entities: [UserEntity],
    migrations: [`${__dirname}/migrations/*{.ts,.js}`],
    synchronize,
    logging,
  };

  if (databaseUrl) {
    return {
      ...baseConfig,
      url: databaseUrl,
    };
  }

  return {
    ...baseConfig,
    host: getRequiredEnv(readEnv, 'DB_HOST'),
    port: Number(getRequiredEnv(readEnv, 'DB_PORT')),
    username: getRequiredEnv(readEnv, 'DB_USER'),
    password: getRequiredEnv(readEnv, 'DB_PASSWORD'),
    database: getRequiredEnv(readEnv, 'DB_NAME'),
  };
}
