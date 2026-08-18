import { BrowserRouter, Routes, Route, useLocation } from "react-router-dom";
import { WalletContextProvider } from "./components/WalletContext";
import { Home } from "./pages/Home";
import { StatusPage } from "./pages/StatusPage";
import { DocsPage } from "./pages/DocsPage";
import { DiagnosePage } from "./pages/DiagnosePage";
import { NotFoundPage } from "./pages/NotFoundPage";

function AnimatedRoutes() {
  const location = useLocation();

  return (
    <div key={location.pathname} className="page-fade-in">
      <Routes>
        <Route path="/" element={<Home />} />
        <Route path="/status/:program" element={<StatusPage />} />
        <Route path="/docs" element={<DocsPage />} />
        <Route path="/diagnose" element={<DiagnosePage />} />
        <Route path="*" element={<NotFoundPage />} />
      </Routes>
    </div>
  );
}

export function App() {
  return (
    <WalletContextProvider>
      <BrowserRouter>
        <AnimatedRoutes />
      </BrowserRouter>
    </WalletContextProvider>
  );
}
