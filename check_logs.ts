import { db } from "./backend/src/db/firebase";

async function check() {
  try {
    const snapshot = await db.ref("auditLogs").orderByKey().limitToLast(5).once("value");
    console.log("Last 5 logs:", JSON.stringify(snapshot.val(), null, 2));
  } catch (e) {
    console.error("Error fetching logs:", e);
  }
  process.exit(0);
}

check();
