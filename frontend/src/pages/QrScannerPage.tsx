import { useState, useEffect, useRef } from "react";
import { Html5Qrcode } from "html5-qrcode";
import { verifyToken } from "../api/client";
import { rtdb } from "../firebase-config";
import { ref, onValue } from "firebase/database";

export const QrScannerPage = () => {
  const [status, setStatus] = useState<"idle" | "verifying" | "success" | "error">("idle");
  const [message, setMessage] = useState("Align QR code within frame");
  const [dbStatus, setDbStatus] = useState("DISCONNECTED");
  const [camError, setCamError] = useState<string | null>(null);
  
  const scannerRef = useRef<Html5Qrcode | null>(null);
  const lastToken = useRef<string | null>(null);

  useEffect(() => {
    // Firebase connection monitoring
    onValue(ref(rtdb, ".info/connected"), (snap) => {
      setDbStatus(snap.val() ? "SYSTEM ONLINE" : "SYSTEM OFFLINE");
    });

    // Initialize Scanner
    const startScanner = async () => {
      try {
        const html5QrCode = new Html5Qrcode("reader");
        scannerRef.current = html5QrCode;

        const config = { 
          fps: 10, 
          qrbox: { width: 250, height: 250 },
          aspectRatio: 1.0
        };

        await html5QrCode.start(
          { facingMode: "environment" }, 
          config,
          (decodedText) => handleScanSuccess(decodedText)
        );
      } catch (err: any) {
        console.error("Scanner Start Error:", err);
        setCamError(err.message || "Could not access camera. Ensure permissions are granted.");
      }
    };

    startScanner();

    return () => {
      if (scannerRef.current?.isScanning) {
        scannerRef.current.stop().catch(e => console.error("Clean up error", e));
      }
    };
  }, []);

  const handleScanSuccess = async (decodedText: string) => {
    // Basic debounce
    if (decodedText === lastToken.current || status !== "idle") return;
    
    lastToken.current = decodedText;
    setStatus("verifying");
    setMessage("Cryptographic Check...");

    try {
      const response = await verifyToken(decodedText);
      setStatus("success");
      setMessage(`MATCH: ${response.name || "Verified"}`);
      
      setTimeout(() => {
        setStatus("idle");
        lastToken.current = null;
        setMessage("Ready for next scan");
      }, 3500);
    } catch (e: any) {
      setStatus("error");
      setMessage(e.response?.data?.error || "Invalid Security Token");
      
      setTimeout(() => {
        setStatus("idle");
        lastToken.current = null;
        setMessage("Align QR code within frame");
      }, 3500);
    }
  };

  return (
    <div className="min-h-screen bg-black text-white flex flex-col items-center justify-center p-6 font-mono overflow-hidden">
      {/* HUD Header */}
      <div className="w-full max-w-md flex justify-between items-center mb-8 border-b border-white/10 pb-4">
        <div>
          <h1 className="text-xl font-black italic tracking-tighter text-blue-500 uppercase">Scanner.v3</h1>
          <p className="text-[8px] font-bold tracking-[0.4em] opacity-40 uppercase">Optical Identity Verification</p>
        </div>
        <div className={`text-[10px] font-bold px-3 py-1 rounded-full border border-white/5 bg-white/5 ${dbStatus.includes('ONLINE') ? 'text-green-500' : 'text-red-500'}`}>
          {dbStatus}
        </div>
      </div>

      {/* Optical Core */}
      <div className="relative w-full max-w-md aspect-square rounded-[3rem] overflow-hidden border-[1px] border-white/10 shadow-[0_0_100px_rgba(0,0,0,1)] bg-zinc-950">
        
        {/* HTML5 QrCode Target Element */}
        <div id="reader" className="w-full h-full object-cover"></div>

        {/* Scan HUD Overlay (Visible only when idle) */}
        {status === 'idle' && !camError && (
          <div className="absolute inset-0 pointer-events-none z-10">
            <div className="absolute inset-12 border border-blue-500/20 rounded-3xl">
              <div className="absolute top-0 left-0 w-8 h-8 border-t-4 border-l-4 border-blue-500 rounded-tl-xl" />
              <div className="absolute top-0 right-0 w-8 h-8 border-t-4 border-r-4 border-blue-500 rounded-tr-xl" />
              <div className="absolute bottom-0 left-0 w-8 h-8 border-b-4 border-l-4 border-blue-500 rounded-bl-xl" />
              <div className="absolute bottom-0 right-0 w-8 h-8 border-b-4 border-r-4 border-blue-500 rounded-br-xl" />
              <div className="absolute top-0 left-2 right-2 h-[2px] bg-blue-500/50 shadow-[0_0_15px_rgba(59,130,246,0.8)] animate-[scan_2.5s_ease-in-out_infinite]" />
            </div>
            
            {/* Corners metadata */}
            <div className="absolute top-4 left-4 text-[8px] text-blue-500 font-bold opacity-50 uppercase">Matrix Code Look-up</div>
            <div className="absolute bottom-4 right-4 text-[8px] text-blue-500 font-bold opacity-50 uppercase tracking-widest">LENS-01 ACTIVE</div>
          </div>
        )}

        {/* Status Overlay */}
        {status !== 'idle' && (
          <div className={`absolute inset-0 flex flex-col items-center justify-center p-12 text-center z-20 transition-all duration-500 ${
            status === 'success' ? 'bg-green-600/90 backdrop-blur-md' : 
            status === 'error' ? 'bg-red-600/90 backdrop-blur-md' : 'bg-blue-600/90 backdrop-blur-md'
          }`}>
             <div className="text-8xl mb-6">
               {status === 'verifying' ? '⏳' : status === 'success' ? '✅' : '❌'}
             </div>
             <h2 className="text-4xl font-black uppercase tracking-tighter mb-2 italic">
               {status === 'verifying' ? 'Checking' : status === 'success' ? 'Approved' : 'Denied'}
             </h2>
             <p className="text-lg font-bold opacity-80 uppercase tracking-tight">{message}</p>
          </div>
        )}

        {/* Error State */}
        {camError && (
          <div className="absolute inset-0 bg-zinc-950 flex flex-col items-center justify-center p-8 text-center z-30 border border-red-500/50">
            <div className="text-5xl mb-4 text-red-500">📷</div>
            <h3 className="text-red-500 font-bold uppercase mb-2 tracking-widest text-sm underline decoration-red-500/30">Camera Access Error</h3>
            <p className="text-[10px] text-gray-500 mb-6 leading-relaxed max-w-[200px] uppercase font-bold">{camError}</p>
            <button 
              onClick={() => window.location.reload()}
              className="px-6 py-2 bg-white text-zinc-950 font-black rounded-lg text-[10px] uppercase tracking-widest active:scale-95 transition-all"
            >
              Reset Terminal
            </button>
          </div>
        )}
      </div>

      {/* Footer Meta */}
      <div className="mt-8 flex flex-col items-center text-center">
        <div className="flex gap-1.5 mb-2">
          <div className={`h-1 w-6 rounded-full ${status === 'verifying' ? 'bg-blue-500 animate-pulse' : 'bg-zinc-800'}`} />
          <div className={`h-1 w-6 rounded-full ${status === 'success' ? 'bg-green-500' : 'bg-zinc-800'}`} />
          <div className={`h-1 w-6 rounded-full ${status === 'error' ? 'bg-red-500' : 'bg-zinc-800'}`} />
        </div>
        <p className="text-[9px] text-zinc-600 uppercase tracking-[0.3em] font-bold">{message}</p>
      </div>

      <style>{`
        #reader { border: none !important; }
        #reader video { width: 100% !important; height: 100% !important; object-fit: cover !important; }
        @keyframes scan {
          0% { top: 10%; opacity: 0; }
          20% { opacity: 1; }
          80% { opacity: 1; }
          100% { top: 90%; opacity: 0; }
        }
      `}</style>
    </div>
  );
};
