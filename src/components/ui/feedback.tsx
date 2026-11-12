import { AlertCircle, CheckCircle2, Info, Loader2 } from "lucide-react";
import * as React from "react";
import { cn } from "@/lib/utils/cn";

const tones = {
  error: { icon: AlertCircle, cls: "border-destructive/30 bg-destructive-soft text-destructive-soft-foreground" },
  success: { icon: CheckCircle2, cls: "border-success/30 bg-success-soft text-success-soft-foreground" },
  info: { icon: Info, cls: "border-info-soft-foreground/20 bg-info-soft text-info-soft-foreground" },
  warning: { icon: AlertCircle, cls: "border-accent/50 bg-accent-soft text-accent-soft-foreground" },
};

export function Alert({ tone = "info", title, children, className }: { tone?: keyof typeof tones; title?: string; children?: React.ReactNode; className?: string }) {
  const { icon: Icon, cls } = tones[tone];
  return (
    <div role={tone === "error" ? "alert" : "status"} className={cn("flex gap-3 rounded-lg border px-4 py-3 text-sm", cls, className)}>
      <Icon className="mt-0.5 size-4 shrink-0" aria-hidden />
      <div className="min-w-0 space-y-0.5">
        {title && <p className="font-semibold">{title}</p>}
        {children && <div className="leading-relaxed">{children}</div>}
      </div>
    </div>
  );
}

export function EmptyState({ icon: Icon, title, description, action, className }: { icon: React.ComponentType<{ className?: string }>; title: string; description?: string; action?: React.ReactNode; className?: string }) {
  return (
    <div className={cn("flex flex-col items-center px-6 py-14 text-center", className)}>
      <div className="mb-4 flex size-12 items-center justify-center rounded-full bg-muted text-muted-foreground">
        <Icon className="size-5" />
      </div>
      <h3 className="font-display text-lg font-semibold">{title}</h3>
      {description && <p className="mt-1.5 max-w-sm text-sm leading-relaxed text-muted-foreground">{description}</p>}
      {action && <div className="mt-5">{action}</div>}
    </div>
  );
}

export function Spinner({ className }: { className?: string }) {
  return <Loader2 className={cn("size-4 animate-spin", className)} aria-label="Chargement" />;
}

export function Skeleton({ className }: { className?: string }) {
  return <div className={cn("animate-pulse rounded-lg bg-muted", className)} />;
}
