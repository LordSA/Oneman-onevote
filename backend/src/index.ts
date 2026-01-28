import express from "express";
import cors from "cors";
import dotenv from "dotenv";
import { verifyToken } from "./services/verificationService";
import { z } from "zod";
import { db } from "./db";
import { voters, elections, qrTokens } from "./db/schema";

dotenv.config();

const app = express();
app.use(cors());
app.use(express.json());

const PORT = process.env.PORT || 3000;

// Validation Schema
const VerifySchema = z.object({
  token: z.string().min(1),
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
      // Return 400 for logic errors (invalid token, etc) to keep it simple, or 409 for conflict
      // For security, 400 is often safe enough, but we'll use message check
      const status = error.message.includes("already been verified")
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

// DEV ONLY: Setup Endpoint to create dummy data
app.post("/api/dev/setup", async (req, res) => {
  try {
    // Create 1 election
    const [election] = await db
      .insert(elections)
      .values({ name: "Demo Election 2024" })
      .returning();

    // Create 1 voter
    const [voter] = await db
      .insert(voters)
      .values({ name: "John Doe" })
      .returning();

    // Create token
    const tokenValue = "voter-" + Math.random().toString(36).substring(7);
    const expiresAt = new Date();
    expiresAt.setHours(expiresAt.getHours() + 24); // 24 hours expiry

    await db.insert(qrTokens).values({
      token: tokenValue,
      voterId: voter.id,
      electionId: election.id,
      expiresAt,
    });

    res.json({ message: "Setup complete", token: tokenValue, voter, election });
  } catch (e: any) {
    res.status(500).json({ error: e.message });
  }
});

app.listen(PORT, () => {
  console.log(`Server running on port ${PORT}`);
});
