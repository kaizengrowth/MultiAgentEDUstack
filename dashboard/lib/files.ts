import fs from "fs";
import path from "path";

const REPO_ROOT = path.resolve(process.cwd(), "..");

/** Read a repo-relative markdown path safely. Returns null if missing/unsafe. */
export function readRepoMarkdown(relativePath: string | null | undefined): string | null {
  if (!relativePath) return null;
  const resolved = path.resolve(REPO_ROOT, relativePath);
  if (!resolved.startsWith(REPO_ROOT + path.sep) && resolved !== REPO_ROOT) {
    return null;
  }
  if (!fs.existsSync(resolved) || !fs.statSync(resolved).isFile()) {
    return null;
  }
  return fs.readFileSync(resolved, "utf8");
}
