import {
  pgTable,
  uuid,
  text,
  timestamp,
  boolean,
  unique,
  index,
} from "drizzle-orm/pg-core";

// Voters Table (Mocked for this system, assumes external registration)
export const voters = pgTable("voters", {
  id: uuid("id").defaultRandom().primaryKey(),
  name: text("name").notNull(),
  createdAt: timestamp("created_at").defaultNow(),
});

// Elections Table
export const elections = pgTable("elections", {
  id: uuid("id").defaultRandom().primaryKey(),
  name: text("name").notNull(), // e.g., "Student Council 2024"
  isActive: boolean("is_active").default(true),
  createdAt: timestamp("created_at").defaultNow(),
});

// QR Tokens (The secure link between voter and verification)
export const qrTokens = pgTable("qr_tokens", {
  id: uuid("id").defaultRandom().primaryKey(),
  token: text("token").notNull().unique(), // Cryptographic random string
  voterId: uuid("voter_id")
    .references(() => voters.id)
    .notNull(),
  electionId: uuid("election_id")
    .references(() => elections.id)
    .notNull(),
  expiresAt: timestamp("expires_at").notNull(),
  createdAt: timestamp("created_at").defaultNow(),
});

// Verifications (The critical "Voted" record)
export const verifications = pgTable(
  "verifications",
  {
    id: uuid("id").defaultRandom().primaryKey(),
    voterId: uuid("voter_id")
      .references(() => voters.id)
      .notNull(),
    electionId: uuid("election_id")
      .references(() => elections.id)
      .notNull(),
    verifiedAt: timestamp("verified_at").defaultNow(),
  },
  (t) => ({
    // CRITICAL: Ensure a voter can only be verified once per election
    unqVoterElection: unique().on(t.voterId, t.electionId),
  }),
);

// Audit Logs (Insert-only history of attempts)
export const auditLogs = pgTable("audit_logs", {
  id: uuid("id").defaultRandom().primaryKey(),
  action: text("action").notNull(), // "VERIFY_SUCCESS", "VERIFY_FAIL", "ALREADY_VERIFIED"
  details: text("details"), // JSON string or text details
  ipAddress: text("ip_address"),
  timestamp: timestamp("timestamp").defaultNow(),
});
