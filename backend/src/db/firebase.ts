import admin from 'firebase-admin';
import dotenv from 'dotenv';

dotenv.config();

// Check if a Firebase app has already been initialized
if (!admin.apps.length) {
  const serviceAccountKey = process.env.FIREBASE_SERVICE_ACCOUNT_KEY;

  if (!serviceAccountKey) {
    throw new Error('FIREBASE_SERVICE_ACCOUNT_KEY is not defined in .env');
  }

  // Parse the service account key from the environment variable
  const serviceAccount = JSON.parse(Buffer.from(serviceAccountKey, 'base64').toString('ascii'));

  admin.initializeApp({
    credential: admin.credential.cert(serviceAccount),
    databaseURL: process.env.FIREBASE_DATABASE_URL,
  });
}

export const db = admin.database();
export const auth = admin.auth();
