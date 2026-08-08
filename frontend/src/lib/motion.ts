import type { Transition, Variants } from "framer-motion";
export const EASE_OUT: Transition["ease"] = [0.22, 1, 0.36, 1];

export const REVEAL_DURATION = 0.7;
export const INTERACTION_DURATION = 0.25;

export const VIEWPORT = { once: true, amount: 0.2 } as const;

export function staggerContainer(stagger = 0.06, delayChildren = 0): Variants {
  return {
    hidden: {},
    show: {
      transition: { staggerChildren: stagger, delayChildren },
    },
  };
}

export function fadeUpChild(y = 12): Variants {
  return {
    hidden: { opacity: 0, y },
    show: {
      opacity: 1,
      y: 0,
      transition: { duration: REVEAL_DURATION, ease: EASE_OUT },
    },
  };
}

export const POP_SPRING: Transition = {
  type: "spring",
  stiffness: 300,
  damping: 20,
};
