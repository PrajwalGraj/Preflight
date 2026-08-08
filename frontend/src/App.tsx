import { BrowserRouter, Routes, Route, useLocation } from "react-router-dom";
import { Home } from "./pages/Home";
import { StatusPage } from "./pages/StatusPage";
import { DocsPage } from "./pages/DocsPage";
import { NotFoundPage } from "./pages/NotFoundPage";

function AnimatedRoutes() {
  const location = useLocation();

  return (
    <div key={location.pathname} className="page-fade-in">
      <Routes>
        <Route path="/" element={<Home />} />
        <Route path="/status/:program" element={<StatusPage />} />
        <Route path="/docs" element={<DocsPage />} />
        <Route path="*" element={<NotFoundPage />} />
      </Routes>
    </div>
  );
}

export function App() {
  return (
    <BrowserRouter>
      <AnimatedRoutes />
    </BrowserRouter>
  );
}
