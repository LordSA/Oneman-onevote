import axios from "axios";

// In a real app, use import.meta.env.VITE_API_URL
const API_URL = "http://localhost:3000/api";

export const apiClient = axios.create({
  baseURL: API_URL,
  headers: {
    "Content-Type": "application/json",
  },
});

export const verifyToken = async (token: string) => {
  const response = await apiClient.post("/verify", { token });
  return response.data;
};

// Register a new voter
export const registerVoter = async (voterData: { name: string, rfid: string, qrData: string }) => {
  const response = await apiClient.post("/register", voterData);
  return response.data;
};

// Dev helper to setup data
export const devSetup = async () => {
  const response = await apiClient.post("/dev/setup");
  return response.data;
};
