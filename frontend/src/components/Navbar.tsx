import { useRef, useState } from "react";
import { Link } from "react-router-dom";
import { motion, useMotionValueEvent, useReducedMotion, useScroll, useTransform } from "framer-motion";
import { EASE_OUT } from "../lib/motion";

const HIDE_THRESHOLD_PX = 100;

export function Navbar() {
  const { scrollY } = useScroll();
  const [hidden, setHidden] = useState(false);
  const lastScrollY = useRef(0);
  const reduced = useReducedMotion();

  // Smoothly interpolate bg / blur / border across the 0→50px threshold
  // instead of snapping at a single scroll position.
  const background = useTransform(scrollY, [0, 50], ["rgba(0,0,0,0)", "rgba(0,0,0,0.85)"]);
  const backdropBlur = useTransform(scrollY, [0, 50], ["blur(0px)", "blur(12px)"]);
  const borderColor = useTransform(scrollY, [0, 50], ["rgba(26,26,26,0)", "rgba(26,26,26,1)"]);

  useMotionValueEvent(scrollY, "change", (current) => {
    const scrollingDown = current > lastScrollY.current;
    setHidden(scrollingDown && current > HIDE_THRESHOLD_PX);
    lastScrollY.current = current;
  });

  return (
    <motion.nav
      style={{
        background,
        backdropFilter: backdropBlur,
        WebkitBackdropFilter: backdropBlur,
        borderColor,
      }}
      animate={{ y: hidden && !reduced ? "-100%" : "0%" }}
      transition={{ duration: 0.35, ease: EASE_OUT }}
      className="fixed top-0 left-0 right-0 z-50 border-b"
    >
      <div className="max-w-7xl mx-auto px-8 md:px-14 h-16 flex items-center justify-between">
        {/* Logo */}
        <Link to="/" className="flex items-center gap-2.5 group">
          <motion.div
            whileHover={reduced ? undefined : { scale: 1.08, rotate: -4 }}
            transition={{ type: "spring", stiffness: 400, damping: 15 }}
            className="w-7 h-7 bg-[var(--yellow)] flex items-center justify-center"
          >
            <span className="text-black font-bold text-xs">P</span>
          </motion.div>
          <span className="display text-base text-white">Preflight</span>
        </Link>

        {/* Nav links */}
        <div className="hidden md:flex items-center gap-8 text-sm text-[var(--grey-text)]">
          {[
            { href: "/#signal", label: "Signal" },
            { href: "/#actions", label: "Actions" },
            { href: "/#developer", label: "Developers" },
          ].map((link) => (
            <a
              key={link.href}
              href={link.href}
              className="hover:text-white transition-colors duration-200"
            >
              {link.label}
            </a>
          ))}
          <Link to="/docs" className="hover:text-white transition-colors duration-200">
            Docs
          </Link>
        </div>

        {/* GitHub button */}
        <motion.a
          href="https://github.com/PrajwalGraj/Preflight"
          target="_blank"
          rel="noreferrer"
          whileHover={reduced ? undefined : { scale: 1.02, filter: "brightness(1.1)" }}
          whileTap={reduced ? undefined : { scale: 0.98 }}
          transition={{ duration: 0.2, ease: EASE_OUT }}
          className="flex items-center gap-2 px-4 py-2 text-sm font-semibold bg-[var(--yellow)] text-black"
        >
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
          GitHub
        </motion.a>
      </div>
    </motion.nav>
  );
}
