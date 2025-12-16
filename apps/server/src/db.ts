import path from 'path';
import Database from 'better-sqlite3';

const ASSETS_PATH = path.join(__dirname, 'assets');
const dbFilePath = path.join(ASSETS_PATH, 'database.db');

export function createDatabase(): Database.Database {
  const db = new Database(dbFilePath);

  // Enable foreign keys
  db.pragma('foreign_keys = ON');

  return db;
}

export function initializeSchema(db: Database.Database): void {
  db.exec(`
    CREATE TABLE IF NOT EXISTS nodes (
      hash TEXT PRIMARY KEY,
      parent_hash TEXT,
      name TEXT,
      size INTEGER,
      FOREIGN KEY (parent_hash) REFERENCES nodes(hash)
    )
  `);

  db.exec(`
    CREATE INDEX IF NOT EXISTS idx_parent ON nodes(parent_hash);
    CREATE INDEX IF NOT EXISTS idx_name ON nodes(name);
    CREATE INDEX IF NOT EXISTS idx_parent_name_lower ON nodes(parent_hash, LOWER(name), hash);
  `);
}

export function initializeDatabase(): Database.Database {
  const db = createDatabase();
  initializeSchema(db);
  return db;
}
