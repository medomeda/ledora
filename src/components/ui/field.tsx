import * as React from "react";
import { cn } from "@/lib/utils/cn";

interface FieldProps {
  label: React.ReactNode;
  htmlFor?: string;
  error?: string;
  hint?: React.ReactNode;
  className?: string;
  children: React.ReactNode;
  optional?: boolean;
}

/** Champ de formulaire : libellé, aide, message d'erreur lié (aria-describedby côté appelant via id). */
export function Field({ label, htmlFor, error, hint, className, children, optional }: FieldProps) {
  return (
    <div className={cn("space-y-1.5", className)}>
      <label htmlFor={htmlFor} className="flex items-baseline justify-between gap-2 text-sm font-medium">
        <span>{label}</span>
        {optional && <span className="text-xs font-normal text-muted-foreground">facultatif</span>}
      </label>
      {children}
      {hint && !error && <p className="text-xs text-muted-foreground">{hint}</p>}
      {error && (
        <p role="alert" className="text-xs font-medium text-destructive">
          {error}
        </p>
      )}
    </div>
  );
}
