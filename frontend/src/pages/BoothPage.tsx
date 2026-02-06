import { useState, useEffect } from "react";
import { QrReader } from "react-qr-reader";
import { verifyToken } from "../api/client";
import { rtdb, auth } from "../firebase-config";
import { ref, onValue, query, limitToLast, push } from "firebase/database";
import { onAuthStateChanged } from "firebase/auth";

interface AuditLog {
  id: string;
  action: "VERIFY_SUCCESS" | "VERIFY_FAIL" | "ALREADY_VERIFIED" | "TEST_LOG";
  details: string;
  timestamp: number;
}

export const BoothPage = () => {
  const [status, setStatus] = useState<"idle" | "verifying" | "success" | "error">("idle");
  const [message, setMessage] = useState("");
  const [data, setData] = useState<string | null>(null);
  const [recentLogs, setRecentLogs] = useState<AuditLog[]>([]);
  const [dbStatus, setDbStatus] = useState<"connecting" | "online" | "offline" | "error">("connecting");
  const [authStatus, setAuthStatus] = useState("Checking...");

  // 1. Connection Monitoring
  useEffect(() => {
    const connectedRef = ref(rtdb, ".info/connected");
    return onValue(connectedRef, (snap) => {
      console.log("RTDB Connection State:", snap.val());
      setDbStatus(snap.val() === true ? "online" : "offline");
    });
  }, []);

  // 2. Real-time Live Feed Logic
  useEffect(() => {
    console.log("Initializing Live Feed Listeners...");
    
    // Listen to Auth
    const unsubscribeAuth = onAuthStateChanged(auth, (user) => {
      console.log("Firebase Auth State Changed:", user ? `Logged in as ${user.uid}` : "Logged out");
      setAuthStatus(user ? "Authenticated" : "Not Authenticated");
    });

    // Listen to Logs (Start immediately, RTDB will queue until auth or connection)
    const logsRef = ref(rtdb, "auditLogs");
    const logsQuery = query(logsRef, limitToLast(20));
    
    const unsubscribeLogs = onValue(logsQuery, (snapshot) => {
      console.log("Log Update Received! Count:", snapshot.size);
      if (snapshot.exists()) {
        const logs: AuditLog[] = [];
        snapshot.forEach((child) => {
          logs.push({ id: child.key!, ...child.val() });
        });
        setRecentLogs(logs.sort((a, b) => b.timestamp - a.timestamp));
      } else {
        console.log("No logs found in 'auditLogs' node.");
      }
    }, (err) => {
      console.error("FIREBASE PERMISSION ERROR:", err);
      setDbStatus("error");
    });

    return () => {
      unsubscribeAuth();
      unsubscribeLogs();
    };
  }, []);

  const sendTestLog = async () => {
    try {
      const logsRef = ref(rtdb, "auditLogs");
      await push(logsRef, {
        action: "TEST_LOG",
        details: JSON.stringify({ reason: "Manual Test from Web UI" }),
        timestamp: Date.now()
      });
      console.log("Test log sent successfully!");
    } catch (e: any) {
      console.error("Failed to send test log:", e);
      alert("Permission Refused: Check your Firebase Database Rules!");
    }
  };

  const handleScan = async (result: any, error: any) => {
    if (error) return;

    if (result?.text && result.text !== data && status === "idle") {
      const token = result.text;
      setData(token);
      setStatus("verifying");

      try {
        const response = await verifyToken(token);
        setStatus("success");
        setMessage(`Verified: ${response.name || "Voter"}`);
        setTimeout(() => { setStatus("idle"); setData(null); }, 3000);
      } catch (e: any) {
        setStatus("error");
        setMessage(e.response?.data?.error || "Verification Failed");
        setTimeout(() => { setStatus("idle"); setData(null); }, 3000);
      }
    }
  };

  const getLogDetails = (log: AuditLog) => {
    try {
      const details = JSON.parse(log.details);
      if (log.action === "VERIFY_SUCCESS") return `✅ ${details.name} (via ${details.method || 'Unknown'})`;
      if (log.action === "ALREADY_VERIFIED") return `❌ Already Voted (ID: ${details.voterId?.slice(-5)})`;
      if (log.action === "VERIFY_FAIL") return `⚠️ ${details.reason}`;
      if (log.action === "TEST_LOG") return `🛠️ System Test: ${details.reason}`;
      return log.action;
    } catch { return log.action; }
  };

  return (
    <div className="max-w-6xl mx-auto px-4 py-8">
      {/* Networking Status */}
      <div className="flex flex-wrap gap-4 mb-6">
        <div className={`px-4 py-2 rounded-xl border flex items-center gap-2 bg-white text-[10px] font-bold ${dbStatus === 'online' ? 'border-green-200 text-green-700' : 'border-red-200 text-red-700'}`}>
          <div className={`h-2 w-2 rounded-full ${dbStatus === 'online' ? 'bg-green-500' : 'bg-red-500 animate-pulse'}`} />
          DB: {dbStatus.toUpperCase()}
        </div>
        <div className="px-4 py-2 rounded-xl border border-blue-200 bg-white text-blue-700 text-[10px] font-bold">
          AUTH: {authStatus.toUpperCase()}
        </div>
        <button onClick={sendTestLog} className="px-4 py-2 rounded-xl border border-gray-900 bg-gray-900 text-white hover:bg-black text-[10px] font-bold transition-all">
          SEND TEST EVENT
        </button>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-12 gap-8">
        <div className="lg:col-span-7">
          <div className={`relative aspect-square rounded-[3rem] overflow-hidden bg-black shadow-2xl border-8 transition-all duration-500 ${
            status === 'success' ? 'border-green-500' : status === 'error' ? 'border-red-500' : 'border-white'
          }`}>
            {status === 'idle' ? (
              <>
                <QrReader
                  onResult={handleScan}
                  constraints={{ facingMode: "environment" }}
                  containerStyle={{ width: '100%', height: '100%' }}
                  videoStyle={{ width: '100%', height: '100%', objectFit: 'cover' }}
                />
                <div className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 w-64 h-64 border-2 border-white/50 border-dashed rounded-3xl" />
              </>
            ) : (
              <div className={`h-full flex flex-col items-center justify-center text-white px-10 text-center ${
                status === 'verifying' ? 'bg-blue-600' : status === 'success' ? 'bg-green-600' : 'bg-red-600'
              }`}>
                <h2 className="text-4xl font-black uppercase tracking-tighter mb-2">{status === 'verifying' ? 'Checking...' : status.toUpperCase()}</h2>
                <p className="text-xl font-medium opacity-90">{message}</p>
              </div>
            )}
          </div>
        </div>

        <div className="lg:col-span-5 h-[600px] flex flex-col">
          <div className="bg-[#0f1115] rounded-[2.5rem] p-8 h-full shadow-2xl flex flex-col border border-gray-800">
            <div className="flex items-center justify-between mb-8">
              <div className="flex items-center gap-3">
                <div className="h-3 w-3 bg-red-500 rounded-full animate-ping" />
                <h3 className="text-white font-black text-xl uppercase italic tracking-tighter">Live Monitor</h3>
              </div>
              <span className="text-gray-500 text-[10px] font-mono">{recentLogs.length} EVENTS</span>
            </div>

            <div className="flex-1 overflow-y-auto space-y-4 pr-2 custom-scrollbar">
              {recentLogs.length > 0 ? (
                recentLogs.map((log) => (
                  <div key={log.id} className="bg-gray-900 border border-gray-800 p-5 rounded-2xl">
                    <div className="flex justify-between items-start mb-2">
                       <span className={`text-[9px] font-bold px-2 py-0.5 rounded uppercase ${
                         log.action === 'VERIFY_SUCCESS' ? 'bg-green-500/10 text-green-400' : 
                         log.action === 'TEST_LOG' ? 'bg-blue-500/10 text-blue-400' : 'bg-red-500/10 text-red-400'
                       }`}>
                         {log.action.replace('VERIFY_', '')}
                       </span>
                       <span className="text-[9px] font-mono text-gray-500">{new Date(log.timestamp).toLocaleTimeString()}</span>
                    </div>
                    <p className="text-sm text-gray-300 font-bold">{getLogDetails(log)}</p>
                  </div>
                ))
              ) : (
                <div className="h-full flex flex-col items-center justify-center text-center">
                  <p className="text-gray-600 font-mono text-xs uppercase tracking-[0.2em]">Awaiting Hardware Input...</p>
                </div>
              )}
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};
