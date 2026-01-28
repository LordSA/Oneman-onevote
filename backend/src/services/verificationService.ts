import { db } from "../db";
import {
  qrTokens,
  verifications,
  auditLogs,
  voters,
  elections,
} from "../db/schema";
import { eq, and, gt, sql } from "drizzle-orm";

export const verifyToken = async (tokenValue: string, ipAddress?: string) => {
  return await db.transaction(async (tx) => {
    // 1. Find the token
    const [tokenRecord] = await tx
      .select()
      .from(qrTokens)
      .where(eq(qrTokens.token, tokenValue))
      .limit(1);

    if (!tokenRecord) {
      await tx.insert(auditLogs).values({
        action: "VERIFY_FAIL",
        details: JSON.stringify({
          reason: "Token not found",
          token: tokenValue,
        }),
        ipAddress,
      });
      throw new Error("Invalid QR Token");
    }

    // 2. Check Expiry
    if (new Date() > tokenRecord.expiresAt) {
      await tx.insert(auditLogs).values({
        action: "VERIFY_FAIL",
        details: JSON.stringify({ reason: "Token expired", token: tokenValue }),
        ipAddress,
      });
      throw new Error("QR Token has expired");
    }

    // 3. Check if already verified
    const [existingVerification] = await tx
      .select()
      .from(verifications)
      .where(
        and(
          eq(verifications.voterId, tokenRecord.voterId),
          eq(verifications.electionId, tokenRecord.electionId),
        ),
      )
      .limit(1);

    if (existingVerification) {
      // Log the double attempt
      await tx.insert(auditLogs).values({
        action: "ALREADY_VERIFIED",
        details: JSON.stringify({
          voterId: tokenRecord.voterId,
          electionId: tokenRecord.electionId,
        }),
        ipAddress,
      });
      throw new Error("Voter has already been verified for this election");
    }

    // 4. Verify
    await tx.insert(verifications).values({
      voterId: tokenRecord.voterId,
      electionId: tokenRecord.electionId,
    });

    // 5. Success Log
    await tx.insert(auditLogs).values({
      action: "VERIFY_SUCCESS",
      details: JSON.stringify({
        voterId: tokenRecord.voterId,
        electionId: tokenRecord.electionId,
      }),
      ipAddress,
    });

    return { success: true, message: "Voter verification successful" };
  });
};
