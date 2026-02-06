import QRCode from "react-qr-code";
import { useState, useEffect } from "react";
import { devSetup, registerVoter } from "../api/client";
import { rtdb, auth } from "../firebase-config";
import { ref, onValue, query, limitToLast } from "firebase/database";
import { onAuthStateChanged } from "firebase/auth";

interface VoterData {
  id: string;
  name: string;
  rfid: string;
  qrData: string;
  has_voted: boolean;
  timestamp?: number | string;
}

interface ToastState {
  message: string;
  type: "success" | "error" | "info" | "warning";
  visible: boolean;
}

export const VoterPage = () => {
  const [activeTab, setActiveTab] = useState<"register" | "directory">("register");
  const [token, setToken] = useState<string | null>(null);
  const [isLoading, setIsLoading] = useState(false);
  const [voters, setVoters] = useState<VoterData[]>([]);
  const [errorMsg, setErrorMsg] = useState<string | null>(null);
  
  // Registration Form State
  const [regName, setRegName] = useState("");
  const [regRfid, setRegRfid] = useState("");
  
  const [toast, setToast] = useState<ToastState>({
    message: "",
    type: "info",
    visible: false
  });

  const showToast = (message: string, type: ToastState["type"] = "info") => {
    setToast({ message, type, visible: true });
    setTimeout(() => setToast(prev => ({ ...prev, visible: false })), 3000);
  };

  // Real-time listener for voters from RTDB
  useEffect(() => {
    const unsubscribeAuth = onAuthStateChanged(auth, (user) => {
      if (user) {
        try {
          const votersRef = ref(rtdb, "voters");
          const votersQuery = query(votersRef, limitToLast(20));

          const unsubscribeRTDB = onValue(
            votersQuery,
            (snapshot) => {
              const votersList: VoterData[] = [];
              snapshot.forEach((childSnapshot) => {
                const data = childSnapshot.val();
                votersList.push({
                  id: childSnapshot.key as string,
                  ...data,
                });
              });
              setVoters([...votersList].reverse());
              setErrorMsg(null);
            },
            (error) => {
              console.error("RTDB error:", error);
              setErrorMsg(error.message);
            }
          );

          return () => unsubscribeRTDB();
        } catch (error: any) {
          setErrorMsg(error.message);
        }
      }
    });

    return () => unsubscribeAuth();
  }, []);

  const handleRegister = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!regName || !regRfid) {
      showToast("Please fill all fields", "warning");
      return;
    }

    setIsLoading(true);
    try {
      const generatedQr = `VOTE_${regName.toUpperCase().replace(/\s/g, "_")}_${Math.floor(1000 + Math.random() * 9000)}`;
      
      await registerVoter({
        name: regName,
        rfid: regRfid,
        qrData: generatedQr
      });

      setToken(generatedQr);
      setRegName("");
      setRegRfid("");
      showToast("Voter Registered Successfully", "success");
    } catch (e: any) {
      showToast(e.message || "Registration failed", "error");
    } finally {
      setIsLoading(false);
    }
  };

  const handleGenerateDemo = async () => {
    setIsLoading(true);
    try {
      const data = await devSetup();
      setToken(data.token);
      showToast("Demo Data Created", "info");
    } catch (e) {
      showToast("Error creating demo", "error");
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <div className="max-w-2xl mx-auto px-4 py-8 relative">
      {/* Toast Notification */}
      {toast.visible && (
        <div className={`fixed top-20 right-4 z-50 px-6 py-3 rounded-lg shadow-lg text-white transition-opacity duration-300 ${
          toast.type === "success" ? "bg-green-600" :
          toast.type === "error" ? "bg-red-600" :
          toast.type === "warning" ? "bg-yellow-600" : "bg-blue-600"
        }`}>
          {toast.message}
        </div>
      )}

      {/* Tabs */}
      <div className="flex border-b border-gray-200 mb-8">
        <button
          onClick={() => setActiveTab("register")}
          className={`flex-1 py-3 text-sm font-medium transition-colors border-b-2 ${
            activeTab === "register" 
              ? "border-blue-600 text-blue-600" 
              : "border-transparent text-gray-500 hover:text-gray-700 hover:border-gray-300"
          }`}
        >
          Register Voter
        </button>
        <button
          onClick={() => setActiveTab("directory")}
          className={`flex-1 py-3 text-sm font-medium transition-colors border-b-2 ${
            activeTab === "directory" 
              ? "border-blue-600 text-blue-600" 
              : "border-transparent text-gray-500 hover:text-gray-700 hover:border-gray-300"
          }`}
        >
          Voter Directory
        </button>
      </div>

      <div className="space-y-8">
        {activeTab === "register" ? (
          <div className="space-y-6">
            <div className="text-center">
              <h2 className="text-2xl font-bold text-gray-900">Registration</h2>
              <p className="text-gray-600 mt-1">Link physical RFID tags to digital identities.</p>
            </div>

            <div className="bg-white border border-gray-200 rounded-2xl shadow-sm overflow-hidden">
              <div className="p-6">
                {token ? (
                    <div className="flex flex-col items-center space-y-6">
                      <span className="bg-green-100 text-green-800 text-xs font-semibold px-3 py-1 rounded-full uppercase tracking-wider">
                        Registration Complete!
                      </span>
                      <div className="p-4 bg-white border border-gray-100 rounded-xl shadow-inner">
                        <QRCode 
                          value={token} 
                          size={200}
                          style={{ height: "auto", maxWidth: "100%", width: "100%" }} 
                        />
                      </div>
                      <div className="w-full border-t border-gray-100 italic gap-2 py-4"></div>
                      <div className="flex flex-col items-center space-y-3 w-full">
                        <p className="font-bold text-gray-900">Digital Token (QR String)</p>
                        <div className="p-3 bg-gray-50 rounded-lg w-full text-center">
                          <code className="text-sm font-mono text-gray-600 break-all">{token}</code>
                        </div>
                        <button 
                          onClick={() => setToken(null)}
                          className="text-blue-600 hover:text-blue-700 font-medium text-sm transition-colors"
                        >
                          Register Another
                        </button>
                      </div>
                    </div>
                  ) : (
                    <form onSubmit={handleRegister} className="space-y-5">
                      <div className="space-y-1">
                        <label className="block text-sm font-medium text-gray-700">Voter Name</label>
                        <input 
                          required
                          type="text"
                          placeholder="e.g. Shibili" 
                          value={regName} 
                          onChange={(e) => setRegName(e.target.value)}
                          className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent outline-none transition-all"
                        />
                      </div>
                      
                      <div className="space-y-1">
                        <label className="block text-sm font-medium text-gray-700">RFID UID (from Serial Monitor)</label>
                        <input 
                          required
                          type="text"
                          placeholder="e.g. 834D4CC5" 
                          value={regRfid} 
                          onChange={(e) => setRegRfid(e.target.value)}
                          className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent outline-none transition-all"
                        />
                      </div>
                      
                      <button 
                        type="submit" 
                        disabled={isLoading}
                        className="w-full bg-blue-600 text-white font-semibold py-3 rounded-lg hover:bg-blue-700 disabled:opacity-50 disabled:cursor-not-allowed transition-all shadow-md"
                      >
                        {isLoading ? "Processing..." : "Create Voter Profile"}
                      </button>
                      
                      <div className="relative py-4">
                        <div className="absolute inset-0 flex items-center"><div className="w-full border-t border-gray-200"></div></div>
                        <div className="relative flex justify-center text-sm"><span className="px-2 bg-white text-gray-500 font-bold uppercase">Or</span></div>
                      </div>
                      
                      <button 
                        type="button"
                        onClick={handleGenerateDemo} 
                        disabled={isLoading}
                        className="w-full border border-gray-300 text-gray-700 font-medium py-2 rounded-lg hover:bg-gray-50 disabled:opacity-50 transition-all text-sm"
                      >
                        Create Demo Profile
                      </button>
                    </form>
                  )}
              </div>
            </div>
          </div>
        ) : (
          <div className="space-y-6">
            <div className="text-center">
              <h2 className="text-2xl font-bold text-gray-900">All Voters</h2>
              <p className="text-gray-600 mt-1">Real-time voter profile monitoring</p>
            </div>

            <div className="bg-white border border-gray-200 rounded-2xl shadow-sm overflow-hidden">
              {voters.length > 0 ? (
                <div className="overflow-x-auto">
                  <table className="min-w-full divide-y divide-gray-200">
                    <thead className="bg-gray-50">
                      <tr>
                        <th className="px-6 py-4 text-left text-xs font-semibold text-gray-500 uppercase tracking-wider">Name</th>
                        <th className="px-6 py-4 text-left text-xs font-semibold text-gray-500 uppercase tracking-wider">RFID</th>
                        <th className="px-6 py-4 text-left text-xs font-semibold text-gray-500 uppercase tracking-wider">Status</th>
                        <th className="px-6 py-4 text-left text-xs font-semibold text-gray-500 uppercase tracking-wider">Voted At</th>
                      </tr>
                    </thead>
                    <tbody className="bg-white divide-y divide-gray-100 italic">
                      {voters.map((voter) => (
                        <tr key={voter.id} className="hover:bg-gray-50 transition-colors">
                          <td className="px-6 py-4 whitespace-nowrap font-bold text-gray-900">{voter.name}</td>
                          <td className="px-6 py-4 whitespace-nowrap font-mono text-xs text-gray-600">{voter.rfid}</td>
                          <td className="px-6 py-4 whitespace-nowrap">
                            <span className={`px-2.5 py-1 rounded-full text-xs font-medium ${
                              voter.has_voted 
                                ? "bg-red-100 text-red-700" 
                                : "bg-green-100 text-green-700"
                            }`}>
                              {voter.has_voted ? "Voted" : "Eligible"}
                            </span>
                          </td>
                          <td className="px-6 py-4 whitespace-nowrap text-xs text-gray-500 italic">
                            {voter.timestamp 
                              ? new Date(voter.timestamp).toLocaleTimeString() 
                              : "-"}
                          </td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              ) : (
                <div className="py-20 text-center space-y-4">
                  <div className="inline-block animate-spin rounded-full h-8 w-8 border-4 border-blue-600 border-t-transparent"></div>
                  <p className="text-gray-500 font-medium">No voters registered yet...</p>
                </div>
              )}
            </div>
            {errorMsg && (
                <div className="bg-red-50 border border-red-200 text-red-700 px-4 py-3 rounded-lg text-sm">
                  {errorMsg}
                </div>
            )}
          </div>
        )}
      </div>
    </div>
  );
};
