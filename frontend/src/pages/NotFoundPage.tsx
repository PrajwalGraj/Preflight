import { Link } from "react-router-dom";
import { Navbar } from "../components/Navbar";
import { Footer } from "../components/Footer";

export function NotFoundPage() {
  return (
    <div className="min-h-screen bg-[var(--black)]">
      <Navbar />
      <main className="max-w-4xl mx-auto px-6 pt-48 pb-24 text-center">
        <div className="text-8xl font-bold text-[var(--grey-border)] mono mb-6">404</div>
        <h1 className="text-2xl font-bold text-white mb-4">Page not found</h1>
        <p className="text-[var(--grey-text)] mb-10">This page does not exist or has moved.</p>
        <Link
          to="/"
          className="inline-block px-8 py-4 bg-[var(--yellow)] text-black font-bold rounded-none hover:opacity-90 transition-opacity"
        >
          Back to Homepage
        </Link>
      </main>
      <Footer />
    </div>
  );
}
