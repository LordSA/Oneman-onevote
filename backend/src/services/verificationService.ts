import { db } from "../db";

export const verifyToken = async (tokenValue: string, ipAddress?: string) => {
  // 1. Find voter with matching qrData
  const votersRef = db.ref("voters");
  const querySnapshot = await votersRef.orderByChild("qrData").equalTo(tokenValue).once("value");

  if (!querySnapshot.exists()) {
    await db.ref("auditLogs").push({
      action: "VERIFY_FAIL",
      details: JSON.stringify({ reason: "QR Data not found", qrData: tokenValue }),
      ipAddress,
      timestamp: Date.now(),
    });
    throw new Error("Invalid QR Token");
  }

  // Get the voter record (should be unique)
  const voterId = Object.keys(querySnapshot.val())[0];
  const voterRef = db.ref(`voters/${voterId}`);

  // 2. Use a transaction to check has_voted and set it to true atomically
  const result = await voterRef.transaction((voter) => {
    if (voter) {
      if (voter.has_voted) {
        return; // Abort transaction if already voted
      }
      voter.has_voted = true;
      voter.timestamp = Date.now();
    }
    return voter;
  });

  if (!result.committed) {
    await db.ref("auditLogs").push({
      action: "ALREADY_VERIFIED",
      details: JSON.stringify({ voterId }),
      ipAddress,
      timestamp: Date.now(),
    });
    throw new Error("Voter has already been verified");
  }

  // 3. Success Log
  await db.ref("auditLogs").push({
    action: "VERIFY_SUCCESS",
    details: JSON.stringify({ voterId }),
    ipAddress,
    timestamp: Date.now(),
  });

  return { success: true, name: result.snapshot.val().name, message: "Voter verification successful" };
};
