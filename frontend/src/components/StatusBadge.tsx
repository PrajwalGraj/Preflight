import { motion, useReducedMotion } from "framer-motion";
import type { ActionType } from "../api/client";

interface Props {
  action: ActionType;
  size?: "sm" | "md" | "lg";
}

export function StatusBadge({ action, size = "md" }: Props) {
  const reduced = useReducedMotion();

  const sizeClass = {
    sm: "px-2 py-0.5 text-[10px]",
    md: "px-3 py-1 text-xs",
    lg: "px-4 py-1.5 text-sm",
  }[size];

  // SEND: outline only. CAUTION: filled yellow, black text.
  // WAIT: filled red, white text, continuous pulse.
  const styles: Record<ActionType, string> = {
    Send: "bg-transparent text-[var(--status-green)] border border-[var(--status-green)]",
    Caution: "bg-[var(--yellow)] text-black border border-[var(--yellow)]",
    Wait: "bg-[var(--status-red)] text-white border border-[var(--status-red)]",
  };

  const isWait = action === "Wait";
  const shouldPulse = isWait && !reduced;

  return (
    <motion.span
      animate={shouldPulse ? { opacity: [1, 0.72, 1] } : undefined}
      transition={{ duration: 2, repeat: Infinity, ease: "easeInOut" }}
      className={`inline-flex items-center gap-1.5 rounded-full font-bold uppercase tracking-wider ${sizeClass} ${styles[action]}`}
    >
      {isWait && (
        <motion.span
          className="w-1.5 h-1.5 rounded-full bg-white"
          animate={shouldPulse ? { scale: [1, 1.4, 1] } : undefined}
          transition={{ duration: 2, repeat: Infinity, ease: "easeInOut" }}
        />
      )}
      {action.toUpperCase()}
    </motion.span>
  );
}
