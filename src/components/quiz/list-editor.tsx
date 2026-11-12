"use client";
import { Plus, Trash2 } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";

/** Liste de lignes de texte modifiable (points forts, axes d'amélioration, recommandations). */
export function ListEditor({ items, onChange, placeholder, addLabel, max = 10, label }: { items: string[]; onChange: (items: string[]) => void; placeholder?: string; addLabel: string; max?: number; label: string }) {
  return (
    <div className="space-y-2">
      {items.map((it, i) => (
        <div key={i} className="flex gap-2">
          <Input aria-label={`${label} ${i + 1}`} value={it} placeholder={placeholder} onChange={(e) => onChange(items.map((x, k) => (k === i ? e.target.value : x)))} />
          <Button type="button" variant="ghost" size="icon" aria-label={`Supprimer ${label.toLowerCase()} ${i + 1}`} onClick={() => onChange(items.filter((_, k) => k !== i))}><Trash2 className="size-4" /></Button>
        </div>
      ))}
      {items.length < max && <Button type="button" variant="outline" size="sm" onClick={() => onChange([...items, ""])}><Plus /> {addLabel}</Button>}
    </div>
  );
}
