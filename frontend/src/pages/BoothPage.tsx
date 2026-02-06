import { useState, useEffect } from "react";
import { QrReader } from "react-qr-reader";
import { verifyToken } from "../api/client";
import { rtdb, auth } from "../firebase-config";
import { ref, onValue, query, limitToLast } from "firebase/database";
import { onAuthStateChanged } from "firebase/auth";

interface AuditLog {
  id: string;
  action: "VERIFY_SUCCESS" | "VERIFY_FAIL" | "ALREADY_VERIFIED";
  details: string;
  timestamp: number;
}

export const BoothPage = () => {
  const [status, setStatus] = useState<
    "idle" | "verifying" | "success" | "error"
  >("idle");
  const [message, setMessage] = useState("");
  const [data, setData] = useState<string | null>(null);
  const [cameraError, setCameraError] = useState<string | null>(null);
  const [showToast, setShowToast] = useState(false);
  const [toastMsg, setToastMsg] = useState("");
  const [recentLogs, setRecentLogs] = useState<AuditLog[]>([]);
  const [isAuthenticated, setIsAuthenticated] = useState(false);

  const triggerToast = (msg: string) => {
    setToastMsg(msg);
    setShowToast(true);
    setTimeout(() => setShowToast(false), 3000);
  };

  // Wait for Auth before listening to RTDB
  useEffect(() => {
    const unsubscribeAuth = onAuthStateChanged(auth, (user) => {
      if (user) {
        setIsAuthenticated(true);
        console.log("Booth authenticated:", user.uid);

        const logsRef = ref(rtdb, "auditLogs");
        const logsQuery = query(logsRef, limitToLast(10));
        
        const unsubscribeRTDB = onValue(logsQuery, (snapshot) => {
          const logs: AuditLog[] = [];
          snapshot.forEach((child) => {
            logs.push({ id: child.key!, ...child.val() });
          });
          console.log("New logs received:", logs.length);
          setRecentLogs(logs.reverse());
        }, (error) => {
          console.error("Firebase Permission Error:", error.message);
          triggerToast("Permission denied: Check Firebase Rules");
        });

        return () => unsubscribeRTDB();
      }
    });

    return () => unsubscribeAuth();
  }, []);

  // Check for camera availability on mount
  useEffect(() => {
    if (!navigator.mediaDevices || !navigator.mediaDevices.getUserMedia) {
      setCameraError("Your browser does not support camera access. Please use a modern browser and ensure you are using HTTPS.");
    }
  }, []);

  const handleScan = async (result: any, error: any) => {
    if (error) {
      const errorName = error?.name || error?.message;
      if (
        errorName === "NotAllowedError" || 
        errorName === "NotFoundError" ||
        errorName === "NotReadableError" ||
        errorName === "OverconstrainedError"
      ) {
        console.error("Camera Error:", error);
        setCameraError(`${error.name}: ${error.message}`);
      }
      return;
    }

    if (
      result &&
      result?.text &&
      result.text !== data &&
      status === "idle"
    ) {
      const token = result.text;
      setData(token);
      setStatus("verifying");

      try {
        const response = await verifyToken(token);
        setStatus("success");
        setMessage(`Verified: ${response.name || "Voter"}`);
        setTimeout(() => {
          setStatus("idle");
          setData(null);
        }, 3000);
      } catch (e: any) {
        setStatus("error");
        setMessage(e.response?.data?.error || "Verification Failed");
        setTimeout(() => {
          setStatus("idle");
          setData(null);
        }, 3000);
      }
    }
  };

  const getLogDetails = (log: AuditLog) => {
    try {
      const details = JSON.parse(log.details);
      if (log.action === "VERIFY_SUCCESS") return `✅ ${details.name || "Voter"} (Method: ${details.method?.toUpperCase() || "QR"})`;
      if (log.action === "ALREADY_VERIFIED") return `❌ Duplicate Attempt (ID: ${details.voterId?.slice(-4)})`;
      if (log.action === "VERIFY_FAIL") return `⚠️ Failed: ${details.reason}`;
      return log.action;
    } catch {
      return log.action;
    }
  };

  return (
    <div className="max-w-4xl mx-auto px-4 py-8 grid grid-cols-1 md:grid-cols-2 gap-8">
      {/* Left Column: Scanner */}
      <div className="space-y-8">
        {/* Toast Notification */}
        {showToast && (
          <div className="fixed top-20 right-4 z-50 bg-green-600 text-white px-6 py-3 rounded-lg shadow-lg">
            {toastMsg}
          </div>
        )}

        <div className="text-center space-y-2">
          <h2 className="text-2xl font-bold text-gray-900">Booth Scanner</h2>
          <p className="text-gray-600 font-mono text-xs">
            {isAuthenticated ? "● System Online" : "○ Authenticating..."}
          </p>
        </div>

        <div 
          className={`relative w-full aspect-square mx-auto bg-black rounded-3xl overflow-hidden shadow-2xl border-4 transition-colors duration-300 ${
            status === "success" ? "border-green-400" :
            status === "error" ? "border-red-400" : "border-gray-200"
          }`}
        >
          {cameraError ? (
            <div className="h-full flex flex-col items-center justify-center p-6 text-center space-y-4">
              <div className="bg-red-50 border border-red-200 p-4 rounded-xl">
                <p className="text-red-700 text-sm font-semibold mb-1">Camera Error</p>
                <p className="text-red-600 text-xs">{cameraError}</p>
              </div>
              <button 
                onClick={() => window.location.reload()}
                className="bg-blue-600 text-white text-sm font-semibold px-4 py-2 rounded-lg hover:bg-blue-700 transition-colors"
              >
                Refresh Page
              </button>
            </div>
          ) : status === "idle" ? (
            <div className="absolute inset-0">
              <QrReader
                onResult={handleScan}
                constraints={{ facingMode: "environment" }}
                containerStyle={{ width: "100%", height: "100%", display: "block", position: "relative" }}
                videoContainerStyle={{ width: "100%", height: "100%", paddingTop: "0" }}
                videoStyle={{ width: "100%", height: "100%", objectFit: "cover", display: "block" }}
                scanDelay={300}
              />
              <div className="absolute inset-x-[15%] inset-y-[15%] border-2 border-dashed border-white/50 rounded-2xl pointer-events-none z-10" />
              <div className="absolute inset-0 bg-gradient-to-t from-black/40 to-transparent pointer-events-none" />
            </div>
          ) : (
            <div className={`h-full flex flex-col items-center justify-center text-white transition-colors duration-300 ${
              status === "verifying" ? "bg-black/70" :
              status === "success" ? "bg-green-600" : "bg-red-600"
            }`}>
              {status === "verifying" && (
                <div className="space-y-4 flex flex-col items-center">
                  <div className="animate-spin rounded-full h-12 w-12 border-4 border-white border-t-transparent" />
                  <p className="font-bold tracking-wide">Verifying Token...</p>
                </div>
              )}
              {status === "success" && (
                <div className="animate-bounce flex flex-col items-center">
                  <span className="text-8xl">✓</span>
                  <p className="text-xl font-bold mt-4 uppercase tracking-widest">Approved</p>
                </div>
              )}
              {status === "error" && (
                <div className="animate-pulse flex flex-col items-center">
                  <span className="text-8xl">✕</span>
                  <p className="text-xl font-bold mt-4 uppercase tracking-widest">Rejected</p>
                </div>
              )}
            </div>
          )}
        </div>

        <div className="space-y-4">
          {status === "success" && (
            <div className="bg-green-600 text-white p-4 rounded-2xl shadow-lg flex items-start space-x-3 transform animate-fade-in">
               <span className="text-xl">✅</span>
               <div>
                 <p className="font-bold">Verified!</p>
                 <p className="text-sm opacity-90">{message}</p>
               </div>
            </div>
          )}

          {status === "error" && (
            <div className="bg-red-600 text-white p-4 rounded-2xl shadow-lg flex items-start space-x-3 transform animate-fade-in">
               <span className="text-xl">⚠️</span>
               <div>
                 <p className="font-bold">Access Denied</p>
                 <p className="text-sm opacity-90">{message}</p>
               </div>
            </div>
          )}
          
          {status === "idle" && (
            <div className="bg-blue-50 p-6 rounded-2xl border border-blue-100 flex flex-col items-center space-y-4">
              <p className="text-blue-700 text-sm font-medium">Waiting for activity...</p>
              {!cameraError && (
                <button 
                  onClick={async () => {
                    try {
                      const stream = await navigator.mediaDevices.getUserMedia({ video: true });
                      stream.getTracks().forEach(t => t.stop());
                      triggerToast("Camera access granted");
                    } catch (e: any) {
                      setCameraError(e.message || "Manual camera check failed");
                    }
                  }}
                  className="text-blue-600 hover:text-blue-700 text-xs font-semibold uppercase tracking-wider transition-colors"
                >
                  Test Camera Access
                </button>
              )}
            </div>
          )}
        </div>
      </div>

      {/* Right Column: Live Event Feed */}
      <div className="space-y-6">
        <div className="bg-gray-900 text-white p-6 rounded-3xl shadow-xl min-h-[500px] flex flex-col overflow-hidden border border-gray-800">
          <div className="flex items-center justify-between mb-6 border-b border-gray-800 pb-4">
            <h3 className="text-lg font-bold flex items-center space-x-2">
              <span className={`h-2 w-2 rounded-full animate-pulse ${isAuthenticated ? "bg-green-500" : "bg-red-500"}`}></span>
              <span>Live Monitor Feed</span>
            </h3>
            <span className="text-[10px] font-mono text-gray-500 uppercase tracking-widest">Real-time</span>
          </div>

          <div className="flex-1 space-y-3 overflow-y-auto pr-2 terminal-scrollbar">
            {recentLogs.length > 0 ? (
              recentLogs.map((log) => (
                <div 
                  key={log.id} 
                  className={`p-3 rounded-xl border-l-[3px] transition-all animate-fade-in ${
                    log.action === "VERIFY_SUCCESS" ? "bg-green-900/10 border-green-500/50" :
                    log.action === "ALREADY_VERIFIED" ? "bg-red-900/10 border-red-500/50" :
                    "bg-yellow-900/10 border-yellow-500/50"
                  }`}
                >
                  <div className="flex justify-between items-start mb-1">
                    <span className={`text-[9px] font-black uppercase tracking-widest ${
                      log.action === "VERIFY_SUCCESS" ? "text-green-400" :
                      log.action === "ALREADY_VERIFIED" ? "text-red-400" : "text-yellow-400"
                    }`}>
                      {log.action.replace("_", " ")}
                    </span>
                    <span className="text-[9px] text-gray-500 font-mono">
                      {new Date(log.timestamp).toLocaleTimeString([], { hour12: false })}
                    </span>
                  </div>
                  <p className="text-xs text-gray-300 font-medium">
                    {getLogDetails(log)}
                  </p>
                </div>
              ))
            ) : (
              <div className="h-full flex flex-col items-center justify-center space-y-3 opacity-20">
                <div className="h-[2px] w-12 bg-gray-700"></div>
                <p className="text-[10px] font-mono uppercase tracking-tighter">System Idle</p>
              </div>
            )}
          </div>

          <div className="mt-6 pt-4 border-t border-gray-800 text-center">
            <p className="text-[10px] text-gray-600 font-mono uppercase tracking-widest">
              Secured Connection | Local Node 01
            </p>
          </div>
        </div>
      </div>
    </div>
  );
};
