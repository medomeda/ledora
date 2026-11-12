"use client";
import { useState, useTransition } from "react";
import { createQuizAction } from "@/actions/quizzes";
import { Alert } from "@/components/ui/feedback";
import { Button } from "@/components/ui/button";
import { Field } from "@/components/ui/field";
import { Input, Select, Textarea } from "@/components/ui/input";
import { QUIZ_CATEGORIES } from "@/lib/constants/labels";

export function QuizCreateForm() {
  const [title, setTitle] = useState("");
  const [category, setCategory] = useState("");
  const [description, setDescription] = useState("");
  const [error, setError] = useState<{ form?: string; title?: string } | null>(null);
  const [pending, start] = useTransition();
  return (
    <form onSubmit={(e) => { e.preventDefault(); setError(null); start(async () => { const r = await createQuizAction({ title, category, description }); if (r && !r.ok) setError({ form: r.error, title: r.fieldErrors?.title }); }); }} className="space-y-5" noValidate>
      {error?.form && !error.title && <Alert tone="error">{error.form}</Alert>}
      <Field label="Titre du quiz" htmlFor="title" error={error?.title} hint="Formulez une question que votre cible se pose : « Quel est votre niveau de… ? »">
        <Input id="title" value={title} onChange={(e) => setTitle(e.target.value)} aria-invalid={!!error?.title} placeholder="Quel est votre niveau de maturité financière ?" autoFocus />
      </Field>
      <Field label="Catégorie" htmlFor="category" optional>
        <Select id="category" value={category} onChange={(e) => setCategory(e.target.value)}><option value="">Choisir…</option>{QUIZ_CATEGORIES.map((c) => <option key={c}>{c}</option>)}</Select>
      </Field>
      <Field label="Description courte" htmlFor="description" optional><Textarea id="description" rows={3} value={description} onChange={(e) => setDescription(e.target.value)} /></Field>
      <Button type="submit" loading={pending}>Créer et commencer</Button>
    </form>
  );
}
