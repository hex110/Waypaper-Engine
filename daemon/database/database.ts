import {
    drizzle,
    type BetterSQLite3Database
} from 'drizzle-orm/better-sqlite3';
import Database = require('better-sqlite3');
import { join } from 'node:path';
import { homedir } from 'node:os';
import { migrate } from 'drizzle-orm/better-sqlite3/migrator';
import { existsSync } from 'node:fs';
const DB_LOCATION = join(homedir(), '.waypaper_engine/images_database.sqlite3');
const MIGRATION_PATH_DEV = join(
    process.cwd(),
    '..',
    '..',
    'electron',
    'database',
    'migrations'
);
const MIGRATION_PATH_PROD = join(process.cwd(), '..', '..', 'migrations');
const sqlite = Database(DB_LOCATION);
const drizzleDB: BetterSQLite3Database = drizzle(sqlite);
export function migrateDB() {
    try {
        if (existsSync(MIGRATION_PATH_PROD)) {
            migrate(drizzleDB, { migrationsFolder: MIGRATION_PATH_PROD });
        } else {
            migrate(drizzleDB, { migrationsFolder: MIGRATION_PATH_DEV });
        }
    } catch (error) {
        console.error(error);
    }
}

export function createConnector() {
    const sqlite = Database(DB_LOCATION);
    migrateDB();
    const drizzleDB: BetterSQLite3Database = drizzle(sqlite);
    return drizzleDB;
}

export const db = drizzleDB;
