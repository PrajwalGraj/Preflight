import type { LevelType } from "../api/client";

interface Props {
  level: LevelType;
}

const levelToColor: Record<LevelType, string> = {
  Low: "bg-[var(--status-green)]",
  Moderate: "bg-[var(--yellow)]",
  High: "bg-[var(--status-red)]",
};

export function StatusDot({ level }: Props) {
  return (
    <span
      className={`inline-block w-2 h-2 rounded-full mr-1.5 ${levelToColor[level]} ${level === "High" ? "animate-pulse" : ""}`}
    />
  );
}
