import { useState, useEffect } from "react";
import { QrReader } from "react-qr-reader";
import { verifyToken } from "../api/client";
import { rtdb, auth } from "../firebase-config";
import { ref, onValue, query, limitToLast, set } from "firebase/database";
import { onAuthStateChanged } from "firebase/auth";

export const BoothPage = () => {
  const [status, setStatus] = useState<"idle" | "verifying" | "success" | "error">("idle");
  const [message, setMessage] = useState("");
  const [recentLogs, setRecentLogs] = useState<any[]>([]);
  const [rawScanData, setRawScanData] = useState<any>(null);
  const [dbStatus, setDbStatus] = useState("Checking...");

  useEffect(() => {
    // 1. Monitor Connection
    onValue(ref(rtdb, ".info/connected"), (snap) => {
      setDbStatus(snap.val() ? "ONLINE" : "OFFLINE");
    });

    // 2. THE FIX: Aggressive Listener for Latest Scan
    // We listen to the whole object and trigger whenever ANY field inside changes
    const scanRef = ref(rtdb, 'latest_scan');
    const unsubscribeScan = onValue(scanRef, (snapshot) => {
      const data = snapshot.val();
      setRawScanData(data); // Log to debug panel
      
      if (data && data.status) {
        console.log("REAL-TIME SCAN DETECTED:", data);
        
        if (data.status === "Approved" || data.status === "VERIFY_SUCCESS") {
          setStatus("success");
          setMessage(`✅ ${data.name || 'Voter'} Approved!`);
          setTimeout(() => setStatus("idle"), 4000);
        } else {
          setStatus("error");
          setMessage(`❌ ${data.status}: ${data.reason || 'Denied'}`);
          setTimeout(() => setStatus("idle"), 4000);
        }
      }
    });

    // 3. Audit Logs History
    const logsRef = query(ref(rtdb, "auditLogs"), limitToLast(10));
    const unsubscribeLogs = onValue(logsRef, (snapshot) => {
      if (snapshot.exists()) {
        const logs: any[] = [];
        snapshot.forEach((child) => {
          logs.push({ id: child.key, ...child.val() });
        });
        setRecentLogs(logs.reverse());
      }
    });

    return () => {
      unsubscribeScan();
      unsubscribeLogs();
    };
  }, []);

  const resetScanner = async () => {
    await set(ref(rtdb, 'latest_scan'), null);
    setStatus("idle");
    setMessage("");
    alert("System State Reset");
  };

  return (
    <div className="min-h-screen bg-[#050505] text-white p-4 font-sans">
      {/* Top Navigation / Status */}
      <div className="max-w-6xl mx-auto flex justify-between items-center mb-8 bg-[#111] p-4 rounded-2xl border border-white/5">
        <div className="flex items-center gap-6">
          <h1 className="text-xl font-black italic tracking-tighter uppercase">VOTE.SH</h1>
          <div className="flex items-center gap-2 px-3 py-1 bg-white/5 rounded-full border border-white/10">
            <div className={`h-2 w-2 rounded-full ${dbStatus === 'ONLINE' ? 'bg-green-500 shadow-[0_0_10px_rgba(34,197,94,0.5)]' : 'bg-red-500 animate-pulse'}`} />
            <span className="text-[10px] font-bold text-gray-400">DB: {dbStatus}</span>
          </div>
        </div>
        <button onClick={resetScanner} className="text-[10px] font-bold text-gray-500 hover:text-white transition-colors uppercase tracking-widest">
          Reset System Node
        </button>
      </div>

      <div className="max-w-6xl mx-auto grid grid-cols-1 lg:grid-cols-12 gap-8">
        {/* Main Display Area */}
        <div className="lg:col-span-7 space-y-6">
          <div className={`relative aspect-square rounded-[3rem] overflow-hidden border-[16px] transition-all duration-500 shadow-2xl ${
            status === 'success' ? 'border-green-500 shadow-green-500/20' : 
            status === 'error' ? 'border-red-500 shadow-red-500/20' : 'border-[#1a1a1a]'
          }`}>
            <div className={`h-full flex flex-col items-center justify-center p-12 text-center transition-colors duration-500 ${
              status === 'success' ? 'bg-green-600/10' : 
              status === 'error' ? 'bg-red-600/10' : 'bg-[#0a0a0a]'
            }`}>
              {status === 'idle' ? (
                <div className="space-y-4">
                  <div className="w-24 h-24 border-4 border-dashed border-white/10 rounded-full mx-auto animate-[spin_10s_linear_infinite]" />
                  <p className="text-gray-600 font-bold uppercase tracking-[0.3em] text-xs">Waiting for Input...</p>
                </div>
              ) : (
                <div className="animate-in zoom-in duration-300">
                  <div className="text-9xl mb-8 drop-shadow-2xl">
                    {status === 'success' ? '✅' : '🚫'}
                  </div>
                  <h2 className="text-6xl font-black uppercase italic tracking-tighter mb-4">
                    {status === 'success' ? 'Approved' : 'Denied'}
                  </h2>
                  <p className="text-2xl font-medium text-white/80">{message}</p>
                </div>
              )}
            </div>
          </div>

          {/* New Debug Panel */}
          <div className="bg-[#111] border border-white/5 p-6 rounded-3xl">
            <h3 className="text-[10px] font-black text-blue-500 uppercase tracking-widest mb-4">Raw Firebase Stream (latest_scan)</h3>
            <pre className="text-[10px] font-mono text-gray-400 bg-black/40 p-4 rounded-xl overflow-x-auto">
              {rawScanData ? JSON.stringify(rawScanData, null, 2) : "// Awaiting first update from ESP32..."}
            </pre>
          </div>
        </div>

        {/* Live Feed History */}
        <div className="lg:col-span-5 h-[700px] flex flex-col">
          <div className="bg-[#0c0c0e] rounded-[3rem] p-8 h-full border border-white/5 flex flex-col shadow-2xl">
            <div className="flex items-center gap-3 mb-8 border-b border-white/5 pb-6">
              <div className="h-2 w-2 bg-red-600 rounded-full animate-ping" />
              <h3 className="font-black text-lg uppercase italic tracking-tighter">Live Monitor</h3>
            </div>

            <div className="flex-1 overflow-y-auto space-y-3 pr-2 scrollbar-hide">
              {recentLogs.map((log) => (
                 <div key={log.id} className="bg-white/5 p-5 rounded-2xl border border-white/5 flex flex-col gap-1 transition-all hover:bg-white/10">
                    <div className="flex justify-between items-center">
                      <span className={`text-[8px] font-black px-2 py-0.5 rounded uppercase ${log.action?.includes('SUCCESS') ? 'bg-green-500 text-black' : 'bg-red-500 text-white'}`}>
                        {log.action?.replace('VERIFY_', '') || 'LOG'}
                      </span>
                      <span className="text-[8px] font-mono text-gray-500">{new Date(log.timestamp).toLocaleTimeString()}</span>
                    </div>
                    <p className="text-sm font-bold text-gray-300">
                      {log.action === 'VERIFY_SUCCESS' ? (JSON.parse(log.details).name) : "Verification Failed"}
                    </p>
                 </div>
              ))}
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};
