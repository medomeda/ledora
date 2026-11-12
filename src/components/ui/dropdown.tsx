"use client";
import * as DropdownMenuPrimitive from "@radix-ui/react-dropdown-menu";
import * as React from "react";
import { cn } from "@/lib/utils/cn";

export const DropdownMenu = DropdownMenuPrimitive.Root;
export const DropdownMenuTrigger = DropdownMenuPrimitive.Trigger;

export function DropdownMenuContent({ className, sideOffset = 6, ...props }: React.ComponentProps<typeof DropdownMenuPrimitive.Content>) {
  return (
    <DropdownMenuPrimitive.Portal>
      <DropdownMenuPrimitive.Content sideOffset={sideOffset} align="end" className={cn("z-50 min-w-48 rounded-xl border bg-card p-1 shadow-lg", className)} {...props} />
    </DropdownMenuPrimitive.Portal>
  );
}

export function DropdownMenuItem({ className, destructive, ...props }: React.ComponentProps<typeof DropdownMenuPrimitive.Item> & { destructive?: boolean }) {
  return <DropdownMenuPrimitive.Item className={cn("flex cursor-pointer select-none items-center gap-2 rounded-lg px-2.5 py-2 text-sm outline-none data-[highlighted]:bg-muted data-[disabled]:opacity-50 [&_svg]:size-4 [&_svg]:text-muted-foreground", destructive && "text-destructive [&_svg]:text-destructive", className)} {...props} />;
}

export const DropdownMenuSeparator = ({ className, ...props }: React.ComponentProps<typeof DropdownMenuPrimitive.Separator>) => <DropdownMenuPrimitive.Separator className={cn("my-1 h-px bg-border", className)} {...props} />;
export const DropdownMenuLabel = ({ className, ...props }: React.ComponentProps<typeof DropdownMenuPrimitive.Label>) => <DropdownMenuPrimitive.Label className={cn("px-2.5 py-1.5 text-xs text-muted-foreground", className)} {...props} />;
