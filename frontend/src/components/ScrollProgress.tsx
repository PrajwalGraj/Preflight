import { motion, useScroll, useSpring } from "framer-motion";

/** Thin yellow bar pinned to the top of the viewport tracking scroll depth. */
export function ScrollProgress() {
  const { scrollYProgress } = useScroll();
  const scaleX = useSpring(scrollYProgress, {
    stiffness: 200,
    damping: 30,
    restDelta: 0.001,
  });

  return (
    <motion.div
      aria-hidden
      style={{ scaleX }}
      className="fixed top-0 left-0 right-0 h-[3px] bg-[var(--yellow)] origin-left z-[60]"
    />
  );
}
