'use strict';

const fs = require('fs');
const path = require('path');
const Database = require('better-sqlite3');

const SCHEMA_PATH = path.join(__dirname, '..', 'schema', 'option-b.sql');

/**
 * Create a better-sqlite3 connection with the Option B schema applied.
 *
 * @param {string} [dbPath] Path to the SQLite file. Use ':memory:' for tests.
 *                          Defaults to env DB_PATH, then 'data.db'.
 * @returns {import('better-sqlite3').Database}
 */
function createDb(dbPath) {
  const target = dbPath || process.env.DB_PATH || 'data.db';
  const db = new Database(target);
  db.pragma('journal_mode = WAL');
  db.pragma('foreign_keys = ON');

  const schema = fs.readFileSync(SCHEMA_PATH, 'utf8');
  db.exec(schema);

  return db;
}

module.exports = { createDb };
