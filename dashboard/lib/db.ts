import fs from "fs";
import path from "path";
import initSqlJs, { Database } from "sql.js";

// sql.js (pure WASM) instead of better-sqlite3: this dashboard needs to run
// in environments without a C toolchain (no native module compilation), and
// it only ever reads -- every write happens through scripts/db.py on the
// pipeline side. The database is small (a few MB) and updates on a nightly/
// weekly schedule, so reloading on file-mtime-change is plenty fresh.

const DB_PATH =
  process.env.MAES_DB_PATH ||
  path.resolve(process.cwd(), "..", "db", "maes.sqlite3");

let cachedDb: Database | null = null;
let cachedMtimeMs = 0;
let sqlJsPromise: ReturnType<typeof initSqlJs> | null = null;

function sqlJsDistDir(): string {
  // Webpack rewrites bare require.resolve(...) to a numeric module id and
  // breaks createRequire(path.join(...)) during bundling. eval("require")
  // keeps the real Node resolver for the wasm asset path at runtime.
  const nodeRequire = eval("require") as NodeRequire;
  return path.join(
    path.dirname(nodeRequire.resolve("sql.js/package.json")),
    "dist"
  );
}

async function getSqlJs() {
  if (!sqlJsPromise) {
    const dist = sqlJsDistDir();
    sqlJsPromise = initSqlJs({
      locateFile: (file: string) => path.join(dist, file),
    });
  }
  return sqlJsPromise;
}

export async function getDb(): Promise<Database> {
  const stat = fs.statSync(DB_PATH);
  if (cachedDb && stat.mtimeMs === cachedMtimeMs) {
    return cachedDb;
  }
  const SQL = await getSqlJs();
  const fileBuffer = fs.readFileSync(DB_PATH);
  cachedDb?.close();
  cachedDb = new SQL.Database(fileBuffer);
  cachedMtimeMs = stat.mtimeMs;
  return cachedDb;
}

/** Run a query and return rows as plain objects, matching column names. */
export async function query<T = Record<string, unknown>>(
  sql: string,
  params: (string | number | null)[] = []
): Promise<T[]> {
  try {
    const db = await getDb();
    const stmt = db.prepare(sql);
    stmt.bind(params);
    const rows: T[] = [];
    while (stmt.step()) {
      rows.push(stmt.getAsObject() as T);
    }
    stmt.free();
    return rows;
  } catch {
    // Prerender / missing DB / wasm load failures should not fail the build.
    return [];
  }
}

export async function queryOne<T = Record<string, unknown>>(
  sql: string,
  params: (string | number | null)[] = []
): Promise<T | null> {
  const rows = await query<T>(sql, params);
  return rows[0] ?? null;
}

export function dbFileInfo() {
  const stat = fs.statSync(DB_PATH);
  return { path: DB_PATH, sizeBytes: stat.size, mtime: stat.mtime };
}
