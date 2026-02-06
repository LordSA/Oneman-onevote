import { BrowserRouter as Router, Routes, Route, Link as RouterLink } from "react-router-dom";
import { VoterPage } from "./pages/VoterPage";
import { BoothPage } from "./pages/BoothPage";import { QrScannerPage } from "./pages/QrScannerPage";
function App() {
  return (
    <Router>
      <div className="min-h-screen bg-gray-50">
        <nav className="bg-white border-b border-gray-200 py-3 sticky top-0 z-10 shadow-sm">
          <div className="max-w-5xl mx-auto px-4">
            <div className="flex items-center justify-between">
              <h1 className="text-xl font-bold text-blue-600 tracking-tight">
                SecureVote
              </h1>
              <div className="flex gap-2 sm:gap-4">
                <RouterLink 
                  to="/" 
                  className="px-3 py-1.5 text-sm font-medium text-gray-700 hover:bg-gray-100 rounded-md transition-colors"
                >
                  Voter
                </RouterLink>
                <RouterLink 
                  to="/booth" 
                  className="px-4 py-1.5 text-sm font-medium text-white bg-blue-600 hover:bg-blue-700 rounded-md transition-colors"
                >
                  Booth
                </RouterLink>                <RouterLink 
                  to="/scanner" 
                  className="px-4 py-1.5 text-sm font-medium text-white bg-purple-600 hover:bg-purple-700 rounded-md transition-colors"
                >
                  Scanner
                </RouterLink>              </div>
            </div>
          </div>
        </nav>

        <main className="py-4 sm:py-8 max-w-5xl mx-auto px-4">
          <Routes>
            <Route path="/" element={<VoterPage />} />
            <Route path="/booth" element={<BoothPage />} />            <Route path="/scanner" element={<QrScannerPage />} />          </Routes>
        </main>
      </div>
    </Router>
  );
}

export default App;
