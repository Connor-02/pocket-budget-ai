import { spawnSync } from "node:child_process";

const maxAttempts = Number(process.env.PRISMA_MIGRATE_MAX_ATTEMPTS ?? 5);
const baseDelayMs = Number(process.env.PRISMA_MIGRATE_BASE_DELAY_MS ?? 2000);

function sleep(ms) {
  return new Promise((resolve) => setTimeout(resolve, ms));
}

function runMigrateDeploy() {
  return spawnSync("npx", ["prisma", "migrate", "deploy"], {
    stdio: "inherit",
    shell: process.platform === "win32",
  });
}

function shouldRetry(status) {
  // Retry lock/timeouts (e.g. P1002 advisory lock timeout).
  return status !== 0;
}

for (let attempt = 1; attempt <= maxAttempts; attempt += 1) {
  const result = runMigrateDeploy();
  const status = result.status ?? 1;

  if (status === 0) {
    process.exit(0);
  }

  if (!shouldRetry(status) || attempt === maxAttempts) {
    process.exit(status);
  }

  const delay = baseDelayMs * attempt;
  console.log(
    `prisma migrate deploy failed (attempt ${attempt}/${maxAttempts}). Retrying in ${delay}ms...`
  );
  await sleep(delay);
}

process.exit(1);
