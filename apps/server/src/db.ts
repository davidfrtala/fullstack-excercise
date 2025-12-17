import path from 'path';
import Database from 'better-sqlite3';

const ASSETS_PATH = path.join(__dirname, 'assets');
const dbFilePath = path.join(ASSETS_PATH, 'database.db');

/**
 * Creates a new database connection
 * @returns A new database connection
 */
export function createDatabase(): Database.Database {
  const db = new Database(dbFilePath);

  // Enable foreign keys
  db.pragma('foreign_keys = ON');

  return db;
}

/**
 * Initializes the schema for the database
 * @param db - The database connection
 */
export function initializeSchema(db: Database.Database): void {
  db.exec(`
    CREATE TABLE IF NOT EXISTS nodes (
      hash TEXT PRIMARY KEY,
      parentHash TEXT,
      name TEXT,
      size INTEGER,
      lastSegment TEXT,
      FOREIGN KEY (parentHash) REFERENCES nodes(hash)
    )
  `);

  db.exec(`
    CREATE INDEX IF NOT EXISTS idx_parent ON nodes(parentHash);
    CREATE INDEX IF NOT EXISTS idx_name ON nodes(name);
    CREATE INDEX IF NOT EXISTS idx_parent_name_lower ON nodes(parentHash, LOWER(name), hash);
    CREATE INDEX IF NOT EXISTS idx_last_segment_lower ON nodes(LOWER(lastSegment));
  `);
}

/**
 * Initializes the database
 * @returns The database connection
 */
export function initializeDatabase(): Database.Database {
  const db = createDatabase();
  initializeSchema(db);
  return db;
}
