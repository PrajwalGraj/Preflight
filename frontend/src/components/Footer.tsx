import type { MouseEvent } from "react";
import { Link } from "react-router-dom";
import { SignatureMarquee } from "./SignatureMarquee";

const PRODUCT_LINKS = [
  { label: "Live Network", href: "/#signal" },
  { label: "Top Actions", href: "/#actions" },
  { label: "Check a Program", href: "/status/jupiter" },
];

const DEVELOPER_LINKS = [
  { label: "How It Works", href: "/#developer" },
  { label: "Docs", href: "/docs" },
  { label: "GitHub", href: "https://github.com/PrajwalGraj/Preflight", external: true },
];

const TAGS = ["Solana Mainnet", "Open Source", "MIT License"];

function GithubIcon() {
  return (
    <svg className="w-4 h-4" fill="currentColor" viewBox="0 0 24 24">
      <path
        d="M12 0C5.37 0 0 5.37 0 12c0 5.31 3.435
        9.795 8.205 11.385.6.105.825-.255.825-.57
        0-.285-.015-1.23-.015-2.235-3.015.555-3.795-.735
        -4.035-1.41-.135-.345-.72-1.41-1.23-1.695
        -.42-.225-1.02-.78-.015-.795.945-.015 1.62.87
        1.845 1.23 1.08 1.815 2.805 1.305 3.495.99
        .105-.78.42-1.305.765-1.605-2.67-.3-5.46-1.335
        -5.46-5.925 0-1.305.465-2.385 1.23-3.225
        -.12-.3-.54-1.53.12-3.18 0 0 1.005-.315 3.3
        1.23.96-.27 1.98-.405 3-.405s2.04.135 3 .405
        c2.295-1.56 3.3-1.23 3.3-1.23.66 1.65.24
        2.88.12 3.18.765.84 1.23 1.905 1.23 3.225
        0 4.605-2.805 5.625-5.475 5.925.435.375.81
        1.095.81 2.22 0 1.605-.015 2.895-.015 3.3
        0 .315.225.69.825.57A12.02 12.02 0 0 0 24 12
        c0-6.63-5.37-12-12-12z"
      />
    </svg>
  );
}

function FooterColumn({
  title,
  links,
}: {
  title: string;
  links: { label: string; href: string; external?: boolean }[];
}) {
  return (
    <div>
      <div className="text-[11px] font-semibold uppercase tracking-[0.15em] text-white/40 mb-4">
        {title}
      </div>
      <ul className="space-y-3">
        {links.map((link) =>
          link.external ? (
            <li key={link.label}>
              <a
                href={link.href}
                target="_blank"
                rel="noreferrer"
                className="text-sm text-white/60 hover:text-white transition-colors duration-200"
              >
                {link.label}
              </a>
            </li>
          ) : (
            <li key={link.label}>
              <Link
                to={link.href}
                className="text-sm text-white/60 hover:text-white transition-colors duration-200"
              >
                {link.label}
              </Link>
            </li>
          ),
        )}
      </ul>
    </div>
  );
}

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
    <footer className="relative bg-black">
      {/* Accent top border — thin purple line with a faint yellow hairline beneath it */}
      <div aria-hidden className="h-[2px] bg-[var(--purple)]" />
      <div aria-hidden className="h-px bg-[var(--yellow)]/40" />

      <div className="relative">
        <div className="relative max-w-7xl mx-auto grid grid-cols-1 lg:grid-cols-[1.6fr_1fr] border-x border-white/20">
          {/* Left column */}
          <div className="border-b lg:border-b-0 lg:border-r border-white/20 px-8 md:px-14 py-16">
            <Link to="/" className="inline-flex items-center gap-3 mb-10">
              <div className="w-9 h-9 bg-black border border-[var(--yellow)] flex items-center justify-center">
                <span className="text-[var(--yellow)] font-bold text-sm">P</span>
              </div>
              <span className="text-2xl font-bold text-white tracking-tight">Preflight</span>
            </Link>

            <h3 className="display text-2xl md:text-3xl text-white max-w-md mb-14">
              Know your transaction's{" "}
              <span className="text-[var(--yellow)]">outcome</span> before you sign.
            </h3>

            <div className="h-px bg-white/20 mb-10" />

            <div className="grid grid-cols-2 gap-8 mb-14">
              <FooterColumn title="Product" links={PRODUCT_LINKS} />
              <FooterColumn title="Developers" links={DEVELOPER_LINKS} />
            </div>

            <div className="flex flex-wrap items-center gap-3">
              {TAGS.map((tag) => (
                <span
                  key={tag}
                  className="text-[11px] font-mono px-3 py-1.5 border border-[var(--rule)] text-white/50"
                >
                  {tag}
                </span>
              ))}
            </div>
          </div>

          {/* Right column */}
          <div className="flex flex-col">
            <div className="flex items-center px-8 pt-16 pb-6 border-b border-white/20">
              <a
                href="https://github.com/PrajwalGraj/Preflight"
                target="_blank"
                rel="noreferrer"
                className="flex items-center gap-2 text-sm text-white/70 hover:text-white transition-colors duration-200"
              >
                GitHub
                <GithubIcon />
              </a>
            </div>

            <div
              className="relative flex-1 min-h-[280px] border-b border-white/20 overflow-hidden"
              onMouseMove={handleMouseMove}
              onMouseLeave={handleMouseLeave}
            >
              <SignatureMarquee />
            </div>

            <div className="px-8 py-5 text-right text-xs text-white/40 font-mono">
              © {new Date().getFullYear()} Preflight
            </div>
          </div>
        </div>
      </div>
    </footer>
  );
}
