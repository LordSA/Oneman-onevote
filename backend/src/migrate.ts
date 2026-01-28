import { migrate } from "drizzle-orm/postgres-js/migrator";
import { db } from "./db";
import postgres from "postgres"; // We need the client to close it
import dotenv from "dotenv";

dotenv.config();

// We need to re-initialize connection if we want to close it properly,
// strictly speaking we imported 'db' which has a client, but 'postgres-js' client is not exposed directly from 'drizzle(client)'.
// So let's just make a new connection for migration or modify db/index.ts.
// For simplicity, I'll copy the connection logic here.

const connectionString = process.env.DATABASE_URL!;
const client = postgres(connectionString, { max: 1 });
const dbMigrator = drizzle(client);

import { drizzle } from "drizzle-orm/postgres-js";

async function main() {
  console.log("Running migrations...");
  await migrate(dbMigrator, { migrationsFolder: "drizzle" });
  console.log("Migrations complete!");
  await client.end();
  process.exit(0);
}

main().catch((err) => {
  console.error("Migration failed!", err);
  process.exit(1);
});
