"use client";
import * as AlertDialogPrimitive from "@radix-ui/react-alert-dialog";
import * as DialogPrimitive from "@radix-ui/react-dialog";
import { X } from "lucide-react";
import * as React from "react";
import { Button } from "@/components/ui/button";
import { cn } from "@/lib/utils/cn";

export const Dialog = DialogPrimitive.Root;
export const DialogTrigger = DialogPrimitive.Trigger;
export const DialogClose = DialogPrimitive.Close;

export function DialogContent({ className, children, title, description, ...props }: React.ComponentProps<typeof DialogPrimitive.Content> & { title: string; description?: string }) {
  return (
    <DialogPrimitive.Portal>
      <DialogPrimitive.Overlay className="fixed inset-0 z-50 bg-primary/40 backdrop-blur-[1px]" />
      <DialogPrimitive.Content className={cn("fixed left-1/2 top-1/2 z-50 max-h-[90dvh] w-[calc(100vw-2rem)] max-w-lg -translate-x-1/2 -translate-y-1/2 overflow-y-auto rounded-xl border bg-card p-6 shadow-xl", className)} {...props}>
        <div className="mb-4 pr-8">
          <DialogPrimitive.Title className="font-display text-lg font-semibold">{title}</DialogPrimitive.Title>
          {description ? <DialogPrimitive.Description className="mt-1 text-sm text-muted-foreground">{description}</DialogPrimitive.Description> : <DialogPrimitive.Description className="sr-only">{title}</DialogPrimitive.Description>}
        </div>
        {children}
        <DialogPrimitive.Close className="absolute right-4 top-4 rounded-md p-1 text-muted-foreground hover:bg-muted" aria-label="Fermer">
          <X className="size-4" />
        </DialogPrimitive.Close>
      </DialogPrimitive.Content>
    </DialogPrimitive.Portal>
  );
}

/** Confirmation avant action sensible (PRD §7.4). */
export function ConfirmDialog({ open, onOpenChange, title, description, confirmLabel, destructive, loading, onConfirm }: { open: boolean; onOpenChange: (o: boolean) => void; title: string; description: React.ReactNode; confirmLabel: string; destructive?: boolean; loading?: boolean; onConfirm: () => void }) {
  return (
    <AlertDialogPrimitive.Root open={open} onOpenChange={onOpenChange}>
      <AlertDialogPrimitive.Portal>
        <AlertDialogPrimitive.Overlay className="fixed inset-0 z-50 bg-primary/40 backdrop-blur-[1px]" />
        <AlertDialogPrimitive.Content className="fixed left-1/2 top-1/2 z-50 w-[calc(100vw-2rem)] max-w-md -translate-x-1/2 -translate-y-1/2 rounded-xl border bg-card p-6 shadow-xl">
          <AlertDialogPrimitive.Title className="font-display text-lg font-semibold">{title}</AlertDialogPrimitive.Title>
          <AlertDialogPrimitive.Description asChild>
            <div className="mt-2 text-sm leading-relaxed text-muted-foreground">{description}</div>
          </AlertDialogPrimitive.Description>
          <div className="mt-6 flex justify-end gap-2">
            <AlertDialogPrimitive.Cancel asChild>
              <Button variant="outline">Annuler</Button>
            </AlertDialogPrimitive.Cancel>
            <Button variant={destructive ? "destructive" : "default"} loading={loading} onClick={onConfirm}>
              {confirmLabel}
            </Button>
          </div>
        </AlertDialogPrimitive.Content>
      </AlertDialogPrimitive.Portal>
    </AlertDialogPrimitive.Root>
  );
}
