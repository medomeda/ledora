import * as React from "react";
import { cn } from "@/lib/utils/cn";

const base = "w-full rounded-lg border border-input bg-card px-3 text-sm text-foreground placeholder:text-muted-foreground/70 transition-colors focus-visible:outline-2 focus-visible:outline-offset-0 focus-visible:outline-ring disabled:cursor-not-allowed disabled:bg-muted aria-[invalid=true]:border-destructive";

export const Input = React.forwardRef<HTMLInputElement, React.ComponentProps<"input">>(function Input({ className, type = "text", ...props }, ref) {
  return <input ref={ref} type={type} className={cn(base, "h-10", className)} {...props} />;
});

export const Textarea = React.forwardRef<HTMLTextAreaElement, React.ComponentProps<"textarea">>(function Textarea({ className, ...props }, ref) {
  return <textarea ref={ref} className={cn(base, "min-h-20 py-2 leading-relaxed", className)} {...props} />;
});

export const Select = React.forwardRef<HTMLSelectElement, React.ComponentProps<"select">>(function Select({ className, children, ...props }, ref) {
  return (
    <select ref={ref} className={cn(base, "h-10 pr-8", className)} {...props}>
      {children}
    </select>
  );
});

/** Interrupteur accessible (case à cocher native stylée). */
export const Switch = React.forwardRef<HTMLInputElement, Omit<React.ComponentProps<"input">, "type">>(function Switch({ className, ...props }, ref) {
  return (
    <span className={cn("relative inline-flex h-6 w-10 shrink-0", className)}>
      <input ref={ref} type="checkbox" role="switch" className="peer absolute inset-0 z-10 size-full cursor-pointer appearance-none rounded-full opacity-0" {...props} />
      <span className="pointer-events-none absolute inset-0 rounded-full bg-input transition-colors peer-checked:bg-primary peer-focus-visible:outline-2 peer-focus-visible:outline-offset-2 peer-focus-visible:outline-ring peer-disabled:opacity-50" />
      <span className="pointer-events-none absolute left-0.5 top-0.5 size-5 rounded-full bg-white shadow transition-transform peer-checked:translate-x-4" />
    </span>
  );
});
