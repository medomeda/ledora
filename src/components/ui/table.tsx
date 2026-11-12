import * as React from "react";
import { cn } from "@/lib/utils/cn";

export function Table({ className, ...props }: React.ComponentProps<"table">) {
  return (
    <div className="w-full overflow-x-auto">
      <table className={cn("w-full text-left text-sm", className)} {...props} />
    </div>
  );
}
export const THead = (p: React.ComponentProps<"thead">) => <thead className="border-b bg-muted/50 text-xs text-muted-foreground" {...p} />;
export const TH = ({ className, ...p }: React.ComponentProps<"th">) => <th className={cn("whitespace-nowrap px-4 py-2.5 font-medium", className)} {...p} />;
export const TR = ({ className, ...p }: React.ComponentProps<"tr">) => <tr className={cn("border-b last:border-0 hover:bg-muted/40", className)} {...p} />;
export const TD = ({ className, ...p }: React.ComponentProps<"td">) => <td className={cn("px-4 py-3 align-middle", className)} {...p} />;
