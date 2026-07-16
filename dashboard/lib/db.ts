import fs from "fs";
import path from "path";
import initSqlJs, { Database } from "sql.js";
import { REPO_ROOT } from "./paths";

// sql.js (pure WASM) instead of better-sqlite3: this dashboard needs to run
// in environments without a C toolchain (no native module compilation), and
// it only ever reads -- every write happens through scripts/db.py on the
// pipeline side. The database is small (a few MB) and updates on a nightly/
// weekly schedule, so reloading on file-mtime-change is plenty fresh.

const DB_PATH =
  process.env.MAES_DB_PATH || path.resolve(REPO_ROOT, "db", "maes.sqlite3");

let cachedDb: Database | null = null;
let cachedMtimeMs = 0;
let sqlJsPromise: ReturnType<typeof initSqlJs> | null = null;
/** Single-flight reload so parallel RSC queries do not close each other's DB. */
let reloadPromise: Promise<Database> | null = null;

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
  if (!reloadPromise) {
    const mtimeMs = stat.mtimeMs;
    reloadPromise = (async () => {
      const SQL = await getSqlJs();
      const fileBuffer = fs.readFileSync(DB_PATH);
      const next = new SQL.Database(fileBuffer);
      const prev = cachedDb;
      cachedDb = next;
      cachedMtimeMs = mtimeMs;
      // Let in-flight readers on the previous handle finish before closing.
      if (prev) {
        setTimeout(() => {
          try {
            prev.close();
          } catch {
            /* already closed */
          }
        }, 5_000);
      }
      return next;
    })().finally(() => {
      reloadPromise = null;
    });
  }
  return reloadPromise;
}

/** Run a query and return rows as plain objects, matching column names. */
export async function query<T = Record<string, unknown>>(
  sql: string,
  params: (string | number | null)[] = []
): Promise<T[]> {
  try {
    const db = await getDb();
    const stmt = db.prepare(sql);
    if (params.length > 0) {
      // sql.js bind() with an empty array can leave the statement unusable.
      stmt.bind(params);
    }
    const rows: T[] = [];
    while (stmt.step()) {
      rows.push(stmt.getAsObject() as T);
    }
    stmt.free();
    return rows;
  } catch (err) {
    // Prerender / missing DB / wasm load failures should not fail the build.
    console.error("[maes-db] query failed:", sql, err);
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
