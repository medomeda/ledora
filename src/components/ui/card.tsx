import * as React from "react";
import { cn } from "@/lib/utils/cn";

export function Card({ className, ...props }: React.ComponentProps<"div">) {
  return <div className={cn("rounded-xl border bg-card", className)} {...props} />;
}
export function CardHeader({ className, ...props }: React.ComponentProps<"div">) {
  return <div className={cn("flex items-start justify-between gap-3 border-b px-5 py-4", className)} {...props} />;
}
export function CardTitle({ className, ...props }: React.ComponentProps<"h2">) {
  return <h2 className={cn("font-display text-base font-semibold", className)} {...props} />;
}
export function CardDescription({ className, ...props }: React.ComponentProps<"p">) {
  return <p className={cn("mt-0.5 text-sm text-muted-foreground", className)} {...props} />;
}
export function CardBody({ className, ...props }: React.ComponentProps<"div">) {
  return <div className={cn("p-5", className)} {...props} />;
}
