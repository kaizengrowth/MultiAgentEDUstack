import fs from "fs";
import path from "path";

// Where the repo-shaped data tree lives. Three layouts, in order:
// 1. MAES_REPO_ROOT env override (absolute, or relative to cwd).
// 2. A bundled .data/ snapshot next to the app: what scripts/
//    deploy-dashboard.sh ships to Vercel, where there is no parent repo.
// 3. The parent repo itself: local dev and the systemd deployment.
function resolveRepoRoot(): string {
  if (process.env.MAES_REPO_ROOT) {
    return path.resolve(process.cwd(), process.env.MAES_REPO_ROOT);
  }
  const bundled = path.resolve(process.cwd(), ".data");
  if (fs.existsSync(bundled)) {
    return bundled;
  }
  return path.resolve(process.cwd(), "..");
}

export const REPO_ROOT = resolveRepoRoot();
