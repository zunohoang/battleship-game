import 'dotenv/config';
import 'reflect-metadata';
import { DataSource } from 'typeorm';
import { getDatabaseConfig } from './database.config';

const dataSourceOptions = getDatabaseConfig((key) => process.env[key]);

const AppDataSource = new DataSource(dataSourceOptions);

export default AppDataSource;
