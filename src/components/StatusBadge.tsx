import { cn } from "@/lib/utils";
import type { ToneName } from "@/lib/domain";

const TONE_CLASSES: Record<ToneName, string> = {
  success: "bg-success/12 text-success border-success/30",
  warning: "bg-warning/15 text-warning-foreground border-warning/40",
  danger: "bg-destructive/12 text-destructive border-destructive/30",
  info: "bg-info/12 text-info border-info/30",
  accent: "bg-accent/18 text-accent-foreground border-accent/40",
  neutral: "bg-muted text-muted-foreground border-border",
};

/** Badge de status com tokens semânticos (nunca cores fixas). */
export function StatusBadge({
  tone,
  children,
  className,
  dot = true,
}: {
  tone: ToneName;
  children: React.ReactNode;
  className?: string;
  dot?: boolean;
}) {
  return (
    <span
      className={cn(
        "inline-flex items-center gap-1.5 rounded-full border px-2.5 py-0.5 text-xs font-semibold whitespace-nowrap",
        TONE_CLASSES[tone],
        className,
      )}
    >
      {dot && <span className="size-1.5 rounded-full bg-current" aria-hidden />}
      {children}
    </span>
  );
}
