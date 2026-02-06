import { db } from "../db";

export const verifyToken = async (tokenValue: string, ipAddress?: string) => {
  return verifyVoter("qrData", tokenValue, ipAddress);
};

export const verifyRfid = async (rfidValue: string, ipAddress?: string) => {
  return verifyVoter("rfid", rfidValue, ipAddress);
};

async function verifyVoter(field: "qrData" | "rfid", value: string, ipAddress?: string) {
  // 1. Find voter with matching field
  const votersRef = db.ref("voters");
  const querySnapshot = await votersRef.orderByChild(field).equalTo(value).once("value");

  if (!querySnapshot.exists()) {
    await db.ref("auditLogs").push({
      action: "VERIFY_FAIL",
      details: JSON.stringify({ reason: `${field} not found`, value }),
      ipAddress,
      timestamp: Date.now(),
    });
    throw new Error(`Invalid ${field === "qrData" ? "QR Token" : "RFID Tag"}`);
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
    details: JSON.stringify({ voterId, name: result.snapshot.val().name, method: field }),
    ipAddress,
    timestamp: Date.now(),
  });

  return { 
    success: true, 
    name: result.snapshot.val().name, 
    method: field,
    message: "Voter verification successful" 
  };
}
