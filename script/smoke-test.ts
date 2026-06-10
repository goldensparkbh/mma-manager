/** Lightweight smoke checks — no server required for default CI run. */
const api = process.env.SMOKE_API_URL;

async function main() {
  if (!api) {
    console.log("smoke: skipped (set SMOKE_API_URL to run live API checks)");
    return;
  }
  const res = await fetch(`${api.replace(/\/$/, "")}/api/health`);
  if (!res.ok) throw new Error(`health HTTP ${res.status}`);
  const body = (await res.json()) as { ok?: boolean };
  if (!body.ok) throw new Error("health body not ok");
  console.log("smoke: /api/health ok");
}

main().catch((err) => {
  console.error(err);
  process.exit(1);
});
