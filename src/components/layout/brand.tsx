import Link from "next/link";
import { cn } from "@/lib/utils/cn";

/** Logo : une bulle de dialogue dont l'angle devient une cible (quiz → prospect). */
export function LogoMark({ className }: { className?: string }) {
  return (
    <svg viewBox="0 0 32 32" className={cn("size-8", className)} aria-hidden>
      <rect width="32" height="32" rx="9" fill="#151a2d" />
      <path d="M9 10.5a4.5 4.5 0 0 1 4.5-4.5h5A4.5 4.5 0 0 1 23 10.5v4a4.5 4.5 0 0 1-4.5 4.5H15l-4.2 3.6a.6.6 0 0 1-1-.46V19.2A4.5 4.5 0 0 1 9 14.5Z" fill="#f5a524" transform="translate(0 1.5)" />
      <circle cx="16" cy="13.2" r="2.1" fill="#151a2d" />
    </svg>
  );
}

export function Brand({ href = "/", className, light }: { href?: string; className?: string; light?: boolean }) {
  return (
    <Link href={href} className={cn("inline-flex items-center gap-2.5", className)}>
      <LogoMark />
      <span className={cn("font-display text-xl font-semibold", light && "text-white")}>Leadora</span>
    </Link>
  );
}
