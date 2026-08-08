#!/usr/bin/env node

// Data migration script from three old databases to the new unified database.
// This script validates data integrity. The actual data copy should be done
// via the documented pg_dump/pg_restore process (see docs/DB_UNIFICATION.md).
//
// Usage:
//   node scripts/migrate-to-unified-db.mjs --validate   # compare row counts
//   node scripts/migrate-to-unified-db.mjs --copy       # copy data via Prisma
//
// For --copy mode, the `pg` npm package must be installed:
//   npm install --save-dev pg

import dotenv from "dotenv";

dotenv.config();
dotenv.config({ path: ".env.example", override: false });

const MODE = process.argv.includes("--copy") ? "copy" : "validate";

// ─── Table definitions per service ───────────────────────────────────────────

const TABLES = {
  auth_iam: {
    schema: "auth_iam",
    tables: [
      "users", "teams", "team_members", "roles", "permissions",
      "role_permissions", "user_roles", "sessions", "audit_logs", "outbox_events",
    ],
  },
  lead_management: {
    schema: "lead_management",
    tables: [
      "lead_sources", "lead_pipelines", "lead_statuses", "lead_field_definitions",
      "leads", "lead_custom_field_values", "lead_assignments", "lead_followups",
      "lead_meetings", "lead_quotations", "lead_quotation_revisions",
      "quotation_number_sequences", "lead_timeline", "lead_assignment_settings",
      "outbox_events",
    ],
  },
  integration: {
    schema: "integration",
    tables: [
      "connected_accounts", "meta_app_configs", "source_forms",
      "meta_asset_connections", "source_field_mappings", "webhook_events",
      "worker_heartbeats", "sync_logs", "outbox_events",
    ],
  },
};

// ─── Environment variable map ────────────────────────────────────────────────

const SOURCE_ENV = {
  auth_iam: "AUTH_IAM_DATABASE_URL",
  lead_management: "LEAD_MANAGEMENT_DATABASE_URL",
  integration: "INTEGRATION_DATABASE_URL",
};

// ─── Validate mode: compare row counts using psql ────────────────────────────

import { spawnSync } from "node:child_process";

function runPsql(url, query) {
  const result = spawnSync("psql", [url, "-At", "-c", query], {
    encoding: "utf8",
    timeout: 30000,
    shell: process.platform === "win32",
  });
  if (result.status !== 0) {
    throw new Error(`psql failed: ${result.stderr?.trim() || result.stdout?.trim()}`);
  }
  return result.stdout.trim();
}

async function validate() {
  console.log("=== Data Validation ===\n");

  let allValid = true;
  const summary = [];

  for (const [sourceDb, config] of Object.entries(TABLES)) {
    const sourceUrl = process.env[SOURCE_ENV[sourceDb]];
    const targetUrl = process.env.SOLOCRM_DATABASE_URL;

    if (!sourceUrl) {
      console.log(`  [SKIP] ${sourceDb}: ${SOURCE_ENV[sourceDb]} not set`);
      continue;
    }
    if (!targetUrl) {
      console.log(`  [SKIP] ${sourceDb}: SOLOCRM_DATABASE_URL not set`);
      continue;
    }

    console.log(`--- ${sourceDb} (source) → ${config.schema} (target) ---\n`);

    const tableResults = [];
    for (const table of config.tables) {
      try {
        const sourceCount = Number(runPsql(sourceUrl, `SELECT COUNT(*) FROM "${table}";`));
        const targetCount = Number(runPsql(targetUrl, `SELECT COUNT(*) FROM "${config.schema}"."${table}";`));
        const valid = sourceCount === targetCount;
        if (!valid) allValid = false;
        const icon = valid ? "✓" : "✗ MISMATCH";
        console.log(`  ${table}: source=${sourceCount} target=${targetCount} ${icon}`);
        tableResults.push({ table, sourceCount, targetCount, valid });
      } catch (err) {
        console.error(`  ${table}: ERROR - ${err.message}`);
        tableResults.push({ table, error: err.message });
      }
    }
    summary.push({ sourceDb, results: tableResults });
    console.log("");
  }

  console.log(`=== ${allValid ? "ALL VALID ✓" : "MISMATCHES DETECTED ✗"} ===`);
  return { allValid, summary };
}

// ─── Copy mode: copy data via Prisma raw queries ─────────────────────────────
// This mode requires the `pg` package. If not available, it falls back to
// documented psql commands.

async function copyData() {
  let pg;
  try {
    pg = await import("pg");
  } catch {
    console.log(
      "The `pg` package is required for --copy mode.\n" +
      "Install it with: npm install --save-dev pg\n" +
      "Or use the psql-based approach documented in docs/DB_UNIFICATION.md"
    );
    process.exit(1);
  }

  const { Pool } = pg;
  const pools = {};

  for (const [sourceDb, config] of Object.entries(TABLES)) {
    const sourceUrl = process.env[SOURCE_ENV[sourceDb]];
    if (!sourceUrl) {
      console.log(`  [SKIP] ${sourceDb}: ${SOURCE_ENV[sourceDb]} not set`);
      continue;
    }
    pools[sourceDb] = new Pool({ connectionString: sourceUrl, max: 2 });
  }

  const targetUrl = process.env.SOLOCRM_DATABASE_URL;
  if (!targetUrl) {
    console.error("FATAL: SOLOCRM_DATABASE_URL is not set");
    process.exit(1);
  }
  const targetPool = new Pool({ connectionString: targetUrl, max: 5 });

  console.log("=== Data Copy ===\n");

  for (const [sourceDb, config] of Object.entries(TABLES)) {
    if (!pools[sourceDb]) continue;
    const sourcePool = pools[sourceDb];
    console.log(`--- Copying ${sourceDb} → ${config.schema} ---`);

    for (const table of config.tables) {
      try {
        const sourceResult = await sourcePool.query(`SELECT * FROM "${table}"`);
        if (sourceResult.rows.length === 0) {
          console.log(`  ${table}: no data (skipped)`);
          continue;
        }

        // Determine columns excluding tenant_id
        const columns = Object.keys(sourceResult.rows[0]).filter((c) => c !== "tenant_id");
        const colList = columns.map((c) => `"${c}"`).join(", ");
        const placeholders = columns.map((_, i) => `$${i + 1}`).join(", ");
        const insertQuery = `INSERT INTO "${config.schema}"."${table}" (${colList}) VALUES (${placeholders}) ON CONFLICT DO NOTHING`;

        let inserted = 0;
        for (const row of sourceResult.rows) {
          try {
            const values = columns.map((c) => row[c]);
            await targetPool.query(insertQuery, values);
            inserted++;
          } catch {
            // Skip individual row errors for idempotency
          }
        }

        const targetResult = await targetPool.query(
          `SELECT COUNT(*)::int AS count FROM "${config.schema}"."${table}"`
        );
        console.log(`  ${table}: ${sourceResult.rows.length} → ${targetResult.rows[0].count} (inserted: ${inserted})`);
      } catch (err) {
        console.error(`  ${table}: ERROR - ${err.message}`);
      }
    }
    console.log("");
  }

  // Cleanup
  for (const pool of Object.values(pools)) {
    await pool.end().catch(() => {});
  }
  await targetPool.end().catch(() => {});

  // Run validation after copy
  console.log("=== Post-Copy Validation ===\n");
  await validate();
}

// ─── Main ─────────────────────────────────────────────────────────────────────

if (MODE === "copy") {
  copyData().catch((err) => {
    console.error(err);
    process.exit(1);
  });
} else {
  validate().catch((err) => {
    console.error(err);
    process.exit(1);
  });
}
