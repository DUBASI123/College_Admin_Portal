import sqlite3 from 'sqlite3';
import { dirname, join } from 'path';
import { fileURLToPath } from 'url';

const __dirname = dirname(fileURLToPath(import.meta.url));
const dbPath = join(__dirname, 'database.db');

const db = new sqlite3.Database(dbPath);

db.all("SELECT * FROM admins", [], (err, rows) => {
  if (err) console.error(err);
  else console.log("SQLite Admins:", rows);
});
db.all("SELECT * FROM students", [], (err, rows) => {
  if (err) console.error(err);
  else console.log("SQLite Students:", rows);
});
