import type { ReactNode } from "react";
import { Reveal } from "./Reveal";

interface Props {
  /** Short mono eyebrow, rendered as `// Label //`. */
  label: string;
  title: ReactNode;
  subtitle?: ReactNode;
  className?: string;
}

/**
 * The single heading treatment used by every section: a mono eyebrow, a
 * monospace display title, and an optional lead paragraph. Left-aligned by
 * default — consistent alignment across sections is what makes the page read
 * as one designed system rather than a stack of unrelated blocks.
 */
export function SectionHeading({ label, title, subtitle, className = "" }: Props) {
  return (
    <Reveal className={className}>
      <div className="eyebrow mb-5">
        <span className="opacity-50">//</span> {label} <span className="opacity-50">//</span>
      </div>
      <h2 className="display text-white text-3xl md:text-5xl mb-5">{title}</h2>
      {subtitle && (
        <p className="text-[var(--grey-text)] max-w-xl leading-relaxed">{subtitle}</p>
      )}
    </Reveal>
  );
}
