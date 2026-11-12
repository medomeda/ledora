import { cva, type VariantProps } from "class-variance-authority";
import * as React from "react";
import { cn } from "@/lib/utils/cn";

const badgeVariants = cva("inline-flex items-center gap-1 whitespace-nowrap rounded-full px-2.5 py-0.5 text-xs font-medium", {
  variants: {
    tone: {
      neutral: "bg-muted text-muted-foreground",
      success: "bg-success-soft text-success-soft-foreground",
      warning: "bg-accent-soft text-accent-soft-foreground",
      danger: "bg-destructive-soft text-destructive-soft-foreground",
      info: "bg-info-soft text-info-soft-foreground",
      ink: "bg-primary text-primary-foreground",
    },
  },
  defaultVariants: { tone: "neutral" },
});

export function Badge({ className, tone, ...props }: React.ComponentProps<"span"> & VariantProps<typeof badgeVariants>) {
  return <span className={cn(badgeVariants({ tone }), className)} {...props} />;
}
