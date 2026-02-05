import express from "express";
import cors from "cors";
import dotenv from "dotenv";
import { verifyToken } from "./services/verificationService";
import { z } from "zod";
import { db } from "./db";

dotenv.config();

const app = express();
app.use(cors());
app.use(express.json());

const PORT = process.env.PORT || 3000;

// Validation Schemas
const VerifySchema = z.object({
  token: z.string().min(1),
});

const RegisterSchema = z.object({
  name: z.string().min(1),
  rfid: z.string().min(1),
  qrData: z.string().min(1),
});

// Routes
app.post("/api/verify", async (req, res) => {
  try {
    const { token } = VerifySchema.parse(req.body);
    const ip = req.ip || req.socket.remoteAddress;

    const result = await verifyToken(token, ip);
    res.json(result);
  } catch (error: any) {
    if (error instanceof z.ZodError) {
      res.status(400).json({ error: "Invalid input" });
    } else {
      const status = error.message.includes("already be verified") || error.message.includes("already been verified")
        ? 409
        : 400;
      res
        .status(status)
        .json({
          success: false,
          error: error.message || "Verification failed",
        });
    }
  }
});

// Registration Endpoint
app.post("/api/register", async (req, res) => {
  try {
    const { name, rfid, qrData } = RegisterSchema.parse(req.body);
    
    // Create voter profile
    const voterRef = db.ref("voters").push();
    await voterRef.set({
      name,
      rfid,
      qrData,
      has_voted: false,
      timestamp: ""
    });

    res.json({ success: true, voterId: voterRef.key });
  } catch (error: any) {
    res.status(400).json({ error: error.message });
  }
});

// DEV ONLY: Setup Endpoint to create dummy data
app.post("/api/dev/setup", async (req, res) => {
  try {
    // Create 1 demo voter based on new structure
    const voterId = "voter_101";
    const qrData = "VOTE_SHIBILI_99";
    
    await db.ref(`voters/${voterId}`).set({
      name: "Shibili",
      rfid: "834D4CC5",
      qrData: qrData,
      has_voted: false,
      timestamp: ""
    });

    res.json({ message: "Setup complete", token: qrData, voterId: voterId });
  } catch (e: any) {
    res.status(500).json({ error: e.message });
  }
});

app.listen(PORT, () => {
  console.log(`Server running on port ${PORT}`);
});
