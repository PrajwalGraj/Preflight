import type { MouseEvent } from "react";
import { Link } from "react-router-dom";
import { PURPLE_CARD_BACKGROUND } from "../lib/purpleCard";
import { SignatureMarquee } from "./SignatureMarquee";

function handleMouseMove(e: MouseEvent<HTMLElement>) {
  const rect = e.currentTarget.getBoundingClientRect();
  e.currentTarget.style.setProperty("--mx", `${e.clientX - rect.left}px`);
  e.currentTarget.style.setProperty("--my", `${e.clientY - rect.top}px`);
}

function handleMouseLeave(e: MouseEvent<HTMLElement>) {
  e.currentTarget.style.setProperty("--mx", "-9999px");
  e.currentTarget.style.setProperty("--my", "-9999px");
}

export function Footer() {
  return (
    <footer
      className="relative bg-black"
      style={{ height: "100vh" }}
      onMouseMove={handleMouseMove}
      onMouseLeave={handleMouseLeave}
    >
      <SignatureMarquee />

      <div
        className="absolute overflow-hidden rounded-[2.5rem] flex items-center justify-center text-center"
        style={{ ...PURPLE_CARD_BACKGROUND, top: "5vh", bottom: "5vh", left: "5vw", right: "5vw" }}
      >
        <div className="relative z-10 px-6">
          <h2 className="text-6xl md:text-8xl font-extrabold tracking-tight text-white">
            Preflight
          </h2>
          <p className="mt-4 text-white/70 text-lg max-w-md mx-auto">
            Know before you send.
          </p>

          <div className="mt-10 flex items-center justify-center gap-8 text-sm text-white/80">
            <Link to="/docs" className="hover:text-white transition-colors">
              Docs
            </Link>
            <a
              href="https://github.com/PrajwalGraj/Preflight"
              target="_blank"
              rel="noreferrer"
              className="hover:text-white transition-colors"
            >
              GitHub
            </a>
          </div>

          <div className="mt-10 text-xs text-white/50">
            Built on Solana · Open source · MIT License
          </div>
        </div>
      </div>
    </footer>
  );
}
