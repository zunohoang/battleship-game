import { join } from 'node:path';

export const GRPC_PACKAGE_AUTH = 'auth.v1';

export const AUTH_GRPC_CLIENT = 'AUTH_GRPC_CLIENT';

export const AUTH_PROTO_PATH = join(process.cwd(), 'proto', 'auth', 'v1', 'auth.proto');
